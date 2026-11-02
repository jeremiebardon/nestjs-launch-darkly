import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type {
  LDClient,
  LDContext,
  LDEvaluationDetailTyped,
  LDFlagsState,
  LDFlagsStateOptions,
  LDFlagValue,
} from '@launchdarkly/node-server-sdk';
import { LAUNCH_DARKLY_CLIENT } from './launch-darkly.constants.js';

@Injectable()
export class LaunchDarklyService implements OnModuleDestroy {
  constructor(
    @Inject(LAUNCH_DARKLY_CLIENT) private readonly client: LDClient,
  ) {}

  variation<T = LDFlagValue>(
    flagKey: string,
    context: LDContext,
    defaultValue: T,
  ): Promise<T> {
    return this.client.variation(flagKey, context, defaultValue);
  }

  boolVariation(
    flagKey: string,
    context: LDContext,
    defaultValue = false,
  ): Promise<boolean> {
    return this.client.boolVariation(flagKey, context, defaultValue);
  }

  stringVariation(
    flagKey: string,
    context: LDContext,
    defaultValue: string,
  ): Promise<string> {
    return this.client.stringVariation(flagKey, context, defaultValue);
  }

  numberVariation(
    flagKey: string,
    context: LDContext,
    defaultValue: number,
  ): Promise<number> {
    return this.client.numberVariation(flagKey, context, defaultValue);
  }

  jsonVariation<T = unknown>(
    flagKey: string,
    context: LDContext,
    defaultValue: T,
  ): Promise<T> {
    return this.client.jsonVariation(
      flagKey,
      context,
      defaultValue,
    ) as Promise<T>;
  }

  variationDetail<T = LDFlagValue>(
    flagKey: string,
    context: LDContext,
    defaultValue: T,
  ): Promise<LDEvaluationDetailTyped<T>> {
    return this.client.variationDetail(
      flagKey,
      context,
      defaultValue,
    ) as Promise<LDEvaluationDetailTyped<T>>;
  }

  allFlagsState(
    context: LDContext,
    options?: LDFlagsStateOptions,
  ): Promise<LDFlagsState> {
    return this.client.allFlagsState(context, options);
  }

  track(
    eventKey: string,
    context: LDContext,
    data?: unknown,
    metricValue?: number,
  ): void {
    this.client.track(eventKey, context, data, metricValue);
  }

  identify(context: LDContext): void {
    this.client.identify(context);
  }

  flush(): Promise<void> {
    return this.client.flush();
  }

  /**
   * Whether the SDK has connected to LaunchDarkly. While false, flags evaluate
   * to their default values; use it in a health check or alert on it.
   */
  isInitialized(): boolean {
    return this.client.initialized();
  }

  /** Escape hatch for SDK features not wrapped by this service. */
  getClient(): LDClient {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.flush().catch(() => undefined);
    this.client.close();
  }
}
