import { useEffect, useState } from 'react'
import { activeFilterIds } from '../core/criteria.ts'
import type { SearchAction } from '../core/search-state.ts'
import type {
  FieldDef,
  FieldId,
  FieldMap,
  FilterKind,
  SearchCriteria,
  SearchPageConfig,
} from '../types.ts'
import { EditorFor, uiFor } from './filter-kinds.tsx'
import { Popover } from './Popover.tsx'

type Props<TFields extends FieldMap> = {
  config: Pick<SearchPageConfig<never, TFields>, 'fields'>
  criteria: SearchCriteria<TFields>
  dispatch: (action: SearchAction<TFields>) => void
  onClearAll: () => void
}

export function FilterBar<TFields extends FieldMap>({
  config,
  criteria,
  dispatch,
  onClearAll,
}: Props<TFields>) {
  type Id = FieldId<TFields>
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<Id | null>(null)
  const [searchText, setSearchText] = useState(criteria.search)

  // Debounced push of the search box into the criteria.
  useEffect(() => {
    if (searchText === criteria.search) return
    const t = setTimeout(() => dispatch({ type: 'search', text: searchText }), 250)
    return () => clearTimeout(t)
  }, [searchText, criteria.search, dispatch])

  // Criteria can change from outside (undo, saved view): adopt it while rendering.
  const [seenSearch, setSeenSearch] = useState(criteria.search)
  if (seenSearch !== criteria.search) {
    setSeenSearch(criteria.search)
    setSearchText(criteria.search)
  }

  const fields = config.fields as Record<Id, FieldDef>
  const active = activeFilterIds(criteria)
  const closeEditor = () => {
    setEditing(null)
    setPicking(false)
  }

  const commit = (id: Id, value: unknown) => {
    const ui = uiFor(fields[id])
    if (ui.isEmpty(value as never)) dispatch({ type: 'removeFilter', id })
    else dispatch({ type: 'setFilter', id, value: value as never })
  }

  const editor = (id: Id) => (
    <Popover onClose={closeEditor}>
      <EditorFor
        field={fields[id] as FieldDef<FilterKind>}
        value={criteria.filters[id] as never}
        onChange={(v) => commit(id, v)}
        onClose={closeEditor}
      />
    </Popover>
  )

  return (
    <div className="filter-bar">
      <input
        className="search-box"
        type="search"
        placeholder="Search by description"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      <div className="filter-anchor">
        <button type="button" className="btn" onClick={() => setPicking(true)}>
          + Filter
        </button>
        {picking && editing === null && (
          <Popover onClose={() => setPicking(false)}>
            <ul className="field-list">
              {(Object.keys(fields) as Id[]).map((id) => (
                <li key={id}>
                  <button type="button" onClick={() => setEditing(id)}>
                    <strong>{fields[id].label}</strong>
                    <span>{fields[id].hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Popover>
        )}
        {picking && editing !== null && !active.includes(editing) && editor(editing)}
      </div>

      {active.map((id) => {
        const field = fields[id]
        return (
          <div key={id} className="filter-anchor">
            <span className="chip">
              <button type="button" onClick={() => setEditing(id)}>
                <b>{field.label}</b> {uiFor(field).format(criteria.filters[id] as never, field)}
              </button>
              <button
                type="button"
                aria-label={`Remove ${field.label} filter`}
                onClick={() => dispatch({ type: 'removeFilter', id })}
              >
                ×
              </button>
            </span>
            {editing === id && editor(id)}
          </div>
        )
      })}

      {active.length > 0 && (
        <button type="button" className="btn btn--ghost" onClick={onClearAll}>
          Clear all
        </button>
      )}
    </div>
  )
}
