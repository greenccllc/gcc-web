# Automated update approvals

Automated, agent, and scheduled update PRs are routed through Slack before they
merge.

## Operator flow

1. An automated PR opens or pushes a new head SHA.
2. GitHub Actions posts one Slack message for that proposed update.
3. Nathan reacts on that Slack message:
   - `:+1:` approves and merges the PR.
   - `:-1:` rejects and closes the PR.
4. If Nathan does not react within 48 hours, the workflow assumes the update is
   good and attempts the merge.

Each new PR head SHA gets its own Slack message and 48-hour clock, so approval
does not carry across later agent changes.

## What counts as automated

The workflow watches open PRs that match at least one rule:

- source branch starts with `cursor/`, `dependabot/`, `renovate/`, or
  `github-actions/`
- PR has one of these labels: `automated-update`, `agent-update`,
  `scheduled-update`, `recurring-update`
- PR author is one of the configured automation actors, or a bot on a same-repo
  branch

Human PRs outside those rules are ignored.

## Required GitHub secrets

Configure these repository secrets before enabling the policy:

| Secret | Purpose |
| --- | --- |
| `SLACK_BOT_TOKEN` | Slack bot token used to post messages and read reactions |
| `SLACK_APPROVAL_CHANNEL_ID` | Slack channel ID where proposed updates are posted |
| `SLACK_APPROVER_USER_ID` | Nathan's Slack user ID; only this user's reactions count |

The Slack app needs `chat:write`, `reactions:read`, and enough channel access to
post/read in `SLACK_APPROVAL_CHANNEL_ID`.

## Merge behavior

The workflow uses GitHub's normal merge endpoint with the repo's branch
protection. If checks are pending or failing, approval is recorded and the
scheduled poll retries later. Draft automated PRs are marked ready for review
after approval before the merge attempt.
