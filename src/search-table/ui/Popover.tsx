import { useEffect, useRef, type ReactNode } from 'react'
import styled, { css } from 'styled-components'

const Panel = styled.div<{ $align: 'left' | 'right' }>`
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  left: 0;
  min-width: 240px;
  padding: 10px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);

  ${(p) => p.$align === 'right' && css`left: auto; right: 0;`}
`

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
    <Panel ref={ref} $align={align}>
      {children}
    </Panel>
  )
}
