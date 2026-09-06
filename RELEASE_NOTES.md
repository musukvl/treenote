# TreeNote v1.0.8 Release Notes

## Overview

Maintenance release. TreeNote moves to Electron 44, Vitest 5, and other latest-stable toolchain packages. The required Node.js version for development and CI is now 22.22.2 or newer. App behavior for notes, files, and shortcuts is unchanged.

## Runtime and packaging

- **Electron 44.2.0**: Chromium/Node inside the desktop app are updated. 32-bit Windows/Linux builds are no longer produced by Electron; TreeNote already packaged 64-bit only. macOS 13 (Ventura) or later is required for this Electron series.
- **electron-builder 26.16.0**: packaging stays on the 26.x line (27 is still pre-release).
- **Node.js 22.22.2+**: `package.json` engines, README, and GitHub Release workflow now use Node 22 instead of Node 20.

## Tooling

- **Vitest 5** and **jsdom 30** for unit tests; 158 tests passing.
- ESLint 10.10, Prettier 3.9.6, typescript-eslint 8.69, Playwright 1.63, lint-staged 17.5, js-yaml 5.4.1.
- TypeScript stays on 6.0.3 and Vite on 7.3.6 until electron-vite and typescript-eslint support the next majors.

## Downloads (Windows)

| Artifact               | Description         |
| ---------------------- | ------------------- |
| `TreeNote Setup *.exe` | NSIS installer      |
| `TreeNote *.exe`       | Portable executable |

## Downloads (macOS)

See previous release notes for Homebrew / DMG install paths when a macOS build is published for this version.
