import { readCurrentSelection } from './selectionReader';
import type { SelectionReadResult } from './selectionTypes';

export function getSelectionForTranslation(): SelectionReadResult {
  return readCurrentSelection();
}
