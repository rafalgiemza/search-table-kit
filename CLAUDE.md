# CLAUDE.md

React 19 + TypeScript + Vite app: a config-driven **search table** (AG Grid Enterprise, server-side row model) used by several "division" pages. Data comes from an MSW mock backend in dev. 

## Commands (pnpm)

- `pnpm dev` – Vite dev server; MSW service worker starts automatically (DEV only, see `src/main.tsx`)
- `pnpm build` – `tsc -b && vite build`
- `pnpm lint` – oxlint (`.oxlintrc.json`)
- `pnpm test` – `node --test 'src/**/*.test.ts'` (Node's built-in runner, run directly on `.ts`; no Vitest/Jest)

Tests exist for `src/shared/search-table/core/` (`core.test.ts`, `table-logic.test.ts`) and `src/mocks/`. Relative imports must include the `.ts`/`.tsx` extension (Node + `allowImportingTsExtensions` style).

## Architecture

Modular monolith. Dependency direction: `app -> shell -> modules -> shared` (enforced by oxlint, see `.oxlintrc.json`). Code outside `src/shared` imports via subpath aliases `#shared/*`, `#modules/*`, `#shell/*`, `#app/*` (package.json `imports`, so Node's test runner resolves them too; include the `.ts(x)` extension). Code inside a zone uses relative imports.

```
src/
  app/                 composition root: App, AppProviders (QueryClient, HashRouter), AppRoutes, modules.ts (registry), pages.check.ts
  shell/               AppLayout (nav), ModuleErrorBoundary, PageSkeleton, GlobalStyle (CSS-variable tokens)
  modules/<name>/      one per division: config.ts (pageOptions + definePage), routes.tsx (lazy chunk), index.ts (AppModule manifest + page export = the ONLY public entry)
  shared/
    module-contract.ts AppModule interface (the shell knows only this)
    search-page/       SearchPage: wires createSearchApi + SearchTable for a page config
    api/search-api.ts  createSearchApi(division) -> { fetchRows, runAction } (POST /api/divisions/:division/...)
    blocks/, actions.ts, slots/   reusable blocks, bulk actions, custom cells/editors/dialogs
    search-table/      generic, page-agnostic table
      types.ts         all shared types (read first)
      blocks.ts        block(), pageOptions(), definePage()
      core/            headless logic: pure functions + reducer, no AG Grid, unit-tested
        criteria.ts, search-state.ts, selection.ts, match.ts, row-menu.ts, sort.ts, views.ts, dates.ts, island.ts
      ui/              React/AG Grid layer
        SearchTable.tsx  wiring only: composes the hooks below and renders
        hooks/           useServerData, useTableSelection, useSavedViews, useBulkActions, useNotice, useMatchingCount, useStableGridContext
        FilterBar, filter-kinds, SavedViews, ActionIsland, Popover, selection-column, columns.ts, context-menu.ts, ag-setup, layout.ts
        styles.ts        shared styled-components; also used by slots
  mocks/               dev-only MSW: db.ts, engine.ts, handlers.ts, browser.ts (reads pages from module indexes), tests
  main.tsx             starts MSW (opt-in via VITE_ENABLE_MOCKS), renders app/App
claude-design/         design prompt/spec (Items_search.html, chat.md) – reference only
```

Lint rules (oxlint `no-restricted-imports` overrides): `shared` never imports modules/shell/app; `shell` never imports modules/app; a module imports only `#shared` and its own files (never another module); `app` and `mocks` import a module only via `#modules/<name>/index.ts`. `import/no-cycle` is on.

### Key design ideas

- **Blocks compose pages.** A `Block` = row property + AG Grid column + optional filter. `definePage({ blocks, idKey, ...})` derives the row type (`RowOf`), filter-field map (`FieldsOf`), `columns`, `fields` and `getRowId`. Each division therefore gets its own row shape and filter set with full type inference. Use `pageOptions()` when keeping options in a separate file to preserve inference.
- **`FieldMap` typing.** Field id -> filter kind (`text`, `multiSelect`, `idList`, `date`, `boolean`), threaded as `TFields` through all types so filter ids are compile-checked. New filter kinds: extend `FilterKinds` via declaration merging and register a renderer in `ui/filter-kinds.tsx`.
- **Dumb table, smart parent.** `SearchTable` never fetches; it receives `config`, `fetchRows`, `runAction` (and optional `fetchViewCount`, `viewStorage`). `shared/search-page` builds these with `createSearchApi`.
- **Search contract.** `SearchQuery` = `{ search, filters, sort, startRow, endRow }` POSTed to the backend; relative date filters are resolved to `between` before sending. Response `{ rows, total }`.
- **Selection** is either explicit `ids` or `criteria` + `excludedIds`; `SelectionPolicy.selectableWhen` is the single rule: it disables rows in the grid (`isRowSelectable`) and is AND-ed into criteria mode, because the backend never sees rows there. `isSelectable` is only an escape hatch for rules a filter cannot express (grid-only).
- **Bulk actions** (`defineAction`) have `confirm` of `none` / `inline` / `dialog`; `isApplicable` rows are skipped and reported. The mock backend in `handlers.ts` owns the real applicability rules.
- **Saved views** are keyed by page id, versioned by `viewsSchemaVersion` (unknown filters dropped), stored in localStorage behind the `ViewStorage` interface (backend-swappable).
- **Per-page deviations** go only through `SearchPageExtensions` (`rowMenuItems`, `SelectionBar`, `DetailsDialog`); otherwise change the shared component rather than copy it.

### Adding a division page

1. Copy `src/modules/division1` to `src/modules/<name>`; in `config.ts` build `pageOptions({...})` from shared blocks (new blocks go to `shared/blocks/index.ts`) and export `definePage(options)`.
2. Rename the exports/ids in `index.ts` and `routes.tsx`; register the module in `app/modules.ts` (nav and routes follow automatically).
3. Add the page to the list in `mocks/browser.ts`; make sure `MockItem` in `mocks/db.ts` has every field its blocks use.

## Conventions

- ESM, strict TS (`tsconfig.app.json` for app, `tsconfig.test.json` for tests), no semicolons, single quotes, 2-space indent.
- Core logic stays pure/headless and gets tests in `core/*.test.ts`; keep AG Grid and React out of `core/` (only `types.ts` imports AG Grid *types*). Logic that used to live in `SearchTable.tsx` goes into `core/` as a pure function and is wired by a hook in `ui/hooks/`.
- Styling is styled-components, no `.css` files. Components read the tokens as `var(--…)` from `GlobalStyle`; variants are transient props (`$ghost`, `$tone`). Component-specific styled parts live at the top of their file, shared ones in `ui/styles.ts`. Page slots (dialogs, editors) import from `ui/styles.ts` rather than copying styles.
- Short doc comments explain the *why* (domain rules, extension points); follow that style.
