import { browser } from 'wxt/browser';
import { CONTEXT_MENU_ID } from '../shared/constants';
import { routeBackgroundMessage } from '../messaging/messageRouter';
import { CONTENT_TRANSLATE_SELECTION } from '../messaging/messageTypes';

export function mountBackgroundApp(): void {
  browser.runtime.onInstalled.addListener(() => {
    void browser.contextMenus.removeAll().then(() => {
      void browser.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'JuiceWord Translate',
        contexts: ['selection'],
      });
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) {
      return;
    }

    void browser.tabs.sendMessage(tab.id, { type: CONTENT_TRANSLATE_SELECTION }).catch(() => {
      // Content scripts are unavailable on browser pages and extension pages.
    });
  });

  browser.runtime.onMessage.addListener(routeBackgroundMessage);
}
