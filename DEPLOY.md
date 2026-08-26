# Deploying Flow to your personal server

The app is a fully static site — no backend, no database, no environment
variables. Everything in `dist/` is the complete app. Data (accounts, projects,
tasks, comments) is stored in the browser's localStorage.

## Current deployment (LLMServer, Docker)

The app runs as the `nifty-clone` container on LLMServer, serving nginx on
port **8089**:

- LAN: http://10.0.0.147:8089
- Tailscale: http://100.105.58.19:8089

To update it after changing the app:

```bash
npm run build && rsync -az --delete Dockerfile nginx.conf dist otislj@10.0.0.147:~/nifty-clone/ && ssh otislj@10.0.0.147 'cd ~/nifty-clone && docker build -t nifty-clone . && docker rm -f nifty-clone && docker run -d --name nifty-clone --restart=unless-stopped -p 8089:80 nifty-clone'
```

The image only packages the prebuilt `dist/` (see `Dockerfile`), so the server
never needs Node or npm registry access. Remember localStorage is per-origin:
the LAN URL and the Tailscale URL hold separate accounts/data — pick one and
stick with it.

The sections below describe the generic manual alternatives.

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

- **Data lives in the browser, per device.** localStorage is scoped to the
  browser *and* the exact origin (protocol + hostname + port). Using the app
  from your laptop and your phone gives two independent copies of the data.
  Pick one URL and stick with it — switching between `http://` and `https://`
  or between an IP and a hostname creates separate data stores.
- **Clearing browser data wipes the app's data.** If that matters, export a
  backup occasionally: open DevTools → Console and run
  `copy(JSON.stringify(localStorage))`, then paste it into a file.
- **Auth is local-only.** Passwords are stored as salted PBKDF2 hashes in
  localStorage, but there is no server-side auth at all — anyone who can reach
  the URL can create an account and use the app. If the server is reachable
  from the internet, protect the URL itself (e.g. basic auth or a VPN) rather
  than relying on the app's sign-in.
- **Updating:** rebuild (`npm run build`) and re-copy `dist/`. Existing data is
  untouched — it lives in your browser, not on the server.
