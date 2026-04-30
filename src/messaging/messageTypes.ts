import type { SelectionSnapshot } from '../selection/selectionTypes';
import type { TranslationResult } from '../translator/translatorTypes';

export const CONTENT_TRANSLATE_SELECTION = 'JUICEWORD_CONTENT_TRANSLATE_SELECTION';
export const BACKGROUND_TRANSLATE_TEXT = 'JUICEWORD_BACKGROUND_TRANSLATE_TEXT';

export interface ContentTranslateSelectionMessage {
  type: typeof CONTENT_TRANSLATE_SELECTION;
}

export interface BackgroundTranslateTextMessage {
  type: typeof BACKGROUND_TRANSLATE_TEXT;
  payload: {
    selection: SelectionSnapshot;
    targetLanguage?: string;
  };
}

export type JuiceWordMessage = ContentTranslateSelectionMessage | BackgroundTranslateTextMessage;

export type TranslateTextResponse =
  | { ok: true; result: TranslationResult }
  | { ok: false; error: string };
