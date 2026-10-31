import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { LAUNCH_DARKLY_CLIENT } from './launch-darkly.constants.js';
import { LaunchDarklyService } from './launch-darkly.service.js';
type Mock = jest.Mock<(...args: any[]) => any>;
const mockFn = (): Mock => jest.fn<(...args: any[]) => any>();

describe('LaunchDarklyService', () => {
  const context = { kind: 'user', key: 'user-1' };
  let service: LaunchDarklyService;
  let client: Record<string, Mock>;

  beforeEach(async () => {
    client = {
      variation: mockFn(),
      boolVariation: mockFn(),
      stringVariation: mockFn(),
      numberVariation: mockFn(),
      jsonVariation: mockFn(),
      variationDetail: mockFn(),
      allFlagsState: mockFn(),
      track: mockFn(),
      identify: mockFn(),
      flush: mockFn().mockResolvedValue(undefined),
      close: mockFn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LaunchDarklyService,
        { provide: LAUNCH_DARKLY_CLIENT, useValue: client },
      ],
    }).compile();

    service = moduleRef.get(LaunchDarklyService);
  });

  it('delegates boolVariation to the client', async () => {
    client.boolVariation.mockResolvedValue(true);

    await expect(service.boolVariation('flag', context)).resolves.toBe(true);
    expect(client.boolVariation).toHaveBeenCalledWith('flag', context, false);
  });

  it('passes through a custom default value', async () => {
    client.stringVariation.mockResolvedValue('fallback');

    await service.stringVariation('flag', context, 'fallback');
    expect(client.stringVariation).toHaveBeenCalledWith(
      'flag',
      context,
      'fallback',
    );
  });

  it('delegates number and json variations', async () => {
    client.numberVariation.mockResolvedValue(3);
    client.jsonVariation.mockResolvedValue({ a: 1 });

    await expect(service.numberVariation('n', context, 1)).resolves.toBe(3);
    await expect(service.jsonVariation('j', context, {})).resolves.toEqual({
      a: 1,
    });
  });

  it('delegates generic variation and variationDetail', async () => {
    client.variation.mockResolvedValue('x');
    client.variationDetail.mockResolvedValue({ value: 'x', reason: {} });

    await expect(service.variation('f', context, 'd')).resolves.toBe('x');
    await expect(service.variationDetail('f', context, 'd')).resolves.toEqual({
      value: 'x',
      reason: {},
    });
  });

  it('delegates allFlagsState with options', async () => {
    const state = { toJSON: mockFn() };
    client.allFlagsState.mockResolvedValue(state);

    await expect(
      service.allFlagsState(context, { clientSideOnly: true }),
    ).resolves.toBe(state);
    expect(client.allFlagsState).toHaveBeenCalledWith(context, {
      clientSideOnly: true,
    });
  });

  it('tracks events and identifies contexts', () => {
    service.track('event', context, { a: 1 }, 2);
    service.identify(context);

    expect(client.track).toHaveBeenCalledWith('event', context, { a: 1 }, 2);
    expect(client.identify).toHaveBeenCalledWith(context);
  });

  it('exposes the raw client', () => {
    expect(service.getClient()).toBe(client);
  });

  it('flushes and closes the client on module destroy', async () => {
    await service.onModuleDestroy();

    expect(client.flush).toHaveBeenCalled();
    expect(client.close).toHaveBeenCalled();
  });

  it('still closes the client if flush fails', async () => {
    client.flush.mockRejectedValue(new Error('network'));

    await service.onModuleDestroy();

    expect(client.close).toHaveBeenCalled();
  });
});
