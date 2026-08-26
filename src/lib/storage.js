// Low-level persistence helpers + change notification, shared by the domain stores.

// Single-user app: all data lives under one key. The "local" suffix is a
// leftover from the per-account "resell_data_<userId>" scheme.
export const DATA_KEY = 'resell_data_local';

// ---------- tiny pub/sub ----------
const listeners = new Set();
let version = 0;
export function getVersion() {
  return version;
}
export function notify() {
  version += 1;
  listeners.forEach((fn) => fn());
}
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- storage helpers ----------
export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
export function deepMerge(base, incoming) {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (!base || typeof base !== 'object' || !incoming || typeof incoming !== 'object') {
    return incoming ?? base;
  }

  const output = { ...base };
  Object.entries(incoming).forEach(([key, value]) => {
    const current = output[key];
    output[key] = deepMerge(current, value);
  });
  return output;
}
export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
export function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
export function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}
