import { browser } from 'wxt/browser';
import {
  BACKGROUND_TRANSLATE_TEXT,
  type BackgroundTranslateTextMessage,
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
