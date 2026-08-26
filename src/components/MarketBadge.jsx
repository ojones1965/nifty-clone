import { MARKETPLACES } from '../lib/store';

// Small colored square with the marketplace's initial, like the real app's icons.
export default function MarketBadge({ id, size = 22 }) {
  const mp = MARKETPLACES.find((m) => m.id === id);
  if (!mp) return null;
  return (
    <span
      className="market-badge"
      title={mp.name}
      style={{ background: mp.color, width: size, height: size, fontSize: size * 0.55 }}
    >
      {mp.name[0]}
    </span>
  );
}
