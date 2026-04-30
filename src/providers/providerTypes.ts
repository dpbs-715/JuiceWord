import type { ExtensionConfig } from '../config/configTypes';

export interface ProviderTranslateRequest {
  config: ExtensionConfig;
  prompt: string;
}

export interface ProviderTranslateResponse {
  text: string;
}

export interface TranslationProvider {
  translate(request: ProviderTranslateRequest): Promise<ProviderTranslateResponse>;
}
