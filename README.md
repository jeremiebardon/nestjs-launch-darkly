# nestjs-launch-darkly

NestJS module wrapping the [LaunchDarkly Node server-side SDK](https://docs.launchdarkly.com/sdk/server-side/node-js).

## Usage

```ts
@Module({
  imports: [
    LaunchDarklyModule.forRoot({ sdkKey: process.env.LD_SDK_KEY! }),
    // or
    LaunchDarklyModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        sdkKey: config.getOrThrow('LD_SDK_KEY'),
      }),
    }),
  ],
})
export class AppModule {}

@Injectable()
export class MyService {
  constructor(private readonly ld: LaunchDarklyService) {}

  isEnabled(userId: string) {
    return this.ld.boolVariation('my-flag', { kind: 'user', key: userId });
  }
}
```

## Scripts

- `npm run build` – compile to `dist/`
- `npm test` – run Jest unit tests
- `npm run test:cov` – with coverage
