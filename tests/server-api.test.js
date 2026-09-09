import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';

const TOKEN = 't3st';
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
