import { browser } from 'wxt/browser';
import { FloatingController } from '../floating/floatingController';
import { CONTENT_TRANSLATE_SELECTION, type JuiceWordMessage } from '../messaging/messageTypes';
import { getSelectionForTranslation } from '../selection/selectionController';

export function mountContentApp(): void {
  const floating = new FloatingController();

  browser.runtime.onMessage.addListener((message: JuiceWordMessage) => {
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
