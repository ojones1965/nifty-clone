import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getMarketplaces, MARKETPLACES } from '../lib/store';
import { getSyncStatus, getSyncToken, setSyncToken } from '../lib/sync.js';
import { useStoreVersion } from '../lib/useStore';
import MarketBadge from '../components/MarketBadge';

const SYNC_STATUS_LABEL = {
  off: 'Off — data stays in this browser',
  ok: 'Synced with the server',
  unauthorized: 'Token rejected by the server',
  offline: 'Server unreachable',
};

export default function Settings() {
  useStoreVersion();

  const { primary, accounts } = getMarketplaces();
  const connected = MARKETPLACES.filter((mp) => accounts[mp.id]?.connected);
  const [token, setToken] = useState(getSyncToken());
  const syncStatus = getSyncStatus();

  function handleSaveToken(e) {
    e.preventDefault();
    setSyncToken(token.trim());
  }

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
        <div className="card-head">
          <div className="eyebrow">Marketplaces</div>
          <Link to="/settings/marketplaces" className="card-link">Manage</Link>
        </div>
        <p className="card-sub">
          {connected.length} connected
          {primary ? ` · Primary: ${MARKETPLACES.find((m) => m.id === primary)?.name}` : ''}
        </p>
        <div className="mp-chip-row">
          {connected.map((mp) => (
            <div className="mp-chip" key={mp.id}>
              <MarketBadge id={mp.id} size={22} />
              <span>{mp.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="eyebrow">Server sync</div>
        <p className="card-sub">
          Paste the FLOW_TOKEN from the server to share data with the MCP endpoint and other devices.
        </p>
        <form className="field" onSubmit={handleSaveToken}>
          <span>Token</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            placeholder="leave empty to keep data local"
          />
          <div>
            <button className="btn btn-outline" type="submit">Save</button>
          </div>
        </form>
        <p className="card-sub">Status: {SYNC_STATUS_LABEL[syncStatus]}</p>
      </section>

      <section className="card">
        <div className="eyebrow">Data</div>
        <p className="card-sub">
          Everything is stored in this browser. Download a backup occasionally —
          clearing browser data would erase the app's data.
        </p>
        <button className="btn btn-outline" onClick={handleExport}>Download backup</button>
      </section>
    </div>
  );
}
