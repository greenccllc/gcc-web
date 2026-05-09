# MIGRATION

This folder is a stop-gap inside `gcc-site` because that was the only repo
available when it was first written. It does not depend on anything in
`gcc-site` and should move to its own home as soon as one is available.

## Target home

`majic-agent` (sibling repo) is the natural home: same ecosystem, same
runtime (PowerShell), same boxes. Suggested path: `majic-agent/agents/claude-watcher/`.

## How to migrate

```bash
# from a sibling clone of majic-agent
mkdir -p agents/claude-watcher
cp -r ../gcc-site/ops/majic-claude-watcher/* agents/claude-watcher/

# strip this MIGRATION.md, update the README's "Stop-gap location" note, commit
git rm -r ops/majic-claude-watcher    # in gcc-site
```

No path changes inside the scripts are required — every absolute path is
read from `config.psd1`.

## Why not now

The session that produced this code only had repo scope for `greenccllc/gcc-site`.
