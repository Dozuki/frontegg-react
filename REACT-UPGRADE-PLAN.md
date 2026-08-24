# React 18 / 19 Compatibility Plan

Goal: make `@frontegg/react-core` + `@frontegg/react-connectivity` (the only packages the
monolith consumes, via `manage_webhooks.tsx`) officially compatible with React 18, and
19-proof them while we're in here. Everything else in this repo is inherited surface area —
per the research below, none of it *blocks* the upgrade, so removal is an optional cleanup,
not a prerequisite.

## Where we actually stand (research findings)

**The runtime already works under React 18, on the modern renderer.** The monolith
installs the public npm 4.0.23 tarballs, runs them under React 18.2, and both of its mount
paths (`Shared/react-initialize.js` and `Shared/fast-react-initialize.js`) use `createRoot`
from `react-dom/client` — there is no legacy `ReactDOM.render` anywhere in the webhooks
path. What the monolith carries instead are compatibility *workarounds*: the
`@ts-ignore (DOZ-4228)` on `<FronteggProvider>`, pnpm `peerDependencyRules.allowedVersions`
entries silencing stale peer ranges from frontegg transitives (`react-redux>react: 18`,
`react-popper-tooltip>react: 18`, …), and a pnpm override pinning
`@frontegg/react-core>react-i18next` to `11.18.6`. So this project is not a rescue — it's
about removing the need for those workarounds, making 18 support official, and clearing
the one real React 19 landmine.

### Source audit: core + connectivity

A grep of every package's `src` for APIs removed or broken in React 18/19
(`ReactDOM.render` / `hydrate` / `unmountComponentAtNode`, `findDOMNode`, string refs,
legacy context, unprefixed lifecycles, `defaultProps` on function components) found
exactly **two** issues, both in code we control:

1. **`packages/core/src/ngSupport.ts` imports `render` from `react-dom`** and re-exports
   it via `DOMProxy` (an Angular-embedding shim; nothing in our tree calls it —
   `PageHeader` imports only the types). `render` is deprecated in 18 and **removed in
   React 19**, so the shipped ESM bundle carries `import { render } from 'react-dom'` and
   a consumer bundling against react-dom 19 gets a hard "export not found" build error.
   This is the single genuine React 19 blocker in our source.

2. **`FronteggProvider` types**: `FC<FeProviderProps>` relies on the implicit `children`
   that `@types/react@18` removed from `FC`. This is exactly the monolith's
   `@ts-ignore (DOZ-4228)`. Same pattern in the internal `FePlugins`/`FeState` and the
   cypress `TestFronteggWrapper`. Runtime-harmless; types-only.

`demo-saas/src/index.tsx` also calls `ReactDOM.render`, but that's the demo app's own
entrypoint, not shipped code.

One more 19-facing fact, below the level of the API audit: the dist is compiled with the
**classic JSX transform** (`tsconfig.json` sets `jsx: "react"`, and TS 3.9 can't emit the
modern `react-jsx` transform — that needs TS 4.1+). React 19 still runs classic-transform
output, but logs the "outdated JSX transform" runtime warning against it and withholds
the ref-as-prop/perf improvements gated on the new transform. Not a blocker like
`ngSupport`, but it means Phase 1 alone leaves the dist warning-noisy under 19. The
transform switch rides with Phase 3's toolchain work (TS bump + `jsx: "react-jsx"`), and
needs `react/jsx-runtime`, which exists only from React 16.14 — the repo currently
installs 16.13.1, so Phase 2's react bump is a prerequisite.

### Dependency matrix (what core/connectivity actually pull in)

| Dependency | Installed | React 18 | React 19 | Action |
|---|---|---|---|---|
| `react-router-dom` | 5.2.0 (`^5.1.2`) | works; 5.3.4 is the officially-supported line and drops `mini-create-react-context` (source of lifecycle warnings) | 5.3.4 uses no removed APIs | **bump to `5.3.4`** |
| `react-redux` (nested dep of `@frontegg/react-hooks@5.64.4`) | 7.2.2, declared `^7.x` | works; peer range only allows `^16.8 ǀǀ ^17` so consumers see install warnings | unsupported; probably runs (`unstable_batchedUpdates` still exists in 19) but this is the **top React 19 risk** — we don't own the dep declaration | see "react-redux problem" below |
| `@reduxjs/toolkit` | 1.x | React-agnostic | React-agnostic | none |
| `formik` | 2.2.6 | works | 2.4.x is the tested line | optional bump to `^2.4` |
| `react-table` | 7.6.3 | hooks-only, fine | fine | none |
| `react-i18next` | 11.7.0 | works (peer `>=16.8`) | expected fine | bump to 11.18.6 (the monolith already forces this via pnpm override; bumping here makes the override unnecessary) |
| `react-select` | 3.2.0 | works | class `defaultProps` still legal; its `react-input-autosize` emits legacy-lifecycle *warnings* only. Not in the webhooks critical path (webhooks form uses checkboxes, not FeSelect) | none |
| `react-popper-tooltip` | 3.1.1 | hooks-based, fine | fine | none |
| `react-waypoint` | 10.1.0 | no `findDOMNode` (verified in dist), fine | fine | none |
| `rc-dialog` + `rc-util` | 8.5.1 | portal via `createPortal` only (verified: the `DialogWrap → PortalWrapper → Portal` path never touches `findDOMNode`) | fine | none |
| `history` | 4.x | React-agnostic | React-agnostic | none |

Peer declarations: the publish script (`scripts/move-package-json-to-dist.js`) promotes
`react`/`react-dom` from `dependencies` to `peerDependencies`, but core keeps them in
`devDependencies` (`>16.8.6`), so the published core has **no react peer at all** and
connectivity publishes `react: >16.8.6`. Loose enough to install under 18/19 already, but
worth making explicit when we publish under a Dozuki scope.

### The react-redux problem (React 19 only)

`@frontegg/react-core` depends on the prebuilt `@frontegg/react-hooks@5.64.4`, which
declares `react-redux: ^7.x` as a hard dependency. We consume that package as-is, so we
can't bump it from this repo. Options, in order of preference:

1. **Do nothing for React 18** — v7 works there (only a peer-range warning).
2. **For React 19: pnpm override in the monolith** forcing `react-redux` to `^8.1.3`
   (v8 is drop-in for the `Provider`/custom-context/`useSelector` surface react-hooks
   uses, supports redux 4, and tolerates 19 in practice; v9 is out — it wants redux 5,
   and redux-store ships RTK 1.x). Verify on the webhooks page.
3. **Last resort: vendor `@frontegg/react-hooks`** into this repo (it's small — a
   `Provider` + hook bindings over `@frontegg/redux-store`). Only if 1/2 fail.

### Test/build infrastructure reality

- Component tests run on **Cypress 5.3 + `cypress-react-unit-test@4.12`**, which mounts
  with `ReactDOM.render`. That API survives (deprecated) in React 18 legacy-root mode,
  so we can run the suite against React 18. It is **impossible under React 19**.
- Testing under a modern Cypress requires Node ≥ 18, which is blocked by
  `node-sass@4` (the reason for the Node 14 / x86_64 pin). `rollup-plugin-postcss@3`
  already falls back to `sass` (dart-sass) when `node-sass` is absent — verified in its
  dist — so the sass swap is the key that unlocks the whole toolchain.
- The cypress `TestFronteggWrapper` mounts with the **semantic uiLibrary**, but the
  monolith passes no `uiLibrary`, so production runs core's default `fronteggElements`.
  Tests currently exercise a different element set than production — worth fixing
  independently of the React work.

## The plan

### Phase 1 — React 18 official support (small, do first)

1. **Neuter `ngSupport`**: delete the `render` import and the `DOMProxy` export (or the
   whole file, keeping `ProxyComponent`/`useProxyComponent` types where `PageHeader`
   needs them). Nothing consumes Angular embedding. This removes the one hard React 19
   build error at the bundler level (the dist still emits classic-transform JSX and so
   still draws React 19's outdated-JSX-transform warning — cleared by Phase 3.6).
2. **Fix children typing** so the monolith can drop `@ts-ignore (DOZ-4228)`:
   `children?: ReactNode` on `FeProviderProps` (and use `PropsWithChildren` in
   `FePlugins`/`FeState`/`TestFronteggWrapper`). TS 3.9 supports this; the emitted
   `.d.ts` then typechecks under `@types/react@18` and `@19`.
3. **Bump `react-router-dom` to `5.3.4`** in core (still v5 API — no code changes).
4. **Declare peers**: state `react`/`react-dom` support as `>=16.9.0 <20.0.0` in the
   published packages. The mechanics differ per package, because the publish script
   spreads existing `peerDependencies` first and then overwrites them with entries
   promoted from `dependencies`: core keeps react only in `devDependencies`, so adding a
   `peerDependencies` block to its package.json survives as-is; connectivity carries
   `react: >16.8.6` in `dependencies`, which would clobber a hand-added peer — change
   the range on that `dependencies` entry instead and let the script promote it.
5. Run `make build && make test-component` (still React 16) as the regression net.
6. Verify in the monolith: point its pnpm at the locally built dist (or a tarball),
   confirm the webhooks page under React 18 + `createRoot`, and that DOZ-4228's
   `@ts-ignore` can be deleted.

### Phase 2 — run the test suite on React 18

1. Bump the repo's own `react`/`react-dom`/`react-is` devDeps to `18.2.0` (matching the
   monolith) and `enzyme*` out (nothing uses it — `test-unit` is vacuous).
2. `cypress-react-unit-test` mounts via `ReactDOM.render` → legacy root: expect the
   "ReactDOM.render is no longer supported" console warning; silence or accept it.
   Keep `@types/react@16` + TS 3.9 — runtime and types are independent, and staying put
   avoids a TS-upgrade cascade we don't need (the monolith typechecks with its own
   `@types/react@18`).
3. Fix any test fallout (React 18 automatic batching can change effect/saga timing that
   specs implicitly rely on — the delete-confirm and toggle specs are the likely
   suspects).
4. If `cypress-react-unit-test` itself can't cope with react-dom 18, fall back: keep the
   suite on React 16 as a logic-regression net and rely on Phase 1.6 monolith
   verification for 18 — then Phase 3 becomes the real 18/19 test story. Note this
   fallback pins Phase 3 to Cypress 13 (see Phase 3.3).

### Phase 3 — toolchain unlock (enables testing on 18-concurrent and 19; also kills the Node 14 / Rosetta pin)

1. **`node-sass@4` → `sass`**: remove node-sass, add dart-sass; rollup-plugin-postcss
   picks it up automatically, and `sass-loader@10` (cypress webpack) supports it too.
   Audit the `.scss` for node-sass-isms (`/` division warnings are the usual one).
2. **Node 14 → 20 or 22** in `.nvmrc` + CI. Apple Silicon x86_64 requirement disappears.
3. **Cypress 5 → 13/14** with first-class component testing: `cypress-react-unit-test`
   → `cypress/react` `mount`, `cy.server()`/`cy.route()` → `cy.intercept()` (this is the
   bulk of the work — every helper in `cypress/helpers.tsx` uses the old network API),
   plugins-file → `cypress.config.ts` + component dev server. Version constraint:
   Cypress 14's `cypress/react` supports only React ≥ 18 (the 16/17 mount adapters are
   gone; `cypress/react18` was merged into it), so Phase 2's react bump is a
   prerequisite of the Cypress 14 path — if Phase 2 fell back to React 16, use Cypress
   13, whose `cypress/react` still mounts 16/17.
4. Mount tests through **`createRoot`** (modern Cypress does this on react-dom ≥ 18) —
   now the suite exercises the same concurrent root as production.
5. While in the helpers: drop the semantic `uiLibrary` from `TestFronteggWrapper` so
   tests run the default `fronteggElements` like production does (verify selectors —
   they mostly target `fe-*` classes, which are core's own).
6. **TypeScript 3.9 → 4.x/5.x with `jsx: "react-jsx"`**: switches the dist to the modern
   JSX transform, clearing React 19's outdated-JSX-transform warning and enabling its
   transform-gated features. Needs react ≥ 16.14 installed for `react/jsx-runtime` —
   Phase 2's bump to 18 covers it.

### Phase 4 — React 19 verification

1. Add react 19 to the test matrix: run the (Phase 3) component suite with
   `react`/`react-dom` 19 resolutions. CI can run both legs.
2. Apply the `react-redux` strategy above (monolith pnpm override to v8) and smoke the
   webhooks page in the monolith on a React 19 branch when one exists.
3. Watch for warnings-only issues (react-select's legacy lifecycles; the
   outdated-JSX-transform warning if Phase 3.6 hasn't landed) — acceptable, not in the
   webhooks path.

### Phase 5 (separate track) — publish + repoint

Nothing here reaches production until published. Restore a minimal publish workflow for
**core and connectivity only** under a Dozuki scope (GitHub Packages or npm), have the
monolith alias `@frontegg/react-core` → the Dozuki packages via pnpm overrides (keeps the
import paths in `manage_webhooks.tsx` unchanged), and delete the now-dead
`publish-packages*` Makefile targets for the other packages.

## Unused packages: remove or keep?

The question was whether other components need a major refactor and should be removed
instead. **They don't** — the audit found no removed-API usage anywhere except `ngSupport`
(in core, which we keep). So nothing forces removal, and the upgrade shouldn't wait on it.

Recommended cleanup, as its own PR after Phase 1:

- **Delete now** — no consumer, no test value: `cli`, `nextjs`, `elements-material-ui`,
  `react` (the umbrella package — also the only thing pinning `@frontegg/admin-portal`),
  `demo-saas` (only `test-integration` uses it, which AGENTS.md already calls redundant).
- **Keep for now**: `auth`, `audits`, `elements-semantic`. The 8 kept non-webhooks specs
  live in `packages/{auth,audits}/src/tests` and exist to cover shared core components
  (`Table`, `Popup`, `FInput`/`FButton`, `ErrorMessage`, `Loader`), and
  `cypress/helpers.tsx` imports `elements-semantic`. Deleting them means porting those
  specs to mount core components directly — worthwhile, but do it as part of the Phase 3
  test rewrite (which touches every spec anyway), not before.
- Mechanics when deleting: remove the package dir, its `build-<pkg>` line in the
  Makefile `build` target, any `test-component-<pkg>` fanout, tsconfig/webpack path
  aliases, and let the `lerna.json` `packages/*` glob take care of itself.

## Effort and risk summary

| Phase | Size | Risk |
|---|---|---|
| 1 — React 18 official | small (4 focused changes) | low; regression net exists |
| 2 — suite on React 18 | small-medium | medium: old mount tool on new react-dom |
| 3 — toolchain unlock | the big one (Cypress rewrite dominates) | medium; mechanical but broad |
| 4 — React 19 leg | small once Phase 3 lands | the react-redux 7 nested dep is the one thing we don't control |
| 5 — publish/repoint | small-medium | process, not code |

Phases 1 (+ 1.6 monolith verification) deliver React 18 support and fix DOZ-4228 by
themselves. Phase 3 is where we should decide how much we care about *proving* 19
compatibility in CI versus accepting Phase 1's source-level 19-proofing and verifying in
the monolith when a React 19 upgrade actually lands there.
