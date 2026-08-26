import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  expensesInRange,
  isoDate,
  itemsListedInRange,
  listExpenses,
  listOrders,
  MARKETPLACES,
  ordersInRange,
} from '../lib/store';
import { useStoreVersion } from '../lib/useStore';
import { money } from '../lib/format';
import MarketBadge from '../components/MarketBadge';
import Modal from '../components/Modal';
import Sparkline from '../components/Sparkline';

const TABS = ['orders', 'expenses', 'insights', 'profit'];

const RANGES = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '4w', label: 'Last 4 weeks', days: 28 },
  { id: '12w', label: 'Last 12 weeks', days: 84 },
  { id: '1y', label: 'Last year', days: 365 },
  { id: 'all', label: 'All time', days: 3650 },
];

function rangeDates(rangeId) {
  const r = RANGES.find((x) => x.id === rangeId) || RANGES[1];
  const end = new Date();
  const start = new Date(Date.now() - r.days * 86400000);
  return { start: isoDate(start), end: isoDate(end), startTs: start.getTime(), endTs: end.getTime(), days: r.days };
}

export default function Analytics() {
  const { tab = 'profit' } = useParams();
  const navigate = useNavigate();
  useStoreVersion();
  const [range, setRange] = useState('4w');

  const active = TABS.includes(tab) ? tab : 'profit';

  return (
    <div className="page">
      <header className="page-topbar">
        <h1 className="topbar-title">Analytics</h1>
      </header>

      <div className="pill-tabs scroll">
        {TABS.map((t) => (
          <button
            key={t}
            className={active === t ? 'active' : ''}
            onClick={() => navigate(`/analytics/${t}`)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {(active === 'insights' || active === 'profit') && (
        <div className="range-row">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="sort-select">
            {RANGES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
      )}

      {active === 'orders' && <OrdersTab />}
      {active === 'expenses' && <ExpensesTab />}
      {active === 'insights' && <InsightsTab range={range} />}
      {active === 'profit' && <ProfitTab range={range} />}
    </div>
  );
}

// ---------------- Orders ----------------
function OrdersTab() {
  const orders = listOrders();
  if (orders.length === 0) {
    return <p className="card-note empty-list">No orders yet — mark a listed item as sold to record one.</p>;
  }
  return (
    <div className="card table-card">
      {orders.map((o) => {
        const profit = o.salePrice - o.cogs - o.fees - o.shippingExpense;
        return (
          <div className="order-row" key={o.id}>
            <MarketBadge id={o.marketplace} size={26} />
            <div className="order-info">
              <p className="order-title">{o.title}</p>
              <p className="order-meta">{o.date}</p>
            </div>
            <div className="order-side">
              <span className="order-price">{money(o.salePrice)}</span>
              <span className={'order-profit' + (profit < 0 ? ' neg' : '')}>
                {profit >= 0 ? '+' : ''}{money(profit)} profit
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Expenses ----------------
function ExpensesTab() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [adding, setAdding] = useState(false);

  let expenses = listExpenses();
  if (category !== 'All') expenses = expenses.filter((e) => e.category === category);
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    expenses = expenses.filter((e) => e.description.toLowerCase().includes(q));
  }
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <div className="inv-controls">
        <input
          className="search-input"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add</button>
      </div>
      <div className="range-row">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="sort-select">
          <option>All</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {expenses.length === 0 ? (
        <p className="card-note empty-list">No expenses recorded.</p>
      ) : (
        <div className="card table-card">
          {expenses.map((e) => (
            <div className="expense-row" key={e.id}>
              <div className="expense-info">
                <p className="order-title">{e.description}</p>
                <p className="order-meta">{e.date} · {e.category}</p>
              </div>
              <span className="expense-amount">-{money(e.amount)}</span>
              <button
                className="icon-btn"
                title="Delete expense"
                onClick={() => window.confirm('Delete this expense?') && deleteExpense(e.id)}
              >
                ×
              </button>
            </div>
          ))}
          <div className="expense-row total-row">
            <div className="expense-info"><p className="order-title">Total</p></div>
            <span className="expense-amount">-{money(total)}</span>
            <span style={{ width: 26 }} />
          </div>
        </div>
      )}

      {adding && <ExpenseModal onClose={() => setAdding(false)} />}
    </>
  );
}

function ExpenseModal({ onClose }) {
  const [date, setDate] = useState(isoDate());
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim() || amount === '') return;
    addExpense({ date, description: description.trim(), category, amount: Number(amount) });
    onClose();
  }

  return (
    <Modal title="Add expense" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Description</span>
          <input autoFocus required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Poly mailers" />
        </label>
        <div className="field-row two">
          <label className="field">
            <span>Amount ($)</span>
            <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Add expense</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------- Insights ----------------
function dailySeries(dates, days) {
  // dates: array of 'YYYY-MM-DD'; returns per-day counts for the last `days` days.
  const buckets = new Array(Math.min(days, 60)).fill(0);
  const step = days / buckets.length;
  const now = Date.now();
  for (const d of dates) {
    const ts = new Date(d + 'T00:00:00').getTime();
    const agoDays = (now - ts) / 86400000;
    if (agoDays < 0 || agoDays >= days) continue;
    const idx = buckets.length - 1 - Math.floor(agoDays / step);
    if (idx >= 0 && idx < buckets.length) buckets[idx] += 1;
  }
  return buckets;
}

function InsightsTab({ range }) {
  const { start, end, startTs, endTs, days } = rangeDates(range);
  const orders = ordersInRange(start, end);
  const listed = itemsListedInRange(startTs, endTs);

  // Previous period for comparison.
  const prevStart = isoDate(new Date(startTs - days * 86400000));
  const prevOrders = ordersInRange(prevStart, start).filter((o) => o.date < start);
  const prevListed = itemsListedInRange(startTs - days * 86400000, startTs);

  const sellThrough = listed.length > 0 ? ((orders.length / listed.length) * 100).toFixed(1) : '0.0';
  const prevSellThrough = prevListed.length > 0 ? ((prevOrders.length / prevListed.length) * 100).toFixed(1) : '0.0';

  const revenue = orders.reduce((s, o) => s + o.salePrice, 0);
  const profit = orders.reduce((s, o) => s + o.salePrice - o.cogs - o.fees - o.shippingExpense, 0);

  const listedSeries = dailySeries(listed.map((i) => isoDate(new Date(i.listedAt))), days);
  const soldSeries = dailySeries(orders.map((o) => o.date), days);

  return (
    <>
      <InsightCard label="Units listed" value={listed.length} prev={`${prevListed.length} previous period`} series={listedSeries} />
      <InsightCard label="Units sold" value={orders.length} prev={`${prevOrders.length} previous period`} series={soldSeries} />
      <InsightCard label="Sell through rate" value={sellThrough + '%'} prev={`${prevSellThrough}% previous period`} series={soldSeries} />
      <section className="card">
        <h2 className="section-label">Revenue vs. Profit</h2>
        <div className="rev-profit">
          <div>
            <div className="section-label accent-violet">Total revenue</div>
            <div className="big-num">{money(revenue)}</div>
          </div>
          <div>
            <div className="section-label accent-teal">Total profit</div>
            <div className="big-num profit-num">{money(profit)}</div>
          </div>
        </div>
      </section>
    </>
  );
}

function InsightCard({ label, value, prev, series }) {
  return (
    <section className="card insight-card">
      <div>
        <div className="section-label">{label}</div>
        <div className="big-num">{value}</div>
        <div className="order-meta">{prev}</div>
      </div>
      <Sparkline data={series} />
    </section>
  );
}

// ---------------- Profit ----------------
function ProfitTab({ range }) {
  const { start, end } = rangeDates(range);
  const orders = ordersInRange(start, end);
  const expenses = expensesInRange(start, end);

  const revenue = orders.reduce((s, o) => s + o.salePrice, 0);
  const cogs = orders.reduce((s, o) => s + o.cogs, 0);
  const fees = orders.reduce((s, o) => s + o.fees, 0);
  const shippingFees = orders.reduce((s, o) => s + o.shippingFee, 0);
  const shippingExpenses = orders.reduce((s, o) => s + o.shippingExpense, 0);
  const cogsTotal = cogs + fees + shippingFees + shippingExpenses;
  const opex = expenses.reduce((s, e) => s + e.amount, 0);
  const net = revenue - cogsTotal - opex;

  const byMarketplace = MARKETPLACES.map((mp) => ({
    ...mp,
    total: orders.filter((o) => o.marketplace === mp.id).reduce((s, o) => s + o.salePrice, 0),
  })).filter((m) => m.total > 0);

  return (
    <>
      <section className="card pnl-summary">
        <div className="pnl-grid">
          <div>
            <div className="section-label">Revenue</div>
            <div className="big-num">{money(revenue)}</div>
          </div>
          <div>
            <div className="section-label">Cost of goods sold</div>
            <div className="big-num">{money(cogsTotal)}</div>
          </div>
          <div>
            <div className="section-label">Operating expenses</div>
            <div className="big-num">{money(opex)}</div>
          </div>
          <div>
            <div className="section-label">Net profit</div>
            <div className={'big-num ' + (net >= 0 ? 'profit-num' : 'loss-num')}>{money(net)}</div>
          </div>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-head">Revenue</div>
        {byMarketplace.map((m) => (
          <div className="ledger-row" key={m.id}>
            <MarketBadge id={m.id} size={22} />
            <span className="ledger-label">{m.name}</span>
            <span className="ledger-amount">{money(m.total)}</span>
          </div>
        ))}
        <div className="ledger-row total-row">
          <span style={{ width: 22 }} />
          <span className="ledger-label">Total</span>
          <span className="ledger-amount">{money(revenue)}</span>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-head">Cost of goods sold</div>
        <LedgerRow label="COGS (Orders)" amount={cogs} />
        <LedgerRow label="Standard Fees (Orders)" amount={fees} />
        <LedgerRow label="Shipping Fees (Orders)" amount={shippingFees} />
        <LedgerRow label="Shipping Expenses (Orders)" amount={shippingExpenses} />
        <div className="ledger-row total-row">
          <span className="ledger-label">Total</span>
          <span className="ledger-amount">{money(cogsTotal)}</span>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-head">Operating expenses</div>
        {EXPENSE_CATEGORIES.map((c) => {
          const catTotal = expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
          if (catTotal === 0) return null;
          return <LedgerRow key={c} label={c} amount={catTotal} />;
        })}
        <div className="ledger-row total-row">
          <span className="ledger-label">Total</span>
          <span className="ledger-amount">{money(opex)}</span>
        </div>
      </section>
    </>
  );
}

function LedgerRow({ label, amount }) {
  return (
    <div className="ledger-row">
      <span className="ledger-label">{label}</span>
      <span className="ledger-amount">{money(amount)}</span>
    </div>
  );
}
