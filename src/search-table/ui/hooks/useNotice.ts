import { useCallback, useEffect, useState } from 'react'

export type Notice = { text: string; action?: { label: string; run: () => void } }

/** One toast at a time; it dismisses itself. */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const say = useCallback(
    (text: string, action?: Notice['action']) => setNotice({ text, action }),
    [],
  )
  const dismiss = useCallback(() => setNotice(null), [])
  return { notice, say, dismiss }
}
