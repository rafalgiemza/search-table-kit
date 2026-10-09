import type { SearchPageConfig } from '../search-table/types.ts'
import { division1, division2, division3 } from './pages.ts'

/** Pages have different row shapes; the shell only needs the common surface. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPage = SearchPageConfig<any, any>

export const pages: readonly AnyPage[] = [division1, division2, division3]
