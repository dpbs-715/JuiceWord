import type { AppLocale } from '../config/configTypes';

export const APP_LOCALES: Array<{ value: AppLocale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '中文' },
];

export const TARGET_LANGUAGES = [
  { value: 'Simplified Chinese', label: { en: 'Simplified Chinese', 'zh-CN': '简体中文' } },
  { value: 'English', label: { en: 'English', 'zh-CN': '英文' } },
  { value: 'Japanese', label: { en: 'Japanese', 'zh-CN': '日语' } },
  { value: 'Korean', label: { en: 'Korean', 'zh-CN': '韩语' } },
] as const;

const messages = {
  en: {
    navModelConfig: 'Model Config',
    navGeneral: 'General',
    navAbout: 'About JuiceWord',
    modelConfigTitle: 'Model Config',
    modelConfigDescription: 'Configure your AI model settings.',
    baseUrlExample: 'Example: http://127.0.0.1:8317/v1',
    show: 'Show',
    hide: 'Hide',
    modelExample: 'Example: deepseek-chat, gpt-3.5-turbo, qwen-plus, etc.',
    targetLanguage: 'Default Target Language',
    uiLanguage: 'Interface Language',
    save: 'Save Settings',
    saving: 'Saving...',
    saved: 'Settings saved',
    popupTagline: 'Turn words into meaning.',
    ready: 'Ready to translate',
    setupRequired: 'Setup required',
    addModelSettings: 'Add your model settings first.',
    openOptions: 'Open Options',
    loadingTitle: 'Translating...',
    loadingDescription: 'Please wait',
    errorTitle: 'Translation failed',
    retry: 'Retry',
    textTooLongTitle: 'Text too long',
    textTooLongDescription: 'The selected text is too long. Shorten it and try again.',
    sourceLabel: 'Source (auto-detect)',
    translationLabel: 'Translation',
    copy: 'Copy',
    copied: 'Copied',
    close: 'Close',
    contextMenu: 'JuiceWord Translate',
  },
  'zh-CN': {
    navModelConfig: '模型配置',
    navGeneral: '通用设置',
    navAbout: '关于 JuiceWord',
    modelConfigTitle: '模型配置',
    modelConfigDescription: '配置你的 AI 模型信息。',
    baseUrlExample: '例：http://127.0.0.1:8317/v1',
    show: '显示',
    hide: '隐藏',
    modelExample: '例：deepseek-chat, gpt-3.5-turbo, qwen-plus 等',
    targetLanguage: '默认目标语言',
    uiLanguage: '界面语言',
    save: '保存配置',
    saving: '保存中...',
    saved: '配置已保存',
    popupTagline: 'Turn words into meaning.',
    ready: '可以翻译',
    setupRequired: '需要配置',
    addModelSettings: '请先填写模型配置。',
    openOptions: '打开设置',
    loadingTitle: '正在翻译中...',
    loadingDescription: '请稍候',
    errorTitle: '翻译失败',
    retry: '重试',
    textTooLongTitle: '文本过长',
    textTooLongDescription: '当前文本字数过长，建议缩短后重试。',
    sourceLabel: '原文（自动检测语言）',
    translationLabel: '译文',
    copy: '复制',
    copied: '已复制',
    close: '关闭',
    contextMenu: 'JuiceWord 翻译',
  },
} satisfies Record<AppLocale, Record<string, string>>;

export type MessageKey = keyof typeof messages.en;

export function getMessages(locale: AppLocale): Record<MessageKey, string> {
  return messages[locale] ?? messages.en;
}
