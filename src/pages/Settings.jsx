import {
  getMarketplaceLinks,
  MARKETPLACES,
  toggleMarketplaceLink,
} from '../lib/store';
import { useStoreVersion } from '../lib/useStore';
import MarketBadge from '../components/MarketBadge';

export default function Settings() {
  useStoreVersion();

  const links = getMarketplaceLinks();

  function handleExport() {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      dump[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="page">
      <header className="page-topbar">
        <h1 className="topbar-title">Settings</h1>
      </header>

      <section className="card">
        <h2>Marketplace connections</h2>
        <p className="card-sub">Linked marketplaces can be selected when listing items.</p>
        <div className="mp-list">
          {MARKETPLACES.map((mp) => (
            <div className="mp-row" key={mp.id}>
              <MarketBadge id={mp.id} size={26} />
              <span className="mp-name">{mp.name}</span>
              <label className="toggle-row compact">
                <input
                  type="checkbox"
                  checked={!!links[mp.id]}
                  onChange={() => toggleMarketplaceLink(mp.id)}
                />
                <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Data</h2>
        <p className="card-sub">
          Everything is stored in this browser. Download a backup occasionally —
          clearing browser data would erase the app's data.
        </p>
        <button className="btn btn-outline" onClick={handleExport}>Download backup</button>
      </section>
    </div>
  );
}
