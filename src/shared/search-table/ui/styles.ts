import styled, { css } from 'styled-components'

/** Primitives shared by the table and by page slots (dialogs, custom filter editors). */

/** Look of a text-like control (inputs, selects, textareas). */
export const fieldControl = css`
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 6px 8px;
`

export const Button = styled.button<{
  $tone?: 'default' | 'danger'
  $ghost?: boolean
  /** Accent-filled call to action; the caller decides which button it is. */
  $primary?: boolean
}>`
  padding: 6px 12px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  cursor: pointer;

  &:hover:not(:disabled) { border-color: var(--accent); }
  &:disabled { opacity: 0.5; cursor: default; }

  ${(p) => p.$ghost && css`background: transparent;`}
  ${(p) => p.$tone === 'danger' && css`color: var(--danger);`}
  ${(p) =>
    p.$primary &&
    css`
      background: var(--accent);
      color: var(--accent-ink);
      border-color: var(--accent);
    `}
`

export const LinkButton = styled.button<{ $danger?: boolean }>`
  background: none;
  border: 0;
  color: var(--accent);
  cursor: pointer;
  padding: 0;

  &:hover { text-decoration: underline; }

  ${(p) =>
    p.$danger &&
    css`
      color: var(--muted);
      padding: 0 6px;
      &:hover { color: var(--danger); text-decoration: none; }
    `}
`

export const Pill = styled.button`
  padding: 4px 10px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;

  &[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
`

/** A row (or column) of controls inside a popover or dialog. */
export const Controls = styled.div<{ $column?: boolean; $wrap?: boolean }>`
  display: flex;
  gap: 8px;
  align-items: center;

  ${(p) => p.$column && css`flex-direction: column; align-items: stretch;`}
  ${(p) => p.$wrap && css`flex-wrap: wrap;`}

  & input, & select, & textarea { ${fieldControl} }
`

export const Check = styled.label`
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
`

/** Positioning context for a popover opened from a button. */
export const Anchor = styled.div`
  position: relative;
`
