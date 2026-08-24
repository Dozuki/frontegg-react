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

**Node 14, x86_64.** `.nvmrc` pins `v14.17.1`; `nvm use` picks it up. Both halves are forced by `node-sass@4.14.1`: it doesn't support Node > 14, and it has no `darwin-arm64` binary, so Apple Silicon needs an x86_64 Node under Rosetta (nvm's 14.x builds are x86_64). Check with `node -p process.arch` — must print `x64`. CI pins Node 12 on `ubuntu-latest`, also x64.

Reinstall after switching branches; `node_modules` from a 7.x checkout is incompatible with the 4.0.23 lockfile.

## Commands

Everything routes through the `Makefile` (`make help` for the full list): `init` · `install` · `build` · `bw` (watch) · `lint` · `pretty` · `demo`.

`make build` builds all 9 packages; `make build-<pkg>` builds one.

## Tests

| Target | Reality |
| --- | --- |
| `make test-component` | **The real suite.** 8 Cypress specs; passes. |
| `make test-unit` | Vacuous — zero test files, `--passWithNoTests`. |
| `make test-integration` | One spec; needs `demo-saas` served on :3000. Unverified. |

`make test-unit` is **not** a regression signal. Use `make test-component` — 4 specs in `packages/audits/src/tests`, 4 in `packages/auth/src/tests` (`*.cy-spec.tsx`). Cypress 5.3.0 arrives transitively via `cypress-react-unit-test`; no extra setup.

One test is skipped: `login-flow.cy-spec.tsx` → *"Login with Social Login"*. The app never issues `GET /identity/resources/sso/v1`, so `cy.wait('@socialLogin')` times out. Not flaky, not a URL mismatch, not the saga wiring or `firstLoad` init — root cause unresolved, suspected 4.x-component / 5.64.4-state-layer mismatch. Skipped because we don't use auth.

`make lint` **fails** with 12 pre-existing tslint style errors (quotemark, prefer-const, array-type, …) across 14 untouched upstream files. Inherited from v4.0.23 — a red `make lint` is not something you broke. The actual pre-commit gate is `yarn prettier-check-hook`, which passes; format before committing.

## Notes

- 2021-era toolchain: React 16, TypeScript 3.9, Rollup, node-sass, Lerna 3. Modern defaults are usually wrong here — match the surrounding code.
- The repo's own source is 4.0.23, but it pins `@frontegg/react-hooks`, `redux-store`, `types`, and `admin-portal` at **5.64.4** (upstream's choice, not drift). Version-mismatch bugs between the 4.x components and the 5.x state layer are plausible.
