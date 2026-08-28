import { downloadFile, toCSV } from './format';
import type { AppData } from './types';
import { allCropPnL, allBatchPnL, nurseryTotals, farmOverallPnL, seasonPnL } from './calc';

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  downloadFile(filename, toCSV(rows), 'text/csv;charset=utf-8;');
}

export function exportJSON(filename: string, data: unknown) {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json');
}

// Lightweight PDF: build an HTML document and open print dialog (browser PDF).
export function exportPDFviaPrint(title: string, rows: Record<string, unknown>[]) {
  const w = window.open('', '_blank');
  if (!w) return;
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const tableHTML = rows.length
    ? `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '<p>No data.</p>';
  w.document.write(`<!doctype html><html><head><title>${title}</title>
  <style>
    @page { size: A5 landscape; margin: 10mm; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color:#1a1f22; padding:16px; }
    h1 { font-size:16px; color:#25591d; }
    table { width:100%; border-collapse:collapse; font-size:11px; }
    th { background:#dcf0d2; text-align:left; padding:6px; border:1px solid #cfd4cc; text-transform:uppercase; font-size:9px; }
    td { padding:5px 6px; border:1px solid #eef0ea; }
    tr:nth-child(even) td { background:#f7f8f6; }
  </style></head><body><h1>${title}</h1>${tableHTML}
  <script>window.onload=function(){setTimeout(function(){window.print();},200);};</script>
  </body></html>`);
  w.document.close();
}

export function exportAllZip(data: AppData) {
  // We can't easily zip without a dep; export a combined JSON bundle + a few CSVs.
  const bundle = {
    farmName: data.farmName,
    exportedAt: new Date().toISOString(),
    crops: data.crops,
    cropExpenses: data.cropExpenses,
    cropHarvests: data.cropHarvests,
    nurseryBatches: data.nurseryBatches,
    nurseryCosts: data.nurseryCosts,
    nurserySales: data.nurserySales,
    nurseryTransfers: data.nurseryTransfers,
    workers: data.workers,
    attendance: data.attendance,
    vouchers: data.vouchers,
    ledger: data.ledger,
    expenses: data.expenses,
  };
  exportJSON('idallawa_agro_full_export.json', bundle);
}

export function cropPnLRows(data: AppData): Record<string, string | number>[] {
  return allCropPnL(data).map((p) => ({
    Crop: p.crop.name, Type: p.crop.type, Season: p.crop.season, Plot: p.crop.plot,
    Revenue: p.revenue, 'Field expenses': p.expenses, 'Nursery transfer': p.transferredSeedlingCost,
    'Total cost': p.totalCost, Profit: p.profit, 'Margin %': p.margin.toFixed(1), 'Harvest kg': p.harvestsKg,
  }));
}

export function nurseryPnLRows(data: AppData): Record<string, string | number>[] {
  const t = nurseryTotals(data);
  const rows: Record<string, string | number>[] = allBatchPnL(data).map((b) => ({
    Code: b.batch.code, Variety: b.batch.variety, Category: b.batch.category, Status: b.batch.status,
    'Total units': b.batch.qtyUnits, Sold: b.soldQty, Transferred: b.transferredQty, Remaining: b.remainingQty,
    'Production cost': b.productionCost, 'Sales revenue': b.salesRevenue, 'Transfer credit': b.transferCredit, Profit: b.profit,
  }));
  rows.push({ Code: 'TOTAL', Variety: '', Category: '', Status: '', 'Total units': 0, Sold: 0, Transferred: 0, Remaining: 0, 'Production cost': t.productionCost + t.sharedOverhead, 'Sales revenue': t.salesRevenue, 'Transfer credit': t.transferCredit, Profit: t.netProfit });
  return rows;
}

export function seasonRows(data: AppData): Record<string, string | number>[] {
  return (['Yala', 'Maha']).map((s) => {
    const p = seasonPnL(data, s);
    return { Season: s, Revenue: p.revenue, Cost: p.cost, Profit: p.profit, 'Margin %': p.revenue ? ((p.profit / p.revenue) * 100).toFixed(1) : '0.0' };
  });
}

export function overallRow(data: AppData): Record<string, string | number>[] {
  const o = farmOverallPnL(data);
  return [
    { Item: 'Crop revenue', Amount: o.revenue - o.nursery.salesRevenue },
    { Item: 'Nursery sales revenue', Amount: o.nursery.salesRevenue },
    { Item: 'Nursery transfer credit', Amount: o.nursery.transferCredit },
    { Item: 'Crop & nursery production cost', Amount: o.cost - o.overheads - o.payroll },
    { Item: 'Fixed overheads', Amount: o.overheads },
    { Item: 'Payroll', Amount: o.payroll },
    { Item: 'Net profit', Amount: o.profit },
  ];
}
