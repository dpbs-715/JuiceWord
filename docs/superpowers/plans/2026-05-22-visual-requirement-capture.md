# Visual Requirement Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JuiceWord's "视觉需求采集" mode so users can select a page element, describe a desired UI change, and generate a Markdown UI change task in the Chrome Side Panel.

**Architecture:** Add a new `src/visual-requirement/` domain instead of extending `src/element-translate/`. Content script owns element selection and context capture, background owns latest-context state and model generation, and the Side Panel owns the Focused Writer UI.

**Tech Stack:** WXT, Manifest V3, TypeScript, React 19, Chrome extension `sidePanel`, existing OpenAI-compatible provider and config service.

---

## File Structure

- Create `src/visual-requirement/visualRequirementTypes.ts`: selected element context, panel state, request/response types.
- Create `src/visual-requirement/visualRequirementConstants.ts`: DOM ids, class names, mode labels, style allow-list, text limits.
- Create `src/visual-requirement/elementSelector.ts`: readable selector builder for captured elements and parent chain.
- Create `src/visual-requirement/elementContextReader.ts`: DOM, geometry, computed style, page, and parent-context collection.
- Create `src/visual-requirement/visualRequirementPrompt.ts`: prompt builder for Markdown UI change tasks.
- Create `src/visual-requirement/visualRequirementService.ts`: background-side latest context store and model generation service.
- Create `src/visual-requirement/visualRequirementController.ts`: content-side hover/click/Esc selection mode.
- Create `entrypoints/sidepanel/index.html`, `entrypoints/sidepanel/main.tsx`, `entrypoints/sidepanel/App.tsx`, `entrypoints/sidepanel/style.css`: Focused Writer Side Panel UI.
- Modify `wxt.config.ts`: add `sidePanel` permission and default side panel path.
- Modify `src/messaging/messageTypes.ts`: add visual requirement message contracts and response unions.
- Modify `src/messaging/messageClient.ts`: add popup and side panel client helpers.
- Modify `src/messaging/messageRouter.ts`: route visual requirement context and generation messages.
- Modify `src/app/contentApp.ts`: mount `VisualRequirementController` and route activation message.
- Modify `entrypoints/popup/App.tsx` and `entrypoints/popup/style.css`: add popup entry and unavailable feedback.
- Modify `juiceword-local-v1-plan.md`: add Phase 11 and update checkboxes only after verification.

---

### Task 1: Types, Constants, Selector, And Context Reader

**Files:**
- Create: `src/visual-requirement/visualRequirementTypes.ts`
- Create: `src/visual-requirement/visualRequirementConstants.ts`
- Create: `src/visual-requirement/elementSelector.ts`
- Create: `src/visual-requirement/elementContextReader.ts`

- [ ] **Step 1: Create feature types**

Create `src/visual-requirement/visualRequirementTypes.ts`:

```ts
export interface ElementBoundingRect {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface SelectedElementContext {
  id: string;
  capturedAt: number;
  page: {
    title: string;
    url: string;
  };
  element: {
    tagName: string;
    role: string;
    textContent: string;
    selector: string;
    boundingRect: ElementBoundingRect;
  };
  parentChain: Array<{
    tagName: string;
    selector: string;
    textContent: string;
  }>;
  styles: {
    display: string;
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    border: string;
    borderRadius: string;
    padding: string;
    margin: string;
    boxShadow: string;
  };
}

export interface VisualRequirementGenerateRequest {
  context: SelectedElementContext;
  intent: string;
}

export interface VisualRequirementGenerateResult {
  markdown: string;
  modelProfileId: string;
  modelProfileName: string;
}

export type VisualRequirementPanelState =
  | { status: 'empty' }
  | { status: 'ready'; context: SelectedElementContext }
  | { status: 'generating'; context: SelectedElementContext; intent: string }
  | { status: 'success'; context: SelectedElementContext; intent: string; markdown: string }
  | { status: 'error'; context: SelectedElementContext; intent: string; error: string };
```

- [ ] **Step 2: Create constants**

Create `src/visual-requirement/visualRequirementConstants.ts`:

```ts
export const VISUAL_REQUIREMENT_STYLE_ID = 'juiceword-visual-requirement-style';
export const VISUAL_REQUIREMENT_OVERLAY_CLASS = 'juiceword-visual-requirement-overlay';
export const VISUAL_REQUIREMENT_MODE_CLASS = 'juiceword-visual-requirement-mode';
export const VISUAL_REQUIREMENT_STATUS_CLASS = 'juiceword-visual-requirement-status';
export const VISUAL_REQUIREMENT_TARGET_CLASS = 'juiceword-visual-requirement-target';

export const VISUAL_REQUIREMENT_TEXT_LIMIT = 300;
export const VISUAL_REQUIREMENT_PARENT_DEPTH = 2;
export const VISUAL_REQUIREMENT_INTENT_LIMIT = 1200;

export const VISUAL_REQUIREMENT_BLOCKED_SELECTOR = [
  'audio',
  'canvas',
  'iframe',
  'input',
  'noscript',
  'script',
  'select',
  'style',
  'svg',
  'textarea',
  'video',
].join(',');
```

- [ ] **Step 3: Create selector builder**

Create `src/visual-requirement/elementSelector.ts`:

```ts
const SELECTOR_PART_LIMIT = 4;

export function buildElementSelector(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body && current !== document.documentElement) {
    parts.unshift(buildSelectorPart(current));

    if (current.id) {
      break;
    }

    current = current.parentElement;

    if (parts.length >= SELECTOR_PART_LIMIT) {
      break;
    }
  }

  return parts.join(' > ');
}

function buildSelectorPart(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();

  if (element.id) {
    return `${tagName}#${CSS.escape(element.id)}`;
  }

  const classNames = Array.from(element.classList)
    .filter((className) => !className.startsWith('juiceword-'))
    .slice(0, 2)
    .map((className) => `.${CSS.escape(className)}`)
    .join('');

  const nth = getNthOfType(element);
  return `${tagName}${classNames}${nth}`;
}

function getNthOfType(element: HTMLElement): string {
  const parent = element.parentElement;

  if (!parent) {
    return '';
  }

  const siblings = Array.from(parent.children).filter(
    (child) => child instanceof HTMLElement && child.tagName === element.tagName,
  );

  if (siblings.length <= 1) {
    return '';
  }

  return `:nth-of-type(${siblings.indexOf(element) + 1})`;
}
```

- [ ] **Step 4: Create context reader**

Create `src/visual-requirement/elementContextReader.ts`:

```ts
import {
  VISUAL_REQUIREMENT_PARENT_DEPTH,
  VISUAL_REQUIREMENT_TEXT_LIMIT,
} from './visualRequirementConstants';
import { buildElementSelector } from './elementSelector';
import type { SelectedElementContext } from './visualRequirementTypes';

export function readSelectedElementContext(element: HTMLElement): SelectedElementContext {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return {
    id: crypto.randomUUID(),
    capturedAt: Date.now(),
    page: {
      title: document.title,
      url: window.location.href,
    },
    element: {
      tagName: element.tagName.toLowerCase(),
      role: element.getAttribute('role') ?? '',
      textContent: getReadableText(element),
      selector: buildElementSelector(element),
      boundingRect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      },
    },
    parentChain: readParentChain(element),
    styles: {
      display: style.display,
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      border: style.border,
      borderRadius: style.borderRadius,
      padding: style.padding,
      margin: style.margin,
      boxShadow: style.boxShadow,
    },
  };
}

function readParentChain(element: HTMLElement): SelectedElementContext['parentChain'] {
  const parents: SelectedElementContext['parentChain'] = [];
  let current = element.parentElement;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement &&
    parents.length < VISUAL_REQUIREMENT_PARENT_DEPTH
  ) {
    parents.push({
      tagName: current.tagName.toLowerCase(),
      selector: buildElementSelector(current),
      textContent: getReadableText(current),
    });
    current = current.parentElement;
  }

  return parents;
}

function getReadableText(element: HTMLElement): string {
  const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();

  if (text.length <= VISUAL_REQUIREMENT_TEXT_LIMIT) {
    return text;
  }

  return `${text.slice(0, VISUAL_REQUIREMENT_TEXT_LIMIT)}...`;
}
```

- [ ] **Step 5: Run type check**

Run: `pnpm typecheck`

Expected: PASS. If it fails because `CSS.escape` is unavailable in TypeScript libs, replace calls with a small local `escapeSelectorValue(value: string): string` wrapper that returns `CSS.escape(value)` when available and `value.replace(/["\\]/g, '\\$&')` otherwise.

- [ ] **Step 6: Commit**

```bash
git add src/visual-requirement/visualRequirementTypes.ts src/visual-requirement/visualRequirementConstants.ts src/visual-requirement/elementSelector.ts src/visual-requirement/elementContextReader.ts
git commit -m "feat: add visual requirement context reader"
```

---

### Task 2: Prompt Builder And Background Service

**Files:**
- Create: `src/visual-requirement/visualRequirementPrompt.ts`
- Create: `src/visual-requirement/visualRequirementService.ts`
- Modify: `src/visual-requirement/visualRequirementTypes.ts`

- [ ] **Step 1: Extend types with service responses**

Update `src/visual-requirement/visualRequirementTypes.ts` with:

```ts
export type VisualRequirementContextResponse =
  | { ok: true; context: SelectedElementContext }
  | { ok: false; error: string };

export type VisualRequirementGenerateResponse =
  | { ok: true; result: VisualRequirementGenerateResult }
  | { ok: false; error: string };
```

- [ ] **Step 2: Create prompt builder**

Create `src/visual-requirement/visualRequirementPrompt.ts`:

```ts
import type { SelectedElementContext } from './visualRequirementTypes';

export function buildVisualRequirementPrompt(context: SelectedElementContext, intent: string): string {
  return [
    'You are helping write an actionable UI change request for an AI coding agent.',
    'Return Markdown only. Do not include source code unless it is a short illustrative snippet.',
    '',
    '## Selected Element',
    `- Page title: ${context.page.title || '(untitled)'}`,
    `- Page URL: ${context.page.url}`,
    `- Element: ${context.element.tagName}${context.element.role ? ` role="${context.element.role}"` : ''}`,
    `- Text: ${context.element.textContent || '(no visible text)'}`,
    `- Selector hint: ${context.element.selector}`,
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
    '- Include target, visual context, desired change, constraints, and suggested implementation direction.',
    '- State that behavior and layout structure should be preserved unless the intent explicitly asks otherwise.',
    '- Mention accessibility contrast when colors or transparency are involved.',
  ].join('\n');
}

function formatParentContext(context: SelectedElementContext): string[] {
  if (context.parentChain.length === 0) {
    return ['- No parent summary captured.'];
  }

  return context.parentChain.map((parent, index) => {
    const text = parent.textContent || '(no visible text)';
    return `- Parent ${index + 1}: ${parent.tagName} · ${parent.selector} · ${text}`;
  });
}
```

- [ ] **Step 3: Create background service**

Create `src/visual-requirement/visualRequirementService.ts`:

```ts
import { configService } from '../config/configService';
import type { ExtensionConfig, ModelProfile } from '../config/configTypes';
import { createTranslationProvider } from '../providers/providerFactory';
import { getErrorMessage } from '../shared/errors';
import { VISUAL_REQUIREMENT_INTENT_LIMIT } from './visualRequirementConstants';
import { buildVisualRequirementPrompt } from './visualRequirementPrompt';
import type {
  SelectedElementContext,
  VisualRequirementGenerateResult,
} from './visualRequirementTypes';

let latestContext: SelectedElementContext | null = null;

export const visualRequirementService = {
  setLatestContext(context: SelectedElementContext): SelectedElementContext {
    latestContext = context;
    return context;
  },

  getLatestContext(): SelectedElementContext {
    if (!latestContext) {
      throw new Error('No selected element context found. Start visual requirement capture from the popup first.');
    }

    return latestContext;
  },

  async generateTask(
    context: SelectedElementContext,
    intent: string,
  ): Promise<VisualRequirementGenerateResult> {
    const trimmedIntent = intent.trim();

    if (!trimmedIntent) {
      throw new Error('Describe what you want to change before generating.');
    }

    if (trimmedIntent.length > VISUAL_REQUIREMENT_INTENT_LIMIT) {
      throw new Error(`Intent is too long. Keep it under ${VISUAL_REQUIREMENT_INTENT_LIMIT} characters.`);
    }

    const config = await configService.getConfig();
    const profile = getVisualRequirementProfile(config);
    validateProfile(profile);

    const provider = createTranslationProvider();
    const response = await provider.translate({
      config: {
        ...config,
        activeModelProfileId: profile.id,
        baseUrl: profile.baseUrl,
        apiKey: profile.apiKey,
        model: profile.model,
      },
      prompt: buildVisualRequirementPrompt(context, trimmedIntent),
    });

    return {
      markdown: response.text,
      modelProfileId: profile.id,
      modelProfileName: profile.name,
    };
  },
};

function getVisualRequirementProfile(config: ExtensionConfig): ModelProfile {
  return (
    config.modelProfiles.find((profile) => profile.id === config.activeModelProfileId) ??
    config.modelProfiles.find((profile) => profile.id === config.comparisonModelProfileIds[0]) ??
    config.modelProfiles[0]
  );
}

function validateProfile(profile: ModelProfile | undefined): asserts profile is ModelProfile {
  if (!profile || !profile.baseUrl || !profile.apiKey || !profile.model) {
    throw new Error('Model profile is incomplete. Configure a model in Options first.');
  }
}

export function toVisualRequirementError(error: unknown): string {
  return getErrorMessage(error);
}
```

- [ ] **Step 4: Run type check**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/visual-requirement/visualRequirementTypes.ts src/visual-requirement/visualRequirementPrompt.ts src/visual-requirement/visualRequirementService.ts
git commit -m "feat: add visual requirement generation service"
```

---

### Task 3: Messaging Contracts And Background Routing

**Files:**
- Modify: `src/messaging/messageTypes.ts`
- Modify: `src/messaging/messageClient.ts`
- Modify: `src/messaging/messageRouter.ts`

- [ ] **Step 1: Add message constants and interfaces**

Update `src/messaging/messageTypes.ts` imports:

```ts
import type {
  SelectedElementContext,
  VisualRequirementGenerateRequest,
  VisualRequirementGenerateResponse,
  VisualRequirementContextResponse,
} from '../visual-requirement/visualRequirementTypes';
```

Add constants:

```ts
export const CONTENT_SET_VISUAL_REQUIREMENT_MODE = 'JUICEWORD_CONTENT_SET_VISUAL_REQUIREMENT_MODE';
export const BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT = 'JUICEWORD_BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT';
export const BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT = 'JUICEWORD_BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT';
export const BACKGROUND_GENERATE_VISUAL_REQUIREMENT = 'JUICEWORD_BACKGROUND_GENERATE_VISUAL_REQUIREMENT';
```

Add interfaces:

```ts
export interface ContentSetVisualRequirementModeMessage {
  type: typeof CONTENT_SET_VISUAL_REQUIREMENT_MODE;
  payload: {
    enabled: boolean;
  };
}

export interface BackgroundSetVisualRequirementContextMessage {
  type: typeof BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT;
  payload: {
    context: SelectedElementContext;
  };
}

export interface BackgroundGetVisualRequirementContextMessage {
  type: typeof BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT;
}

export interface BackgroundGenerateVisualRequirementMessage {
  type: typeof BACKGROUND_GENERATE_VISUAL_REQUIREMENT;
  payload: VisualRequirementGenerateRequest;
}
```

Extend `JuiceWordMessage` with all four new interfaces, and export:

```ts
export type VisualRequirementModeResponse =
  | { ok: true; enabled: boolean }
  | { ok: false; error: string };

export type {
  VisualRequirementContextResponse,
  VisualRequirementGenerateResponse,
};
```

- [ ] **Step 2: Add client helpers**

Update `src/messaging/messageClient.ts` imports to include the new constants, message interfaces, and response types.

Add these helpers:

```ts
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
```

Add a private sender:

```ts
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

    return { ok: false, error: 'The active tab did not respond.' };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to contact the active tab.',
    };
  }
}

function isModeResponse(value: unknown): value is VisualRequirementModeResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof (value as { ok: unknown }).ok === 'boolean'
  );
}
```

Rename `getValidElementTranslateTabId` to `getValidInjectableTabId` and update existing element-translate callers to use it. Keep `injectContentScript` returning `ElementTranslateModeResponse | VisualRequirementModeResponse` if TypeScript requires a shared response shape.

- [ ] **Step 3: Route background messages**

Update `src/messaging/messageRouter.ts` imports:

```ts
import { visualRequirementService, toVisualRequirementError } from '../visual-requirement/visualRequirementService';
import {
  BACKGROUND_GENERATE_VISUAL_REQUIREMENT,
  BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT,
  BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT,
  // existing imports
} from './messageTypes';
```

Add routing before the final `return undefined`:

```ts
if (message.type === BACKGROUND_SET_VISUAL_REQUIREMENT_CONTEXT) {
  try {
    const context = visualRequirementService.setLatestContext(message.payload.context);
    sendResponse({ ok: true, context });
  } catch (error: unknown) {
    sendResponse({ ok: false, error: toVisualRequirementError(error) });
  }

  return undefined;
}

if (message.type === BACKGROUND_GET_VISUAL_REQUIREMENT_CONTEXT) {
  try {
    sendResponse({ ok: true, context: visualRequirementService.getLatestContext() });
  } catch (error: unknown) {
    sendResponse({ ok: false, error: toVisualRequirementError(error) });
  }

  return undefined;
}

if (message.type === BACKGROUND_GENERATE_VISUAL_REQUIREMENT) {
  void visualRequirementService
    .generateTask(message.payload.context, message.payload.intent)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error: unknown) => sendResponse({ ok: false, error: toVisualRequirementError(error) }));

  return true;
}
```

- [ ] **Step 4: Run type check**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/messaging/messageTypes.ts src/messaging/messageClient.ts src/messaging/messageRouter.ts
git commit -m "feat: add visual requirement messaging"
```

---

### Task 4: Content Selection Controller

**Files:**
- Create: `src/visual-requirement/visualRequirementController.ts`
- Modify: `src/app/contentApp.ts`

- [ ] **Step 1: Create content controller**

Create `src/visual-requirement/visualRequirementController.ts`:

```ts
import { setLatestVisualRequirementContext } from '../messaging/messageClient';
import {
  VISUAL_REQUIREMENT_BLOCKED_SELECTOR,
  VISUAL_REQUIREMENT_MODE_CLASS,
  VISUAL_REQUIREMENT_OVERLAY_CLASS,
  VISUAL_REQUIREMENT_STATUS_CLASS,
  VISUAL_REQUIREMENT_STYLE_ID,
} from './visualRequirementConstants';
import { readSelectedElementContext } from './elementContextReader';

export class VisualRequirementController {
  private enabled = false;
  private hoveredElement: HTMLElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private status: HTMLDivElement | null = null;

  setEnabled(enabled: boolean): boolean {
    if (enabled === this.enabled) {
      return this.enabled;
    }

    this.enabled = enabled;

    if (enabled) {
      this.mount();
    } else {
      this.unmount();
    }

    return this.enabled;
  }

  private mount(): void {
    injectVisualRequirementStyles();
    this.overlay = document.createElement('div');
    this.overlay.className = VISUAL_REQUIREMENT_OVERLAY_CLASS;
    this.status = document.createElement('div');
    this.status.className = VISUAL_REQUIREMENT_STATUS_CLASS;
    this.status.textContent = 'JuiceWord 视觉需求采集 · Esc 退出';
    document.documentElement.classList.add(VISUAL_REQUIREMENT_MODE_CLASS);
    document.documentElement.append(this.overlay, this.status);

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleViewportChange, true);
    window.addEventListener('resize', this.handleViewportChange);
  }

  private unmount(): void {
    document.documentElement.classList.remove(VISUAL_REQUIREMENT_MODE_CLASS);
    this.hoveredElement = null;
    this.overlay?.remove();
    this.status?.remove();
    this.overlay = null;
    this.status = null;

    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('scroll', this.handleViewportChange, true);
    window.removeEventListener('resize', this.handleViewportChange);
  }

  private readonly handleMouseMove = (event: MouseEvent): void => {
    const element = findVisualRequirementElement(event.target);

    if (element === this.hoveredElement) {
      return;
    }

    this.hoveredElement = element;
    this.syncOverlay();
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const element = findVisualRequirementElement(event.target);

    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const context = readSelectedElementContext(element);
    void setLatestVisualRequirementContext(context).finally(() => {
      this.setEnabled(false);
    });
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    this.setEnabled(false);
  };

  private readonly handleViewportChange = (): void => {
    this.syncOverlay();
  };

  private syncOverlay(): void {
    if (!this.overlay || !this.hoveredElement) {
      this.hideOverlay();
      return;
    }

    const rect = this.hoveredElement.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      this.hideOverlay();
      return;
    }

    this.overlay.style.display = 'block';
    this.overlay.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
  }

  private hideOverlay(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }
}

function findVisualRequirementElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (target.closest(`.${VISUAL_REQUIREMENT_OVERLAY_CLASS}`) || target.closest(VISUAL_REQUIREMENT_BLOCKED_SELECTOR)) {
    return null;
  }

  let element: HTMLElement | null = target;

  while (element && element !== document.body && element !== document.documentElement) {
    if (isSelectableElement(element)) {
      return element;
    }

    element = element.parentElement;
  }

  return null;
}

function isSelectableElement(element: HTMLElement): boolean {
  if (element.isContentEditable || element.closest('[contenteditable="true"]')) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width >= 12 &&
    rect.height >= 8 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    Number(style.opacity) > 0
  );
}

function injectVisualRequirementStyles(): void {
  const existingStyle = document.getElementById(VISUAL_REQUIREMENT_STYLE_ID);
  const style = existingStyle ?? document.createElement('style');
  style.id = VISUAL_REQUIREMENT_STYLE_ID;
  style.textContent = `
    html.${VISUAL_REQUIREMENT_MODE_CLASS}, html.${VISUAL_REQUIREMENT_MODE_CLASS} * {
      cursor: crosshair !important;
    }

    .${VISUAL_REQUIREMENT_OVERLAY_CLASS} {
      position: fixed;
      z-index: 2147483647;
      display: none;
      pointer-events: none;
      border: 2px solid rgba(255, 184, 0, 0.96);
      border-radius: 8px;
      background: rgba(255, 184, 0, 0.14);
      box-shadow:
        inset 0 0 0 9999px rgba(255, 184, 0, 0.08),
        0 0 0 3px rgba(255, 184, 0, 0.24),
        0 10px 26px rgba(154, 101, 0, 0.18);
      transition: width 120ms ease, height 120ms ease, transform 120ms ease;
    }

    .${VISUAL_REQUIREMENT_STATUS_CLASS} {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 2147483647;
      padding: 9px 11px;
      border: 1px solid rgba(255, 184, 0, 0.46);
      border-radius: 8px;
      background: rgba(18, 26, 43, 0.92);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
      color: #ffcf32;
      font: 800 12px/1.2 "Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif;
      pointer-events: none;
    }
  `;

  if (!existingStyle) {
    document.documentElement.append(style);
  }
}
```

- [ ] **Step 2: Mount controller in content app**

Update `src/app/contentApp.ts` imports:

```ts
import { VisualRequirementController } from '../visual-requirement/visualRequirementController';
import {
  CONTENT_SET_ELEMENT_TRANSLATE_MODE,
  CONTENT_SET_VISUAL_REQUIREMENT_MODE,
  CONTENT_TRANSLATE_SELECTION,
  type JuiceWordMessage,
} from '../messaging/messageTypes';
```

Update version:

```ts
const CONTENT_APP_VERSION = 'visual-requirement-v1';
```

Create controller:

```ts
const visualRequirement = new VisualRequirementController();
```

Add message branch before translation branch:

```ts
if (message.type === CONTENT_SET_VISUAL_REQUIREMENT_MODE) {
  const enabled = visualRequirement.setEnabled(message.payload.enabled);
  if (enabled) {
    elementTranslate.setEnabled(false);
  }
  sendResponse({ ok: true, enabled });
  return undefined;
}
```

Also update the existing element translate branch so enabling element translate disables visual requirement:

```ts
if (message.type === CONTENT_SET_ELEMENT_TRANSLATE_MODE) {
  const enabled = elementTranslate.setEnabled(message.payload.enabled);
  if (enabled) {
    visualRequirement.setEnabled(false);
  }
  sendResponse({ ok: true, enabled });
  return undefined;
}
```

- [ ] **Step 3: Run type check**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/visual-requirement/visualRequirementController.ts src/app/contentApp.ts
git commit -m "feat: add visual requirement selection mode"
```

---

### Task 5: Side Panel Entry And UI

**Files:**
- Create: `entrypoints/sidepanel/index.html`
- Create: `entrypoints/sidepanel/main.tsx`
- Create: `entrypoints/sidepanel/App.tsx`
- Create: `entrypoints/sidepanel/style.css`
- Modify: `wxt.config.ts`

- [ ] **Step 1: Add manifest side panel support**

Update `wxt.config.ts` permissions:

```ts
permissions: ['contextMenus', 'storage', 'activeTab', 'scripting', 'sidePanel'],
```

Add default side panel config inside `manifest`:

```ts
side_panel: {
  default_path: 'sidepanel.html',
},
```

- [ ] **Step 2: Create side panel HTML entry**

Create `entrypoints/sidepanel/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JuiceWord 视觉需求采集</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create side panel React mount**

Create `entrypoints/sidepanel/main.tsx`:

```ts
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Create side panel app**

Create `entrypoints/sidepanel/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { configService } from '../../src/config/configService';
import type { ExtensionConfig } from '../../src/config/configTypes';
import {
  generateVisualRequirement,
  getLatestVisualRequirementContext,
} from '../../src/messaging/messageClient';
import type {
  SelectedElementContext,
  VisualRequirementPanelState,
} from '../../src/visual-requirement/visualRequirementTypes';

export default function App() {
  const [state, setState] = useState<VisualRequirementPanelState>({ status: 'empty' });
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [intent, setIntent] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void configService.getConfig().then(setConfig);
    void getLatestVisualRequirementContext().then((response) => {
      if (response.ok) {
        setState({ status: 'ready', context: response.context });
      }
    });
  }, []);

  const context = 'context' in state ? state.context : null;
  const activeProfile = useMemo(
    () => config?.modelProfiles.find((profile) => profile.id === config.activeModelProfileId),
    [config],
  );
  const canGenerate = Boolean(context && intent.trim() && activeProfile?.baseUrl && activeProfile.apiKey && activeProfile.model);

  async function handleGenerate() {
    if (!context) {
      return;
    }

    const nextIntent = intent.trim();
    setState({ status: 'generating', context, intent: nextIntent });
    const response = await generateVisualRequirement({ context, intent: nextIntent });

    if (!response.ok) {
      setState({ status: 'error', context, intent: nextIntent, error: response.error });
      return;
    }

    setState({ status: 'success', context, intent: nextIntent, markdown: response.result.markdown });
  }

  async function handleCopy(markdown: string) {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="jw-sidepanel">
      <header className="jw-sidepanel__header">
        <img src="/assets/juiceword/logo-drop.svg" alt="" />
        <div>
          <h1>视觉需求采集</h1>
          <p>点选页面元素，生成给代码代理的 UI 修改任务。</p>
        </div>
      </header>

      {context ? (
        <ElementSummary context={context} />
      ) : (
        <section className="jw-sidepanel__empty">
          <strong>还没有选中元素</strong>
          <span>从 JuiceWord 弹窗进入视觉需求采集，然后点击页面上的目标元素。</span>
        </section>
      )}

      <section className="jw-sidepanel__editor">
        <label htmlFor="visual-requirement-intent">我想怎么改</label>
        <textarea
          id="visual-requirement-intent"
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          placeholder="例如：这个按钮想更通透，更像黄色液体，但不要影响布局。"
          rows={5}
        />
        {!activeProfile || !activeProfile.baseUrl || !activeProfile.apiKey || !activeProfile.model ? (
          <button type="button" className="jw-sidepanel__link" onClick={() => browser.runtime.openOptionsPage()}>
            先去 Options 配置模型
          </button>
        ) : null}
        <button
          className="jw-sidepanel__primary"
          type="button"
          disabled={!canGenerate || state.status === 'generating'}
          onClick={() => void handleGenerate()}
        >
          {state.status === 'generating' ? '生成中...' : '生成任务'}
        </button>
      </section>

      {state.status === 'error' ? (
        <section className="jw-sidepanel__error">
          <strong>生成失败</strong>
          <p>{state.error}</p>
          <button type="button" onClick={() => void handleGenerate()}>
            重试
          </button>
        </section>
      ) : null}

      {state.status === 'success' ? (
        <section className="jw-sidepanel__result">
          <div>
            <strong>生成结果</strong>
            <button type="button" onClick={() => void handleCopy(state.markdown)}>
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre>{state.markdown}</pre>
        </section>
      ) : null}
    </main>
  );
}

function ElementSummary({ context }: { context: SelectedElementContext }) {
  return (
    <section className="jw-sidepanel__summary">
      <span>选中元素</span>
      <strong>{formatSummary(context)}</strong>
      <details>
        <summary>查看上下文详情</summary>
        <dl>
          <dt>Selector</dt>
          <dd>{context.element.selector}</dd>
          <dt>Page</dt>
          <dd>{context.page.url}</dd>
          <dt>Styles</dt>
          <dd>{formatStyles(context)}</dd>
          <dt>Parent</dt>
          <dd>{context.parentChain.map((parent) => parent.selector).join(' / ') || '无'}</dd>
        </dl>
      </details>
    </section>
  );
}

function formatSummary(context: SelectedElementContext): string {
  const text = context.element.textContent ? ` · ${context.element.textContent}` : '';
  return `${context.element.tagName}${text} · ${context.element.boundingRect.width}x${context.element.boundingRect.height}`;
}

function formatStyles(context: SelectedElementContext): string {
  return [
    `color ${context.styles.color}`,
    `background ${context.styles.backgroundColor}`,
    `radius ${context.styles.borderRadius}`,
    `font ${context.styles.fontSize}/${context.styles.fontWeight}`,
  ].join(' · ');
}
```

- [ ] **Step 5: Create side panel styles**

Create `entrypoints/sidepanel/style.css`:

```css
:root {
  color: #172033;
  background: #fff9ec;
  font-family: Inter, "Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
textarea {
  font: inherit;
}

.jw-sidepanel {
  min-height: 100vh;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 246, 217, 0.92), rgba(255, 255, 255, 0.96));
}

.jw-sidepanel__header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 18px;
}

.jw-sidepanel__header img {
  width: 34px;
  height: 34px;
}

.jw-sidepanel__header h1 {
  margin: 0;
  font-size: 18px;
}

.jw-sidepanel__header p,
.jw-sidepanel__empty span {
  margin: 2px 0 0;
  color: #6b5b35;
  font-size: 12px;
  line-height: 1.45;
}

.jw-sidepanel__empty,
.jw-sidepanel__summary,
.jw-sidepanel__editor,
.jw-sidepanel__error,
.jw-sidepanel__result {
  margin-bottom: 14px;
  padding: 13px;
  border: 1px solid rgba(255, 184, 0, 0.26);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 28px rgba(154, 101, 0, 0.08);
}

.jw-sidepanel__summary span,
.jw-sidepanel__editor label {
  display: block;
  margin-bottom: 7px;
  color: #9a6500;
  font-size: 12px;
  font-weight: 800;
}

.jw-sidepanel__summary strong,
.jw-sidepanel__empty strong {
  display: block;
  font-size: 14px;
  line-height: 1.4;
}

.jw-sidepanel__summary details {
  margin-top: 10px;
}

.jw-sidepanel__summary summary {
  cursor: pointer;
  color: #8a5a00;
  font-size: 12px;
  font-weight: 700;
}

.jw-sidepanel__summary dl {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.45;
}

.jw-sidepanel__summary dt {
  color: #9a6500;
  font-weight: 800;
}

.jw-sidepanel__summary dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.jw-sidepanel__editor textarea {
  width: 100%;
  resize: vertical;
  min-height: 118px;
  padding: 10px;
  border: 1px solid rgba(154, 101, 0, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: #172033;
  line-height: 1.5;
  outline: none;
}

.jw-sidepanel__editor textarea:focus {
  border-color: rgba(255, 184, 0, 0.8);
  box-shadow: 0 0 0 3px rgba(255, 184, 0, 0.18);
}

.jw-sidepanel__primary,
.jw-sidepanel__link,
.jw-sidepanel__error button,
.jw-sidepanel__result button {
  min-height: 36px;
  margin-top: 10px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 800;
}

.jw-sidepanel__primary {
  width: 100%;
  background: linear-gradient(135deg, #ffb800, #ffcf32);
  color: #172033;
}

.jw-sidepanel__primary:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.jw-sidepanel__link {
  width: 100%;
  background: rgba(255, 184, 0, 0.12);
  color: #8a5a00;
}

.jw-sidepanel__error {
  border-color: rgba(180, 83, 9, 0.34);
  color: #92400e;
}

.jw-sidepanel__error p {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.45;
}

.jw-sidepanel__error button,
.jw-sidepanel__result button {
  padding: 0 12px;
  background: #172033;
  color: white;
}

.jw-sidepanel__result > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.jw-sidepanel__result pre {
  max-height: 48vh;
  margin: 10px 0 0;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.55;
}
```

- [ ] **Step 6: Run type check and build**

Run: `pnpm typecheck`

Expected: PASS.

Run: `pnpm build`

Expected: PASS and `.output/chrome-mv3/manifest.json` contains `side_panel`.

- [ ] **Step 7: Commit**

```bash
git add wxt.config.ts entrypoints/sidepanel/index.html entrypoints/sidepanel/main.tsx entrypoints/sidepanel/App.tsx entrypoints/sidepanel/style.css
git commit -m "feat: add visual requirement side panel"
```

---

### Task 6: Popup Entry And Side Panel Opening

**Files:**
- Modify: `entrypoints/popup/App.tsx`
- Modify: `entrypoints/popup/style.css`
- Modify: `src/messaging/messageClient.ts`

- [ ] **Step 1: Add side panel opening to visual requirement activation**

Update `setVisualRequirementModeForActiveTab` in `src/messaging/messageClient.ts` so after a successful mode response it opens the side panel:

```ts
const response = await sendVisualRequirementModeMessage(tabId, enabled);

if (response.ok && enabled && browser.sidePanel?.open) {
  await browser.sidePanel.open({ tabId });
}

return response;
```

If TypeScript complains about `browser.sidePanel`, add a local helper:

```ts
async function openSidePanel(tabId: number): Promise<void> {
  const extensionBrowser = browser as typeof browser & {
    sidePanel?: {
      open(options: { tabId: number }): Promise<void>;
    };
  };

  await extensionBrowser.sidePanel?.open({ tabId });
}
```

Then call `await openSidePanel(tabId)`.

- [ ] **Step 2: Wire popup state and handler**

Update `entrypoints/popup/App.tsx` imports:

```ts
import {
  canUseElementTranslateOnActiveTab,
  canUseVisualRequirementOnActiveTab,
  setElementTranslateModeForActiveTab,
  setVisualRequirementModeForActiveTab,
} from '../../src/messaging/messageClient';
```

Add state:

```ts
const [visualRequirementError, setVisualRequirementError] = useState('');
const [canUseVisualRequirement, setCanUseVisualRequirement] = useState(false);
```

Update `useEffect`:

```ts
void canUseVisualRequirementOnActiveTab().then(setCanUseVisualRequirement);
```

Add handler:

```ts
async function handleEnableVisualRequirementMode() {
  setVisualRequirementError('');
  const response = await setVisualRequirementModeForActiveTab(true);

  if (!response?.ok) {
    setVisualRequirementError(response?.error || '当前页面无法使用视觉需求采集。');
    return;
  }

  window.close();
}
```

Render the entry near the element translate block:

```tsx
<div className="jw-popup__visual-requirement">
  {canUseVisualRequirement ? (
    <button type="button" onClick={() => void handleEnableVisualRequirementMode()}>
      视觉需求采集
    </button>
  ) : null}
  {visualRequirementError ? <p>{visualRequirementError}</p> : null}
</div>
```

- [ ] **Step 3: Style popup entry**

Update `entrypoints/popup/style.css` by sharing styles with the existing element translate block. If the existing selector is `.jw-popup__element-translate`, extend it:

```css
.jw-popup__element-translate,
.jw-popup__visual-requirement {
  display: grid;
  gap: 8px;
}
```

Add button style:

```css
.jw-popup__visual-requirement button {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #172033, #2d3a52);
  color: #ffcf32;
  cursor: pointer;
  font-weight: 800;
}

.jw-popup__visual-requirement p {
  margin: 0;
  color: #b45309;
  font-size: 12px;
  line-height: 1.4;
}
```

- [ ] **Step 4: Run type check and build**

Run: `pnpm typecheck`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/messaging/messageClient.ts entrypoints/popup/App.tsx entrypoints/popup/style.css
git commit -m "feat: add visual requirement popup entry"
```

---

### Task 7: Manual Verification And Local Plan Update

**Files:**
- Modify: `juiceword-local-v1-plan.md`

- [ ] **Step 1: Run full automated verification**

Run: `pnpm typecheck`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 2: Load extension and manually verify V1 behavior**

Load `.output/chrome-mv3` as an unpacked extension in Chrome.

Verify:

- Popup shows "视觉需求采集" on ordinary `http` and `https` pages.
- Restricted pages do not show the entry or show an unavailable error.
- Clicking "视觉需求采集" closes popup, opens Side Panel, and starts page selection mode.
- Hover highlights visible ordinary elements.
- Esc exits selection mode.
- Clicking a visible element captures context and exits selection mode.
- Side Panel shows the selected element summary.
- Details disclosure shows selector, URL, parent chain, and styles.
- With incomplete model config, generate is disabled and Options link works.
- With valid model config, entering intent and clicking generate returns Markdown.
- A failed model request shows an error and retry button.
- Copy button copies generated Markdown.
- Existing context-menu selection translation still works.
- Existing click element translation still works.

- [ ] **Step 3: Add Phase 11 to local plan**

Update `juiceword-local-v1-plan.md`:

```md
### Phase 11: Visual Requirement Capture

- [x] Add popup entry for visual requirement capture.
- [x] Add content-script hover and click capture mode.
- [x] Capture selected element DOM, style, geometry, and parent context.
- [x] Add Side Panel Focused Writer UI.
- [x] Generate Markdown UI change tasks with the configured model.
- [x] Add loading, success, error, retry, and copy states.

Acceptance:

- [x] Popup can enter visual requirement capture mode on ordinary pages.
- [x] Esc exits capture mode.
- [x] Hover states identify visible selectable DOM elements.
- [x] Clicking a valid element opens Side Panel and shows captured context.
- [x] Incomplete model configuration shows a clear disabled state.
- [x] Configured model can generate a Markdown UI change task.
- [x] Generation errors preserve context and intent and allow retry.
- [x] Existing selection translation still works.
- [x] Existing element translation still works.
- [x] Build and type check pass.
```

If any manual item was not verified, leave its checkbox unchecked and add a short note under that acceptance item.

- [ ] **Step 4: Commit tracked completion docs if applicable**

Do not commit `juiceword-local-v1-plan.md` because it is intentionally ignored. If implementation touched no tracked docs in this task, commit only code changes from previous tasks. If a tracked verification note is added, commit it:

```bash
git status --short
```

Expected: `juiceword-local-v1-plan.md` may appear ignored, and no implementation files should be unstaged.

---

## Self-Review

- Spec coverage: popup entry, selection mode, context capture, Side Panel, model generation, error states, copy/retry, verification, and local plan update are all mapped to tasks.
- Placeholder scan: no `TBD`, `TODO`, "similar to", or unspecified "add tests" steps remain.
- Type consistency: `SelectedElementContext`, `VisualRequirementPanelState`, `VisualRequirementGenerateRequest`, and response union names are introduced before use and reused consistently.
