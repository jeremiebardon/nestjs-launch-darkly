#!/usr/bin/env bash
# Release from CI (GitLab) on merge to the default branch.
#   1. changeset version  -> bumps package.json, writes CHANGELOG.md
#   2. build + npm publish
#   3. push "chore(release)" commit + tag
#   4. create the GitLab release from the changelog
set -euo pipefail

: "${NPM_TOKEN:?NPM_TOKEN is required}"
: "${GITLAB_RELEASE_TOKEN:?GITLAB_RELEASE_TOKEN is required}"
: "${CI_SERVER_HOST:?must run in GitLab CI}"
: "${CI_PROJECT_PATH:?must run in GitLab CI}"
: "${CI_DEFAULT_BRANCH:?must run in GitLab CI}"

if [ -z "$(find .changeset -name '*.md' ! -name 'README.md')" ]; then
  echo "No pending changesets - nothing to release."
  exit 0
fi

REMOTE="https://release-bot:${GITLAB_RELEASE_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git"

# If a newer commit landed on the default branch, its own pipeline will release.
git fetch --quiet "$REMOTE" "$CI_DEFAULT_BRANCH"
if [ "$(git rev-parse FETCH_HEAD)" != "$(git rev-parse HEAD)" ]; then
  echo "$CI_DEFAULT_BRANCH has moved on - skipping, the newer pipeline will release."
  exit 0
fi

git config user.name "release-bot"
git config user.email "release-bot@users.noreply.${CI_SERVER_HOST}"

npm run version
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"
echo "Releasing ${TAG}"

npm run build

# Credentials live in the runner's HOME, never in the repository.
printf '//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" > "$HOME/.npmrc"
npm publish --access public

git add -A
git commit -m "chore(release): ${TAG} [skip ci]"
git tag -a "$TAG" -m "$TAG"
git push "$REMOTE" "HEAD:${CI_DEFAULT_BRANCH}" "$TAG"

node scripts/create-gitlab-release.js "$TAG"
