import { Inject } from '@nestjs/common';
import { LAUNCH_DARKLY_CLIENT } from '../launch-darkly.constants.js';

/** Inject the raw LaunchDarkly `LDClient`. Prefer `LaunchDarklyService`. */
export const InjectLaunchDarklyClient = () => Inject(LAUNCH_DARKLY_CLIENT);
