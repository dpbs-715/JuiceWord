import { browser } from 'wxt/browser';
import {
  BACKGROUND_TRANSLATE_ELEMENT_TEXT,
  BACKGROUND_TRANSLATE_TEXT,
  CONTENT_SET_ELEMENT_TRANSLATE_MODE,
  type BackgroundTranslateElementTextMessage,
  type BackgroundTranslateTextMessage,
  type ElementTranslateModeResponse,
  type TranslateTextResponse,
} from './messageTypes';

export async function requestTranslation(
  payload: BackgroundTranslateTextMessage['payload'],
): Promise<TranslateTextResponse> {
  return browser.runtime.sendMessage({
    type: BACKGROUND_TRANSLATE_TEXT,
    payload,
  } satisfies BackgroundTranslateTextMessage);
}

export async function requestElementTranslation(
  payload: BackgroundTranslateElementTextMessage['payload'],
): Promise<TranslateTextResponse> {
  return browser.runtime.sendMessage({
    type: BACKGROUND_TRANSLATE_ELEMENT_TEXT,
    payload,
  } satisfies BackgroundTranslateElementTextMessage);
}

export async function setElementTranslateModeForActiveTab(
  enabled: boolean,
): Promise<ElementTranslateModeResponse> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return { ok: false, error: 'No active tab found.' };
  }

  if (canInjectContentScript(tab.url)) {
    const injected = await injectContentScript(tab.id);

    if (!injected.ok) {
      return injected;
    }
  }

  return sendElementTranslateModeMessage(tab.id, enabled);
}

function isElementTranslateModeResponse(value: unknown): value is ElementTranslateModeResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof (value as { ok: unknown }).ok === 'boolean'
  );
}

async function sendElementTranslateModeMessage(
  tabId: number,
  enabled: boolean,
): Promise<ElementTranslateModeResponse> {
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: CONTENT_SET_ELEMENT_TRANSLATE_MODE,
      payload: { enabled },
    });

    if (isElementTranslateModeResponse(response)) {
      return response;
    }

    return {
      ok: false,
      error: 'The active tab did not respond.',
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to contact the active tab.',
    };
  }
}

function canInjectContentScript(url?: string): boolean {
  return Boolean(url && /^https?:\/\//.test(url));
}

async function injectContentScript(tabId: number): Promise<ElementTranslateModeResponse> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/content.js'],
    });

    return { ok: true, enabled: false };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to inject the content script.',
    };
  }
}
