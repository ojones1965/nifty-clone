// Single-user data blob: shape and persistence. The app has no accounts —
// everything lives under one fixed localStorage key.

import { DATA_KEY, read, write, deepMerge, notify } from './storage.js';

export function emptyData() {
  return {
    items: [],
    orders: [],
    expenses: [],
    goals: { monthlyRevenue: null, monthlySales: null },
    dismissedAlerts: [],
    marketplaces: {
      primary: 'poshmark',
      accounts: {
        poshmark: { connected: true, username: '' },
        ebay: { connected: true, username: '' },
        mercari: { connected: false, username: '', verified: false },
        depop: { connected: true, username: '' },
        etsy: { connected: false, username: '' },
        whatnot: { connected: false, username: '' },
      },
    },
    automation: {
      enabled: { shares: true, relists: true, offers: true, follows: true },
      poshmark: {
        selfShares: 0,
        partyShares: 0,
        communityShares: 0,
        relists: 0,
        offers: 0,
        reciprocalFollows: 0,
        newFollows: 0,
        unfollows: 0,
      },
      ebay: { offers: 0, recreates: 0 },
      mercari: { offers: 0, recreates: 0 },
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
