# JuiceWord

JuiceWord is a browser extension for selection-based translation. It lets users select text on a web page, trigger translation from the context menu, and view the result in a lightweight floating panel.

## Status

JuiceWord is currently in v1 development planning.

## V1 Focus

- Selection-based translation only.
- OpenAI-compatible API support.
- Native content-script floating UI.
- React-based popup and options pages.
- Local configuration through `chrome.storage.local`.

## Tech Stack

- WXT
- TypeScript
- React
- Chrome extension APIs
- OpenAI-compatible `/chat/completions` protocol

## Development Notes

- Use `pnpm` for dependency management and project scripts.
- Project workflow and agent rules are documented in `AGENTS.md`.
- Local development planning is tracked in `juiceword-local-v1-plan.md`.
- Local planning files use the `juiceword-local-*.md` prefix and are intentionally ignored by Git.
