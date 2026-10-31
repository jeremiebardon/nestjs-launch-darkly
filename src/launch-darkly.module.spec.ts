import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Injectable, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { LaunchDarklyOptionsFactory } from './interfaces/index.js';

type Mock = jest.Mock<(...args: any[]) => any>;
const mockFn = (): Mock => jest.fn<(...args: any[]) => any>();

// ESM: the SDK must be mocked before the module under test is imported.
const initMock = mockFn();
jest.unstable_mockModule('@launchdarkly/node-server-sdk', () => ({
  init: initMock,
}));
const { LaunchDarklyModule } = await import('./launch-darkly.module.js');
const { LaunchDarklyService } = await import('./launch-darkly.service.js');

describe('LaunchDarklyModule', () => {
  let client: {
    waitForInitialization: Mock;
    flush: Mock;
    close: Mock;
  };

  beforeEach(() => {
    client = {
      waitForInitialization: mockFn().mockResolvedValue(undefined),
      flush: mockFn().mockResolvedValue(undefined),
      close: mockFn(),
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

  it('logs and continues when initialization fails by default', async () => {
    client.waitForInitialization.mockRejectedValue(new Error('timeout'));
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [LaunchDarklyModule.forRoot({ sdkKey: 'k' })],
    }).compile();

    expect(moduleRef.get(LaunchDarklyService)).toBeDefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('timeout'));
    errorSpy.mockRestore();
  });

  it('rejects and closes the client when throwOnInitError is set', async () => {
    client.waitForInitialization.mockRejectedValue(new Error('timeout'));

    await expect(
      Test.createTestingModule({
        imports: [
          LaunchDarklyModule.forRoot({ sdkKey: 'k', throwOnInitError: true }),
        ],
      }).compile(),
    ).rejects.toThrow('timeout');
    expect(client.close).toHaveBeenCalled();
  });

  it('closes the client when the app shuts down', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LaunchDarklyModule.forRoot({ sdkKey: 'k' })],
    }).compile();

    await moduleRef.close();

    expect(client.close).toHaveBeenCalled();
  });
});
