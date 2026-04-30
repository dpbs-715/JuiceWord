export function buildTranslationPrompt(sourceText: string, targetLanguage: string): string {
  return [
    `Translate the following text into ${targetLanguage}.`,
    'Return only the translated text. Keep the original meaning, tone, and formatting as much as possible.',
    '',
    sourceText,
  ].join('\n');
}
