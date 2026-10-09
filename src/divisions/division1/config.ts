import { pageOptions } from '../../search-table/blocks.ts'
import { rejectAction, sendAction } from '../../shared/actions.ts'
import {
  descriptionBlock,
  idBlock,
  machineLineBlock,
  statusBlock,
} from '../../shared/blocks/index.ts'

export const division1PageConfig = pageOptions({
  id: 'division-1',
  title: 'Division 1',
  idKey: 'id',
  blocks: [idBlock, descriptionBlock, statusBlock, machineLineBlock],
  actions: [sendAction(), rejectAction()],
  selection: {
    mode: 'multiple',
    isSelectable: (row) => row.status === 'draft' || row.status === 'pending',
    criteriaPredicate: { status: { condition: 'in', values: ['draft', 'pending'] } },
  },
})
