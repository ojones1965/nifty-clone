// The store only needs localStorage from the browser environment — Node
// provides crypto.subtle, btoa, and atob natively — so a tiny in-memory stub
// avoids pulling in jsdom.
class LocalStorageStub {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

globalThis.localStorage = new LocalStorageStub();
