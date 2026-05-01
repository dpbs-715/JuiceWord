export type AppLocale = 'en' | 'zh-CN';

export interface ExtensionConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  targetLanguage: string;
  uiLanguage: AppLocale;
}
