# AGENTS.md

A Dozuki fork of [frontegg/frontegg-react](https://github.com/frontegg/frontegg-react) (the Frontegg React SDK), pinned to upstream tag **v4.0.23** (commit `4d59ec04`).

## What we actually use

Only two packages matter: **`core`** and **`connectivity`**. Everything else is inherited surface area.

`dozuki-monolith` (at `https://github.com/Dozuki/dozuki-monolith`) consumes them from exactly one file — `carpenter-frontend/Guide/Manage/manage_webhooks.tsx` — importing four symbols:

- `FronteggProvider`, `ContextOptions` from `@frontegg/react-core`
- `ConnectivityPlugin`, `WebhookComponent` from `@frontegg/react-connectivity`

That's the whole integration: a webhooks admin page. **Auth is not used.** Weight your effort accordingly — a change to `auth`, `audits`, `elements-*`, `nextjs`, or `cli` has no known consumer, and breakage in `core`/`connectivity` is what actually hurts.

Two facts worth knowing before changing anything:

- The monolith installs the **public npm** `4.0.23` tarballs via pnpm, not this fork. Nothing here reaches production until someone publishes these packages under a Dozuki scope and repoints the monolith.
- It runs them under **React 18**, which `core` and `connectivity` support officially: both declare a `react` peer of `>=16.14.0 <20.0.0`, and CI runs the suite on 18 and 19. `REACT-UPGRADE-PLAN.md` is the plan that got them there; phases 1–4 are done, phase 5 (publish and repoint) is not.

## Fork history

The fork was made by pushing upstream's branches into a fresh repo, so it carried history through v7.15.2; the tree was then reverted to v4.0.23 in one commit (`59547a8c`, PR #1). Consequences:

- `git log` shows upstream commits up to v7.15.2, but **none of that code is present**. Don't assume a commit in the log describes the current code.
- **No tags**, deliberately. Versions in `lerna.json` / `package.json` track the 4.0.x line.
- **No `upstream` remote.** `origin` is `Dozuki/frontegg-react`.

This fork is permanent — we don't pull from upstream or contribute back. Upstream 5.x/6.x/7.x is not a migration target; don't propose rebasing, cherry-picking, or "catching up." Docs and Stack Overflow answers written against Frontegg React 5+ generally do not apply here.

## Toolchain

**Node 22.** `.nvmrc` pins `22.22.0`; `nvm use` and CI both read it. Any architecture — the old x86_64-under-Rosetta requirement left with `node-sass`, which is now dart-sass.

Two traps that will otherwise cost you an hour each:

- **React is pinned in the root `resolutions`, not just `devDependencies`.** Change it with `make use-react-<version>`, which edits both — raising `devDependencies` alone leaves a transitive pulling in a second React copy, which fails at runtime with `Objects are not valid as a React child`. `@types/react` is pinned there too and deliberately stays on 16.14 while the runtime is 18; the emitted `.d.ts` is checked against `@types/react` 18 and 19 separately.
- **`rollup-plugin-typescript2` caches per package** under `packages/<pkg>/node_modules/.cache`, and that cache does *not* invalidate when a sibling package's `dist/*.d.ts` changes. Edit `core`, run `make build`, and a downstream package can fail on type errors that no longer exist. `rm -rf packages/*/node_modules/.cache` before believing a cross-package type error.

## Commands

Everything routes through the `Makefile` (`make help` for the full list): `init` · `install` · `build` · `bw` (watch) · `lint` · `pretty` · `demo`.

`make build` builds the 9 publishable packages — everything except `demo-saas`; `make build-<pkg>` builds one.

## Tests

`make test-component` is the only real suite — 9 Cypress 14 component specs (`*.cy-spec.tsx`) mounted through `cypress/react` onto a vite dev server (`cypress.config.ts`, `vite.config.ts`). **Run `make build` first**: specs import each package's `src`, but reach `core` through the workspace symlink to its `dist`. `make test-unit` is vacuous (zero test files, `--passWithNoTests`) and is **not** a regression signal.

`make test-component-react19` is the leg CI runs against React 19. It skips `audits`, whose IP popup uses `google-map-react` and the `ReactDOM.findDOMNode` that React 19 removed.

Our coverage is `packages/connectivity/src/tests/webhooks-list.cy-spec.tsx`: it mounts `WebhookComponent` the way the monolith does and exercises list render, search, status toggle, delete (cancel and confirm), and opening the create form, all against stubbed APIs.

**The suite is deliberately trimmed** — 14 tests run, 18 are skipped. Kept: the webhooks tests, plus the auth/audits tests covering shared `core` components the webhooks UI reuses (`Table` render and sorting, `Popup`, `FInput`/`FButton`/`validateSchema`, `ErrorMessage`, `Loader`). Skipped: SAML, MFA, logout, account activation, forgot/reset navigation, the `AuthPlugin` header option, `Table` expandable rows, and one unresolved social-login failure. Each skip states its reason in-file; don't re-enable without one.

`TestFronteggWrapper` passes no `uiLibrary`, so specs run `core`'s own `fronteggElements` — the same elements the monolith gets. Selectors are `core`'s `fe-*` classes; semantic's stylesheet isn't loaded.

Adding a spec — five things that will otherwise cost you an hour:

- `test-component` fans out to one `test-component-<pkg>` target per package. Add one for a package's first spec, or its specs silently never run.
- `getBaseUrl` appends a `frontegg` segment to `context.baseUrl`, so stubs are `http://localhost:8080/frontegg/...` (see `WEBHOOKS_SERVICE` / `EVENTS_SERVICE` in `cypress/helpers.tsx`).
- `WebhookComponent` renders behind `<Route exact path={rootPath}>` — a spec must `navigateTo(rootPath)` or nothing mounts.
- Never `cy.get(rows).first().find(x)`. Cypress retries only the trailing `.find()`, against a row the re-render has since detached. Use one compound selector.
- A new third-party import may need adding to `optimizeDeps.include` in `vite.config.ts`. Vite's dep scanner won't walk into `@frontegg/react-core` (a symlinked workspace package), so anything discovered only at request time triggers a reload that aborts the spec's own dynamic import and fails whichever test ran first. Symptom: `Failed to fetch dynamically imported module` plus `new dependencies optimized`, and only with a cold `node_modules/.vite`.

`make lint` **fails** with 12 pre-existing tslint style errors across 14 untouched upstream files. Inherited from v4.0.23 — a red `make lint` is not something you broke. The actual pre-commit gate is `yarn prettier-check-hook`, which passes; format before committing.

## CI

One workflow, `.github/workflows/push.yml`, on every branch: install, `make use-react-<version>`, build, test. Two matrix legs — React 18 (full suite) and React 19 (`test-component-react19`) — on a plain `ubuntu-latest` runner with Node from `.nvmrc`. No container: the runner already ships `make`, `xvfb` and, through its preinstalled browsers, the shared libraries Cypress's Electron links against. `make lint` is deliberately not a step, since it fails on the inherited errors above.

Upstream's two publish workflows were deleted; nothing is published from here yet. `make move-package-json-to-dist` (wired to the root `prepublishOnly`) rewrites each `dist/package.json`, promoting `react`, `react-dom`, `react-router-dom` and the `@frontegg/*` siblings from `dependencies` into `peerDependencies` — which is why `core` keeps react only in `devDependencies` and hand-declares its peer range. The `publish-packages*` targets are unreferenced.

## Notes

- Mixed-vintage toolchain: 2021-era Rollup 2 and Lerna 3 alongside TypeScript 5.9, Cypress 14 and vite. The *source* is still 4.0.23 and reads like 2021 — match the surrounding code, not the tooling.
- `dist` is emitted with the modern JSX transform (`jsx: "react-jsx"`), so it imports `react/jsx-runtime`. That is why the react peer floor is 16.14 rather than 16.9.
- The repo's own source is 4.0.23, but the `@frontegg/react-hooks`, `redux-store`, `types` and `admin-portal` it pulls in are all **5.64.4** (upstream's choice, not drift). Mismatches between the 4.x components and the 5.x state layer are plausible; `packages/connectivity/src/hooks.ts` works around two typing ones.
- `@frontegg/react-hooks@5.64.4` hard-depends on `react-redux@^7`, whose peer range stops at React 17. It works — the React 19 leg passes — but installs warn, and we can't bump it from here; the fix is an override in the consumer, or vendoring `react-hooks`.
