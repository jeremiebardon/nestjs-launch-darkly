import {
  applyDecorators,
  ExecutionContext,
  HttpException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import type { LDContext } from '@launchdarkly/node-server-sdk';
import { FEATURE_FLAG_METADATA } from '../launch-darkly.constants.js';
import { FeatureFlagGuard } from '../guards/feature-flag.guard.js';

export interface FeatureFlagOptions {
  /** Value the flag must evaluate to for the route to be reachable. Defaults to `true`. */
  expected?: unknown;
  /** Value used when the flag cannot be evaluated. Defaults to `false`. */
  defaultValue?: unknown;
  /** Exception thrown when the flag does not match. Defaults to `NotFoundException`. */
  exception?: HttpException;
  /** Overrides the module-level `contextFactory` for this route. */
  context?: (
    executionContext: ExecutionContext,
  ) => LDContext | Promise<LDContext>;
}

export interface FeatureFlagMetadata extends FeatureFlagOptions {
  flagKey: string;
}

/**
 * Only allows access to a controller or route when the LaunchDarkly flag
 * evaluates to `expected` (default `true`) for the request's context.
 *
 * @example
 * @FeatureFlag('new-checkout')
 * @Get('checkout')
 * checkout() {}
 */
export const FeatureFlag = (
  flagKey: string,
  options: FeatureFlagOptions = {},
) =>
  applyDecorators(
    SetMetadata<string, FeatureFlagMetadata>(FEATURE_FLAG_METADATA, {
      flagKey,
      ...options,
    }),
    UseGuards(FeatureFlagGuard),
  );
