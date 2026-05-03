import type { SelectionSnapshot } from '../selection/selectionTypes';
import type { TranslationResult } from '../translator/translatorTypes';

export const CONTENT_TRANSLATE_SELECTION = 'JUICEWORD_CONTENT_TRANSLATE_SELECTION';
export const CONTENT_SET_ELEMENT_TRANSLATE_MODE = 'JUICEWORD_CONTENT_SET_ELEMENT_TRANSLATE_MODE';
export const BACKGROUND_TRANSLATE_TEXT = 'JUICEWORD_BACKGROUND_TRANSLATE_TEXT';
export const BACKGROUND_TRANSLATE_ELEMENT_TEXT = 'JUICEWORD_BACKGROUND_TRANSLATE_ELEMENT_TEXT';

export interface ContentTranslateSelectionMessage {
  type: typeof CONTENT_TRANSLATE_SELECTION;
}

export interface ContentSetElementTranslateModeMessage {
  type: typeof CONTENT_SET_ELEMENT_TRANSLATE_MODE;
  payload: {
    enabled: boolean;
  };
}

export interface BackgroundTranslateTextMessage {
  type: typeof BACKGROUND_TRANSLATE_TEXT;
  payload: {
    selection: SelectionSnapshot;
    targetLanguage?: string;
  };
}

export interface BackgroundTranslateElementTextMessage {
  type: typeof BACKGROUND_TRANSLATE_ELEMENT_TEXT;
  payload: {
    text: string;
    targetLanguage?: string;
  };
}

export type JuiceWordMessage =
  | ContentTranslateSelectionMessage
  | ContentSetElementTranslateModeMessage
  | BackgroundTranslateTextMessage
  | BackgroundTranslateElementTextMessage;

export type TranslateTextResponse =
  | { ok: true; result: TranslationResult }
  | { ok: false; error: string };

export type ElementTranslateModeResponse =
  | { ok: true; enabled: boolean }
  | { ok: false; error: string };
