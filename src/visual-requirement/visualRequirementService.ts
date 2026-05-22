import { configService } from '../config/configService';
import type { ExtensionConfig, ModelProfile } from '../config/configTypes';
import { createTranslationProvider } from '../providers/providerFactory';
import { getErrorMessage } from '../shared/errors';
import { VISUAL_REQUIREMENT_INTENT_LIMIT } from './visualRequirementConstants';
import { buildVisualRequirementPrompt } from './visualRequirementPrompt';
import type {
  SelectedElementContext,
  VisualRequirementGenerateResult,
} from './visualRequirementTypes';

let latestContext: SelectedElementContext | null = null;

export const visualRequirementService = {
  setLatestContext(context: SelectedElementContext): SelectedElementContext {
    latestContext = context;
    return context;
  },

  getLatestContext(): SelectedElementContext {
    if (!latestContext) {
      throw new Error('No selected element context found. Start visual requirement capture from the popup first.');
    }

    return latestContext;
  },

  async generateTask(
    context: SelectedElementContext,
    intent: string,
  ): Promise<VisualRequirementGenerateResult> {
    const trimmedIntent = intent.trim();

    if (!trimmedIntent) {
      throw new Error('Describe what you want to change before generating.');
    }

    if (trimmedIntent.length > VISUAL_REQUIREMENT_INTENT_LIMIT) {
      throw new Error(`Intent is too long. Keep it under ${VISUAL_REQUIREMENT_INTENT_LIMIT} characters.`);
    }

    const config = await configService.getConfig();
    const profile = getVisualRequirementProfile(config);
    validateProfile(profile);

    const provider = createTranslationProvider();
    const response = await provider.translate({
      config: {
        ...config,
        activeModelProfileId: profile.id,
        baseUrl: profile.baseUrl,
        apiKey: profile.apiKey,
        model: profile.model,
      },
      prompt: buildVisualRequirementPrompt(context, trimmedIntent),
    });

    return {
      markdown: response.text,
      modelProfileId: profile.id,
      modelProfileName: profile.name,
    };
  },
};

function getVisualRequirementProfile(config: ExtensionConfig): ModelProfile | undefined {
  return (
    config.modelProfiles.find((profile) => profile.id === config.activeModelProfileId) ??
    config.modelProfiles.find((profile) => profile.id === config.comparisonModelProfileIds[0]) ??
    config.modelProfiles[0]
  );
}

function validateProfile(profile: ModelProfile | undefined): asserts profile is ModelProfile {
  if (!profile) {
    throw new Error('No model profile found. Configure a model in Options first.');
  }

  if (!profile.baseUrl || !profile.apiKey || !profile.model) {
    throw new Error('Model profile is incomplete. Configure Base URL, API Key, and model in Options first.');
  }
}

export function toVisualRequirementError(error: unknown): string {
  return getErrorMessage(error);
}
