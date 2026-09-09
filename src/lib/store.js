// Public API of the local "backend", re-exported from the domain modules:
//   storage.js        low-level persistence + pub/sub
//   constants.js      marketplace/category/status constants
//   data.js           the single-user data blob
//   itemsStore.js     inventory items + sale recording
//   analyticsStore.js orders, expenses, goals, range queries
//   settingsStore.js  alerts, marketplace links, automation

export { subscribe, isoDate } from './storage.js';
export { MARKETPLACES, EXPENSE_CATEGORIES, ITEM_STATUSES } from './constants.js';
export {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  listItem,
  markSold,
} from './itemsStore.js';
export {
  listOrders,
  listExpenses,
  addExpense,
  deleteExpense,
  getGoals,
  setGoals,
  ordersInRange,
  expensesInRange,
  itemsListedInRange,
} from './analyticsStore.js';
export {
  getDismissedAlerts,
  dismissAlert,
  getMarketplaces,
  getMarketplaceLinks,
  connectMarketplace,
  disconnectMarketplace,
  setMarketplaceUsername,
  setPrimaryMarketplace,
  markMarketplaceVerified,
  getAutomation,
  getAutomationSummary,
  toggleAutomation,
} from './settingsStore.js';
