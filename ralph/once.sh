#!/bin/bash
set -eo pipefail

CODEX_BIN="${CODEX_BIN:-codex}"

issues=$(cat issues/*.md 2>/dev/null || echo "No issues found")
commits=$(git log -n 5 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No commits found")
prompt=$(cat ralph/prompt.md)

"$CODEX_BIN" --ask-for-approval never exec \
  --cd . \
  --sandbox workspace-write \
  "Previous commits: $commits Issues: $issues $prompt"
