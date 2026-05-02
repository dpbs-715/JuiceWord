export type AppLocale = 'en' | 'zh-CN';

export interface ModelProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ExtensionConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  targetLanguage: string;
  uiLanguage: AppLocale;
  activeModelProfileId: string;
  comparisonModelProfileIds: string[];
  modelProfiles: ModelProfile[];
}
