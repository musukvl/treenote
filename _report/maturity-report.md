# TreeNote — Project Maturity Report

**Date:** 2026-03-03
**Version Scanned:** 1.0.0
**Total Source Code:** 2,159 lines across 19 TypeScript files

---

## Overall Score: 7.5 / 10 — Good

| Dimension              | Score  |
|------------------------|--------|
| Architecture           | 8 / 10 |
| Code Quality           | 8.5/10 |
| Test Coverage          | 6 / 10 |
| Documentation          | 7 / 10 |
| Build & Release        | 8 / 10 |
| Security               | 8.5/10 |
| Performance            | 7.5/10 |

---

## 1. Architecture

### Strengths
- Clean three-layer Electron split: `main` / `preload` / `renderer`.
- Event-driven architecture with a properly typed `Events.ts` emitter.
- Component base class (`Component.ts`) manages full lifecycle: init → render → update → unload.
- Resource cleanup (event refs, DOM listeners, timers, child components) is consistent and correct.
- Dependency injection through constructor parameters — no hidden singletons except `App`.

### Issues

| ID  | Severity | File | Line | Issue |
|-----|----------|------|------|-------|
| A-1 | Medium   | `src/renderer/views/TreeView.ts` | 1–387 | File is 387 lines; mixes drag-and-drop, keyboard nav, context menu, and inline rename into a single class. Should be split into focused sub-components or handlers. |
| A-2 | Low      | `src/renderer/core/App.ts` | 1–106 | Singleton `App` class holds all subsystem references. Fine at this scale, but will become a bottleneck if the app grows. Consider a service-locator or DI container. |

---

## 2. Code Quality

### Strengths
- Full TypeScript strict mode enabled in both `tsconfig.node.json` and `tsconfig.web.json`.
- ESLint enforces explicit return types, bans `any`, and warns on stray `console.*` calls.
- No `TODO` / `FIXME` / `HACK` comments found anywhere.
- All async operations are properly `await`ed or have error handlers.
- No bare `catch` blocks — all errors are logged and re-thrown or recovered from.
- No untyped `any` usage detected in source files.
- Memory management is explicit: `Component.unload()` cleans up all refs, intervals, and child components.

### Issues

| ID  | Severity | File | Line | Issue |
|-----|----------|------|------|-------|
| C-1 | High     | `src/main/menu.ts` | 81 | `const { dialog } = require('electron')` mixes CommonJS `require` with ES6 `import` used everywhere else in the file. Move to a top-level `import { dialog } from 'electron'`. |
| C-2 | Medium   | `src/renderer/views/TreeView.ts` | ~381 | Uses the browser's blocking `confirm()` for delete confirmation. This freezes the renderer process. Replace with a custom non-blocking modal. |
| C-3 | Low      | `src/main/ipc-handlers.ts` | 54 | String concatenation `'[Renderer] ' + String(args[0] ?? '')` — minor style inconsistency; prefer a template literal. |

---

## 3. Test Coverage

### Statistics

| Metric | Value |
|--------|-------|
| Test files | 7 |
| Test LOC | 897 |
| Source LOC (renderer only) | ~1,690 |
| Rough test-to-source ratio | ~53 % |

### Coverage by Component

| Component | Test File | Quality |
|-----------|-----------|---------|
| `Component.ts` | `Component.test.ts` (127 LOC) | Excellent — lifecycle, children, cleanup |
| `Events.ts` | `Events.test.ts` (97 LOC) | Excellent — all methods, edge cases |
| `debounce.ts` | `debounce.test.ts` (73 LOC) | Excellent — delay, reset, cancel |
| `dom.ts` | `dom.test.ts` (108 LOC) | Excellent — creation, attributes, extensions |
| `tree-utils.ts` | `tree-utils.test.ts` (135 LOC) | Excellent — all tree operations |
| `NoteNode.ts` | `NoteNode.test.ts` (89 LOC) | Excellent — generation, welcome data |
| `TreeView.ts` | `TreeView.test.ts` (268 LOC) | Good — drag-and-drop, keyboard, DOM events |

### Gaps

| ID  | Severity | Gap |
|-----|----------|-----|
| T-1 | High     | `Vault.ts` — the primary data persistence layer — has **no unit tests**. A bug here corrupts user data. |
| T-2 | High     | `EditorView.ts` and `SearchView.ts` have **no tests**. |
| T-3 | High     | Main process (`file-manager.ts`, `ipc-handlers.ts`) has **no tests**. File I/O errors can cause data loss. |
| T-4 | Medium   | E2E test directory (`tests/e2e/`) exists and Playwright is installed, but **zero tests are written**. |
| T-5 | Medium   | No integration tests covering multi-component workflows (e.g., create note → save → reload). |
| T-6 | Low      | `Workspace.ts`, `HotkeyManager.ts`, `Logger.ts` have no tests. |

---

## 4. Documentation

### Strengths
- `requirements.md` clearly describes the functional spec and compares to similar tools.
- `AGENTS.md` explains the build-script conventions for AI agents.
- TypeScript types serve as inline documentation across the codebase.
- JSDoc comments on key functions in `Component.ts` and `Vault.ts`.

### Gaps

| ID  | Severity | Gap |
|-----|----------|-----|
| D-1 | Medium   | No architecture overview diagram or document. Onboarding a new developer requires reading all files. |
| D-2 | Medium   | No `CHANGELOG.md` — no history of changes. |
| D-3 | Low      | IPC channel contract (`constants.ts`) has no documentation on data shapes passed over each channel. |
| D-4 | Low      | No contribution guide or `CONTRIBUTING.md`. |

---

## 5. Build & Release

### Strengths
- `electron-builder.yml` supports Windows (portable), macOS (DMG), and Linux (AppImage + DEB).
- Both Unix (`build.sh`) and PowerShell (`build.ps1`) build scripts exist.
- `__scripts/clean-build.ps1` provides a full clean-build workflow.
- All build tasks exposed as `npm run` scripts with clear names.

### Gaps

| ID  | Severity | Gap |
|-----|----------|-----|
| B-1 | High     | **No CI/CD pipeline** (no `.github/workflows/` or equivalent). Tests never run automatically on push. |
| B-2 | Medium   | Code signing is disabled on Windows (`scripts/skip-sign.cjs`). Releases will trigger SmartScreen warnings. |
| B-3 | Low      | No auto-update mechanism configured in `electron-builder.yml`. |

---

## 6. Security

### Strengths
- Electron security best practices followed: `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
- Renderer communicates with main only through the typed preload bridge.
- No user-supplied content is passed directly to shell or file-system APIs.
- No XSS vectors detected in DOM construction helpers (`dom.ts`).

### Issues

| ID  | Severity | File | Line | Issue |
|-----|----------|------|------|-------|
| S-1 | Medium   | `src/renderer/views/TreeView.ts` | ~381 | `window.confirm()` is a synchronous, blocking call. In Electron it can in some configurations be sandboxed away or behave unexpectedly. Replace with an async modal. |
| S-2 | Low      | `src/renderer/core/Logger.ts` | 45 | `typeof window !== 'undefined'` guard is correct but log content is sent directly to `window.api.log`. Validate that no sensitive data (e.g., file paths with usernames) is logged in non-debug builds. |

---

## 7. Performance

### Strengths
- Auto-save debounced at 2,000 ms — no excessive I/O on keystroke.
- Editor content updates debounced at 300 ms.
- Event listeners cleaned up on view unload — no ghost listeners accumulate.

### Issues

| ID  | Severity | Area | Issue |
|-----|----------|------|-------|
| P-1 | Medium   | `TreeView.ts` | All tree nodes are rendered as DOM elements on load. A vault with hundreds of notes will render all nodes at once, causing slow initial paint and sluggish scrolling. Implement virtual scrolling or lazy rendering. |
| P-2 | Low      | `Vault.ts` | `flattenTree()` is called repeatedly for operations that could be cached. For large trees, this traversal runs multiple times per user action. |
| P-3 | Low      | `SearchView.ts` | Full-tree flattening happens on every keystroke. For large vaults, add a debounce to the search input or pre-index note content. |

---

## 8. Prioritised Remediation Plan

### Immediate (before next release)

| Priority | ID  | Action |
|----------|-----|--------|
| 1 | C-1 | Fix `require('electron')` in `menu.ts` — replace with ES6 import |
| 2 | C-2 | Replace `window.confirm()` in `TreeView.ts` with a custom async modal |
| 3 | T-1 | Write unit tests for `Vault.ts` (create, update, delete, save/load cycle) |
| 4 | T-3 | Write unit tests for `file-manager.ts` (read, write, error cases) |

### Short-term (next sprint)

| Priority | ID  | Action |
|----------|-----|--------|
| 5 | B-1 | Set up a CI pipeline (GitHub Actions) running `npm run typecheck`, `npm run lint`, `npm test` on every push |
| 6 | T-2 | Add tests for `EditorView.ts` and `SearchView.ts` |
| 7 | T-4 | Write at least 3 Playwright E2E tests: launch, create note, search |
| 8 | A-1 | Refactor `TreeView.ts` — extract drag-and-drop logic into a `DragHandler` class |

### Medium-term

| Priority | ID  | Action |
|----------|-----|--------|
| 9  | P-1 | Implement virtual list rendering in `TreeView.ts` for large vaults |
| 10 | D-1 | Write an architecture overview document (one diagram + one page) |
| 11 | B-2 | Set up code signing for Windows releases |
| 12 | P-3 | Debounce search input or pre-index note content in `SearchView.ts` |

---

## 9. File-level Quick Reference

| File | LOC | Quality | Notes |
|------|-----|---------|-------|
| `src/main/index.ts` | 65 | Excellent | Clean Electron bootstrap |
| `src/main/constants.ts` | 14 | Excellent | — |
| `src/main/file-manager.ts` | 71 | Excellent | No tests |
| `src/main/ipc-handlers.ts` | 60 | Good | Minor style issue (C-3) |
| `src/main/logger.ts` | 34 | Excellent | — |
| `src/main/menu.ts` | 96 | Good | Fix import style (C-1) |
| `src/preload/index.ts` | 28 | Excellent | Uses `satisfies`, well-typed |
| `src/renderer/core/App.ts` | 106 | Good | Singleton pattern, fine at scale |
| `src/renderer/core/Component.ts` | 156 | Excellent | Lifecycle base class, fully tested |
| `src/renderer/core/Events.ts` | 76 | Excellent | Typed event emitter, fully tested |
| `src/renderer/core/HotkeyManager.ts` | 78 | Good | No tests |
| `src/renderer/core/Logger.ts` | 49 | Good | No tests |
| `src/renderer/core/Vault.ts` | 181 | Excellent | **No tests** — highest risk |
| `src/renderer/core/View.ts` | 59 | Excellent | Abstract base, well-structured |
| `src/renderer/core/Workspace.ts` | 111 | Good | No tests |
| `src/renderer/views/TreeView.ts` | 387 | Good | Largest file, blocking confirm (C-2) |
| `src/renderer/views/EditorView.ts` | 115 | Good | No tests |
| `src/renderer/views/SearchView.ts` | 140 | Good | No tests, no search debounce |
| `src/renderer/views/StatusBar.ts` | 65 | Excellent | Clean |
| `src/renderer/models/NoteNode.ts` | 77 | Excellent | Fully tested |
| `src/renderer/helpers/debounce.ts` | 26 | Excellent | Fully tested |
| `src/renderer/helpers/dom.ts` | 75 | Excellent | Fully tested |
| `src/renderer/helpers/tree-utils.ts` | 71 | Excellent | Fully tested |

---

*Generated by Claude Code — treenote-obs maturity scan — 2026-03-03*
