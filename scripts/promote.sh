#!/usr/bin/env bash
set -euo pipefail

remote_name="origin"
source_branch="devel"
target_branch="main"

if [ "$#" -gt 0 ]; then
  echo "[promote] Unexpected arguments. This script takes no args."
  echo "[promote] It promotes ${remote_name}/${target_branch} to match ${remote_name}/${source_branch}."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[promote] Current directory is not a git repository."
  exit 1
fi

working_tree_status="$(git status --porcelain)"
if [ -n "$working_tree_status" ]; then
  echo "[promote] Working tree is not clean. Commit or stash your changes before promoting."
  exit 1
fi

echo "[promote] Fetching ${remote_name}..."
git fetch "$remote_name" --prune

source_ref="refs/remotes/${remote_name}/${source_branch}"
target_ref="refs/remotes/${remote_name}/${target_branch}"

if ! git show-ref --verify --quiet "$source_ref"; then
  echo "[promote] Missing branch: ${remote_name}/${source_branch}"
  exit 1
fi

if ! git show-ref --verify --quiet "$target_ref"; then
  echo "[promote] Missing branch: ${remote_name}/${target_branch}"
  exit 1
fi

source_sha="$(git rev-parse "$source_ref")"
target_sha="$(git rev-parse "$target_ref")"

ahead_behind="$(git rev-list --left-right --count "${target_ref}...${source_ref}")"
target_ahead="$(echo "$ahead_behind" | awk '{print $1}')"
target_behind="$(echo "$ahead_behind" | awk '{print $2}')"

echo "[promote] ${remote_name}/${target_branch} ahead=${target_ahead} behind=${target_behind}"

if [ "$target_ahead" = "0" ] && [ "$target_behind" = "0" ]; then
  echo "[promote] Already up to date."
  exit 0
fi

echo "[promote] Pushing ${source_sha} to ${remote_name}/${target_branch}..."
git push --force-with-lease="${target_branch}:${target_sha}" \
  "$remote_name" \
  "${source_sha}:refs/heads/${target_branch}"

echo "[promote] Verifying..."
git fetch "$remote_name" --prune

verify_counts="$(git rev-list --left-right --count "${target_ref}...${source_ref}")"
verify_ahead="$(echo "$verify_counts" | awk '{print $1}')"
verify_behind="$(echo "$verify_counts" | awk '{print $2}')"

if [ "$verify_ahead" != "0" ] || [ "$verify_behind" != "0" ]; then
  echo "[promote] Verification failed: ahead=${verify_ahead} behind=${verify_behind}"
  exit 1
fi

echo "[promote] Success. ${remote_name}/${target_branch} now matches ${remote_name}/${source_branch}."
