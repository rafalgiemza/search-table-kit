import type { DateFilterValue, IsoDate, QuickDateRange } from '../types.ts'

const iso = (d: Date): IsoDate => {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const addDays = (d: Date, days: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)

/** Resolves a symbolic range to a concrete one, relative to `today`. */
export const resolveQuickRange = (
  range: QuickDateRange,
  today: Date,
): Exclude<DateFilterValue, { condition: 'quick' | 'isEmpty' }> => {
  switch (range) {
    case 'today':
      return { condition: 'between', from: iso(today), to: iso(today) }
    case 'next7days':
      return { condition: 'between', from: iso(today), to: iso(addDays(today, 7)) }
    case 'beforeToday':
      return { condition: 'before', date: iso(today) }
    case 'thisMonth':
      return {
        condition: 'between',
        from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: iso(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      }
    case 'last30days':
      return { condition: 'between', from: iso(addDays(today, -30)), to: iso(today) }
  }
}
