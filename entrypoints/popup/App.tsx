import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { configService } from '../../src/config/configService';
import type { ExtensionConfig, ModelProfile } from '../../src/config/configTypes';
import { getMessages } from '../../src/shared/i18n';

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);

  useEffect(() => {
    void configService.getConfig().then(setConfig);
  }, []);

  const t = getMessages(config?.uiLanguage ?? 'en');
  const activeProfile = config ? getActiveProfile(config) : null;
  const isReady = Boolean(activeProfile?.baseUrl && activeProfile?.apiKey && activeProfile?.model);

  async function handleProfileChange(profileId: string) {
    const saved = await configService.setActiveModelProfile(profileId);
    setConfig(saved);
  }

  async function handleCompareToggle(profileId: string) {
    if (!config) {
      return;
    }

    const currentIds = config.comparisonModelProfileIds;
    const nextIds = currentIds.includes(profileId)
      ? currentIds.filter((id) => id !== profileId)
      : [...currentIds, profileId];

    if (nextIds.length === 0) {
      return;
    }

    const saved = await configService.setComparisonModelProfiles(nextIds);
    setConfig(saved);
  }

  return (
    <main className="jw-popup">
      <section className="jw-popup__brand">
        <img className="jw-logo" src="/assets/juiceword/logo-drop.svg" alt="" />
        <div>
          <h1>JuiceWord</h1>
          <p>{t.popupTagline}</p>
        </div>
      </section>

      <section className="jw-popup__status">
        <span className={isReady ? 'ready' : 'pending'} />
        <div>
          <strong>{isReady ? t.ready : t.setupRequired}</strong>
          <p>{isReady ? `${activeProfile?.name} · ${activeProfile?.model}` : t.addModelSettings}</p>
        </div>
      </section>

      {config ? (
        <section className="jw-popup__models" aria-label={t.modelProfiles}>
          <div className="jw-popup__section-title">
            <strong>{t.activeModel}</strong>
            <span>{t.compareModels}</span>
          </div>
          {config.modelProfiles.map((profile) => {
            const isActive = profile.id === activeProfile?.id;
            const isCompared = config.comparisonModelProfileIds.includes(profile.id);

            return (
              <article className={isActive ? 'active' : ''} key={profile.id}>
                <button type="button" onClick={() => void handleProfileChange(profile.id)}>
                  <span>{profile.name.slice(0, 1).toUpperCase()}</span>
                  <strong>{profile.name}</strong>
                  <small>{profile.model || t.setupRequired}</small>
                </button>
                <label title={t.compareModels}>
                  <input
                    type="checkbox"
                    checked={isCompared}
                    onChange={() => void handleCompareToggle(profile.id)}
                  />
                </label>
              </article>
            );
          })}
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

function getActiveProfile(config: ExtensionConfig): ModelProfile {
  return (
    config.modelProfiles.find((profile) => profile.id === config.activeModelProfileId) ??
    config.modelProfiles[0]
  );
}
