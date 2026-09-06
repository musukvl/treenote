# Dependency Upgrade Report

**Branch:** `chore/maintenance-deps`  
**Date:** 2026-09-06  
**App version:** 1.0.7 (unchanged)

This maintenance pass updates TreeNote’s Node packages to the latest **stable** versions that the current toolchain can actually consume. Pre-release packages (`electron-vite@6` beta, `electron-builder@27` alpha, `prettier@4` alpha) were not taken.

`node_modules` was stale relative to `package.json` before this work (for example Electron 40 was installed while the manifest already asked for 43). The tables below use **declared `package.json` ranges** as the “from” versions.

## Verification

| Check               | Result                                         |
| ------------------- | ---------------------------------------------- |
| `npm run test`      | 18 files / **158 tests passed** (Vitest 5.0.0) |
| `npm run typecheck` | passed (`tsc --noEmit`, TypeScript 6.0.3)      |
| `npm run lint`      | passed (ESLint 10.10.0 + Prettier 3.9.6)       |
| `npm run build`     | passed (electron-vite 5.0.0 + Vite 7.3.6)      |
| `npm audit`         | **0 vulnerabilities** after `npm audit fix`    |

## Applied upgrades

| Package               | From (`package.json`) | To         | Change    | Notes                                                                                                          |
| --------------------- | --------------------- | ---------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| `js-yaml`             | `^5.2.1`              | `^5.4.1`   | minor     | Empty-input handling was already in `FileManager`. Dropped deprecated `sortKeys: false` (default is unsorted). |
| `@playwright/test`    | `^1.61.1`             | `^1.63.0`  | minor     | No e2e specs in repo; script only.                                                                             |
| `@vitest/coverage-v8` | `^4.1.10`             | `^5.0.0`   | **major** | Must match Vitest 5.                                                                                           |
| `electron`            | `^43.1.1`             | `^44.2.0`  | **major** | See [Electron 44](#electron-44).                                                                               |
| `electron-builder`    | `^26.15.7`            | `^26.16.0` | minor     | Newest 26.x (`v26` dist-tag). npm `latest` still points at 26.15.3.                                            |
| `eslint`              | `^10.7.0`             | `^10.10.0` | minor     | No rule-config changes required.                                                                               |
| `jsdom`               | `^29.1.1`             | `^30.0.1`  | **major** | See [jsdom 30](#jsdom-30).                                                                                     |
| `lint-staged`         | `^17.0.8`             | `^17.5.0`  | minor     | Husky pre-commit hook unchanged.                                                                               |
| `prettier`            | `^3.9.5`              | `^3.9.6`   | patch     | Reformatted `TreeView` test and workspace JSON.                                                                |
| `typescript-eslint`   | `^8.64.0`             | `^8.69.0`  | minor     | Peer range still `typescript >=4.8.4 <6.1.0`.                                                                  |
| `vitest`              | `^4.1.10`             | `^5.0.0`   | **major** | See [Vitest 5](#vitest-5).                                                                                     |

Already at latest stable (no bump):

| Package                      | Version                              |
| ---------------------------- | ------------------------------------ |
| `@electron-toolkit/tsconfig` | `2.0.0`                              |
| `@eslint/js`                 | `10.0.1`                             |
| `electron-vite`              | `5.0.0`                              |
| `eslint-config-prettier`     | `10.1.8`                             |
| `husky`                      | `9.1.7`                              |
| `png2icons`                  | `2.0.1`                              |
| `pngjs`                      | `7.0.0`                              |
| `typescript`                 | `~6.0.3` (held; see deferred majors) |
| `vite`                       | `^7.3.6` (held; see deferred majors) |

## Deferred majors (not latest on npm)

These are the newest versions on npm, but they are **not** a compatible stable upgrade for this app today.

| Package            | Latest on npm      | Why it was not taken                                                                                                                                                                                | Next action                                                                                                                                                                    |
| ------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typescript`       | **7.0.2**          | `typescript-eslint@8.69.0` peers `typescript <6.1.0`. TypeScript 7.0 also ships without the Compiler API that ESLint type-aware tooling needs (planned for 7.1).                                    | Revisit after typescript-eslint supports TS 7.1+.                                                                                                                              |
| `vite`             | **8.2.2**          | `electron-vite@5.0.0` peers `vite ^5 \|\| ^6 \|\| ^7`. Vite 8 is a Rolldown merge; running the compiled app with electron-vite 5 + Vite 8 is reported to fail. `electron-vite@6` is still **beta**. | Upgrade Vite 8 together with stable electron-vite 6.                                                                                                                           |
| `electron-vite`    | **6.0.0-beta.1**   | Pre-release only.                                                                                                                                                                                   | Wait for 6.0.0 stable, then take Vite 8.                                                                                                                                       |
| `electron-builder` | **27.0.0-alpha.8** | Pre-release only. npm `latest` is 26.15.3; 26.16.0 is the newest 26.x.                                                                                                                              | Wait for 27 stable. Then review [v27 breaking changes](https://www.electron.build/docs/migration/v27-breaking-changes) (ESM packaging, `arch: "all"` no longer includes ia32). |

## Major-version migrations

### Electron 44

[Electron 44.0.0](https://github.com/electron/electron/releases/tag/v44.0.0) breaking changes reviewed against this codebase:

| Change                                                                | Impact on TreeNote                                                                                 |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Clipboard module no longer exposed to renderer                        | None. Clipboard is unused.                                                                         |
| `window.open()` children of unsandboxed windows get their own sandbox | None. Main window is already `sandbox: true`; `registerNavigationGuards` denies all `window.open`. |
| 32-bit builds removed (Windows ia32, Linux armv7l)                    | None. Packaging does not request those arches.                                                     |
| macOS 12 (Monterey) unsupported; macOS 13+ required                   | Documented for future macOS releases. No code change.                                              |
| Unity desktop support removed on Linux                                | None. App uses a standard desktop entry.                                                           |
| `openAsHidden` / related login-item fields removed                    | None. Login-item APIs are unused.                                                                  |

No Electron API call sites needed rewriting. Chromium / Node inside Electron 44 are newer, but the app’s IPC, fuses, and `webPreferences` remain valid.

### Vitest 5

Migrated `vitest` and `@vitest/coverage-v8` together to 5.0.0. Relevant [Vitest 5](https://vitest.dev/guide/migration/) items:

| Change                                | TreeNote handling                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Node `>=22.12.0`, Vite `>=6.4`        | Satisfied (engines now `>=22.22.2`, Vite 7.3.6).                                                                                              |
| `clearMocks` defaults to `true`       | Existing tests already re-stub implementations in `beforeEach` or use per-test `vi.fn()`. All tests stayed green without `clearMocks: false`. |
| Hoisted `vi.mock` must be top-level   | Already true (`vi.hoisted` + `vi.mock` at module top in main-process tests).                                                                  |
| Config not looked up from parent dirs | Root `vitest.config.ts` is unchanged.                                                                                                         |

No test API rewrites were required. One regression-prevention test was added for js-yaml empty input (below). Prettier 3.9.6 also adjusted wrapping in `tests/unit/views/TreeView.test.ts`.

### jsdom 30

Breaking change is the Node floor: `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`. CSSOM pixel conversion and `document.evaluate` error type do not affect these unit tests.

Follow-up config:

- `package.json` `engines.node` updated from `>=22.12.0` to `>=22.22.2`
- README prerequisite updated from “Node.js 20+” to “Node.js 22.22.2+ (or 24.15+)”
- GitHub Release workflow `actions/setup-node` updated from Node **20** to **22** (the previous CI Node could not satisfy jsdom 30 or the declared engines)

### js-yaml 5.4.1

The app already imported `load` / `dump` from js-yaml 5 and treated empty files as “no data” because v5 throws on empty input. This pass:

- Bumped 5.2.1 → 5.4.1 (compatible dump options: `indent`, `lineWidth`, `noRefs` still valid)
- Removed deprecated `sortKeys: false` (unsorted is the default)
- Added `FileManager` coverage for empty and whitespace-only files so the v5 empty-input contract cannot regress

### `@electron-toolkit/tsconfig` 2

Already declared as `^2.0.0`. v2 uses `moduleResolution: "bundler"` and `module: "esnext"`, which matches TypeScript 6. Project `tsconfig.*.json` overrides (`strict`, `noImplicitAny`, `types`) remain in place. Typecheck is clean.

## Other repo fixes in this branch

- `npm audit fix` resolved transitive **brace-expansion** and **nanoid** advisories (0 remaining).
- Prettier 3.9.6 normalized `treenote.code-workspace` to 2-space JSON with a trailing newline.

## Recommended follow-ups (not in this branch)

1. When **electron-vite 6 stable** ships, upgrade Vite 8 + electron-vite 6 together and replace `build.rollupOptions` with Vite 8 `rolldownOptions` if the plugin requires it.
2. When **typescript-eslint** supports TypeScript 7.1+, drop `~6.0.3` and apply the TS 7 `tsconfig` removals (`baseUrl`, legacy `moduleResolution`, etc.). `@electron-toolkit/tsconfig` 2 is already close to that shape.
3. Add real Playwright specs or drop the unused `test:e2e` script; `@playwright/test` is updated but there is still no e2e suite.
4. After Electron 44, macOS releases require **macOS 13+**.
