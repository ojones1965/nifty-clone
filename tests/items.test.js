import { beforeEach, describe, expect, it } from 'vitest';
import {
  createItem,
  deleteItem,
  getItem,
  listItem,
  listItems,
  listOrders,
  markSold,
  updateItem,
} from '../src/lib/store';

beforeEach(() => {
  localStorage.clear();
});

describe('createItem sanitization', () => {
  it('trims the title and defaults missing fields', () => {
    const id = createItem({ title: '  Nike Hoodie  ' });
    const item = getItem(id);
    expect(item.title).toBe('Nike Hoodie');
    expect(item.status).toBe('draft');
    expect(item.price).toBeNull();
    expect(item.costOfGoods).toBeNull();
    expect(item.marketplaces).toEqual([]);
    expect(item.photos).toEqual([]);
  });

  it('parses valid money values and rejects invalid ones', () => {
    const valid = getItem(createItem({ title: 'A', price: '12.50', costOfGoods: 3 }));
    expect(valid.price).toBe(12.5);
    expect(valid.costOfGoods).toBe(3);

    const invalid = getItem(createItem({ title: 'B', price: 'abc', costOfGoods: -5 }));
    expect(invalid.price).toBeNull();
    expect(invalid.costOfGoods).toBeNull();
  });

  it('filters falsy entries out of list fields', () => {
    const item = getItem(createItem({ title: 'C', marketplaces: ['ebay', '', null], photos: [null] }));
    expect(item.marketplaces).toEqual(['ebay']);
    expect(item.photos).toEqual([]);
  });

  it('ignores non-string titles', () => {
    const item = getItem(createItem({ title: 42 }));
    expect(item.title).toBe('');
  });
});

describe('item lifecycle', () => {
  it('filters listItems by status', () => {
    const draftId = createItem({ title: 'Draft item' });
    const listedId = createItem({ title: 'Listed item' });
    listItem(listedId);

    expect(listItems('draft').map((i) => i.id)).toEqual([draftId]);
    expect(listItems('listed').map((i) => i.id)).toEqual([listedId]);
    expect(listItems()).toHaveLength(2);
  });

  it('listItem moves a draft to listed and stamps listedAt', () => {
    const id = createItem({ title: 'Draft item' });
    listItem(id);
    const item = getItem(id);
    expect(item.status).toBe('listed');
    expect(item.listedAt).toBeGreaterThan(0);
  });

  it('markSold updates the item and records an order', () => {
    const id = createItem({ title: 'Jacket', price: 89, costOfGoods: 25 });
    listItem(id);
    markSold(id, { salePrice: 80, marketplace: 'ebay', fees: 10, date: '2026-08-25' });

    const item = getItem(id);
    expect(item.status).toBe('sold');
    expect(item.soldPrice).toBe(80);
    expect(item.soldMarketplace).toBe('ebay');

    const orders = listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      itemId: id,
      salePrice: 80,
      marketplace: 'ebay',
      fees: 10,
      cogs: 25,
      date: '2026-08-25',
    });
  });

  it('updateItem patches fields and deleteItem removes the item', () => {
    const id = createItem({ title: 'Old title' });
    updateItem(id, { title: 'New title' });
    expect(getItem(id).title).toBe('New title');

    deleteItem(id);
    expect(getItem(id)).toBeNull();
    expect(listItems()).toHaveLength(0);
  });
});
