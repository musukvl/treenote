# TreeNote Current Architecture

Date: 2026-05-30

This document describes the current TreeNote architecture as implemented in the repository. It focuses on runtime boundaries, resource relationships, data flow, and technical patterns that shape future code quality work.

## System Overview

TreeNote is an Electron desktop application for editing a hierarchical notes tree stored in a single YAML file. The app follows the standard Electron split:

- Main process: owns the Electron app lifecycle, window creation, native menu, dialogs, file system access, and IPC handlers.
- Preload process: exposes a narrow, context-isolated API from Electron IPC to the renderer.
- Renderer process: owns application state, view composition, note editing, tree interaction, search, hotkeys, and save orchestration.

The UI is built with TypeScript and direct DOM APIs instead of a component framework. The internal renderer architecture mirrors selected Obsidian concepts: `App`, `Component`, `Vault`, `Workspace`, `View`, and `Events`.

## Top-Level Resource Map

| Resource                        | Purpose                                                                            | Related resources                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                  | Defines npm scripts, dependencies, package metadata, and the Electron entry point. | Drives `electron-vite`, `electron-builder`, Vitest, ESLint, Prettier, TypeScript.                                                             |
| `electron.vite.config.ts`       | Defines separate build inputs for main, preload, and renderer bundles.             | Uses `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`.                                                                  |
| `electron-builder.yml`          | Defines platform packaging outputs and Electron fuses.                             | Consumes `out/**/*`, `resources/icon.ico`, `resources/icon.icns`, `resources/installer/path-env.nsh`; expects `resources/icon.png` for Linux. |
| `build.sh`                      | Generic from-scratch app build.                                                    | Runs `npm ci` and `npm run build`.                                                                                                            |
| `build-win.sh`, `build-win.bat` | Windows packaging scripts.                                                         | Run Electron build and Windows `electron-builder` packaging.                                                                                  |
| `release-mac.sh`                | Local macOS release automation.                                                    | Uses GitHub CLI, `npm`, `electron-builder`, `dist`, and sibling Homebrew tap repository.                                                      |
| `__scripts/release-mac.sh`      | Compatibility wrapper.                                                             | Delegates to root `release-mac.sh`.                                                                                                           |
| `.github/workflows/release.yml` | GitHub Actions release workflow for Windows assets.                                | Runs on version tags, packages Windows artifacts, uploads release assets.                                                                     |
| `src/main`                      | Electron main process implementation.                                              | Talks to Electron APIs, filesystem, YAML serialization, native menu, and preload IPC channels.                                                |
| `src/preload`                   | Secure renderer bridge.                                                            | Maps `window.api` methods to IPC channels registered in main.                                                                                 |
| `src/renderer`                  | Application shell, state, views, styles, and helpers.                              | Consumes `window.api`, maintains `TreeData`, renders the UI, triggers saves.                                                                  |
| `tests/unit`                    | Unit tests grouped by module area.                                                 | Covers helpers, model factories, renderer core, views, main file manager, and IPC handlers.                                                   |
| `docs/treenote.png`             | README screenshot.                                                                 | Documentation asset only.                                                                                                                     |
| `resources`                     | Packaging resources.                                                               | Icons and Windows NSIS PATH installer include.                                                                                                |
| `scripts`                       | Packaging support scripts.                                                         | CommonJS helper scripts for electron-builder behavior.                                                                                        |

## Build And Packaging Relationships

The build chain starts from `package.json` scripts. `npm run build` invokes `electron-vite build`, which builds three outputs:

- Main bundle from `src/main/index.ts` into `out/main`.
- Preload bundle from `src/preload/index.ts` into `out/preload`.
- Renderer bundle from `src/renderer/index.html` into `out/renderer`.

Packaging is handled by `electron-builder.yml`. The builder packages files from `out/**/*` and adds platform resources from `resources`. Windows packaging creates NSIS and portable targets. macOS packaging creates a DMG. Linux packaging is configured for AppImage and deb. Packaged binaries flip Electron fuses (`runAsNode` off, ASAR integrity on, `onlyLoadAppFromAsar` on) via `electronFuses`.

The root `build.sh` script installs dependencies and builds the application, but does not package an installer. `build-win.sh` installs dependencies, builds, and packages Windows artifacts. The local `release-mac.sh` script performs a fuller release flow: version update, dependency install, build, DMG packaging, GitHub release creation, tag sync, and Homebrew cask update.

## Runtime Startup Flow

1. Electron starts `src/main/index.ts`.
2. `app.whenReady()` calls `createWindow()`.
3. `createWindow()` creates a `BrowserWindow` with `sandbox: true`, `contextIsolation: true`, and `nodeIntegration: false`.
4. The main process resolves the data file path from supported CLI arguments or defaults to `notes.yaml` next to the executable.
5. `FileManager.ensureFileExists()` creates the target directory and file if needed.
6. `registerIpcHandlers(fileManager, mainWindow)` connects IPC channels to file, dialog, version, path, and logging operations.
7. `buildMenu(mainWindow)` creates the native menu and sends menu action strings to the renderer.
8. The renderer is loaded from the Vite dev server in development or from `out/renderer/index.html` in production.
9. `src/renderer/main.ts` installs DOM helper extensions, creates `App`, and calls `app.load()`.
10. `App.onload()` loads vault data, registers hotkeys, and subscribes to native menu actions.

## Main Process Components

| Component                       | Responsibility                                                         | Key relationships                                                                                |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/main/index.ts`             | Electron app lifecycle, window creation, startup data path resolution. | Creates `BrowserWindow`; creates `FileManager`; registers IPC; builds menu.                      |
| `src/main/navigation-guards.ts` | Deny unexpected navigation and `window.open`.                          | Registered on `web-contents-created` before windows open.                                        |
| `src/main/file-manager.ts`      | YAML persistence and atomic writes.                                    | Reads and writes the selected data file; converts YAML on disk to JSON over IPC; uses `js-yaml`. |
| `src/main/ipc-handlers.ts`      | IPC endpoint registration with sender and payload validation.          | Bridges preload requests to `FileManager`, Electron dialogs, `app.getVersion()`, and logger.     |
| `src/main/ipc-security.ts`      | Trusted IPC sender origin checks.                                      | Used by IPC handlers before privileged work.                                                     |
| `src/main/menu.ts`              | Native menu definition.                                                | Sends renderer actions over `menu:action`.                                                       |
| `src/main/constants.ts`         | IPC channel names and default data file name.                          | Imported by main modules.                                                                        |
| `src/main/logger.ts`            | Main process stdout/stderr logging.                                    | Receives renderer log messages over IPC.                                                         |

## Preload Boundary

`src/preload/index.ts` exposes `window.api` through `contextBridge.exposeInMainWorld`. The renderer does not receive raw `ipcRenderer`.

| `window.api` method      | IPC channel   | Main handler                                                       | Renderer usage                                           |
| ------------------------ | ------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `loadFile()`             | `file:load`   | `FileManager.read()`                                               | Used by `Vault.loadData()`.                              |
| `saveFile(content)`      | `file:save`   | `FileManager.write(content)`                                       | Used by `Vault.save()`.                                  |
| `showSaveDialog()`       | `dialog:save` | Electron `dialog.showSaveDialog()` and `FileManager.setFilePath()` | Exposed but not currently consumed by renderer app code. |
| `showOpenDialog()`       | `dialog:open` | Electron `dialog.showOpenDialog()` and `FileManager.setFilePath()` | Exposed but not currently consumed by renderer app code. |
| `getFilePath()`          | `file:path`   | `FileManager.getFilePath()`                                        | Used by `StatusBar` after a successful save.             |
| `getAppVersion()`        | `app:version` | `app.getVersion()`                                                 | Exposed but not currently consumed by renderer app code. |
| `log(level, ...args)`    | `log:write`   | `logger` methods                                                   | Used by renderer `Logger`.                               |
| `onMenuAction(callback)` | `menu:action` | Sent by native menu                                                | Used by `App.registerMenuActions()`.                     |

## Renderer Core Components

| Component              | Responsibility                                   | Key relationships                                                                                   |
| ---------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/renderer/main.ts` | Renderer entry point.                            | Installs DOM extensions and loads `App`.                                                            |
| `App`                  | Root service container and orchestrator.         | Owns `Events`, `Logger`, `Vault`, `HotkeyManager`, and `Workspace`.                                 |
| `Component`            | Lifecycle base class.                            | Tracks child components, cleanup callbacks, event refs, DOM events, and intervals.                  |
| `Events`               | Typed application event bus.                     | Used by `Vault`, views, `Workspace`, and `StatusBar` to coordinate state changes.                   |
| `Vault`                | In-memory note tree and persistence coordinator. | Calls `window.api.loadFile()` and `window.api.saveFile()`; emits note, tree, data, and save events. |
| `Workspace`            | Fixed layout manager and view registry.          | Creates `SearchView`, `TreeView`, `EditorView`, and `StatusBar`; tracks active view.                |
| `HotkeyManager`        | Keyboard shortcut dispatch.                      | Reads active view from `Workspace`; invokes workspace and vault actions.                            |
| `Logger`               | Renderer logger.                                 | Logs to console and forwards to main via `window.api.log()`.                                        |
| `View`                 | Base class for view panels.                      | Creates outer and inner DOM containers; defines `onOpen()`, `onClose()`, and focus contract.        |

## Renderer Views And Controllers

| Resource                  | Responsibility                                                                                                             | Related resources                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `TreeView`                | Tree panel rendering, selection, expand/collapse, keyboard navigation, inline rename, context menu, create/delete actions. | Reads and mutates `Vault`; emits `active-note-change`; uses `TreeDragDropController` and `DeleteConfirmationModal`.                |
| `TreeDragDropController`  | Drag-and-drop move and reorder behavior for tree items.                                                                    | Calls `Vault.isDescendant()`, `Vault.findNode()`, and `Vault.moveNote()`.                                                          |
| `DeleteConfirmationModal` | Lightweight promise-based delete confirmation UI.                                                                          | Used by `TreeView.deleteSelectedNote()`.                                                                                           |
| `EditorView`              | Title input and content textarea for the active note.                                                                      | Listens to `active-note-change`, `note-renamed`, `note-deleted`; calls `Vault.renameNote()` and debounced `Vault.updateContent()`. |
| `SearchView`              | Case-insensitive search by note title and content.                                                                         | Uses `flattenTree()` and `Vault.root`; emits `search-results`; selects notes through `Workspace.treeView`.                         |
| `StatusBar`               | Save state and note count display.                                                                                         | Listens to `save-status-change`, `tree-changed`, and `data-loaded`; calls `window.api.getFilePath()`.                              |

## Data Model And Persistence

The persisted document is a single YAML file containing `TreeData`:

- `metadata.version`: data format version string.
- `metadata.createdAt`: file creation timestamp.
- `metadata.updatedAt`: last saved timestamp.
- `root`: root `NoteNode`.

Each `NoteNode` contains:

- `id`: generated UUID-like identifier.
- `name`: note title.
- `content`: note body text.
- `children`: ordered child notes.
- `parentId`: parent node id or `null` for root.
- `createdAt` and `updatedAt`: timestamps.
- `isExpanded`: tree UI expansion state.

Important relationships:

- The tree uses both nested `children` arrays and `parentId` back references.
- `Vault` owns the in-memory `TreeData`.
- Tree mutations happen through `Vault` CRUD and move methods.
- `FileManager` owns conversion between YAML on disk and JSON strings over IPC.
- `Vault` serializes the whole tree to JSON and sends it through `window.api.saveFile()`.
- `FileManager.write()` parses JSON, dumps YAML, writes to a temporary file, and renames it over the target file.

There is currently no explicit schema validator, migration layer, or normalized note index.

## Primary Interaction Flows

Startup and load:

1. Main process resolves the data file and ensures it exists.
2. Renderer `App` loads.
3. `Vault.loadData()` invokes `window.api.loadFile()`.
4. `FileManager.read()` returns a JSON string converted from YAML, or `null` if missing.
5. `Vault` parses the data or creates welcome data, then emits `data-loaded`.
6. `TreeView` renders the tree and `StatusBar` updates note count.

Create note:

1. Native menu, hotkey, or context menu invokes `Workspace.createNote()` or `Workspace.createChildNote()`.
2. `TreeView` chooses the parent id based on selection.
3. `Vault.createNote()` mutates the tree, marks the vault dirty, emits `note-created`, and emits `tree-changed`.
4. `TreeView` re-renders and selects the new note.
5. `Vault` saves after the auto-save debounce.

Edit note:

1. `TreeView.selectNode()` emits `active-note-change`.
2. `EditorView` loads the selected note into title and content controls.
3. Title edits call `Vault.renameNote()` immediately.
4. Content edits call `Vault.updateContent()` through a 300 ms debounce.
5. `Vault.markDirty()` emits save status and schedules a 2 second debounced save.

Delete note:

1. `TreeView.deleteSelectedNote()` asks `DeleteConfirmationModal` for confirmation.
2. On confirm, `Vault.deleteNote()` removes the subtree and emits `note-deleted` and `tree-changed`.
3. `TreeView` clears selection and emits `active-note-change` with `null`.

Drag and drop:

1. `TreeView` registers each rendered tree item with `TreeDragDropController`.
2. Drag state is kept in the controller.
3. The controller prevents dropping a node onto itself or into its descendant.
4. On drop, the controller calls `Vault.moveNote()` with a new parent and optional order index.
5. `Vault.moveNote()` removes and reinserts the node, updates `parentId`, marks dirty, emits `note-moved`, and emits `tree-changed`.

Search:

1. `SearchView` lowercases the query.
2. It flattens the current tree with `flattenTree()`.
3. It filters non-root nodes by lowercased title or content.
4. It renders result rows with content snippets when content matches.
5. Clicking or pressing Enter selects the note in `TreeView` and focuses the editor.

Save:

1. `Vault.markDirty()` emits `save-status-change: unsaved`.
2. A 2 second debounce calls `Vault.save()`.
3. `Vault.save()` updates metadata, stringifies the whole tree, and calls `window.api.saveFile()`.
4. Main `FileManager.write()` serializes YAML and atomically renames a temp file over the current data file.
5. `Vault` emits `save-status-change: saved` and `data-saved`.
6. `StatusBar` asks main for the current file path and displays it.

Native menu and hotkeys:

1. Native menu items send string actions over `menu:action`.
2. `App.registerMenuActions()` maps action strings to workspace or vault methods.
3. `HotkeyManager` listens to document `keydown` and dispatches configured shortcuts.
4. Context-sensitive hotkeys can check `Workspace.getActiveViewType()`.

## Technical Patterns In Use

| Pattern                                  | Where it appears                                           | Notes                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Obsidian-inspired application shell      | `App`, `Component`, `Vault`, `Workspace`, `View`, `Events` | Gives the renderer a plugin-like lifecycle vocabulary without a framework.                   |
| Component lifecycle and cleanup registry | `Component`                                                | Children, cleanup callbacks, event refs, DOM listeners, and intervals are tracked centrally. |
| Event bus coordination                   | `Events`, `Vault`, views, `StatusBar`                      | Decouples state changes from view updates, but event names still need governance.            |
| Narrow preload bridge                    | `src/preload/index.ts`                                     | Keeps renderer away from raw Electron and Node APIs.                                         |
| Whole-document persistence               | `Vault` and `FileManager`                                  | Simple and reliable for small vaults; future large files may need indexing or chunking.      |
| YAML on disk, JSON over IPC              | `FileManager`, `Vault`                                     | Keeps file format human-readable and IPC payload simple.                                     |
| Atomic file replacement                  | `FileManager.write()`                                      | Writes a temp file and renames it over the target.                                           |
| Debounced state updates                  | `EditorView`, `Vault`                                      | Content updates are debounced at 300 ms; saves are debounced at 2 seconds.                   |
| Direct DOM rendering                     | Views and `helpers/dom.ts`                                 | No virtual DOM; views manually create and replace DOM nodes.                                 |
| Prototype DOM extensions                 | `installDomExtensions()`                                   | Adds `empty`, `addClass`, `removeClass`, and `toggleClass` to `HTMLElement`.                 |
| Recursive tree utilities                 | `tree-utils.ts`                                            | Tree lookup, removal, insertion, flattening, path, and descendant count use recursion.       |
| View-specific CSS modules                | `src/renderer/styles/*.css`                                | Styles are organized by UI area and composed through `styles/index.css`.                     |
| Unit tests with jsdom                    | `tests/unit`                                               | View and helper behavior is tested without launching Electron.                               |

## Performance Characteristics

The current design prioritizes simplicity:

- Tree rendering re-renders the visible tree after most structural changes.
- Search flattens and scans the whole tree on each input event.
- Tree operations use recursive traversal.
- Saves serialize the whole data tree.
- Drag-and-drop uses current DOM node maps rather than a separate view model.

These choices are appropriate for a small desktop notes app. For larger vaults, likely pressure points are search, recursive traversal depth, full-document serialization, and full tree re-rendering.

## Security And Platform Notes

The Electron window uses a secure baseline: sandboxing is enabled, context isolation is enabled, and Node integration is disabled. The preload bridge exposes only application-specific methods.

The remaining security boundary to mature is IPC input validation. The renderer can send arbitrary strings to `file:save` and arbitrary log levels and values to `log:write`; the main process currently trusts those payloads. File open/save dialog paths also become the active `FileManager` path without a data schema check.

Cross-platform packaging is present for Windows, macOS, and Linux. Current resource dependencies are platform-specific: Windows uses `resources/icon.ico`, macOS uses `resources/icon.icns`, and Linux is configured to use `resources/icon.png`.

## Test Architecture

Vitest is configured with jsdom and includes unit tests under `tests/unit/**/*.test.ts`.

Current coverage areas:

- DOM helpers.
- Tree utilities.
- Debounce helper.
- `NoteNode` model factories.
- `Component` lifecycle behavior.
- `Events` emitter behavior.
- `Vault.moveNote()` ordering.
- `EditorView`, `SearchView`, and `TreeView` interactions.
- Main `FileManager`.
- Main IPC handler registration and routing.

The tests do not currently launch a packaged Electron app, exercise the preload bridge in a real BrowserWindow, verify release scripts, or run end-to-end user flows.

## Architectural Pressure Points

- IPC handlers are registered per window creation even though Electron IPC handlers are process-global.
- Renderer state and persistence are tightly coupled to the global `window.api`.
- File data is cast to `TreeData` without validation or migration.
- The tree stores both nested child structure and parent ids, so consistency must be preserved on every mutation.
- Some exposed preload methods are not connected to visible UI flows.
- Direct DOM rendering keeps dependencies low but increases the need for lifecycle cleanup discipline.
- Current search and rendering paths are linear in the number of notes and will need optimization before very large vaults.
