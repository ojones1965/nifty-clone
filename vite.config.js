import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative paths so the built app works at the domain root OR in any
  // subfolder (e.g. https://your-server/apps/flow/) on any static server.
  base: './',
  plugins: [react()],
})
