import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { configService } from '../../src/config/configService';
import { DEFAULT_CONFIG } from '../../src/config/configSchema';
import type { AppLocale, ExtensionConfig, ModelProfile } from '../../src/config/configTypes';
import { APP_LOCALES, TARGET_LANGUAGES, getMessages } from '../../src/shared/i18n';

type SaveState = 'idle' | 'saving' | 'saved';
type OptionsPane = 'model' | 'general';

interface BubbleConfig {
  left: string;
  size: number;
  opacity: number;
  speed: number;
  start: number;
  drift: number;
}

const BUBBLES: BubbleConfig[] = [
  { left: '4%', size: 42, opacity: 0.32, speed: 10, start: 0.92, drift: 16 },
  { left: '12%', size: 68, opacity: 0.24, speed: 7, start: 0.74, drift: -22 },
  { left: '21%', size: 32, opacity: 0.34, speed: 12, start: 1.08, drift: 18 },
  { left: '31%', size: 56, opacity: 0.22, speed: 8, start: 0.42, drift: -16 },
  { left: '41%', size: 38, opacity: 0.28, speed: 11, start: 0.88, drift: 20 },
  { left: '52%', size: 78, opacity: 0.18, speed: 6, start: 1.16, drift: -24 },
  { left: '63%', size: 36, opacity: 0.3, speed: 10, start: 0.62, drift: 16 },
  { left: '73%', size: 64, opacity: 0.22, speed: 7, start: 0.98, drift: -20 },
  { left: '83%', size: 30, opacity: 0.34, speed: 13, start: 1.12, drift: 17 },
  { left: '92%', size: 50, opacity: 0.26, speed: 9, start: 0.56, drift: -18 },
];

function BubbleField() {
  const fieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!field || reduceMotion) {
      return;
    }

    const bubbles = Array.from(field.querySelectorAll<HTMLSpanElement>('.jw-bubble'));
    const yPositions = BUBBLES.map((bubble) => window.innerHeight * bubble.start);
    let previousTime = performance.now();
    let animationFrame = 0;

    const animate = (time: number) => {
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      bubbles.forEach((element, index) => {
        const bubble = BUBBLES[index];
        yPositions[index] -= bubble.speed * deltaSeconds;

        if (yPositions[index] < -bubble.size - 24) {
          yPositions[index] = window.innerHeight + bubble.size + index * 9;
        }

        const sway = Math.sin((time / 1000) * 0.75 + index) * bubble.drift;
        element.style.transform = `translate3d(${sway}px, ${yPositions[index]}px, 0)`;
      });

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="jw-bubble-field" ref={fieldRef} aria-hidden="true">
      {BUBBLES.map((bubble, index) => (
        <span
          className="jw-bubble"
          key={`${bubble.left}-${bubble.size}-${index}`}
          style={
            {
              left: bubble.left,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              opacity: bubble.opacity,
            } satisfies CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig>(DEFAULT_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [activePane, setActivePane] = useState<OptionsPane>('model');
  const t = getMessages(config.uiLanguage);
  const activeProfile = useMemo(() => getActiveProfile(config), [config]);

  useEffect(() => {
    void configService.getConfig().then(setConfig);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState('saving');
    const saved = await configService.saveConfig(config);
    setConfig(saved);
    setSaveState('saved');
    window.setTimeout(() => setSaveState('idle'), 1800);
  }

  function updateActiveProfile(updates: Partial<ModelProfile>) {
    setConfig((current) => {
      const profile = getActiveProfile(current);
      const nextProfile = { ...profile, ...updates };
      const nextProfiles = current.modelProfiles.map((item) =>
        item.id === profile.id ? nextProfile : item,
      );

      return {
        ...current,
        baseUrl: nextProfile.baseUrl,
        apiKey: nextProfile.apiKey,
        model: nextProfile.model,
        modelProfiles: nextProfiles,
      };
    });
  }

  function switchProfile(profileId: string) {
    setActivePane('model');
    setConfig((current) => {
      const nextProfile =
        current.modelProfiles.find((profile) => profile.id === profileId) ?? getActiveProfile(current);

      return {
        ...current,
        activeModelProfileId: nextProfile.id,
        baseUrl: nextProfile.baseUrl,
        apiKey: nextProfile.apiKey,
        model: nextProfile.model,
      };
    });
  }

  function addProfile() {
    setActivePane('model');
    setConfig((current) => {
      const nextIndex = current.modelProfiles.length + 1;
      const nextProfile: ModelProfile = {
        id: `profile-${Date.now()}`,
        name: `${t.modelProfile} ${nextIndex}`,
        baseUrl: current.baseUrl,
        apiKey: current.apiKey,
        model: current.model,
      };

      return {
        ...current,
        activeModelProfileId: nextProfile.id,
        baseUrl: nextProfile.baseUrl,
        apiKey: nextProfile.apiKey,
        model: nextProfile.model,
        comparisonModelProfileIds: [...current.comparisonModelProfileIds, nextProfile.id],
        modelProfiles: [...current.modelProfiles, nextProfile],
      };
    });
  }

  function removeActiveProfile() {
    if (!window.confirm(t.confirmRemoveModelProfile)) {
      return;
    }

    setActivePane('model');
    setConfig((current) => {
      if (current.modelProfiles.length <= 1) {
        return current;
      }

      const nextProfiles = current.modelProfiles.filter(
        (profile) => profile.id !== current.activeModelProfileId,
      );
      const nextProfile = nextProfiles[0];

      const nextComparisonIds = current.comparisonModelProfileIds.filter(
        (id) => id !== current.activeModelProfileId,
      );

      return {
        ...current,
        activeModelProfileId: nextProfile.id,
        baseUrl: nextProfile.baseUrl,
        apiKey: nextProfile.apiKey,
        model: nextProfile.model,
        comparisonModelProfileIds:
          nextComparisonIds.length > 0 ? nextComparisonIds : [nextProfile.id],
        modelProfiles: nextProfiles,
      };
    });
  }

  return (
    <>
      <BubbleField />
      <main className="jw-options-shell">
        <aside className="jw-sidebar">
          <header className="jw-sidebar__brand">
            <img className="nav-logo" src="/assets/juiceword/logo-drop.svg" alt="" />
            <div>
              <strong>JuiceWord</strong>
              <span>{t.modelProfiles}</span>
            </div>
          </header>

          <button
            className={`sidebar-nav-button general-entry ${activePane === 'general' ? 'active' : ''}`}
            type="button"
            aria-current={activePane === 'general' ? 'page' : undefined}
            onClick={() => setActivePane('general')}
          >
            <span className="profile-initial">{t.generalInitial}</span>
            <span className="profile-copy">
              <strong>{t.preferencesSection}</strong>
              <small>{t.preferencesSummary}</small>
            </span>
          </button>

          <nav className="profile-list" aria-label={t.modelProfiles}>
            {config.modelProfiles.map((profile) => {
              const isActive = activePane === 'model' && profile.id === activeProfile.id;
              const isCompared = config.comparisonModelProfileIds.includes(profile.id);

              return (
                <button
                  className={`sidebar-nav-button ${isActive ? 'active' : ''}`}
                  key={profile.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => switchProfile(profile.id)}
                >
                  <span className="profile-initial">{profile.name.slice(0, 1).toUpperCase()}</span>
                  <span className="profile-copy">
                    <strong>{profile.name}</strong>
                    <small>{profile.model || t.setupRequired}</small>
                  </span>
                  {isCompared ? <span className="profile-badge">{t.compareBadge}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="profile-actions">
            <button type="button" onClick={addProfile}>
              {t.addModelProfile}
            </button>
            <button
              type="button"
              onClick={removeActiveProfile}
              disabled={config.modelProfiles.length <= 1}
            >
              {t.removeModelProfile}
            </button>
          </div>

          <div className="jw-sidebar__footer">
            <strong>JuiceWord</strong>
            <span>v1.1.0</span>
          </div>
        </aside>

        <section className="jw-panel" aria-labelledby="model-config-title">
          <header className="jw-panel__header">
            <div>
              <h1 id="model-config-title">
                {activePane === 'general' ? t.preferencesSection : t.modelConfigTitle}
              </h1>
              <p>
                {activePane === 'general'
                  ? t.preferencesSummary
                  : `${activeProfile.name} · ${activeProfile.model || t.modelConfigDescription}`}
              </p>
            </div>
            <div className={`saved-state ${saveState === 'saved' ? 'visible' : ''}`}>
              {t.saved}
            </div>
          </header>

          <form className="config-form" onSubmit={handleSubmit}>
            {activePane === 'model' ? (
              <>
                <section className="form-section">
                  <label>
                    <span>{t.modelProfileName}</span>
                    <input
                      value={activeProfile.name}
                      placeholder="DeepSeek"
                      onChange={(event) => updateActiveProfile({ name: event.target.value })}
                    />
                  </label>
                </section>

                <section className="form-section">
                  <div className="field-grid">
                    <label>
                      <span>Base URL</span>
                      <input
                        value={activeProfile.baseUrl}
                        placeholder="http://127.0.0.1:8317/v1"
                        onChange={(event) => updateActiveProfile({ baseUrl: event.target.value })}
                      />
                      <small>{t.baseUrlExample}</small>
                    </label>

                    <label>
                      <span>Model</span>
                      <input
                        value={activeProfile.model}
                        placeholder="deepseek-chat"
                        onChange={(event) => updateActiveProfile({ model: event.target.value })}
                      />
                      <small>{t.modelExample}</small>
                    </label>
                  </div>

                  <label className="wide-field">
                    <span>API Key</span>
                    <div className="secret-field">
                      <input
                        value={activeProfile.apiKey}
                        type={showApiKey ? 'text' : 'password'}
                        onChange={(event) => updateActiveProfile({ apiKey: event.target.value })}
                      />
                      <button
                        aria-label={showApiKey ? 'Hide API Key' : 'Show API Key'}
                        aria-pressed={showApiKey}
                        type="button"
                        onClick={() => setShowApiKey((value) => !value)}
                      >
                        {showApiKey ? t.hide : t.show}
                      </button>
                    </div>
                  </label>
                </section>
              </>
            ) : (
              <section className="global-settings full-page" aria-label={t.preferencesSection}>
                <div className="field-grid">
                  <label>
                    <span>{t.targetLanguage}</span>
                    <select
                      value={config.targetLanguage}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          targetLanguage: event.target.value,
                        }))
                      }
                    >
                      {TARGET_LANGUAGES.map((language) => (
                        <option key={language.value} value={language.value}>
                          {language.label[config.uiLanguage]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>{t.uiLanguage}</span>
                    <select
                      value={config.uiLanguage}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          uiLanguage: event.target.value as AppLocale,
                        }))
                      }
                    >
                      {APP_LOCALES.map((locale) => (
                        <option key={locale.value} value={locale.value}>
                          {locale.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            )}

            <footer className="form-actions">
              <button className="save-button" type="submit" disabled={saveState === 'saving'}>
                {saveState === 'saving' ? t.saving : t.save}
              </button>
            </footer>
          </form>
        </section>
      </main>
    </>
  );
}

function getActiveProfile(config: ExtensionConfig): ModelProfile {
  return (
    config.modelProfiles.find((profile) => profile.id === config.activeModelProfileId) ??
    config.modelProfiles[0] ??
    DEFAULT_CONFIG.modelProfiles[0]
  );
}
