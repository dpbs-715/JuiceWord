import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { configService } from '../../src/config/configService';
import type { ExtensionConfig } from '../../src/config/configTypes';
import {
  canUseElementTranslateOnActiveTab,
  setElementTranslateModeForActiveTab,
} from '../../src/messaging/messageClient';
import { TARGET_LANGUAGES, getMessages } from '../../src/shared/i18n';

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [elementModeError, setElementModeError] = useState('');
  const [canUseElementMode, setCanUseElementMode] = useState(false);

  useEffect(() => {
    void configService.getConfig().then(setConfig);
    void canUseElementTranslateOnActiveTab().then(setCanUseElementMode);
  }, []);

  const t = getMessages(config?.uiLanguage ?? 'en');

  async function handleModelToggle(profileId: string) {
    if (!config) {
      return;
    }

    const saved = await configService.setComparisonModelProfiles(
      getNextComparisonProfileIds(config, profileId),
    );
    setConfig(saved);
  }

  async function handleTargetLanguageChange(targetLanguage: string) {
    if (!config) {
      return;
    }

    const saved = await configService.saveConfig({
      ...config,
      targetLanguage,
    });
    setConfig(saved);
  }

  async function handleElementTranslateModelChange(elementTranslateModelProfileId: string) {
    if (!config) {
      return;
    }

    const saved = await configService.saveConfig({
      ...config,
      elementTranslateModelProfileId,
    });
    setConfig(saved);
  }

  async function handleEnableElementTranslateMode() {
    setElementModeError('');
    const response = await setElementTranslateModeForActiveTab(true);

    if (!response?.ok) {
      setElementModeError(t.elementTranslateUnavailable);
      return;
    }

    window.close();
  }

  return (
    <main className="jw-popup">
      <section className="jw-popup__top">
        <div className="jw-popup__brand">
          <img className="jw-logo" src="/assets/juiceword/logo-drop.svg" alt="" />
          <div>
            <h1>JuiceWord</h1>
            <p>{t.popupTagline}</p>
          </div>
        </div>
      </section>
      <section className="jw-popup__quickbar">
        {config ? (
          <label className="jw-popup__language">
            <span>{t.quickTargetLanguage}</span>
            <select
              value={config.targetLanguage}
              onChange={(event) => void handleTargetLanguageChange(event.target.value)}
            >
              {TARGET_LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label[config.uiLanguage]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {config ? (
        <section className="jw-popup__models" aria-label={t.modelProfiles}>
          <div className="jw-popup__section-title">
            <strong>{t.activeModel}</strong>
            <span>{t.compareModels}</span>
          </div>
          {config.modelProfiles.map((profile) => {
            const isCompared = config.comparisonModelProfileIds.includes(profile.id);
            const isConfigured = Boolean(profile.baseUrl && profile.apiKey && profile.model);

            return (
              <article className={`${isCompared ? 'active' : ''} ${isConfigured ? '' : 'incomplete'}`} key={profile.id}>
                <button type="button" onClick={() => void handleModelToggle(profile.id)}>
                  <span>{profile.name.slice(0, 1).toUpperCase()}</span>
                  <strong>{profile.name}</strong>
                  <small>{isConfigured ? profile.model : t.incompleteModelProfile}</small>
                </button>
                <label title={t.compareToggle}>
                  <input
                    type="checkbox"
                    checked={isCompared}
                    onChange={() => void handleModelToggle(profile.id)}
                    aria-label={t.compareToggle}
                  />
                  <span aria-hidden="true" />
                </label>
              </article>
            );
          })}
          <div className="jw-popup__element-translate">
            <label>
              <span>{t.elementTranslateModel}</span>
              <select
                value={config.elementTranslateModelProfileId}
                onChange={(event) => void handleElementTranslateModelChange(event.target.value)}
              >
                {config.modelProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            {canUseElementMode ? (
              <button type="button" onClick={() => void handleEnableElementTranslateMode()}>
                {t.elementTranslateMode}
              </button>
            ) : null}
            {elementModeError ? <p>{elementModeError}</p> : null}
          </div>
        </section>
      ) : null}

      <button
        className="jw-popup__button"
        type="button"
        onClick={() => browser.runtime.openOptionsPage()}
      >
        {t.openOptions}
      </button>
    </main>
  );
}

function getNextComparisonProfileIds(config: ExtensionConfig, profileId: string): string[] {
  const currentIds = config.comparisonModelProfileIds;

  if (!currentIds.includes(profileId)) {
    return [...currentIds, profileId];
  }

  if (currentIds.length <= 1) {
    return currentIds;
  }

  return currentIds.filter((id) => id !== profileId);
}
