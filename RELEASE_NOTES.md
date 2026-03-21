# TreeNote v1.0.0 Release Notes

## Overview

First public release of **TreeNote** — a desktop notes application that organizes notes in a hierarchical parent–child tree, inspired by Confluence-style document trees but as a fast, offline-first single-file app.

## Highlights

- **Tree-based note management**: create, rename, delete, reorder, and reparent notes using drag-and-drop.
- **Split-panel UI**: tree view on the left, full-text editor on the right, collapsible search panel.
- **Instant search**: case-insensitive full-text search across note titles and content, with live tree filtering.
- **Auto-save + manual save**: changes persist automatically after a short delay; `Ctrl+S` for immediate save.
- **Single YAML file**: all notes live in one portable `.yml`/`.yaml` file — easy to back up or version control.
- **Flexible file targeting**: pass any notes file at startup via positional path, `--file`, or `-f` flag.
- **Keyboard-first navigation**: shortcuts for new note, new child note, save, search, and panel focus switching.

## Downloads (Windows)

| Artifact | Description |
|---|---|
| `TreeNote Setup 1.0.0.exe` | **NSIS installer** (recommended): per-user install, adds `treenote` to PATH automatically |
| `TreeNote 1.0.0.exe` | **Portable executable**: run directly, no installation |

### Install via installer

1. Run `TreeNote Setup 1.0.0.exe` (no admin required).
2. Open a **new** command prompt and run `treenote`.

### Portable use

Download `TreeNote 1.0.0.exe`, place it anywhere and run it directly.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New note |
| `Ctrl+Shift+N` | New child note |
| `Ctrl+S` | Save |
| `Ctrl+F` | Find / search |
| `Ctrl+1` | Focus tree |
| `Ctrl+2` | Focus editor |
| `Ctrl+3` | Focus search |

## Notes

- No code signing certificate is configured in this release; Windows SmartScreen may show an unknown publisher warning — click **More info → Run anyway**.
- macOS and Linux packages are not included in this release; build locally with `npm run package`.
