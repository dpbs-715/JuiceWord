import { configService } from '../config/configService';
import type { ExtensionConfig, ModelProfile } from '../config/configTypes';
import { createTranslationProvider } from '../providers/providerFactory';
import type { SelectionSnapshot } from '../selection/selectionTypes';
import { getErrorMessage } from '../shared/errors';
import { buildTranslationPrompt } from './promptBuilder';
import type { ModelTranslationResult, TranslationResult } from './translatorTypes';

export const translatorService = {
  async translateSelection(
    selection: SelectionSnapshot,
    targetLanguage?: string,
  ): Promise<TranslationResult> {
    const config = await configService.getConfig();
    const language = targetLanguage || config.targetLanguage;
    const prompt = buildTranslationPrompt(selection.text, language);
    const profiles = getComparisonProfiles(config);
    const alternatives = await Promise.all(
      profiles.map((profile) => translateWithProfile(config, profile, prompt)),
    );
    const firstSuccess = alternatives.find((alternative) => !alternative.error);

    if (!firstSuccess) {
      throw new Error(alternatives[0]?.error || 'Translation failed.');
    }

    return {
      sourceText: selection.text,
      translatedText: firstSuccess.translatedText,
      targetLanguage: language,
      modelProfileId: firstSuccess.modelProfileId,
      modelProfileName: firstSuccess.modelProfileName,
      alternatives,
    };
  },

  async translateElementText(text: string, targetLanguage?: string): Promise<TranslationResult> {
    const config = await configService.getConfig();
    const language = targetLanguage || config.targetLanguage;
    const prompt = buildTranslationPrompt(text, language);
    const profile = getElementTranslateProfile(config);
    const result = await translateWithProfile(config, profile, prompt);

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      sourceText: text,
      translatedText: result.translatedText,
      targetLanguage: language,
      modelProfileId: result.modelProfileId,
      modelProfileName: result.modelProfileName,
      alternatives: [result],
    };
  },
};

function getComparisonProfiles(config: ExtensionConfig): ModelProfile[] {
  const selectedIds = new Set(config.comparisonModelProfileIds);
  const profiles = config.modelProfiles.filter((profile) => selectedIds.has(profile.id));

  if (profiles.length > 0) {
    return profiles;
  }

  return config.modelProfiles.filter((profile) => profile.id === config.activeModelProfileId);
}

function getElementTranslateProfile(config: ExtensionConfig): ModelProfile {
  return (
    config.modelProfiles.find((profile) => profile.id === config.elementTranslateModelProfileId) ??
    config.modelProfiles.find((profile) => profile.id === config.comparisonModelProfileIds[0]) ??
    config.modelProfiles[0]
  );
}

async function translateWithProfile(
  config: ExtensionConfig,
  profile: ModelProfile,
  prompt: string,
): Promise<ModelTranslationResult> {
  const provider = createTranslationProvider();
  const profileConfig: ExtensionConfig = {
    ...config,
    activeModelProfileId: profile.id,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.model,
    temperature: profile.temperature ?? config.temperature,
  };

  try {
    const response = await provider.translate({ config: profileConfig, prompt });

    return {
      modelProfileId: profile.id,
      modelProfileName: profile.name,
      translatedText: response.text,
    };
  } catch (error: unknown) {
    return {
      modelProfileId: profile.id,
      modelProfileName: profile.name,
      translatedText: '',
      error: getErrorMessage(error),
    };
  }
}
