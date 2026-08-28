import { useRef, useState, useMemo } from 'react';
import { Download, FileSpreadsheet, FileText, Upload, Database, Sparkles, TrendingUp, Sprout, BookOpen, BarChart3, Hammer } from 'lucide-react';
import { useStore } from '@/lib/store';
import { LKR, downloadFile, toCSV, fmtDate } from '@/lib/format';
import { nurseryTotals, farmOverallPnL, ledgerBalance } from '@/lib/calc';
import { exportCSV, exportAllZip, cropPnLRows, nurseryPnLRows, seasonRows, overallRow, exportPDFviaPrint } from '@/lib/export';
import { parseCSV, mapImport, mergeImport, sampleCSV, type ImportTarget } from '@/lib/import';
import { Card, Button, Badge, SectionTitle, Stat, Modal, Select } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { askAssistant, SUGGESTED_QUERIES } from '@/lib/assistant';
import type { AppData, Crop, NurseryBatch, Voucher, Expense, LedgerEntry, FarmDevelopment } from '@/lib/types';

interface ReportDef {
  key: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  getRows: (d: AppData, filters: ReportFilters) => Record<string, string | number>[];
  columns: { key: string; header: string }[];
}

interface ReportFilters {
  year: string;
  cropId: string;
  batchId: string;
}

const ALL_REPORTS: ReportDef[] = [
  {
    key: 'overall', title: 'Overall Farm P&L', desc: 'Revenue, cost & net profit', icon: <TrendingUp size={18} />,
    columns: [{ key: 'Item', header: 'Item' }, { key: 'Amount', header: 'Amount' }],
    getRows: (d, f) => {
      let data = d;
      if (f.year) data = filterByYear(d, f.year);
      if (f.cropId) data = filterByCrop(d, f.cropId);
      return overallRow(data);
    },
  },
  {
    key: 'season', title: 'Season P&L (Yala/Maha)', desc: 'Per-season profitability', icon: <BarChart3 size={18} />,
    columns: [{ key: 'Season', header: 'Season' }, { key: 'Revenue', header: 'Revenue' }, { key: 'Cost', header: 'Cost' }, { key: 'Profit', header: 'Profit' }, { key: 'Margin %', header: 'Margin %' }],
    getRows: (d, f) => {
      let data = d;
      if (f.year) data = filterByYear(d, f.year);
      return seasonRows(data);
    },
  },
  {
    key: 'crop', title: 'Crop-wise P&L', desc: 'Every crop with margin', icon: <TrendingUp size={18} />,
    columns: [{ key: 'Crop', header: 'Crop' }, { key: 'Revenue', header: 'Revenue' }, { key: 'Total cost', header: 'Total cost' }, { key: 'Profit', header: 'Profit' }, { key: 'Margin %', header: 'Margin %' }],
    getRows: (d, f) => {
      let data = d;
      if (f.year) data = filterByYear(d, f.year);
      if (f.cropId) data = filterByCrop(d, f.cropId);
      return cropPnLRows(data);
    },
  },
  {
    key: 'nursery', title: 'Nursery Batch P&L', desc: 'Batch & nursery totals', icon: <Sprout size={18} />,
    columns: [{ key: 'Code', header: 'Code' }, { key: 'Variety', header: 'Variety' }, { key: 'Sold', header: 'Sold' }, { key: 'Profit', header: 'Profit' }],
    getRows: (d, f) => {
      let data = d;
      if (f.year) data = filterByYear(d, f.year);
      if (f.batchId) data = filterByBatch(d, f.batchId);
      return nurseryPnLRows(data);
    },
  },
  {
    key: 'ledger', title: 'Funding & Liabilities', desc: 'Capital, loans, shop transfers', icon: <BookOpen size={18} />,
    columns: [{ key: 'Account', header: 'Account' }, { key: 'In', header: 'In' }, { key: 'Out', header: 'Out' }, { key: 'Balance', header: 'Balance' }],
    getRows: (d, f) => {
      let data = d;
      if (f.year) data = filterByYear(d, f.year);
      return ['Capital', 'Retail Shop Transfer', 'Bank Loan', 'Shop Credit', 'Owner Equity Return'].map((k) => { const b = ledgerBalance(data, k); return { Account: k, In: b.in, Out: b.out, Balance: b.net }; });
    },
  },
  {
    key: 'vouchers', title: 'Voucher Register', desc: 'All payment vouchers', icon: <FileText size={18} />,
    columns: [{ key: 'No', header: 'No' }, { key: 'Date', header: 'Date' }, { key: 'Type', header: 'Type' }, { key: 'Party', header: 'Party' }, { key: 'Amount', header: 'Amount' }],
    getRows: (d, f) => {
      let rows = d.vouchers;
      if (f.year) rows = rows.filter((v) => v.date.startsWith(f.year));
      return rows.map((v: Voucher) => ({ No: v.voucherNo, Date: v.date, Type: v.kind, Party: v.party, Description: v.description, Amount: v.amount, Reference: v.reference || '' }));
    },
  },
  {
    key: 'expenses', title: 'Expense Log Report', desc: 'All classified expenses', icon: <FileText size={18} />,
    columns: [{ key: 'Date', header: 'Date' }, { key: 'Class', header: 'Class' }, { key: 'Category', header: 'Category' }, { key: 'Amount', header: 'Amount' }],
    getRows: (d, f) => {
      let rows = d.expenses;
      if (f.year) rows = rows.filter((e) => e.date.startsWith(f.year));
      return rows.map((e: Expense) => ({ Date: e.date, Class: e.class, Category: e.category, Description: e.description, Amount: e.amount, Reference: e.reference || '' }));
    },
  },
  {
    key: 'capex', title: 'CAPEX — Farm Development Costs', desc: 'Fixed assets & infrastructure spend', icon: <Hammer size={18} />,
    columns: [{ key: 'Name', header: 'Name' }, { key: 'Category', header: 'Category' }, { key: 'Total Cost', header: 'Total Cost' }],
    getRows: (d, f) => {
      let rows = d.farmDevelopments;
      if (f.year) rows = rows.filter((dev) => dev.implementationDate.startsWith(f.year));
      return rows.map((dev: FarmDevelopment) => ({ Name: dev.name, Category: dev.category, 'Implementation Date': dev.implementationDate, 'Total Cost': dev.totalCost, 'Lifespan (yr)': dev.lifespanYears, 'Annual Depreciation': dev.lifespanYears > 0 ? +(dev.totalCost / dev.lifespanYears).toFixed(2) : 0 }));
    },
  },
];

function filterByYear(data: AppData, year: string): AppData {
  return {
    ...data,
    crops: data.crops.filter((c) => c.plantedDate.startsWith(year)),
    cropExpenses: data.cropExpenses.filter((e) => e.date.startsWith(year)),
    cropHarvests: data.cropHarvests.filter((h) => h.date.startsWith(year)),
    nurseryBatches: data.nurseryBatches.filter((b) => b.startDate.startsWith(year)),
    nurseryCosts: data.nurseryCosts.filter((c) => c.date.startsWith(year)),
    nurserySales: data.nurserySales.filter((s) => s.date.startsWith(year)),
    nurseryTransfers: data.nurseryTransfers.filter((t) => t.date.startsWith(year)),
    workers: data.workers,
    attendance: data.attendance.filter((a) => a.date.startsWith(year)),
    vouchers: data.vouchers.filter((v) => v.date.startsWith(year)),
    ledger: data.ledger.filter((l) => l.date.startsWith(year)),
    expenses: data.expenses.filter((e) => e.date.startsWith(year)),
    farmDevelopments: data.farmDevelopments.filter((d) => d.implementationDate.startsWith(year)),
  };
}

function filterByCrop(data: AppData, cropId: string): AppData {
  return {
    ...data,
    cropExpenses: data.cropExpenses.filter((e) => e.cropId === cropId),
    cropHarvests: data.cropHarvests.filter((h) => h.cropId === cropId),
    nurseryTransfers: data.nurseryTransfers.filter((t) => t.cropId === cropId),
  };
}

function filterByBatch(data: AppData, batchId: string): AppData {
  return {
    ...data,
    nurseryCosts: data.nurseryCosts.filter((c) => c.batchId === batchId),
    nurserySales: data.nurserySales.filter((s) => s.batchId === batchId),
    nurseryTransfers: data.nurseryTransfers.filter((t) => t.batchId === batchId),
  };
}

const IMPORT_TARGETS: { key: ImportTarget; label: string }[] = [
  { key: 'crops', label: 'Crops' },
  { key: 'cropExpenses', label: 'Crop expenses' },
  { key: 'cropHarvests', label: 'Crop harvests' },
  { key: 'nurseryBatches', label: 'Nursery batches' },
  { key: 'nurseryCosts', label: 'Nursery costs' },
  { key: 'nurserySales', label: 'Nursery sales' },
  { key: 'workers', label: 'Workers' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'ledger', label: 'Ledger entries' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'farmDevelopments', label: 'Farm development costs' },
];

export function ReportsModule() {
  const { data, replaceAll } = useStore();
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [importTarget, setImportTarget] = useState<ImportTarget | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importMsg, setImportMsg] = useState<string>('');
  const [filters, setFilters] = useState<ReportFilters>({ year: '', cropId: '', batchId: '' });

  const years = useMemo(() => {
    const ys = new Set<string>();
    data.crops.forEach((c) => ys.add(c.plantedDate.slice(0, 4)));
    data.vouchers.forEach((v) => ys.add(v.date.slice(0, 4)));
    data.expenses.forEach((e) => ys.add(e.date.slice(0, 4)));
    data.nurseryBatches.forEach((b) => ys.add(b.startDate.slice(0, 4)));
    return Array.from(ys).sort().reverse();
  }, [data]);

  const activeReport = ALL_REPORTS.find((r) => r.key === selectedReport);
  const filteredData = useMemo(() => {
    let d = data;
    if (filters.year) d = filterByYear(d, filters.year);
    if (filters.cropId) d = filterByCrop(d, filters.cropId);
    if (filters.batchId) d = filterByBatch(d, filters.batchId);
    return d;
  }, [data, filters]);

  const previewRows = activeReport ? activeReport.getRows(data, filters) : [];

  const onFile = (file: File) => {
    if (!importTarget) return;
    setImportMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      try {
        const rows = parseCSV(text);
        if (!rows.length) { setImportMsg('No rows found in file.'); return; }
        const records = mapImport(importTarget, rows);
        const next = mergeImport(data, importTarget, records, importMode);
        replaceAll(next);
        setImportMsg(`Imported ${records.length} records into "${importTarget}" (${importMode}).`);
      } catch (e) {
        setImportMsg('Import failed: ' + String(e));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Overall profit" value={LKR(farmOverallPnL(filteredData).profit)} tone="green" icon={<TrendingUp size={18} />} />
        <Stat label="Nursery net" value={LKR(nurseryTotals(filteredData).netProfit)} tone="blue" icon={<Sprout size={18} />} />
        <Stat label="Vouchers" value={String(filteredData.vouchers.length)} sub="Filtered" tone="yellow" icon={<FileText size={18} />} />
        <Stat label="Records" value={String(filteredData.crops.length + filteredData.nurseryBatches.length + filteredData.workers.length + filteredData.vouchers.length + filteredData.ledger.length)} sub="In database" tone="neutral" icon={<Database size={18} />} />
      </div>

      {/* Reports grid */}
      <Card className="p-5">
        <SectionTitle title="Reports & Exports" subtitle="One-click export to Excel (CSV) and PDF (A5 print) with multi-criteria filtering" icon={<FileSpreadsheet size={18} />}
          action={<Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => exportAllZip(data)}>Export all (JSON)</Button>} />

        {/* Filter bar */}
        <div className="grid sm:grid-cols-3 gap-3 mb-4 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
          <Select label="Filter by Year" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select label="Filter by Crop" value={filters.cropId} onChange={(e) => setFilters({ ...filters, cropId: e.target.value })}>
            <option value="">All crops</option>
            {data.crops.map((c: Crop) => <option key={c.id} value={c.id}>{c.name} · {c.plot}</option>)}
          </Select>
          <Select label="Filter by Nursery Batch" value={filters.batchId} onChange={(e) => setFilters({ ...filters, batchId: e.target.value })}>
            <option value="">All batches</option>
            {data.nurseryBatches.map((b: NurseryBatch) => <option key={b.id} value={b.id}>{b.code} · {b.variety}</option>)}
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_REPORTS.map((r) => {
            const rows = r.getRows(data, filters);
            return (
              <div key={r.key} className={`p-4 rounded-xl border transition group cursor-pointer ${selectedReport === r.key ? 'border-primary-400 shadow-card bg-primary-50/30' : 'border-neutral-200 hover:border-primary-300 hover:shadow-card'}`} onClick={() => setSelectedReport(selectedReport === r.key ? null : r.key)}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">{r.icon}</div>
                  <Badge tone="gray">{rows.length} rows</Badge>
                </div>
                <div className="mt-3 font-600 text-sm text-neutral-900">{r.title}</div>
                <div className="text-xs text-neutral-500">{r.desc}</div>
                <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" icon={<FileSpreadsheet size={13} />} onClick={() => exportCSV(`${r.key}_report.csv`, rows)}>Excel</Button>
                  <Button size="sm" variant="ghost" icon={<FileText size={13} />} onClick={() => exportPDFviaPrint(r.title, rows)}>PDF</Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* On-screen preview table */}
        {activeReport && previewRows.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-sm font-700 text-neutral-900">{activeReport.title} — Preview ({previewRows.length} rows)</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" icon={<FileSpreadsheet size={13} />} onClick={() => exportCSV(`${activeReport.key}_report.csv`, previewRows)}>Export Excel</Button>
                <Button size="sm" variant="ghost" icon={<FileText size={13} />} onClick={() => exportPDFviaPrint(activeReport.title, previewRows)}>Export PDF</Button>
              </div>
            </div>
            <ReportPreviewTable rows={previewRows} />
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Import */}
        <Card className="p-5">
          <SectionTitle title="Bulk Excel / CSV Import" subtitle="Migrate historical data into the system" icon={<Upload size={18} />} />
          <p className="text-sm text-neutral-600 mb-3">Save your Excel sheet as <strong>.csv</strong>, pick a target, and upload. Columns should match field names (id, date, amount, etc.).</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Target" value={importTarget || ''} onChange={(e) => setImportTarget(e.target.value as ImportTarget)}>
              <option value="">Select target…</option>
              {IMPORT_TARGETS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
            <Select label="Mode" value={importMode} onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}>
              <option value="append">Append to existing</option>
              <option value="replace">Replace all</option>
            </Select>
          </div>
          <div className="mt-4">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
            <div className="flex gap-2">
              <Button size="md" icon={<Upload size={15} />} disabled={!importTarget} onClick={() => fileRef.current?.click()}>Choose CSV file</Button>
              <Button size="md" variant="outline" icon={<Download size={15} />} disabled={!importTarget} onClick={() => { if (!importTarget) return; downloadFile(`${importTarget}_template.csv`, sampleCSV(importTarget), 'text/csv;charset=utf-8;'); }}>Download Sample CSV Template</Button>
            </div>
          </div>
          {importMsg && <div className="mt-3 p-3 rounded-xl bg-accent-50 text-sm text-accent-800">{importMsg}</div>}
        </Card>

        {/* AI assistant shortcut */}
        <Card className="p-5">
          <SectionTitle title="AI Financial Assistant" subtitle="Natural-language queries with exportable answers" icon={<Sparkles size={18} />} action={<Button size="sm" onClick={() => setAiOpen(true)}>Open</Button>} />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUERIES.map((q) => (
              <button key={q} onClick={() => { navigator.clipboard?.writeText(q); setAiOpen(true); }} className="text-[11px] px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 transition">{q}</button>
            ))}
          </div>
          <div className="mt-4 text-xs text-neutral-500">The assistant runs on your live data and can export answers as CSV. Open it from the Dashboard too.</div>
        </Card>
      </div>

      {aiOpen && <AIModal onClose={() => setAiOpen(false)} />}
    </div>
  );
}

function ReportPreviewTable({ rows }: { rows: Record<string, string | number>[] }) {
  if (!rows.length) return <div className="py-6 text-center text-sm text-neutral-500">No data for current filters.</div>;
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            {headers.map((h) => (
              <th key={h} className="text-xs font-700 uppercase tracking-wide text-neutral-500 px-3 py-2 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-b border-neutral-100 hover:bg-primary-50/30">
              {headers.map((h) => {
                const val = row[h];
                const isNum = typeof val === 'number';
                return <td key={h} className={`px-3 py-2 text-neutral-800 ${isNum ? 'text-right font-mono' : ''}`}>{String(val ?? '')}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && <div className="px-3 py-2 text-xs text-neutral-500 bg-neutral-50">Showing first 50 of {rows.length} rows. Export to see all.</div>}
    </div>
  );
}

function AIModal({ onClose }: { onClose: () => void }) {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [out, setOut] = useState<{ answer: string; report?: { title: string; rows: Record<string, string | number>[] } } | null>(null);
  const run = (query: string) => {
    if (!query.trim()) return;
    const res = askAssistant(data, query);
    setOut({ answer: res.answer, report: res.report });
    setQ(query);
  };
  return (
    <Modal open onClose={onClose} title="AI Financial Assistant" size="lg">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SUGGESTED_QUERIES.map((s) => <button key={s} onClick={() => run(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100">{s}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question…" className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-100 outline-none" />
        <Button type="submit">Ask</Button>
      </form>
      {out && (
        <div className="mt-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
          <p className="text-sm text-neutral-800 leading-relaxed">{out.answer}</p>
          {out.report && (
            <div className="mt-3 pt-3 border-t border-neutral-200">
              <div className="text-xs font-600 text-neutral-600 mb-2">{out.report.title}</div>
              <Button size="sm" variant="outline" icon={<Download size={13} />} onClick={() => downloadFile(`${out.report!.title.replace(/\s+/g, '_')}.csv`, toCSV(out.report!.rows as Record<string, unknown>[]), 'text/csv;charset=utf-8;')}>Export CSV</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
