import { DEFAULT_BASE_URL, DEFAULT_TARGET_LANGUAGE } from '../shared/constants';
import type { ExtensionConfig } from './configTypes';

export const DEFAULT_CONFIG: ExtensionConfig = {
  baseUrl: DEFAULT_BASE_URL,
  apiKey: '',
  model: 'deepseek-chat',
  targetLanguage: DEFAULT_TARGET_LANGUAGE,
};

export function normalizeConfig(config?: Partial<ExtensionConfig>): ExtensionConfig {
  return {
    baseUrl: config?.baseUrl?.trim() || DEFAULT_CONFIG.baseUrl,
    apiKey: config?.apiKey?.trim() || DEFAULT_CONFIG.apiKey,
    model: config?.model?.trim() || DEFAULT_CONFIG.model,
    targetLanguage: config?.targetLanguage?.trim() || DEFAULT_CONFIG.targetLanguage,
  };
}
