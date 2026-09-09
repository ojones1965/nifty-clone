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
