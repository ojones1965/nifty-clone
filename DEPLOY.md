# Deploying Flow to your personal server

The app is a static site (`dist/`) plus a small Node server (`server/`) that
holds the data in one JSON file and serves both a data API and an MCP
endpoint. Browsers keep a local copy of the data and sync it with the server
once a token is set; without a token the app is local-only.

## Current deployment (LLMServer, Docker Compose)

Two containers, defined in `docker-compose.yml`:

- `nifty-clone` — nginx serving `dist/` on port **8089** and proxying
  `/api/` and `/mcp` to the server container.
- `nifty-clone-server` — Node process holding the data in
  `~/nifty-clone/data/flow-data.json` and serving the data API and the MCP
  endpoint. Not published directly; only reachable through nginx.

URLs: LAN http://10.0.0.147:8089, Tailscale http://100.105.58.19:8089.

### One-time setup on the server

```bash
ssh otislj@10.0.0.147 'cd ~/nifty-clone && echo "FLOW_TOKEN=$(openssl rand -hex 24)" > .env && cat .env && docker rm -f nifty-clone'
```

Keep that token. Paste it into Settings → Server sync in the app (each
browser you use), and pass it when registering the MCP endpoint. The first
browser to sync against the empty server uploads its existing data, so open
the app where your inventory already lives.

### Update after changing the app or the server

```bash
npm run build && rsync -azR --delete --exclude node_modules Dockerfile nginx.conf docker-compose.yml .dockerignore dist server src/lib otislj@10.0.0.147:~/nifty-clone/ && ssh otislj@10.0.0.147 'cd ~/nifty-clone && docker compose up -d --build'
```

(`-R` keeps the `src/lib` path relative, which the server image expects.)

`npm ci` runs inside the server image build, so the server needs npm registry
access (verified reachable). If that ever breaks, build the image elsewhere
with `docker compose build server` and ship it with `docker save | ssh ... docker load`.

Check it:

```bash
curl -s http://100.105.58.19:8089/healthz
```

### Registering the MCP endpoint

```bash
claude mcp add --transport http flow http://100.105.58.19:8089/mcp --header "Authorization: Bearer <token>"
```

Any other MCP client (LibreChat, Open WebUI, n8n, Cursor, Claude Desktop)
takes the same URL and header. Tools are prefixed `flow_`; `flow_summary`
gives revenue, costs, and profit for a date range.

#### LibreChat (same server, done 2026-09-12)

LibreChat runs on LLMServer as the `LibreChat` container (port 3080), with
its config in `/root/librechat`, which is root-owned, so edits need sudo.
Its container reaches the Flow server through the Docker host gateway
`172.18.0.1`, not the LAN IP.

`/root/librechat/.env` holds the token as `FLOW_TOKEN=<token>`, and
`/root/librechat/librechat.yaml` has:

```yaml
mcpServers:
  flow:
    type: streamable-http
    url: http://172.18.0.1:8089/mcp
    title: "Flow"
    description: "Reseller inventory, orders, expenses and profit summary"
    headers:
      Authorization: 'Bearer ${FLOW_TOKEN}'
    requiresOAuth: false
    timeout: 30000
    serverInstructions: true

mcpSettings:
  allowedAddresses:
    - '172.18.0.1:8089'
```

`requiresOAuth: false` is required. LibreChat probes new MCP servers
without credentials, and the Flow server's 401 makes it assume OAuth and
register the server with zero tools. `allowedAddresses` is LibreChat's
private-network allowlist; the entry must match the URL's host:port.

Apply with `docker restart LibreChat`, then confirm in
`docker logs --since 2m LibreChat` that `[MCP][flow]` lists the 14 tools.
If the token is ever rotated, update both `.env` files (Flow's and
LibreChat's) and restart both stacks.

In the LibreChat UI, enable "Flow" in the MCP selector in the chat box and
use a model that supports tool calling (Kimi and DeepSeek both do).

#### Open WebUI (ODS stack, done 2026-09-12)

Open WebUI 0.7.2 runs as the `ods-webui` container on port 3010 with no
login (`WEBUI_AUTH=false`). Flow is registered as an MCP tool server in
Admin Panel → Settings → External Tools. The record lives in the
`tool_server.connections` list inside the single-row `config` table of
`~/ods/data/open-webui/webui.db` (root-owned SQLite), as:

```json
{
  "url": "http://172.18.0.1:8089/mcp",
  "path": "",
  "type": "mcp",
  "auth_type": "bearer",
  "key": "<FLOW_TOKEN>",
  "headers": null,
  "config": { "enable": true },
  "info": { "id": "flow", "name": "Flow",
            "description": "Reseller inventory, orders, expenses and profit summary" }
}
```

Gotchas found while setting it up:

- For `type: mcp` the `url` must be the full endpoint including `/mcp`.
  The separate `path` field is only used for OpenAPI servers; with the
  bare origin the client POSTs to `/` and gets a 405.
- `info.id` is required. The chat UI references the server as
  `server:mcp:<id>`, and a record without it can never be selected.
- The same DB-edit route as `ui.default_models` applies: stop the
  container, edit with a throwaway `python:3.11-slim` container mounting
  the data dir, start it again. The Add Connection dialog in the admin UI
  does the same thing if you would rather paste the token by hand.
- **Ollama-backed models cannot use Flow in 0.7.2.** The Ollama path
  deep-copies the request with the live MCP client inside and fails with
  `cannot pickle '_asyncio.Future' object`. The OpenAI-compatible path has
  no such copy, so use the llama.cpp models (Qwen3-30B-A3B, Qwen3.5-27B),
  which are also the ones on the GPU. Verified working with Qwen3-30B-A3B.
  A newer Open WebUI may fix this; re-test after any upgrade.

To use it: pick a llama.cpp model, open the Integrations icon in the chat
box, then Tools, and switch Flow on. It stays on for that chat.

#### Whole-blob sync caveat

Every browser with the token pushes its entire local copy on any change,
last write wins. A dashboard edit and an MCP edit made within the same
30-second poll window can overwrite each other. If an MCP change seems to
vanish, check `docker logs nifty-clone` for a `PUT /api/data` right after
it. (Until 2026-09-12 a tab also re-uploaded its copy whenever the server
had zero records, which undid any MCP delete of the last item; the browser
now only does that on its first sync with a token.)

### Backups

The whole dataset is `~/nifty-clone/data/flow-data.json`. Copy that file.
The container writes it atomically (temp file + rename), so a copy taken at
any moment is consistent.

### Local development against a local server

```bash
FLOW_TOKEN=devtoken DATA_FILE=./data/dev.json PORT=3100 node server/index.js
```

Then `npm run dev`; Vite proxies `/api` and `/mcp` to port 3100. Paste
`devtoken` into Settings → Server sync.

The sections below describe the generic manual alternatives for the static
part only.

## 1. Build

```bash
cd nifty-clone
npm install        # first time only
npm run build      # outputs the complete app to dist/
```

## 2. Copy `dist/` to your server

```bash
scp -r dist/* you@your-server:/var/www/flow/
```

(or rsync, SFTP, whatever you normally use)

## 3. Serve it

Because the app uses hash-based routing (`/#/sign-in`) and relative asset
paths, **any static file server works with zero special config** — at the
domain root or in a subfolder.

### nginx

```nginx
server {
    listen 80;
    server_name flow.example.com;
    root /var/www/flow;
    index index.html;
}
```

### Apache

Just point a vhost (or an alias/subfolder) at the files. No `.htaccess` or
rewrite rules needed.

### Caddy

```
flow.example.com {
    root * /var/www/flow
    file_server
}
```

### Quick test with Node (no server software)

```bash
npx serve /var/www/flow
```

## Things to know

- **Data lives on the server once a token is set.** Each browser keeps a
  local copy and syncs it: pulls on open, on tab focus, and every 30 s;
  pushes after every change. Last write wins. Without a token the app is
  local-only, and localStorage is scoped to the browser *and* the exact
  origin, so the LAN URL and the Tailscale URL hold separate copies.
- **Clearing browser data only loses the local copy** when sync is on; the
  next open pulls from the server again. With sync off it wipes the app's
  data, so use Settings → Download backup occasionally.
- **There is no sign-in.** This is a single-user app — anyone who can reach
  the URL can use it (though they'd only see their own browser's data). Keep
  it LAN/Tailscale-only; if it ever needs internet exposure, put basic auth or
  a VPN in front of the URL.
- **Updating:** rebuild (`npm run build`) and re-copy `dist/`. Existing data is
  untouched — it lives in your browser, not on the server.
