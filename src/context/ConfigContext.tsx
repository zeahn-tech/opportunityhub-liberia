import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EXCHANGE_RATES } from '../config/constants';
import { envConfig } from '../config/env';
import { logger } from '../core/logging/logger';

interface ConfigContextType {
  currency: 'USD' | 'LRD';
  setCurrency: (c: 'USD' | 'LRD') => void;
  formatCurrency: (amountUSD: number | undefined | null, targetCurrency?: 'USD' | 'LRD') => string;
  isLowBandwidthMode: boolean;
  toggleLowBandwidthMode: () => void;
  isOnline: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<'USD' | 'LRD'>(() => {
    const saved = localStorage.getItem('opphub_currency');
    return saved === 'LRD' ? 'LRD' : envConfig.defaultCurrency;
  });

  const [isLowBandwidthMode, setIsLowBandwidthMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('opphub_low_bandwidth');
    return saved === 'true' || envConfig.enableLowBandwidthMode;
  });

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('NETWORK', 'Device connectivity restored: Online.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      logger.warn('NETWORK', 'Device lost internet connectivity: Offline Mode active.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setCurrency = (c: 'USD' | 'LRD') => {
    setCurrencyState(c);
    localStorage.setItem('opphub_currency', c);
  };

  const toggleLowBandwidthMode = () => {
    setIsLowBandwidthMode((prev) => {
      const next = !prev;
      localStorage.setItem('opphub_low_bandwidth', String(next));
      logger.info('CONFIG', `Low-Bandwidth Data Saver mode: ${next ? 'ENABLED' : 'DISABLED'}`);
      return next;
    });
  };

  const formatCurrency = (amountUSD: number | undefined | null, targetCurrency?: 'USD' | 'LRD'): string => {
    if (amountUSD === undefined || amountUSD === null) return 'Negotiable';
    const curr = targetCurrency || currency;

    if (curr === 'LRD') {
      const amountLRD = Math.round(amountUSD * EXCHANGE_RATES.USD_TO_LRD);
      return `L$ ${amountLRD.toLocaleString()}`;
    }

    return `$${amountUSD.toLocaleString()}`;
  };

  return (
    <ConfigContext.Provider
      value={{
        currency,
        setCurrency,
        formatCurrency,
        isLowBandwidthMode,
        toggleLowBandwidthMode,
        isOnline
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
