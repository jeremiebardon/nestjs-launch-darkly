import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlag } from '../decorators/feature-flag.decorator.js';
import { LaunchDarklyService } from '../launch-darkly.service.js';
import {
  defaultContextFactory,
  FeatureFlagGuard,
} from './feature-flag.guard.js';
type Mock = jest.Mock<(...args: any[]) => any>;
const mockFn = (): Mock => jest.fn<(...args: any[]) => any>();

@FeatureFlag('controller-flag')
@Controller('test')
class TestController {
  @Get('plain')
  plain() {}

  @FeatureFlag('route-flag', { expected: 'B', defaultValue: 'A' })
  @Get('variant')
  variant() {}

  @FeatureFlag('forbidden-flag', { exception: new ForbiddenException() })
  @Get('forbidden')
  forbidden() {}

  @FeatureFlag('custom-context', {
    context: () => ({ kind: 'org', key: 'org-1' }),
  })
  @Get('custom')
  custom() {}
}

const buildExecutionContext = (
  handler: (...args: any[]) => any,
  request: Record<string, unknown> = {},
): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('FeatureFlagGuard', () => {
  let variation: Mock;
  let contextFactory: Mock;
  let guard: FeatureFlagGuard;

  beforeEach(() => {
    variation = mockFn();
    contextFactory = mockFn();
    guard = new FeatureFlagGuard(
      new Reflector(),
      { variation } as unknown as LaunchDarklyService,
      { sdkKey: 'k' },
    );
  });

  it('allows the route when the flag is on (controller-level flag)', async () => {
    variation.mockResolvedValue(true);

    await expect(
      guard.canActivate(
        buildExecutionContext(TestController.prototype.plain, {
          user: { id: 42 },
        }),
      ),
    ).resolves.toBe(true);
    expect(variation).toHaveBeenCalledWith(
      'controller-flag',
      { kind: 'user', key: '42', id: 42 },
      false,
    );
  });

  it('throws NotFoundException when the flag is off', async () => {
    variation.mockResolvedValue(false);

    await expect(
      guard.canActivate(buildExecutionContext(TestController.prototype.plain)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('handler metadata overrides controller metadata and honours expected/default', async () => {
    variation.mockResolvedValue('B');

    await expect(
      guard.canActivate(
        buildExecutionContext(TestController.prototype.variant),
      ),
    ).resolves.toBe(true);
    expect(variation).toHaveBeenCalledWith(
      'route-flag',
      expect.anything(),
      'A',
    );
  });

  it('rejects when the variation differs from expected', async () => {
    variation.mockResolvedValue('A');

    await expect(
      guard.canActivate(
        buildExecutionContext(TestController.prototype.variant),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws the custom exception when provided', async () => {
    variation.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        buildExecutionContext(TestController.prototype.forbidden),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uses a route-level context over the module contextFactory', async () => {
    variation.mockResolvedValue(true);
    guard = new FeatureFlagGuard(
      new Reflector(),
      { variation } as unknown as LaunchDarklyService,
      { sdkKey: 'k', contextFactory },
    );

    await guard.canActivate(
      buildExecutionContext(TestController.prototype.custom),
    );

    expect(contextFactory).not.toHaveBeenCalled();
    expect(variation).toHaveBeenCalledWith(
      'custom-context',
      { kind: 'org', key: 'org-1' },
      false,
    );
  });

  it('uses the module contextFactory when no route context is set', async () => {
    variation.mockResolvedValue(true);
    contextFactory.mockResolvedValue({ kind: 'tenant', key: 't1' });
    guard = new FeatureFlagGuard(
      new Reflector(),
      { variation } as unknown as LaunchDarklyService,
      { sdkKey: 'k', contextFactory },
    );

    await guard.canActivate(
      buildExecutionContext(TestController.prototype.plain),
    );

    expect(variation).toHaveBeenCalledWith(
      'controller-flag',
      { kind: 'tenant', key: 't1' },
      false,
    );
  });

  it('allows routes without flag metadata', async () => {
    class Unflagged {
      handler() {}
    }
    const ctx = {
      getHandler: () => Unflagged.prototype.handler,
      getClass: () => Unflagged,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(variation).not.toHaveBeenCalled();
  });
});

describe('defaultContextFactory', () => {
  const ctxFor = (request: unknown) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it('returns an anonymous user context without request.user', () => {
    expect(defaultContextFactory(ctxFor({}))).toEqual({
      kind: 'user',
      key: 'anonymous',
      anonymous: true,
    });
  });

  it('prefers key, then id, then sub', () => {
    expect(defaultContextFactory(ctxFor({ user: { sub: 's' } })).key).toBe('s');
    expect(
      defaultContextFactory(ctxFor({ user: { key: 'k', id: 1 } })).key,
    ).toBe('k');
  });

  it('keeps an explicit kind', () => {
    expect(
      defaultContextFactory(ctxFor({ user: { kind: 'org', key: 'o' } })),
    ).toMatchObject({ kind: 'org', key: 'o' });
  });
});
