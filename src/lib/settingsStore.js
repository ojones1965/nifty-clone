// User settings: dismissed alerts, marketplace links, automation toggles.

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

// ---------- marketplaces ----------
export function getMarketplaceLinks() {
  return getData().marketplaceLinks;
}
export function toggleMarketplaceLink(id) {
  const data = getData();
  data.marketplaceLinks[id] = !data.marketplaceLinks[id];
  saveData(data);
}

// ---------- automation ----------
export function getAutomation() {
  return getData().automation;
}
export function toggleAutomation(kind) {
  const data = getData();
  data.automation.enabled[kind] = !data.automation.enabled[kind];
  saveData(data);
}
