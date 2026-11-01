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

The module is global by default (`isGlobal: false` to opt out), so `LaunchDarklyService` can be injected anywhere. It exposes `variation`, `boolVariation`, `stringVariation`, `numberVariation`, `jsonVariation`, `variationDetail`, `allFlagsState`, `track`, `identify`, `flush` and `getClient()` (raw `LDClient`). The raw client can also be injected with `@InjectLaunchDarklyClient()`.

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

## Project layout

- `src/launch-darkly.module.ts` – `forRoot` / `forRootAsync` (options object, factory, `useClass` or `useExisting`); creates the shared `LDClient`.
- `src/launch-darkly.service.ts` – `LaunchDarklyService`, a typed wrapper around the client; handles init timeout and flush-then-close on shutdown.
- `src/decorators/` – `@FeatureFlag` and `@InjectLaunchDarklyClient`.
- `src/guards/` – the guard behind `@FeatureFlag`.
- `src/interfaces/` – module options and context factory types.
- `examples/` – runnable app, see [examples/README.md](examples/README.md).

## Requirements

- NestJS **12** (the package is ESM, like NestJS 12) and Node.js >= 20.

## Contributing & releases

- **Commits** must follow [Conventional Commits](https://www.conventionalcommits.org) (`feat: ...`, `fix: ...`, `docs: ...`). A `commit-msg` hook (husky + commitlint) enforces it locally and CI checks every commit of a pull request.
- **Versioning** uses [Changesets](https://github.com/changesets/changesets). For any user-facing change run `npm run changeset` and commit the generated file with your PR. CI warns when a PR has none.
- **CI** (`.github/workflows/ci.yml`): on pull requests it builds and tests on Node 20 and 22, lints commit messages and checks for a changeset.
- **Release on merge to `main`** (`.github/workflows/release.yml`, [changesets/action](https://github.com/changesets/action)): `main` is protected, so releases go through a PR. When changesets are pending, the workflow opens/updates a `chore(release): version packages` PR (version bump + `CHANGELOG.md`). Merging that PR builds, tests and publishes to npm (trusted publishing, with provenance). A follow-up step in the same workflow then pushes the `vX.Y.Z` tag and creates the GitHub release from the changelog (it is idempotent and only runs once the version is on npm).

### One-time GitHub setup

- npm: add this repo's `release.yml` workflow as a Trusted Publisher in the package's npm settings (no token needed).
- Repo Settings > Actions > General: enable **Allow GitHub Actions to create and approve pull requests**.
- Optional: secret `RELEASE_TOKEN` (fine-grained PAT, Contents + Pull requests write) so CI runs on the version PR; PRs opened with `GITHUB_TOKEN` don't trigger workflows.

## Automatic dependency updates

- **Renovate** (`renovate.json`) opens PRs with conventional titles: `chore(deps)` for dev tooling, `fix(deps)` for runtime dependencies (add a changeset by hand when one changes the runtime). NestJS packages, the Jest toolchain, other non-major dev tooling and GitHub Actions are each grouped into one PR. Peer ranges are never touched automatically.

One-time setup: install the [Renovate GitHub App](https://github.com/apps/renovate) on the repository.

## Scripts

- `npm run build` – compile to `dist/`
- `npm test` / `npm run test:cov` – Jest unit tests (ESM mode)
- `npm run example` – run the live example in `examples/` (`PORT` configurable)
