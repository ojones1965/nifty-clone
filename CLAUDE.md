# Flow (nifty-clone)

Personal single-user reseller inventory dashboard. React 19 + Vite, hash
routing, plain CSS in src/index.css. localStorage is the working copy,
optionally synced to a small Node server (server/) that also serves an MCP
endpoint — no accounts, no sign-in.

## Commands

- `npm run dev` — Vite dev server
- `npm test` — vitest (tests/ run in node with a localStorage stub)
- `npm run lint` — oxlint
- `npm run build` — production build to dist/

## Deploy

Docker Compose on LLMServer (10.0.0.147:8089, Tailscale 100.105.58.19:8089):
nginx container `nifty-clone` serving dist/ and proxying /api and /mcp to the
`nifty-clone-server` Node container. See DEPLOY.md for the one-liner: build
locally, rsync, `docker compose up -d --build` on the server.

## Key decisions

- Single user: all data under one localStorage key (`resell_data_local`).
- The store is split by domain in src/lib/*; pages import only from the
  src/lib/store.js barrel — keep it that way.
- Pages re-render via `useStoreVersion()` (useSyncExternalStore); don't add
  manual tick subscriptions.
- server/ reuses src/lib unchanged via a file-backed localStorage shim; it
  imports only from src/lib/store.js and src/lib/data.js. Business rules
  never live in server/. Intra-src/lib imports keep their `.js` extensions
  so Node can load them.
- Sync (src/lib/sync.js) mirrors the localStorage blob to the server; the
  store never awaits the network.
- Theme is the "2b" editorial direction (ochre + Newsreader) via tokens in
  src/index.css `:root` — use existing tokens, don't invent colors.
- Workflow is direct pushes to main; no PRs.
