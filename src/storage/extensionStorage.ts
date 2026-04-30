import { browser } from 'wxt/browser';
import type { ExtensionStorage, StorageKey } from './storageTypes';

export const extensionStorage: ExtensionStorage = {
  async get<T>(key: StorageKey): Promise<T | undefined> {
    const values = await browser.storage.local.get(key);
    return values[key] as T | undefined;
  },

  async set<T>(key: StorageKey, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
};
