import { useEffect, useState, type ComponentType } from 'react'
import type {
  DateFilterValue,
  FieldDef,
  FilterEditorProps,
  FilterKind,
  FilterKinds,
  FilterOption,
  QuickDateRange,
} from '../types.ts'
import { Check, Controls, Pill } from './styles.ts'

/** How a filter kind is edited, shown on a chip and recognised as empty. */
type KindUi<K extends FilterKind> = {
  Editor: ComponentType<FilterEditorProps<K>>
  format: (value: FilterKinds[K], field: FieldDef<K>) => string
  isEmpty: (value: FilterKinds[K]) => boolean
}

/** Registry: a new kind is one entry here (plus its entry in `FilterKinds`). */
export const filterKindUi: { [K in FilterKind]: KindUi<K> } = {
  text: {
    Editor: TextEditor,
    format: (v) => `${v.condition === 'equals' ? 'is' : 'contains'} "${v.value}"`,
    isEmpty: (v) => v.value.trim() === '',
  },
  multiSelect: {
    Editor: MultiSelectEditor,
    format: (v, field) =>
      `${v.condition === 'notIn' ? 'not ' : ''}${v.values.map((x) => optionLabel(field, x)).join(', ')}`,
    isEmpty: (v) => v.values.length === 0,
  },
  idList: {
    Editor: IdListEditor,
    format: (v) => `${v.values.length} id${v.values.length === 1 ? '' : 's'}`,
    isEmpty: (v) => v.values.length === 0,
  },
  date: {
    Editor: DateEditor,
    format: formatDate,
    isEmpty: (v) =>
      (v.condition === 'between' && !v.from && !v.to) ||
      ((v.condition === 'before' || v.condition === 'after') && !v.date),
  },
  boolean: {
    Editor: BooleanEditor,
    format: (v) => (v.value ? 'Yes' : 'No'),
    isEmpty: () => false,
  },
}

/** Erased lookup for code that handles any field. */
export const uiFor = (field: FieldDef) =>
  filterKindUi[field.kind] as unknown as KindUi<FilterKind> & {
    Editor: ComponentType<FilterEditorProps<FilterKind>>
  }

export const EditorFor = ({ field, ...rest }: FilterEditorProps<FilterKind>) => {
  const Editor = (field.editor ?? uiFor(field).Editor) as ComponentType<
    FilterEditorProps<FilterKind>
  >
  return <Editor field={field} {...rest} />
}

/* ---------------------------------- helpers --------------------------------- */

type WithOptions = Pick<FieldDef, 'options'>

const staticOptions = (field: WithOptions): readonly FilterOption[] =>
  Array.isArray(field.options) ? field.options : []

const optionLabel = (field: WithOptions, value: string) =>
  staticOptions(field).find((o) => o.value === value)?.label ?? value

const useOptions = (field: WithOptions) => {
  const [options, setOptions] = useState(staticOptions(field))
  useEffect(() => {
    if (typeof field.options === 'function') void field.options().then(setOptions)
  }, [field])
  return options
}

const quickLabels: Record<QuickDateRange, string> = {
  today: 'Today',
  next7days: 'Next 7 days',
  beforeToday: 'Before today',
  thisMonth: 'This month',
  last30days: 'Last 30 days',
}

function formatDate(v: DateFilterValue) {
  switch (v.condition) {
    case 'between':
      return `${v.from ?? '…'} – ${v.to ?? '…'}`
    case 'before':
      return `before ${v.date}`
    case 'after':
      return `after ${v.date}`
    case 'isEmpty':
      return 'is empty'
    case 'quick':
      return `${quickLabels[v.range]}${v.relative ? ' (relative)' : ''}`
  }
}

/* ---------------------------------- editors --------------------------------- */

function TextEditor({ value, onChange }: FilterEditorProps<'text'>) {
  const current = value ?? { condition: 'contains' as const, value: '' }
  return (
    <Controls>
      <select
        value={current.condition}
        onChange={(e) =>
          onChange({ ...current, condition: e.target.value as typeof current.condition })
        }
      >
        <option value="contains">contains</option>
        <option value="equals">equals</option>
      </select>
      <input
        autoFocus
        value={current.value}
        onChange={(e) => onChange({ ...current, value: e.target.value })}
      />
    </Controls>
  )
}

function MultiSelectEditor({ field, value, onChange }: FilterEditorProps<'multiSelect'>) {
  const options = useOptions(field)
  const current = value ?? { condition: 'in' as const, values: [] }
  const toggle = (v: string) =>
    onChange({
      ...current,
      values: current.values.includes(v)
        ? current.values.filter((x) => x !== v)
        : [...current.values, v],
    })
  return (
    <Controls $column>
      <select
        value={current.condition}
        onChange={(e) =>
          onChange({ ...current, condition: e.target.value as typeof current.condition })
        }
      >
        <option value="in">is any of</option>
        <option value="notIn">is none of</option>
      </select>
      {options.map((o) => (
        <Check key={o.value}>
          <input
            type="checkbox"
            checked={current.values.includes(o.value)}
            onChange={() => toggle(o.value)}
          />
          {o.label}
        </Check>
      ))}
    </Controls>
  )
}

/** Paste IDs separated by commas, spaces or new lines. */
const parseIds = (text: string) => text.split(/[\s,]+/).filter(Boolean)

function IdListEditor({ value, onChange }: FilterEditorProps<'idList'>) {
  const [text, setText] = useState(value?.values.join('\n') ?? '')
  const [prefix, setPrefix] = useState(value?.prefix ?? '')
  const emit = (nextText: string, nextPrefix: string) =>
    onChange({
      condition: 'in',
      values: parseIds(nextText),
      prefix: nextPrefix || undefined,
    })
  return (
    <Controls $column>
      <textarea
        autoFocus
        rows={5}
        placeholder="Paste IDs: commas, spaces or new lines"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          emit(e.target.value, prefix)
        }}
      />
      <input
        placeholder="Optional ID prefix, e.g. ITM-"
        value={prefix}
        onChange={(e) => {
          setPrefix(e.target.value)
          emit(text, e.target.value)
        }}
      />
    </Controls>
  )
}

function DateEditor({ field, value, onChange }: FilterEditorProps<'date'>) {
  const current: DateFilterValue = value ?? { condition: 'between' }
  const allowed = field.conditions ?? ['between', 'before', 'after', 'isEmpty', 'quick']
  const set = (condition: DateFilterValue['condition']) => {
    if (condition === 'between') onChange({ condition })
    else if (condition === 'isEmpty') onChange({ condition })
    else if (condition === 'quick')
      onChange({ condition, range: 'last30days', relative: true })
    else onChange({ condition, date: '' })
  }
  return (
    <Controls $column>
      <select value={current.condition} onChange={(e) => set(e.target.value as never)}>
        {allowed.map((c) => (
          <option key={c} value={c}>
            {c === 'isEmpty' ? 'is empty' : c === 'quick' ? 'quick range' : c}
          </option>
        ))}
      </select>
      {current.condition === 'between' && (
        <Controls>
          <input
            type="date"
            value={current.from ?? ''}
            onChange={(e) => onChange({ ...current, from: e.target.value || undefined })}
          />
          <input
            type="date"
            value={current.to ?? ''}
            onChange={(e) => onChange({ ...current, to: e.target.value || undefined })}
          />
        </Controls>
      )}
      {(current.condition === 'before' || current.condition === 'after') && (
        <input
          type="date"
          value={current.date}
          onChange={(e) => onChange({ ...current, date: e.target.value })}
        />
      )}
      {current.condition === 'quick' && (
        <>
          <Controls $wrap>
            {(Object.keys(quickLabels) as QuickDateRange[]).map((range) => (
              <Pill
                key={range}
                type="button"
                aria-pressed={current.range === range}
                onClick={() => onChange({ ...current, range })}
              >
                {quickLabels[range]}
              </Pill>
            ))}
          </Controls>
          <Check>
            <input
              type="checkbox"
              checked={current.relative}
              onChange={(e) => onChange({ ...current, relative: e.target.checked })}
            />
            Keep relative (recalculate each time)
          </Check>
        </>
      )}
    </Controls>
  )
}

function BooleanEditor({ value, onChange }: FilterEditorProps<'boolean'>) {
  return (
    <Controls>
      {[true, false].map((v) => (
        <Pill
          key={String(v)}
          type="button"
          aria-pressed={value?.value === v}
          onClick={() => onChange({ condition: 'is', value: v })}
        >
          {v ? 'Yes' : 'No'}
        </Pill>
      ))}
    </Controls>
  )
}
