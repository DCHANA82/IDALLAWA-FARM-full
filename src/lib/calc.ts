import type { AppData, Crop, NurseryBatch, Worker, EmployeeAdvance, AdvanceRecovery, SalaryPayment, AdvanceRecoveryTarget } from './types';

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
  const monthAttendance = data.attendance.filter((a) => a.workerId === worker.id && a.date.startsWith(monthISO));
  const allowances = monthAttendance.reduce((s, a) => s + (a.fuelTransportAllowance || 0) + (a.attendanceAllowance || 0) + (a.otherAllowances || 0), 0);
  const et = worker.employmentType || (worker.type === 'Permanent' ? 'MONTHLY' : 'DAILY');

  if (et === 'MONTHLY') {
    const days = monthAttendance.filter((a) => a.status !== 'Absent').length;
    const present = days > 0 ? 1 : 0;
    const baseSalary = (worker.baseMonthlySalary ?? worker.monthlyBasic + worker.allowances) * present;
    return baseSalary + allowances;
  }
  if (et === 'HYBRID') {
    const days = monthAttendance.filter((a) => a.status !== 'Absent').length;
    const present = days > 0 ? 1 : 0;
    const baseSalary = (worker.baseMonthlySalary ?? worker.monthlyBasic) * present;
    const dailyWages = monthAttendance.reduce((s, a) => {
      const rate = a.overrideRate ?? (worker.defaultDailyRate ?? worker.dailyWage);
      return s + (a.status === 'Absent' ? 0 : Math.round(rate * (a.hours / 8)));
    }, 0);
    return baseSalary + dailyWages + allowances;
  }
  // DAILY
  return monthAttendance.reduce((s, a) => {
    const rate = a.overrideRate ?? (worker.defaultDailyRate ?? worker.dailyWage);
    const baseWage = a.status === 'Absent' ? 0 : Math.round(rate * (a.hours / 8));
    return s + baseWage + (a.fuelTransportAllowance || 0) + (a.attendanceAllowance || 0) + (a.otherAllowances || 0);
  }, 0);
}

export function workerPayoutBreakdown(data: AppData, worker: Worker, monthISO: string) {
  const monthAttendance = data.attendance.filter((a) => a.workerId === worker.id && a.date.startsWith(monthISO));
  const daysWorked = monthAttendance.filter((a) => a.status !== 'Absent').length;
  const fuel = monthAttendance.reduce((s, a) => s + (a.fuelTransportAllowance || 0), 0);
  const attendanceBonus = monthAttendance.reduce((s, a) => s + (a.attendanceAllowance || 0), 0);
  const other = monthAttendance.reduce((s, a) => s + (a.otherAllowances || 0), 0);
  const advances = data.advanceRecoveries
    .filter((r) => r.workerId === worker.id && r.recoveryDate.startsWith(monthISO))
    .reduce((s, r) => s + r.amount, 0);
  const et = worker.employmentType || (worker.type === 'Permanent' ? 'MONTHLY' : 'DAILY');
  const dailyRate = worker.defaultDailyRate ?? worker.dailyWage;
  const monthlySalary = worker.baseMonthlySalary ?? (worker.monthlyBasic + worker.allowances);

  const dailyWages = monthAttendance.reduce((s, a) => {
    const rate = a.overrideRate ?? dailyRate;
    return s + (a.status === 'Absent' ? 0 : Math.round(rate * (a.hours / 8)));
  }, 0);

  if (et === 'MONTHLY') {
    const present = daysWorked > 0 ? 1 : 0;
    const baseSalary = monthlySalary * present;
    const grossEarnings = baseSalary + fuel + attendanceBonus + other;
    const totalDeductions = advances;
    return { baseSalary, dailyWages: 0, daysWorked, fuel, attendanceBonus, other, advances, grossEarnings, totalDeductions, netPayable: grossEarnings - totalDeductions, total: grossEarnings - totalDeductions };
  }
  if (et === 'HYBRID') {
    const present = daysWorked > 0 ? 1 : 0;
    const baseSalary = (worker.baseMonthlySalary ?? worker.monthlyBasic) * present;
    const grossEarnings = baseSalary + dailyWages + fuel + attendanceBonus + other;
    const totalDeductions = advances;
    return { baseSalary, dailyWages, daysWorked, fuel, attendanceBonus, other, advances, grossEarnings, totalDeductions, netPayable: grossEarnings - totalDeductions, total: grossEarnings - totalDeductions };
  }
  // DAILY
  const grossEarnings = dailyWages + fuel + attendanceBonus + other;
  const totalDeductions = advances;
  return { baseSalary: 0, dailyWages, daysWorked, fuel, attendanceBonus, other, advances, grossEarnings, totalDeductions, netPayable: grossEarnings - totalDeductions, total: grossEarnings - totalDeductions };
}

// ─── Advance system calculations ───

export function workerOutstandingAdvances(data: AppData, workerId: string): EmployeeAdvance[] {
  return data.employeeAdvances.filter(
    (a) => a.workerId === workerId && a.status !== 'Fully Recovered' && a.remainingBalance > 0
  );
}

export function workerTotalOutstanding(data: AppData, workerId: string): number {
  return workerOutstandingAdvances(data, workerId).reduce((s, a) => s + a.remainingBalance, 0);
}

export function workerAdvanceHistory(data: AppData, workerId: string): EmployeeAdvance[] {
  return data.employeeAdvances
    .filter((a) => a.workerId === workerId)
    .sort((a, b) => b.advanceDate.localeCompare(a.advanceDate));
}

export function advanceRecoveriesFor(data: AppData, advanceId: string): AdvanceRecovery[] {
  return data.advanceRecoveries
    .filter((r) => r.advanceId === advanceId)
    .sort((a, b) => b.recoveryDate.localeCompare(a.recoveryDate));
}

export function workerRecoveryHistory(data: AppData, workerId: string): AdvanceRecovery[] {
  return data.advanceRecoveries
    .filter((r) => r.workerId === workerId)
    .sort((a, b) => b.recoveryDate.localeCompare(a.recoveryDate));
}

export function computeAdvanceStatus(recoveredAmount: number, originalAmount: number): EmployeeAdvance['status'] {
  if (recoveredAmount >= originalAmount) return 'Fully Recovered';
  if (recoveredAmount > 0) return 'Partially Recovered';
  return 'Outstanding';
}

export function recomputeAdvanceBalances(advance: EmployeeAdvance, recoveries: AdvanceRecovery[]): EmployeeAdvance {
  const recovered = recoveries
    .filter((r) => r.advanceId === advance.id)
    .reduce((s, r) => s + r.amount, 0);
  const remaining = Math.max(0, advance.amount - recovered);
  return {
    ...advance,
    recoveredAmount: recovered,
    remainingBalance: remaining,
    status: computeAdvanceStatus(recovered, advance.amount),
  };
}

export function eligibleAdvancesForRecovery(
  data: AppData,
  workerId: string,
  source: 'DAILY' | 'MONTHLY'
): EmployeeAdvance[] {
  return data.employeeAdvances
    .filter((a) => {
      if (a.workerId !== workerId || a.remainingBalance <= 0) return false;
      if (a.recoveryTarget === 'ANY') return true;
      if (a.recoveryTarget === 'DAILY') return source === 'DAILY';
      if (a.recoveryTarget === 'MONTHLY') return source === 'MONTHLY';
      return true;
    })
    .sort((a, b) => a.advanceDate.localeCompare(b.advanceDate));
}

export function suggestAdvanceRecovery(
  data: AppData,
  workerId: string,
  source: 'DAILY' | 'MONTHLY',
  maxAmount: number
): { advanceId: string; amount: number }[] {
  const eligible = eligibleAdvancesForRecovery(data, workerId, source);
  const suggestions: { advanceId: string; amount: number }[] = [];
  let remaining = maxAmount;
  for (const adv of eligible) {
    if (remaining <= 0) break;
    const deduct = Math.min(adv.remainingBalance, remaining);
    if (deduct > 0) {
      suggestions.push({ advanceId: adv.id, amount: deduct });
      remaining -= deduct;
    }
  }
  return suggestions;
}

// ─── Salary payment calculations ───

export function workerSalaryPayments(data: AppData, workerId: string): SalaryPayment[] {
  return data.salaryPayments
    .filter((p) => p.workerId === workerId)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export function workerPaymentsForMonth(data: AppData, workerId: string, monthISO: string): SalaryPayment[] {
  return data.salaryPayments
    .filter((p) => p.workerId === workerId && p.payMonth === monthISO)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export function isPaymentDuplicate(data: AppData, workerId: string, salaryType: 'DAILY' | 'MONTHLY', workDate: string, attendanceIds?: string): boolean {
  return data.salaryPayments.some(
    (p) => p.workerId === workerId && p.salaryType === salaryType && p.workDate === workDate &&
    (attendanceIds ? p.attendanceIds === attendanceIds : true)
  );
}

// ─── Payroll report aggregates ───

export function payrollReportData(data: AppData, monthISO: string) {
  const monthPayments = data.salaryPayments.filter((p) => p.payMonth === monthISO);
  const dailyPayments = monthPayments.filter((p) => p.salaryType === 'DAILY');
  const monthlyPayments = monthPayments.filter((p) => p.salaryType === 'MONTHLY');

  const monthlySalary = monthlyPayments.reduce((s, p) => s + p.grossAmount - p.allowances, 0);
  const dailySalary = dailyPayments.reduce((s, p) => s + p.grossAmount - p.allowances, 0);
  const dailyAllowances = dailyPayments.reduce((s, p) => s + p.allowances, 0);
  const monthlyAllowances = monthlyPayments.reduce((s, p) => s + p.allowances, 0);
  const totalEarnings = monthPayments.reduce((s, p) => s + p.grossAmount, 0);

  const monthAdvances = data.employeeAdvances.filter((a) => a.advanceDate.startsWith(monthISO));
  const advancesGiven = monthAdvances.reduce((s, a) => s + a.amount, 0);

  const monthRecoveries = data.advanceRecoveries.filter((r) => r.recoveryDate.startsWith(monthISO));
  const advancesRecovered = monthRecoveries.reduce((s, r) => s + r.amount, 0);

  const otherDeductions = monthPayments.reduce((s, p) => s + p.otherDeductions, 0);
  const netPayments = monthPayments.reduce((s, p) => s + p.netAmount, 0);

  const outstandingAdvances = data.employeeAdvances
    .filter((a) => a.status !== 'Fully Recovered')
    .reduce((s, a) => s + a.remainingBalance, 0);

  return {
    monthlySalary,
    dailySalary,
    dailyAllowances,
    monthlyAllowances,
    totalEarnings,
    advancesGiven,
    advancesRecovered,
    otherDeductions,
    netPayments,
    outstandingAdvances,
    dailyPaymentCount: dailyPayments.length,
    monthlyPaymentCount: monthlyPayments.length,
  };
}

export function workerAdvanceLedger(data: AppData, workerId: string) {
  const advances = data.employeeAdvances
    .filter((a) => a.workerId === workerId)
    .sort((a, b) => a.advanceDate.localeCompare(b.advanceDate));
  const recoveries = data.advanceRecoveries
    .filter((r) => r.workerId === workerId)
    .sort((a, b) => a.recoveryDate.localeCompare(b.recoveryDate));

  type LedgerLine =
    | { type: 'advance'; date: string; advanceId: string; description: string; debit: number; credit: 0; balance: number }
    | { type: 'recovery'; date: string; advanceId: string; description: string; debit: 0; credit: number; balance: number };

  const lines: LedgerLine[] = [];
  let runningBalance = 0;

  const allEvents: { date: string; isAdvance: boolean; advanceId: string; amount: number; ref?: string; source?: string }[] = [
    ...advances.map((a) => ({ date: a.advanceDate, isAdvance: true, advanceId: a.id, amount: a.amount, ref: a.reference })),
    ...recoveries.map((r) => ({ date: r.recoveryDate, isAdvance: false, advanceId: r.advanceId, amount: r.amount, ref: r.reference, source: r.source })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  for (const ev of allEvents) {
    if (ev.isAdvance) {
      runningBalance += ev.amount;
      const adv = advances.find((a) => a.id === ev.advanceId);
      lines.push({
        type: 'advance',
        date: ev.date,
        advanceId: ev.advanceId,
        description: `Advance given${ev.ref ? ' — ' + ev.ref : ''}`,
        debit: ev.amount,
        credit: 0,
        balance: runningBalance,
      });
    } else {
      runningBalance = Math.max(0, runningBalance - ev.amount);
      const adv = advances.find((a) => a.id === ev.advanceId);
      lines.push({
        type: 'recovery',
        date: ev.date,
        advanceId: ev.advanceId,
        description: `Recovery from ${ev.source === 'MONTHLY' ? 'monthly salary' : 'daily payment'}${ev.ref ? ' — ' + ev.ref : ''}`,
        debit: 0,
        credit: ev.amount,
        balance: runningBalance,
      });
    }
  }

  return { advances, recoveries, lines, finalBalance: runningBalance };
}

export function payrollMonthTotals(data: AppData, monthISO: string) {
  const monthlyHybrid = data.workers.filter((w) => {
    const et = w.employmentType || (w.type === 'Permanent' ? 'MONTHLY' : 'DAILY');
    return et === 'MONTHLY' || et === 'HYBRID';
  }).reduce((s, w) => s + workerPayout(data, w, monthISO), 0);
  const daily = data.attendance
    .filter((a) => {
      if (!a.date.startsWith(monthISO)) return false;
      const w = data.workers.find((x) => x.id === a.workerId);
      if (!w) return false;
      const et = w.employmentType || (w.type === 'Permanent' ? 'MONTHLY' : 'DAILY');
      return et === 'DAILY' || et === 'HYBRID';
    })
    .reduce((s, a) => s + a.amount + (a.fuelTransportAllowance || 0) + (a.attendanceAllowance || 0) + (a.otherAllowances || 0), 0);
  return { permanent: monthlyHybrid, casual: daily, total: monthlyHybrid + daily };
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
  const unallocatedLabor = data.attendance
    .filter((a) => !a.expenseAllocation)
    .reduce((s, a) => s + a.amount + (a.fuelTransportAllowance || 0) + (a.attendanceAllowance || 0) + (a.otherAllowances || 0), 0);
  const payroll = unallocatedLabor;
  const capex = data.farmDevelopments.reduce((s, d) => s + d.totalCost, 0);
  const annualDepreciation = data.farmDevelopments.reduce((s, d) => s + (d.lifespanYears > 0 ? d.totalCost / d.lifespanYears : 0), 0);
  const revenue = cropRevenue + nursery.salesRevenue;
  const cost = cropCost + nursery.productionCost + nursery.sharedOverhead + overheads + payroll;
  return { revenue, cost, profit: revenue - cost, nursery, overheads, payroll, capex, annualDepreciation, operationalProfit: revenue - cost };
}
