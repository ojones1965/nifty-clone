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
