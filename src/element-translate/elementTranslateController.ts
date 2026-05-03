import { requestElementTranslation } from '../messaging/messageClient';
import { MAX_SELECTION_LENGTH } from '../shared/constants';
import { normalizeSelectedText } from '../shared/text';

const STYLE_ID = 'juiceword-element-translate-style';
const OVERLAY_CLASS = 'juiceword-element-translate-overlay';
const MODE_CLASS = 'juiceword-element-translate-mode';
const TARGET_CLASS = 'juiceword-element-translate-target';
const RESULT_CLASS = 'juiceword-element-translate-result';
const RESULT_PENDING_CLASS = 'juiceword-element-translate-result-pending';
const RESULT_ERROR_CLASS = 'juiceword-element-translate-result-error';
const STATUS_CLASS = 'juiceword-element-translate-status';
const MODE_CURSOR = `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='shadow' x='-40%25' y='-40%25' width='180%25' height='180%25'%3E%3CfeDropShadow dx='0' dy='2' stdDeviation='1.6' flood-color='%23000000' flood-opacity='.28'/%3E%3C/filter%3E%3Cpath d='M14 2.8C10.1 7.7 7 11.4 7 15.7 7 20.2 10 23.4 14 23.4S21 20.2 21 15.7C21 11.4 17.9 7.7 14 2.8Z' fill='%23ffb800' filter='url(%23shadow)'/%3E%3Cpath d='M14 4.8C10.9 8.9 8.8 11.9 8.8 15.5 8.8 19 11 21.6 14 21.6S19.2 19 19.2 15.5C19.2 11.9 17.1 8.9 14 4.8Z' fill='%23ffcf32'/%3E%3Cpath d='M11.2 12.8C11.7 10.9 13 8.9 14 7.5' fill='none' stroke='%23fff8dc' stroke-width='1.7' stroke-linecap='round'/%3E%3Ccircle cx='17' cy='9.4' r='1.35' fill='%23fff8dc'/%3E%3C/svg%3E") 14 22, pointer`;

const BLOCKED_TAGS = new Set([
  'AUDIO',
  'BUTTON',
  'CANVAS',
  'CODE',
  'IFRAME',
  'INPUT',
  'NOSCRIPT',
  'PRE',
  'SCRIPT',
  'SELECT',
  'STYLE',
  'SVG',
  'TEXTAREA',
  'VIDEO',
]);

export class ElementTranslateController {
  private enabled = false;
  private hoveredElement: HTMLElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private status: HTMLDivElement | null = null;
  private translatingElements = new WeakSet<HTMLElement>();
  private highlightedElement: HTMLElement | null = null;
  private highlightedStyles: Partial<Record<string, string>> = {};

  setEnabled(enabled: boolean): boolean {
    if (enabled === this.enabled) {
      return this.enabled;
    }

    this.enabled = enabled;

    if (enabled) {
      this.mount();
    } else {
      this.unmount();
    }

    return this.enabled;
  }

  private mount(): void {
    injectStyles();
    document.querySelectorAll(`.${OVERLAY_CLASS}`).forEach((node) => {
      node.remove();
    });
    this.overlay = document.createElement('div');
    this.overlay.className = OVERLAY_CLASS;
    this.status = document.createElement('div');
    this.status.className = STATUS_CLASS;
    this.status.textContent = 'JuiceWord 点选翻译 · Esc 退出';
    document.documentElement.classList.add(MODE_CLASS);
    document.documentElement.append(this.overlay);
    document.documentElement.append(this.status);

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleViewportChange, true);
    window.addEventListener('resize', this.handleViewportChange);
  }

  private unmount(): void {
    document.documentElement.classList.remove(MODE_CLASS);
    this.clearTargetHighlight();
    this.hoveredElement = null;
    this.overlay?.remove();
    this.status?.remove();
    this.overlay = null;
    this.status = null;

    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('scroll', this.handleViewportChange, true);
    window.removeEventListener('resize', this.handleViewportChange);
  }

  private readonly handleMouseMove = (event: MouseEvent): void => {
    const element = findTranslatableElement(event.target);

    if (element === this.hoveredElement) {
      return;
    }

    this.clearTargetHighlight();
    this.hoveredElement = element;
    this.applyTargetHighlight(element);
    this.syncOverlay();
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const element = findTranslatableElement(event.target);

    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.clearTargetHighlight();
    this.hoveredElement = element;
    this.applyTargetHighlight(element);
    this.syncOverlay('selected');
    window.setTimeout(() => this.syncOverlay(), 260);

    void this.translateElement(element);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    this.setEnabled(false);
  };

  private readonly handleViewportChange = (): void => {
    this.syncOverlay();
    syncResultPositions();
  };

  private readonly syncOverlay = (state?: 'selected'): void => {
    if (!this.overlay || !this.hoveredElement) {
      this.hideOverlay();
      return;
    }

    const rect = this.hoveredElement.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      this.hideOverlay();
      return;
    }

    this.overlay.classList.toggle('selected', state === 'selected');
    this.overlay.style.display = 'block';
    this.overlay.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
  };

  private hideOverlay(): void {
    if (!this.overlay) {
      return;
    }

    this.overlay.style.display = 'none';
  }

  private applyTargetHighlight(element: HTMLElement | null): void {
    if (!element || element === this.highlightedElement) {
      return;
    }

    this.clearTargetHighlight();
    this.highlightedElement = element;
    this.highlightedStyles = {
      backgroundColor: element.style.backgroundColor,
      backgroundImage: element.style.backgroundImage,
      boxShadow: element.style.boxShadow,
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
      borderRadius: element.style.borderRadius,
    };
    element.classList.add(TARGET_CLASS);
    element.style.setProperty('background-color', 'rgba(255, 184, 0, 0.18)', 'important');
    element.style.setProperty(
      'background-image',
      'linear-gradient(90deg, rgba(255, 184, 0, 0.22), rgba(255, 207, 50, 0.12))',
      'important',
    );
    element.style.setProperty('box-shadow', 'inset 0 0 0 9999px rgba(255, 184, 0, 0.08)', 'important');
    element.style.setProperty('outline', '2px solid rgba(255, 184, 0, 0.75)', 'important');
    element.style.setProperty('outline-offset', '2px', 'important');
    element.style.setProperty('border-radius', '6px', 'important');
  }

  private clearTargetHighlight(): void {
    if (!this.highlightedElement) {
      return;
    }

    this.highlightedElement.classList.remove(TARGET_CLASS);
    this.highlightedElement.style.backgroundColor = this.highlightedStyles.backgroundColor ?? '';
    this.highlightedElement.style.backgroundImage = this.highlightedStyles.backgroundImage ?? '';
    this.highlightedElement.style.boxShadow = this.highlightedStyles.boxShadow ?? '';
    this.highlightedElement.style.outline = this.highlightedStyles.outline ?? '';
    this.highlightedElement.style.outlineOffset = this.highlightedStyles.outlineOffset ?? '';
    this.highlightedElement.style.borderRadius = this.highlightedStyles.borderRadius ?? '';

    this.highlightedElement = null;
    this.highlightedStyles = {};
  }

  private async translateElement(element: HTMLElement): Promise<void> {
    if (this.translatingElements.has(element)) {
      return;
    }

    const text = getElementSourceText(element);

    if (!text || text.length > MAX_SELECTION_LENGTH) {
      renderElementTranslation(element, {
        state: 'error',
        text: text.length > MAX_SELECTION_LENGTH ? 'Selected element text is too long.' : 'No text found.',
      });
      return;
    }

    this.translatingElements.add(element);
    renderElementTranslation(element, { state: 'loading', text: 'JuiceWord translating...' });

    try {
      const response = await requestElementTranslation({ text });

      if (!response.ok) {
        renderElementTranslation(element, { state: 'error', text: response.error });
        return;
      }

      renderElementTranslation(element, {
        state: 'success',
        text: response.result.translatedText,
        modelName: response.result.modelProfileName,
      });
    } catch (error: unknown) {
      renderElementTranslation(element, {
        state: 'error',
        text: error instanceof Error ? error.message : 'Translation failed.',
      });
    } finally {
      this.translatingElements.delete(element);
    }
  }
}

function findTranslatableElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  let element: HTMLElement | null = target;

  while (element && element !== document.body && element !== document.documentElement) {
    if (isTranslatableElement(element)) {
      return element;
    }

    element = element.parentElement;
  }

  return null;
}

function isTranslatableElement(element: HTMLElement): boolean {
  if (element.closest(`.${OVERLAY_CLASS}`)) {
    return false;
  }

  if (element.closest(`.${RESULT_CLASS}`)) {
    return false;
  }

  if (element.isContentEditable || element.closest('[contenteditable="true"]')) {
    return false;
  }

  if (element.closest('input, textarea, select, code, pre, script, style, noscript, svg, canvas, iframe')) {
    return false;
  }

  if (BLOCKED_TAGS.has(element.tagName)) {
    return false;
  }

  const text = getElementSourceText(element);

  if (text.length < 2 || text.length > 1200) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width >= 24 &&
    rect.height >= 10 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    Number(style.opacity) > 0
  );
}

function injectStyles(): void {
  const existingStyle = document.getElementById(STYLE_ID);
  const style = existingStyle ?? document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html.${MODE_CLASS}, html.${MODE_CLASS} * {
      cursor: ${MODE_CURSOR} !important;
    }

    .${OVERLAY_CLASS} {
      position: fixed;
      z-index: 2147483647;
      display: none;
      pointer-events: none;
      border: 2px solid rgba(255, 184, 0, 0.96);
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgba(255, 184, 0, 0.28), rgba(255, 207, 50, 0.14));
      mix-blend-mode: normal;
      box-shadow:
        inset 0 0 0 9999px rgba(255, 184, 0, 0.14),
        0 0 0 3px rgba(255, 184, 0, 0.28),
        0 10px 26px rgba(154, 101, 0, 0.18);
      transition:
        width 120ms ease,
        height 120ms ease,
        transform 120ms ease,
        box-shadow 160ms ease,
        background-color 160ms ease;
    }

    .${OVERLAY_CLASS}.selected {
      background: rgba(255, 184, 0, 0.18);
      box-shadow:
        0 0 0 4px rgba(255, 184, 0, 0.22),
        0 14px 32px rgba(154, 101, 0, 0.22);
    }

    .${TARGET_CLASS} {
      background-color: rgba(255, 184, 0, 0.18) !important;
      background-image: linear-gradient(90deg, rgba(255, 184, 0, 0.2), rgba(255, 207, 50, 0.12)) !important;
      box-shadow: inset 0 0 0 9999px rgba(255, 184, 0, 0.08) !important;
      transition: background-color 120ms ease, background-image 120ms ease !important;
    }

    .${STATUS_CLASS} {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 2147483647;
      padding: 9px 11px;
      border: 1px solid rgba(255, 184, 0, 0.46);
      border-radius: 8px;
      background: rgba(18, 26, 43, 0.92);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
      color: #ffcf32;
      font: 800 12px/1.2 "Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif;
      pointer-events: none;
    }

    .${RESULT_CLASS} {
      box-sizing: border-box;
      display: block;
      max-width: 100%;
      margin: 8px 0 12px;
      overflow: visible;
      padding: 9px 10px;
      border: 1px solid rgba(255, 184, 0, 0.32);
      border-left: 3px solid #ffb800;
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgba(255, 250, 235, 0.98), rgba(255, 255, 255, 0.94));
      box-shadow: 0 10px 24px rgba(154, 101, 0, 0.08);
      color: #121a2b;
      font: 500 13px/1.55 "Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif;
      white-space: pre-wrap;
      animation: juiceword-element-result-in 220ms ease both;
      clear: both;
    }

    .${RESULT_CLASS}::before {
      display: block;
      margin-bottom: 4px;
      color: #9a6500;
      content: attr(data-juiceword-label);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
    }

    .${RESULT_PENDING_CLASS} {
      overflow: hidden;
      color: #9a6500;
      position: relative;
    }

    .${RESULT_PENDING_CLASS}::after {
      position: absolute;
      inset: 0;
      content: "";
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, rgba(255, 184, 0, 0.22), transparent);
      animation: juiceword-element-loading 1s ease infinite;
    }

    .${RESULT_ERROR_CLASS} {
      border-color: rgba(180, 83, 9, 0.34);
      border-left-color: #b45309;
      color: #92400e;
    }

    @keyframes juiceword-element-result-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes juiceword-element-loading {
      to {
        transform: translateX(100%);
      }
    }
  `;
  if (!existingStyle) {
    document.documentElement.append(style);
  }
}

function renderElementTranslation(
  target: HTMLElement,
  result: { state: 'loading' | 'success' | 'error'; text: string; modelName?: string },
): void {
  const existing = getExistingResult(target);
  const container = existing ?? document.createElement('div');
  removeOverlappingResults(target, container);

  container.className = RESULT_CLASS;
  container.classList.toggle(RESULT_PENDING_CLASS, result.state === 'loading');
  container.classList.toggle(RESULT_ERROR_CLASS, result.state === 'error');
  container.dataset.juicewordElementTranslation = 'true';
  container.dataset.juicewordFor = getElementKey(target);
  container.dataset.juicewordLabel =
    result.state === 'loading'
      ? 'JuiceWord'
      : result.state === 'error'
        ? 'JuiceWord error'
        : `JuiceWord · ${result.modelName ?? 'Translation'}`;
  container.textContent = result.text;
  target.dataset.juicewordElementTranslated = result.state === 'success' ? 'true' : 'pending';

  if (!existing) {
    getInsertionAnchor(target).insertAdjacentElement('afterend', container);
  }
}

function getElementSourceText(element: HTMLElement): string {
  const clone = element.cloneNode(true);

  if (!(clone instanceof HTMLElement)) {
    return normalizeSelectedText(element.innerText);
  }

  clone.querySelectorAll(`.${RESULT_CLASS}, [data-juiceword-element-translation="true"]`).forEach((node) => {
    node.remove();
  });

  return normalizeSelectedText(clone.innerText);
}

function getExistingResult(target: HTMLElement): HTMLElement | null {
  const existing = document.querySelector(`[data-juiceword-for="${getElementKey(target)}"]`);

  if (
    existing instanceof HTMLElement &&
    existing.dataset.juicewordElementTranslation === 'true'
  ) {
    return existing;
  }

  return null;
}

function getInsertionAnchor(target: HTMLElement): HTMLElement {
  let anchor = target;
  let parent = anchor.parentElement;

  while (parent && parent !== document.body && parent !== document.documentElement) {
    const parentStyle = window.getComputedStyle(parent);
    const anchorStyle = window.getComputedStyle(anchor);
    const parentClips = clipsOverflow(parentStyle);
    const anchorInline = anchorStyle.display === 'inline' || anchorStyle.display === 'contents';

    if (!parentClips && !anchorInline) {
      break;
    }

    anchor = parent;
    parent = parent.parentElement;
  }

  return anchor;
}

function clipsOverflow(style: CSSStyleDeclaration): boolean {
  return [style.overflow, style.overflowX, style.overflowY].some((value) =>
    value === 'hidden' || value === 'clip',
  );
}

function removeOverlappingResults(target: HTMLElement, current: HTMLElement): void {
  document.querySelectorAll<HTMLElement>(`.${RESULT_CLASS}[data-juiceword-for]`).forEach((result) => {
    if (result === current) {
      return;
    }

    const key = result.dataset.juicewordFor;
    const existingTarget = key
      ? document.querySelector<HTMLElement>(`[data-juiceword-element-key="${key}"]`)
      : null;

    if (!existingTarget) {
      result.remove();
      return;
    }

    if (target.contains(existingTarget) || existingTarget.contains(target)) {
      result.remove();
    }
  });
}

function syncResultPositions(): void {
  document.querySelectorAll<HTMLElement>(`.${RESULT_CLASS}[data-juiceword-for]`).forEach((result) => {
    const key = result.dataset.juicewordFor;
    const target = key
      ? document.querySelector<HTMLElement>(`[data-juiceword-element-key="${key}"]`)
      : null;

    if (!target) {
      result.remove();
    }
  });
}

function getElementKey(target: HTMLElement): string {
  if (!target.dataset.juicewordElementKey) {
    target.dataset.juicewordElementKey = crypto.randomUUID();
  }

  return target.dataset.juicewordElementKey;
}
