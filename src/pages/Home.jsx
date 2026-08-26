import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  dismissAlert,
  getAutomation,
  getDismissedAlerts,
  getGoals,
  isoDate,
  listItems,
  listOrders,
  MARKETPLACES,
  setGoals,
} from '../lib/store';
import { useStoreVersion } from '../lib/useStore';
import { moneyShort } from '../lib/format';
import MarketBadge from '../components/MarketBadge';
import Modal from '../components/Modal';

function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Like moneyShort but with thousands separators — the pace card sets its
// number in 46px serif, where "$1,840" reads better than "$1840".
function moneyLoc(n) {
  if (n == null || isNaN(n)) return '—';
  const v = Number(n);
  return Number.isInteger(v)
    ? '$' + v.toLocaleString()
    : '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatBox({ value, label }) {
  return (
    <div className="stat-box">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const ALERT_DOTS = {
  ready: 'oklch(0.68 0.13 80)',
  stale: '#8a3418',
  cogs: '#c9c3b8',
};

// Alerts computed from live data; each has a stable key so dismissals stick.
function computeAlerts() {
  const alerts = [];
  const now = Date.now();
  for (const item of listItems('draft')) {
    if (item.readyToList) {
      alerts.push({
        key: `ready-${item.id}`,
        type: 'ready',
        text: `"${item.title || 'Untitled draft'}" is marked ready to list.`,
        to: `/item/${item.id}`,
      });
    }
  }
  for (const item of listItems('listed')) {
    if (item.listedAt && now - item.listedAt > 30 * 86400000) {
      alerts.push({
        key: `stale-${item.id}`,
        type: 'stale',
        text: `"${item.title}" has been listed for over 30 days — consider relisting or dropping the price.`,
        to: `/item/${item.id}`,
      });
    }
    if (item.costOfGoods == null) {
      alerts.push({
        key: `cogs-${item.id}`,
        type: 'cogs',
        text: `"${item.title}" is missing its cost of goods.`,
        to: `/item/${item.id}`,
      });
    }
  }
  return alerts;
}

export default function Home() {
  useStoreVersion();
  const [alertTab, setAlertTab] = useState('active');
  const [editingGoals, setEditingGoals] = useState(false);

  const auto = getAutomation();
  const today = isoDate();
  const orders = listOrders();
  const todaysOrders = orders.filter((o) => o.date === today);
  const listedToday = listItems().filter(
    (i) => i.listedAt && isoDate(new Date(i.listedAt)) === today
  ).length;
  const revenueToday = todaysOrders.reduce((s, o) => s + o.salePrice, 0);
  const profitToday = todaysOrders.reduce(
    (s, o) => s + o.salePrice - o.cogs - o.fees - o.shippingExpense,
    0
  );

  // Goals: progress this calendar month, measured against how far through
  // the month we are.
  const goals = getGoals();
  const monthStart = today.slice(0, 8) + '01';
  const monthOrders = orders.filter((o) => o.date >= monthStart);
  const monthRevenue = monthOrders.reduce((s, o) => s + o.salePrice, 0);
  const monthSales = monthOrders.length;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthElapsed = dayOfMonth / daysInMonth;
  const monthElapsedPct = Math.round(monthElapsed * 100);
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const hasGoals = goals.monthlyRevenue != null || goals.monthlySales != null;
  const revenueDelta = goals.monthlyRevenue != null
    ? Math.round(monthRevenue - goals.monthlyRevenue * monthElapsed)
    : null;
  const revenuePct = goals.monthlyRevenue > 0
    ? Math.min(100, Math.round((monthRevenue / goals.monthlyRevenue) * 100))
    : 0;
  const salesPct = goals.monthlySales > 0
    ? Math.min(100, Math.round((monthSales / goals.monthlySales) * 100))
    : 0;

  const recentSales = orders.slice(0, 4);
  const draftCount = listItems('draft').length;
  const listedCount = listItems('listed').length;
  const soldCount = listItems('sold').length;
  const staleCount = listItems('listed').filter(
    (i) => i.listedAt && Date.now() - i.listedAt > 30 * 86400000
  ).length;

  const dismissed = getDismissedAlerts();
  const allAlerts = computeAlerts();
  const active = allAlerts.filter((a) => !dismissed.includes(a.key));
  const dismissedAlerts = allAlerts.filter((a) => dismissed.includes(a.key));
  const shown = alertTab === 'active' ? active : dismissedAlerts;

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="page">
      <header className="page-topbar baseline">
        <div className="topbar-heading">
          <h1 className="topbar-title">Home</h1>
          <span className="topbar-date">{dateLabel} · day {dayOfMonth} of {daysInMonth}</span>
        </div>
        <Link to="/item/new" className="btn btn-primary">+ Add item</Link>
      </header>

      <section className="card">
        {hasGoals ? (
          <>
            <div className="card-head">
              <div className="eyebrow">{monthName} pace</div>
              {goals.monthlyRevenue != null ? (
                <div className={'pace-pill ' + (revenueDelta < 0 ? 'behind' : 'ahead')}>
                  <span className="pace-dot" />
                  {moneyLoc(Math.abs(revenueDelta))} {revenueDelta < 0 ? 'behind' : 'ahead'}
                </div>
              ) : (
                <button className="link-btn" onClick={() => setEditingGoals(true)}>
                  Edit goals
                </button>
              )}
            </div>
            {goals.monthlyRevenue != null && (
              <div>
                <div className="pace-big">
                  <span className="pace-amount">{moneyLoc(monthRevenue)}</span>
                  <span className="pace-of">of {moneyLoc(goals.monthlyRevenue)}</span>
                </div>
                <div className="pace-bar">
                  <div className="pace-fill" style={{ width: revenuePct + '%' }} />
                </div>
                <div className="pace-track">
                  <div className="pace-marker" style={{ left: monthElapsedPct + '%' }}>
                    <span>Today · {monthElapsedPct}% of month</span>
                  </div>
                </div>
              </div>
            )}
            {goals.monthlySales != null && (
              <div className="pace-sales">
                <span className="pace-sales-label">Monthly sales</span>
                <div className="pace-sales-right">
                  <div className="progress">
                    <div className="progress-fill muted" style={{ width: salesPct + '%' }} />
                  </div>
                  <span className="pace-sales-nums">{monthSales} / {goals.monthlySales}</span>
                  {goals.monthlyRevenue != null && (
                    <button className="link-btn" onClick={() => setEditingGoals(true)}>
                      Edit goals
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card-head">
              <div className="eyebrow">Goals</div>
              <button className="link-btn" onClick={() => setEditingGoals(true)}>
                Edit goals
              </button>
            </div>
            <p className="card-note">Set time-based targets to measure your progress.</p>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div className="eyebrow">Today</div>
          <span className="card-aside">
            {todaysOrders.length} order{todaysOrders.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="stat-grid">
          <StatBox value={moneyShort(revenueToday)} label="Revenue" />
          <StatBox value={moneyShort(profitToday)} label="Profit" />
          <StatBox value={todaysOrders.length} label="Sold" />
          <StatBox value={listedToday} label="Listed" />
        </div>
        <hr className="rule" />
        <div className="eyebrow">Automation</div>
        <div className="stat-grid">
          <StatBox value={auto.shares.toLocaleString()} label="Shares" />
          <StatBox value={auto.relists} label="Relists" />
          <StatBox value={auto.offers} label="Offers" />
          <StatBox value={auto.follows} label="Follows" />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div className="eyebrow">Needs attention</div>
          <div className="pill-tabs">
            <button
              className={alertTab === 'active' ? 'active' : ''}
              onClick={() => setAlertTab('active')}
            >
              Active ({active.length})
            </button>
            <button
              className={alertTab === 'dismissed' ? 'active' : ''}
              onClick={() => setAlertTab('dismissed')}
            >
              Dismissed
            </button>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="card-note">
            {alertTab === 'active'
              ? "Your shop is flawless! Keep on keepin' on."
              : 'Nothing dismissed.'}
          </p>
        ) : (
          <div className="alert-list">
            {shown.map((a) => (
              <div className="alert-row" key={a.key}>
                <span className="alert-dot" style={{ background: ALERT_DOTS[a.type] }} />
                <Link to={a.to} className="alert-text">{a.text}</Link>
                {alertTab === 'active' && (
                  <button
                    className="icon-btn"
                    title="Dismiss"
                    onClick={() => dismissAlert(a.key)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div className="eyebrow">Recent sales</div>
          <Link to="/analytics" className="card-link">Analytics</Link>
        </div>
        {recentSales.length === 0 ? (
          <p className="card-note">No sales recorded yet.</p>
        ) : (
          <div className="row-list">
            {recentSales.map((o) => {
              const profit = o.salePrice - o.cogs - o.fees - o.shippingExpense;
              const mpName = MARKETPLACES.find((m) => m.id === o.marketplace)?.name || o.marketplace;
              return (
                <div className="list-row" key={o.id}>
                  <MarketBadge id={o.marketplace} size={26} />
                  <div className="order-info">
                    <p className="order-title">{o.title}</p>
                    <p className="order-meta">{mpName} · {shortDate(o.date)}</p>
                  </div>
                  <div className="order-side">
                    <span className="order-price">{moneyShort(o.salePrice)}</span>
                    <span className={'order-profit' + (profit < 0 ? ' neg' : '')}>
                      {profit >= 0 ? '+' : ''}{moneyShort(profit)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div className="eyebrow">Inventory</div>
          <Link to="/inventory" className="card-link">View all</Link>
        </div>
        <div className="stat-grid three">
          <StatBox value={draftCount} label="Drafts" />
          <StatBox value={listedCount} label="Listed" />
          <StatBox value={soldCount} label="Sold" />
        </div>
        {staleCount > 0 && (
          <div className="card-foot">
            {staleCount} listing{staleCount === 1 ? ' has' : 's have'} been up more than 30 days.
          </div>
        )}
      </section>

      {editingGoals && (
        <GoalsModal goals={goals} onClose={() => setEditingGoals(false)} />
      )}
    </div>
  );
}

function GoalsModal({ goals, onClose }) {
  const [revenue, setRevenue] = useState(goals.monthlyRevenue ?? '');
  const [sales, setSales] = useState(goals.monthlySales ?? '');

  function handleSave(e) {
    e.preventDefault();
    setGoals({
      monthlyRevenue: revenue === '' ? null : Number(revenue),
      monthlySales: sales === '' ? null : Number(sales),
    });
    onClose();
  }

  return (
    <Modal title="Edit goals" onClose={onClose}>
      <form className="form" onSubmit={handleSave}>
        <label className="field">
          <span>Monthly revenue target ($)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            placeholder="e.g. 2500"
          />
        </label>
        <label className="field">
          <span>Monthly sales target (items)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={sales}
            onChange={(e) => setSales(e.target.value)}
            placeholder="e.g. 80"
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save goals</button>
        </div>
      </form>
    </Modal>
  );
}
