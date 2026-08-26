import { getAutomation, toggleAutomation } from '../lib/store';
import { useStoreVersion } from '../lib/useStore';

const KINDS = [
  { id: 'shares', label: 'Auto-share listings', desc: 'Shares your active listings to followers throughout the day.' },
  { id: 'relists', label: 'Auto-relist stale items', desc: 'Relists items that have been active for 30+ days.' },
  { id: 'offers', label: 'Auto-send offers', desc: 'Sends offers to likers with a discount you choose.' },
  { id: 'follows', label: 'Auto-follow', desc: 'Follows new users to grow your audience.' },
];

export default function Automation() {
  useStoreVersion();
  const auto = getAutomation();

  return (
    <div className="page">
      <header className="page-topbar">
        <h1 className="topbar-title">Automation</h1>
      </header>

      <section className="card">
        <h2>Today's activity</h2>
        <div className="stat-grid">
          <div className="stat-box"><div className="stat-value">{auto.shares.toLocaleString()}</div><div className="stat-label">Shares</div></div>
          <div className="stat-box"><div className="stat-value">{auto.relists}</div><div className="stat-label">Relists</div></div>
          <div className="stat-box"><div className="stat-value">{auto.offers}</div><div className="stat-label">Offers</div></div>
          <div className="stat-box"><div className="stat-value">{auto.follows}</div><div className="stat-label">Follows</div></div>
        </div>
      </section>

      <section className="card">
        <h2>Rules</h2>
        <div className="rule-list">
          {KINDS.map((k) => (
            <div className="rule-row" key={k.id}>
              <div className="rule-info">
                <p className="order-title">{k.label}</p>
                <p className="order-meta">{k.desc}</p>
              </div>
              <label className="toggle-row compact">
                <input
                  type="checkbox"
                  checked={auto.enabled[k.id]}
                  onChange={() => toggleAutomation(k.id)}
                />
                <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
              </label>
            </div>
          ))}
        </div>
        <p className="card-note small">
          Note: real marketplace automation requires marketplace API access. These
          toggles and counters track your setup locally.
        </p>
      </section>
    </div>
  );
}
