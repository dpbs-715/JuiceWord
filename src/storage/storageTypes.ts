export type StorageKey = 'juiceword.config';

export interface ExtensionStorage {
  get<T>(key: StorageKey): Promise<T | undefined>;
  set<T>(key: StorageKey, value: T): Promise<void>;
}
