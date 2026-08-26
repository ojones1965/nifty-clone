# Flow (nifty-clone)

Personal single-user reseller inventory dashboard. React 19 + Vite, hash
routing, plain CSS in src/index.css, localStorage persistence — no backend,
no auth, no sign-in.

## Commands

- `npm run dev` — Vite dev server
- `npm test` — vitest (tests/ run in node with a localStorage stub)
- `npm run lint` — oxlint
- `npm run build` — production build to dist/

## Deploy

Static nginx container `nifty-clone` on LLMServer (10.0.0.147:8089), reachable
via Tailscale at 100.105.58.19:8089. See DEPLOY.md for the one-liner: build
locally, rsync Dockerfile/nginx.conf/dist, docker build+run on the server.

## Key decisions

- Single user: all data under one localStorage key (`resell_data_local`).
- The store is split by domain in src/lib/*; pages import only from the
  src/lib/store.js barrel — keep it that way.
- Pages re-render via `useStoreVersion()` (useSyncExternalStore); don't add
  manual tick subscriptions.
- Theme is the "2b" editorial direction (ochre + Newsreader) via tokens in
  src/index.css `:root` — use existing tokens, don't invent colors.
- Workflow is direct pushes to main; no PRs.
