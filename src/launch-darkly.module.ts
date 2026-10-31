import { DynamicModule, Module, Provider } from '@nestjs/common';
import { init } from '@launchdarkly/node-server-sdk';
import {
  LAUNCH_DARKLY_CLIENT,
  LAUNCH_DARKLY_OPTIONS,
} from './launch-darkly.constants';
import {
  LaunchDarklyModuleAsyncOptions,
  LaunchDarklyModuleOptions,
  LaunchDarklyOptionsFactory,
} from './interfaces';
import { LaunchDarklyService } from './launch-darkly.service';

const DEFAULT_INIT_TIMEOUT_SECONDS = 5;

const clientProvider: Provider = {
  provide: LAUNCH_DARKLY_CLIENT,
  inject: [LAUNCH_DARKLY_OPTIONS],
  useFactory: async (options: LaunchDarklyModuleOptions) => {
    const client = init(options.sdkKey, options.ldOptions);
    await client.waitForInitialization({
      timeout: options.initTimeoutSeconds ?? DEFAULT_INIT_TIMEOUT_SECONDS,
    });
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
      exports: [LaunchDarklyService],
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
      exports: [LaunchDarklyService],
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
