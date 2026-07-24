#!/usr/bin/env bash
# Point this clone's git hooks at the committed .githooks/ directory, so the
# pre-commit control-character guard runs on every commit (issue #394).
#
# Version-controlled hooks live in .githooks/ (not the untracked .git/hooks), and
# `core.hooksPath` is per-clone local config, so each fresh clone runs this once.
# Idempotent: re-running it just re-asserts the setting.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
echo "Git hooks enabled: core.hooksPath -> .githooks"
echo "  pre-commit now runs scripts/check-control-chars.py before every commit."
