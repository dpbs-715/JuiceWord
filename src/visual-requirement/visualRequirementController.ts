import { browser } from 'wxt/browser';
import {
  VISUAL_REQUIREMENT_CONTEXT_UPDATED,
  type VisualRequirementContextUpdatedMessage,
} from '../messaging/messageTypes';
import { setLatestVisualRequirementContext } from '../messaging/messageClient';
import { readSelectedElementContext } from './elementContextReader';
import {
  VISUAL_REQUIREMENT_BLOCKED_SELECTOR,
  VISUAL_REQUIREMENT_MODE_CLASS,
  VISUAL_REQUIREMENT_OVERLAY_CLASS,
  VISUAL_REQUIREMENT_STATUS_CLASS,
  VISUAL_REQUIREMENT_STYLE_ID,
} from './visualRequirementConstants';

const MIN_SELECTABLE_WIDTH = 12;
const MIN_SELECTABLE_HEIGHT = 8;
const MAX_Z_INDEX = 2147483647;

export class VisualRequirementController {
  private enabled = false;
  private hoveredElement: HTMLElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private status: HTMLDivElement | null = null;

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
    document.querySelectorAll(`.${VISUAL_REQUIREMENT_OVERLAY_CLASS}, .${VISUAL_REQUIREMENT_STATUS_CLASS}`).forEach((node) => {
      node.remove();
    });

    this.overlay = document.createElement('div');
    this.overlay.className = VISUAL_REQUIREMENT_OVERLAY_CLASS;
    this.status = document.createElement('div');
    this.status.className = VISUAL_REQUIREMENT_STATUS_CLASS;
    this.status.textContent = 'JuiceWord 视觉需求采集 · Esc 退出';

    document.documentElement.classList.add(VISUAL_REQUIREMENT_MODE_CLASS);
    document.documentElement.append(this.overlay);
    document.documentElement.append(this.status);

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleViewportChange, true);
    window.addEventListener('resize', this.handleViewportChange);
  }

  private unmount(): void {
    document.documentElement.classList.remove(VISUAL_REQUIREMENT_MODE_CLASS);
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
    const element = findSelectableElement(event.target);

    if (element === this.hoveredElement) {
      return;
    }

    this.hoveredElement = element;
    this.syncOverlay();
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const element = findSelectableElement(event.target);

    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    void this.captureElement(element);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.setEnabled(false);
  };

  private readonly handleViewportChange = (): void => {
    this.syncOverlay();
  };

  private readonly syncOverlay = (): void => {
    if (!this.overlay || !this.hoveredElement) {
      this.hideOverlay();
      return;
    }

    const rect = this.hoveredElement.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      this.hideOverlay();
      return;
    }

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

  private async captureElement(element: HTMLElement): Promise<void> {
    const context = readSelectedElementContext(element);
    this.setEnabled(false);
    const response = await setLatestVisualRequirementContext(context);

    if (!response.ok) {
      return;
    }

    void browser.runtime.sendMessage({
      type: VISUAL_REQUIREMENT_CONTEXT_UPDATED,
      payload: { contextId: context.id },
    } satisfies VisualRequirementContextUpdatedMessage).catch(() => undefined);
  }
}

function findSelectableElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (target.closest(`.${VISUAL_REQUIREMENT_OVERLAY_CLASS}, .${VISUAL_REQUIREMENT_STATUS_CLASS}`)) {
    return null;
  }

  if (target.closest(VISUAL_REQUIREMENT_BLOCKED_SELECTOR)) {
    return null;
  }

  let element: HTMLElement | null = target;

  while (element && element !== document.body && element !== document.documentElement) {
    if (isSelectableElement(element)) {
      return element;
    }

    element = element.parentElement;
  }

  return null;
}

function isSelectableElement(element: HTMLElement): boolean {
  if (element.closest(`.${VISUAL_REQUIREMENT_OVERLAY_CLASS}, .${VISUAL_REQUIREMENT_STATUS_CLASS}`)) {
    return false;
  }

  if (element.matches(VISUAL_REQUIREMENT_BLOCKED_SELECTOR) || element.closest(VISUAL_REQUIREMENT_BLOCKED_SELECTOR)) {
    return false;
  }

  if (element.isContentEditable || element.closest('[contenteditable="true"]')) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width >= MIN_SELECTABLE_WIDTH &&
    rect.height >= MIN_SELECTABLE_HEIGHT &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    Number(style.opacity) > 0
  );
}

function injectStyles(): void {
  const existingStyle = document.getElementById(VISUAL_REQUIREMENT_STYLE_ID);
  const style = existingStyle ?? document.createElement('style');
  style.id = VISUAL_REQUIREMENT_STYLE_ID;
  style.textContent = `
    html.${VISUAL_REQUIREMENT_MODE_CLASS}, html.${VISUAL_REQUIREMENT_MODE_CLASS} * {
      cursor: crosshair !important;
    }

    .${VISUAL_REQUIREMENT_OVERLAY_CLASS} {
      position: fixed;
      z-index: ${MAX_Z_INDEX};
      box-sizing: border-box;
      display: none;
      pointer-events: none;
      border: 2px solid rgba(255, 184, 0, 0.96);
      border-radius: 8px;
      background: rgba(255, 207, 50, 0.18);
      box-shadow:
        inset 0 0 0 9999px rgba(255, 184, 0, 0.1),
        0 0 0 3px rgba(255, 184, 0, 0.24),
        0 12px 28px rgba(154, 101, 0, 0.18);
      transition:
        width 120ms ease,
        height 120ms ease,
        transform 120ms ease;
    }

    .${VISUAL_REQUIREMENT_STATUS_CLASS} {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: ${MAX_Z_INDEX};
      padding: 9px 11px;
      border: 1px solid rgba(255, 184, 0, 0.46);
      border-radius: 8px;
      background: rgba(18, 26, 43, 0.92);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
      color: #ffcf32;
      font: 800 12px/1.2 "Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif;
      pointer-events: none;
    }
  `;

  if (!existingStyle) {
    document.documentElement.append(style);
  }
}
