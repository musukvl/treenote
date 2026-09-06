---
name: upgrade-packages
description: >-
  Upgrade TreeNote Node packages to latest stable, classify major vs minor,
  migrate breaking changes, keep tests green, and write docs/upgrade-report.md.
  Invoke with /upgrade-packages. Use when the user asks to upgrade npm
  dependencies, run package maintenance, or bump Electron/Vite/Vitest/TypeScript.
disable-model-invocation: true
---

# Upgrade Node packages

As the first action, read `.cursor/commands/upgrade-packages.md` and execute every step. That file is the source of truth.

Do not commit unless the user asks.
