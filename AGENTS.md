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
- It runs them under **React 18**, while this repo builds against React 16.

## Fork history

The fork was made by pushing upstream's branches into a fresh repo, so it carried history through v7.15.2; the tree was then reverted to v4.0.23 in one commit (`59547a8c`, PR #1). Consequences:

- `git log` shows upstream commits up to v7.15.2, but **none of that code is present**. Don't assume a commit in the log describes the current code.
- **No tags**, deliberately. Versions in `lerna.json` / `package.json` track the 4.0.x line.
- **No `upstream` remote.** `origin` is `Dozuki/frontegg-react`.

This fork is permanent — we don't pull from upstream or contribute back. Upstream 5.x/6.x/7.x is not a migration target; don't propose rebasing, cherry-picking, or "catching up." Docs and Stack Overflow answers written against Frontegg React 5+ generally do not apply here.

## Toolchain

**Node 14, x86_64.** `.nvmrc` pins `v14.17.1`; `nvm use` picks it up. Both halves are forced by `node-sass@4.14.1`: it doesn't support Node > 14, and it has no `darwin-arm64` binary, so Apple Silicon needs an x86_64 Node under Rosetta (nvm's 14.x builds are x86_64). Check with `node -p process.arch` — must print `x64`. CI reads the same `.nvmrc`, on linux-x64 where the arm64 problem doesn't arise.

Reinstall after switching branches; `node_modules` from a 7.x checkout is incompatible with the 4.0.23 lockfile.

## Commands

Everything routes through the `Makefile` (`make help` for the full list): `init` · `install` · `build` · `bw` (watch) · `lint` · `pretty` · `demo`.

`make build` builds all 9 packages; `make build-<pkg>` builds one.

## Tests

`make test-component` is the only real suite — 9 Cypress specs (`*.cy-spec.tsx`), green in CI. `make test-unit` is vacuous (zero test files, `--passWithNoTests`) and is **not** a regression signal. `make test-integration` re-runs those same component specs behind a demo-saas build nothing uses.

Our coverage is `packages/connectivity/src/tests/webhooks-list.cy-spec.tsx`: it mounts `WebhookComponent` the way the monolith does and exercises list render, search, status toggle, delete (cancel and confirm), and opening the create form, all against stubbed APIs.

**The suite is deliberately trimmed** — 14 tests run, 18 are skipped. Kept: the webhooks tests, plus the auth/audits tests covering shared `core` components the webhooks UI reuses (`Table` render and sorting, `Popup`, `FInput`/`FButton`/`validateSchema`, `ErrorMessage`, `Loader`). Skipped: SAML, MFA, logout, account activation, forgot/reset navigation, the `AuthPlugin` header option, `Table` expandable rows, and one unresolved social-login failure. Each skip states its reason in-file; don't re-enable without one.

Adding a spec — four things that will otherwise cost you an hour:

- `test-component` fans out to one `test-component-<pkg>` target per package. Add one for a package's first spec, or its specs silently never run.
- `getBaseUrl` prepends a `frontegg` segment to `context.baseUrl`, so stubs are `http://localhost:8080/frontegg/...` (see `WEBHOOKS_SERVICE` / `EVENTS_SERVICE` in `cypress/helpers.tsx`).
- `WebhookComponent` renders behind `<Route exact path={rootPath}>` — a spec must `navigateTo(rootPath)` or nothing mounts.
- Never `cy.get(rows).first().find(x)`. Cypress retries only the trailing `.find()`, against a row the re-render has since detached. Use one compound selector.

`cypress/integration/auth.spec.ts` is dead code: it doesn't match `testFiles: "**/*.cy-spec.*"` and imports a `./constants` that exists only as a `.d.ts`.

`make lint` **fails** with 12 pre-existing tslint style errors across 14 untouched upstream files. Inherited from v4.0.23 — a red `make lint` is not something you broke. The actual pre-commit gate is `yarn prettier-check-hook`, which passes; format before committing.

## CI

One workflow, `.github/workflows/push.yml` — install, build, `test-component`, on every branch; currently green. It runs in the `cypress/browsers` container for Cypress's system libraries, with Node taken from `.nvmrc`. `make lint` is deliberately not a step, since it fails on the inherited errors above.

Upstream's two publish workflows were deleted; nothing is published from this repo yet. The `publish-packages*` and `move-package-json-to-dist` Makefile targets they drove remain, unreferenced.

## Notes

- 2021-era toolchain: React 16, TypeScript 3.9, Rollup, node-sass, Lerna 3. Modern defaults are usually wrong here — match the surrounding code.
- The repo's own source is 4.0.23, but it pins `@frontegg/react-hooks`, `redux-store`, `types`, and `admin-portal` at **5.64.4** (upstream's choice, not drift). Version-mismatch bugs between the 4.x components and the 5.x state layer are plausible.
