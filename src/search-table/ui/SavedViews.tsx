import { useState } from 'react'
import styled from 'styled-components'
import type { FieldMap, SavedView } from '../types.ts'
import { Popover } from './Popover.tsx'
import { Anchor, Button, Check, Controls, LinkButton, fieldControl } from './styles.ts'

const Views = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`
const Dot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 8px;
  border-radius: 50%;
  background: var(--warning);
`
const Muted = styled.span`
  color: var(--muted);
`
const ViewList = styled.ul`
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  min-width: 300px;

  & em { color: var(--accent); font-size: 12px; font-style: normal; margin-left: 6px; }
`
const ViewItem = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 6px;

  ${(p) => p.$active && 'background: var(--panel-2); box-shadow: inset 2px 0 var(--accent);'}
`
const ViewMain = styled.button`
  flex: 1;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 8px;
  background: none;
  border: 0;
  color: var(--text);
  cursor: pointer;
  text-align: left;
`
const ViewSave = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--border);
  padding-top: 10px;

  & form { display: flex; flex-direction: column; gap: 8px; }
  & input[type='text'], & input:not([type]) { ${fieldControl} }
`

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
    <Views>
      <Anchor>
        <Button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => {
            if (!open) onOpen()
            setOpen(!open)
          }}
        >
          Saved views: <b>{active?.name}</b>
          {dirty && <Dot title="Differs from the saved view" />}
        </Button>

        {open && (
          <Popover onClose={close} align="right">
            <ViewList role="menu">
              {views.map((v) => (
                <ViewItem key={v.id} $active={v.id === activeId}>
                  <ViewMain
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelect(v.id)
                      close()
                    }}
                  >
                    <span>
                      {v.name}
                      {v.id === defaultId && <em> default</em>}
                    </span>
                    <Muted>{counts[v.id] ?? '…'}</Muted>
                  </ViewMain>
                  {v.id !== defaultId && (
                    <LinkButton
                      type="button"
                      title="Open this view first"
                      onClick={() => onSetDefault(v.id)}
                    >
                      Make default
                    </LinkButton>
                  )}
                  {ownIds.has(v.id) && (
                    <LinkButton
                      type="button"
                      $danger
                      aria-label={`Delete ${v.name}`}
                      onClick={() => onDelete(v.id)}
                    >
                      ×
                    </LinkButton>
                  )}
                </ViewItem>
              ))}
            </ViewList>

            <ViewSave>
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
                  <Check>
                    <input
                      type="checkbox"
                      checked={withLayout}
                      onChange={(e) => setWithLayout(e.target.checked)}
                    />
                    Also save sort, column order and widths
                  </Check>
                  <Controls>
                    <Button type="submit" disabled={!name.trim()}>
                      Save
                    </Button>
                    <Button type="button" $ghost onClick={() => setNaming(false)}>
                      Cancel
                    </Button>
                  </Controls>
                </form>
              ) : (
                <>
                  {canUpdate && (
                    <Button
                      type="button"
                      disabled={!dirty}
                      onClick={() => {
                        onUpdate(withLayout || active?.sort !== undefined || active?.layout !== undefined)
                        close()
                      }}
                    >
                      Update “{active?.name}”
                    </Button>
                  )}
                  <Button type="button" onClick={() => setNaming(true)}>
                    Save as new view…
                  </Button>
                </>
              )}
            </ViewSave>
          </Popover>
        )}
      </Anchor>

      {dirty && (
        <Button type="button" $ghost onClick={onReset}>
          Reset
        </Button>
      )}
    </Views>
  )
}
