import { definePage, pageOptions } from '#shared/search-table/blocks.ts'
import { descriptionBlock, idBlock, notesBlock } from '#shared/blocks/index.ts'

const options = pageOptions({
  id: 'division-2',
  title: 'Division 2',
  idKey: 'id',
  blocks: [idBlock, descriptionBlock, notesBlock],
})

export const division2Page = definePage(options)
