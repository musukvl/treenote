# TreeNote v1.0.6 Release Notes

## Overview

Security hardening and data-integrity release. Protects against renderer navigation abuse, untrusted IPC payloads, and binary misuse, and closes realistic data-loss paths around corrupt files, quit-time edits, and multi-instance writes.

## Security

- **Navigation guards**: deny unexpected `will-navigate` and `window.open` (dev allows only the Vite renderer origin).
- **IPC validation**: trusted-sender checks, `TreeData` validation on save/open, constrained log levels.
- **Electron Fuses**: disable `RunAsNode` / `NODE_OPTIONS` / `--inspect`; enable ASAR integrity and `onlyLoadAppFromAsar`.

## Data integrity

- **Corrupt files**: quarantine invalid data to `notes.yaml.corrupt-<timestamp>`, show an error, then create fresh data (no silent overwrite).
- **Flush on quit**: pending edits are saved before the window closes.
- **Single-instance lock**: a second launch focuses the existing window instead of opening another writer.
- **Rolling backups**: keep the last 10 copies under a sibling `backups/` directory.
- **Schema migration hook**: `migrateTreeData()` runs on load (ready for future format versions).
- **Storage location**: installed builds use `userData`; portable / AppImage keep exe-adjacent data.
- **Save errors**: repeated save failures show an error dialog.

## Downloads (Windows)

| Artifact               | Description         |
| ---------------------- | ------------------- |
| `TreeNote Setup *.exe` | NSIS installer      |
| `TreeNote *.exe`       | Portable executable |

## Downloads (macOS)

See previous release notes for Homebrew / DMG install paths when a macOS build is published for this version.
