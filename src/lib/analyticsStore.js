// Orders, expenses, goals, and date-range analytics helpers.

import { uid } from './storage.js';
import { getData, saveData } from './data.js';

// ---------- orders ----------
export function listOrders() {
  return [...getData().orders].sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---------- expenses ----------
export function listExpenses() {
  return [...getData().expenses].sort((a, b) => (a.date < b.date ? 1 : -1));
}
export function addExpense({ date, description, category, amount }) {
  const data = getData();
  data.expenses.push({ id: uid(), date, description, category, amount });
  saveData(data);
}
export function deleteExpense(id) {
  const data = getData();
  data.expenses = data.expenses.filter((e) => e.id !== id);
  saveData(data);
}

// ---------- goals ----------
export function getGoals() {
  return getData().goals;
}
export function setGoals(goals) {
  const data = getData();
  data.goals = { ...data.goals, ...goals };
  saveData(data);
}

// ---------- range helpers ----------
export function ordersInRange(startDate, endDate) {
  return getData().orders.filter((o) => o.date >= startDate && o.date <= endDate);
}
export function expensesInRange(startDate, endDate) {
  return getData().expenses.filter((e) => e.date >= startDate && e.date <= endDate);
}
export function itemsListedInRange(startTs, endTs) {
  return getData().items.filter((i) => i.listedAt && i.listedAt >= startTs && i.listedAt <= endTs);
}
