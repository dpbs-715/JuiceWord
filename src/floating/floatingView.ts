import type { AppLocale } from '../config/configTypes';
import { getMessages } from '../shared/i18n';
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
            <button class="close" title="${escapeHtml(t.close)}" type="button" aria-label="${escapeHtml(t.close)}">
              <span></span>
              <span></span>
            </button>
          </div>
        </header>
        ${renderBody(state, locale)}
      </article>
    `;

    this.shadow.querySelector('.close')?.addEventListener('click', actions.onClose);
    this.shadow.querySelector('.retry')?.addEventListener('click', actions.onRetry);
    this.shadow.querySelector('.copy-all')?.addEventListener('click', () => {
      if (state.status === 'success') {
        actions.onCopy(getCopyText(state.result));
        this.showCopiedFeedback('.copy-all', t.copied, getFooterCopyLabel(state.result, t.copy, t.copyAll));
      }
    });
    this.shadow.querySelectorAll<HTMLButtonElement>('.copy-one').forEach((button) => {
      button.addEventListener('click', () => {
        const text = button.dataset.copyText;

        if (!text) {
          return;
        }

        actions.onCopy(text);
        this.showCopiedFeedback(button, t.copied, t.copy);
      });
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

  private showCopiedFeedback(
    target: HTMLButtonElement | string,
    label: string,
    fallbackLabel: string,
  ): void {
    const copyButton =
      typeof target === 'string'
        ? this.shadow?.querySelector<HTMLButtonElement>(target)
        : target;

    if (!copyButton) {
      return;
    }

    copyButton.classList.add('copied');
    copyButton.textContent = label;
    copyButton.setAttribute('aria-live', 'polite');
    window.setTimeout(() => {
      copyButton.classList.remove('copied');
      copyButton.textContent = fallbackLabel;
    }, 1200);
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

  const successfulCount = state.result.alternatives.filter((alternative) => !alternative.error).length;
  const isMultiResult = successfulCount > 1;

  return `
    <section class="translation-list">
      ${state.result.alternatives.map((alternative) => `
        <article class="text-block translated ${alternative.error ? 'has-error' : ''}">
          <div class="label-row">
            <span>${escapeHtml(alternative.modelProfileName)}</span>
            ${
              alternative.error
                ? `<em>${escapeHtml(t.translationLabel)}</em>`
                : isMultiResult
                  ? `<button class="copy-one" type="button" data-copy-text="${escapeHtml(alternative.translatedText)}">${escapeHtml(t.copy)}</button>`
                  : ''
            }
          </div>
          ${
            alternative.error
              ? `<p class="model-error">${escapeHtml(alternative.error)}</p>`
              : `<p>${escapeHtml(alternative.translatedText)}</p>`
          }
        </article>
      `).join('')}
    </section>
    <footer>
      <button class="copy-all ${isMultiResult ? 'multi' : 'single'}" title="${escapeHtml(getFooterCopyLabel(state.result, t.copy, t.copyAll))}" type="button">${escapeHtml(getFooterCopyLabel(state.result, t.copy, t.copyAll))}</button>
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
        width: min(360px, calc(100vw - 28px));
        max-height: min(720px, calc(100vh - 48px));
        overflow: hidden;
        border: 1px solid #ffe6a8;
        border-radius: 16px;
        background:
          radial-gradient(circle at 16% 0%, rgba(255, 184, 0, 0.16), transparent 36%),
          #fffdf8;
        box-shadow: 0 18px 46px rgba(255, 184, 0, 0.18), 0 10px 24px rgba(0, 0, 0, 0.08);
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

      .tools button {
        position: relative;
        display: inline-grid;
        width: 34px;
        height: 34px;
        place-items: center;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #142033;
        cursor: pointer;
      }

      .tools button span {
        position: absolute;
        width: 16px;
        height: 2px;
        border-radius: 999px;
        background: currentColor;
      }

      .tools button span:first-child {
        transform: rotate(45deg);
      }

      .tools button span:last-child {
        transform: rotate(-45deg);
      }

      .copy-one,
      footer button {
        display: inline-grid;
        min-width: 42px;
        height: 32px;
        place-items: center;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: #142033;
        cursor: pointer;
        font-size: 13px;
        transition: background 140ms ease, color 140ms ease, min-width 140ms ease;
      }

      .tools button:hover,
      .copy-one:hover,
      footer button:hover {
        background: #fff0bd;
      }

      .translation-list {
        display: grid;
        gap: 10px;
        max-height: min(520px, calc(100vh - 166px));
        overflow: auto;
        padding: 14px;
        scrollbar-color: rgba(255, 184, 0, 0.48) transparent;
        scrollbar-width: thin;
      }

      .translation-list::-webkit-scrollbar {
        width: 8px;
      }

      .translation-list::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(255, 184, 0, 0.5);
      }

      .text-block {
        padding: 15px 18px 17px;
      }

      .text-block.translated {
        border: 1px solid #fff1c8;
        border-radius: 12px;
        background: linear-gradient(180deg, rgba(255, 248, 224, 0.72), rgba(255, 250, 236, 0.48));
      }

      .text-block.translated.has-error {
        border-color: #fecdd3;
        background: #fff1f2;
      }

      .label-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: #6b7280;
        font-size: 12px;
      }

      .label-row em {
        color: #9a6500;
        font-style: normal;
      }

      .copy-one {
        height: 28px;
        border-color: #ffe6a8;
        background: #fffdf8;
        color: #9a6500;
        font-size: 12px;
        font-weight: 800;
        padding: 0 10px;
      }

      .copy-one.copied {
        border-color: #ffb800;
        background: #fff2c7;
        color: #142033;
      }

      p {
        margin: 10px 0 0;
        color: #111827;
        font-size: 15px;
        line-height: 1.58;
      }

      .translated p {
        color: #142033;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.62;
        letter-spacing: 0;
      }

      .translated .model-error {
        color: #be123c;
        font-size: 13px;
        font-weight: 700;
      }

      footer {
        display: grid;
        align-items: center;
        justify-content: stretch;
        position: relative;
        z-index: 1;
        min-height: 52px;
        padding: 8px 14px;
        border-top: 1px solid #fff1c8;
        border-radius: 0 0 16px 16px;
        background: rgba(255, 253, 248, 0.88);
      }

      footer button {
        width: 100%;
        background: linear-gradient(90deg, #ffb800, #ffcf32);
        font-weight: 900;
        box-shadow: 0 10px 20px rgba(255, 184, 0, 0.18);
      }

      footer button.copied {
        min-width: 62px;
        background: #10b981;
        color: #142033;
        font-weight: 800;
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

function getCopyText(result: { alternatives: Array<{ modelProfileName: string; translatedText: string; error?: string }> }): string {
  const successfulResults = result.alternatives.filter((alternative) => !alternative.error);

  if (successfulResults.length <= 1) {
    return successfulResults[0]?.translatedText ?? '';
  }

  return successfulResults
    .map((alternative) => `${alternative.modelProfileName}\n${alternative.translatedText}`)
    .join('\n\n');
}

function getFooterCopyLabel(
  result: { alternatives: Array<{ error?: string }> },
  copyLabel: string,
  copyAllLabel: string,
): string {
  const successfulCount = result.alternatives.filter((alternative) => !alternative.error).length;
  return successfulCount > 1 ? copyAllLabel : copyLabel;
}
