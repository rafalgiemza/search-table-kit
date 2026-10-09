import type { AnyBulkAction } from '../search-table/types.ts'
import type { ItemStatus } from './blocks/index.ts'
import { SendDialog } from './slots/SendDialog.tsx'

type WithStatus = { id: string; description: string; status: ItemStatus }

const finished = (row: WithStatus) => row.status !== 'sent' && row.status !== 'rejected'

/**
 * Shared actions for pages whose rows have a `status` (id, description and
 * status blocks). They are typed against that minimal row, then erased so a
 * page's own row type accepts them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StatusAction = AnyBulkAction<any, any>

export const sendAction = (): StatusAction => ({
  id: 'send',
  label: 'Send',
  isApplicable: finished,
  skippedReason: 'already sent or rejected',
  confirm: { type: 'dialog', Dialog: SendDialog },
})

export const rejectAction = (): StatusAction => ({
  id: 'reject',
  label: 'Reject',
  tone: 'danger',
  isApplicable: finished,
  skippedReason: 'already sent or rejected',
  confirm: { type: 'inline', message: 'Reject the selected items?', confirmLabel: 'Reject' },
})
