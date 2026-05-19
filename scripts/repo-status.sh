#!/usr/bin/env bash
set -euo pipefail
printf "Repository: %s
" "$(pwd)"
printf "
Top-level entries:
"
find . -maxdepth 2 -mindepth 1 | sort
printf "
Markdown docs:
"
find . -type f \( -name '*.md' -o -name '*.mdc' \) | sort
