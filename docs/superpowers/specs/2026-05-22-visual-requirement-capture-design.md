# Visual Requirement Capture Design

## Purpose

JuiceWord will add a new popup-driven mode called "视觉需求采集". The feature lets a user click a page element, describe how they want it changed, and generate a Markdown UI change request that can be given to Codex, Cursor, Claude Code, or ChatGPT.

The feature is not a CSS editor and does not modify the target page or source code directly. Its job is to collect visual context and user intent, then ask the configured model to turn that context into an actionable UI modification task.

## V1 Scope

Included:

- Popup entry for "视觉需求采集".
- Page element hover highlighting and click capture.
- Element context collection from DOM, layout, computed styles, and short parent context.
- Chrome Side Panel experience using the Focused Writer layout.
- User intent input.
- Model-backed Markdown task generation using existing OpenAI-compatible configuration.
- Loading, success, error, retry, and copy states.
- Clear unavailable states for unsupported pages, missing content script access, and missing model configuration.

Deferred:

- Template fallback when model generation fails.
- Screenshot capture.
- Multi-element selection.
- Source file or component path detection.
- Direct CSS editing or live page modification.
- Persistent history of generated tasks.
- Importing reference images or external design examples.

## Product Flow

1. User opens the JuiceWord popup.
2. User clicks the "视觉需求采集" entry.
3. JuiceWord injects or contacts the content script on the active tab.
4. The page enters visual requirement selection mode.
5. Hovering a valid element shows a JuiceWord-highlighted target outline.
6. Clicking a valid element captures its context, exits selection mode, and opens the Side Panel.
7. The Side Panel shows the selected element summary and a collapsible technical detail section.
8. User writes a short modification intent.
9. User clicks generate.
10. Background service calls the configured model and returns Markdown.
11. Side Panel shows the generated task with copy and retry controls.

Esc exits selection mode without opening the Side Panel.

## Architecture

The feature should live in an independent domain directory:

```text
src/visual-requirement/
```

This keeps it separate from `src/element-translate/`, which remains responsible only for click-to-translate behavior.

Recommended files:

- `visualRequirementController.ts`: content-script controller for enabling selection mode, hover highlight, click capture, and Esc exit.
- `elementContextReader.ts`: reads the selected element context from the page.
- `elementSelector.ts`: builds a readable selector for the selected element.
- `visualRequirementPrompt.ts`: builds the model prompt for task generation.
- `visualRequirementTypes.ts`: owns feature-specific public types and state models.
- `visualRequirementConstants.ts`: owns feature-specific limits, style ids, message labels, and class names when needed.

Extension entrypoints:

- `entrypoints/popup/App.tsx`: adds the popup entry and unavailable/error feedback.
- `entrypoints/sidepanel/`: new React Side Panel page for Focused Writer.

Application orchestration:

- `src/app/contentApp.ts`: mounts a `VisualRequirementController` next to the existing floating and element-translate controllers.
- `src/app/backgroundApp.ts`: continues to mount background routing and owns Side Panel opening through browser APIs where required.
- `src/messaging/`: adds typed messages for mode activation, context handoff, context loading, and generation.

## Data Model

The selected element context should stay small and explicit:

```ts
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
    boundingRect: {
      width: number;
      height: number;
      top: number;
      left: number;
    };
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
```

Selector is a page-location hint, not a promise that JuiceWord can map the element back to source code.

The Side Panel state should be a tagged union:

```ts
export type VisualRequirementPanelState =
  | { status: 'empty' }
  | { status: 'ready'; context: SelectedElementContext }
  | { status: 'generating'; context: SelectedElementContext; intent: string }
  | { status: 'success'; context: SelectedElementContext; intent: string; markdown: string }
  | { status: 'error'; context: SelectedElementContext; intent: string; error: string };
```

Use this union instead of scattered booleans so each UI state has one clear shape.

## Messaging

Add typed message contracts for these flows:

- Popup to content: enable or disable visual requirement capture mode.
- Content to background: store the latest selected element context.
- Side Panel to background: read the latest selected element context.
- Side Panel to background: generate a visual requirement Markdown task from context and intent.

The background script is the short-lived state bridge for the latest captured context. It should not persist this context in `chrome.storage.local` for V1, because selected page content may contain private information and the task only needs the latest capture.

## Side Panel UI

Use the Focused Writer layout:

- Header: "视觉需求采集".
- Empty state: ask the user to start from the popup and select a page element.
- Selected element summary: human-readable compact line such as `button · 保存 · 120x40 · yellow background · 8px radius`.
- Details disclosure: selector, page URL, parent chain, and key computed styles.
- Intent textarea: user's natural-language change request.
- Generate button: disabled when there is no context, no intent, or no configured model.
- Result area: Markdown output with copy action.
- Error area: readable error text and retry action.

Do not expose every CSS property by default. The default view should help non-specialists describe intent, while the details view lets power users verify context.

## Prompt Shape

The model request should ask for a Markdown UI change task, not CSS code only.

The generated task should include:

- Target element summary.
- Visual context and current styles.
- User modification intent.
- Constraints: do not change behavior, avoid layout regressions, preserve accessibility contrast, and adapt to the existing project style.
- Implementation direction: recommended CSS or component-level changes when appropriate.

The prompt should avoid sending full DOM HTML. Send the selected element summary, parent summaries, key styles, and the user intent.

## Error Handling

Popup errors:

- Unsupported active page.
- Content script injection failure.
- Active tab unavailable.

Selection mode:

- Esc exits mode.
- Invalid elements are ignored.
- Browser or extension pages are not selectable.

Side Panel errors:

- No selected context: show empty state.
- Model profile incomplete: disable generation and link or point to Options.
- Generation failure: preserve context and intent, show error, allow retry.

V1 intentionally does not generate a template fallback after model failure.

## Verification

Automated checks:

- `pnpm typecheck`
- `pnpm build`

Manual checks:

- Popup can enter visual requirement capture mode on ordinary `http` and `https` pages.
- Popup shows unavailable feedback on restricted pages.
- Hover highlights valid visible elements.
- Esc exits capture mode.
- Clicking a valid element exits capture mode and opens the Side Panel.
- Side Panel shows summary and expandable details for the selected element.
- Missing or incomplete model config disables generation with a clear message.
- Configured model can generate Markdown from user intent.
- Generation failure shows error and supports retry.
- Copy action copies the generated Markdown.
- Existing selection translation still works.
- Existing element translation mode still works.

## Planning Update

Add a new phase to `juiceword-local-v1-plan.md`:

```text
Phase 11: Visual Requirement Capture
```

Only mark implementation and acceptance checkboxes after the behavior has been verified. Keep the local plan as the source of truth for progress, even though it is ignored by Git.
