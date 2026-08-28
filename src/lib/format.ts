export const LKR = (n: number): string => {
  const v = Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
  return 'Rs. ' + v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const LKR_NUM = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const uid = (prefix = 'id'): string =>
  prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const seasonOf = (iso: string): 'Yala' | 'Maha' => {
  const m = Number(iso.slice(5, 7));
  // Sri Lanka: Yala roughly Apr–Aug, Maha Sep–Mar
  return m >= 4 && m <= 8 ? 'Yala' : 'Maha';
};

export const pct = (num: number, den: number): string => {
  if (!den) return '0.0%';
  return ((num / den) * 100).toFixed(1) + '%';
};

export const downloadFile = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const toCSV = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(','));
  return lines.join('\n');
};
