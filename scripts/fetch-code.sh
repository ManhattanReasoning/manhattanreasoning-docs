#!/usr/bin/env bash
# Clone the private Cloud_FPGA repo into _code/ so mkdocstrings can read the
# orchestrator source for the Python API reference during a local build.
#
# Requires read access to Barnard-PL-Labs/Cloud_FPGA.
set -euo pipefail

DEST="_code"
REPO="git@github.com:Barnard-PL-Labs/Cloud_FPGA.git"

if [ -d "$DEST/.git" ]; then
  echo "Updating existing $DEST ..."
  git -C "$DEST" pull --ff-only
else
  echo "Cloning Cloud_FPGA into $DEST ..."
  git clone --depth 1 "$REPO" "$DEST"
fi

echo "Done. Now run: mkdocs serve"
