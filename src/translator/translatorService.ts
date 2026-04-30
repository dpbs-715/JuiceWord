import { configService } from '../config/configService';
import { createTranslationProvider } from '../providers/providerFactory';
import type { SelectionSnapshot } from '../selection/selectionTypes';
import { buildTranslationPrompt } from './promptBuilder';
import type { TranslationResult } from './translatorTypes';

export const translatorService = {
  async translateSelection(
    selection: SelectionSnapshot,
    targetLanguage?: string,
  ): Promise<TranslationResult> {
    const config = await configService.getConfig();
    const language = targetLanguage || config.targetLanguage;
    const prompt = buildTranslationPrompt(selection.text, language);
    const provider = createTranslationProvider();
    const response = await provider.translate({ config, prompt });

    return {
      sourceText: selection.text,
      translatedText: response.text,
      targetLanguage: language,
    };
  },
};
