import {
  VISUAL_REQUIREMENT_PARENT_DEPTH,
  VISUAL_REQUIREMENT_TEXT_LIMIT,
} from './visualRequirementConstants';
import { buildElementSelector } from './elementSelector';
import type { SelectedElementContext } from './visualRequirementTypes';

export function readSelectedElementContext(element: HTMLElement): SelectedElementContext {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return {
    id: createContextId(),
    capturedAt: Date.now(),
    page: {
      title: document.title,
      url: readSanitizedPageUrl(),
    },
    element: {
      tagName: element.tagName.toLowerCase(),
      role: element.getAttribute('role') ?? '',
      textContent: getReadableText(element),
      selector: buildElementSelector(element),
      boundingRect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      },
    },
    parentChain: readParentChain(element),
    styles: {
      display: style.display,
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      border: style.border,
      borderRadius: style.borderRadius,
      padding: style.padding,
      margin: style.margin,
      boxShadow: style.boxShadow,
    },
  };
}

function readParentChain(element: HTMLElement): SelectedElementContext['parentChain'] {
  const parents: SelectedElementContext['parentChain'] = [];
  let current = element.parentElement;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement &&
    parents.length < VISUAL_REQUIREMENT_PARENT_DEPTH
  ) {
    parents.push({
      tagName: current.tagName.toLowerCase(),
      selector: buildElementSelector(current),
      textContent: getReadableText(current),
    });
    current = current.parentElement;
  }

  return parents;
}

function getReadableText(element: HTMLElement): string {
  const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();

  if (text.length <= VISUAL_REQUIREMENT_TEXT_LIMIT) {
    return text;
  }

  return `${text.slice(0, VISUAL_REQUIREMENT_TEXT_LIMIT)}...`;
}

function createContextId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = crypto.getRandomValues(new Uint32Array(4));
    return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('-');
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readSanitizedPageUrl(): string {
  try {
    const url = new URL(window.location.href);
    return `${url.origin}${url.pathname}`;
  } catch {
    return window.location.origin || '';
  }
}
