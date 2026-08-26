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

function StatBox({ value, label }) {
  return (
    <div className="stat-box">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// Alerts computed from live data; each has a stable key so dismissals stick.
function computeAlerts() {
  const alerts = [];
  const now = Date.now();
  for (const item of listItems('draft')) {
    if (item.readyToList) {
      alerts.push({
        key: `ready-${item.id}`,
        text: `"${item.title || 'Untitled draft'}" is marked ready to list.`,
        to: `/item/${item.id}`,
      });
    }
  }
  for (const item of listItems('listed')) {
    if (item.listedAt && now - item.listedAt > 30 * 86400000) {
      alerts.push({
        key: `stale-${item.id}`,
        text: `"${item.title}" has been listed for over 30 days — consider relisting or dropping the price.`,
        to: `/item/${item.id}`,
      });
    }
    if (item.costOfGoods == null) {
      alerts.push({
        key: `cogs-${item.id}`,
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

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="page">
      <header className="page-topbar">
        <div className="topbar-heading">
          <h1 className="topbar-title">Home</h1>
          <span className="topbar-date">{dateLabel}</span>
        </div>
        <Link to="/item/new" className="btn btn-primary">+ Add item</Link>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>{hasGoals ? `${monthName} pace` : 'Goals'}</h2>
          <button className="btn btn-outline btn-sm" onClick={() => setEditingGoals(true)}>
            Edit goals
          </button>
        </div>
        {hasGoals ? (
          <>
            <p className="card-sub">
              Day {dayOfMonth} of {daysInMonth} · {monthElapsedPct}% of the month gone
            </p>
            <div className="goal-list">
              {goals.monthlyRevenue != null && (
                <GoalRow
                  label="Monthly revenue"
                  current={monthRevenue}
                  target={goals.monthlyRevenue}
                  fmt={moneyShort}
                  markerPct={monthElapsedPct}
                  delta={
                    <div className={'pace-delta ' + (revenueDelta < 0 ? 'behind' : 'ahead')}>
                      {moneyShort(Math.abs(revenueDelta))}{' '}
                      {revenueDelta < 0 ? 'behind pace' : 'ahead of pace'}
                    </div>
                  }
                />
              )}
              {goals.monthlySales != null && (
                <GoalRow
                  label="Monthly sales"
                  current={monthSales}
                  target={goals.monthlySales}
                  fmt={(v) => v}
                />
              )}
            </div>
          </>
        ) : (
          <p className="card-note">Set time-based targets to measure your progress.</p>
        )}
      </section>

      <section className="card summary-card">
        <h2>Today's summary</h2>
        <p className="card-sub">Your numbers at a glance</p>

        <div className="stat-grid two">
          <div className="hero-box">
            <div className="hero-label">Revenue today</div>
            <div className="hero-value">{moneyShort(revenueToday)}</div>
          </div>
          <div className="hero-box">
            <div className="hero-label">Profit today</div>
            <div className="hero-value profit">{moneyShort(profitToday)}</div>
          </div>
        </div>
        <div className="stat-grid two">
          <StatBox value={todaysOrders.length} label="Sold" />
          <StatBox value={listedToday} label="Listed" />
        </div>

        <hr className="rule" />

        <div className="section-label">Automation</div>
        <div className="stat-grid">
          <StatBox value={auto.shares.toLocaleString()} label="Shares" />
          <StatBox value={auto.relists} label="Relists" />
          <StatBox value={auto.offers} label="Offers" />
          <StatBox value={auto.follows} label="Follows" />
        </div>
      </section>

      <section className="card">
        <h2>Needs attention</h2>
        <p className="card-sub">High-priority actions worth handling now</p>
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

      <section className="card table-card">
        <div className="table-head">
          <span>Recent sales</span>
          <Link to="/analytics" className="table-head-link">Analytics</Link>
        </div>
        {recentSales.length === 0 ? (
          <p className="card-note empty-list">No sales recorded yet.</p>
        ) : (
          recentSales.map((o) => {
            const profit = o.salePrice - o.cogs - o.fees - o.shippingExpense;
            const mpName = MARKETPLACES.find((m) => m.id === o.marketplace)?.name || o.marketplace;
            return (
              <div className="order-row" key={o.id}>
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
          })
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Inventory</h2>
          <Link to="/inventory" className="table-head-link">View all</Link>
        </div>
        <div className="stat-grid three">
          <StatBox value={draftCount} label="Drafts" />
          <StatBox value={listedCount} label="Listed" />
          <StatBox value={soldCount} label="Sold" />
        </div>
        {staleCount > 0 && (
          <p className="card-note">
            {staleCount} listing{staleCount === 1 ? ' has' : 's have'} been up more than 30 days.
          </p>
        )}
      </section>

      {editingGoals && (
        <GoalsModal goals={goals} onClose={() => setEditingGoals(false)} />
      )}
    </div>
  );
}

function GoalRow({ label, current, target, fmt, markerPct, delta }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="goal-row">
      <div className="goal-head">
        <span>{label}</span>
        <span className="goal-nums">
          {fmt(current)} / {fmt(target)}
        </span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: pct + '%' }} />
      </div>
      {markerPct != null && (
        <div className="pace-track">
          <div className="pace-marker" style={{ left: markerPct + '%' }}>
            <span>today</span>
          </div>
        </div>
      )}
      {delta}
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
