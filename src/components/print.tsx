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

/** Shell for A4 landscape payslip — 1/3 page height (68mm) */
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
    <div
      className="payslip-print-root"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: '#1a1f22',
        fontSize: '8px',
        lineHeight: 1.3,
        boxSizing: 'border-box',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Header */}
      <div className="payslip-print-header" style={{ borderBottom: '2px solid #1b3c1a', paddingBottom: '4px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {logo && <img src={logo} alt="logo" style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '3px' }} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#1b3c1a' }}>ඉදැල්ලෑව ඇග්‍රෝ - වැටුප් පත්‍රිකාව</div>
              <div style={{ fontSize: '7px', color: '#666' }}>Monthly Payslip · {farmName}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '7px', color: '#666', textTransform: 'uppercase' }}>Pay Period</div>
            <div style={{ fontWeight: 700, fontSize: '9px', color: '#1b3c1a' }}>{monthLabel}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '7px', color: '#444' }}>
          <span><strong>Worker:</strong> {workerName}</span>
          <span><strong>Designation:</strong> {designation}</span>
          <span><strong>Emp. Type:</strong> {employmentType}</span>
          <span><strong>Days Worked:</strong> {breakdown.daysWorked}</span>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="payslip-print-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
        {/* Column 1: Earnings */}
        <div className="payslip-print-column" style={{ border: '1px solid #cfd4cc', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ background: '#e8f5e9', fontWeight: 700, fontSize: '8px', color: '#1b5e20', padding: '2px 4px', borderBottom: '1px solid #cfd4cc' }}>
            ලැබීම් / EARNINGS
          </div>
          <div style={{ padding: '3px 4px' }}>
            <PayslipRow label="Base Salary" value={breakdown.baseSalary} />
            <PayslipRow label={`Daily Wages (${breakdown.daysWorked}d)`} value={breakdown.dailyWages} />
            <PayslipRow label="Fuel / Transport" value={breakdown.fuel} />
            <PayslipRow label="Attendance Bonus" value={breakdown.attendanceBonus} />
            <PayslipRow label="Other Allowances" value={breakdown.other} />
            <div style={{ borderTop: '1px solid #999', marginTop: '2px', paddingTop: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '8px', color: '#1b5e20' }}>
              <span>Gross Earnings</span>
              <span>{LKR(breakdown.grossEarnings)}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Deductions */}
        <div className="payslip-print-column" style={{ border: '1px solid #cfd4cc', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ background: '#ffebee', fontWeight: 700, fontSize: '8px', color: '#b71c1c', padding: '2px 4px', borderBottom: '1px solid #cfd4cc' }}>
            අඩුකිරීම් / DEDUCTIONS
          </div>
          <div style={{ padding: '3px 4px' }}>
            <PayslipRow label="Advances / Loans" value={breakdown.advances} />
            <PayslipRow label="Other Deductions" value={Math.max(0, breakdown.totalDeductions - breakdown.advances)} />
            <div style={{ borderTop: '1px solid #999', marginTop: '2px', paddingTop: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '8px', color: '#b71c1c' }}>
              <span>Total Deductions</span>
              <span>{LKR(breakdown.totalDeductions)}</span>
            </div>
          </div>
        </div>

        {/* Column 3: Net Pay + Signatures */}
        <div className="payslip-print-column" style={{ border: '1px solid #cfd4cc', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ background: '#e3f2fd', fontWeight: 700, fontSize: '8px', color: '#0d47a1', padding: '2px 4px', borderBottom: '1px solid #cfd4cc' }}>
            ශුද්ධ වැටුප / NET PAY
          </div>
          <div style={{ padding: '3px 4px' }}>
            <div style={{ textAlign: 'center', marginBottom: '3px' }}>
              <div style={{ fontSize: '7px', color: '#666' }}>Net Payable</div>
              <div style={{ fontWeight: 800, fontSize: '13px', color: '#0d47a1' }}>{LKR(breakdown.netPayable)}</div>
            </div>
            <div style={{ fontSize: '6px', color: '#555', textAlign: 'center', marginBottom: '3px', fontStyle: 'italic' }}>
              {numberToWords(breakdown.netPayable)} Only
            </div>
            <div style={{ fontSize: '6px', color: '#444', textAlign: 'center', marginBottom: '4px', lineHeight: 1.2 }}>
              ඉහත සඳහන් ශුද්ධ වැටුප නිවැරදිව ලැබුණු බවට සහතික කරමි.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '6px', color: '#555', textAlign: 'center' }}>
              <div>
                <div style={{ borderBottom: '1px solid #666', height: '14px', marginBottom: '1px' }} />
                <div>සේවක අත්සන</div>
              </div>
              <div>
                <div style={{ borderBottom: '1px solid #666', height: '14px', marginBottom: '1px' }} />
                <div>අනුමත කළේ / කළමනාකරු</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="payslip-print-footer" style={{ marginTop: '3px', textAlign: 'center', fontSize: '6px', color: '#999', borderTop: '1px solid #e0e0e0', paddingTop: '2px' }}>
        Computer-generated payslip · {farmName} · {today}
      </div>
    </div>
  );
}

function PayslipRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', marginBottom: '1px' }}>
      <span style={{ color: '#444' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{LKR(value)}</span>
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
