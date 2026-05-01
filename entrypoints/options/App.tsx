import { useEffect, useState } from 'react';
import { configService } from '../../src/config/configService';
import type { AppLocale, ExtensionConfig } from '../../src/config/configTypes';
import { APP_LOCALES, TARGET_LANGUAGES, getMessages } from '../../src/shared/i18n';

type SaveState = 'idle' | 'saving' | 'saved';

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig>({
    baseUrl: '',
    apiKey: '',
    model: '',
    targetLanguage: 'Simplified Chinese',
    uiLanguage: 'en',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const t = getMessages(config.uiLanguage);

  useEffect(() => {
    void configService.getConfig().then(setConfig);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState('saving');
    const saved = await configService.saveConfig(config);
    setConfig(saved);
    setSaveState('saved');
    window.setTimeout(() => setSaveState('idle'), 1800);
  }

  return (
    <main className="jw-options-shell">
      <aside className="jw-sidebar">
        <div className="jw-liquid" />
        <nav aria-label="JuiceWord settings">
          <button className="active" type="button">
            <img className="nav-logo" src="/assets/juiceword/logo-drop.svg" alt="" />
            {t.navModelConfig}
          </button>
          <button type="button">
            <span className="nav-icon muted">G</span>
            {t.navGeneral}
          </button>
          <button type="button">
            <span className="nav-icon muted">i</span>
            {t.navAbout}
          </button>
        </nav>
        <div className="jw-sidebar__footer">
          <strong>JuiceWord</strong>
          <span>v0.1.0</span>
        </div>
      </aside>

      <section className="jw-panel" aria-labelledby="model-config-title">
        <header>
          <h1 id="model-config-title">{t.modelConfigTitle}</h1>
          <p>{t.modelConfigDescription}</p>
        </header>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Base URL</span>
            <input
              value={config.baseUrl}
              placeholder="http://127.0.0.1:8317/v1"
              onChange={(event) =>
                setConfig((current) => ({ ...current, baseUrl: event.target.value }))
              }
            />
            <small>{t.baseUrlExample}</small>
          </label>

          <label>
            <span>API Key</span>
            <div className="secret-field">
              <input
                value={config.apiKey}
                type={showApiKey ? 'text' : 'password'}
                onChange={(event) =>
                  setConfig((current) => ({ ...current, apiKey: event.target.value }))
                }
              />
              <button
                aria-label={showApiKey ? 'Hide API Key' : 'Show API Key'}
                type="button"
                onClick={() => setShowApiKey((value) => !value)}
              >
                {showApiKey ? t.hide : t.show}
              </button>
            </div>
          </label>

          <label>
            <span>Model</span>
            <input
              value={config.model}
              placeholder="deepseek-chat"
              onChange={(event) =>
                setConfig((current) => ({ ...current, model: event.target.value }))
              }
            />
            <small>{t.modelExample}</small>
          </label>

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

          <button className="save-button" type="submit" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? t.saving : t.save}
          </button>
        </form>

        <div className={`saved-state ${saveState === 'saved' ? 'visible' : ''}`}>
          {t.saved}
        </div>
      </section>
    </main>
  );
}
