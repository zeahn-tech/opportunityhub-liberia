import { describe, it, expect } from 'vitest';
import { envConfig } from '../config/env';
import { LIBERIAN_COUNTIES, OPPORTUNITY_TYPES, EXCHANGE_RATES } from '../config/constants';

describe('Environment & Configuration Foundation', () => {
  it('should load valid environment configuration', () => {
    expect(envConfig).toBeDefined();
    expect(['development', 'staging', 'production', 'test']).toContain(envConfig.appEnv);
    expect(envConfig.apiBaseUrl).toBeDefined();
    expect(['USD', 'LRD']).toContain(envConfig.defaultCurrency);
    expect(typeof envConfig.enableLowBandwidthMode).toBe('boolean');
    expect(typeof envConfig.pwaEnabled).toBe('boolean');
  });

  it('should include all 15 Liberian counties', () => {
    expect(LIBERIAN_COUNTIES).toHaveLength(15);
    expect(LIBERIAN_COUNTIES).toContain('Montserrado');
    expect(LIBERIAN_COUNTIES).toContain('Nimba');
    expect(LIBERIAN_COUNTIES).toContain('Bong');
    expect(LIBERIAN_COUNTIES).toContain('Maryland');
    expect(LIBERIAN_COUNTIES).toContain('Lofa');
  });

  it('should include all 13 core opportunity types', () => {
    expect(OPPORTUNITY_TYPES).toHaveLength(13);
    const ids = OPPORTUNITY_TYPES.map((t) => t.id);
    expect(ids).toContain('job');
    expect(ids).toContain('internship');
    expect(ids).toContain('tender');
    expect(ids).toContain('scholarship');
    expect(ids).toContain('contract');
    expect(ids).toContain('business_sale');
  });

  it('should define benchmark exchange rates between USD and LRD', () => {
    expect(EXCHANGE_RATES.USD_TO_LRD).toBeGreaterThan(100);
    expect(EXCHANGE_RATES.LRD_TO_USD).toBeCloseTo(1 / EXCHANGE_RATES.USD_TO_LRD, 4);
  });
});
