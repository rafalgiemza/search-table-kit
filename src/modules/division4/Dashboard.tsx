import styled from 'styled-components'

const Wrap = styled.div`
  padding: 24px;
  color: var(--muted);
`

/** Placeholder; the real widgets land here once the division's data is defined. */
export function Dashboard() {
  return (
    <Wrap>
      <h2>Dashboard: Division 4</h2>
    </Wrap>
  )
}
