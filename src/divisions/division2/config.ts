import { pageOptions } from '../../search-table/blocks.ts'
import { descriptionBlock, idBlock, notesBlock } from '../../shared/blocks/index.ts'

export const division2PageConfig = pageOptions({
  id: 'division-2',
  title: 'Division 2',
  idKey: 'id',
  blocks: [idBlock, descriptionBlock, notesBlock],
})
