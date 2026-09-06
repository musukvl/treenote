# Upgrade Node packages

Run TreeNote dependency maintenance end to end. Do not commit unless the user asks.

## 1. Branch

From a clean working tree, create and switch to `chore/maintenance-deps`. If that branch already exists, use `chore/maintenance-deps-YYYY-MM-DD`.

## 2. Inventory

For every `dependencies` and `devDependencies` entry in `package.json`:

- Record the declared range and installed version.
- Query npm `dist-tags` and `version` (latest **stable** only).
- Classify the bump as major, minor, patch, or current.

Skip pre-release tags (`alpha`, `beta`, `rc`, `next`) unless `latest` itself is that version.

## 3. Compatibility gates

Do not take a version that the rest of the toolchain cannot consume:

- Honor `electron-vite` `peerDependencies.vite`. Do not jump Vite majors until a **stable** electron-vite release lists that Vite major.
- Honor `typescript-eslint` `peerDependencies.typescript`. Do not take TypeScript beyond that range (TypeScript 7 also needs Compiler API support before ESLint can follow).
- Stay on electron-builder 26.x until npm `latest` is a stable 27.x.
- If jsdom/vitest raise the Node floor, update `engines.node`, README prerequisites, and `.github/workflows/release.yml` `node-version` together.

## 4. Apply upgrades

- Bump `package.json` using the existing range style (`^` or `~`).
- Run `npm install`, then `npm audit fix` (non-breaking only).
- Re-read official migration/breaking-change docs for every **major** you take. Search the app for affected APIs and implement the migration. Update tests.

## 5. Verify (all must pass)

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Fix failures, including Prettier format drift after a Prettier bump. Add or adjust tests when a major changes runtime contracts (for example empty-input YAML).

## 6. Report

Write or replace `__reports/upgrade-report.md` with:

- branch and date
- verification results
- applied table: package, from, to, major/minor/patch, notes
- deferred majors and why
- migrations performed (or “none required”)
- follow-ups (held majors, unused Playwright, OS support, etc.)

## 7. Stop

Summarize what moved, what was held, and that checks are green. Do not commit unless asked.
