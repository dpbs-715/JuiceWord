import { DEFAULT_BASE_URL, DEFAULT_TARGET_LANGUAGE, DEFAULT_UI_LANGUAGE } from '../shared/constants';
import type { ExtensionConfig, ModelProfile } from './configTypes';

const DEFAULT_MODEL_PROFILE_ID = 'default';

export const DEFAULT_CONFIG: ExtensionConfig = {
  baseUrl: DEFAULT_BASE_URL,
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 1,
  targetLanguage: DEFAULT_TARGET_LANGUAGE,
  uiLanguage: DEFAULT_UI_LANGUAGE,
  activeModelProfileId: DEFAULT_MODEL_PROFILE_ID,
  elementTranslateModelProfileId: DEFAULT_MODEL_PROFILE_ID,
  comparisonModelProfileIds: [DEFAULT_MODEL_PROFILE_ID],
  modelProfiles: [
    {
      id: DEFAULT_MODEL_PROFILE_ID,
      name: 'Default',
      baseUrl: DEFAULT_BASE_URL,
      apiKey: '',
      model: 'deepseek-chat',
      temperature: 1,
    },
  ],
};

export function normalizeConfig(config?: Partial<ExtensionConfig>): ExtensionConfig {
  const modelProfiles = normalizeModelProfiles(config);
  const activeModelProfileId = getActiveModelProfileId(config?.activeModelProfileId, modelProfiles);
  const activeModelProfile = modelProfiles.find((profile) => profile.id === activeModelProfileId) ?? modelProfiles[0];
  const comparisonModelProfileIds = normalizeComparisonProfileIds(
    config?.comparisonModelProfileIds,
    activeModelProfileId,
    modelProfiles,
  );
  const elementTranslateModelProfileId = getElementTranslateModelProfileId(
    config?.elementTranslateModelProfileId,
    comparisonModelProfileIds,
    modelProfiles,
  );

  return {
    baseUrl: activeModelProfile.baseUrl,
    apiKey: activeModelProfile.apiKey,
    model: activeModelProfile.model,
    temperature: activeModelProfile.temperature ?? DEFAULT_CONFIG.temperature,
    targetLanguage: normalizeTargetLanguage(config?.targetLanguage),
    uiLanguage: config?.uiLanguage === 'zh-CN' ? 'zh-CN' : DEFAULT_CONFIG.uiLanguage,
    activeModelProfileId,
    elementTranslateModelProfileId,
    comparisonModelProfileIds,
    modelProfiles,
  };
}

function normalizeModelProfiles(config?: Partial<ExtensionConfig>): ModelProfile[] {
  const profiles = config?.modelProfiles?.map((profile, index) => normalizeModelProfile(profile, index)) ?? [];
  const filledProfiles = profiles.filter((profile) => profile.id && profile.name);

  if (filledProfiles.length > 0) {
    return filledProfiles;
  }

  return [
    {
      ...DEFAULT_CONFIG.modelProfiles[0],
      baseUrl: config?.baseUrl?.trim() || DEFAULT_CONFIG.baseUrl,
      apiKey: config?.apiKey?.trim() || DEFAULT_CONFIG.apiKey,
      model: config?.model?.trim() || DEFAULT_CONFIG.model,
      temperature: config?.temperature ?? DEFAULT_CONFIG.temperature,
    },
  ];
}

function normalizeModelProfile(profile: Partial<ModelProfile>, index: number): ModelProfile {
  const fallbackName = index === 0 ? DEFAULT_CONFIG.modelProfiles[0].name : `Model ${index + 1}`;

  return {
    id: profile.id?.trim() || createProfileId(index),
    name: profile.name?.trim() || fallbackName,
    baseUrl: profile.baseUrl?.trim() || DEFAULT_CONFIG.baseUrl,
    apiKey: profile.apiKey?.trim() || DEFAULT_CONFIG.apiKey,
    model: profile.model?.trim() || DEFAULT_CONFIG.model,
    temperature: profile.temperature ?? DEFAULT_CONFIG.temperature,
  };
}

function getActiveModelProfileId(value: string | undefined, profiles: ModelProfile[]): string {
  const activeId = value?.trim();

  if (activeId && profiles.some((profile) => profile.id === activeId)) {
    return activeId;
  }

  return profiles[0]?.id ?? DEFAULT_MODEL_PROFILE_ID;
}

function normalizeComparisonProfileIds(
  value: string[] | undefined,
  activeModelProfileId: string,
  profiles: ModelProfile[],
): string[] {
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const selectedIds = value?.filter((id, index, ids) => profileIds.has(id) && ids.indexOf(id) === index) ?? [];

  if (selectedIds.length > 0) {
    return selectedIds;
  }

  return [activeModelProfileId];
}

function getElementTranslateModelProfileId(
  value: string | undefined,
  comparisonModelProfileIds: string[],
  profiles: ModelProfile[],
): string {
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const configuredId = value?.trim();

  if (configuredId && profileIds.has(configuredId)) {
    return configuredId;
  }

  const firstComparedId = comparisonModelProfileIds.find((id) => profileIds.has(id));

  return firstComparedId ?? profiles[0]?.id ?? DEFAULT_MODEL_PROFILE_ID;
}

function createProfileId(index: number): string {
  return index === 0 ? DEFAULT_MODEL_PROFILE_ID : `profile-${index + 1}`;
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
