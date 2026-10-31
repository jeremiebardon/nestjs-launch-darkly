import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { init } from '@launchdarkly/node-server-sdk';
import { LaunchDarklyOptionsFactory } from './interfaces';
import { LaunchDarklyModule } from './launch-darkly.module';
import { LaunchDarklyService } from './launch-darkly.service';

jest.mock('@launchdarkly/node-server-sdk', () => ({ init: jest.fn() }));

describe('LaunchDarklyModule', () => {
  const initMock = init as unknown as jest.Mock;
  let client: {
    waitForInitialization: jest.Mock;
    flush: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(() => {
    client = {
      waitForInitialization: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    };
    initMock.mockReset().mockReturnValue(client);
  });

  it('forRoot initializes the SDK and provides the service', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        LaunchDarklyModule.forRoot({
          sdkKey: 'sdk-key',
          ldOptions: { offline: true },
          initTimeoutSeconds: 2,
        }),
      ],
    }).compile();

    expect(initMock).toHaveBeenCalledWith('sdk-key', { offline: true });
    expect(client.waitForInitialization).toHaveBeenCalledWith({ timeout: 2 });
    expect(moduleRef.get(LaunchDarklyService)).toBeInstanceOf(
      LaunchDarklyService,
    );
  });

  it('uses a default init timeout of 5 seconds', async () => {
    await Test.createTestingModule({
      imports: [LaunchDarklyModule.forRoot({ sdkKey: 'k' })],
    }).compile();

    expect(client.waitForInitialization).toHaveBeenCalledWith({ timeout: 5 });
  });

  it('forRootAsync supports useFactory', async () => {
    await Test.createTestingModule({
      imports: [
        LaunchDarklyModule.forRootAsync({
          useFactory: () => ({ sdkKey: 'factory-key' }),
        }),
      ],
    }).compile();

    expect(initMock).toHaveBeenCalledWith('factory-key', undefined);
  });

  it('forRootAsync supports useClass', async () => {
    @Injectable()
    class ConfigFactory implements LaunchDarklyOptionsFactory {
      createLaunchDarklyOptions() {
        return { sdkKey: 'class-key' };
      }
    }

    await Test.createTestingModule({
      imports: [LaunchDarklyModule.forRootAsync({ useClass: ConfigFactory })],
    }).compile();

    expect(initMock).toHaveBeenCalledWith('class-key', undefined);
  });

  it('forRootAsync throws without a provider strategy', () => {
    expect(() => LaunchDarklyModule.forRootAsync({})).toThrow(
      /useFactory, useClass or useExisting/,
    );
  });

  it('closes the client when the app shuts down', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LaunchDarklyModule.forRoot({ sdkKey: 'k' })],
    }).compile();

    await moduleRef.close();

    expect(client.close).toHaveBeenCalled();
  });
});
