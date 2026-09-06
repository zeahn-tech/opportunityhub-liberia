export interface AppConfig {
  appEnv: 'development' | 'staging' | 'production' | 'test';
  apiBaseUrl: string;
  defaultCurrency: 'USD' | 'LRD';
  enableLowBandwidthMode: boolean;
  pwaEnabled: boolean;
  isProduction: boolean;
  isDevelopment: boolean;
}

function parseBoolean(val: string | undefined, defaultValue: boolean): boolean {
  if (val === undefined || val === null || val === '') return defaultValue;
  return val.toLowerCase() === 'true' || val === '1';
}

function loadConfig(): AppConfig {
  const env = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development') as AppConfig['appEnv'];
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const defaultCurrency = (import.meta.env.VITE_DEFAULT_CURRENCY === 'LRD' ? 'LRD' : 'USD') as 'USD' | 'LRD';
  const enableLowBandwidthMode = parseBoolean(import.meta.env.VITE_ENABLE_LOW_BANDWIDTH_MODE, false);
  const pwaEnabled = parseBoolean(import.meta.env.VITE_PWA_ENABLED, true);

  return Object.freeze({
    appEnv: env,
    apiBaseUrl,
    defaultCurrency,
    enableLowBandwidthMode,
    pwaEnabled,
    isProduction: env === 'production',
    isDevelopment: env === 'development'
  });
}

export const envConfig: AppConfig = loadConfig();
