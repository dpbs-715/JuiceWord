import { getErrorMessage } from '../shared/errors';
import { translatorService } from '../translator/translatorService';
import { BACKGROUND_TRANSLATE_TEXT, type JuiceWordMessage } from './messageTypes';

export function routeBackgroundMessage(
  message: JuiceWordMessage,
  _sender: unknown,
  sendResponse: (response: unknown) => void,
): boolean | undefined {
  if (message.type !== BACKGROUND_TRANSLATE_TEXT) {
    return undefined;
  }

  void translatorService
    .translateSelection(message.payload.selection, message.payload.targetLanguage)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));

  return true;
}
