import { browser } from 'wxt/browser';
import {
  BACKGROUND_GENERATE_VISUAL_REQUIREMENT,
  BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT,
  BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT,
  BACKGROUND_TRANSLATE_ELEMENT_TEXT,
  BACKGROUND_TRANSLATE_TEXT,
  CONTENT_SET_ELEMENT_TRANSLATE_MODE,
  CONTENT_SET_VISUAL_REQUIREMENT_MODE,
  type BackgroundGenerateVisualRequirementMessage,
  type BackgroundGetVisualRequirementContextMessage,
  type BackgroundSetVisualRequirementContextMessage,
  type BackgroundTranslateElementTextMessage,
  type BackgroundTranslateTextMessage,
  type ElementTranslateModeResponse,
  type TranslateTextResponse,
  type VisualRequirementContextResponse,
  type VisualRequirementGenerateResponse,
  type VisualRequirementModeResponse,
} from './messageTypes';
import type {
  SelectedElementContext,
  VisualRequirementGenerateRequest,
} from '../visual-requirement/visualRequirementTypes';

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
  const tabId = getValidInjectableTabId(tab);

  if (tabId === null) {
    return { ok: false, error: 'No active tab found.' };
  }

  const injected = await injectContentScript(tabId);

  if (!injected.ok) {
    return injected;
  }

  return sendElementTranslateModeMessage(tabId, enabled);
}

export async function canUseElementTranslateOnActiveTab(): Promise<boolean> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return getValidInjectableTabId(tab) !== null;
}

export async function setVisualRequirementModeForActiveTab(
  enabled: boolean,
): Promise<VisualRequirementModeResponse> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const tabId = getValidInjectableTabId(tab);

  if (tabId === null) {
    return { ok: false, error: 'No supported active tab found.' };
  }

  const injected = await injectContentScript(tabId);

  if (!injected.ok) {
    return injected;
  }

  return sendVisualRequirementModeMessage(tabId, enabled);
}

export async function canUseVisualRequirementOnActiveTab(): Promise<boolean> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return getValidInjectableTabId(tab) !== null;
}

export async function setLatestVisualRequirementContext(
  context: SelectedElementContext,
): Promise<VisualRequirementContextResponse> {
  return browser.runtime.sendMessage({
    type: BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT,
    payload: { context },
  } satisfies BackgroundSetVisualRequirementContextMessage);
}

export async function getLatestVisualRequirementContext(): Promise<VisualRequirementContextResponse> {
  return browser.runtime.sendMessage({
    type: BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT,
  } satisfies BackgroundGetVisualRequirementContextMessage);
}

export async function generateVisualRequirement(
  payload: VisualRequirementGenerateRequest,
): Promise<VisualRequirementGenerateResponse> {
  return browser.runtime.sendMessage({
    type: BACKGROUND_GENERATE_VISUAL_REQUIREMENT,
    payload,
  } satisfies BackgroundGenerateVisualRequirementMessage);
}

function isModeResponse(value: unknown): value is ElementTranslateModeResponse | VisualRequirementModeResponse {
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

    if (isModeResponse(response)) {
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

async function sendVisualRequirementModeMessage(
  tabId: number,
  enabled: boolean,
): Promise<VisualRequirementModeResponse> {
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: CONTENT_SET_VISUAL_REQUIREMENT_MODE,
      payload: { enabled },
    });

    if (isModeResponse(response)) {
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
  if (!url || !/^https?:\/\//.test(url)) {
    return false;
  }

  return !isRestrictedExtensionPage(url);
}

function isValidTabId(tabId: number | undefined): tabId is number {
  return typeof tabId === 'number' && tabId >= 0;
}

function getValidInjectableTabId(tab: { id?: number; url?: string } | undefined): number | null {
  if (!tab || !isValidTabId(tab.id) || !canInjectContentScript(tab.url)) {
    return null;
  }

  return tab.id;
}

function isRestrictedExtensionPage(url: string): boolean {
  const restrictedHosts = new Set([
    'chrome.google.com',
    'chromewebstore.google.com',
    'addons.mozilla.org',
    'microsoftedge.microsoft.com',
  ]);

  try {
    return restrictedHosts.has(new URL(url).hostname);
  } catch {
    return true;
  }
}

async function injectContentScript(
  tabId: number,
): Promise<ElementTranslateModeResponse | VisualRequirementModeResponse> {
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
