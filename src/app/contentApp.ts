import { browser } from 'wxt/browser';
import { ElementTranslateController } from '../element-translate/elementTranslateController';
import { FloatingController } from '../floating/floatingController';
import {
  CONTENT_SET_ELEMENT_TRANSLATE_MODE,
  CONTENT_SET_VISUAL_REQUIREMENT_MODE,
  CONTENT_TRANSLATE_SELECTION,
  type JuiceWordMessage,
} from '../messaging/messageTypes';
import { getSelectionForTranslation } from '../selection/selectionController';
import { VisualRequirementController } from '../visual-requirement/visualRequirementController';

const CONTENT_APP_MARKER = '__juicewordContentAppMounted';
const CONTENT_APP_VERSION = 'visual-requirement-v1';

export function mountContentApp(): void {
  const globalWindow = window as Window & { [CONTENT_APP_MARKER]?: string };

  if (globalWindow[CONTENT_APP_MARKER] === CONTENT_APP_VERSION) {
    return;
  }

  globalWindow[CONTENT_APP_MARKER] = CONTENT_APP_VERSION;

  const floating = new FloatingController();
  const elementTranslate = new ElementTranslateController();
  const visualRequirement = new VisualRequirementController();

  browser.runtime.onMessage.addListener((message: JuiceWordMessage, _sender, sendResponse) => {
    if (message.type === CONTENT_SET_ELEMENT_TRANSLATE_MODE) {
      const enabled = elementTranslate.setEnabled(message.payload.enabled);

      if (enabled) {
        visualRequirement.setEnabled(false);
      }

      sendResponse({ ok: true, enabled });
      return undefined;
    }

    if (message.type === CONTENT_SET_VISUAL_REQUIREMENT_MODE) {
      const enabled = visualRequirement.setEnabled(message.payload.enabled);

      if (enabled) {
        elementTranslate.setEnabled(false);
      }

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
