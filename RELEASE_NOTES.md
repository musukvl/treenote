# TreeNote v1.0.5 Release Notes

## Overview

Toolchain modernization release. No new product features — upgrades packaging and developer tooling to current stable versions, and adds pre-commit quality gates.

## Changes

- **Electron Builder**: moved from `27.0.0-alpha.5` to stable `26.15.3` (no more pre-release packaging toolchain).
- **TypeScript**: upgraded to `6.0` (removed deprecated `baseUrl` from `tsconfig.web.json`).
- **ESLint**: upgraded to `10` (fixed `no-useless-assignment` in tree drag-and-drop).
- **js-yaml**: upgraded to `5` (named imports; empty data files handled safely).
- **Pre-commit hooks**: husky + lint-staged run ESLint, Prettier, and typecheck before every commit.
- **Node engines**: require Node `>=22.12.0`.

## Downloads (Windows)

| Artifact               | Description         |
| ---------------------- | ------------------- |
| `TreeNote Setup *.exe` | NSIS installer      |
| `TreeNote *.exe`       | Portable executable |

## Downloads (macOS)

See previous release notes for Homebrew / DMG install paths when a macOS build is published for this version.
