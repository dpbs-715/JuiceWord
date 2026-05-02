import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { configService } from '../../src/config/configService';
import { DEFAULT_CONFIG } from '../../src/config/configSchema';
import type { AppLocale, ExtensionConfig } from '../../src/config/configTypes';
import { APP_LOCALES, TARGET_LANGUAGES, getMessages } from '../../src/shared/i18n';

type SaveState = 'idle' | 'saving' | 'saved';

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
  const t = getMessages(config.uiLanguage);

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

  return (
    <>
      <BubbleField />
      <main className="jw-options-shell">
        <aside className="jw-sidebar">
          <nav aria-label="JuiceWord settings">
            <button className="active" type="button" aria-current="page">
              <img className="nav-logo" src="/assets/juiceword/logo-drop.svg" alt="" />
              {t.navModelConfig}
            </button>
            {/*<button type="button">*/}
            {/*  <span className="nav-icon muted">G</span>*/}
            {/*  {t.navGeneral}*/}
            {/*</button>*/}
            {/*<button type="button">*/}
            {/*  <span className="nav-icon muted">i</span>*/}
            {/*  {t.navAbout}*/}
            {/*</button>*/}
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
                  aria-pressed={showApiKey}
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
    </>
  );
}
