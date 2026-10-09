import { pageOptions } from '../../search-table/blocks.ts'
import {
  descriptionBlock,
  idBlock,
  priorityBlock,
  statusBlock,
} from '../../shared/blocks/index.ts'
import { RowDetailsDialog } from '../../shared/slots/RowDetailsDialog.tsx'

export const division3PageConfig = pageOptions({
  id: 'division-3',
  title: 'Division 3',
  idKey: 'id',
  blocks: [idBlock, descriptionBlock, statusBlock, priorityBlock],
  selection: { mode: 'multiple' },
  extensions: { DetailsDialog: RowDetailsDialog },
})
