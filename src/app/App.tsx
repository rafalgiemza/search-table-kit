import { GlobalStyle } from '#shell/GlobalStyle.ts'
import { AppRoutes } from './AppRoutes.tsx'
import { AppProviders } from './providers/AppProviders.tsx'

export default function App() {
  return (
    <AppProviders>
      <GlobalStyle />
      <AppRoutes />
    </AppProviders>
  )
}
