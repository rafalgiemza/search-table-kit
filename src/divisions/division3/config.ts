import { pageOptions } from '../../search-table/blocks.ts'
import { rejectAction } from '../../shared/actions.ts'
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
  actions: [rejectAction()],
  extensions: {
    DetailsDialog: RowDetailsDialog,
    rowMenuItems: ({ rows, openDetails }) => [
      { name: 'Show details', action: () => openDetails(rows) },
    ],
  },
})
