import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { LKR } from '@/lib/format';

// Render content into a hidden #print-root, then trigger window.print().
export function printContent(node: ReactNode) {
  let container = document.getElementById('print-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'print-root';
    document.body.appendChild(container);
  }
  const root = createRoot(container);
  root.render(<PrintShell>{node}</PrintShell>);
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      container?.remove();
    }, 500);
  }, 120);
}

/** Render an A4 payslip and trigger window.print() */
export function printPayslip(node: ReactNode) {
  let container = document.getElementById('print-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'print-root';
    document.body.appendChild(container);
  }
  const root = createRoot(container);
  root.render(<PayslipPrintShell>{node}</PayslipPrintShell>);
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      container?.remove();
    }, 500);
  }, 120);
}

/** Render a 1/3 A4 expense slip and trigger window.print() */
export function printExpenseSlip(node: ReactNode) {
  let container = document.getElementById('print-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'print-root';
    document.body.appendChild(container);
  }
  const root = createRoot(container);
  root.render(<VoucherPrintShell>{node}</VoucherPrintShell>);
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      container?.remove();
    }, 500);
  }, 120);
}

/** Render a 1/3 A4 voucher slip and trigger window.print() */
export function printVoucherSlip(node: ReactNode) {
  let container = document.getElementById('print-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'print-root';
    document.body.appendChild(container);
  }
  const root = createRoot(container);
  root.render(<VoucherPrintShell>{node}</VoucherPrintShell>);
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      container?.remove();
    }, 500);
  }, 120);
}

function PrintShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add('printing');
    return () => document.body.classList.remove('printing');
  }, []);
  return <div className="print-a5 mx-auto p-6">{children}</div>;
}

/** Shell for 1/3 A4 landscape payslip (297mm x 99mm) */
function PayslipPrintShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add('printing', 'printing-payslip');
    return () => { document.body.classList.remove('printing', 'printing-payslip'); };
  }, []);
  return <div className="print-payslip mx-auto p-0">{children}</div>;
}

/** Shell for 1/3 A4 voucher slips (210mm x 99mm) */
function VoucherPrintShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add('printing');
    return () => document.body.classList.remove('printing');
  }, []);
  return <div className="print-voucher-slip mx-auto p-0">{children}</div>;
}

export function VoucherPrint({
  voucherNo, date, kind, party, description, amount, reference,
  farmName, owner, address, phone, logo, paymentMethod, chequeNo,
}: {
  voucherNo: string; date: string; kind: string; party: string; description: string;
  amount: number; reference?: string; farmName: string; owner: string;
  address?: string; phone?: string; logo?: string;
  paymentMethod?: string; chequeNo?: string;
}) {
  const title = kind === 'Sales Receipt' ? 'RECEIPT VOUCHER' : kind === 'Payroll' ? 'PAYROLL VOUCHER' : kind === 'Loan Settlement' ? 'LOAN SETTLEMENT VOUCHER' : kind === 'Gate Pass' ? 'GATE PASS' : 'PAYMENT VOUCHER';
  const payeeLabel = kind === 'Sales Receipt' ? 'Received From' : 'Paid To';

  return (
    <div className="font-sans text-neutral-900 text-[10px] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-1.5">
        <div className="flex items-center gap-2">
          {logo && <img src={logo} alt="logo" className="w-10 h-10 object-cover rounded" />}
          <div>
            <div className="font-bold text-sm text-neutral-900">{farmName}</div>
            {address && <div className="text-[8px] text-neutral-600">{address}</div>}
            {phone && <div className="text-[8px] text-neutral-600">Tel: {phone}</div>}
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold text-[11px] uppercase tracking-wider text-neutral-900 bg-neutral-100 px-3 py-0.5 rounded">{title}</div>
        </div>
      </div>

      {/* Meta details — 2 columns */}
      <div className="grid grid-cols-2 gap-x-4 mt-2">
        <div className="space-y-0.5">
          <MetaRow label="Voucher No." value={voucherNo} />
          <MetaRow label="Date" value={date} />
          <MetaRow label={payeeLabel} value={party} />
        </div>
        <div className="space-y-0.5">
          <MetaRow label="Payment Method" value={paymentMethod || 'Cash'} />
          <MetaRow label="Cheque No." value={chequeNo || '—'} />
          <MetaRow label="Ref No." value={reference || '—'} />
        </div>
      </div>

      {/* Details table */}
      <table className="w-full mt-2 border border-neutral-300 border-collapse">
        <thead>
          <tr className="bg-neutral-100 text-[8px] uppercase text-neutral-600">
            <th className="text-left border border-neutral-300 px-1.5 py-1 w-[25%]">Account / Category</th>
            <th className="text-left border border-neutral-300 px-1.5 py-1">Description / Particulars</th>
            <th className="text-right border border-neutral-300 px-1.5 py-1 w-[20%]">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-neutral-300 px-1.5 py-1.5 align-top">{kind}</td>
            <td className="border border-neutral-300 px-1.5 py-1.5">{description || '—'}</td>
            <td className="border border-neutral-300 px-1.5 py-1.5 text-right font-bold">{LKR(amount)}</td>
          </tr>
        </tbody>
      </table>

      {/* Total + Amount in words */}
      <div className="flex items-stretch mt-1.5 gap-2">
        <div className="flex-1 border border-neutral-400 px-2 py-1 bg-neutral-50">
          <span className="text-[8px] uppercase text-neutral-500">Amount in Words: </span>
          <span className="font-semibold text-[10px]">{numberToWords(amount)} Only</span>
        </div>
        <div className="border-2 border-neutral-800 px-3 py-1 bg-neutral-100 text-right">
          <div className="text-[8px] uppercase text-neutral-500">Total</div>
          <div className="font-bold text-[12px] text-neutral-900">{LKR(amount)}</div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 mt-3 text-center text-[8px] text-neutral-600">
        <Signature label="Prepared By" />
        <Signature label="Approved By" />
        <Signature label="Receiver Signature" />
      </div>
    </div>
  );
}

export function SalesReceiptPrint({
  invoiceNo, date, buyer, farmName, owner, lines, total,
}: {
  invoiceNo: string; date: string; buyer: string; farmName: string; owner: string;
  lines: { description: string; qty: number; unitPrice: number; amount: number }[];
  total: number;
}) {
  return (
    <div className="font-sans text-neutral-900">
      <div className="flex items-center justify-between border-b-2 border-primary-700 pb-3">
        <div>
          <div className="font-display text-xl font-800 text-primary-800">{farmName}</div>
          <div className="text-xs text-neutral-500">Nursery Sales · {owner}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-neutral-500">Sales Receipt</div>
          <div className="font-mono font-700 text-primary-700 text-lg">{invoiceNo}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <Row label="Date" value={date} />
        <Row label="Buyer" value={buyer} />
      </div>

      <table className="w-full mt-4 text-sm border border-neutral-200">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr><th className="text-left px-2 py-2">Description</th><th className="text-right px-2 py-2">Qty</th><th className="text-right px-2 py-2">Unit Price</th><th className="text-right px-2 py-2">Amount</th></tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-t border-neutral-100">
              <td className="px-2 py-2">{l.description}</td>
              <td className="px-2 py-2 text-right">{l.qty}</td>
              <td className="px-2 py-2 text-right">{LKR(l.unitPrice)}</td>
              <td className="px-2 py-2 text-right">{LKR(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-300 bg-neutral-50 font-700">
            <td colSpan={3} className="px-2 py-2 text-right">Total</td>
            <td className="px-2 py-2 text-right text-primary-700">{LKR(total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-6 grid grid-cols-2 gap-6 text-center text-xs">
        <Signature label="Issued by" />
        <Signature label="Received by" />
      </div>
    </div>
  );
}

export function GatePassPrint({
  passNo, date, buyer, farmName, items, vehicle,
}: {
  passNo: string; date: string; buyer: string; farmName: string;
  items: { description: string; qty: number; unit: string }[];
  vehicle?: string;
}) {
  return (
    <div className="font-sans text-neutral-900">
      <div className="flex items-center justify-between border-b-2 border-accent-700 pb-3">
        <div>
          <div className="font-display text-xl font-800 text-primary-800">{farmName}</div>
          <div className="text-xs text-neutral-500">Nursery Gate Pass</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-neutral-500">Gate Pass</div>
          <div className="font-mono font-700 text-accent-700 text-lg">{passNo}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <Row label="Date" value={date} />
        <Row label="Consignee / Buyer" value={buyer} />
        <Row label="Vehicle" value={vehicle || '—'} />
      </div>

      <table className="w-full mt-4 text-sm border border-neutral-200">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr><th className="text-left px-2 py-2">Item</th><th className="text-right px-2 py-2">Qty</th><th className="text-left px-2 py-2">Unit</th></tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-t border-neutral-100">
              <td className="px-2 py-2">{it.description}</td>
              <td className="px-2 py-2 text-right">{it.qty}</td>
              <td className="px-2 py-2">{it.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 grid grid-cols-3 gap-6 text-center text-xs">
        <Signature label="Prepared by" />
        <Signature label="Security check" />
        <Signature label="Received by" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="font-600 mt-0.5">{value}</div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="text-[8px] uppercase text-neutral-500 whitespace-nowrap">{label}:</span>
      <span className="font-semibold text-[10px] text-neutral-900">{value}</span>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="border-b border-neutral-400 mb-1 h-6" />
      <div className="text-neutral-500">{label}</div>
    </div>
  );
}

export function ExpensePrint({
  date, expenseClass, category, description, amount, reference,
  farmName, owner, address, phone, logo,
}: {
  date: string; expenseClass: string; category: string; description: string;
  amount: number; reference?: string;
  farmName: string; owner: string; address?: string; phone?: string; logo?: string;
}) {
  return (
    <div className="font-sans text-neutral-900 text-[10px] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-1.5">
        <div className="flex items-center gap-2">
          {logo && <img src={logo} alt="logo" className="w-10 h-10 object-cover rounded" />}
          <div>
            <div className="font-bold text-sm text-neutral-900">{farmName}</div>
            {address && <div className="text-[8px] text-neutral-600">{address}</div>}
            {phone && <div className="text-[8px] text-neutral-600">Tel: {phone}</div>}
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold text-[11px] uppercase tracking-wider text-neutral-900 bg-neutral-100 px-3 py-0.5 rounded">EXPENSE RECEIPT</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 mt-2">
        <div className="space-y-0.5">
          <MetaRow label="Date" value={date} />
          <MetaRow label="Class" value={expenseClass} />
          <MetaRow label="Category" value={category || '—'} />
        </div>
        <div className="space-y-0.5">
          <MetaRow label="Reference" value={reference || '—'} />
          <MetaRow label="Recorded by" value={owner} />
        </div>
      </div>

      <table className="w-full mt-2 border border-neutral-300 border-collapse">
        <thead>
          <tr className="bg-neutral-100 text-[8px] uppercase text-neutral-600">
            <th className="text-left border border-neutral-300 px-1.5 py-1 w-[25%]">Category</th>
            <th className="text-left border border-neutral-300 px-1.5 py-1">Description / Particulars</th>
            <th className="text-right border border-neutral-300 px-1.5 py-1 w-[20%]">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-neutral-300 px-1.5 py-1.5 align-top">{category || '—'}</td>
            <td className="border border-neutral-300 px-1.5 py-1.5">{description || '—'}</td>
            <td className="border border-neutral-300 px-1.5 py-1.5 text-right font-bold">{LKR(amount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex items-stretch mt-1.5 gap-2">
        <div className="flex-1 border border-neutral-400 px-2 py-1 bg-neutral-50">
          <span className="text-[8px] uppercase text-neutral-500">Amount in Words: </span>
          <span className="font-semibold text-[10px]">{numberToWords(amount)} Only</span>
        </div>
        <div className="border-2 border-neutral-800 px-3 py-1 bg-neutral-100 text-right">
          <div className="text-[8px] uppercase text-neutral-500">Total</div>
          <div className="font-bold text-[12px] text-neutral-900">{LKR(amount)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3 text-center text-[8px] text-neutral-600">
        <Signature label="Prepared By" />
        <Signature label="Approved By" />
      </div>
    </div>
  );
}

export interface PayslipBreakdown {
  baseSalary: number;
  dailyWages: number;
  daysWorked: number;
  fuel: number;
  attendanceBonus: number;
  other: number;
  advances: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
}

export function PayslipPrint({
  farmName, monthLabel, workerName, employmentType, designation,
  breakdown, owner, logo,
}: {
  farmName: string;
  monthLabel: string;
  workerName: string;
  employmentType: string;
  designation: string;
  breakdown: PayslipBreakdown;
  owner: string;
  logo?: string;
}) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="font-sans text-neutral-900 text-[10px] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-primary-700 pb-1.5">
        <div className="flex items-center gap-2">
          {logo && <img src={logo} alt="logo" className="w-9 h-9 object-cover rounded" />}
          <div>
            <div className="font-bold text-sm text-primary-800">{farmName}</div>
            <div className="text-[8px] text-neutral-500">Monthly Payslip / මාසික වැටුප් පත්‍රය</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] uppercase text-neutral-500">Pay Period</div>
          <div className="font-bold text-[11px] text-primary-700">{monthLabel}</div>
        </div>
      </div>

      {/* Worker info — 4 columns compact */}
      <div className="grid grid-cols-4 gap-x-3 mt-1.5">
        <MetaRow label="Worker" value={workerName} />
        <MetaRow label="Designation" value={designation} />
        <MetaRow label="Emp. Type" value={employmentType} />
        <MetaRow label="Days Worked" value={String(breakdown.daysWorked)} />
      </div>

      {/* Two-column layout: Earnings | Deductions side by side */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {/* Earnings */}
        <div>
          <div className="text-[8px] font-bold uppercase text-primary-700 bg-primary-50 px-1.5 py-0.5 border border-primary-200">Earnings / ඉපැයීම්</div>
          <table className="w-full border border-neutral-300 border-collapse">
            <tbody>
              {breakdown.baseSalary > 0 && (
                <tr className="border-b border-neutral-200">
                  <td className="px-1.5 py-1 text-[9px]">Base Salary (මූලික)</td>
                  <td className="px-1.5 py-1 text-right text-[9px] font-semibold">{LKR(breakdown.baseSalary)}</td>
                </tr>
              )}
              {breakdown.dailyWages > 0 && (
                <tr className="border-b border-neutral-200">
                  <td className="px-1.5 py-1 text-[9px]">Daily Wages — {breakdown.daysWorked}d (දෛනික)</td>
                  <td className="px-1.5 py-1 text-right text-[9px] font-semibold">{LKR(breakdown.dailyWages)}</td>
                </tr>
              )}
              {breakdown.fuel > 0 && (
                <tr className="border-b border-neutral-200">
                  <td className="px-1.5 py-1 text-[9px]">Fuel/Transport (ඉන්ධන)</td>
                  <td className="px-1.5 py-1 text-right text-[9px] font-semibold">{LKR(breakdown.fuel)}</td>
                </tr>
              )}
              {breakdown.attendanceBonus > 0 && (
                <tr className="border-b border-neutral-200">
                  <td className="px-1.5 py-1 text-[9px]">Attendance Bonus (සහභාගි)</td>
                  <td className="px-1.5 py-1 text-right text-[9px] font-semibold">{LKR(breakdown.attendanceBonus)}</td>
                </tr>
              )}
              {breakdown.other > 0 && (
                <tr className="border-b border-neutral-200">
                  <td className="px-1.5 py-1 text-[9px]">Other Allowances (වෙනත්)</td>
                  <td className="px-1.5 py-1 text-right text-[9px] font-semibold">{LKR(breakdown.other)}</td>
                </tr>
              )}
              <tr className="bg-primary-50">
                <td className="px-1.5 py-1 text-[9px] font-bold border border-neutral-300">Gross (මුළු ඉපැයීම්)</td>
                <td className="px-1.5 py-1 text-right text-[10px] font-bold text-primary-800 border border-neutral-300">{LKR(breakdown.grossEarnings)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div>
          <div className="text-[8px] font-bold uppercase text-error-700 bg-error-50 px-1.5 py-0.5 border border-error-200">Deductions / කුණු</div>
          <table className="w-full border border-neutral-300 border-collapse">
            <tbody>
              {breakdown.advances > 0 && (
                <tr className="border-b border-neutral-200">
                  <td className="px-1.5 py-1 text-[9px]">Advances/Loans (අත්තිකාරම්/ණය)</td>
                  <td className="px-1.5 py-1 text-right text-[9px] font-semibold">{LKR(breakdown.advances)}</td>
                </tr>
              )}
              {breakdown.totalDeductions === 0 && (
                <tr>
                  <td className="px-1.5 py-1 text-[9px] text-neutral-400 italic">No deductions</td>
                  <td className="px-1.5 py-1 text-right text-[9px] text-neutral-400">{LKR(0)}</td>
                </tr>
              )}
              {breakdown.totalDeductions > 0 && (
                <tr className="bg-error-50">
                  <td className="px-1.5 py-1 text-[9px] font-bold border border-neutral-300">Total Deductions (මුළු කුණු)</td>
                  <td className="px-1.5 py-1 text-right text-[10px] font-bold text-error-700 border border-neutral-300">{LKR(breakdown.totalDeductions)}</td>
                </tr>
              )}
              {/* Spacer rows to match earnings table height */}
              {(breakdown.totalDeductions === 0 || breakdown.totalDeductions > 0) && (
                <>
                  <tr className="border-b border-neutral-100"><td className="px-1.5 py-1 text-[9px] text-transparent">.</td><td className="px-1.5 py-1 text-right text-[9px] text-transparent">.</td></tr>
                  <tr className="border-b border-neutral-100"><td className="px-1.5 py-1 text-[9px] text-transparent">.</td><td className="px-1.5 py-1 text-right text-[9px] text-transparent">.</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Payable + Amount in Words */}
      <div className="flex items-stretch mt-1.5 gap-2">
        <div className="flex-1 border border-neutral-400 px-2 py-1 bg-neutral-50">
          <span className="text-[8px] uppercase text-neutral-500">Amount in Words: </span>
          <span className="font-semibold text-[10px]">{numberToWords(breakdown.netPayable)} Only</span>
        </div>
        <div className="border-2 border-primary-700 px-3 py-1 bg-primary-50 text-right">
          <div className="text-[8px] uppercase text-primary-600">Net Payable / අතට ලැබෙන ශුද්ධ වැටුප</div>
          <div className="font-bold text-[13px] text-primary-800">{LKR(breakdown.netPayable)}</div>
        </div>
      </div>

      {/* Receipt confirmation */}
      <div className="mt-1.5 px-2 py-1 rounded bg-neutral-50 border border-neutral-200 text-[8px] text-neutral-700 text-center">
        ඉහත සඳහන් ශුද්ධ වැටුප නිවැරදිව ලැබුණු බවට සහතික කරමි · I confirm receipt of the above net salary in full.
      </div>

      {/* Signature blocks */}
      <div className="mt-2 grid grid-cols-2 gap-6 text-center text-[8px] text-neutral-600">
        <div>
          <div className="border-b border-neutral-500 mb-0.5 h-5" />
          <div className="font-semibold text-neutral-700">සේවක අත්සන</div>
          <div className="text-neutral-500">Worker Signature · Date: {today}</div>
        </div>
        <div>
          <div className="border-b border-neutral-500 mb-0.5 h-5" />
          <div className="font-semibold text-neutral-700">අනුමත කළේ / කළමනාකරු</div>
          <div className="text-neutral-500">Approved / Farm Manager · Date: {today}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-1.5 text-center text-[7px] text-neutral-400 border-t border-neutral-200 pt-0.5">
        Computer-generated payslip · {farmName} · {today}
      </div>
    </div>
  );
}

/** Convert a number to English words for amount-in-words on vouchers */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  function threeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return (h ? ones[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoDigits(r) : '');
  }

  const integer = Math.floor(num);
  const cents = Math.round((num - integer) * 100);

  let words = '';
  if (integer >= 1_000_000) {
    const m = Math.floor(integer / 1_000_000);
    words += threeDigits(m) + ' Million ';
  }
  const rem = integer % 1_000_000;
  if (rem >= 100_000) {
    const lh = Math.floor(rem / 100_000);
    const lr = rem % 100_000;
    words += ones[lh] + ' Hundred' + (lr > 0 ? ' ' + threeDigits(lr) : '') + ' Thousand ';
  } else if (rem >= 1000) {
    const th = Math.floor(rem / 1000);
    const tr = rem % 1000;
    words += twoDigits(th) + ' Thousand' + (tr > 0 ? ' ' + threeDigits(tr) : '') + ' ';
  } else if (rem > 0) {
    words += threeDigits(rem);
  }

  words = words.trim();
  if (cents > 0) {
    words += ' and ' + twoDigits(cents) + ' Cents';
  }
  return words || 'Zero';
}
