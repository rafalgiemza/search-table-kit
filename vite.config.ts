import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Project Pages are served from /<repo>/; set VITE_BASE in CI (dev stays at '/').
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
