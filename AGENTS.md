# AGENTS.md

## What this repo is

A Dozuki fork of [frontegg/frontegg-react](https://github.com/frontegg/frontegg-react), the Frontegg React SDK.

The fork point is upstream tag **v4.0.23** (commit `4d59ec04`).

## Fork history

The fork was created by pushing upstream's branches into a fresh repo, so it initially carried upstream's full history through v7.15.2. We then reverted the working tree back to the v4.0.23 tree in a single commit (`59547a8c`, merged via PR #1).

The consequences of that, which matter when reading history:

- `git log` shows upstream commits up to v7.15.2, but **none of that code is present** — one revert commit undoes all of it. Don't assume a commit in the log describes the current code.
- **There are no tags** in this repo, deliberately. Upstream's 789 tags were never pushed here. Version numbers in `lerna.json` and `package.json` reflect the 4.0.x line.
- There is **no `upstream` remote**. `origin` is `Dozuki/frontegg-react`.

## Divergence policy

This fork is permanent. We do not pull from upstream and we do not contribute back. Upstream's 5.x/6.x/7.x work is not a migration target — don't propose rebasing onto it, cherry-picking from it, or "catching up." Changes here are ours to maintain.

Upstream docs, issues, and Stack Overflow answers written against Frontegg React 5+ generally **do not apply**. Verify against the code in this repo before trusting an external source.

## Layout

Lerna + Yarn workspaces monorepo; packages live in `packages/*`:

`react` (main entry) · `core` · `auth` · `audits` · `connectivity` · `elements-material-ui` · `elements-semantic` · `nextjs` · `cli` · `demo-saas`

## Common commands

Driven by the `Makefile` (run `make help` for the full list):

| Command | Purpose |
| --- | --- |
| `make init` | Install + build after a fresh pull |
| `make install` | Yarn install across all packages |
| `make build` | Build all packages |
| `make bw` | Build all packages in watch mode |
| `make test-unit` | Jest unit tests |
| `make test-component` | Cypress component tests |
| `make test-integration` | Cypress integration tests |
| `make lint` | Lint all packages |
| `make pretty` | Prettier write |
| `make demo` | Run the `demo-saas` app |

Prettier runs as a pre-commit check (`prettier-check-hook`), so format before committing.

## Notes for agents

- This is a 2021-era toolchain: React 16, TypeScript 3.9, Rollup, node-sass, Lerna 3. Modern defaults will often be wrong here. Match the surrounding code.
