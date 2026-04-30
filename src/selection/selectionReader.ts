import { MAX_SELECTION_LENGTH } from '../shared/constants';
import { normalizeSelectedText } from '../shared/text';
import type { SelectionReadResult, SelectionSnapshot } from './selectionTypes';

export function readCurrentSelection(): SelectionReadResult {
  const selection = window.getSelection();
  const rawText = selection?.toString() ?? '';
  const text = normalizeSelectedText(rawText);

  if (!text) {
    return { ok: false, reason: 'empty' };
  }

  if (text.length > MAX_SELECTION_LENGTH) {
    return { ok: false, reason: 'too-long', text };
  }

  const rect = getSelectionRect(selection);
  const snapshot: SelectionSnapshot = { text, rect };
  return { ok: true, snapshot };
}

function getSelectionRect(selection: Selection | null): SelectionSnapshot['rect'] {
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    right: rect.right + window.scrollX,
    bottom: rect.bottom + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}
