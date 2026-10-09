import { useEffect, useRef, type ReactNode } from 'react'

/** Closes its content on an outside click. */
export const Popover = ({
  onClose,
  children,
  align = 'left',
}: {
  onClose: () => void
  children: ReactNode
  align?: 'left' | 'right'
}) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} className={`popover popover--${align}`}>
      {children}
    </div>
  )
}
