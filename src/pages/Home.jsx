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
  setGoals,
} from '../lib/store';
import { useStoreVersion } from '../lib/useStore';
import { moneyShort } from '../lib/format';
import Modal from '../components/Modal';

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

  // Goals: progress this calendar month.
  const goals = getGoals();
  const monthStart = today.slice(0, 8) + '01';
  const monthOrders = orders.filter((o) => o.date >= monthStart);
  const monthRevenue = monthOrders.reduce((s, o) => s + o.salePrice, 0);
  const monthSales = monthOrders.length;

  const dismissed = getDismissedAlerts();
  const allAlerts = computeAlerts();
  const active = allAlerts.filter((a) => !dismissed.includes(a.key));
  const dismissedAlerts = allAlerts.filter((a) => dismissed.includes(a.key));
  const shown = alertTab === 'active' ? active : dismissedAlerts;

  return (
    <div className="page">
      <header className="page-topbar">
        <h1 className="topbar-title">Home</h1>
      </header>

      <section className="card summary-card">
        <h2>Today's summary</h2>
        <p className="card-sub">Your numbers at a glance</p>

        <div className="section-label">Automation</div>
        <div className="stat-grid">
          <StatBox value={auto.shares.toLocaleString()} label="Shares" />
          <StatBox value={auto.relists} label="Relists" />
          <StatBox value={auto.offers} label="Offers" />
          <StatBox value={auto.follows} label="Follows" />
        </div>

        <hr className="rule" />

        <div className="section-label">Analytics</div>
        <div className="stat-grid">
          <StatBox value={listedToday} label="Listed" />
          <StatBox value={todaysOrders.length} label="Sold" />
          <StatBox value={moneyShort(revenueToday)} label="Revenue" />
          <StatBox value={moneyShort(profitToday)} label="Profit" />
        </div>
      </section>

      <section className="card">
        <h2>Goals</h2>
        <p className="card-sub">Track your progress against the targets you set</p>
        <button className="btn btn-outline" onClick={() => setEditingGoals(true)}>
          Edit goals
        </button>
        {goals.monthlyRevenue == null && goals.monthlySales == null ? (
          <p className="card-note">Set time-based targets to measure your progress.</p>
        ) : (
          <div className="goal-list">
            {goals.monthlyRevenue != null && (
              <GoalRow
                label="Monthly revenue"
                current={monthRevenue}
                target={goals.monthlyRevenue}
                fmt={moneyShort}
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
        )}
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

      {editingGoals && (
        <GoalsModal goals={goals} onClose={() => setEditingGoals(false)} />
      )}
    </div>
  );
}

function GoalRow({ label, current, target, fmt }) {
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
