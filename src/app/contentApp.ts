import { browser } from 'wxt/browser';
import { ElementTranslateController } from '../element-translate/elementTranslateController';
import { FloatingController } from '../floating/floatingController';
import {
  CONTENT_SET_ELEMENT_TRANSLATE_MODE,
  CONTENT_TRANSLATE_SELECTION,
  type JuiceWordMessage,
} from '../messaging/messageTypes';
import { getSelectionForTranslation } from '../selection/selectionController';

const CONTENT_APP_MARKER = '__juicewordContentAppMounted';

export function mountContentApp(): void {
  const globalWindow = window as Window & { [CONTENT_APP_MARKER]?: boolean };

  if (globalWindow[CONTENT_APP_MARKER]) {
    return;
  }

  globalWindow[CONTENT_APP_MARKER] = true;

  const floating = new FloatingController();
  const elementTranslate = new ElementTranslateController();

  browser.runtime.onMessage.addListener((message: JuiceWordMessage, _sender, sendResponse) => {
    if (message.type === CONTENT_SET_ELEMENT_TRANSLATE_MODE) {
      const enabled = elementTranslate.setEnabled(message.payload.enabled);
      sendResponse({ ok: true, enabled });
      return undefined;
    }

    if (message.type !== CONTENT_TRANSLATE_SELECTION) {
      return undefined;
    }

    const selection = getSelectionForTranslation();

    if (!selection.ok) {
      if (selection.reason === 'too-long') {
        floating.showTooLong(selection.text ?? '');
      }

      return undefined;
    }

    void floating.translate(selection.snapshot);
    return undefined;
  });
}
