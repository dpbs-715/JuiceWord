const SELECTOR_PART_LIMIT = 4;
const SELECTOR_CLASS_LIMIT = 2;
const JUICEWORD_CLASS_PREFIX = 'juiceword-';

export function buildElementSelector(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body && current !== document.documentElement) {
    parts.unshift(buildSelectorPart(current));

    if (current.id || parts.length >= SELECTOR_PART_LIMIT) {
      break;
    }

    current = current.parentElement;
  }

  return parts.join(' > ');
}

function buildSelectorPart(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();

  if (element.id) {
    return `${tagName}#${escapeSelectorValue(element.id)}`;
  }

  const classNames = Array.from(element.classList)
    .filter((className) => !className.startsWith(JUICEWORD_CLASS_PREFIX))
    .slice(0, SELECTOR_CLASS_LIMIT)
    .map((className) => `.${escapeSelectorValue(className)}`)
    .join('');

  return `${tagName}${classNames}${getNthOfType(element)}`;
}

function getNthOfType(element: HTMLElement): string {
  const parent = element.parentElement;

  if (!parent) {
    return '';
  }

  const siblings = Array.from(parent.children).filter(
    (child) => child instanceof HTMLElement && child.tagName === element.tagName,
  );

  if (siblings.length <= 1) {
    return '';
  }

  return `:nth-of-type(${siblings.indexOf(element) + 1})`;
}

function escapeSelectorValue(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, '\\$&');
}
