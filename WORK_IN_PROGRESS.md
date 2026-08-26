# Nifty Clone – Work in Progress Notes

## Update (2026-08-25, later): auth removed

The app is now a single-user personal tool: the sign-in/sign-up/forgot-password
pages, the marketing header (Pricing/Support/Blog), the account section in
Settings, and the demo-data seeding were all removed. All data lives under one
fixed localStorage key (`resell_data_local`, see [src/lib/data.js](src/lib/data.js)),
and the app opens straight into the dashboard. The auth-related notes below
describe the state before that change.

## Current status: milestone complete (2026-08-25)

All four follow-up items from the previous hardening pass are done, and the app
is deployed. See [DEPLOY.md](DEPLOY.md) for the running deployment
(Docker container `nifty-clone` on LLMServer, port 8089).

## What was finished in this pass

### 1) Automated tests ✅
The earlier npm registry block (E403) did not reproduce, so vitest is now
installed. `npm test` runs 17 tests across:

- [tests/auth.test.js](tests/auth.test.js) — sign-up/sign-in, hashed password
  storage (never plain text), duplicate/missing-field rejection, legacy
  plain-text user migration
- [tests/items.test.js](tests/items.test.js) — item sanitization (money
  parsing, list-field filtering), lifecycle (draft → listed → sold), order
  recording, update/delete

Tests run in a plain Node environment with a tiny localStorage stub
([tests/setup.js](tests/setup.js)) — no jsdom needed.

### 2) Store split by domain ✅
[src/lib/store.js](src/lib/store.js) is now a barrel re-exporting from:

- [storage.js](src/lib/storage.js) — persistence helpers + pub/sub + version
- [constants.js](src/lib/constants.js) — marketplaces/categories/statuses
- [authStore.js](src/lib/authStore.js) — accounts + session (cached snapshot)
- [data.js](src/lib/data.js) — per-user data blob scoping
- [seed.js](src/lib/seed.js) — demo data for new accounts
- [itemsStore.js](src/lib/itemsStore.js) — inventory + sale recording
- [analyticsStore.js](src/lib/analyticsStore.js) — orders/expenses/goals/ranges
- [settingsStore.js](src/lib/settingsStore.js) — alerts/links/automation

Page imports were untouched — everything still imports from `../lib/store`.

### 3) Session/re-render pattern ✅
The manual tick subscription is gone. [src/App.jsx](src/App.jsx) uses
`useSyncExternalStore` with a cached session snapshot, and all data pages use
the shared `useStoreVersion()` hook ([src/lib/useStore.js](src/lib/useStore.js)),
which subscribes to a monotonic store version.

### 4) Inline form validation ✅
- Sign-in/sign-up show per-field errors (with `aria-invalid` + red borders)
  instead of relying on browser bubbles or silent failures.
- The item editor explains why a draft can't be saved (missing title) and what
  is still needed before "List item" becomes enabled.

## Verified

- `npm test` — 17/17 passing
- `npm run lint` — clean
- `npm run build` — succeeds
- Browser smoke test — sign-up, seeded dashboard, inventory, inline validation
  all verified on the deployed container.

## Possible future ideas (nothing blocking)

- Data export/import UI (localStorage backup is manual today — see DEPLOY.md)
- A real backend if multi-device sync ever matters

## Notes

Still a local-first demo app. Passwords are hashed, but there is no
server-side auth — protect the URL (LAN/Tailscale only) rather than trusting
the sign-in screen.
