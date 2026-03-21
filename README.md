# TreeNote

TreeNote is an Electron-based desktop notes app that organizes notes in a parent-child tree.

## Features

- Hierarchical notes (create, rename, delete, reorder, move by drag-and-drop)
- Split layout: tree, editor, and search views
- Search by note title and content (case-insensitive)
- Keyboard shortcuts and menu actions for common workflows
- YAML-based persistence with auto-save and manual save
- Cross-platform packaging targets (Windows, macOS, Linux)

## Tech Stack

- Electron + electron-vite
- TypeScript
- Vitest for unit tests
- ESLint + Prettier
- `js-yaml` for persistence

## Prerequisites

- Node.js 20+ (recommended)
- npm

## Install

```bash
npm ci
```

## Run in Development

```bash
npm run dev
```

Run with a specific notes file:

```bash
npm run dev -- -- /path/to/notes.yaml
```

Supported startup argument formats:

- positional path: `/path/to/notes.yaml`
- `--file /path/to/notes.yaml`
- `--file=/path/to/notes.yaml`
- `-f /path/to/notes.yaml`

If the file does not exist, TreeNote creates it automatically.

## Build

### App build (no installer packaging)

```bash
npm run build
```

### Cross-platform package (from package scripts)

```bash
npm run package
```

### Windows package

```bash
npm run package:win
```

### Windows package to directory output

```bash
npm run package:dir
```

## Build Scripts in Repo

These scripts install dependencies and build from scratch:

- `build.sh` – generic build (`npm ci` + `npm run build`)
- `build-win.sh` – Windows executable packaging via `electron-builder`
- `build-win.bat` – Windows batch equivalent of `build-win.sh`

## Test, Lint, Typecheck

```bash
npm run test
npm run lint
npm run typecheck
```

Additional scripts:

- `npm run test:watch`
- `npm run test:e2e`
- `npm run lint:fix`

## Data Storage

- Notes are stored in YAML.
- Default file name is `notes.yaml`.
- In portable mode, the default data file is placed next to the executable.

## Keyboard Shortcuts

Core shortcuts available via app menu:

- `Ctrl/Cmd+N` — New Note
- `Ctrl/Cmd+Shift+N` — New Child Note
- `Ctrl/Cmd+S` — Save
- `Ctrl/Cmd+F` — Find
- `Ctrl/Cmd+1` — Focus Tree
- `Ctrl/Cmd+2` — Focus Editor
- `Ctrl/Cmd+3` — Focus Search

## Project Structure

- `src/main` – Electron main process (window, IPC, file handling, menu)
- `src/preload` – secure renderer API bridge
- `src/renderer` – UI, app core, views, styles
- `tests/unit` – unit tests by module area
- `resources` – app icons and packaging resources
- `scripts` – helper scripts for packaging/build customization

## Packaging Targets

Configured in `electron-builder.yml`:

- Windows: portable
- macOS: dmg
- Linux: AppImage, deb

## License

MIT (see `LICENSE`).
