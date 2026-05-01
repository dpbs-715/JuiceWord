import { DEFAULT_BASE_URL, DEFAULT_TARGET_LANGUAGE, DEFAULT_UI_LANGUAGE } from '../shared/constants';
import type { ExtensionConfig } from './configTypes';

export const DEFAULT_CONFIG: ExtensionConfig = {
  baseUrl: DEFAULT_BASE_URL,
  apiKey: '',
  model: 'deepseek-chat',
  targetLanguage: DEFAULT_TARGET_LANGUAGE,
  uiLanguage: DEFAULT_UI_LANGUAGE,
};

export function normalizeConfig(config?: Partial<ExtensionConfig>): ExtensionConfig {
  return {
    baseUrl: config?.baseUrl?.trim() || DEFAULT_CONFIG.baseUrl,
    apiKey: config?.apiKey?.trim() || DEFAULT_CONFIG.apiKey,
    model: config?.model?.trim() || DEFAULT_CONFIG.model,
    targetLanguage: normalizeTargetLanguage(config?.targetLanguage),
    uiLanguage: config?.uiLanguage === 'zh-CN' ? 'zh-CN' : DEFAULT_CONFIG.uiLanguage,
  };
}

function normalizeTargetLanguage(value?: string): string {
  const targetLanguage = value?.trim();

  if (!targetLanguage) {
    return DEFAULT_CONFIG.targetLanguage;
  }

  if (targetLanguage === '简体中文') {
    return 'Simplified Chinese';
  }

  if (targetLanguage === '日语') {
    return 'Japanese';
  }

  if (targetLanguage === '韩语') {
    return 'Korean';
  }

  return targetLanguage;
}
