import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FeatureFlag,
  LaunchDarklyModule,
  LaunchDarklyService,
} from '../src/index.js';

const FLAG = process.env.LD_FLAG_KEY ?? 'my-test-flag';

@Controller('demo')
class DemoController {
  constructor(private readonly ld: LaunchDarklyService) {}

  /** 404 unless the flag is on for the user in the `x-user-id` header. */
  @FeatureFlag(FLAG)
  @Get('guarded')
  guarded() {
    return { message: `flag "${FLAG}" is on` };
  }

  /** Evaluates the flag through the injected service. */
  @Get('service')
  async service() {
    const context = { kind: 'user', key: 'service-user' };
    return {
      value: await this.ld.boolVariation(FLAG, context, false),
      detail: await this.ld.variationDetail(FLAG, context, false),
    };
  }
}

@Module({
  imports: [
    LaunchDarklyModule.forRoot({
      sdkKey: process.env.LD_SDK_KEY ?? 'offline',
      throwOnInitError: !process.env.LD_OFFLINE,
      ldOptions: { offline: !!process.env.LD_OFFLINE },
      contextFactory: (ctx) => {
        const req = ctx.switchToHttp().getRequest();
        return {
          kind: 'user',
          key: req.headers['x-user-id'] ?? 'anonymous',
        };
      },
    }),
  ],
  controllers: [DemoController],
})
class AppModule {}

(async () => {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // flushes + closes the LD client on SIGINT/SIGTERM
  await app.listen(Number(process.env.PORT ?? 3000));
  console.log(`Try: curl -H "x-user-id: me" localhost:${process.env.PORT ?? 3000}/demo/guarded`);
})();
