import { logger } from '../core/logging/logger';
import { AppError, NetworkOfflineError } from '../core/errors/AppError';
import { envConfig } from '../config/env';

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string; details?: Record<string, unknown> } | null;
  status: number;
  timestamp: string;
}

export interface RequestOptions {
  simulatedDelayMs?: number;
  skipOfflineCheck?: boolean;
}

class ApiClient {
  // Historically this delay simulated network latency against the local
  // in-memory dbClient store, which otherwise resolved instantly and felt
  // unrealistic. Now that every service in src/services/*.ts (list(),
  // getById(), etc.) talks to a real Supabase backend with its own real
  // network round-trip, this artificial sleep is pure added latency on
  // top of that -- every one of the ~58 apiClient.execute() call sites
  // across opportunityService/businessService/candidateService/etc. was
  // paying an unconditional extra 80ms (or 350ms in low-bandwidth mode,
  // which is backwards: that mode should reduce payload, not add delay)
  // on every request. Skip the simulation entirely once Supabase is
  // configured; keep it for the pure local/demo-mode fallback, where
  // there's no real network call for it to stack on top of.
  private defaultDelay =
    envConfig.supabaseUrl && envConfig.supabaseAnonKey
      ? 0
      : envConfig.enableLowBandwidthMode
        ? 350
        : 80;

  private async simulateNetwork(options?: RequestOptions): Promise<void> {
    if (
      !options?.skipOfflineCheck &&
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.onLine === false
    ) {
      throw new NetworkOfflineError();
    }

    const delay = options?.simulatedDelayMs ?? (typeof window !== 'undefined' ? this.defaultDelay : 0);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  public async execute<T>(action: () => Promise<T> | T, options?: RequestOptions): Promise<ApiResponse<T>> {
    const start = performance.now();
    try {
      await this.simulateNetwork(options);
      const result = await action();
      const elapsed = Math.round(performance.now() - start);

      logger.debug('API', `Operation succeeded in ${elapsed}ms`);

      return {
        data: result,
        error: null,
        status: 200,
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start);
      if (err instanceof AppError) {
        logger.warn('API', `Handled AppError [${err.code}]: ${err.message} (${elapsed}ms)`);
        return {
          data: null,
          error: { code: err.code, message: err.message, details: err.details },
          status: err.statusCode,
          timestamp: new Date().toISOString()
        };
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('API', `Unhandled Exception: ${errorMsg} (${elapsed}ms)`, { raw: String(err) });

      return {
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected system error occurred.' },
        status: 500,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const apiClient = new ApiClient();
