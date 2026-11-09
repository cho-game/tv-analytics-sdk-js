import type { StorageAdapter, VeloStoreLike } from './types';

export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      // Ignore quota exceeded or security errors
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }
}

export function createDefaultStorage(): StorageAdapter {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      const testKey = '__tv_analytics_test__';
      globalThis.localStorage.setItem(testKey, '1');
      globalThis.localStorage.removeItem(testKey);
      return new LocalStorageAdapter(globalThis.localStorage);
    }
  } catch {
    // LocalStorage blocked (e.g. incognito or non-browser)
  }
  return new MemoryStorageAdapter();
}

export function wrapStore(store?: StorageAdapter | VeloStoreLike): StorageAdapter {
  if (!store) {
    return createDefaultStorage();
  }

  // If already standard StorageAdapter
  if ('getItem' in store && typeof store.getItem === 'function') {
    return store as StorageAdapter;
  }

  // If VeloStoreLike
  return {
    getItem(key: string): string | null {
      if ('get_string' in store && typeof store.get_string === 'function') {
        const val = store.get_string(key, '');
        return val ? val : null;
      }
      if ('getString' in store && typeof store.getString === 'function') {
        const val = store.getString(key, '');
        return val ? val : null;
      }
      return null;
    },
    setItem(key: string, value: string): void {
      if ('set_string' in store && typeof store.set_string === 'function') {
        store.set_string(key, value);
      } else if ('setString' in store && typeof store.setString === 'function') {
        store.setString(key, value);
      }
      if ('save' in store && typeof store.save === 'function') {
        try {
          store.save();
        } catch {
          // ignore save error
        }
      }
    },
    removeItem(key: string): void {
      if ('set_string' in store && typeof store.set_string === 'function') {
        store.set_string(key, '');
      } else if ('setString' in store && typeof store.setString === 'function') {
        store.setString(key, '');
      }
      if ('save' in store && typeof store.save === 'function') {
        try {
          store.save();
        } catch {
          // ignore save error
        }
      }
    },
  };
}
