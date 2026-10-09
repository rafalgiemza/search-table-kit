import { block } from '../../search-table/blocks.ts'
import { PriorityCell, type Priority } from '../slots/PriorityCell.tsx'
import { PriorityFilterEditor } from '../slots/PriorityFilterEditor.tsx'

export type ItemStatus = 'draft' | 'pending' | 'sent' | 'rejected'

export const idBlock = block<string>()({
  key: 'id',
  column: { headerName: 'ID', width: 110 },
  filter: { kind: 'idList', label: 'ID', hint: 'paste a list' },
})

export const descriptionBlock = block<string>()({
  key: 'description',
  column: { headerName: 'Description', flex: 1 },
  filter: { kind: 'text', label: 'Description', hint: 'contains text' },
})

export const statusBlock = block<ItemStatus>()({
  key: 'status',
  column: { headerName: 'Done', width: 130 },
  filter: {
    kind: 'multiSelect',
    label: 'Done',
    hint: 'pick one or more',
    options: [
      { value: 'draft', label: 'Draft', tone: 'neutral' },
      { value: 'pending', label: 'Pending', tone: 'warning' },
      { value: 'sent', label: 'Sent', tone: 'success' },
      { value: 'rejected', label: 'Rejected', tone: 'danger' },
    ],
  },
})

export const machineLineBlock = block<string>()({
  key: 'machineLine',
  column: { headerName: 'Line', width: 120 },
  filter: { kind: 'multiSelect', label: 'Line', hint: 'pick one or more' },
})

export const notesBlock = block<string>()({
  key: 'notes',
  column: { headerName: 'Notes', flex: 1 },
})

export const priorityBlock = block<Priority>()({
  key: 'priority',
  column: { headerName: 'Priority', width: 120, cellRenderer: PriorityCell },
  filter: {
    kind: 'multiSelect',
    label: 'Priority',
    hint: 'toggle levels',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ],
    editor: PriorityFilterEditor,
  },
})
