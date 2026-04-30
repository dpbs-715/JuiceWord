import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { configService } from '../../src/config/configService';
import type { ExtensionConfig } from '../../src/config/configTypes';

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);

  useEffect(() => {
    void configService.getConfig().then(setConfig);
  }, []);

  const isReady = Boolean(config?.baseUrl && config?.apiKey && config?.model);

  return (
    <main className="jw-popup">
      <section className="jw-popup__brand">
        <span className="jw-logo">J</span>
        <div>
          <h1>JuiceWord</h1>
          <p>Turn words into meaning.</p>
        </div>
      </section>

      <section className="jw-popup__status">
        <span className={isReady ? 'ready' : 'pending'} />
        <div>
          <strong>{isReady ? 'Ready to translate' : 'Setup required'}</strong>
          <p>{isReady ? config?.model : 'Add your model settings first.'}</p>
        </div>
      </section>

      <button
        className="jw-popup__button"
        type="button"
        onClick={() => browser.runtime.openOptionsPage()}
      >
        Open Options
      </button>
    </main>
  );
}
