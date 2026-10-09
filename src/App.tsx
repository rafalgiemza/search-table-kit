import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createSearchApi } from './api/search-api.ts'
import { pages, type AnyPage } from './divisions/registry.ts'
import { SearchTable } from './search-table/ui/SearchTable.tsx'

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
    <div className="shell">
      <nav className="nav" aria-label="Divisions">
        <div className="nav__brand">Factory</div>
        {pages.map((p) => (
          <a key={p.id} href={`#/${p.id}`} aria-current={p.id === page.id ? 'page' : undefined}>
            {p.title}
          </a>
        ))}
      </nav>
      <main className="main">
        <DivisionPage key={page.id} page={page} />
      </main>
    </div>
  )
}
