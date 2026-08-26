// Per-user data blob: shape, scoping to the signed-in user, and persistence.

import { DATA_PREFIX, read, write, deepMerge, notify } from './storage';
import { getSession } from './authStore';

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

function dataKey() {
  const session = getSession();
  return session ? DATA_PREFIX + session.userId : null;
}

export function getData() {
  const key = dataKey();
  if (!key) return emptyData();
  return deepMerge(emptyData(), read(key, {}));
}

export function saveData(data) {
  const key = dataKey();
  if (key) {
    write(key, data);
    notify();
  }
}
