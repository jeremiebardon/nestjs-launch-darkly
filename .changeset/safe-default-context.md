---
'nestjs-launch-darkly': patch
---

Security: the default `@FeatureFlag` context no longer forwards every field of `request.user` (email, roles, token claims...) to LaunchDarkly; only `kind` and `key` are used. Add attributes through `contextFactory`. Also ships a `LICENSE` file and no longer publishes `tsbuildinfo` and source maps in the package.
