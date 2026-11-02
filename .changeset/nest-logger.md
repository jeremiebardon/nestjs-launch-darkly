---
'nestjs-launch-darkly': minor
---

SDK logs now go through the Nest `Logger` by default (pass `ldOptions.logger` to override). `LaunchDarklyService.variationDetail<T>` now returns `LDEvaluationDetailTyped<T>` so its type parameter is meaningful.
