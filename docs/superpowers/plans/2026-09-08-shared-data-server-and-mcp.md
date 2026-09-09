# Shared Data Server + MCP Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host the Flow inventory data in a Node container on LLMServer that exposes a two-route data API and an MCP endpoint, and make the React app sync its localStorage copy with it.

**Architecture:** `server/` is a single Express process that installs a file-backed `localStorage` shim, then reuses `src/lib/store.js` unchanged for all business logic. MCP tools wrap the store's public functions. nginx (existing container) proxies `/api/` and `/mcp` to it. The app keeps localStorage as its synchronous working copy and a new `src/lib/sync.js` pulls on boot/focus/poll and pushes after each change.

**Tech Stack:** Node 22, Express 5, `@modelcontextprotocol/sdk` 1.30 (v1, stateless Streamable HTTP with JSON responses), Zod 4, Docker Compose, vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-shared-data-server-and-mcp-design.md`

## Global Constraints

- Server code imports the store only through `src/lib/store.js` (barrel) plus `src/lib/data.js` for `getData`/`saveData`; never re-implement store rules.
- Tool names are `flow_<verb>_<noun>`, every tool has `title`, `description`, Zod `inputSchema`, `annotations`; results carry both `content` (JSON text) and `structuredContent` (an object).
- Every route except `/healthz` requires `Authorization: Bearer <FLOW_TOKEN>`; wrong/missing → `401 {"error":"unauthorized"}`.
- Streamable HTTP is stateless: `sessionIdGenerator: undefined`, `enableJsonResponse: true`.
- Dates in tool inputs are `YYYY-MM-DD`, ranges inclusive. Profit = revenue − cogs − fees − shippingExpense − expenses (matches Home/Analytics pages).
- App with no sync token behaves exactly as today. Sync failures never throw into the UI.
- Plain JS ESM everywhere (repo has no TypeScript). Intra-`src/lib` imports must carry `.js` extensions so Node can load them.
- Use existing CSS classes/tokens (`card`, `eyebrow`, `card-sub`, `field`, `btn btn-outline`); no new colors.
- Tests: vitest in node with the localStorage stub from `tests/setup.js`; mock only at the network boundary (`fetch`).
- Commit after each task. No PRs; this branch merges to main.

---

### Task 1: Node-loadable store imports

**Files:**
- Modify: `src/lib/data.js:4`, `src/lib/analyticsStore.js:3-4`, `src/lib/itemsStore.js:3-4`, `src/lib/settingsStore.js:3`, `src/lib/useStore.js:2`, `src/lib/store.js` (all `./x` → `./x.js`)

**Interfaces:**
- Produces: `src/lib/store.js` and `src/lib/data.js` importable from plain Node (`node -e "import('./src/lib/store.js')"` succeeds once `globalThis.localStorage` exists).

- [ ] **Step 1: Add `.js` to every relative import inside `src/lib`**

```bash
sed -i '' -E "s#from '\./(storage|data|constants|itemsStore|analyticsStore|settingsStore)'#from './\1.js'#g" src/lib/*.js
grep -n "from '\./" src/lib/*.js
```
Expected: every line ends in `.js';`.

- [ ] **Step 2: Verify Node can load the barrel**

```bash
node -e "globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){},clear(){}}; import('./src/lib/store.js').then(m=>console.log(Object.keys(m).length,'exports'))"
```
Expected: a number ≥ 25 and `exports`.

- [ ] **Step 3: Run existing tests and lint**

Run: `npm test && npm run lint`
Expected: 17 tests pass, lint clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib
git commit -m "Use explicit .js extensions in src/lib so Node can import the store"
```

---

### Task 2: File-backed localStorage shim

**Files:**
- Create: `server/file-storage.js`
- Test: `tests/file-storage.test.js`
- Already present (from setup): `server/package.json`, `server/package-lock.json`, root `package.json` devDependency on the SDK

**Interfaces:**
- Produces: `class FileStorage { constructor(path); getItem(key) → string|null; setItem(key, value); removeItem(key); clear() }`. Persists a `{ [key]: string }` JSON object at `path` after every mutation via temp-file + rename.

- [ ] **Step 1: Write the failing tests**

`tests/file-storage.test.js`:
```js
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileStorage } from '../server/file-storage.js';

function tempPath() {
  return join(mkdtempSync(join(tmpdir(), 'flow-storage-')), 'data.json');
}

describe('FileStorage', () => {
  it('reads back a value through a fresh instance on the same file', () => {
    const path = tempPath();
    new FileStorage(path).setItem('k', 'v');
    expect(new FileStorage(path).getItem('k')).toBe('v');
  });

  it('returns null for a missing key', () => {
    expect(new FileStorage(tempPath()).getItem('nope')).toBeNull();
  });

  it('ignores a leftover temp file from an interrupted write', () => {
    const path = tempPath();
    new FileStorage(path).setItem('k', 'good');
    writeFileSync(`${path}.tmp`, '{"k":"half-writ');
    expect(new FileStorage(path).getItem('k')).toBe('good');
  });

  it('removes a key from the file', () => {
    const path = tempPath();
    const store = new FileStorage(path);
    store.setItem('k', 'v');
    store.removeItem('k');
    expect(new FileStorage(path).getItem('k')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/file-storage.test.js`
Expected: FAIL, cannot find module `../server/file-storage.js`.

- [ ] **Step 3: Implement**

`server/file-storage.js`:
```js
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

// localStorage-compatible store persisted to one JSON file, so the src/lib
// store modules run unchanged in Node (the same trick tests/setup.js uses
// with an in-memory map). Writes go to a temp file then rename, so a crash
// mid-write never leaves a half-written data file behind.
export class FileStorage {
  constructor(path) {
    this.path = path;
    this.map = new Map(Object.entries(load(path)));
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
    this.flush();
  }
  removeItem(key) {
    this.map.delete(key);
    this.flush();
  }
  clear() {
    this.map.clear();
    this.flush();
  }
  flush() {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.map)));
    renameSync(tmp, this.path);
  }
}

function load(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/file-storage.test.js`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/file-storage.js tests/file-storage.test.js package.json package-lock.json
git commit -m "Add file-backed localStorage shim for the Flow server"
```

---

### Task 3: Data API with bearer auth

**Files:**
- Create: `server/app.js`, `server/mcp.js` (stub returning an empty McpServer, filled in Task 4), `server/index.js`
- Test: `tests/server-api.test.js`

**Interfaces:**
- Produces: `createApp({ token }) → Express app` with `GET /healthz`, `GET /api/data`, `PUT /api/data`, `ALL /mcp`.
- Produces: `createMcpServer() → McpServer` (Task 4 registers tools on it).
- Consumes: `getData()`, `saveData(data)` from `src/lib/data.js`.

- [ ] **Step 1: Write the failing tests**

`tests/server-api.test.js`:
```js
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';

const TOKEN = 'test-token';
let server;
let base;

beforeAll(async () => {
  server = createApp({ token: TOKEN }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => localStorage.clear());

const auth = { Authorization: `Bearer ${TOKEN}` };

describe('data API', () => {
  it('serves /healthz without a token', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
  });

  it('rejects /api/data without a token', async () => {
    const res = await fetch(`${base}/api/data`);
    expect(res.status).toBe(401);
  });

  it('rejects /api/data with the wrong token', async () => {
    const res = await fetch(`${base}/api/data`, { headers: { Authorization: 'Bearer nope' } });
    expect(res.status).toBe(401);
  });

  it('round-trips a PUT blob through GET', async () => {
    const blob = { items: [{ id: 'a1', title: 'Nike Hoodie', status: 'draft' }] };
    await fetch(`${base}/api/data`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(blob),
    });
    const data = await (await fetch(`${base}/api/data`, { headers: auth })).json();
    expect(data.items.map((i) => i.title)).toEqual(['Nike Hoodie']);
  });

  it('fills in defaults for keys missing from a PUT blob', async () => {
    await fetch(`${base}/api/data`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    const data = await (await fetch(`${base}/api/data`, { headers: auth })).json();
    expect(data.marketplaces.primary).toBe('poshmark');
  });

  it('rejects a non-object PUT body', async () => {
    const res = await fetch(`${base}/api/data`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: '[1,2]',
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/server-api.test.js`
Expected: FAIL, cannot find module `../server/app.js`.

- [ ] **Step 3: Implement the MCP stub, the app, and the entry point**

`server/mcp.js` (stub for this task):
```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function createMcpServer() {
  return new McpServer({ name: 'flow-mcp-server', version: '0.1.0' });
}
```

`server/app.js`:
```js
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { getData, saveData } from '../src/lib/data.js';
import { createMcpServer } from './mcp.js';

// Express app serving the data API and the MCP endpoint. Exported without
// listening so tests can bind it to an ephemeral port.
export function createApp({ token }) {
  if (!token) throw new Error('createApp: token is required');

  const app = express();

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  app.use((req, res, next) => {
    if (req.get('authorization') === `Bearer ${token}`) return next();
    res.status(401).json({ error: 'unauthorized' });
  });

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/data', (req, res) => res.json(getData()));

  app.put('/api/data', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'body must be a data object' });
    }
    saveData(body);
    res.json({ ok: true });
  });

  app.all('/mcp', async (req, res) => {
    // Stateless mode: a fresh server + transport per request, per SDK guidance.
    const mcp = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      transport.close();
      mcp.close();
    });
    await mcp.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return app;
}
```

`server/index.js`:
```js
import { FileStorage } from './file-storage.js';

const token = process.env.FLOW_TOKEN;
if (!token) {
  console.error('FLOW_TOKEN is not set; refusing to start');
  process.exit(1);
}

// The store modules read localStorage at call time, but they must not be
// imported until the shim exists, hence the dynamic import below.
globalThis.localStorage = new FileStorage(process.env.DATA_FILE || '/data/flow-data.json');

const { createApp } = await import('./app.js');
const port = Number(process.env.PORT) || 3000;
createApp({ token }).listen(port, '0.0.0.0', () => {
  console.log(`flow-server listening on ${port}`);
});
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/server-api.test.js`
Expected: 6 passed.

- [ ] **Step 5: Smoke-run the real entry point**

```bash
FLOW_TOKEN=t DATA_FILE=/tmp/flow-smoke/data.json PORT=3999 node server/index.js & sleep 1
curl -s localhost:3999/healthz; echo
curl -s -H 'Authorization: Bearer t' localhost:3999/api/data | head -c 80; echo
kill %1
```
Expected: `{"ok":true}` then a JSON blob starting `{"items":[]`.

- [ ] **Step 6: Commit**

```bash
git add server/app.js server/mcp.js server/index.js tests/server-api.test.js
git commit -m "Add Flow server with bearer-protected data API and MCP mount point"
```

---

### Task 4: MCP tools

**Files:**
- Modify: `server/mcp.js` (replace stub)
- Test: `tests/mcp.test.js`

**Interfaces:**
- Consumes: store functions from `src/lib/store.js`: `listItems(status?)`, `getItem(id)`, `createItem(fields) → id`, `updateItem(id, patch)`, `deleteItem(id)`, `listItem(id)`, `markSold(id, { salePrice, marketplace, fees, shippingFee, shippingExpense, date })`, `listOrders()`, `ordersInRange(from, to)`, `listExpenses()`, `expensesInRange(from, to)`, `addExpense({ date, description, category, amount })`, `deleteExpense(id)`, `getGoals()`, `setGoals(goals)`, `MARKETPLACES`, `EXPENSE_CATEGORIES`, `ITEM_STATUSES`.
- Produces: the 14 tools in the spec table.

- [ ] **Step 1: Write the failing tests**

`tests/mcp.test.js`:
```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { addExpense, createItem, markSold } from '../src/lib/store.js';

const TOKEN = 'test-token';
let server;
let client;

beforeAll(async () => {
  server = createApp({ token: TOKEN }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = new URL(`http://127.0.0.1:${server.address().port}/mcp`);
  client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
    }),
  );
});
afterAll(async () => {
  await client.close();
  await new Promise((resolve) => server.close(resolve));
});
beforeEach(() => localStorage.clear());

async function call(name, args = {}) {
  return client.callTool({ name, arguments: args });
}

describe('flow MCP tools', () => {
  it('lists the item tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('flow_list_items');
  });

  it('creates an item that then appears in the list', async () => {
    await call('flow_create_item', { title: 'Vintage Levis', price: 45 });
    const result = await call('flow_list_items', {});
    expect(result.structuredContent.items.map((i) => i.title)).toEqual(['Vintage Levis']);
  });

  it('reports an unknown item id as a tool error', async () => {
    const result = await call('flow_get_item', { id: 'missing' });
    expect(result.isError).toBe(true);
  });

  it('marks an item sold and records the order', async () => {
    const id = createItem({ title: 'Boots', costOfGoods: 10 });
    await call('flow_mark_sold', { id, salePrice: 60, marketplace: 'ebay', date: '2026-09-01' });
    const result = await call('flow_list_orders', {});
    expect(result.structuredContent.orders[0].cogs).toBe(10);
  });

  it('summarizes profit over a date range', async () => {
    const id = createItem({ title: 'Jacket', costOfGoods: 20 });
    markSold(id, { salePrice: 100, marketplace: 'poshmark', fees: 20, shippingExpense: 5, date: '2026-09-02' });
    addExpense({ date: '2026-09-03', description: 'Tape', category: 'Shipping Supplies', amount: 7 });
    const result = await call('flow_summary', { from: '2026-09-01', to: '2026-09-30' });
    expect(result.structuredContent.profit).toBe(48);
  });

  it('rejects an unknown marketplace on sale', async () => {
    const id = createItem({ title: 'Hat' });
    const result = await call('flow_mark_sold', { id, salePrice: 5, marketplace: 'amazon' });
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/mcp.test.js`
Expected: FAIL on `flow_list_items` not in tool list (and subsequent tests error with unknown tool).

- [ ] **Step 3: Implement the tools**

`server/mcp.js`:
```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  EXPENSE_CATEGORIES,
  ITEM_STATUSES,
  MARKETPLACES,
  addExpense,
  createItem,
  deleteExpense,
  deleteItem,
  expensesInRange,
  getGoals,
  getItem,
  listExpenses,
  listItem,
  listItems,
  listOrders,
  markSold,
  ordersInRange,
  setGoals,
  updateItem,
} from '../src/lib/store.js';

const MARKETPLACE_IDS = MARKETPLACES.map((m) => m.id);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');
const money = z.number().nonnegative();
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const IDEMPOTENT_WRITE = { ...WRITE, idempotentHint: true };
const DESTRUCTIVE = { ...WRITE, destructiveHint: true, idempotentHint: true };

const itemFields = {
  title: z.string().min(1).describe('Item title, e.g. "Nike Tech Fleece hoodie M"'),
  description: z.string().optional(),
  price: money.optional().describe('Asking price in dollars'),
  costOfGoods: money.optional().describe('What you paid for it, in dollars'),
  marketplaces: z.array(z.enum(MARKETPLACE_IDS)).optional().describe(`Any of: ${MARKETPLACE_IDS.join(', ')}`),
  readyToList: z.boolean().optional(),
};

export function createMcpServer() {
  const server = new McpServer({ name: 'flow-mcp-server', version: '0.1.0' });

  server.registerTool(
    'flow_list_items',
    {
      title: 'List inventory items',
      description: 'List inventory items, optionally filtered by status (draft, listed, sold). Returns full item records including id, price, costOfGoods, marketplaces, and timestamps.',
      inputSchema: { status: z.enum(ITEM_STATUSES).optional() },
      annotations: READ_ONLY,
    },
    async ({ status }) => ok({ items: listItems(status) }),
  );

  server.registerTool(
    'flow_get_item',
    {
      title: 'Get one item',
      description: 'Fetch a single inventory item by id.',
      inputSchema: { id: z.string() },
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      const item = getItem(id);
      return item ? ok({ item }) : unknownItem(id);
    },
  );

  server.registerTool(
    'flow_create_item',
    {
      title: 'Create a draft item',
      description: 'Add a new inventory item in draft status. Use flow_mark_listed once it is live on a marketplace.',
      inputSchema: itemFields,
      annotations: WRITE,
    },
    async (fields) => ok({ item: getItem(createItem(fields)) }),
  );

  server.registerTool(
    'flow_update_item',
    {
      title: 'Update item fields',
      description: 'Change title, description, price, costOfGoods, marketplaces, or readyToList on an existing item. Status changes go through flow_mark_listed / flow_mark_sold.',
      inputSchema: { id: z.string(), ...Object.fromEntries(Object.entries(itemFields).map(([k, v]) => [k, v.optional()])) },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, ...patch }) => {
      if (!getItem(id)) return unknownItem(id);
      updateItem(id, definedOnly(patch));
      return ok({ item: getItem(id) });
    },
  );

  server.registerTool(
    'flow_delete_item',
    {
      title: 'Delete an item',
      description: 'Permanently remove an inventory item. Orders already recorded for it are kept.',
      inputSchema: { id: z.string() },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) => {
      if (!getItem(id)) return unknownItem(id);
      deleteItem(id);
      return ok({ deleted: id });
    },
  );

  server.registerTool(
    'flow_mark_listed',
    {
      title: 'Mark item as listed',
      description: 'Move a draft item to listed status and stamp listedAt with the current time.',
      inputSchema: { id: z.string() },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id }) => {
      if (!getItem(id)) return unknownItem(id);
      listItem(id);
      return ok({ item: getItem(id) });
    },
  );

  server.registerTool(
    'flow_mark_sold',
    {
      title: 'Record a sale',
      description: 'Mark an item sold and create its order record. Profit for the order is salePrice minus costOfGoods, fees, and shippingExpense.',
      inputSchema: {
        id: z.string(),
        salePrice: money,
        marketplace: z.enum(MARKETPLACE_IDS).describe(`Where it sold. One of: ${MARKETPLACE_IDS.join(', ')}`),
        fees: money.optional().describe('Marketplace fees taken from the sale'),
        shippingFee: money.optional().describe('Shipping the buyer paid'),
        shippingExpense: money.optional().describe('Shipping you paid'),
        date: isoDay.optional().describe('Sale date, defaults to today'),
      },
      annotations: WRITE,
    },
    async ({ id, ...sale }) => {
      if (!getItem(id)) return unknownItem(id);
      markSold(id, definedOnly(sale));
      return ok({ item: getItem(id), order: listOrders().find((o) => o.itemId === id) });
    },
  );

  server.registerTool(
    'flow_list_orders',
    {
      title: 'List orders',
      description: 'List sale records, newest first. Pass from/to (YYYY-MM-DD, inclusive) to restrict the range.',
      inputSchema: { from: isoDay.optional(), to: isoDay.optional() },
      annotations: READ_ONLY,
    },
    async ({ from, to }) => ok({ orders: from && to ? ordersInRange(from, to) : listOrders() }),
  );

  server.registerTool(
    'flow_list_expenses',
    {
      title: 'List expenses',
      description: 'List business expenses, newest first. Pass from/to (YYYY-MM-DD, inclusive) to restrict the range.',
      inputSchema: { from: isoDay.optional(), to: isoDay.optional() },
      annotations: READ_ONLY,
    },
    async ({ from, to }) => ok({ expenses: from && to ? expensesInRange(from, to) : listExpenses() }),
  );

  server.registerTool(
    'flow_add_expense',
    {
      title: 'Add an expense',
      description: 'Record a business expense.',
      inputSchema: {
        date: isoDay,
        description: z.string().min(1),
        category: z.enum(EXPENSE_CATEGORIES).describe(`One of: ${EXPENSE_CATEGORIES.join(', ')}`),
        amount: money,
      },
      annotations: WRITE,
    },
    async (expense) => {
      addExpense(expense);
      return ok({ expense: listExpenses()[0] });
    },
  );

  server.registerTool(
    'flow_delete_expense',
    {
      title: 'Delete an expense',
      description: 'Permanently remove an expense record by id.',
      inputSchema: { id: z.string() },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) => {
      if (!listExpenses().some((e) => e.id === id)) {
        return fail(`No expense with id "${id}". Use flow_list_expenses to find ids.`);
      }
      deleteExpense(id);
      return ok({ deleted: id });
    },
  );

  server.registerTool(
    'flow_get_goals',
    {
      title: 'Get monthly goals',
      description: 'Read the monthly revenue and sales-count goals.',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => ok({ goals: getGoals() }),
  );

  server.registerTool(
    'flow_set_goals',
    {
      title: 'Set monthly goals',
      description: 'Update the monthly revenue goal (dollars) and/or the monthly sales-count goal.',
      inputSchema: { monthlyRevenue: money.nullable().optional(), monthlySales: z.number().int().nonnegative().nullable().optional() },
      annotations: IDEMPOTENT_WRITE,
    },
    async (goals) => {
      setGoals(definedOnly(goals));
      return ok({ goals: getGoals() });
    },
  );

  server.registerTool(
    'flow_summary',
    {
      title: 'Profit summary for a date range',
      description: 'Totals for an inclusive YYYY-MM-DD range: sales count, revenue, fees, shippingExpense, cogs, expenses, and profit (revenue - cogs - fees - shippingExpense - expenses).',
      inputSchema: { from: isoDay, to: isoDay },
      annotations: READ_ONLY,
    },
    async ({ from, to }) => {
      const orders = ordersInRange(from, to);
      const revenue = sum(orders, 'salePrice');
      const fees = sum(orders, 'fees');
      const shippingExpense = sum(orders, 'shippingExpense');
      const cogs = sum(orders, 'cogs');
      const expenses = sum(expensesInRange(from, to), 'amount');
      return ok({
        from,
        to,
        sales: orders.length,
        revenue,
        fees,
        shippingExpense,
        cogs,
        expenses,
        profit: revenue - cogs - fees - shippingExpense - expenses,
      });
    },
  );

  return server;
}

function ok(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
}
function fail(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}
function unknownItem(id) {
  return fail(`No item with id "${id}". Use flow_list_items to find ids.`);
}
function definedOnly(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/mcp.test.js`
Expected: 6 passed. If `flow_mark_sold` with `marketplace: 'amazon'` comes back as a protocol error instead of `isError`, that is the SDK rejecting invalid input before the handler; the client surfaces it as a thrown `McpError`. In that case change the test to `await expect(call(...)).rejects.toThrow()`.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint`
```bash
git add server/mcp.js tests/mcp.test.js
git commit -m "Register Flow inventory tools on the MCP server"
```

---

### Task 5: App sync module

**Files:**
- Create: `src/lib/sync.js`
- Modify: `src/main.jsx`, `vite.config.js`
- Test: `tests/sync.test.js`

**Interfaces:**
- Consumes: `DATA_KEY`, `read`, `write`, `notify`, `subscribe` from `src/lib/storage.js`.
- Produces: `getSyncToken() → string`, `setSyncToken(token) → Promise`, `getSyncStatus() → 'off'|'ok'|'unauthorized'|'offline'`, `pullFromServer() → Promise`, `startSync() → Promise` (Task 6 Settings card uses the first three).

Design note (refines the spec): instead of editing `saveData`, `startSync` subscribes to the store and pushes whenever the serialized blob differs from the last synced copy. The server therefore never imports browser code, and echo pushes after a pull are impossible. A pull is skipped while unsynced local changes exist; it retries the push instead, so local edits always win over a poll.

- [ ] **Step 1: Write the failing tests**

`tests/sync.test.js`:
```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATA_KEY, read } from '../src/lib/storage.js';

const TOKEN_KEY = 'resell_sync_token';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function freshSync() {
  vi.resetModules();
  return import('../src/lib/sync.js');
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(TOKEN_KEY, 'tok');
});
afterEach(() => vi.unstubAllGlobals());

describe('pullFromServer', () => {
  it('replaces the local blob with the server blob', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ items: [{ id: 'r', title: 'From server' }], orders: [], expenses: [] })));
    const sync = await freshSync();
    await sync.pullFromServer();
    expect(read(DATA_KEY, {}).items[0].title).toBe('From server');
  });

  it('pushes the local blob when the server is empty and local has records', async () => {
    localStorage.setItem(DATA_KEY, JSON.stringify({ items: [{ id: 'l', title: 'Local only' }], orders: [], expenses: [] }));
    const fetchMock = vi.fn(async (url, init = {}) =>
      init.method === 'PUT' ? jsonResponse({ ok: true }) : jsonResponse({ items: [], orders: [], expenses: [] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const sync = await freshSync();
    await sync.pullFromServer();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(put[1].body).items[0].title).toBe('Local only');
  });

  it('reports unauthorized on a 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'unauthorized' }, 401)));
    const sync = await freshSync();
    await sync.pullFromServer();
    expect(sync.getSyncStatus()).toBe('unauthorized');
  });

  it('reports offline when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    const sync = await freshSync();
    await sync.pullFromServer();
    expect(sync.getSyncStatus()).toBe('offline');
  });

  it('stays off with no token', async () => {
    localStorage.removeItem(TOKEN_KEY);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const sync = await freshSync();
    await sync.pullFromServer();
    expect(fetchMock.mock.calls).toHaveLength(0);
  });

  it('sends the bearer token', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [], orders: [], expenses: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const sync = await freshSync();
    await sync.pullFromServer();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/sync.test.js`
Expected: FAIL, cannot find module `../src/lib/sync.js`.

- [ ] **Step 3: Implement**

`src/lib/sync.js`:
```js
// Keeps the localStorage copy of the data blob in step with the Flow server
// (see server/). localStorage stays the synchronous working copy the store
// reads; this module only mirrors it. With no token configured nothing here
// touches the network and the app behaves as a purely local tool.

import { DATA_KEY, notify, read, subscribe } from './storage.js';

const TOKEN_KEY = 'resell_sync_token';
const PUSH_DELAY_MS = 300;
const POLL_MS = 30000;

let status = 'off';
let lastSyncedRaw = null;
let pushTimer = null;

export function getSyncToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setSyncToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  lastSyncedRaw = null;
  return pullFromServer();
}

export function getSyncStatus() {
  return status;
}

export async function pullFromServer() {
  if (!getSyncToken()) {
    setStatus('off');
    return;
  }
  // Local edits that have not reached the server yet win over a poll.
  if (lastSyncedRaw !== null && localRaw() !== lastSyncedRaw) {
    await pushNow();
    return;
  }
  let res;
  try {
    res = await fetch('/api/data', { headers: authHeaders() });
  } catch {
    setStatus('offline');
    return;
  }
  if (!res.ok) {
    setStatus(res.status === 401 ? 'unauthorized' : 'offline');
    return;
  }
  const remote = await res.json();
  if (!hasRecords(remote) && hasRecords(read(DATA_KEY, {}))) {
    // First run against an empty server: the browser copy is the real one.
    await pushNow();
    return;
  }
  localStorage.setItem(DATA_KEY, JSON.stringify(remote));
  lastSyncedRaw = localRaw();
  setStatus('ok');
  notify();
}

export function startSync() {
  subscribe(() => {
    if (getSyncToken() && localRaw() !== lastSyncedRaw) schedulePush();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullFromServer();
  });
  setInterval(pullFromServer, POLL_MS);
  return pullFromServer();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, PUSH_DELAY_MS);
}

async function pushNow() {
  const raw = localRaw();
  let res;
  try {
    res = await fetch('/api/data', { method: 'PUT', headers: authHeaders(), body: raw });
  } catch {
    setStatus('offline');
    return;
  }
  if (res.ok) lastSyncedRaw = raw;
  setStatus(res.ok ? 'ok' : res.status === 401 ? 'unauthorized' : 'offline');
}

function setStatus(next) {
  if (next === status) return;
  status = next;
  notify();
}

function localRaw() {
  return localStorage.getItem(DATA_KEY) || '{}';
}

function authHeaders() {
  return { Authorization: `Bearer ${getSyncToken()}`, 'Content-Type': 'application/json' };
}

function hasRecords(data) {
  return ['items', 'orders', 'expenses'].some((key) => Array.isArray(data?.[key]) && data[key].length > 0);
}
```

`src/main.jsx` — add after the CSS import:
```js
import { startSync } from './lib/sync.js';

startSync();
```

`vite.config.js` — add inside `defineConfig({...})`:
```js
  // Lets `npm run dev` talk to a locally running server (FLOW_TOKEN=... PORT=3000 node server/index.js).
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/mcp': 'http://localhost:3000',
    },
  },
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/sync.test.js`
Expected: 6 passed.

- [ ] **Step 5: Run everything, lint, commit**

Run: `npm test && npm run lint`
```bash
git add src/lib/sync.js src/main.jsx vite.config.js tests/sync.test.js
git commit -m "Sync the localStorage data blob with the Flow server"
```

---

### Task 6: Settings sync card

**Files:**
- Modify: `src/pages/Settings.jsx` (imports at top; new card before the existing "Data" card)

**Interfaces:**
- Consumes: `getSyncStatus`, `getSyncToken`, `setSyncToken` from `src/lib/sync.js`; `useStoreVersion` already imported.

- [ ] **Step 1: Add the card**

Imports:
```js
import { useState } from 'react';
import { getSyncStatus, getSyncToken, setSyncToken } from '../lib/sync.js';
```

Inside the component, after `useStoreVersion();`:
```js
  const [token, setToken] = useState(getSyncToken());
  const syncStatus = getSyncStatus();

  function handleSaveToken(e) {
    e.preventDefault();
    setSyncToken(token.trim());
  }
```

Module-level constant:
```js
const SYNC_STATUS_LABEL = {
  off: 'Off — data stays in this browser',
  ok: 'Synced with the server',
  unauthorized: 'Token rejected by the server',
  offline: 'Server unreachable',
};
```

New section, placed before the existing `<section className="card">` with the "Data" eyebrow:
```jsx
      <section className="card">
        <div className="eyebrow">Server sync</div>
        <p className="card-sub">
          Paste the FLOW_TOKEN from the server to share data with the MCP endpoint and other devices.
        </p>
        <form className="field" onSubmit={handleSaveToken}>
          <span>Token</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            placeholder="leave empty to keep data local"
          />
          <div>
            <button className="btn btn-outline" type="submit">Save</button>
          </div>
        </form>
        <p className="card-sub">Status: {SYNC_STATUS_LABEL[syncStatus]}</p>
      </section>
```

- [ ] **Step 2: Verify in the browser**

Run the server locally and the dev server:
```bash
FLOW_TOKEN=devtoken DATA_FILE=./data/dev.json PORT=3000 node server/index.js
```
Then `npm run dev` (via the preview tool), open Settings, paste `devtoken`, save. Expected: status becomes "Synced with the server"; `./data/dev.json` now contains the browser's blob; editing an item in the UI updates the file within a second; a wrong token shows "Token rejected by the server".

- [ ] **Step 3: Lint and commit**

Run: `npm run lint`
```bash
git add src/pages/Settings.jsx
git commit -m "Add server sync token card to Settings"
```

---

### Task 7: Containers, nginx proxy, compose

**Files:**
- Create: `server/Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`
- Modify: `nginx.conf`, `.gitignore` (add `.env` and `data/`)

- [ ] **Step 1: Write the files**

`server/Dockerfile` (build context is the repo root):
```dockerfile
# Flow data + MCP server. Reuses src/lib unchanged, so both directories are
# copied in; the app's own build is not needed here.
FROM node:22-alpine
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY src/lib/ /app/src/lib/
ENV NODE_ENV=production PORT=3000 DATA_FILE=/data/flow-data.json
EXPOSE 3000
CMD ["node", "index.js"]
```

`.dockerignore`:
```
node_modules
**/node_modules
.git
data
```

`docker-compose.yml`:
```yaml
services:
  web:
    build: .
    container_name: nifty-clone
    ports:
      - "8089:80"
    restart: unless-stopped
    depends_on:
      - server
  server:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: nifty-clone-server
    env_file: .env
    volumes:
      - ./data:/data
    restart: unless-stopped
```

`.env.example`:
```
# Shared secret for /api/data and /mcp. Generate one with: openssl rand -hex 24
FLOW_TOKEN=
```

`nginx.conf` — add inside `server { }` after the existing locations:
```nginx
    # Data API + MCP endpoint live in the node container (see server/).
    location /api/ {
        proxy_pass http://server:3000;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Host $host;
        client_max_body_size 6m;
    }
    location = /mcp {
        proxy_pass http://server:3000;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Host $host;
    }
    location = /healthz {
        proxy_pass http://server:3000;
    }
```

`.gitignore` — append:
```
.env
data/
```

- [ ] **Step 2: Build and run locally**

```bash
echo "FLOW_TOKEN=localtest" > .env
npm run build && docker compose up -d --build
curl -s localhost:8089/healthz; echo
curl -s -H 'Authorization: Bearer localtest' localhost:8089/api/data | head -c 60; echo
curl -s -X POST localhost:8089/mcp -H 'Authorization: Bearer localtest' -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | head -c 200; echo
docker compose down
```
Expected: `{"ok":true}`, a JSON blob, and a tools/list result mentioning `flow_list_items`. Remove the local `.env` afterwards or keep it, it is gitignored.

- [ ] **Step 3: Commit**

```bash
git add server/Dockerfile docker-compose.yml .dockerignore .env.example nginx.conf .gitignore
git commit -m "Run the Flow server alongside nginx via docker compose"
```

---

### Task 8: Deploy to LLMServer and register with Claude Code

**Files:**
- Modify: `DEPLOY.md` (current deployment section + things-to-know), `CLAUDE.md` (Deploy + Key decisions), `README.md` if it says "no backend"

- [ ] **Step 1: Rewrite the "Current deployment" section of DEPLOY.md**

```markdown
## Current deployment (LLMServer, Docker Compose)

Two containers, defined in `docker-compose.yml`:

- `nifty-clone` — nginx serving `dist/` on port **8089** and proxying
  `/api/` and `/mcp` to the server container.
- `nifty-clone-server` — Node process holding the data in
  `~/nifty-clone/data/flow-data.json` and serving the data API and the MCP
  endpoint. Not published directly.

URLs: LAN http://10.0.0.147:8089, Tailscale http://100.105.58.19:8089.

One-time setup on the server:

```bash
ssh otislj@10.0.0.147 'cd ~/nifty-clone && echo "FLOW_TOKEN=$(openssl rand -hex 24)" > .env && cat .env && docker rm -f nifty-clone'
```

Keep that token: paste it into Settings → Server sync in the app, and use it
when registering the MCP endpoint.

To update after changing the app or the server:

```bash
npm run build && rsync -az --delete --exclude node_modules Dockerfile nginx.conf docker-compose.yml .dockerignore dist server src/lib otislj@10.0.0.147:~/nifty-clone/ && ssh otislj@10.0.0.147 'cd ~/nifty-clone && docker compose up -d --build'
```

`npm ci` runs inside the server image build, so the server needs npm registry
access (verified reachable). If that ever breaks, build the image on the Mac
with `docker compose build server` and ship it with `docker save | ssh ... docker load`.

### Registering the MCP endpoint

```bash
claude mcp add --transport http flow http://100.105.58.19:8089/mcp --header "Authorization: Bearer <token>"
```

Any other MCP client (LibreChat, Open WebUI, n8n, Cursor) takes the same URL
and header.

### Backups

The whole dataset is `~/nifty-clone/data/flow-data.json`. Copy that file.
```

Also replace the "Data lives in the browser, per device" bullet in "Things to know" with:
```markdown
- **Data lives on the server once a token is set.** Each browser keeps a
  local copy and syncs it: pulls on open/focus/every 30 s, pushes after every
  change. Last write wins. Without a token the app is local-only as before.
```

- [ ] **Step 2: Update CLAUDE.md**

Replace the first paragraph's "localStorage persistence — no backend, no auth, no sign-in" with "localStorage as the working copy, optionally synced to a small Node server (server/) that also serves an MCP endpoint — no accounts, no sign-in". In Deploy, mention `docker compose` and the server container. In Key decisions add:
```markdown
- server/ reuses src/lib unchanged via a file-backed localStorage shim; it
  imports only from src/lib/store.js and src/lib/data.js. Business rules
  never live in server/.
- Sync (src/lib/sync.js) mirrors the localStorage blob; the store never
  awaits the network.
```

- [ ] **Step 3: Deploy**

Run the one-time setup command, then the update one-liner. Verify:
```bash
curl -s http://100.105.58.19:8089/healthz; echo
curl -s -o /dev/null -w '%{http_code}\n' http://100.105.58.19:8089/api/data
curl -s -H "Authorization: Bearer <token>" http://100.105.58.19:8089/api/data | head -c 80; echo
```
Expected: `{"ok":true}`, `401`, a JSON blob.

- [ ] **Step 4: Register with Claude Code and call a tool**

```bash
claude mcp add --transport http flow http://100.105.58.19:8089/mcp --header "Authorization: Bearer <token>"
claude mcp list
```
Expected: `flow` listed as connected.

- [ ] **Step 5: Commit and push**

```bash
git add DEPLOY.md CLAUDE.md README.md
git commit -m "Document the compose deployment and MCP registration"
```
Then merge the branch to main and push per the repo's direct-to-main workflow.
