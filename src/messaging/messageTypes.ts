import type { SelectionSnapshot } from '../selection/selectionTypes';
import type { TranslationResult } from '../translator/translatorTypes';
import type {
  SelectedElementContext,
  VisualRequirementContextResponse,
  VisualRequirementGenerateRequest,
  VisualRequirementGenerateResponse,
} from '../visual-requirement/visualRequirementTypes';

export const CONTENT_TRANSLATE_SELECTION = 'JUICEWORD_CONTENT_TRANSLATE_SELECTION';
export const CONTENT_SET_ELEMENT_TRANSLATE_MODE = 'JUICEWORD_CONTENT_SET_ELEMENT_TRANSLATE_MODE';
export const CONTENT_SET_VISUAL_REQUIREMENT_MODE = 'JUICEWORD_CONTENT_SET_VISUAL_REQUIREMENT_MODE';
export const BACKGROUND_TRANSLATE_TEXT = 'JUICEWORD_BACKGROUND_TRANSLATE_TEXT';
export const BACKGROUND_TRANSLATE_ELEMENT_TEXT = 'JUICEWORD_BACKGROUND_TRANSLATE_ELEMENT_TEXT';
export const BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT = 'JUICEWORD_BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT';
export const BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT = 'JUICEWORD_BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT';
export const BACKGROUND_GENERATE_VISUAL_REQUIREMENT = 'JUICEWORD_BACKGROUND_GENERATE_VISUAL_REQUIREMENT';

export interface ContentTranslateSelectionMessage {
  type: typeof CONTENT_TRANSLATE_SELECTION;
}

export interface ContentSetElementTranslateModeMessage {
  type: typeof CONTENT_SET_ELEMENT_TRANSLATE_MODE;
  payload: {
    enabled: boolean;
  };
}

export interface ContentSetVisualRequirementModeMessage {
  type: typeof CONTENT_SET_VISUAL_REQUIREMENT_MODE;
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

export interface BackgroundSetVisualRequirementContextMessage {
  type: typeof BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT;
  payload: {
    context: SelectedElementContext;
  };
}

export interface BackgroundGetVisualRequirementContextMessage {
  type: typeof BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT;
  payload: {
    tabId: number;
  };
}

export interface BackgroundGenerateVisualRequirementMessage {
  type: typeof BACKGROUND_GENERATE_VISUAL_REQUIREMENT;
  payload: VisualRequirementGenerateRequest;
}

export type JuiceWordMessage =
  | ContentTranslateSelectionMessage
  | ContentSetElementTranslateModeMessage
  | ContentSetVisualRequirementModeMessage
  | BackgroundTranslateTextMessage
  | BackgroundTranslateElementTextMessage
  | BackgroundSetVisualRequirementContextMessage
  | BackgroundGetVisualRequirementContextMessage
  | BackgroundGenerateVisualRequirementMessage;

export type TranslateTextResponse =
  | { ok: true; result: TranslationResult }
  | { ok: false; error: string };

export type ElementTranslateModeResponse =
  | { ok: true; enabled: boolean }
  | { ok: false; error: string };

export type VisualRequirementModeResponse =
  | { ok: true; enabled: boolean }
  | { ok: false; error: string };

export type {
  VisualRequirementContextResponse,
  VisualRequirementGenerateResponse,
};
