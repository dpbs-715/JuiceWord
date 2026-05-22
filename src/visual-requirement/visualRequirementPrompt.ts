import type { SelectedElementContext } from './visualRequirementTypes';

const PAGE_TITLE_LIMIT = 120;

export function buildVisualRequirementPrompt(context: SelectedElementContext, intent: string): string {
  return [
    'You are helping write an actionable UI change task for an AI coding agent.',
    'Return Markdown only. Do not include source code unless it is a short illustrative snippet.',
    'Do not infer from or request full DOM HTML; use only the selected element summary and visual context below.',
    '',
    '## Selected Element',
    `- Page title: ${formatPageTitle(context.page.title)}`,
    `- Page URL: ${formatPageUrl(context.page.url)}`,
    `- Element: ${context.element.tagName}${context.element.role ? ` role="${context.element.role}"` : ''}`,
    `- Text: ${context.element.textContent || '(no visible text)'}`,
    `- Selector hint: ${context.element.selector || '(unavailable)'}`,
    `- Size: ${context.element.boundingRect.width} x ${context.element.boundingRect.height}`,
    '',
    '## Parent Context',
    ...formatParentContext(context),
    '',
    '## Current Styles',
    `- display: ${context.styles.display}`,
    `- color: ${context.styles.color}`,
    `- backgroundColor: ${context.styles.backgroundColor}`,
    `- fontSize: ${context.styles.fontSize}`,
    `- fontWeight: ${context.styles.fontWeight}`,
    `- lineHeight: ${context.styles.lineHeight}`,
    `- border: ${context.styles.border}`,
    `- borderRadius: ${context.styles.borderRadius}`,
    `- padding: ${context.styles.padding}`,
    `- margin: ${context.styles.margin}`,
    `- boxShadow: ${context.styles.boxShadow}`,
    '',
    '## User Intent',
    intent.trim(),
    '',
    '## Output Requirements',
    '- Write a concrete UI change task that can be pasted into Codex, Cursor, Claude Code, or ChatGPT.',
    '- Use Markdown only.',
    '- Include target, visual context, desired change, constraints, and suggested implementation direction.',
    '- State that behavior and layout structure should be preserved unless the intent explicitly asks otherwise.',
    '- Mention accessibility contrast when colors or transparency are involved.',
    '- Keep the task implementation-oriented and avoid asking for more page DOM HTML.',
  ].join('\n');
}

function formatPageTitle(title: string): string {
  const normalizedTitle = title.replace(/\s+/g, ' ').trim();

  if (!normalizedTitle) {
    return '(untitled)';
  }

  if (normalizedTitle.length <= PAGE_TITLE_LIMIT) {
    return normalizedTitle;
  }

  return `${normalizedTitle.slice(0, PAGE_TITLE_LIMIT)}...`;
}

function formatPageUrl(url: string): string {
  if (!url) {
    return '(unavailable)';
  }

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch {
    return stripUrlPrivateParts(url);
  }
}

function stripUrlPrivateParts(url: string): string {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const privatePartIndexes = [queryIndex, hashIndex].filter((index) => index >= 0);

  if (privatePartIndexes.length === 0) {
    return url;
  }

  return url.slice(0, Math.min(...privatePartIndexes));
}

function formatParentContext(context: SelectedElementContext): string[] {
  if (context.parentChain.length === 0) {
    return ['- No parent summary captured.'];
  }

  return context.parentChain.map((parent, index) => {
    const text = parent.textContent || '(no visible text)';
    return `- Parent ${index + 1}: ${parent.tagName} | ${parent.selector || '(unavailable)'} | ${text}`;
  });
}
