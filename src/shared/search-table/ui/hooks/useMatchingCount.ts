import { useEffect, useState } from 'react'
import { toQuery } from '../../core/criteria.ts'
import type { FetchRows, FieldMap, SearchCriteria } from '../../types.ts'

/** Number of rows matching `criteria`, via a zero-row query. */
export function useMatchingCount<TRow, TFields extends FieldMap>(
  criteria: SearchCriteria<TFields>,
  fetchRows: FetchRows<TRow, TFields>,
  enabled: boolean,
) {
  const key = JSON.stringify(criteria)
  const [result, setResult] = useState<{ key: string; total?: number }>()
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    fetchRows(toQuery(JSON.parse(key), { startRow: 0, endRow: 0 }), controller.signal)
      .then((r) => setResult({ key, total: r.total }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key })
      })
    return () => controller.abort()
  }, [key, enabled, fetchRows])
  const current = result?.key === key ? result : undefined
  return { total: current?.total, failed: current !== undefined && current.total === undefined }
}
