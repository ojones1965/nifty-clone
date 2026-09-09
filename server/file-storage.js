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
