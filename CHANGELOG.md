# nestjs-launch-darkly

## 0.2.0

### Minor Changes

- cd61364: Add `LaunchDarklyService.isInitialized()` so health checks and alerts can detect an app that is serving default flag values because the SDK never connected.
- 75a3bbd: SDK logs now go through the Nest `Logger` by default (pass `ldOptions.logger` to override). `LaunchDarklyService.variationDetail<T>` now returns `LDEvaluationDetailTyped<T>` so its type parameter is meaningful.

### Patch Changes

- a49724c: Security: the default `@FeatureFlag` context no longer forwards every field of `request.user` (email, roles, token claims...) to LaunchDarkly; only `kind` and `key` are used. Add attributes through `contextFactory`. Also ships a `LICENSE` file and no longer publishes `tsbuildinfo` and source maps in the package.

## 0.1.1

### Patch Changes

- 84c35a8: Maintenance release: update dev tooling (Jest 30, `@types/node` 26) and the release pipeline. No API changes.

## 0.1.0

### Minor Changes

- cd19308: Initial release for NestJS 12 (ESM): `LaunchDarklyModule` (`forRoot` / `forRootAsync`), `LaunchDarklyService` and the `@FeatureFlag` decorator and guard.
