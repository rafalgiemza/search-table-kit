import { useEffect, useState } from 'react'
import styled from 'styled-components'
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
import { Anchor, Button } from './styles.ts'

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`
const SearchBox = styled.input`
  min-width: 260px;
  padding: 7px 10px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
`
const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;

  & button { background: none; border: 0; color: var(--text); padding: 5px 10px; cursor: pointer; }
  & button:last-child { color: var(--muted); padding-left: 4px; }
  & button:last-child:hover { color: var(--danger); }
  & b { color: var(--accent); font-weight: 600; }
`
const FieldList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;

  & button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 7px 8px;
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }
  & button:hover { background: var(--panel-2); }
  & span { color: var(--muted); font-size: 12px; }
`

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
    <Bar>
      <SearchBox
        type="search"
        placeholder="Search by description"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      <Anchor>
        <Button type="button" onClick={() => setPicking(true)}>
          + Filter
        </Button>
        {picking && editing === null && (
          <Popover onClose={() => setPicking(false)}>
            <FieldList>
              {(Object.keys(fields) as Id[]).map((id) => (
                <li key={id}>
                  <button type="button" onClick={() => setEditing(id)}>
                    <strong>{fields[id].label}</strong>
                    <span>{fields[id].hint}</span>
                  </button>
                </li>
              ))}
            </FieldList>
          </Popover>
        )}
        {picking && editing !== null && !active.includes(editing) && editor(editing)}
      </Anchor>

      {active.map((id) => {
        const field = fields[id]
        return (
          <Anchor key={id}>
            <Chip>
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
            </Chip>
            {editing === id && editor(id)}
          </Anchor>
        )
      })}

      {active.length > 0 && (
        <Button type="button" $ghost onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </Bar>
  )
}
