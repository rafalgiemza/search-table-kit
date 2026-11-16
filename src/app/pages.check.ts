import { division1Page as division1 } from '#modules/division1/index.ts'
import { division2Page as division2 } from '#modules/division2/index.ts'

// Compile-time checks: row shapes and filter sets differ per division.
division1.getRowId({ id: '1', description: '', status: 'sent', machineLine: 'A' })
// @ts-expect-error division 2 has no status filter
void division2.fields.status
// @ts-expect-error notes is not a row property in division 1
division1.getRowId({ id: '1', description: '', status: 'sent', machineLine: 'A', notes: '' })
