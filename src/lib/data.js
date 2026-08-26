// Single-user data blob: shape and persistence. The app has no accounts —
// everything lives under one fixed localStorage key.

import { DATA_KEY, read, write, deepMerge, notify } from './storage';

export function emptyData() {
  return {
    items: [],
    orders: [],
    expenses: [],
    goals: { monthlyRevenue: null, monthlySales: null },
    dismissedAlerts: [],
    marketplaceLinks: {
      poshmark: true,
      ebay: true,
      mercari: false,
      depop: true,
      etsy: false,
      whatnot: false,
    },
    automation: {
      shares: 0,
      relists: 0,
      offers: 0,
      follows: 0,
      enabled: { shares: true, relists: true, offers: true, follows: true },
    },
  };
}

export function getData() {
  return deepMerge(emptyData(), read(DATA_KEY, {}));
}

export function saveData(data) {
  write(DATA_KEY, data);
  notify();
}
