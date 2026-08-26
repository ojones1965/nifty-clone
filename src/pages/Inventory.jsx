import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listItems } from '../lib/store';
import { useStoreVersion } from '../lib/useStore';
import { moneyShort } from '../lib/format';
import MarketBadge from '../components/MarketBadge';

const TABS = [
  { id: 'listed', label: 'Listed' },
  { id: 'sold', label: 'Sold' },
  { id: 'draft', label: 'Drafts' },
];

export default function Inventory() {
  const navigate = useNavigate();
  useStoreVersion();
  const [tab, setTab] = useState('listed');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const all = listItems();
  const counts = {
    listed: all.filter((i) => i.status === 'listed').length,
    sold: all.filter((i) => i.status === 'sold').length,
    draft: all.filter((i) => i.status === 'draft').length,
  };

  let items = all.filter((i) => i.status === tab);
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    items = items.filter((i) => i.title.toLowerCase().includes(q));
  }
  items = [...items].sort((a, b) => {
    if (sort === 'newest') return b.createdAt - a.createdAt;
    if (sort === 'price-high') return (b.price || 0) - (a.price || 0);
    if (sort === 'price-low') return (a.price || 0) - (b.price || 0);
    return 0;
  });

  return (
    <div className="page">
      <header className="page-topbar">
        <h1 className="topbar-title">Inventory</h1>
        <button className="btn btn-primary" onClick={() => navigate('/item/new')}>
          + Add
        </button>
      </header>

      <div className="status-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'status-tab' + (tab === t.id ? ' active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label} <span className="status-count">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <div className="inv-controls">
        <input
          className="search-input"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="sort-select">
          <option value="newest">Newest</option>
          <option value="price-high">Price: high to low</option>
          <option value="price-low">Price: low to high</option>
        </select>
      </div>

      {items.length === 0 ? (
        <p className="card-note empty-list">
          {query ? 'No items match your search.' : `No ${tab === 'draft' ? 'drafts' : tab + ' items'} yet.`}
        </p>
      ) : (
        <div className="item-list">
          {items.map((item) => (
            <Link key={item.id} to={`/item/${item.id}`} className="item-row">
              <div className="item-thumb">
                {item.photos[0] ? (
                  <img src={item.photos[0]} alt="" />
                ) : (
                  <span className="thumb-placeholder">👕</span>
                )}
              </div>
              <div className="item-info">
                <p className="item-title">{item.title || 'Untitled draft'}</p>
                {item.costOfGoods != null && (
                  <p className="item-cogs">
                    Cost of goods: <strong>{moneyShort(item.costOfGoods)}</strong>
                  </p>
                )}
                <div className="item-markets">
                  {item.marketplaces.map((m) => (
                    <MarketBadge key={m} id={m} size={18} />
                  ))}
                </div>
              </div>
              <div className="item-side">
                <span className="item-price">
                  {moneyShort(item.status === 'sold' ? item.soldPrice : item.price)}
                </span>
                <span className={`status-badge status-${item.status}`}>
                  {item.status === 'draft' ? 'Draft' : item.status === 'sold' ? 'Sold' : 'Listed'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
