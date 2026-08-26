// Inventory items + the order records created when an item sells.

import { uid, isoDate } from './storage';
import { getData, saveData } from './data';

export function listItems(status) {
  const items = getData().items;
  return status ? items.filter((i) => i.status === status) : items;
}
export function getItem(id) {
  return getData().items.find((i) => i.id === id) || null;
}
export function createItem(fields) {
  const data = getData();
  const sanitized = sanitizeItemFields(fields);
  const item = {
    id: uid(),
    title: '',
    description: '',
    photos: [],
    price: null,
    costOfGoods: null,
    status: 'draft',
    marketplaces: [],
    readyToList: false,
    createdAt: Date.now(),
    listedAt: null,
    soldAt: null,
    soldPrice: null,
    soldMarketplace: null,
    ...sanitized,
  };
  data.items.push(item);
  saveData(data);
  return item.id;
}

export function sanitizeItemFields(fields = {}) {
  const title = typeof fields.title === 'string' ? fields.title.trim() : '';
  const marketplaces = Array.isArray(fields.marketplaces) ? fields.marketplaces.filter(Boolean) : [];
  const photos = Array.isArray(fields.photos) ? fields.photos.filter(Boolean) : [];
  const price = parseMoney(fields.price);
  const costOfGoods = parseMoney(fields.costOfGoods);

  return {
    title,
    description: typeof fields.description === 'string' ? fields.description : '',
    photos,
    price,
    costOfGoods,
    marketplaces,
    readyToList: Boolean(fields.readyToList),
  };
}

export function parseMoney(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
export function updateItem(id, patch) {
  const data = getData();
  const item = data.items.find((i) => i.id === id);
  if (item) {
    Object.assign(item, patch);
    saveData(data);
  }
}
export function deleteItem(id) {
  const data = getData();
  data.items = data.items.filter((i) => i.id !== id);
  saveData(data);
}
export function listItem(id) {
  // Move a draft to listed.
  const data = getData();
  const item = data.items.find((i) => i.id === id);
  if (item) {
    item.status = 'listed';
    item.listedAt = Date.now();
    saveData(data);
  }
}
export function markSold(id, { salePrice, marketplace, fees = 0, shippingFee = 0, shippingExpense = 0, date }) {
  const data = getData();
  const item = data.items.find((i) => i.id === id);
  if (!item) return;
  item.status = 'sold';
  item.soldAt = Date.now();
  item.soldPrice = salePrice;
  item.soldMarketplace = marketplace;
  data.orders.push({
    id: uid(),
    itemId: item.id,
    title: item.title,
    date: date || isoDate(),
    marketplace,
    salePrice,
    fees,
    shippingFee,
    shippingExpense,
    cogs: item.costOfGoods || 0,
  });
  saveData(data);
}
