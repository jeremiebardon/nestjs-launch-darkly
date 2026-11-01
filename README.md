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
- **Release on merge to `main`** (`.github/workflows/release.yml`, [changesets/action](https://github.com/changesets/action)): `main` is protected, so releases go through a PR. When changesets are pending, the workflow opens/updates a `chore(release): version packages` PR (version bump + `CHANGELOG.md`). Merging that PR builds, tests, publishes to npm, tags `vX.Y.Z` and creates the GitHub release from the changelog.

### One-time GitHub setup

- npm: add this repo's `release.yml` workflow as a Trusted Publisher in the package's npm settings (no token needed).
- Repo Settings > Actions > General: enable **Allow GitHub Actions to create and approve pull requests**.
- Optional: secret `RELEASE_TOKEN` (fine-grained PAT, Contents + Pull requests write) so CI runs on the version PR; PRs opened with `GITHUB_TOKEN` don't trigger workflows.

## Automatic dependency updates

- **Renovate** (`renovate.json`) opens PRs with conventional titles: `chore(deps)` for dev tooling, `fix(deps)` for runtime dependencies. NestJS packages, the Jest toolchain, other non-major dev tooling and GitHub Actions are each grouped into one PR. Peer ranges are never touched automatically.
- **Claude reviews every Renovate PR** (`.github/workflows/claude-renovate-review.yml`): it reads the release notes, builds and runs the tests, fixes breakage caused by the update, adds a `patch` changeset when a runtime dependency changed, and comments a verdict ("Safe to merge" / "Safe after my fix" / "Needs human review"). It never merges or approves, and it can't edit workflows or release config.

One-time setup:

1. Install the [Renovate GitHub App](https://github.com/apps/renovate) on the repository.
2. Install the [Claude GitHub App](https://github.com/apps/claude) on the repository.
3. Add the repository secret `ANTHROPIC_API_KEY`.

## Scripts

- `npm run build` – compile to `dist/`
- `npm test` / `npm run test:cov` – Jest unit tests (ESM mode)
- `npm run example` – run the live example in `examples/` (`PORT` configurable)
