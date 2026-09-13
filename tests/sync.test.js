import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATA_KEY, read } from '../src/lib/storage.js';

const TOKEN_KEY = 'resell_sync_token';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function emptyBlob() {
  return { items: [], orders: [], expenses: [] };
}

// sync.js keeps module-level state (last synced copy, status), so each test
// gets a fresh module instance.
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
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ...emptyBlob(), items: [{ id: 'r', title: 'From server' }] })));
    const sync = await freshSync();
    await sync.pullFromServer();
    expect(read(DATA_KEY, {}).items[0].title).toBe('From server');
  });

  it('pushes the local blob when the server is empty and local has records', async () => {
    localStorage.setItem(DATA_KEY, JSON.stringify({ ...emptyBlob(), items: [{ id: 'l', title: 'Local only' }] }));
    const fetchMock = vi.fn(async (url, init = {}) =>
      init.method === 'PUT' ? jsonResponse({ ok: true }) : jsonResponse(emptyBlob()),
    );
    vi.stubGlobal('fetch', fetchMock);
    const sync = await freshSync();
    await sync.pullFromServer();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(put[1].body).items[0].title).toBe('Local only');
  });

  it('follows the server once synced even when it has become empty', async () => {
    let remote = { ...emptyBlob(), items: [{ id: 'r', title: 'Deleted via MCP' }] };
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) =>
      init.method === 'PUT' ? jsonResponse({ ok: true }) : jsonResponse(remote),
    ));
    const sync = await freshSync();
    await sync.pullFromServer();
    remote = emptyBlob();
    await sync.pullFromServer();
    expect(read(DATA_KEY, {}).items).toHaveLength(0);
  });

  it('reports unauthorized on a 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'unauthorized' }, 401)));
    const sync = await freshSync();
    await sync.pullFromServer();
    expect(sync.getSyncStatus()).toBe('unauthorized');
  });

  it('reports offline when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network');
      }),
    );
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
    const fetchMock = vi.fn(async () => jsonResponse(emptyBlob()));
    vi.stubGlobal('fetch', fetchMock);
    const sync = await freshSync();
    await sync.pullFromServer();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('retries the push instead of pulling while local changes are unsynced', async () => {
    const fetchMock = vi.fn(async (url, init = {}) =>
      init.method === 'PUT' ? jsonResponse({ error: 'down' }, 503) : jsonResponse(emptyBlob()),
    );
    vi.stubGlobal('fetch', fetchMock);
    const sync = await freshSync();
    await sync.pullFromServer();
    localStorage.setItem(DATA_KEY, JSON.stringify({ ...emptyBlob(), items: [{ id: 'n', title: 'New local' }] }));
    await sync.pullFromServer();
    expect(fetchMock.mock.calls.at(-1)[1].method).toBe('PUT');
  });
});
