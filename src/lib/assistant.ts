import type { AppData } from './types';
import { allCropPnL, nurseryTotals, farmOverallPnL, seasonPnL, allBatchPnL, payrollMonthTotals, ledgerBalance } from './calc';
import { LKR, fmtDate } from './format';

export interface AIContext {
  data: AppData;
  answer: string;
  report?: { title: string; rows: Record<string, string | number>[] };
}

// A lightweight rule + keyword based assistant. Not a real LLM, but parses
// common queries against the live dataset and returns natural-language answers
// plus optional tabular reports for export.
export function askAssistant(data: AppData, query: string): AIContext {
  const q = query.toLowerCase();
  const overall = farmOverallPnL(data);
  const monthISO = new Date().toISOString().slice(0, 7);

  // Nursery seedling sales profit this month
  if ((q.includes('nursery') || q.includes('seedling')) && (q.includes('profit') || q.includes('sale')) && (q.includes('month') || q.includes('this month'))) {
    const monthSales = data.nurserySales.filter((s) => s.date.startsWith(monthISO));
    const rev = monthSales.reduce((s, x) => s + x.qty * x.unitPrice, 0);
    const nur = nurseryTotals(data);
    return {
      data,
      answer: `Nursery sales this month (${fmtDate(monthISO + '-01')}): ${LKR(rev)} across ${monthSales.length} invoices. Overall nursery net profit to date is ${LKR(nur.netProfit)} (sales ${LKR(nur.salesRevenue)} + internal transfers ${LKR(nur.transferCredit)} − production ${LKR(nur.productionCost)} − shared overhead ${LKR(nur.sharedOverhead)}).`,
      report: { title: 'Nursery sales — this month', rows: monthSales.map((s) => ({ Invoice: s.invoiceNo, Date: s.date, Buyer: s.buyer, Qty: s.qty, 'Unit Price': s.unitPrice, Amount: s.qty * s.unitPrice })) },
    };
  }

  // Maha / Yala season profit for a crop
  const seasonMatch = q.includes('maha') ? 'Maha' : q.includes('yala') ? 'Yala' : null;
  if (seasonMatch && (q.includes('profit') || q.includes('p&l') || q.includes('pnl'))) {
    const sp = seasonPnL(data, seasonMatch);
    const pnls = allCropPnL(data).filter((p) => p.crop.season === seasonMatch && p.crop.type === 'Seasonal');
    // specific crop?
    const cropName = pnls.find((p) => q.includes(p.crop.name.toLowerCase().split(' ')[0]))?.crop.name;
    if (cropName) {
      const p = pnls.find((x) => x.crop.name === cropName)!;
      return {
        data,
        answer: `${seasonMatch} ${cropName}: Revenue ${LKR(p.revenue)}, Total cost ${LKR(p.totalCost)}, Profit ${LKR(p.profit)} (margin ${p.margin.toFixed(1)}%). Harvest: ${p.harvestsKg} kg.`,
        report: { title: `${seasonMatch} ${cropName} P&L`, rows: [{ Item: 'Revenue', Amount: p.revenue }, { Item: 'Field expenses', Amount: p.expenses }, { Item: 'Nursery transfer cost', Amount: p.transferredSeedlingCost }, { Item: 'Total cost', Amount: p.totalCost }, { Item: 'Profit', Amount: p.profit }, { Item: 'Margin %', Amount: p.margin.toFixed(1) }] },
      };
    }
    return {
      data,
      answer: `${seasonMatch} season: Total revenue ${LKR(sp.revenue)}, total cost ${LKR(sp.cost)}, net profit ${LKR(sp.profit)} across ${pnls.length} seasonal crops.`,
      report: { title: `${seasonMatch} season P&L by crop`, rows: pnls.map((p) => ({ Crop: p.crop.name, Plot: p.crop.plot, Revenue: p.revenue, Cost: p.totalCost, Profit: p.profit, 'Margin %': p.margin.toFixed(1) })) },
    };
  }

  // Labor / payroll voucher summary
  if ((q.includes('labor') || q.includes('labour') || q.includes('payroll') || q.includes('voucher')) && (q.includes('summary') || q.includes('daily') || q.includes('voucher'))) {
    const pay = payrollMonthTotals(data, monthISO);
    const monthAttendance = data.attendance.filter((a) => a.date.startsWith(monthISO));
    return {
      data,
      answer: `Payroll for ${fmtDate(monthISO + '-01')}: Permanent ${LKR(pay.permanent)}, Casual ${LKR(pay.casual)}, Total ${LKR(pay.total)}. ${monthAttendance.length} attendance entries recorded.`,
      report: { title: 'Payroll summary — current month', rows: [{ Category: 'Permanent staff', Amount: pay.permanent }, { Category: 'Casual workers', Amount: pay.casual }, { Category: 'Total', Amount: pay.total }] },
    };
  }

  // Overall farm profit
  if (q.includes('overall') || q.includes('total profit') || q.includes('farm profit') || (q.includes('profit') && !q.includes('season') && !q.includes('crop'))) {
    return {
      data,
      answer: `Overall farm P&L: Revenue ${LKR(overall.revenue)}, total cost ${LKR(overall.cost)}, net profit ${LKR(overall.profit)}. Crop revenue ${LKR(overall.revenue - overall.nursery.salesRevenue)}, nursery sales ${LKR(overall.nursery.salesRevenue)}, fixed overheads ${LKR(overall.overheads)}, payroll ${LKR(overall.payroll)}.`,
      report: { title: 'Overall farm P&L', rows: [{ Item: 'Crop revenue', Amount: overall.revenue - overall.nursery.salesRevenue }, { Item: 'Nursery sales', Amount: overall.nursery.salesRevenue }, { Item: 'Crop & nursery cost', Amount: overall.cost - overall.overheads - overall.payroll }, { Item: 'Fixed overheads', Amount: overall.overheads }, { Item: 'Payroll', Amount: overall.payroll }, { Item: 'Net profit', Amount: overall.profit }] },
    };
  }

  // Ledger / capital / loan balance
  if (q.includes('capital') || q.includes('loan') || q.includes('ledger') || q.includes('equity')) {
    const cap = ledgerBalance(data, 'Capital');
    const loan = ledgerBalance(data, 'Bank Loan');
    const shop = ledgerBalance(data, 'Retail Shop Transfer');
    return {
      data,
      answer: `Capital injected: ${LKR(cap.in)} (drawings ${LKR(ledgerBalance(data, 'Owner Equity Return').out)}). Bank loan: received ${LKR(loan.in)}, repaid ${LKR(loan.out)}, outstanding ${LKR(loan.net)}. Retail shop transfers: ${LKR(shop.in)}.`,
      report: { title: 'Funding & liabilities summary', rows: [{ Account: 'Owner capital', In: cap.in, Out: 0, Balance: cap.in }, { Account: 'Bank loan', In: loan.in, Out: loan.out, Balance: loan.net }, { Account: 'Retail shop transfers', In: shop.in, Out: 0, Balance: shop.in }, { Account: 'Owner drawings', In: 0, Out: ledgerBalance(data, 'Owner Equity Return').out, Balance: -ledgerBalance(data, 'Owner Equity Return').out }] },
    };
  }

  // Nursery batch status
  if (q.includes('batch') || q.includes('inventory') || q.includes('ready') || q.includes('growing')) {
    const batches = allBatchPnL(data);
    const ready = batches.filter((b) => b.batch.status === 'Ready');
    return {
      data,
      answer: `Nursery has ${batches.length} batches: ${ready.length} ready, ${batches.filter((b) => b.batch.status === 'Growing').length} growing, ${batches.filter((b) => b.batch.status === 'Sold Out').length} sold out, ${batches.filter((b) => b.batch.status === 'Transferred').length} transferred. Total saleable units ready: ${ready.reduce((s, b) => s + b.remainingQty, 0)}.`,
      report: { title: 'Nursery batch inventory', rows: batches.map((b) => ({ Code: b.batch.code, Variety: b.batch.variety, Category: b.batch.category, Status: b.batch.status, 'Total units': b.batch.qtyUnits, Remaining: b.remainingQty, 'Unit cost': b.batch.unitCost })) },
    };
  }

  // Default help
  return {
    data,
    answer: `I can answer questions like: "What was the total profit from nursery seedling sales this month?", "Show Maha season profit for capsicum", "Draft daily labor voucher summary", "What is the overall farm profit?", "Show capital and loan balance", "List nursery batch inventory". Try one of those!`,
  };
}

export const SUGGESTED_QUERIES = [
  'What was the total profit from nursery seedling sales this month?',
  'Show Maha season profit for capsicum',
  'Draft daily labor voucher summary',
  'What is the overall farm profit?',
  'Show capital and loan balance',
  'List nursery batch inventory',
];
