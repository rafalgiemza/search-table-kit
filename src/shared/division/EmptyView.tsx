import styled from 'styled-components'

const Empty = styled.div`
  padding: 24px;
  color: var(--muted);
`

export function EmptyView({ title }: { title: string }) {
  return (
    <Empty>
      <h2>{title}</h2>
    </Empty>
  )
}
