import type { CustomCellRendererProps } from 'ag-grid-react'

export type Priority = 'low' | 'medium' | 'high'

const colors: Record<Priority, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
}

export const PriorityCell = ({ value }: CustomCellRendererProps<unknown, Priority>) =>
  value ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{ width: 8, height: 8, borderRadius: '50%', background: colors[value] }}
      />
      {value}
    </span>
  ) : null
