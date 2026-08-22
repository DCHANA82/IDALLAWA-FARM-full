import type { AppData } from './types';

// Minimal CSV parser (handles quoted fields). For .xlsx, we rely on a tiny
// sheet-to-CSV conversion using SheetJS loaded dynamically — but to avoid a
// heavy dependency, we support .csv directly and instruct users to save
// Excel files as CSV for now. (A lightweight xlsx parser is loaded lazily.)
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

export type ImportTarget =
  | 'crops' | 'cropExpenses' | 'cropHarvests'
  | 'nurseryBatches' | 'nurseryCosts' | 'nurserySales' | 'nurseryTransfers'
  | 'workers' | 'attendance' | 'vouchers' | 'ledger' | 'expenses'
  | 'farmDevelopments';

// Map imported CSV rows into typed records for a given target.
export function mapImport(target: ImportTarget, rows: Record<string, string>[]): unknown[] {
  const num = (v: string) => parseFloat(v) || 0;
  const id = (i: number, prefix: string) => rows[i]['id'] || prefix + '_' + (i + 1);
  return rows.map((r, i) => {
    switch (target) {
      case 'crops': return {
        id: id(i, 'cr'), name: r.name || r.Name || '', type: (r.type || r.Type || 'Seasonal') as 'Seasonal' | 'Perennial',
        season: (r.season || r.Season || 'Maha') as string, plot: r.plot || r.Plot || '',
        areaAcres: num(r.areaAcres || r.Area), plantedDate: r.plantedDate || r.Date || '', status: (r.status || r.Status || 'Active') as 'Active' | 'Harvested' | 'Abandoned', notes: r.notes || '',
      };
      case 'cropExpenses': return { id: id(i, 'ce'), cropId: r.cropId || '', date: r.date || '', category: r.category || '', description: r.description || '', amount: num(r.amount) };
      case 'cropHarvests': return { id: id(i, 'ch'), cropId: r.cropId || '', date: r.date || '', quantityKg: num(r.quantityKg || r.Qty), unitPrice: num(r.unitPrice || r.Price), buyer: r.buyer || '' };
      case 'nurseryBatches': return {
        id: id(i, 'nb'), code: r.code || r.Code || '', category: (r.category || 'Seasonal Seedling') as 'Seasonal Seedling' | 'Perennial Planting Material',
        variety: r.variety || '', startDate: r.startDate || r.date || '', qtyUnits: num(r.qtyUnits || r.Qty), unitType: r.unitType || 'tray', unitCost: num(r.unitCost || r.Cost),
        status: (r.status || 'Growing') as 'Growing' | 'Ready' | 'Sold Out' | 'Transferred',
      };
      case 'nurseryCosts': return { id: id(i, 'nc'), batchId: r.batchId || 'shared', date: r.date || '', category: r.category || '', description: r.description || '', amount: num(r.amount) };
      case 'nurserySales': return { id: id(i, 'ns'), batchId: r.batchId || '', date: r.date || '', buyer: r.buyer || '', qty: num(r.qty), unitPrice: num(r.unitPrice), invoiceNo: r.invoiceNo || '' };
      case 'nurseryTransfers': return { id: id(i, 'nt'), batchId: r.batchId || '', date: r.date || '', cropId: r.cropId || '', qty: num(r.qty), unitValue: num(r.unitValue) };
      case 'workers': return {
        id: id(i, 'wk'), name: r.name || '', type: (r.type || 'Casual') as 'Permanent' | 'Casual', phone: r.phone || '', role: r.role || '',
        monthlyBasic: num(r.monthlyBasic || r.Basic), allowances: num(r.allowances || r.Allowance), dailyWage: num(r.dailyWage || r.Wage),
      };
      case 'attendance': return { id: id(i, 'at'), workerId: r.workerId || '', date: r.date || '', status: (r.status || 'Present') as 'Present' | 'Absent' | 'Half Day', taskPlot: r.taskPlot || '', hours: num(r.hours), amount: num(r.amount) };
      case 'vouchers': return { id: id(i, 'vo'), voucherNo: r.voucherNo || '', date: r.date || '', kind: (r.kind || 'Payment') as 'Payment' | 'Sales Receipt' | 'Gate Pass' | 'Loan Settlement' | 'Payroll', party: r.party || '', description: r.description || '', amount: num(r.amount), reference: r.reference || '' };
      case 'ledger': return { id: id(i, 'le'), date: r.date || '', kind: (r.kind || 'Capital') as 'Capital' | 'Retail Shop Transfer' | 'Bank Loan' | 'Shop Credit' | 'Owner Equity Return', direction: (r.direction || 'In') as 'In' | 'Out', description: r.description || '', amount: num(r.amount), reference: r.reference || '' };
      case 'expenses': return { id: id(i, 'ex'), date: r.date || '', class: (r.class || 'Fixed Overhead') as 'Fixed Overhead' | 'Perennial Crop' | 'Seasonal Crop' | 'Nursery Operations' | 'Payroll' | 'Loan Repayment' | 'Owner Equity Return' | 'Shop Credit Settlement', category: r.category || '', description: r.description || '', amount: num(r.amount), reference: r.reference || '' };
      case 'farmDevelopments': return { id: id(i, 'fd'), name: r.name || '', category: r.category || '', totalCost: num(r.totalCost || r.Cost), implementationDate: r.implementationDate || r.date || '', lifespanYears: num(r.lifespanYears || r.Lifespan || 1), linkedPlotId: r.linkedPlotId || '', description: r.description || '' };
    }
  });
}

export function sampleCSV(target: ImportTarget): string {
  const templates: Record<ImportTarget, { headers: string[]; sample: string[] }> = {
    crops: {
      headers: ['id', 'name', 'type', 'season', 'plot', 'areaAcres', 'plantedDate', 'status', 'bearingStartYear', 'perennialStatus', 'notes'],
      sample: ['cr_1', 'Paddy', 'Seasonal', 'Maha', 'Plot A', '2.5', '2026-01-15', 'Active', '', '', ''],
    },
    cropExpenses: {
      headers: ['id', 'cropId', 'date', 'category', 'description', 'amount'],
      sample: ['ce_1', 'cr_1', '2026-01-20', 'Fertilizer', 'Urea 50kg', '8500'],
    },
    cropHarvests: {
      headers: ['id', 'cropId', 'date', 'quantityKg', 'unitPrice', 'buyer'],
      sample: ['ch_1', 'cr_1', '2026-04-10', '1200', '95', 'Premadasa Traders'],
    },
    nurseryBatches: {
      headers: ['id', 'code', 'category', 'variety', 'startDate', 'qtyUnits', 'unitType', 'unitCost', 'status'],
      sample: ['nb_1', 'NUR-26-01', 'Seasonal Seedling', 'Tomato F1', '2026-02-01', '500', 'tray', '25', 'Growing'],
    },
    nurseryCosts: {
      headers: ['id', 'batchId', 'date', 'category', 'description', 'amount'],
      sample: ['nc_1', 'shared', '2026-02-05', 'Potting media', 'Coco peat 10 bags', '7500'],
    },
    nurserySales: {
      headers: ['id', 'batchId', 'date', 'buyer', 'qty', 'unitPrice', 'invoiceNo'],
      sample: ['ns_1', 'nb_1', '2026-03-10', 'Bandara Nursery', '100', '40', 'INV-NS-001'],
    },
    nurseryTransfers: {
      headers: ['id', 'batchId', 'date', 'cropId', 'qty', 'unitValue'],
      sample: ['nt_1', 'nb_1', '2026-03-01', 'cr_1', '200', '30'],
    },
    workers: {
      headers: ['id', 'name', 'type', 'phone', 'role', 'monthlyBasic', 'allowances', 'dailyWage'],
      sample: ['wk_1', 'Sunil Perera', 'Permanent', '0771234567', 'Field Supervisor', '45000', '5000', '0'],
    },
    attendance: {
      headers: ['id', 'workerId', 'date', 'status', 'taskPlot', 'hours', 'amount'],
      sample: ['at_1', 'wk_1', '2026-08-15', 'Present', 'Plot A', '8', '1800'],
    },
    vouchers: {
      headers: ['id', 'voucherNo', 'date', 'kind', 'party', 'description', 'amount', 'reference', 'paymentMethod', 'chequeNo'],
      sample: ['vo_1', 'PV-2026-001', '2026-08-15', 'Payment', 'ABC Suppliers', 'Fertilizer purchase', '15000', 'BILL-123', 'Cash', ''],
    },
    ledger: {
      headers: ['id', 'date', 'kind', 'direction', 'description', 'amount', 'reference'],
      sample: ['le_1', '2026-01-01', 'Capital', 'In', 'Owner capital injection', '500000', ''],
    },
    expenses: {
      headers: ['id', 'date', 'class', 'category', 'description', 'amount', 'reference'],
      sample: ['ex_1', '2026-08-15', 'Fixed Overhead', 'Electricity', 'Monthly bill', '8500', ''],
    },
    farmDevelopments: {
      headers: ['id', 'name', 'category', 'totalCost', 'implementationDate', 'lifespanYears', 'linkedPlotId', 'description'],
      sample: ['fd_1', 'Drip Irrigation', 'Irrigation', '350000', '2026-01-10', '10', '', '2-acre drip system for Plot A'],
    },
  };
  const t = templates[target];
  return [t.headers.join(','), t.sample.join(',')].join('\n');
}

export function mergeImport(data: AppData, target: ImportTarget, records: unknown[], mode: 'replace' | 'append'): AppData {
  const next = mode === 'replace' ? records : [...(data[target] as unknown[]), ...records];
  return { ...data, [target]: next } as AppData;
}
