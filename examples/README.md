# Live example

```bash
export LD_SDK_KEY=sdk-xxxx        # PowerShell: $env:LD_SDK_KEY="sdk-xxxx"
export LD_FLAG_KEY=my-test-flag   # a boolean flag in the same environment
npm run example
```

- `GET /demo/guarded` — `@FeatureFlag` guard: 200 when on, 404 when off. User comes from the `x-user-id` header.
- `GET /demo/service` — flag evaluated via the injected `LaunchDarklyService`.

Set `LD_OFFLINE=1` to boot without network (all flags return defaults).
