#!/usr/bin/env python3
"""Slack reaction approval gate for automated pull-request updates.

The workflow using this script runs from trusted base-branch code via
pull_request_target/schedule. It never checks out or executes PR code.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Any


GITHUB_API = "https://api.github.com"
SLACK_API = "https://slack.com/api"
MARKER_PREFIX = "<!-- gcc-automated-update-approval:"
MARKER_RE = re.compile(r"<!-- gcc-automated-update-approval:(\{.*?\}) -->", re.DOTALL)


def now_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def iso_z(value: dt.datetime) -> str:
    return value.astimezone(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(dt.timezone.utc)
    except ValueError:
        return None


def csv_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [part.strip() for part in raw.split(",") if part.strip()]


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


class GitHub:
    def __init__(self) -> None:
        self.repo = require_env("GITHUB_REPOSITORY")
        self.token = require_env("GITHUB_TOKEN")

    def request(self, method: str, path: str, body: dict[str, Any] | None = None) -> Any:
        url = path if path.startswith("https://") else f"{GITHUB_API}/repos/{self.repo}{path}"
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "gcc-automated-update-approval",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = resp.read().decode("utf-8")
                return json.loads(payload) if payload else {}
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"GitHub {method} {path} -> {exc.code}: {detail}") from exc

    def graphql(self, query: str, variables: dict[str, Any]) -> Any:
        req = urllib.request.Request(
            f"{GITHUB_API}/graphql",
            data=json.dumps({"query": query, "variables": variables}).encode("utf-8"),
            method="POST",
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "gcc-automated-update-approval",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"GitHub GraphQL -> {exc.code}: {detail}") from exc
        if data.get("errors"):
            raise RuntimeError(f"GitHub GraphQL errors: {data['errors']}")
        return data.get("data", {})

    def list_open_prs(self) -> list[dict[str, Any]]:
        prs: list[dict[str, Any]] = []
        page = 1
        while True:
            chunk = self.request("GET", f"/pulls?state=open&per_page=100&page={page}")
            if not chunk:
                return prs
            prs.extend(chunk)
            if len(chunk) < 100:
                return prs
            page += 1

    def get_pr(self, number: int) -> dict[str, Any]:
        return self.request("GET", f"/pulls/{number}")

    def get_issue(self, number: int) -> dict[str, Any]:
        return self.request("GET", f"/issues/{number}")

    def list_comments(self, number: int) -> list[dict[str, Any]]:
        comments: list[dict[str, Any]] = []
        page = 1
        while True:
            chunk = self.request("GET", f"/issues/{number}/comments?per_page=100&page={page}")
            if not chunk:
                return comments
            comments.extend(chunk)
            if len(chunk) < 100:
                return comments
            page += 1

    def create_comment(self, number: int, body: str) -> dict[str, Any]:
        return self.request("POST", f"/issues/{number}/comments", {"body": body})

    def update_comment(self, comment_id: int, body: str) -> dict[str, Any]:
        return self.request("PATCH", f"/issues/comments/{comment_id}", {"body": body})

    def close_pr(self, number: int) -> None:
        self.request("PATCH", f"/pulls/{number}", {"state": "closed"})

    def mark_ready_for_review(self, pr: dict[str, Any]) -> None:
        self.graphql(
            """
            mutation($id: ID!) {
              markPullRequestReadyForReview(input: { pullRequestId: $id }) {
                pullRequest { id isDraft }
              }
            }
            """,
            {"id": pr["node_id"]},
        )

    def merge_pr(self, pr: dict[str, Any], method: str) -> dict[str, Any]:
        return self.request(
            "PUT",
            f"/pulls/{pr['number']}/merge",
            {
                "commit_title": f"Merge automated update #{pr['number']}: {pr['title']}",
                "merge_method": method,
                "sha": pr["head"]["sha"],
            },
        )


class Slack:
    def __init__(self) -> None:
        self.token = os.getenv("SLACK_BOT_TOKEN", "")
        self.channel = os.getenv("SLACK_APPROVAL_CHANNEL_ID", "")
        self.approver = os.getenv("SLACK_APPROVER_USER_ID", "")

    @property
    def configured(self) -> bool:
        return bool(self.token and self.channel and self.approver)

    def request(self, method: str, payload: dict[str, Any]) -> dict[str, Any]:
        req = urllib.request.Request(
            f"{SLACK_API}/{method}",
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "gcc-automated-update-approval",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Slack {method} -> {exc.code}: {detail}") from exc
        if not data.get("ok"):
            raise RuntimeError(f"Slack {method} failed: {data}")
        return data

    def post_update(self, pr: dict[str, Any], deadline_at: dt.datetime) -> dict[str, str]:
        title = pr["title"]
        number = pr["number"]
        head_sha = pr["head"]["sha"][:12]
        author = pr["user"]["login"]
        repo = pr["base"]["repo"]["full_name"]
        deadline_text = deadline_at.strftime("%Y-%m-%d %H:%M UTC")
        text = (
            f":robot_face: Proposed automated update: <{pr['html_url']}|{repo} #{number}: {title}>\n"
            f"Author: `{author}` · Head: `{head_sha}`\n"
            "Nathan: react with :+1: to approve and merge, or :-1: to reject.\n"
            f"If there is no Nathan reaction by {deadline_text}, this assumes good and merges."
        )
        posted = self.request(
            "chat.postMessage",
            {
                "channel": self.channel,
                "text": text,
                "unfurl_links": False,
                "unfurl_media": False,
            },
        )
        ts = posted["ts"]
        permalink = self.request("chat.getPermalink", {"channel": self.channel, "message_ts": ts})[
            "permalink"
        ]
        return {"channel": self.channel, "message_ts": ts, "permalink": permalink}

    def reaction_decision(self, channel: str, message_ts: str) -> str | None:
        data = self.request("reactions.get", {"channel": channel, "timestamp": message_ts, "full": False})
        reactions = data.get("message", {}).get("reactions", [])
        rejected = self._has_reaction(reactions, {"-1", "thumbsdown"})
        approved = self._has_reaction(reactions, {"+1", "thumbsup"})
        if rejected:
            return "rejected"
        if approved:
            return "approved"
        return None

    def _has_reaction(self, reactions: list[dict[str, Any]], names: set[str]) -> bool:
        for reaction in reactions:
            if reaction.get("name") in names and self.approver in reaction.get("users", []):
                return True
        return False


def marker_body(state: dict[str, Any]) -> str:
    compact = json.dumps(state, sort_keys=True, separators=(",", ":"))
    status = state.get("status", "pending")
    permalink = state.get("slack_permalink")
    deadline = state.get("deadline_at")
    visible = [
        f"Automated update approval status: **{status}**.",
        "Nathan can react in Slack with `:+1:` to approve+merge or `:-1:` to reject.",
    ]
    if permalink:
        visible.append(f"Slack approval message: {permalink}")
    if deadline:
        visible.append(f"No-response auto-approval deadline: `{deadline}`.")
    return "\n".join(visible) + f"\n\n{MARKER_PREFIX}{compact} -->"


def extract_markers(comments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    markers: list[dict[str, Any]] = []
    for comment in comments:
        match = MARKER_RE.search(comment.get("body") or "")
        if not match:
            continue
        try:
            state = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        state["_comment_id"] = comment["id"]
        markers.append(state)
    return markers


def labels_for(issue: dict[str, Any]) -> set[str]:
    return {str(label.get("name", "")).lower() for label in issue.get("labels", [])}


def is_automated_pr(pr: dict[str, Any], issue: dict[str, Any]) -> bool:
    branch_prefixes = csv_env("AUTOMATED_APPROVAL_BRANCH_PREFIXES")
    automation_labels = {label.lower() for label in csv_env("AUTOMATED_APPROVAL_LABELS")}
    automation_actors = {actor.lower() for actor in csv_env("AUTOMATED_APPROVAL_ACTORS")}
    branch = pr.get("head", {}).get("ref") or ""
    actor = (pr.get("user", {}).get("login") or "").lower()
    actor_type = pr.get("user", {}).get("type") or ""
    head_repo = (pr.get("head", {}).get("repo") or {}).get("full_name")
    base_repo = (pr.get("base", {}).get("repo") or {}).get("full_name")
    same_repo = bool(head_repo and base_repo and head_repo.lower() == base_repo.lower())
    issue_labels = labels_for(issue)

    if automation_labels & issue_labels:
        return True
    if same_repo and any(branch.startswith(prefix) for prefix in branch_prefixes):
        return True
    if same_repo and actor in automation_actors:
        return True
    if same_repo and actor_type == "Bot":
        return True
    return False


def event_pr_numbers(gh: GitHub) -> list[int] | None:
    event_name = os.getenv("GITHUB_EVENT_NAME", "")
    event_path = os.getenv("GITHUB_EVENT_PATH", "")
    if not event_name.startswith("pull_request") or not event_path:
        return None
    with open(event_path, "r", encoding="utf-8") as f:
        event = json.load(f)
    number = event.get("pull_request", {}).get("number")
    return [int(number)] if number else None


def ensure_marker(
    gh: GitHub,
    slack: Slack,
    pr: dict[str, Any],
    markers: list[dict[str, Any]],
) -> dict[str, Any] | None:
    head_sha = pr["head"]["sha"]
    current = next((m for m in markers if m.get("head_sha") == head_sha), None)
    if current:
        return current
    if not slack.configured:
        print(
            "::warning::Slack approval secrets are incomplete; cannot post approval "
            f"message for PR #{pr['number']}."
        )
        return None

    timeout_hours = float(os.getenv("AUTOMATED_APPROVAL_TIMEOUT_HOURS", "48"))
    posted_at = now_utc()
    deadline_at = posted_at + dt.timedelta(hours=timeout_hours)
    message = slack.post_update(pr, deadline_at)
    state = {
        "version": 1,
        "status": "pending",
        "head_sha": head_sha,
        "posted_at": iso_z(posted_at),
        "deadline_at": iso_z(deadline_at),
        "slack_channel": message["channel"],
        "slack_message_ts": message["message_ts"],
        "slack_permalink": message["permalink"],
    }
    comment = gh.create_comment(pr["number"], marker_body(state))
    state["_comment_id"] = comment["id"]
    print(f"Posted Slack approval message for PR #{pr['number']} at {message['permalink']}")
    return state


def update_marker(gh: GitHub, pr_number: int, state: dict[str, Any]) -> None:
    comment_id = state.get("_comment_id")
    if not comment_id:
        return
    clean = {k: v for k, v in state.items() if not k.startswith("_")}
    gh.update_comment(int(comment_id), marker_body(clean))


def decide_pr(gh: GitHub, pr: dict[str, Any], marker: dict[str, Any], decision: str, reason: str) -> None:
    number = pr["number"]
    decided_at = iso_z(now_utc())
    prior_status = marker.get("status")
    marker["decision"] = decision
    marker["decision_reason"] = reason
    marker["decided_at"] = decided_at

    if decision == "rejected":
        marker["status"] = "rejected"
        gh.create_comment(number, f"Automated update rejected by Slack `:-1:` reaction. Closing PR.")
        gh.close_pr(number)
        update_marker(gh, number, marker)
        print(f"Closed PR #{number} after Slack rejection")
        return

    merge_method = os.getenv("AUTOMATED_APPROVAL_MERGE_METHOD", "squash")
    if prior_status != "approved_waiting_to_merge":
        gh.create_comment(number, f"Automated update approved ({reason}). Attempting `{merge_method}` merge.")
    refreshed = gh.get_pr(number)
    if refreshed.get("draft"):
        print(f"PR #{number} is draft; marking ready for review before merge")
        gh.mark_ready_for_review(refreshed)
        time.sleep(2)
        refreshed = gh.get_pr(number)
    try:
        gh.merge_pr(refreshed, merge_method)
    except RuntimeError as exc:
        marker["status"] = "approved_waiting_to_merge"
        marker["last_merge_error"] = str(exc)[-1000:]
        marker["last_merge_attempt_at"] = decided_at
        update_marker(gh, number, marker)
        print(f"::warning::Approved PR #{number}, but merge is not ready yet: {exc}")
        return

    marker["status"] = "merged"
    marker["merged_at"] = iso_z(now_utc())
    update_marker(gh, number, marker)
    print(f"Merged PR #{number} via {reason}")


def handle_pr(gh: GitHub, slack: Slack, pr_number: int) -> None:
    pr = gh.get_pr(pr_number)
    if pr.get("state") != "open":
        return
    issue = gh.get_issue(pr_number)
    if not is_automated_pr(pr, issue):
        print(f"Skipping PR #{pr_number}; it is not an automated/agent/scheduled update.")
        return

    comments = gh.list_comments(pr_number)
    markers = extract_markers(comments)
    marker = ensure_marker(gh, slack, pr, markers)
    if not marker or marker.get("status") in {"rejected", "merged"}:
        return
    if not slack.configured:
        print(f"::warning::Slack approval secrets are incomplete; cannot poll PR #{pr_number}.")
        return

    decision = slack.reaction_decision(marker["slack_channel"], marker["slack_message_ts"])
    if decision == "rejected":
        decide_pr(gh, pr, marker, "rejected", "slack-thumb-down")
        return
    if decision == "approved":
        decide_pr(gh, pr, marker, "approved", "slack-thumb-up")
        return

    deadline_at = parse_iso(marker.get("deadline_at"))
    if deadline_at and now_utc() >= deadline_at:
        decide_pr(gh, pr, marker, "approved", "48-hour-no-response")
        return
    print(f"PR #{pr_number} is still pending Slack approval.")


def main() -> int:
    gh = GitHub()
    slack = Slack()
    pr_numbers = event_pr_numbers(gh)
    if pr_numbers is None:
        pr_numbers = [pr["number"] for pr in gh.list_open_prs()]
    for number in pr_numbers:
        handle_pr(gh, slack, int(number))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"::error::{exc}", file=sys.stderr)
        raise
