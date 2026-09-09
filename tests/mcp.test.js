import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { addExpense, createItem, markSold } from '../src/lib/store.js';

const TOKEN = 't3st';
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
