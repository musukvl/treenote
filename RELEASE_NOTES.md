# TreeNote v1.0.9 Release Notes

## Overview

First public release since v1.0.6. Notes now use the `.tnyml` file type, the desktop app ships Electron 44.4.5, and the development toolchain is updated. Editing, search, and shortcuts work as before.

## File type: `.tnyml`

- Default data file is `notes.tnyml`. The Open dialog filters on `*.tnyml`.
- Windows, macOS, and Linux register `.tnyml` with TreeNote.
- Opening a `.tnyml` file while TreeNote is running switches to that file after flushing pending saves.
- Existing `.yaml` / `.yml` files are not picked up automatically. Rename to `.tnyml`, or open once via File → Open with “All Files”.

## Runtime

- **Electron 44.4.5** (64-bit only). macOS 13 (Ventura) or later is required for this series.
- **electron-builder 26.17.0** for packaging.
- Development and CI require **Node.js 22.22.2+**.

## Tooling (developers)

- Vitest 5.0.2, jsdom 30.1.1, ESLint 10.11, Prettier 3.9.9, typescript-eslint 8.71, js-yaml 5.4.2.
- TypeScript stays on 6.0.3 and Vite on 7.3.6 until electron-vite and typescript-eslint support the next majors.

## Downloads (Windows)

| Artifact               | Description         |
| ---------------------- | ------------------- |
| `TreeNote Setup *.exe` | NSIS installer      |
| `TreeNote *.exe`       | Portable executable |

## Downloads (macOS)

See previous release notes for Homebrew / DMG install paths when a macOS build is published for this version.
