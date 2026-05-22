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
  VISUAL_REQUIREMENT_TARGET_CLASS,
} from './visualRequirementConstants';

const MIN_SELECTABLE_WIDTH = 12;
const MIN_SELECTABLE_HEIGHT = 8;
const MAX_Z_INDEX = 2147483647;
const MODE_CURSOR = `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='shadow' x='-40%25' y='-40%25' width='180%25' height='180%25'%3E%3CfeDropShadow dx='0' dy='2' stdDeviation='1.6' flood-color='%23000000' flood-opacity='.28'/%3E%3C/filter%3E%3Cpath d='M14 2.8C10.1 7.7 7 11.4 7 15.7 7 20.2 10 23.4 14 23.4S21 20.2 21 15.7C21 11.4 17.9 7.7 14 2.8Z' fill='%23ffb800' filter='url(%23shadow)'/%3E%3Cpath d='M14 4.8C10.9 8.9 8.8 11.9 8.8 15.5 8.8 19 11 21.6 14 21.6S19.2 19 19.2 15.5C19.2 11.9 17.1 8.9 14 4.8Z' fill='%23ffcf32'/%3E%3Cpath d='M11.2 12.8C11.7 10.9 13 8.9 14 7.5' fill='none' stroke='%23fff8dc' stroke-width='1.7' stroke-linecap='round'/%3E%3Ccircle cx='17' cy='9.4' r='1.35' fill='%23fff8dc'/%3E%3C/svg%3E") 14 22, pointer`;

export class VisualRequirementController {
  private enabled = false;
  private hoveredElement: HTMLElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private status: HTMLDivElement | null = null;
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
    const element = findSelectableElement(event.target);

    if (element === this.hoveredElement) {
      return;
    }

    this.clearTargetHighlight();
    this.hoveredElement = element;
    this.applyTargetHighlight(element);
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

    this.overlay.style.display = 'block';
    this.overlay.classList.toggle('selected', state === 'selected');
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
    element.classList.add(VISUAL_REQUIREMENT_TARGET_CLASS);
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

    this.highlightedElement.classList.remove(VISUAL_REQUIREMENT_TARGET_CLASS);
    this.highlightedElement.style.backgroundColor = this.highlightedStyles.backgroundColor ?? '';
    this.highlightedElement.style.backgroundImage = this.highlightedStyles.backgroundImage ?? '';
    this.highlightedElement.style.boxShadow = this.highlightedStyles.boxShadow ?? '';
    this.highlightedElement.style.outline = this.highlightedStyles.outline ?? '';
    this.highlightedElement.style.outlineOffset = this.highlightedStyles.outlineOffset ?? '';
    this.highlightedElement.style.borderRadius = this.highlightedStyles.borderRadius ?? '';

    this.highlightedElement = null;
    this.highlightedStyles = {};
  }

  private async captureElement(element: HTMLElement): Promise<void> {
    const context = readSelectedElementContext(element);
    this.hoveredElement = element;
    this.applyTargetHighlight(element);
    this.syncOverlay('selected');
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
      cursor: ${MODE_CURSOR} !important;
    }

    .${VISUAL_REQUIREMENT_OVERLAY_CLASS} {
      position: fixed;
      z-index: ${MAX_Z_INDEX};
      box-sizing: border-box;
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

    .${VISUAL_REQUIREMENT_OVERLAY_CLASS}.selected {
      background: rgba(255, 184, 0, 0.18);
      box-shadow:
        0 0 0 4px rgba(255, 184, 0, 0.22),
        0 14px 32px rgba(154, 101, 0, 0.22);
    }

    .${VISUAL_REQUIREMENT_TARGET_CLASS} {
      background-color: rgba(255, 184, 0, 0.18) !important;
      background-image: linear-gradient(90deg, rgba(255, 184, 0, 0.2), rgba(255, 207, 50, 0.12)) !important;
      box-shadow: inset 0 0 0 9999px rgba(255, 184, 0, 0.08) !important;
      transition: background-color 120ms ease, background-image 120ms ease !important;
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
