export type Position = { x: number; y: number }
export type Size = { width: number; height: number }

/** Validates untrusted (e.g. localStorage) data; anything but two finite numbers is dropped. */
export const parsePosition = (raw: unknown): Position | null => {
  if (typeof raw !== 'object' || raw === null) return null
  const { x, y } = raw as Record<string, unknown>
  if (typeof x !== 'number' || typeof y !== 'number') return null
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

/** Keeps the element fully inside its container; if it does not fit, it sticks to the top-left corner. */
export const clampPosition = (pos: Position, container: Size, element: Size): Position => ({
  x: Math.min(Math.max(0, pos.x), Math.max(0, container.width - element.width)),
  y: Math.min(Math.max(0, pos.y), Math.max(0, container.height - element.height)),
})
