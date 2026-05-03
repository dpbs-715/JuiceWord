import { extensionStorage } from '../storage/extensionStorage';
import { normalizeConfig } from './configSchema';
import type { ExtensionConfig } from './configTypes';

const CONFIG_KEY = 'juiceword.config';

export const configService = {
  async getConfig(): Promise<ExtensionConfig> {
    const stored = await extensionStorage.get<Partial<ExtensionConfig>>(CONFIG_KEY);
    return normalizeConfig(stored);
  },

  async saveConfig(config: ExtensionConfig): Promise<ExtensionConfig> {
    const normalized = normalizeConfig(config);
    await extensionStorage.set(CONFIG_KEY, normalized);
    return normalized;
  },

  async setActiveModelProfile(profileId: string): Promise<ExtensionConfig> {
    const config = await this.getConfig();
    const normalized = normalizeConfig({
      ...config,
      activeModelProfileId: profileId,
    });
    await extensionStorage.set(CONFIG_KEY, normalized);
    return normalized;
  },

  async setComparisonModelProfiles(profileIds: string[]): Promise<ExtensionConfig> {
    const config = await this.getConfig();
    const normalized = normalizeConfig({
      ...config,
      comparisonModelProfileIds: profileIds,
    });
    await extensionStorage.set(CONFIG_KEY, normalized);
    return normalized;
  },
};
