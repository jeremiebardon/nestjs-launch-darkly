import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { init } from '@launchdarkly/node-server-sdk';
import {
  LAUNCH_DARKLY_CLIENT,
  LAUNCH_DARKLY_OPTIONS,
} from './launch-darkly.constants.js';
import {
  LaunchDarklyModuleAsyncOptions,
  LaunchDarklyModuleOptions,
  LaunchDarklyOptionsFactory,
} from './interfaces/index.js';
import { LaunchDarklyService } from './launch-darkly.service.js';

const DEFAULT_INIT_TIMEOUT_SECONDS = 5;
const logger = new Logger('LaunchDarklyModule');

const clientProvider: Provider = {
  provide: LAUNCH_DARKLY_CLIENT,
  inject: [LAUNCH_DARKLY_OPTIONS],
  useFactory: async (options: LaunchDarklyModuleOptions) => {
    const client = init(options.sdkKey, options.ldOptions);
    try {
      await client.waitForInitialization({
        timeout: options.initTimeoutSeconds ?? DEFAULT_INIT_TIMEOUT_SECONDS,
      });
    } catch (err) {
      if (options.throwOnInitError) {
        client.close();
        throw err;
      }
      logger.error(
        `LaunchDarkly initialization failed, flags will use default values until connected: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return client;
  },
};

@Module({})
export class LaunchDarklyModule {
  static forRoot(options: LaunchDarklyModuleOptions): DynamicModule {
    return {
      module: LaunchDarklyModule,
      global: options.isGlobal ?? true,
      providers: [
        { provide: LAUNCH_DARKLY_OPTIONS, useValue: options },
        clientProvider,
        LaunchDarklyService,
      ],
      exports: [LaunchDarklyService, LAUNCH_DARKLY_OPTIONS],
    };
  }

  static forRootAsync(options: LaunchDarklyModuleAsyncOptions): DynamicModule {
    return {
      module: LaunchDarklyModule,
      global: options.isGlobal ?? true,
      imports: options.imports ?? [],
      providers: [
        ...LaunchDarklyModule.createAsyncProviders(options),
        clientProvider,
        LaunchDarklyService,
      ],
      exports: [LaunchDarklyService, LAUNCH_DARKLY_OPTIONS],
    };
  }

  private static createAsyncProviders(
    options: LaunchDarklyModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: LAUNCH_DARKLY_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    const target = options.useClass ?? options.useExisting;
    if (!target) {
      throw new Error(
        'LaunchDarklyModule.forRootAsync requires useFactory, useClass or useExisting',
      );
    }

    const providers: Provider[] = [
      {
        provide: LAUNCH_DARKLY_OPTIONS,
        useFactory: (factory: LaunchDarklyOptionsFactory) =>
          factory.createLaunchDarklyOptions(),
        inject: [target],
      },
    ];
    if (options.useClass) {
      providers.push({ provide: options.useClass, useClass: options.useClass });
    }
    return providers;
  }
}
