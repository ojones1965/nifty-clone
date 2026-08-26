// Public API of the local "backend", re-exported from the domain modules:
//   storage.js        low-level persistence + pub/sub
//   constants.js      marketplace/category/status constants
//   authStore.js      accounts + session
//   data.js           per-user data blob scoping
//   seed.js           demo data for new accounts
//   itemsStore.js     inventory items + sale recording
//   analyticsStore.js orders, expenses, goals, range queries
//   settingsStore.js  alerts, marketplace links, automation

export { subscribe, isoDate } from './storage';
export { MARKETPLACES, EXPENSE_CATEGORIES, ITEM_STATUSES } from './constants';
export { getSession, signUp, signIn, signOut } from './authStore';
export {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  listItem,
  markSold,
} from './itemsStore';
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
} from './analyticsStore';
export {
  getDismissedAlerts,
  dismissAlert,
  getMarketplaceLinks,
  toggleMarketplaceLink,
  getAutomation,
  toggleAutomation,
} from './settingsStore';
