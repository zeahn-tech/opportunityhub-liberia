import { logger } from '../core/logging/logger';

export interface StorageAdapter {
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
}

class BrowserStorageAdapter implements StorageAdapter {
  private prefix = 'opphub_';
  private memoryStore: Map<string, string> = new Map();
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkAvailability();
    if (!this.isLocalStorageAvailable) {
      logger.warn('StorageAdapter', 'localStorage unavailable; falling back to in-memory store.');
    } else {
      // Warm up memory store with existing localStorage contents
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            const val = window.localStorage.getItem(k);
            if (val !== null) {
              this.memoryStore.set(k, val);
            }
          }
        }
      } catch (err) {
        logger.error('StorageAdapter', 'Failed to warm up memory store from localStorage', { error: String(err) });
      }
    }
  }

  private checkAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getItem<T>(key: string): T | null {
    const fullKey = this.prefix + key;
    try {
      // Always prefer the in-memory mirror as it will have any recent updates (even if un-persisted due to quota limits)
      let raw = this.memoryStore.get(fullKey) || null;
      if (!raw && this.isLocalStorageAvailable) {
        raw = window.localStorage.getItem(fullKey);
        if (raw) {
          this.memoryStore.set(fullKey, raw);
        }
      }

      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.error('StorageAdapter', `Failed to parse storage key "${key}"`, { error: String(err) });
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    const fullKey = this.prefix + key;
    try {
      const serialized = JSON.stringify(value);
      // Always update memory store first so we have the latest version in-memory
      this.memoryStore.set(fullKey, serialized);

      if (this.isLocalStorageAvailable) {
        try {
          window.localStorage.setItem(fullKey, serialized);
        } catch (storageErr) {
          // Gracefully fallback to memory-only representation on QuotaExceededError or sandbox restrictions
          logger.warn('StorageAdapter', `Failed to persist key "${key}" to LocalStorage (likely QuotaExceededError). App will operate in-memory for this key.`, { error: String(storageErr) });
        }
      }
    } catch (err) {
      logger.error('StorageAdapter', `Failed to serialize storage key "${key}"`, { error: String(err) });
    }
  }

  removeItem(key: string): void {
    const fullKey = this.prefix + key;
    this.memoryStore.delete(fullKey);
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(fullKey);
      } catch (err) {
        logger.error('StorageAdapter', `Failed to remove key "${key}" from LocalStorage`, { error: String(err) });
      }
    }
  }

  clear(): void {
    this.memoryStore.clear();
    if (this.isLocalStorageAvailable) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      } catch (err) {
        logger.error('StorageAdapter', 'Failed to clear LocalStorage prefix keys', { error: String(err) });
      }
    }
  }
}

export const storageAdapter: StorageAdapter = new BrowserStorageAdapter();
