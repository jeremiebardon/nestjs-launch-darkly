#!/usr/bin/env bash
# Release from GitHub Actions on merge to the default branch.
#   1. changeset version  -> bumps package.json, writes CHANGELOG.md
#   2. build + npm publish
#   3. push "chore(release)" commit + tag
#   4. create the GitHub release from the changelog
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${NODE_AUTH_TOKEN:?NODE_AUTH_TOKEN (npm token) is required}"
BRANCH="${GITHUB_REF_NAME:-main}"

if [ -z "$(find .changeset -name '*.md' ! -name 'README.md')" ]; then
  echo "No pending changesets - nothing to release."
  exit 0
fi

# If a newer commit landed on the branch, its own run will release.
git fetch --quiet origin "$BRANCH"
if [ "$(git rev-parse FETCH_HEAD)" != "$(git rev-parse HEAD)" ]; then
  echo "$BRANCH has moved on - skipping, the newer run will release."
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

npm run version
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"
echo "Releasing ${TAG}"

npm run build
npm publish --access public

git add -A
git commit -m "chore(release): ${TAG} [skip ci]"
git tag -a "$TAG" -m "$TAG"
git push origin "HEAD:${BRANCH}" "$TAG"

node scripts/release-notes.js "$TAG" |
  gh release create "$TAG" --title "$TAG" --verify-tag --notes-file -
