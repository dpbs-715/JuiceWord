import { browser } from 'wxt/browser';
import { configService } from '../config/configService';
import { routeBackgroundMessage } from '../messaging/messageRouter';
import { CONTENT_TRANSLATE_SELECTION } from '../messaging/messageTypes';
import { CONTEXT_MENU_ID } from '../shared/constants';
import { getMessages } from '../shared/i18n';

export function mountBackgroundApp(): void {
  browser.runtime.onInstalled.addListener(() => {
    void createContextMenu();
  });

  browser.runtime.onStartup.addListener(() => {
    void createContextMenu();
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes['juiceword.config']) {
      void updateContextMenuTitle();
    }
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

async function createContextMenu(): Promise<void> {
  const config = await configService.getConfig();
  const title = getMessages(config.uiLanguage).contextMenu;

  await browser.contextMenus.removeAll();
  await browser.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title,
    contexts: ['selection'],
  });
}

async function updateContextMenuTitle(): Promise<void> {
  const config = await configService.getConfig();
  const title = getMessages(config.uiLanguage).contextMenu;

  await browser.contextMenus.update(CONTEXT_MENU_ID, { title }).catch(() => createContextMenu());
}
