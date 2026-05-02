export interface ModelTranslationResult {
  modelProfileId: string;
  modelProfileName: string;
  translatedText: string;
  error?: string;
}

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  targetLanguage: string;
  modelProfileId: string;
  modelProfileName: string;
  alternatives: ModelTranslationResult[];
}
