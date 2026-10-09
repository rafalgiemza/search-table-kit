import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { createSearchApi } from './api/search-api.ts'
import { GlobalStyle } from './GlobalStyle.ts'
import { pages, type AnyPage } from './divisions/registry.ts'
import { SearchTable } from './search-table/ui/SearchTable.tsx'

const Shell = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  height: 100vh;
  min-width: 1280px;
`
const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 10px;
  background: var(--panel);
  border-right: 1px solid var(--border);
`
const NavBrand = styled.div`
  padding: 4px 10px 14px;
  font-weight: 700;
  color: var(--accent);
`
const NavLink = styled.a`
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--muted);
  text-decoration: none;

  &:hover { color: var(--text); background: var(--panel-2); }
  &[aria-current='page'] {
    color: var(--text);
    background: var(--panel-2);
    box-shadow: inset 2px 0 var(--accent);
  }
`
const Main = styled.main`
  min-width: 0;
  min-height: 0;
`

const currentId = () => location.hash.replace(/^#\//, '') || pages[0]!.id

const useHashRoute = () => {
  const [id, setId] = useState(currentId)
  useEffect(() => {
    const sync = () => setId(currentId())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return id
}

/** The parent owns data access; the table only receives callbacks. */
const DivisionPage = ({ page }: { page: AnyPage }) => {
  const api = useMemo(() => createSearchApi(page.id), [page.id])
  return <SearchTable config={page} fetchRows={api.fetchRows} runAction={api.runAction} />
}

export default function App() {
  const id = useHashRoute()
  const page = pages.find((p) => p.id === id) ?? pages[0]!

  return (
    <Shell>
      <GlobalStyle />
      <Nav aria-label="Divisions">
        <NavBrand>Factory</NavBrand>
        {pages.map((p) => (
          <NavLink key={p.id} href={`#/${p.id}`} aria-current={p.id === page.id ? 'page' : undefined}>
            {p.title}
          </NavLink>
        ))}
      </Nav>
      <Main>
        <DivisionPage key={page.id} page={page} />
      </Main>
    </Shell>
  )
}
