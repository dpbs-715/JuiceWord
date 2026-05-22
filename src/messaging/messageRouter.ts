import { getErrorMessage } from '../shared/errors';
import { translatorService } from '../translator/translatorService';
import {
  toVisualRequirementError,
  visualRequirementService,
} from '../visual-requirement/visualRequirementService';
import {
  BACKGROUND_GENERATE_VISUAL_REQUIREMENT,
  BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT,
  BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT,
  BACKGROUND_TRANSLATE_ELEMENT_TEXT,
  BACKGROUND_TRANSLATE_TEXT,
  type JuiceWordMessage,
} from './messageTypes';

export function routeBackgroundMessage(
  message: JuiceWordMessage,
  _sender: unknown,
  sendResponse: (response: unknown) => void,
): boolean | undefined {
  if (message.type === BACKGROUND_TRANSLATE_TEXT) {
    void translatorService
      .translateSelection(message.payload.selection, message.payload.targetLanguage)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));

    return true;
  }

  if (message.type === BACKGROUND_TRANSLATE_ELEMENT_TEXT) {
    void translatorService
      .translateElementText(message.payload.text, message.payload.targetLanguage)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));

    return true;
  }

  if (message.type === BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT) {
    try {
      const context = visualRequirementService.setLatestContext(message.payload.context);
      sendResponse({ ok: true, context });
    } catch (error: unknown) {
      sendResponse({ ok: false, error: toVisualRequirementError(error) });
    }

    return undefined;
  }

  if (message.type === BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT) {
    try {
      sendResponse({ ok: true, context: visualRequirementService.getLatestContext() });
    } catch (error: unknown) {
      sendResponse({ ok: false, error: toVisualRequirementError(error) });
    }

    return undefined;
  }

  if (message.type === BACKGROUND_GENERATE_VISUAL_REQUIREMENT) {
    void visualRequirementService
      .generateTask(message.payload.context, message.payload.intent)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: unknown) => sendResponse({ ok: false, error: toVisualRequirementError(error) }));

    return true;
  }

  return undefined;
}
