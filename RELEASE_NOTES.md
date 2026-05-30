# TreeNote v1.0.4 Release Notes

## Overview

Quality and reliability release focused on fixing bugs identified in the maturity audit. No new features — all changes improve correctness, robustness, and maintainability.

## Bug Fixes

- **Lint passes clean**: added ESLint config for CommonJS scripts, removed unused imports, applied Prettier formatting.
- **About dialog shows correct version**: replaced hardcoded `v1.0.0` with dynamic `app.getVersion()`.
- **TreeView lifecycle cleanup works**: renamed `onUnload()` → `onunload()` so drag-drop controller and delete modal are properly disposed.
- **Inline rename no longer fires twice**: added guard to prevent Enter + blur from calling `renameNote` a second time; Escape no longer triggers rename.
- **IPC handlers registered once**: moved IPC registration from per-window to app startup, preventing duplicate handler errors on macOS window recreation.
- **Expansion state persists**: collapsing/expanding tree nodes now marks the vault dirty and triggers auto-save.
- **Data file validated on load**: basic schema validation prevents crashes from corrupted or manually-edited files.
- **Atomic writes use unique temp paths**: eliminates potential for stale `.tmp` files on overlapping or failed saves.

## Cleanup

- Removed unused `showSaveDialog` / `showOpenDialog` IPC APIs that were exposed but never consumed by the renderer.

## Downloads (macOS)

| Artifact | Description |
|----------|-------------|
| `TreeNote-1.0.4.dmg` | macOS disk image (Apple Silicon + Intel) |

### Install via Homebrew

```bash
brew tap nicegoodthings/treenote
brew install --cask treenote
```
