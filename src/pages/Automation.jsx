import { useState } from 'react';
import {
  getAutomation,
  getMarketplaceLinks,
  MARKETPLACES,
  toggleAutomation,
} from '../lib/store';
import { useStoreVersion } from '../lib/useStore';
import MarketBadge from '../components/MarketBadge';

function mpName(id) {
  return MARKETPLACES.find((m) => m.id === id)?.name || id;
}

function AutoToggle({ kind, enabled }) {
  return (
    <label className="toggle-row compact">
      <input type="checkbox" checked={enabled} onChange={() => toggleAutomation(kind)} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
    </label>
  );
}

// Status banner under each automation card: running (accent tint) or paused.
function AutoBanner({ kind, enabled, runningText }) {
  return (
    <div className={'auto-banner' + (enabled ? '' : ' paused')}>
      <span className="auto-banner-text">
        {enabled ? runningText : 'Paused — turn the switch on to resume.'}
      </span>
      <AutoToggle kind={kind} enabled={enabled} />
    </div>
  );
}

function SectionHead({ id }) {
  return (
    <div className="mp-section-head">
      <MarketBadge id={id} size={30} />
      <span className="mp-section-name">{mpName(id)}</span>
    </div>
  );
}

export default function Automation() {
  useStoreVersion();
  const [tab, setTab] = useState('dashboard');
  const auto = getAutomation();
  const links = getMarketplaceLinks();

  return (
    <div className="page">
      <header className="page-topbar">
        <h1 className="topbar-title">Automation</h1>
        <div className="pill-tabs">
          <button
            className={tab === 'dashboard' ? 'active' : ''}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={tab === 'history' ? 'active' : ''}
            onClick={() => setTab('history')}
          >
            History
          </button>
        </div>
      </header>

      {tab === 'history' ? (
        <section className="card">
          <div className="eyebrow">History</div>
          <p className="card-note">
            No automation history yet — completed runs will appear here.
          </p>
        </section>
      ) : (
        <>
          {links.poshmark && (
            <>
              <SectionHead id="poshmark" />

              <section className="card">
                <div className="eyebrow">Shares &amp; relists</div>
                <div className="stat-grid">
                  <div className="stat-box">
                    <div className="stat-value">{auto.poshmark.selfShares.toLocaleString()}</div>
                    <div className="stat-label">Self shares</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{auto.poshmark.partyShares.toLocaleString()}</div>
                    <div className="stat-label">Party shares</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{auto.poshmark.communityShares.toLocaleString()}</div>
                    <div className="stat-label">Community</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{auto.poshmark.relists}</div>
                    <div className="stat-label">Relists</div>
                  </div>
                </div>
                <AutoBanner
                  kind="shares"
                  enabled={auto.enabled.shares}
                  runningText="Automatically sharing & relisting on Poshmark throughout the day."
                />
              </section>

              <section className="card">
                <div className="card-head">
                  <div className="eyebrow">Offers</div>
                  <span className="card-aside">to likers</span>
                </div>
                <div className="auto-count">{auto.poshmark.offers.toLocaleString()}</div>
                <AutoBanner
                  kind="offers"
                  enabled={auto.enabled.offers}
                  runningText="Automatically offering on Poshmark throughout the day."
                />
              </section>

              <section className="card">
                <div className="eyebrow">Follows</div>
                <div className="stat-grid three">
                  <div className="stat-box">
                    <div className="stat-value">{auto.poshmark.reciprocalFollows.toLocaleString()}</div>
                    <div className="stat-label">Reciprocal</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{auto.poshmark.newFollows.toLocaleString()}</div>
                    <div className="stat-label">New follows</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{auto.poshmark.unfollows.toLocaleString()}</div>
                    <div className="stat-label">Unfollows</div>
                  </div>
                </div>
                <AutoBanner
                  kind="follows"
                  enabled={auto.enabled.follows}
                  runningText="Following daily to grow your audience."
                />
              </section>
            </>
          )}

          {['ebay', 'mercari'].map((id) =>
            links[id] ? (
              <div key={id} className="mp-section">
                <SectionHead id={id} />

                <section className="card">
                  <div className="card-head">
                    <div className="eyebrow">Offers</div>
                    <span className="card-aside">to watchers</span>
                  </div>
                  <div className="auto-count">{auto[id].offers.toLocaleString()}</div>
                  <AutoBanner
                    kind="offers"
                    enabled={auto.enabled.offers}
                    runningText={`Automatically offering on ${mpName(id)} throughout the day.`}
                  />
                </section>

                <section className="card">
                  <div className="card-head">
                    <div className="eyebrow">Recreates</div>
                    <span className="card-aside">stale listings</span>
                  </div>
                  <div className="auto-count">{auto[id].recreates.toLocaleString()}</div>
                  <AutoBanner
                    kind="relists"
                    enabled={auto.enabled.relists}
                    runningText={`Automatically recreating stale listings on ${mpName(id)} daily.`}
                  />
                </section>
              </div>
            ) : null
          )}

          <p className="card-note small">
            Note: real marketplace automation requires marketplace API access. These
            counters and switches track your setup locally.
          </p>
        </>
      )}
    </div>
  );
}
