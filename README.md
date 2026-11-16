# search-table-kit

A config-driven **search table** built on AG Grid (server-side row model), with React 19, TypeScript and Vite. Several "division" pages share one table component; each page is described by a small config assembled from reusable blocks.

In development the backend is mocked with [MSW](https://mswjs.io), so no server is needed.

## Getting started

```sh
pnpm install
pnpm dev        # http://localhost:5173, pages at #/division-1, #/division-2, #/division-3
```

| Script       | What it does                              |
| ------------ | ----------------------------------------- |
| `pnpm dev`   | Vite dev server with the MSW mock backend |
| `pnpm build` | Type-check (`tsc -b`) and production build |
| `pnpm lint`  | Lint with Oxlint                          |
| `pnpm test`  | Unit tests via Node's built-in test runner |

## Features

- Always-visible search box plus a "+ Filter" picker with text, multi-select, ID-list (paste), date (ranges, quick ranges, relative) and boolean filters
- Filter chips, clear-all / reset with undo, and a helpful empty state
- Saved views (stored in localStorage, with shipped defaults, a default view and an "unsaved changes" indicator)
- Multi-column sorting, paging, and "select all matching" selection
- Bulk actions (Send, Reject) with inline or dialog confirmation, and a per-page right-click menu

## How it is organised

Modular monolith, dependency direction `app -> shell -> modules -> shared` (checked by `pnpm lint`).

```
src/
  app/       composition root: providers, module registry, routes
  shell/     layout/nav, error boundary, global styles
  modules/   one folder per division page; each exposes only index.ts
  shared/    search-table (generic table), blocks, actions, slots, api, search-page
  mocks/     MSW handlers, in-memory data, filter/sort engine (dev only)
```

A page is a list of **blocks** (row property + column + optional filter). `definePage` turns them into a fully typed config, so each division gets its own row shape and filter set. See [CLAUDE.md](CLAUDE.md) for the architecture in more detail.

## Adding a page

1. Copy `src/modules/division1` to `src/modules/<name>` and adapt `config.ts` (blocks from `src/shared/blocks`), `index.ts` and `routes.tsx`.
2. Register the module in `src/app/modules.ts`.
3. For the mock backend, add it to the page list in `src/mocks/browser.ts` and make sure `MockItem` in `src/mocks/db.ts` has every field its blocks use.
