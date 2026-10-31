import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { LDContext } from '@launchdarkly/node-server-sdk';
import type { FeatureFlagMetadata } from '../decorators/feature-flag.decorator.js';
import { LaunchDarklyModuleOptions } from '../interfaces/index.js';
import {
  FEATURE_FLAG_METADATA,
  LAUNCH_DARKLY_OPTIONS,
} from '../launch-darkly.constants.js';
import { LaunchDarklyService } from '../launch-darkly.service.js';

/** Default context: a `user` context built from `request.user`, else anonymous. */
export const defaultContextFactory = (
  executionContext: ExecutionContext,
): LDContext => {
  const user = executionContext.switchToHttp().getRequest()?.user;
  const key = user?.key ?? user?.id ?? user?.sub;

  if (key === undefined || key === null) {
    return { kind: 'user', key: 'anonymous', anonymous: true };
  }
  return { ...user, kind: user.kind ?? 'user', key: String(key) };
};

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly launchDarkly: LaunchDarklyService,
    @Inject(LAUNCH_DARKLY_OPTIONS)
    private readonly options: LaunchDarklyModuleOptions,
  ) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    // Handler metadata wins over controller metadata.
    const metadata = this.reflector.getAllAndOverride<
      FeatureFlagMetadata | undefined
    >(FEATURE_FLAG_METADATA, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    if (!metadata) {
      return true;
    }

    const contextFactory =
      metadata.context ?? this.options.contextFactory ?? defaultContextFactory;
    const ldContext = await contextFactory(executionContext);

    const value = await this.launchDarkly.variation<unknown>(
      metadata.flagKey,
      ldContext,
      metadata.defaultValue ?? false,
    );

    if (value !== (metadata.expected ?? true)) {
      throw metadata.exception ?? new NotFoundException();
    }
    return true;
  }
}
