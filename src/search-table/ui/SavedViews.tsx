import { useState } from 'react'
import type { FieldMap, SavedView } from '../types.ts'
import { Popover } from './Popover.tsx'

type Props<TFields extends FieldMap> = {
  views: readonly SavedView<TFields>[]
  activeId: string
  defaultId: string
  dirty: boolean
  /** Ids of views the user saved; shipped views cannot be changed or deleted. */
  ownIds: ReadonlySet<string>
  counts: Readonly<Record<string, number | undefined>>
  onOpen: () => void
  onSelect: (id: string) => void
  onSaveNew: (name: string, withLayout: boolean) => void
  onUpdate: (withLayout: boolean) => void
  onDelete: (id: string) => void
  onSetDefault: (id: string) => void
  onReset: () => void
}

export function SavedViews<TFields extends FieldMap>({
  views,
  activeId,
  defaultId,
  dirty,
  ownIds,
  counts,
  onOpen,
  onSelect,
  onSaveNew,
  onUpdate,
  onDelete,
  onSetDefault,
  onReset,
}: Props<TFields>) {
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [withLayout, setWithLayout] = useState(false)
  const active = views.find((v) => v.id === activeId)
  const canUpdate = ownIds.has(activeId)

  const close = () => {
    setOpen(false)
    setNaming(false)
    setName('')
  }

  return (
    <div className="views">
      <div className="filter-anchor">
        <button
          type="button"
          className="btn"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => {
            if (!open) onOpen()
            setOpen(!open)
          }}
        >
          Saved views: <b>{active?.name}</b>
          {dirty && <span className="dot" title="Differs from the saved view" />}
        </button>

        {open && (
          <Popover onClose={close} align="right">
            <ul className="view-list" role="menu">
              {views.map((v) => (
                <li key={v.id} className={v.id === activeId ? 'is-active' : undefined}>
                  <button
                    type="button"
                    role="menuitem"
                    className="view-list__main"
                    onClick={() => {
                      onSelect(v.id)
                      close()
                    }}
                  >
                    <span>
                      {v.name}
                      {v.id === defaultId && <em> default</em>}
                    </span>
                    <span className="muted">{counts[v.id] ?? '…'}</span>
                  </button>
                  {v.id !== defaultId && (
                    <button
                      type="button"
                      className="link"
                      title="Open this view first"
                      onClick={() => onSetDefault(v.id)}
                    >
                      Make default
                    </button>
                  )}
                  {ownIds.has(v.id) && (
                    <button
                      type="button"
                      className="link link--danger"
                      aria-label={`Delete ${v.name}`}
                      onClick={() => onDelete(v.id)}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <div className="view-save">
              {naming ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!name.trim()) return
                    onSaveNew(name.trim(), withLayout)
                    close()
                  }}
                >
                  <input
                    autoFocus
                    placeholder="View name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={withLayout}
                      onChange={(e) => setWithLayout(e.target.checked)}
                    />
                    Also save sort, column order and widths
                  </label>
                  <div className="editor">
                    <button type="submit" className="btn" disabled={!name.trim()}>
                      Save
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => setNaming(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {canUpdate && (
                    <button
                      type="button"
                      className="btn"
                      disabled={!dirty}
                      onClick={() => {
                        onUpdate(withLayout || active?.sort !== undefined || active?.layout !== undefined)
                        close()
                      }}
                    >
                      Update “{active?.name}”
                    </button>
                  )}
                  <button type="button" className="btn" onClick={() => setNaming(true)}>
                    Save as new view…
                  </button>
                </>
              )}
            </div>
          </Popover>
        )}
      </div>

      {dirty && (
        <button type="button" className="btn btn--ghost" onClick={onReset}>
          Reset
        </button>
      )}
    </div>
  )
}
