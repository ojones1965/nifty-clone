import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative paths so the built app works at the domain root OR in any
  // subfolder (e.g. https://your-server/apps/flow/) on any static server.
  base: './',
  plugins: [react()],
  // Lets `npm run dev` talk to a locally running server
  // (FLOW_TOKEN=... PORT=3100 node server/index.js).
  server: {
    proxy: {
      '/api': 'http://localhost:3100',
      '/mcp': 'http://localhost:3100',
    },
  },
})
