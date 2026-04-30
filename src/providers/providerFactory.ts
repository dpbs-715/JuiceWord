import { OpenAICompatibleProvider } from './openaiCompatibleProvider';
import type { TranslationProvider } from './providerTypes';

export function createTranslationProvider(): TranslationProvider {
  return new OpenAICompatibleProvider();
}
