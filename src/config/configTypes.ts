export type AppLocale = 'en' | 'zh-CN';

export interface ModelProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
}

export interface ExtensionConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  targetLanguage: string;
  uiLanguage: AppLocale;
  activeModelProfileId: string;
  elementTranslateModelProfileId: string;
  comparisonModelProfileIds: string[];
  modelProfiles: ModelProfile[];
}
