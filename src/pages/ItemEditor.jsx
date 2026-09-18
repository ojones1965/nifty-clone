import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createItem,
  deleteItem,
  getItem,
  getMarketplaceLinks,
  listItem,
  markSold,
  MARKETPLACES,
  updateItem,
  isoDate,
} from '../lib/store';
import MarketBadge from '../components/MarketBadge';
import Modal from '../components/Modal';
import { speakConfirmation } from '../lib/voice';

const EMPTY = {
  title: '',
  description: '',
  photos: [],
  price: '',
  costOfGoods: '',
  marketplaces: [],
  readyToList: false,
};

export default function ItemEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const existing = isNew ? null : getItem(id);
  const [draft, setDraft] = useState(() =>
    existing
      ? {
          ...existing,
          price: existing.price ?? '',
          costOfGoods: existing.costOfGoods ?? '',
        }
      : { ...EMPTY }
  );
  const [showSold, setShowSold] = useState(false);
  const [titleError, setTitleError] = useState('');
  const links = getMarketplaceLinks();

  useEffect(() => {
    if (!isNew && !existing) navigate('/inventory');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isNew && !existing) return null;
  const status = existing ? existing.status : 'draft';

  function set(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function toggleMarketplace(mpId) {
    if (!links[mpId]) return; // not linked
    set({
      marketplaces: draft.marketplaces.includes(mpId)
        ? draft.marketplaces.filter((m) => m !== mpId)
        : [...draft.marketplaces, mpId],
    });
  }

  function addPhotos(e) {
    const files = [...e.target.files];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // Downscale so photos fit comfortably in localStorage.
          const scale = Math.min(1, 500 / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setDraft((d) => ({ ...d, photos: [...d.photos, dataUrl].slice(0, 24) }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removePhoto(idx) {
    set({ photos: draft.photos.filter((_, i) => i !== idx) });
  }

  function fieldNumbers() {
    const price = draft.price === '' ? null : Number(draft.price);
    const costOfGoods = draft.costOfGoods === '' ? null : Number(draft.costOfGoods);
    return { price, costOfGoods };
  }

  function fieldsToSave() {
    const { price, costOfGoods } = fieldNumbers();
    return {
      title: draft.title.trim(),
      description: draft.description,
      photos: draft.photos,
      price,
      costOfGoods,
      marketplaces: draft.marketplaces,
      readyToList: draft.readyToList,
    };
  }

  function handleSaveDraft() {
    const payload = fieldsToSave();
    if (payload.title.length === 0) {
      setTitleError('Give the item a title before saving.');
      return;
    }
    if (payload.price !== null && Number.isNaN(payload.price)) return;
    if (payload.costOfGoods !== null && Number.isNaN(payload.costOfGoods)) return;
    if (isNew) {
      createItem(payload);
    } else {
      updateItem(id, payload);
    }
    navigate('/inventory');
  }

  const canList =
    draft.readyToList &&
    draft.title.trim() &&
    draft.price !== '' &&
    Number(draft.price) >= 0 &&
    draft.marketplaces.length > 0;

  function handleListItem() {
    let itemId = id;
    if (isNew) {
      itemId = createItem(fieldsToSave());
    } else {
      updateItem(id, fieldsToSave());
    }
    listItem(itemId);
    navigate('/inventory');
  }

  function handleDelete() {
    if (window.confirm('Delete this item?')) {
      if (!isNew) deleteItem(id);
      navigate('/inventory');
    }
  }

  return (
    <div className="page editor-page">
      <header className="page-topbar">
        <Link to="/inventory" className="back-link">← Back to inventory</Link>
      </header>

      <h1 className="editor-title">
        {isNew ? 'New item' : draft.title || 'Untitled draft'}
        {status !== 'draft' && (
          <span className={`status-badge status-${status}`}>
            {status === 'sold' ? 'Sold' : 'Listed'}
          </span>
        )}
      </h1>

      <section className="card">
        <h2>Where would you like to list this item?</h2>
        <div className="mp-list">
          {MARKETPLACES.map((mp) => {
            const linked = links[mp.id];
            const selected = draft.marketplaces.includes(mp.id);
            return (
              <button
                key={mp.id}
                type="button"
                className={'mp-row' + (linked ? '' : ' unlinked')}
                onClick={() => toggleMarketplace(mp.id)}
                disabled={!linked}
              >
                <MarketBadge id={mp.id} size={26} />
                <span className="mp-name">{mp.name}</span>
                <span className={'mp-state' + (selected ? ' checked' : '')}>
                  {linked ? (selected ? '✓' : '') : '⛓︎'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="card-note small">
          Grayed-out marketplaces aren't linked — manage links in Settings.
        </p>
      </section>

      <section className="card">
        <h2>Photos &amp; video</h2>
        <p className="card-sub">Add up to 24 photos</p>
        <div className="photo-grid">
          {draft.photos.map((p, i) => (
            <div className="photo-slot" key={i}>
              <img src={p} alt={`Photo ${i + 1}`} />
              <button className="photo-remove" onClick={() => removePhoto(i)} title="Remove">
                ×
              </button>
            </div>
          ))}
          {draft.photos.length < 24 && (
            <label className="photo-slot photo-add">
              <input type="file" accept="image/*" multiple onChange={addPhotos} hidden />
              <span>+</span>
            </label>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Details</h2>
        <div className="form">
          <label className="field">
            <span>Title</span>
            <input
              value={draft.title}
              aria-invalid={Boolean(titleError)}
              onChange={(e) => { set({ title: e.target.value }); setTitleError(''); }}
              placeholder="e.g. Nike Hoodie Gray Mens XL"
            />
            {titleError && <span className="field-error">{titleError}</span>}
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Condition, measurements, flaws..."
            />
          </label>
          <div className="field-row two">
            <label className="field">
              <span>Price ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(e) => set({ price: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Cost of goods ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.costOfGoods}
                onChange={(e) => set({ costOfGoods: e.target.value })}
              />
            </label>
          </div>
        </div>
      </section>

      <div className="editor-footer">
        {status === 'draft' && (
          <>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={draft.readyToList}
                onChange={(e) => set({ readyToList: e.target.checked })}
              />
              <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
              Ready to list
            </label>
            <div className="editor-actions">
              <button className="btn btn-outline" onClick={handleSaveDraft}>
                {isNew ? 'Save draft' : 'Update draft'}
              </button>
              <button className="btn btn-primary" disabled={!canList} onClick={handleListItem}>
                List item
              </button>
            </div>
            {!canList && (
              <p className="card-note small">
                To list this item: add a title and price, pick at least one
                marketplace, and turn on “Ready to list”.
              </p>
            )}
          </>
        )}
        {status === 'listed' && (
          <div className="editor-actions">
            <button className="btn btn-outline" onClick={handleSaveDraft}>Save changes</button>
            <button className="btn btn-primary" onClick={() => setShowSold(true)}>
              Mark as sold
            </button>
          </div>
        )}
        {status === 'sold' && (
          <p className="card-note">
            Sold on {existing.soldAt ? new Date(existing.soldAt).toLocaleDateString() : '—'} via{' '}
            {MARKETPLACES.find((m) => m.id === existing.soldMarketplace)?.name || '—'}.
          </p>
        )}
        <button className="btn btn-danger-ghost" onClick={handleDelete}>Delete item</button>
      </div>

      {showSold && (
        <SoldModal
          item={existing}
          defaultMarketplaces={draft.marketplaces}
          onClose={() => setShowSold(false)}
          onSold={() => navigate('/inventory')}
        />
      )}
    </div>
  );
}

function SoldModal({ item, defaultMarketplaces, onClose, onSold }) {
  const [salePrice, setSalePrice] = useState(item.price ?? '');
  const [marketplace, setMarketplace] = useState(defaultMarketplaces[0] || 'poshmark');
  const [fees, setFees] = useState('');
  const [shippingExpense, setShippingExpense] = useState('');
  const [date, setDate] = useState(isoDate());

  function handleSubmit(e) {
    e.preventDefault();
    markSold(item.id, {
      salePrice: Number(salePrice),
      marketplace,
      fees: fees === '' ? 0 : Number(fees),
      shippingExpense: shippingExpense === '' ? 0 : Number(shippingExpense),
      date,
    });
    const marketplaceName = MARKETPLACES.find((m) => m.id === marketplace)?.name || marketplace;
    speakConfirmation(`Sold ${item.title} for $${Number(salePrice)} on ${marketplaceName}.`);
    onClose();
    onSold();
  }

  return (
    <Modal title="Mark as sold" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field-row two">
          <label className="field">
            <span>Sale price ($)</span>
            <input
              type="number" min="0" step="0.01" required autoFocus
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Sold on</span>
            <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)}>
              {MARKETPLACES.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-row two">
          <label className="field">
            <span>Marketplace fees ($)</span>
            <input
              type="number" min="0" step="0.01"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Shipping cost you paid ($)</span>
            <input
              type="number" min="0" step="0.01"
              value={shippingExpense}
              onChange={(e) => setShippingExpense(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Sale date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Record sale</button>
        </div>
      </form>
    </Modal>
  );
}
