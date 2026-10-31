import { ModuleMetadata, Type } from '@nestjs/common';
import type { LDOptions } from '@launchdarkly/node-server-sdk';

export interface LaunchDarklyModuleOptions {
  /** LaunchDarkly server-side SDK key. */
  sdkKey: string;
  /** Raw SDK options passed through to `init`. */
  ldOptions?: LDOptions;
  /** Max seconds to wait for initialization. Defaults to 5. */
  initTimeoutSeconds?: number;
  /** Register the module globally. Defaults to true. */
  isGlobal?: boolean;
}

export interface LaunchDarklyOptionsFactory {
  createLaunchDarklyOptions():
    | Promise<LaunchDarklyModuleOptions>
    | LaunchDarklyModuleOptions;
}

export interface LaunchDarklyModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  isGlobal?: boolean;
  useExisting?: Type<LaunchDarklyOptionsFactory>;
  useClass?: Type<LaunchDarklyOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<LaunchDarklyModuleOptions> | LaunchDarklyModuleOptions;
  inject?: any[];
}
