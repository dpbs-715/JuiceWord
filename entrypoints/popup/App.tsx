import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { configService } from '../../src/config/configService';
import type { ExtensionConfig } from '../../src/config/configTypes';
import { getMessages } from '../../src/shared/i18n';

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);

  useEffect(() => {
    void configService.getConfig().then(setConfig);
  }, []);

  const isReady = Boolean(config?.baseUrl && config?.apiKey && config?.model);
  const t = getMessages(config?.uiLanguage ?? 'en');

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
          <p>{isReady ? config?.model : t.addModelSettings}</p>
        </div>
      </section>

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
