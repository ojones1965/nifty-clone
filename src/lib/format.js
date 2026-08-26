export function money(n) {
  if (n == null || isNaN(n)) return '—';
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function moneyShort(n) {
  if (n == null || isNaN(n)) return '—';
  const v = Number(n);
  return Number.isInteger(v) ? '$' + v : '$' + v.toFixed(2);
}
