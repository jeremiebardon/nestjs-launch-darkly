# nestjs-launch-darkly

NestJS module wrapping the [LaunchDarkly Node.js (server-side) SDK](https://launchdarkly.com/docs/sdk/server-side/node-js) (`@launchdarkly/node-server-sdk`).

One shared `LDClient` is created per module registration (as the SDK docs recommend), initialised with `waitForInitialization({ timeout })`, and flushed then closed on shutdown (the Node SDK does not send pending events on close).

## Setup

```ts
@Module({
  imports: [
    LaunchDarklyModule.forRoot({
      sdkKey: process.env.LD_SDK_KEY!,
      initTimeoutSeconds: 10, // default 5
      throwOnInitError: false, // default: log and serve default values
      ldOptions: {}, // any LDOptions (offline, plugins, ...)
    }),
  ],
})
export class AppModule {}
```

Async:

```ts
LaunchDarklyModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    sdkKey: config.getOrThrow('LD_SDK_KEY'),
  }),
});
```

## In services (injection)

```ts
@Injectable()
export class CheckoutService {
  constructor(private readonly ld: LaunchDarklyService) {}

  async isEnabled(userId: string) {
    const context = { kind: 'user', key: userId };
    return this.ld.boolVariation('new-checkout', context, false);
  }
}
```

`LaunchDarklyService` exposes `variation`, `boolVariation`, `stringVariation`, `numberVariation`, `jsonVariation`, `variationDetail`, `allFlagsState`, `track`, `identify`, `flush` and `getClient()` (raw `LDClient`).

## On controllers / routes (decorator)

```ts
@Controller('checkout')
export class CheckoutController {
  // 404 unless the flag evaluates to true
  @FeatureFlag('new-checkout')
  @Get()
  checkout() {}

  // multivariate flag, custom exception
  @FeatureFlag('checkout-variant', {
    expected: 'B',
    defaultValue: 'A',
    exception: new ForbiddenException(),
  })
  @Get('beta')
  beta() {}
}
```

`@FeatureFlag` also works on a whole controller class; route-level metadata overrides it.

### Evaluation context

By default the guard builds `{ kind: 'user', key }` from `request.user` (`key`, `id` or `sub`), falling back to an anonymous user. Override it globally or per route:

```ts
LaunchDarklyModule.forRoot({
  sdkKey,
  contextFactory: (ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return { kind: 'user', key: req.user.id, tenant: req.headers['x-tenant'] };
  },
});

@FeatureFlag('org-flag', { context: () => ({ kind: 'org', key: 'org-1' }) })
```

## Requirements

- NestJS **12** (the package is ESM, like NestJS 12) and Node.js >= 20.

## Contributing & releases

- **Commits** must follow [Conventional Commits](https://www.conventionalcommits.org) (`feat: ...`, `fix: ...`, `docs: ...`). A `commit-msg` hook (husky + commitlint) enforces it locally and CI checks every commit of a pull request.
- **Versioning** uses [Changesets](https://github.com/changesets/changesets). For any user-facing change run `npm run changeset` and commit the generated file with your PR. CI warns when a PR has none.
- **CI** (`.github/workflows/ci.yml`): on pull requests it builds and tests on Node 20 and 22, lints commit messages and checks for a changeset.
- **Release on merge to `main`** (`.github/workflows/release.yml`, `scripts/release.sh`): builds and tests, then, if changesets are pending, bumps the version and updates `CHANGELOG.md`, publishes to npm, pushes a `chore(release): vX.Y.Z` commit and the `vX.Y.Z` tag, and creates a GitHub release from the changelog. Without pending changesets nothing is published.

### One-time GitHub setup

- Add the repository secret `NPM_TOKEN` (npm automation token with publish rights).
- The release job pushes to `main` with `GITHUB_TOKEN`, so `main` must allow that: if branch protection requires pull requests, either let GitHub Actions bypass it, or use a PAT/GitHub App token instead.

## Scripts

- `npm run build` – compile to `dist/`
- `npm test` / `npm run test:cov` – Jest unit tests (ESM mode)
- `npm run example` – run the live example in `examples/` (`PORT` configurable)
