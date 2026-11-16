import { useMemo } from 'react'
import { createSearchApi } from '../api/search-api.ts'
import type { SearchPageConfig } from '../search-table/types.ts'
import { SearchTable } from '../search-table/ui/SearchTable.tsx'

/** Pages have different row shapes; consumers only need the common surface. */
// oxlint-disable-next-line typescript/no-explicit-any
export type AnyPage = SearchPageConfig<any, any>

/** The parent owns data access; the table only receives callbacks. */
export function SearchPage({ page }: { page: AnyPage }) {
  const api = useMemo(() => createSearchApi(page.id), [page.id])
  return <SearchTable config={page} fetchRows={api.fetchRows} runAction={api.runAction} />
}
