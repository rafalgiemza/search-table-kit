import { definePage, pageOptions } from '#shared/search-table/blocks.ts'
import { rejectAction } from '#shared/actions.ts'
import {
  descriptionBlock,
  idBlock,
  priorityBlock,
  statusBlock,
} from '#shared/blocks/index.ts'
import { SubmitBar } from '#shared/slots/SubmitBar.tsx'
import { RowDetailsDialog } from '#shared/slots/RowDetailsDialog.tsx'

const options = pageOptions({
  id: 'division-3',
  title: 'Division 3',
  idKey: 'id',
  blocks: [idBlock, descriptionBlock, statusBlock, priorityBlock],
  selection: { mode: 'multiple' },
  actions: [rejectAction()],
  extensions: {
    DetailsDialog: RowDetailsDialog,
    SelectionBar: SubmitBar,
    rowMenuItems: ({ rows, openDetails }) => [
      { name: 'Show details', action: () => openDetails(rows) },
    ],
  },
})

export const division3Page = definePage(options)
