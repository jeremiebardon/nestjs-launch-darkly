import { ExecutionContext, ModuleMetadata, Type } from '@nestjs/common';
import type { LDContext, LDOptions } from '@launchdarkly/node-server-sdk';

/** Builds the LaunchDarkly evaluation context for the current request. */
export type LaunchDarklyContextFactory = (
  executionContext: ExecutionContext,
) => LDContext | Promise<LDContext>;

export interface LaunchDarklyModuleOptions {
  /** LaunchDarkly server-side SDK key (project + environment specific). */
  sdkKey: string;
  /** Raw SDK options passed through to `init` (e.g. `offline`, `plugins`). */
  ldOptions?: LDOptions;
  /** Max seconds `waitForInitialization` waits. Defaults to 5. */
  initTimeoutSeconds?: number;
  /**
   * When true, a timeout/failed initialization rejects and aborts app
   * bootstrap. When false (default) the error is logged, and flags evaluate
   * to their default values until the SDK finishes connecting.
   */
  throwOnInitError?: boolean;
  /**
   * Resolves the evaluation context used by `@FeatureFlag` guards.
   * Defaults to a `user` context derived from `request.user`.
   */
  contextFactory?: LaunchDarklyContextFactory;
  /** Register the module globally. Defaults to true. */
  isGlobal?: boolean;
}

export interface LaunchDarklyOptionsFactory {
  createLaunchDarklyOptions():
    Promise<LaunchDarklyModuleOptions> | LaunchDarklyModuleOptions;
}

export interface LaunchDarklyModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  isGlobal?: boolean;
  useExisting?: Type<LaunchDarklyOptionsFactory>;
  useClass?: Type<LaunchDarklyOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<LaunchDarklyModuleOptions> | LaunchDarklyModuleOptions;
  inject?: any[];
}
