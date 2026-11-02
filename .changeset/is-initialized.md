---
'nestjs-launch-darkly': minor
---

Add `LaunchDarklyService.isInitialized()` so health checks and alerts can detect an app that is serving default flag values because the SDK never connected.
