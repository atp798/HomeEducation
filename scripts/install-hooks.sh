#!/usr/bin/env bash
# scripts/install-hooks.sh
# Symlink all git hooks from scripts/ into .git/hooks/.
# Run once after cloning, or any time a new hook is added.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "ERROR: not inside a git repo." >&2
  exit 1
fi

cd "$REPO_ROOT"

mkdir -p .git/hooks

for hook_file in scripts/pre-commit scripts/pre-push; do
  if [[ -f "$hook_file" ]]; then
    hook_name="$(basename "$hook_file")"
    target=".git/hooks/$hook_name"
    if [[ -L "$target" || -e "$target" ]]; then
      echo "→ Removing existing $target"
      rm -f "$target"
    fi
    # The symlink target is relative to .git/hooks/, so it should be ../../scripts/<name>
    ln -s "../../$hook_file" "$target"
    chmod +x "$hook_file"
    echo "✓ Installed $target -> ../../$hook_file"
  fi
done

echo
echo "Done. Active git hooks:"
ls -l .git/hooks/ | grep -v sample || true
