# JuiceWord Agent Guide

## Project Intent

JuiceWord v1 is a WXT browser extension for selection-based translation. Keep the implementation small, typed, and aligned with the domain structure in `juiceword-local-v1-plan.md`.

## Development Flow

1. Read `juiceword-local-v1-plan.md` before starting a feature.
2. Work on one planned feature slice at a time.
3. Use `pnpm` for package installation and project scripts.
4. Keep entrypoints limited to bootstrapping.
5. Put behavior in the matching `src/` domain folder.
6. Run the relevant build, type check, or focused verification before calling a feature complete.
7. After a feature is complete and verified, update `juiceword-local-v1-plan.md` by changing the matching checkbox from `[ ]` to `[x]`.
8. Do not mark acceptance criteria complete until the behavior has been verified.

## Architecture Boundaries

- `entrypoints`: mount apps only.
- `src/app`: orchestration and flow control.
- `src/selection`: selected text reading only.
- `src/floating`: native floating UI only.
- `src/messaging`: content/background communication only.
- `src/translator`: translation logic only.
- `src/providers`: OpenAI-compatible protocol only.
- `src/config`: config schema and service only.
- `src/storage`: storage abstraction only.
- `src/shared`: cross-domain utilities only.

## UI Rules

- Popup and Options use React.
- Content-script floating UI is native TypeScript, not React.
- Match the provided JuiceWord visual design: warm juice theme, clean cards, clear states, and compact controls.
- Keep UI states explicit: loading, success, error, and text too long.

## Local Planning Files

- Files matching `juiceword-local-*.md` are local planning notes.
- These files are intentionally ignored by Git.
- Keep progress updates in `juiceword-local-v1-plan.md` even though it is local-only.

## Completion Rule

A feature is only done when:

- The implementation is in the correct domain folder.
- The relevant behavior has been verified.
- The matching progress checkbox in `juiceword-local-v1-plan.md` has been checked.
