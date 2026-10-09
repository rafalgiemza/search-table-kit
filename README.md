# neb-todoist

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

```
src/
  search-table/   generic table: types, block composition, headless core/, ui/
  divisions/      one config per page, plus the page registry
  shared/         reusable blocks, bulk actions, custom cells and dialogs
  api/            fetch callbacks handed to the table
  mocks/          MSW handlers, in-memory data, filter/sort engine
```

A page is a list of **blocks** (row property + column + optional filter). `definePage` turns them into a fully typed config, so each division gets its own row shape and filter set. See [CLAUDE.md](CLAUDE.md) for the architecture in more detail.

## Adding a page

1. Create `src/divisions/<name>/config.ts` with `pageOptions({ id, title, idKey, blocks, ... })`, reusing blocks from `src/shared/blocks`.
2. Register it in `src/divisions/pages.ts` (`definePage`) and `src/divisions/registry.ts`.
3. For the mock backend, add it to the page list in `src/mocks/browser.ts` and make sure `MockItem` in `src/mocks/db.ts` has every field its blocks use.
