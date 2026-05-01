import type { AppLocale } from '../config/configTypes';
import { getMessages } from '../shared/i18n';
import { truncateText } from '../shared/text';
import { getFloatingPosition } from './floatingPosition';
import type { FloatingState, FloatingViewActions } from './floatingTypes';
import { browser } from 'wxt/browser';

const ASSETS = {
  logo: browser.runtime.getURL('/assets/juiceword/logo-drop.svg'),
};

export class FloatingView {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private onOutsidePointerDown: ((event: PointerEvent) => void) | null = null;

  render(state: FloatingState, actions: FloatingViewActions, locale: AppLocale = 'en'): void {
    this.ensureMounted();

    if (!this.host || !this.shadow) {
      return;
    }

    const t = getMessages(locale);
    const selection = 'selection' in state ? state.selection : undefined;
    const position = getFloatingPosition(selection);

    this.host.style.top = `${position.top}px`;
    this.host.style.left = `${position.left}px`;

    this.shadow.innerHTML = `
      <style>${getStyles()}</style>
      <article class="jw-card ${state.status}">
        <header>
          <div class="brand">
            <img class="logo" src="${ASSETS.logo}" alt="" />
            <strong>JuiceWord</strong>
          </div>
          <div class="tools">
            <button class="close" title="${escapeHtml(t.close)}" type="button">×</button>
          </div>
        </header>
        ${renderBody(state, locale)}
      </article>
    `;

    this.shadow.querySelector('.close')?.addEventListener('click', actions.onClose);
    this.shadow.querySelector('.retry')?.addEventListener('click', actions.onRetry);
    this.shadow.querySelector('.copy')?.addEventListener('click', () => {
      if (state.status === 'success') {
        actions.onCopy(state.result.translatedText);
      }
    });
    this.bindOutsideClose(actions.onClose);
  }

  remove(): void {
    if (this.onOutsidePointerDown) {
      document.removeEventListener('pointerdown', this.onOutsidePointerDown, true);
      this.onOutsidePointerDown = null;
    }

    this.host?.remove();
    this.host = null;
    this.shadow = null;
  }

  private ensureMounted(): void {
    if (this.host && this.shadow) {
      return;
    }

    this.host = document.createElement('div');
    this.host.id = 'juiceword-floating-root';
    this.host.style.position = 'absolute';
    this.host.style.zIndex = '2147483647';
    this.shadow = this.host.attachShadow({ mode: 'open' });
    document.documentElement.append(this.host);
  }

  private bindOutsideClose(onClose: () => void): void {
    if (this.onOutsidePointerDown || !this.host) {
      return;
    }

    this.onOutsidePointerDown = (event) => {
      if (this.host?.contains(event.target as Node)) {
        return;
      }

      onClose();
    };

    document.addEventListener('pointerdown', this.onOutsidePointerDown, true);
  }
}

function renderBody(state: FloatingState, locale: AppLocale): string {
  const t = getMessages(locale);

  if (state.status === 'loading') {
    return `
      <section class="center-state">
        <div class="drops"><i></i><i></i><i></i></div>
        <strong>${escapeHtml(t.loadingTitle)}</strong>
        <span>${escapeHtml(t.loadingDescription)}</span>
      </section>
    `;
  }

  if (state.status === 'error') {
    return `
      <section class="center-state">
        <div class="sad">!</div>
        <strong>${escapeHtml(t.errorTitle)}</strong>
        <span>${escapeHtml(state.message)}</span>
        <button class="retry action" type="button">${escapeHtml(t.retry)}</button>
      </section>
    `;
  }

  if (state.status === 'too-long') {
    return `
      <section class="center-state">
        <div class="sad calm">J</div>
        <strong>${escapeHtml(t.textTooLongTitle)}</strong>
        <span>${escapeHtml(t.textTooLongDescription)}</span>
      </section>
    `;
  }

  return `
    <section class="text-block source">
      <div class="label-row">
        <span>${escapeHtml(t.sourceLabel)}</span>
      </div>
      <p>${escapeHtml(truncateText(state.result.sourceText, 360))}</p>
    </section>
    <div class="juice-line"></div>
    <section class="text-block translated">
      <div class="label-row">
        <span>${escapeHtml(t.translationLabel)}</span>
      </div>
      <p>${escapeHtml(state.result.translatedText)}</p>
    </section>
    <footer>
      <button class="copy" title="${escapeHtml(t.copy)}" type="button">⧉</button>
    </footer>
  `;
}

function getStyles(): string {
  return `
      :host {
        all: initial;
        color: #142033;
        font-family: "Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif;
      }

      * { box-sizing: border-box; }
      button { font: inherit; }

      .jw-card {
        position: relative;
        width: 360px;
        border: 1px solid #ffe6a8;
        border-radius: 16px;
        background:
          radial-gradient(circle at 16% 0%, rgba(255, 184, 0, 0.16), transparent 36%),
          #fffdf8;
        box-shadow: 0 18px 46px rgba(255, 184, 0, 0.18), 0 10px 24px rgba(0, 0, 0, 0.08);
      }

      .jw-card::after {
        position: absolute;
        left: 50%;
        top: -10px;
        width: 20px;
        height: 20px;
        border-top: 1px solid #ffe6a8;
        border-left: 1px solid #ffe6a8;
        background: #fffdf8;
        content: "";
        transform: translateX(-50%) rotate(45deg);
        box-shadow: -6px -6px 14px rgba(255, 184, 0, 0.06);
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 58px;
        padding: 0 20px;
        border-bottom: 1px solid #fff1c8;
        border-radius: 16px 16px 0 0;
        background: rgba(255, 255, 255, 0.72);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .logo {
        width: 31px;
        height: 31px;
        object-fit: contain;
        filter: drop-shadow(0 8px 10px rgba(255, 184, 0, 0.22));
      }

      .brand strong {
        color: #142033;
        font-size: 16px;
        font-weight: 800;
      }

      .tools {
        display: flex;
        gap: 6px;
      }

      .tools button,
      footer button {
        display: inline-grid;
        min-width: 34px;
        height: 30px;
        place-items: center;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #142033;
        cursor: pointer;
        font-size: 12px;
      }

      .tools button:hover,
      footer button:hover {
        background: #fff0bd;
      }

      .text-block {
        padding: 16px 22px 18px;
      }

      .text-block.source {
        padding-bottom: 14px;
      }

      .text-block.translated {
        padding-top: 18px;
        background: linear-gradient(180deg, rgba(255, 248, 224, 0.72), rgba(255, 250, 236, 0.48));
      }

      .label-row {
        display: flex;
        justify-content: space-between;
        color: #6b7280;
        font-size: 12px;
      }

      p {
        margin: 10px 0 0;
        color: #111827;
        font-size: 16px;
        line-height: 1.52;
      }

      .translated p {
        color: #142033;
        font-size: 20px;
        font-weight: 700;
        line-height: 1.46;
      }

      .juice-line {
        height: 1px;
        margin: 0 24px;
        background: linear-gradient(90deg, transparent, #ffd36f, transparent);
      }

      footer {
        display: grid;
        align-items: center;
        justify-content: end;
        position: relative;
        z-index: 1;
        height: 46px;
        padding: 0 18px;
        border-top: 1px solid #fff1c8;
        border-radius: 0 0 16px 16px;
        background: rgba(255, 253, 248, 0.88);
      }

      footer button {
        background: #fff2c7;
      }

      .center-state {
        position: relative;
        display: grid;
        min-height: 178px;
        place-items: center;
        padding: 24px;
        text-align: center;
        overflow: hidden;
      }

    
      .center-state strong {
        margin-top: 10px;
        font-size: 15px;
      }

      .center-state span {
        max-width: 260px;
        margin-top: 6px;
        color: #6b7280;
        font-size: 12px;
        line-height: 1.5;
      }

      .drops {
        display: flex;
        align-items: end;
        gap: 10px;
        height: 36px;
      }

      .drops i {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ffb800;
        animation: juice-bounce 760ms infinite alternate;
      }

      .drops i:nth-child(2) {
        animation-delay: 120ms;
      }

      .drops i:nth-child(3) {
        animation-delay: 240ms;
      }

      .sad {
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border-radius: 50%;
        background: #ffe4e6;
        color: #ef4444;
        font-weight: 800;
      }

      .sad.calm {
        background: #fff0bd;
        color: #ffb800;
      }

      .action {
        margin-top: 12px;
        padding: 0 22px;
        border: 0;
        border-radius: 8px;
        background: #fb7185;
        color: #fff;
        cursor: pointer;
        font-weight: 700;
      }

      @keyframes juice-bounce {
        from { transform: translateY(4px); opacity: 0.55; }
        to { transform: translateY(-10px); opacity: 1; }
      }
    `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
