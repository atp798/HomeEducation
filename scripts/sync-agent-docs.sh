#!/usr/bin/env bash
# scripts/sync-agent-docs.sh
#
# Ensure AGENTS.md and CLAUDE.md stay identical.
# Convention: AGENTS.md is the source of truth; CLAUDE.md is a symlink to it.
#
# This script:
#   1. Detects if CLAUDE.md exists but is NOT a symlink (i.e. someone broke the
#      convention by editing it as a regular file).
#   2. If broken, prompts to overwrite CLAUDE.md with the contents of AGENTS.md
#      (the symlink is restored).
#   3. Verifies the result.
#
# Run from anywhere:
#   bash scripts/sync-agent-docs.sh
#   bash scripts/sync-agent-docs.sh --force   # skip the prompt

set -euo pipefail

# Resolve repo root (parent of this script's directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

AGENTS="AGENTS.md"
CLAUDE="CLAUDE.md"
FORCE="${1:-}"

if [[ ! -f "$AGENTS" ]]; then
  echo "ERROR: $AGENTS not found in $REPO_ROOT" >&2
  exit 1
fi

action() {
  echo "→ Removing $CLAUDE"
  rm -f "$CLAUDE"
  echo "→ Creating symlink: $CLAUDE -> $AGENTS"
  ln -s "$AGENTS" "$CLAUDE"
}

# Case 1: CLAUDE.md doesn't exist at all — create the symlink
if [[ ! -e "$CLAUDE" ]]; then
  echo "$CLAUDE does not exist — creating symlink."
  action

# Case 2: CLAUDE.md exists but is not a symlink — convention is broken
elif [[ ! -L "$CLAUDE" ]]; then
  echo "WARNING: $CLAUDE is a regular file, not a symlink."
  echo "Convention is: $CLAUDE should be a symlink to $AGENTS."

  if [[ -z "$FORCE" ]]; then
    read -r -p "Overwrite $CLAUDE with $AGENTS contents and restore the symlink? [y/N] " ans
    if [[ ! "$ans" =~ ^[Yy]$ ]]; then
      echo "Aborted. To force, run: bash scripts/sync-agent-docs.sh --force"
      exit 2
    fi
  fi

  action

# Case 3: CLAUDE.md is a symlink but points somewhere else
elif [[ "$(readlink "$CLAUDE")" != "$AGENTS" ]]; then
  echo "WARNING: $CLAUDE points to '$(readlink "$CLAUDE")', expected '$AGENTS'."
  if [[ -n "$FORCE" ]]; then
    action
  else
    read -r -p "Re-point $CLAUDE to $AGENTS? [y/N] " ans
    if [[ "$ans" =~ ^[Yy]$ ]]; then
      action
    else
      echo "Aborted."
      exit 2
    fi
  fi

# Case 4: already a correct symlink — nothing to do
else
  echo "OK: $CLAUDE is already a symlink to $AGENTS."
fi

# Verify
echo
echo "Verification:"
ls -l "$CLAUDE"
echo
if diff -q "$AGENTS" "$CLAUDE" >/dev/null 2>&1; then
  echo "✓ $AGENTS and $CLAUDE are identical."
else
  echo "✗ $AGENTS and $CLAUDE differ!" >&2
  exit 1
fi
