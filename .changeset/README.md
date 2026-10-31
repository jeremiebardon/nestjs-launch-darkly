# Changesets

Every user-facing change (`feat`, `fix`, `perf`, breaking changes) needs a changeset:

```bash
npm run changeset
```

Pick the bump type (patch / minor / major), write a short summary, and commit the generated
file with your PR. When PRs with changesets land on `main`, the release workflow opens a
"chore: version packages" PR; merging it publishes to npm.

Docs, tests, CI and refactors normally don't need one.
