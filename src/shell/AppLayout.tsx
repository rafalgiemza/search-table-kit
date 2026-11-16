import { NavLink, Outlet } from 'react-router-dom'
import styled from 'styled-components'
import type { AppModule } from '#shared/module-contract.ts'

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
const NavItem = styled(NavLink)`
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--muted);
  text-decoration: none;

  &:hover { color: var(--text); background: var(--panel-2); }
  &.active {
    color: var(--text);
    background: var(--panel-2);
    box-shadow: inset 2px 0 var(--accent);
  }
`
const Main = styled.main`
  min-width: 0;
  min-height: 0;
`

/** Injected by app/: the shell never imports modules itself. */
export function AppLayout({ modules }: { modules: AppModule[] }) {
  const sorted = [...modules].sort((a, b) => (a.nav.order ?? 0) - (b.nav.order ?? 0))
  return (
    <Shell>
      <Nav aria-label="Divisions">
        <NavBrand>Factory</NavBrand>
        {sorted.map((m) => (
          <NavItem key={m.id} to={m.basePath}>
            {m.nav.label}
          </NavItem>
        ))}
      </Nav>
      <Main>
        <Outlet />
      </Main>
    </Shell>
  )
}
