#!/usr/bin/env bash
# Clone the public manhattan-reasoning-gym repo into _code/ so mkdocstrings
# can read its source for the Python API reference during a local build.
#
# Public repo, plain HTTPS -- no deploy key or auth needed.
set -euo pipefail

DEST="_code"
REPO="https://github.com/ManhattanReasoning/manhattan-reasoning-gym.git"

if [ -d "$DEST/.git" ]; then
  echo "Updating existing $DEST ..."
  git -C "$DEST" pull --ff-only
else
  echo "Cloning manhattan-reasoning-gym into $DEST ..."
  git clone --depth 1 "$REPO" "$DEST"
fi

echo "Done. Now run: mkdocs serve"
