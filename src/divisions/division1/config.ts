import { pageOptions } from '../../search-table/blocks.ts'
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
  selection: {
    mode: 'multiple',
    isSelectable: (row) => row.status === 'sent',
    criteriaPredicate: { status: { condition: 'in', values: ['sent'] } },
  },
})
