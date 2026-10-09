import type { ItemStatus } from '../shared/blocks/index.ts'
import type { Priority } from '../shared/slots/PriorityCell.tsx'

/** Superset of every division's row; handlers project it to the page's keys. */
export type MockItem = {
  id: string
  description: string
  status: ItemStatus
  machineLine: string
  notes: string
  priority: Priority
}

const statuses: ItemStatus[] = ['draft', 'pending', 'sent', 'rejected']
const priorities: Priority[] = ['low', 'medium', 'high']
const lines = ['A', 'B', 'C', 'D']
const subjects = ['Weld seam', 'Paint cabin', 'Assemble frame', 'Quality check', 'Pack pallet']

/** Small seeded PRNG so every load (and every test) sees the same data. */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const generateItems = (count = 200, seed = 1): MockItem[] => {
  const rand = mulberry32(seed)
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!
  return Array.from({ length: count }, (_, i) => ({
    id: `ITM-${String(i + 1).padStart(3, '0')}`,
    description: `${pick(subjects)} #${i + 1}`,
    status: pick(statuses),
    machineLine: pick(lines),
    notes: rand() > 0.5 ? `Note for item ${i + 1}` : '',
    priority: pick(priorities),
  }))
}

/** Mutable in-memory store behind the handlers; swap it to simulate other data. */
export type MockDb = { items: MockItem[] }

export const createDb = (items: MockItem[] = generateItems()): MockDb => ({ items })
