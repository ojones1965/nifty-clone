import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  EXPENSE_CATEGORIES,
  ITEM_STATUSES,
  MARKETPLACES,
  addExpense,
  createItem,
  deleteExpense,
  deleteItem,
  expensesInRange,
  getGoals,
  getItem,
  listExpenses,
  listItem,
  listItems,
  listOrders,
  markSold,
  ordersInRange,
  setGoals,
  updateItem,
} from '../src/lib/store.js';

const MARKETPLACE_IDS = MARKETPLACES.map((m) => m.id);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');
const money = z.number().nonnegative();
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const IDEMPOTENT_WRITE = { ...WRITE, idempotentHint: true };
const DESTRUCTIVE = { ...WRITE, destructiveHint: true, idempotentHint: true };

const itemFields = {
  title: z.string().min(1).describe('Item title, e.g. "Nike Tech Fleece hoodie M"'),
  description: z.string().optional(),
  price: money.optional().describe('Asking price in dollars'),
  costOfGoods: money.optional().describe('What you paid for it, in dollars'),
  marketplaces: z.array(z.enum(MARKETPLACE_IDS)).optional().describe(`Any of: ${MARKETPLACE_IDS.join(', ')}`),
  readyToList: z.boolean().optional(),
};

export function createMcpServer() {
  const server = new McpServer({ name: 'flow-mcp-server', version: '0.1.0' });

  server.registerTool(
    'flow_list_items',
    {
      title: 'List inventory items',
      description:
        'List inventory items, optionally filtered by status (draft, listed, sold). Returns full item records including id, price, costOfGoods, marketplaces, and timestamps.',
      inputSchema: { status: z.enum(ITEM_STATUSES).optional() },
      annotations: READ_ONLY,
    },
    async ({ status }) => ok({ items: listItems(status) }),
  );

  server.registerTool(
    'flow_get_item',
    {
      title: 'Get one item',
      description: 'Fetch a single inventory item by id.',
      inputSchema: { id: z.string() },
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      const item = getItem(id);
      return item ? ok({ item }) : unknownItem(id);
    },
  );

  server.registerTool(
    'flow_create_item',
    {
      title: 'Create a draft item',
      description: 'Add a new inventory item in draft status. Use flow_mark_listed once it is live on a marketplace.',
      inputSchema: itemFields,
      annotations: WRITE,
    },
    async (fields) => ok({ item: getItem(createItem(fields)) }),
  );

  server.registerTool(
    'flow_update_item',
    {
      title: 'Update item fields',
      description:
        'Change title, description, price, costOfGoods, marketplaces, or readyToList on an existing item. Status changes go through flow_mark_listed / flow_mark_sold.',
      inputSchema: {
        id: z.string(),
        ...Object.fromEntries(Object.entries(itemFields).map(([key, schema]) => [key, schema.optional()])),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, ...patch }) => {
      if (!getItem(id)) return unknownItem(id);
      updateItem(id, definedOnly(patch));
      return ok({ item: getItem(id) });
    },
  );

  server.registerTool(
    'flow_delete_item',
    {
      title: 'Delete an item',
      description: 'Permanently remove an inventory item. Orders already recorded for it are kept.',
      inputSchema: { id: z.string() },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) => {
      if (!getItem(id)) return unknownItem(id);
      deleteItem(id);
      return ok({ deleted: id });
    },
  );

  server.registerTool(
    'flow_mark_listed',
    {
      title: 'Mark item as listed',
      description: 'Move a draft item to listed status and stamp listedAt with the current time.',
      inputSchema: { id: z.string() },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id }) => {
      if (!getItem(id)) return unknownItem(id);
      listItem(id);
      return ok({ item: getItem(id) });
    },
  );

  server.registerTool(
    'flow_mark_sold',
    {
      title: 'Record a sale',
      description:
        'Mark an item sold and create its order record. Profit for the order is salePrice minus costOfGoods, fees, and shippingExpense.',
      inputSchema: {
        id: z.string(),
        salePrice: money,
        marketplace: z.enum(MARKETPLACE_IDS).describe(`Where it sold. One of: ${MARKETPLACE_IDS.join(', ')}`),
        fees: money.optional().describe('Marketplace fees taken from the sale'),
        shippingFee: money.optional().describe('Shipping the buyer paid'),
        shippingExpense: money.optional().describe('Shipping you paid'),
        date: isoDay.optional().describe('Sale date, defaults to today'),
      },
      annotations: WRITE,
    },
    async ({ id, ...sale }) => {
      if (!getItem(id)) return unknownItem(id);
      markSold(id, definedOnly(sale));
      return ok({ item: getItem(id), order: listOrders().find((o) => o.itemId === id) });
    },
  );

  server.registerTool(
    'flow_list_orders',
    {
      title: 'List orders',
      description: 'List sale records, newest first. Pass from/to (YYYY-MM-DD, inclusive) to restrict the range.',
      inputSchema: { from: isoDay.optional(), to: isoDay.optional() },
      annotations: READ_ONLY,
    },
    async ({ from, to }) => ok({ orders: from && to ? ordersInRange(from, to) : listOrders() }),
  );

  server.registerTool(
    'flow_list_expenses',
    {
      title: 'List expenses',
      description: 'List business expenses, newest first. Pass from/to (YYYY-MM-DD, inclusive) to restrict the range.',
      inputSchema: { from: isoDay.optional(), to: isoDay.optional() },
      annotations: READ_ONLY,
    },
    async ({ from, to }) => ok({ expenses: from && to ? expensesInRange(from, to) : listExpenses() }),
  );

  server.registerTool(
    'flow_add_expense',
    {
      title: 'Add an expense',
      description: 'Record a business expense.',
      inputSchema: {
        date: isoDay,
        description: z.string().min(1),
        category: z.enum(EXPENSE_CATEGORIES).describe(`One of: ${EXPENSE_CATEGORIES.join(', ')}`),
        amount: money,
      },
      annotations: WRITE,
    },
    async (expense) => {
      addExpense(expense);
      return ok({ expense: listExpenses()[0] });
    },
  );

  server.registerTool(
    'flow_delete_expense',
    {
      title: 'Delete an expense',
      description: 'Permanently remove an expense record by id.',
      inputSchema: { id: z.string() },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) => {
      if (!listExpenses().some((e) => e.id === id)) {
        return fail(`No expense with id "${id}". Use flow_list_expenses to find ids.`);
      }
      deleteExpense(id);
      return ok({ deleted: id });
    },
  );

  server.registerTool(
    'flow_get_goals',
    {
      title: 'Get monthly goals',
      description: 'Read the monthly revenue and sales-count goals.',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => ok({ goals: getGoals() }),
  );

  server.registerTool(
    'flow_set_goals',
    {
      title: 'Set monthly goals',
      description: 'Update the monthly revenue goal (dollars) and/or the monthly sales-count goal. Pass null to clear one.',
      inputSchema: {
        monthlyRevenue: money.nullable().optional(),
        monthlySales: z.number().int().nonnegative().nullable().optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async (goals) => {
      setGoals(definedOnly(goals));
      return ok({ goals: getGoals() });
    },
  );

  server.registerTool(
    'flow_summary',
    {
      title: 'Profit summary for a date range',
      description:
        'Totals for an inclusive YYYY-MM-DD range: sales count, revenue, fees, shippingExpense, cogs, expenses, and profit (revenue - cogs - fees - shippingExpense - expenses).',
      inputSchema: { from: isoDay, to: isoDay },
      annotations: READ_ONLY,
    },
    async ({ from, to }) => {
      const orders = ordersInRange(from, to);
      const revenue = sum(orders, 'salePrice');
      const fees = sum(orders, 'fees');
      const shippingExpense = sum(orders, 'shippingExpense');
      const cogs = sum(orders, 'cogs');
      const expenses = sum(expensesInRange(from, to), 'amount');
      return ok({
        from,
        to,
        sales: orders.length,
        revenue,
        fees,
        shippingExpense,
        cogs,
        expenses,
        profit: revenue - cogs - fees - shippingExpense - expenses,
      });
    },
  );

  return server;
}

function ok(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
}
function fail(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}
function unknownItem(id) {
  return fail(`No item with id "${id}". Use flow_list_items to find ids.`);
}
function definedOnly(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}
function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}
