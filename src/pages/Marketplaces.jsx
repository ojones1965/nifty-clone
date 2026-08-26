import { Link } from 'react-router-dom';
import {
  connectMarketplace,
  disconnectMarketplace,
  getMarketplaces,
  markMarketplaceVerified,
  MARKETPLACES,
  setMarketplaceUsername,
  setPrimaryMarketplace,
} from '../lib/store';
import { useStoreVersion } from '../lib/useStore';
import MarketBadge from '../components/MarketBadge';

export default function Marketplaces() {
  useStoreVersion();
  const { primary, accounts } = getMarketplaces();

  return (
    <div className="page">
      <header className="page-topbar">
        <Link to="/settings" className="back-link">← Back to settings</Link>
      </header>

      <div className="topbar-heading">
        <h1 className="topbar-title">Marketplaces</h1>
        <span className="topbar-date">
          Connect your marketplace accounts to enable listing and automation.
        </span>
      </div>

      {MARKETPLACES.map((mp) => {
        const account = accounts[mp.id];
        if (!account) return null;
        const isPrimary = primary === mp.id;
        const needsVerification = mp.id === 'mercari' && !account.connected && !account.verified;

        return (
          <section className="card" key={mp.id}>
            <div className="card-head">
              <div className="mp-head">
                <MarketBadge id={mp.id} size={28} />
                <span className="mp-head-name">{mp.name}</span>
              </div>
              {isPrimary ? (
                <span className="primary-badge">Primary</span>
              ) : account.connected ? (
                <button className="link-btn" onClick={() => setPrimaryMarketplace(mp.id)}>
                  Set as primary
                </button>
              ) : null}
            </div>

            {account.connected ? (
              <>
                <div className="status-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12.5l3 3 5.5-6.5" />
                  </svg>
                  <span className="status-row-text">Signed in</span>
                  <button className="link-btn danger" onClick={() => disconnectMarketplace(mp.id)}>
                    Disconnect
                  </button>
                </div>
                <label className="field">
                  <span>Username</span>
                  <input
                    value={account.username}
                    placeholder="your-username"
                    onChange={(e) => setMarketplaceUsername(mp.id, e.target.value)}
                  />
                </label>
              </>
            ) : needsVerification ? (
              <>
                <p className="card-sub">
                  Before connecting Mercari, complete these verification steps:
                </p>
                <ol className="verify-steps">
                  <li>Go to Settings → Verifications on Mercari and verify both your phone and email</li>
                  <li>Go to Settings → Tax Center and submit your W9</li>
                </ol>
                <p className="card-note small">
                  These verifications are required by Mercari for all sellers using
                  third-party listing tools.
                </p>
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => markMarketplaceVerified(mp.id)}
                >
                  I've completed these steps
                </button>
              </>
            ) : (
              <>
                <p className="card-sub">Not connected.</p>
                <button
                  className="btn btn-outline"
                  onClick={() => connectMarketplace(mp.id)}
                >
                  Connect {mp.name}
                </button>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
