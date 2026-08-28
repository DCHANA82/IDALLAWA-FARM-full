import type { AppData, Crop, NurseryBatch, Worker } from './types';

export interface CropPnL {
  crop: Crop;
  revenue: number;
  expenses: number;
  transferredSeedlingCost: number;
  totalCost: number;
  profit: number;
  margin: number;
  harvestsKg: number;
}

export function cropPnL(data: AppData, cropId: string): CropPnL {
  const crop = data.crops.find((c) => c.id === cropId)!;
  const revenue = data.cropHarvests.filter((h) => h.cropId === cropId).reduce((s, h) => s + h.quantityKg * h.unitPrice, 0);
  const expenses = data.cropExpenses.filter((e) => e.cropId === cropId).reduce((s, e) => s + e.amount, 0);
  const transferredSeedlingCost = data.nurseryTransfers.filter((t) => t.cropId === cropId).reduce((s, t) => s + t.qty * t.unitValue, 0);
  const totalCost = expenses + transferredSeedlingCost;
  const profit = revenue - totalCost;
  const harvestsKg = data.cropHarvests.filter((h) => h.cropId === cropId).reduce((s, h) => s + h.quantityKg, 0);
  return {
    crop, revenue, expenses, transferredSeedlingCost, totalCost, profit,
    margin: revenue ? (profit / revenue) * 100 : 0,
    harvestsKg,
  };
}

export function allCropPnL(data: AppData): CropPnL[] {
  return data.crops.map((c) => cropPnL(data, c.id));
}

export function seasonPnL(data: AppData, season: string): { revenue: number; cost: number; profit: number } {
  const pnls = allCropPnL(data).filter((p) => p.crop.type === 'Seasonal' && p.crop.season === season);
  return {
    revenue: pnls.reduce((s, p) => s + p.revenue, 0),
    cost: pnls.reduce((s, p) => s + p.totalCost, 0),
    profit: pnls.reduce((s, p) => s + p.profit, 0),
  };
}

export interface NurseryBatchPnL {
  id: string;
  batch: NurseryBatch;
  productionCost: number;
  soldQty: number;
  salesRevenue: number;
  transferredQty: number;
  transferCredit: number;
  totalRevenue: number;
  profit: number;
  remainingQty: number;
}

export function batchPnL(data: AppData, batchId: string): NurseryBatchPnL {
  const batch = data.nurseryBatches.find((b) => b.id === batchId)!;
  const productionCost = batch.unitCost * batch.qtyUnits
    + data.nurseryCosts.filter((c) => c.batchId === batchId).reduce((s, c) => s + c.amount, 0);
  const sales = data.nurserySales.filter((s) => s.batchId === batchId);
  const soldQty = sales.reduce((s, x) => s + x.qty, 0);
  const salesRevenue = sales.reduce((s, x) => s + x.qty * x.unitPrice, 0);
  const transfers = data.nurseryTransfers.filter((t) => t.batchId === batchId);
  const transferredQty = transfers.reduce((s, t) => s + t.qty, 0);
  const transferCredit = transfers.reduce((s, t) => s + t.qty * t.unitValue, 0);
  const totalRevenue = salesRevenue + transferCredit;
  const used = soldQty + transferredQty;
  const usedCost = batch.qtyUnits ? (productionCost / batch.qtyUnits) * used : 0;
  return {
    id: batch.id,
    batch, productionCost, soldQty, salesRevenue, transferredQty, transferCredit,
    totalRevenue, profit: totalRevenue - usedCost,
    remainingQty: batch.qtyUnits - used,
  };
}

export function allBatchPnL(data: AppData): NurseryBatchPnL[] {
  return data.nurseryBatches.map((b) => batchPnL(data, b.id));
}

export function nurseryTotals(data: AppData) {
  const batches = allBatchPnL(data);
  const salesRevenue = batches.reduce((s, b) => s + b.salesRevenue, 0);
  const transferCredit = batches.reduce((s, b) => s + b.transferCredit, 0);
  const productionCost = batches.reduce((s, b) => s + b.productionCost, 0);
  const sharedOverhead = data.nurseryCosts.filter((c) => c.batchId === 'shared').reduce((s, c) => s + c.amount, 0);
  return {
    salesRevenue, transferCredit, productionCost, sharedOverhead,
    totalRevenue: salesRevenue + transferCredit,
    netProfit: salesRevenue + transferCredit - productionCost - sharedOverhead,
  };
}

export function workerPayout(data: AppData, worker: Worker, monthISO: string): number {
  if (worker.type === 'Permanent') {
    const days = data.attendance.filter((a) => a.workerId === worker.id && a.date.startsWith(monthISO) && a.status !== 'Absent').length;
    const present = days > 0 ? 1 : 0; // monthly salary paid if present at all this month
    return (worker.monthlyBasic + worker.allowances) * present;
  }
  return data.attendance
    .filter((a) => a.workerId === worker.id && a.date.startsWith(monthISO))
    .reduce((s, a) => s + a.amount, 0);
}

export function payrollMonthTotals(data: AppData, monthISO: string) {
  const permanent = data.workers.filter((w) => w.type === 'Permanent').reduce((s, w) => s + workerPayout(data, w, monthISO), 0);
  const casual = data.attendance
    .filter((a) => a.date.startsWith(monthISO) && data.workers.find((w) => w.id === a.workerId)?.type === 'Casual')
    .reduce((s, a) => s + a.amount, 0);
  return { permanent, casual, total: permanent + casual };
}

export function ledgerBalance(data: AppData, kind: string): { in: number; out: number; net: number } {
  const ins = data.ledger.filter((l) => l.kind === kind && l.direction === 'In').reduce((s, l) => s + l.amount, 0);
  const outs = data.ledger.filter((l) => l.kind === kind && l.direction === 'Out').reduce((s, l) => s + l.amount, 0);
  return { in: ins, out: outs, net: ins - outs };
}

export function farmOverallPnL(data: AppData) {
  const cropPnls = allCropPnL(data);
  const cropRevenue = cropPnls.reduce((s, p) => s + p.revenue, 0);
  const cropCost = cropPnls.reduce((s, p) => s + p.totalCost, 0);
  const nursery = nurseryTotals(data);
  const overheads = data.expenses.filter((e) => e.class === 'Fixed Overhead').reduce((s, e) => s + e.amount, 0);
  const payroll = data.expenses.filter((e) => e.class === 'Payroll').reduce((s, e) => s + e.amount, 0);
  const capex = data.farmDevelopments.reduce((s, d) => s + d.totalCost, 0);
  const annualDepreciation = data.farmDevelopments.reduce((s, d) => s + (d.lifespanYears > 0 ? d.totalCost / d.lifespanYears : 0), 0);
  const revenue = cropRevenue + nursery.salesRevenue;
  const cost = cropCost + nursery.productionCost + nursery.sharedOverhead + overheads + payroll;
  return { revenue, cost, profit: revenue - cost, nursery, overheads, payroll, capex, annualDepreciation, operationalProfit: revenue - cost };
}
