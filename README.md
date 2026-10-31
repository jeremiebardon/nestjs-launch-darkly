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

## Scripts

- `npm run build` – compile to `dist/`
- `npm test` / `npm run test:cov` – Jest unit tests
