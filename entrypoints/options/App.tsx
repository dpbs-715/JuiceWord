import { useEffect, useState } from 'react';
import { configService } from '../../src/config/configService';
import type { ExtensionConfig } from '../../src/config/configTypes';

type SaveState = 'idle' | 'saving' | 'saved';

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig>({
    baseUrl: '',
    apiKey: '',
    model: '',
    targetLanguage: '简体中文',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

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
            <span className="nav-icon">J</span>
            模型配置
          </button>
          <button type="button">
            <span className="nav-icon muted">G</span>
            通用设置
          </button>
          <button type="button">
            <span className="nav-icon muted">i</span>
            关于 JuiceWord
          </button>
        </nav>
        <div className="jw-sidebar__footer">
          <div className="glass">J</div>
          <strong>JuiceWord</strong>
          <span>v0.1.0</span>
        </div>
      </aside>

      <section className="jw-panel" aria-labelledby="model-config-title">
        <header>
          <h1 id="model-config-title">模型配置</h1>
          <p>配置你的 AI 模型信息</p>
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
            <small>例：http://127.0.0.1:8317/v1</small>
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
                {showApiKey ? 'Hide' : 'Show'}
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
            <small>例：deepseek-chat, gpt-3.5-turbo, qwen-plus 等</small>
          </label>

          <label>
            <span>默认目标语言</span>
            <select
              value={config.targetLanguage}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  targetLanguage: event.target.value,
                }))
              }
            >
              <option>简体中文</option>
              <option>English</option>
              <option>日本語</option>
              <option>한국어</option>
            </select>
          </label>

          <button className="save-button" type="submit" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? '保存中...' : '保存配置'}
          </button>
        </form>

        <div className={`saved-state ${saveState === 'saved' ? 'visible' : ''}`}>
          配置已保存
        </div>
      </section>
    </main>
  );
}
