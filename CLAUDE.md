# CLAUDE.md

React 19 + TypeScript + Vite app: a config-driven **search table** (AG Grid Enterprise, server-side row model) used by several "division" pages. Data comes from an MSW mock backend in dev. `README.md` is the unmodified Vite template; ignore it.

## Commands (pnpm)

- `pnpm dev` – Vite dev server; MSW service worker starts automatically (DEV only, see `src/main.tsx`)
- `pnpm build` – `tsc -b && vite build`
- `pnpm lint` – oxlint (`.oxlintrc.json`)
- `pnpm test` – `node --test 'src/**/*.test.ts'` (Node's built-in runner, run directly on `.ts`; no Vitest/Jest)

Tests exist for `src/search-table/core/` and `src/mocks/`. Relative imports must include the `.ts`/`.tsx` extension (Node + `allowImportingTsExtensions` style).

## Architecture

```
src/
  search-table/        generic, page-agnostic table
    types.ts           all shared types (read first)
    blocks.ts          block(), pageOptions(), definePage()
    core/              headless logic: pure functions + reducer, no AG Grid, unit-tested
      criteria.ts      criteria/filter manipulation, toQuery, withPredicate
      search-state.ts  searchReducer + useSearchState (search, filters, sort, undo)
      selection.ts     ids vs "select all matching" (criteria + excludedIds)
      views.ts         saved views, dirty check, default resolution, localStorage storage
      dates.ts         quick/relative date range resolution
    ui/                React/AG Grid layer
      SearchTable.tsx  main component (largest file)
      FilterBar, filter-kinds, SavedViews, ActionIsland, Popover, selection-column, ag-setup, layout.ts, search-table.css
  divisions/           pages: one folder per division with config.ts
    pages.ts           definePage(...) for each division
    registry.ts        `pages` array used by the shell/nav
    pages.check.ts     compile-time type assertions (@ts-expect-error) – checked by `tsc -b`
  shared/
    blocks/index.ts    reusable blocks (id, description, status, machineLine, notes, priority)
    actions.ts         sendAction / rejectAction (bulk actions)
    slots/             custom cells, filter editors, dialogs
  api/search-api.ts    createSearchApi(division) -> { fetchRows, runAction } (POST /api/divisions/:division/...)
  mocks/               MSW: db.ts (data), engine.ts (filter/sort/window), handlers.ts, browser.ts, tests
  App.tsx              hash router (`#/<page-id>`) + nav; renders <SearchTable> per page
claude-design/         design prompt/spec (Items_search.html, chat.md) – reference only
```

### Key design ideas

- **Blocks compose pages.** A `Block` = row property + AG Grid column + optional filter. `definePage({ blocks, idKey, ...})` derives the row type (`RowOf`), filter-field map (`FieldsOf`), `columns`, `fields` and `getRowId`. Each division therefore gets its own row shape and filter set with full type inference. Use `pageOptions()` when keeping options in a separate file to preserve inference.
- **`FieldMap` typing.** Field id -> filter kind (`text`, `multiSelect`, `idList`, `date`, `boolean`), threaded as `TFields` through all types so filter ids are compile-checked. New filter kinds: extend `FilterKinds` via declaration merging and register a renderer in `ui/filter-kinds.tsx`.
- **Dumb table, smart parent.** `SearchTable` never fetches; it receives `config`, `fetchRows`, `runAction` (and optional `fetchViewCount`, `viewStorage`). `App.tsx` builds these with `createSearchApi`.
- **Search contract.** `SearchQuery` = `{ search, filters, sort, startRow, endRow }` POSTed to the backend; relative date filters are resolved to `between` before sending. Response `{ rows, total }`.
- **Selection** is either explicit `ids` or `criteria` + `excludedIds`; `SelectionPolicy.criteriaPredicate` mirrors `isSelectable` as a filter because the backend never sees rows in criteria mode.
- **Bulk actions** (`defineAction`) have `confirm` of `none` / `inline` / `dialog`; `isApplicable` rows are skipped and reported. The mock backend in `handlers.ts` owns the real applicability rules.
- **Saved views** are keyed by page id, versioned by `viewsSchemaVersion` (unknown filters dropped), stored in localStorage behind the `ViewStorage` interface (backend-swappable).
- **Per-page deviations** go only through `SearchPageExtensions` (`rowMenuItems`, `SelectionBar`, `DetailsDialog`); otherwise change the shared component rather than copy it.

### Adding a division page

1. Create `src/divisions/<name>/config.ts` exporting `pageOptions({...})` from shared blocks (add new blocks in `shared/blocks/index.ts`).
2. Wrap with `definePage` in `divisions/pages.ts` and add it to `registry.ts`.
3. Add it to the hardcoded `pages` list in `src/mocks/browser.ts` (row keys are derived from the page's columns) and make sure `MockItem` in `mocks/db.ts` has every field its blocks use.

## Conventions

- ESM, strict TS (`tsconfig.app.json` for app, `tsconfig.test.json` for tests), no semicolons, single quotes, 2-space indent.
- Core logic stays pure/headless and gets tests in `core.test.ts`; keep AG Grid and React out of `core/`.
- Short doc comments explain the *why* (domain rules, extension points); follow that style.
