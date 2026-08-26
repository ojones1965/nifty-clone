// User settings: dismissed alerts, marketplace connections, automation.

import { getData, saveData } from './data';

// ---------- alerts ----------
export function getDismissedAlerts() {
  return getData().dismissedAlerts;
}
export function dismissAlert(key) {
  const data = getData();
  if (!data.dismissedAlerts.includes(key)) {
    data.dismissedAlerts.push(key);
    saveData(data);
  }
}

// ---------- marketplace connections ----------
export function getMarketplaces() {
  return getData().marketplaces;
}
// Back-compat map used by the item editor: id -> connected.
export function getMarketplaceLinks() {
  const { accounts } = getData().marketplaces;
  return Object.fromEntries(Object.entries(accounts).map(([id, a]) => [id, a.connected]));
}
export function connectMarketplace(id) {
  const data = getData();
  const account = data.marketplaces.accounts[id];
  if (account) {
    account.connected = true;
    saveData(data);
  }
}
export function disconnectMarketplace(id) {
  const data = getData();
  const account = data.marketplaces.accounts[id];
  if (account) {
    account.connected = false;
    if (data.marketplaces.primary === id) {
      const next = Object.entries(data.marketplaces.accounts).find(([, a]) => a.connected);
      data.marketplaces.primary = next ? next[0] : null;
    }
    saveData(data);
  }
}
export function setMarketplaceUsername(id, username) {
  const data = getData();
  const account = data.marketplaces.accounts[id];
  if (account) {
    account.username = String(username);
    saveData(data);
  }
}
export function setPrimaryMarketplace(id) {
  const data = getData();
  if (data.marketplaces.accounts[id]?.connected) {
    data.marketplaces.primary = id;
    saveData(data);
  }
}
export function markMarketplaceVerified(id) {
  const data = getData();
  const account = data.marketplaces.accounts[id];
  if (account) {
    account.verified = true;
    saveData(data);
  }
}

// ---------- automation ----------
export function getAutomation() {
  return getData().automation;
}
// Aggregate counters for the Home summary card.
export function getAutomationSummary() {
  const a = getData().automation;
  return {
    shares: a.poshmark.selfShares + a.poshmark.partyShares + a.poshmark.communityShares,
    relists: a.poshmark.relists + a.ebay.recreates + a.mercari.recreates,
    offers: a.poshmark.offers + a.ebay.offers + a.mercari.offers,
    follows: a.poshmark.reciprocalFollows + a.poshmark.newFollows,
  };
}
export function toggleAutomation(kind) {
  const data = getData();
  data.automation.enabled[kind] = !data.automation.enabled[kind];
  saveData(data);
}
