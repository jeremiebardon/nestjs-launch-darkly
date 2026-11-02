import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { integrations } from '@launchdarkly/node-server-sdk';
import { FeatureFlag } from './decorators/feature-flag.decorator.js';
import { LaunchDarklyModule } from './launch-darkly.module.js';
import { LaunchDarklyService } from './launch-darkly.service.js';

// Real Nest app + real SDK, fed by the SDK's in-memory TestData source (no
// network): exercises DI wiring, init and the guard end to end.

const createTestData = () => {
  const td = new integrations.TestData();
  td.update(td.flag('on-flag').booleanFlag().variationForAll(true));
  td.update(td.flag('off-flag').booleanFlag().variationForAll(false));
  td.update(td.flag('variant-flag').variations('A', 'B').variationForAll(1));
  return td;
};

const noop = () => undefined;
const silentLogger = { debug: noop, info: noop, warn: noop, error: noop };

const sdkOptions = (td: InstanceType<typeof integrations.TestData>) => ({
  sdkKey: 'sdk-test-key',
  ldOptions: {
    updateProcessor: td.getFactory(),
    sendEvents: false,
    logger: silentLogger,
  },
});

@Controller('flags')
class FlagsController {
  @FeatureFlag('on-flag')
  @Get('on')
  on() {
    return 'on';
  }

  @FeatureFlag('off-flag')
  @Get('off')
  off() {
    return 'off';
  }

  @FeatureFlag('variant-flag', { expected: 'B' })
  @Get('variant')
  variant() {
    return 'variant';
  }

  @FeatureFlag('missing-flag')
  @Get('missing')
  missing() {
    return 'missing';
  }
}

describe('LaunchDarkly integration (SDK in test-data mode)', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  const start = async (imports: any[], controllers: any[] = []) => {
    const moduleRef = await Test.createTestingModule({
      imports,
      controllers,
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    return app;
  };

  const get = async (path: string) =>
    fetch(`${await app!.getUrl()}${path}`).then((res) => res.status);

  it('initializes the SDK and evaluates flags through the service', async () => {
    await start([LaunchDarklyModule.forRoot(sdkOptions(createTestData()))]);
    const ld = app!.get(LaunchDarklyService);
    const context = { kind: 'user', key: 'user-1' };

    expect(ld.getClient().initialized()).toBe(true);
    await expect(ld.boolVariation('on-flag', context)).resolves.toBe(true);
    await expect(ld.boolVariation('off-flag', context, true)).resolves.toBe(
      false,
    );
    await expect(
      ld.stringVariation('variant-flag', context, 'A'),
    ).resolves.toBe('B');
    await expect(ld.boolVariation('unknown-flag', context, true)).resolves.toBe(
      true,
    );
  });

  it('gates routes with @FeatureFlag using the real guard', async () => {
    await start(
      [LaunchDarklyModule.forRoot(sdkOptions(createTestData()))],
      [FlagsController],
    );

    expect(await get('/flags/on')).toBe(200);
    expect(await get('/flags/off')).toBe(404);
    expect(await get('/flags/variant')).toBe(200);
    expect(await get('/flags/missing')).toBe(404);
  });

  it('reacts to flag changes at runtime', async () => {
    const td = createTestData();
    await start(
      [LaunchDarklyModule.forRoot(sdkOptions(td))],
      [FlagsController],
    );

    expect(await get('/flags/off')).toBe(404);
    td.update(td.flag('off-flag').booleanFlag().variationForAll(true));
    expect(await get('/flags/off')).toBe(200);
  });

  it('works with forRootAsync', async () => {
    const td = createTestData();
    await start(
      [
        LaunchDarklyModule.forRootAsync({
          useFactory: async () => sdkOptions(td),
        }),
      ],
      [FlagsController],
    );

    expect(await get('/flags/on')).toBe(200);
  });

  it('flushes and closes the client on shutdown', async () => {
    await start([LaunchDarklyModule.forRoot(sdkOptions(createTestData()))]);
    const client = app!.get(LaunchDarklyService).getClient();
    const flush = jest.spyOn(client, 'flush');
    const close = jest.spyOn(client, 'close');

    await app!.close();
    app = undefined;

    expect(flush).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('uses @FeatureFlag in a feature module when the module is not global', async () => {
    const options = { ...sdkOptions(createTestData()), isGlobal: false };
    const ld = LaunchDarklyModule.forRoot(options);

    @Module({ imports: [ld], controllers: [FlagsController] })
    class FeatureModule {}

    await start([ld, FeatureModule]);

    expect(await get('/flags/on')).toBe(200);
  });
});
