import { truncateText } from '../shared/text';
import { getFloatingPosition } from './floatingPosition';
import type { FloatingState, FloatingViewActions } from './floatingTypes';

const STYLE_ID = 'juiceword-floating-style';

export class FloatingView {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private pinned = false;

  render(state: FloatingState, actions: FloatingViewActions): void {
    this.ensureMounted();

    if (!this.host || !this.shadow) {
      return;
    }

    const selection = 'selection' in state ? state.selection : undefined;
    const position = getFloatingPosition(selection);

    if (!this.pinned) {
      this.host.style.top = `${position.top}px`;
      this.host.style.left = `${position.left}px`;
    }

    this.shadow.innerHTML = `
      <style>${getStyles()}</style>
      <article class="jw-card ${state.status}">
        <header>
          <div class="brand">
            <span class="logo">J</span>
            <strong>JuiceWord</strong>
          </div>
          <div class="tools">
            <button class="pin" title="Pin" type="button">Pin</button>
            <button class="close" title="Close" type="button">Close</button>
          </div>
        </header>
        ${renderBody(state)}
      </article>
    `;

    this.shadow.querySelector('.close')?.addEventListener('click', actions.onClose);
    this.shadow.querySelector('.pin')?.addEventListener('click', () => {
      this.pinned = !this.pinned;
      actions.onPin();
    });
    this.shadow.querySelector('.retry')?.addEventListener('click', actions.onRetry);
    this.shadow.querySelector('.copy')?.addEventListener('click', () => {
      if (state.status === 'success') {
        actions.onCopy(state.result.translatedText);
      }
    });
  }

  remove(): void {
    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.pinned = false;
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
}

function renderBody(state: FloatingState): string {
  if (state.status === 'loading') {
    return `
      <section class="center-state">
        <div class="drops"><i></i><i></i><i></i></div>
        <strong>正在翻译中...</strong>
        <span>请稍候</span>
      </section>
    `;
  }

  if (state.status === 'error') {
    return `
      <section class="center-state">
        <div class="sad">!</div>
        <strong>翻译失败</strong>
        <span>${escapeHtml(state.message)}</span>
        <button class="retry action" type="button">重试</button>
      </section>
    `;
  }

  if (state.status === 'too-long') {
    return `
      <section class="center-state">
        <div class="sad calm">J</div>
        <strong>文本过长</strong>
        <span>当前文本字数过长，建议缩短后重试。</span>
      </section>
    `;
  }

  return `
    <section class="text-block">
      <div class="label-row">
        <span>原文（自动检测语言）</span>
      </div>
      <p>${escapeHtml(truncateText(state.result.sourceText, 360))}</p>
    </section>
    <div class="juice-line"></div>
    <section class="text-block translated">
      <div class="label-row">
        <span>译文（${escapeHtml(state.result.targetLanguage)}）</span>
      </div>
      <p>${escapeHtml(state.result.translatedText)}</p>
    </section>
    <footer>
      <span>${escapeHtml(state.result.targetLanguage)}</span>
      <div>
        <button class="copy" type="button">Copy</button>
        <button class="retry" type="button">Retry</button>
      </div>
    </footer>
  `;
}

function getStyles(): string {
  if (STYLE_ID) {
    return `
      :host {
        all: initial;
        color: #142033;
        font-family: "Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif;
      }

      * { box-sizing: border-box; }
      button { font: inherit; }

      .jw-card {
        width: 360px;
        overflow: hidden;
        border: 1px solid #ffe6a8;
        border-radius: 16px;
        background:
          radial-gradient(circle at 24% 0%, rgba(255, 184, 0, 0.14), transparent 34%),
          #fffdf8;
        box-shadow: 0 18px 46px rgba(255, 184, 0, 0.18), 0 10px 24px rgba(0, 0, 0, 0.08);
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 56px;
        padding: 0 18px;
        border-bottom: 1px solid #fff1c8;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .logo {
        display: grid;
        width: 28px;
        height: 28px;
        place-items: center;
        border-radius: 58% 42% 52% 48% / 64% 56% 44% 36%;
        background: linear-gradient(145deg, #ffb800, #ffe477);
        color: #fff;
        font-weight: 800;
      }

      .tools {
        display: flex;
        gap: 6px;
      }

      .tools button,
      footer button {
        min-width: 34px;
        height: 30px;
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
        padding: 16px 20px 18px;
      }

      .text-block.translated {
        background: rgba(255, 245, 207, 0.5);
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
        font-size: 17px;
        line-height: 1.52;
      }

      .juice-line {
        height: 7px;
        background: linear-gradient(90deg, transparent, #ffcf32, transparent);
        clip-path: polygon(0 35%, 13% 30%, 27% 62%, 42% 38%, 58% 58%, 73% 30%, 88% 54%, 100% 35%, 100% 100%, 0 100%);
      }

      footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 52px;
        padding: 0 18px;
        border-top: 1px solid #fff1c8;
      }

      footer span {
        color: #374151;
        font-size: 13px;
      }

      .center-state {
        display: grid;
        min-height: 178px;
        place-items: center;
        padding: 24px;
        text-align: center;
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

  return '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
