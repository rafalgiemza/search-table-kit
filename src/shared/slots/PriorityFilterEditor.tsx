import type { FilterEditorProps } from '../../search-table/types.ts'

const levels = ['low', 'medium', 'high'] as const

/** Toggle buttons instead of a checkbox list: one click per level. */
export const PriorityFilterEditor = ({
  value,
  onChange,
  onClose,
}: FilterEditorProps<'multiSelect'>) => {
  const selected = value?.values ?? []

  const toggle = (level: string) =>
    onChange({
      condition: 'in',
      values: selected.includes(level)
        ? selected.filter((v) => v !== level)
        : [...selected, level],
    })

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {levels.map((level) => (
        <button
          key={level}
          type="button"
          aria-pressed={selected.includes(level)}
          onClick={() => toggle(level)}
        >
          {level}
        </button>
      ))}
      <button type="button" onClick={onClose}>
        Done
      </button>
    </div>
  )
}
