// Tiny SVG sparkline for the Insights cards.
export default function Sparkline({ data, width = 130, height = 44, color = '#0d9488' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (width - 4) + 2;
      const y = height - 4 - (v / max) * (height - 10);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}
