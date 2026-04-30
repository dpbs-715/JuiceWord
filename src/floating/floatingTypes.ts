import type { SelectionSnapshot } from '../selection/selectionTypes';
import type { TranslationResult } from '../translator/translatorTypes';

export type FloatingState =
  | { status: 'loading'; selection: SelectionSnapshot }
  | { status: 'success'; selection: SelectionSnapshot; result: TranslationResult }
  | { status: 'error'; selection?: SelectionSnapshot; message: string }
  | { status: 'too-long'; text: string };

export interface FloatingViewActions {
  onClose(): void;
  onCopy(text: string): void;
  onRetry(): void;
  onPin(): void;
}
