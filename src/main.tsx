import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const enableMocks = async () => {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser.ts')
  await worker.start()
}

enableMocks().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
