# Shared data server + MCP endpoint

Date: 2026-09-08. Status: approved in chat, implementation follows.

## Goal

Let Claude (and any other MCP client) read and edit the Flow inventory through
an MCP endpoint hosted on LLMServer, while the dashboard and the MCP server
always see the same data.

## Non-goals

- Multi-user, accounts, or per-device data.
- An in-app AI assistant. Nothing here blocks it; it is a later project.
- Conflict resolution beyond last-write-wins.
- Exposing the endpoint to the public internet.

## Architecture

Two containers on LLMServer, managed by one compose file, one published port.

```
browser ──► nginx :8089 ──┬── /            static dist/
                          ├── /api/data    ──► flow-server:3000
                          └── /mcp         ──► flow-server:3000
Claude Code / LibreChat ──► http://100.105.58.19:8089/mcp
```

`flow-server` is a single Node 22 process. It owns `/data/flow-data.json`,
serves the data API, and serves the MCP endpoint. Only nginx publishes a port;
port 8090 is already taken on the host and nothing needs it.

## Server (`server/`)

- `server/file-storage.js` — a `localStorage`-compatible object backed by a
  JSON file. `getItem`/`setItem`/`removeItem`/`clear`. Writes go to a temp
  file then `rename`, so a crash never leaves a half-written file. The file
  holds a map of key → string, exactly like the test stub, so the store
  modules run unchanged.
- `server/app.js` — builds and returns the Express app (exported for tests):
  - `GET /healthz` → `{ ok: true }`, no auth.
  - `GET /api/data` → the merged data blob from `getData()`.
  - `PUT /api/data` → body is a data blob; `saveData(body)`; responds `{ ok: true }`.
    Body limit 5 MB (photos are URLs, not blobs).
  - `POST|GET|DELETE /mcp` → stateless `StreamableHTTPServerTransport`
    (`sessionIdGenerator: undefined`, `enableJsonResponse: true`) so
    responses are plain JSON and nginx needs no SSE tuning.
  - Every route except `/healthz` requires `Authorization: Bearer <FLOW_TOKEN>`.
    Missing or wrong → `401 { error: "unauthorized" }`. If `FLOW_TOKEN` is
    unset the process refuses to start.
- `server/mcp.js` — `createMcpServer()` registering the tools below on
  `McpServer` from `@modelcontextprotocol/sdk` v1.
- `server/index.js` — installs the file shim as `globalThis.localStorage`
  **before** importing the store, then listens on `PORT` (default 3000).
- `server/package.json` — `type: module`; deps `@modelcontextprotocol/sdk`,
  `express`, `zod`. `server/Dockerfile` — `node:22-alpine`, `npm ci --omit=dev`,
  copies `server/` and `src/lib/` so `../src/lib/store.js` resolves.

The server reuses `src/lib/store.js` as-is. All business rules (sanitizing,
lifecycle, order creation on sale) stay in one place.

## MCP tools

Names are `flow_<verb>_<noun>`. Every tool has `title`, `description`,
Zod `inputSchema`, and `annotations`. Results return both `content` (JSON
text) and `structuredContent`.

| Tool | Wraps | Annotations |
|------|-------|-------------|
| `flow_list_items` (status?) | `listItems` | readOnly |
| `flow_get_item` (id) | `getItem` | readOnly |
| `flow_create_item` (title, description?, price?, costOfGoods?, marketplaces?, readyToList?) | `createItem` | — |
| `flow_update_item` (id, patch of the same fields) | `updateItem` | idempotent |
| `flow_delete_item` (id) | `deleteItem` | destructive |
| `flow_mark_listed` (id) | `listItem` | idempotent |
| `flow_mark_sold` (id, salePrice, marketplace, fees?, shippingFee?, shippingExpense?, date?) | `markSold` | — |
| `flow_list_orders` (from?, to?) | `listOrders` / `ordersInRange` | readOnly |
| `flow_list_expenses` (from?, to?) | `listExpenses` / `expensesInRange` | readOnly |
| `flow_add_expense` (date, description, category, amount) | `addExpense` | — |
| `flow_delete_expense` (id) | `deleteExpense` | destructive |
| `flow_get_goals` | `getGoals` | readOnly |
| `flow_set_goals` (monthlyRevenue?, monthlySales?) | `setGoals` | idempotent |
| `flow_summary` (from, to) | computed | readOnly |

`flow_summary` returns `{ from, to, sales, revenue, fees, shipping, cogs,
expenses, profit }` where revenue is the sum of `salePrice`, and profit is
revenue − fees − shippingExpense − cogs − expenses. Dates are `YYYY-MM-DD`;
`from`/`to` are inclusive.

Errors: unknown id → `isError: true` with a message naming the id and
suggesting `flow_list_items`. Invalid marketplace/category → message listing
the valid values from `constants.js`.

## App changes (`src/`)

localStorage stays the synchronous working copy. No page or hook changes.

- `src/lib/sync.js`
  - `getSyncToken()` / `setSyncToken(token)` — stored under
    `resell_sync_token`. Empty token means sync is off and the app behaves
    exactly as today.
  - `pullFromServer()` — `GET /api/data`. On 200, write the blob under
    `DATA_KEY` and `notify()`. **Migration:** if the server blob has no items,
    orders, or expenses and the local blob has any, push local instead of
    overwriting it.
  - `pushToServer(data)` — debounced 300 ms `PUT /api/data` with the full blob.
  - `startSync()` — called once from `main.jsx`: initial pull, pull again on
    `visibilitychange` → visible, and every 30 s.
  - `getSyncStatus()` — `'off' | 'ok' | 'unauthorized' | 'offline'`, updated
    after every request, with `notify()` on change so Settings re-renders.
- `src/lib/data.js` — `saveData` additionally calls `pushToServer(data)`.
  Import `sync.js` from `data.js`; `sync.js` imports only from `storage.js`
  to avoid a cycle.
- `src/pages/Settings.jsx` — new "Server sync" card: token input, save button,
  status line ("Synced", "Token rejected", "Server unreachable", "Off").
  Uses existing card and input classes and tokens; no new colors.
- `vite.config.js` — dev proxy for `/api` and `/mcp` to `http://localhost:3000`
  so `npm run dev` can talk to a locally running server.

Sync failures never throw into the UI; status reflects them.

## Deploy

- `docker-compose.yml` at repo root:
  - `web`: builds the existing `Dockerfile`, publishes `8089:80`, depends on
    `server`.
  - `server`: builds `server/Dockerfile` with the repo root as context,
    volume `./data:/data`, `env_file: .env`, no published port.
- `nginx.conf` gains `location /api/ { proxy_pass http://server:3000; }` and
  `location = /mcp { proxy_pass http://server:3000; }` with
  `proxy_http_version 1.1` and `proxy_buffering off`.
- `.env` on the server holds `FLOW_TOKEN=<random>`; `.env` is gitignored and
  `.env.example` is committed.
- DEPLOY.md one-liner becomes: build, rsync the needed files, then
  `docker compose up -d --build`. It documents the token, the data file
  location for backups, and how to register the endpoint:

  ```bash
  claude mcp add --transport http flow http://100.105.58.19:8089/mcp \
    --header "Authorization: Bearer <token>"
  ```

- CLAUDE.md: replace "no backend" with a one-line description of the
  server and the rule that it must import only from `src/lib/store.js`.

## Testing (vitest, existing node setup)

- `tests/file-storage.test.js` — setItem then a fresh instance on the same
  path reads the value back; the file survives a simulated crash mid-write
  (temp file present, real file intact).
- `tests/server-api.test.js` — build the app with a known token, listen on an
  ephemeral port:
  - request without token → 401.
  - PUT a blob then GET returns the same items.
- `tests/mcp.test.js` — SDK `Client` + `StreamableHTTPClientTransport`
  against the same app:
  - `listTools` includes `flow_list_items`.
  - `flow_create_item` then `flow_list_items` returns the created title.
- `tests/sync.test.js` — with a stubbed `fetch`: empty server + populated
  local triggers a push, not a pull; a 401 sets status to `unauthorized`.

One assertion per test where practical; mocks only at the network boundary.

## Risks and trade-offs

- **Last write wins.** If Claude edits while a dashboard tab is open and the
  user then saves before the next refetch, Claude's edit is lost. Refetch on
  focus and the 30 s poll keep this window small; acceptable for one user.
- **Token in localStorage.** Same trust level as the dashboard itself, which
  is LAN/Tailscale only.
- **npm on the server.** Verified reachable today; if it ever isn't,
  `docker save | ssh docker load` from the Mac is the fallback.
