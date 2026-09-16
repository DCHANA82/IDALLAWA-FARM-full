import { useState } from 'react';
import { Plus, Users, Printer, CalendarDays, Wallet, Download, Sprout, Hammer, Fuel, Award, Calculator, Pencil, Trash2, HandCoins, History, BookOpen, CheckCircle2 } from 'lucide-react';
import { useStore, newId, upsertRow } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { LKR, fmtDate, todayISO, downloadFile, toCSV } from '@/lib/format';
import { workerPayout, workerPayoutBreakdown, payrollMonthTotals, workerOutstandingAdvances, workerTotalOutstanding, workerAdvanceHistory, advanceRecoveriesFor, workerRecoveryHistory, computeAdvanceStatus, recomputeAdvanceBalances, eligibleAdvancesForRecovery, suggestAdvanceRecovery, workerSalaryPayments, workerPaymentsForMonth, isPaymentDuplicate, payrollReportData, workerAdvanceLedger } from '@/lib/calc';
import { Card, Button, Badge, SectionTitle, Stat, Modal, Input, Select, ConfirmDialog } from '@/components/ui';
import { DynamicSelect } from '@/components/DynamicSelect';
import { DataTable, StatusBadge } from '@/components/DataTable';
import { TabBar } from '@/components/TabBar';
import { printContent, VoucherPrint, PayslipPrint } from '@/components/print';
import type { PayslipBreakdown } from '@/components/print';
import { useToast } from '@/components/toast';
import { AdvancesTab, PaymentsTab } from '@/components/PayrollTabs';
import type { Worker, Attendance, ExpenseAllocation, AllocationType, CropExpense, Expense, EmploymentType, EmployeeAdvance, AdvanceRecovery, SalaryPayment, AdvanceRecoveryTarget, SalaryType, PaymentMethod, AdvanceStatus } from '@/lib/types';

type Tab = 'workers' | 'attendance' | 'settlement' | 'advances' | 'payments' | 'vouchers';

const DEVELOPMENT_CATEGORIES = [
  'Land Preparation',
  'Fencing & Boundaries',
  'Irrigation / Drip Lines',
  'Buildings & Infrastructure',
  'General Maintenance',
];

export function LaborModule() {
  const { data, save, remove, update, nextVoucherNo } = useStore();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('workers');
  const [modal, setModal] = useState<null | { kind: 'worker' | 'attendance'; edit?: Worker | Attendance }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: 'workers' | 'attendance'; id: string; name: string }>(null);
  const [settlementWorkerId, setSettlementWorkerId] = useState<string>('');
  const monthISO = new Date().toISOString().slice(0, 7);
  const [payMonth, setPayMonth] = useState(monthISO);
  const pay = payrollMonthTotals(data, payMonth);

  const permanent = data.workers.filter((w) => w.type === 'Permanent');
  const casual = data.workers.filter((w) => w.type === 'Casual');

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.kind, confirmDelete.id, confirmDelete.kind === 'workers' ? 'Worker deleted' : 'Attendance deleted');
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Permanent staff" value={String(permanent.length)} sub={`Salaries ${LKR(permanent.reduce((s, w) => s + w.monthlyBasic + w.allowances, 0))}/mo`} tone="blue" icon={<Users size={18} />} />
        <Stat label="Casual workers" value={String(casual.length)} sub={`Avg wage ${LKR(Math.round(casual.reduce((s, w) => s + w.dailyWage, 0) / (casual.length || 1)))}/day`} tone="yellow" icon={<Users size={18} />} />
        <Stat label={`Payroll ${payMonth}`} value={LKR(pay.total)} sub={`Perm ${LKR(pay.permanent)} · Casual ${LKR(pay.casual)}`} tone="green" icon={<Wallet size={18} />} />
        <Stat label="Attendance entries" value={String(data.attendance.length)} sub="All-time records" tone="neutral" icon={<CalendarDays size={18} />} />
      </div>

      <TabBar
        tabs={[
          { key: 'workers' as Tab, label: 'Workers' },
          { key: 'attendance' as Tab, label: 'Attendance & Tasks' },
          { key: 'settlement' as Tab, label: 'Month-End Settlement' },
          { key: 'advances' as Tab, label: 'Advances' },
          { key: 'payments' as Tab, label: 'Payment History' },
          { key: 'vouchers' as Tab, label: 'Payment Vouchers' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'workers' && (
        <Card className="p-5">
          <SectionTitle title="Workers" subtitle="Permanent staff & daily casual workers" icon={<Users size={18} />}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => downloadFile('workers.csv', toCSV(data.workers as unknown as Record<string, unknown>[]), 'text/csv;charset=utf-8;')}>Export</Button>
              {isAdmin && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'worker' })}>Add Worker</Button>}
            </div>} />
          <DataTable
            rows={data.workers}
            onRowClick={(w) => isAdmin && setModal({ kind: 'worker', edit: w })}
            onEdit={(w) => setModal({ kind: 'worker', edit: w })}
            onDelete={(w) => setConfirmDelete({ kind: 'workers', id: w.id, name: w.name })}
            canEdit={isAdmin}
            columns={[
              { key: 'name', header: 'Name', render: (w) => <div><div className="font-600">{w.name}</div><div className="text-xs text-neutral-500">{w.phone || '—'}</div></div> },
              { key: 'role', header: 'Role', render: (w) => w.role },
              { key: 'type', header: 'Type', render: (w) => <Badge tone={w.type === 'Permanent' ? 'blue' : 'yellow'}>{w.type}</Badge> },
              { key: 'pay', header: 'Pay basis', align: 'right', render: (w) => w.type === 'Permanent' ? <span>Basic {LKR(w.monthlyBasic)} + {LKR(w.allowances)}</span> : <span>{LKR(w.dailyWage)}/day</span>, restricted: true },
              { key: 'month', header: `Payout ${payMonth}`, align: 'right', render: (w) => <span className="font-700 text-primary-700">{LKR(workerPayout(data, w, payMonth))}</span>, restricted: true },
            ]}
          />
        </Card>
      )}

      {tab === 'attendance' && (
        <Card className="p-5">
          <SectionTitle title="Attendance & Task Allocation" subtitle="Daily attendance per field plot / nursery" icon={<CalendarDays size={18} />}
            action={isAdmin && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'attendance' })}>Add Entry</Button>} />
          <DataTable
            rows={data.attendance}
            onRowClick={(a) => isAdmin && setModal({ kind: 'attendance', edit: a })}
            onEdit={(a) => setModal({ kind: 'attendance', edit: a })}
            onDelete={(a) => { const w = data.workers.find((x) => x.id === a.workerId); setConfirmDelete({ kind: 'attendance', id: a.id, name: w ? w.name : 'this record' }); }}
            canEdit={isAdmin}
            columns={[
              { key: 'date', header: 'Date', render: (a) => fmtDate(a.date) },
              { key: 'worker', header: 'Worker', render: (a) => { const w = data.workers.find((x) => x.id === a.workerId); return w ? <div><div className="font-600">{w.name}</div><div className="text-xs text-neutral-500">{w.role}</div></div> : a.workerId; } },
              { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
              { key: 'plot', header: 'Task / Plot', render: (a) => a.taskPlot || '—' },
              { key: 'alloc', header: 'Allocation', render: (a) => <AllocationBadge allocation={a.expenseAllocation} crops={data.crops} /> },
              { key: 'allow', header: 'Allowances', align: 'right', render: (a) => { const total = (a.fuelTransportAllowance || 0) + (a.attendanceAllowance || 0) + (a.otherAllowances || 0); return total > 0 ? <span className="text-primary-700 font-600">{LKR(total)}</span> : <span className="text-neutral-400">—</span>; } },
              { key: 'hours', header: 'Hours', align: 'right', render: (a) => a.hours },
              { key: 'amount', header: 'Amount', align: 'right', render: (a) => <span className="font-700">{LKR(a.amount + (a.fuelTransportAllowance || 0) + (a.attendanceAllowance || 0) + (a.otherAllowances || 0))}</span>, restricted: true },
            ]}
          />
        </Card>
      )}

      {tab === 'settlement' && (
        <SettlementTab payMonth={payMonth} setPayMonth={setPayMonth} settlementWorkerId={settlementWorkerId} setSettlementWorkerId={setSettlementWorkerId} />
      )}

      {tab === 'advances' && (
        <AdvancesTab />
      )}

      {tab === 'payments' && (
        <PaymentsTab />
      )}

      {tab === 'vouchers' && (
        <Card className="p-5">
          <SectionTitle title="Payment Vouchers" subtitle="Instant payout vouchers per worker or labor group" icon={<Printer size={18} />}
            action={isAdmin && <Button size="sm" icon={<Plus size={14} />} onClick={() => generatePayrollVoucher()}>Generate payroll voucher</Button>} />
          <DataTable
            rows={data.vouchers.filter((v) => v.kind === 'Payroll')}
            columns={[
              { key: 'no', header: 'Voucher No.', render: (v) => <span className="font-mono font-700 text-primary-700">{v.voucherNo}</span> },
              { key: 'date', header: 'Date', render: (v) => fmtDate(v.date) },
              { key: 'party', header: 'Party', render: (v) => v.party },
              { key: 'desc', header: 'Description', render: (v) => v.description },
              { key: 'amount', header: 'Amount', align: 'right', render: (v) => <span className="font-700 text-success-700">{LKR(v.amount)}</span>, restricted: true },
              { key: 'act', header: '', render: (v) => (
                <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500" title="Print voucher" onClick={(e) => { e.stopPropagation(); printContent(<VoucherPrint voucherNo={v.voucherNo} date={fmtDate(v.date)} kind={v.kind} party={v.party} description={v.description} amount={v.amount} reference={v.reference} farmName={data.farmName} owner={data.owner} />); }}>
                  <Printer size={15} />
                </button>
              ) },
            ]}
          />
        </Card>
      )}

      {modal && (modal.kind === 'worker' ? <WorkerModal edit={modal.edit as Worker | undefined} onClose={() => setModal(null)} /> : <AttendanceModal edit={modal.edit as Attendance | undefined} onClose={() => setModal(null)} />)}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Delete this item?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        danger
      />
    </div>
  );

  function generatePayrollVoucher() {
    const payTotal = payrollMonthTotals(data, payMonth);
    if (payTotal.total <= 0) { toast('No payroll to generate voucher for', 'error'); return; }
    const v = { id: newId('vo'), voucherNo: nextVoucherNo(), date: todayISO(), kind: 'Payroll' as const, party: 'Labor Group', description: `Payroll for ${payMonth}`, amount: payTotal.total, reference: `PAY-${payMonth}` };
    update('vouchers', [v, ...data.vouchers]);
    upsertRow('vouchers', v as never).catch(() => {});
    setTab('vouchers');
  }
}

function SettlementTab({ payMonth, setPayMonth, settlementWorkerId, setSettlementWorkerId }: {
  payMonth: string;
  setPayMonth: (m: string) => void;
  settlementWorkerId: string;
  setSettlementWorkerId: (id: string) => void;
}) {
  const { data, update, nextVoucherNo } = useStore();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [settlementModal, setSettlementModal] = useState(false);

  const worker = data.workers.find((w) => w.id === settlementWorkerId);
  const breakdown = worker ? workerPayoutBreakdown(data, worker, payMonth) : null;
  const monthAttendance = worker ? data.attendance.filter((a) => a.workerId === worker.id && a.date.startsWith(payMonth)) : [];
  const presentDays = monthAttendance.filter((a) => a.status !== 'Absent').length;

  const allWorkersBreakdown = data.workers.map((w) => ({
    worker: w,
    ...workerPayoutBreakdown(data, w, payMonth),
    presentDays: data.attendance.filter((a) => a.workerId === w.id && a.date.startsWith(payMonth) && a.status !== 'Absent').length,
  }));

  const handlePrintPayslip = () => {
    document.body.classList.add('printing-payslip');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-payslip');
    }, 500);
  };

  const employmentTypeLabel = worker?.employmentType === 'DAILY' ? 'Daily / දෛනික'
    : worker?.employmentType === 'MONTHLY' ? 'Monthly / මාසික'
    : worker?.employmentType === 'HYBRID' ? 'Hybrid / මිශ්‍ර'
    : (worker?.type === 'Permanent' ? 'Monthly / මාසික' : 'Daily / දෛනික');

  return (
    <div className="space-y-4">
      <div className="screen-only-payroll space-y-4">
      <Card className="p-5">
        <SectionTitle title="Month-End Settlement" subtitle="Calculate net payout with allowances and bonuses" icon={<Calculator size={18} />}
          action={
            <div className="flex gap-2 items-center">
              <Input label="" type="month" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} className="w-40" />
            </div>
          } />

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <Select label="Select Worker (සේවකයා)" value={settlementWorkerId} onChange={(e) => setSettlementWorkerId(e.target.value)}>
            <option value="">— Select worker —</option>
            {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.type}</option>)}
          </Select>
          {worker && (
            <div className="flex items-end">
              <div className="w-full p-3 rounded-xl bg-primary-50 text-sm">
                Present days: <strong className="text-primary-700">{presentDays}</strong> · Type: <strong className="text-primary-700">{worker.type}</strong>
              </div>
            </div>
          )}
        </div>

        {worker && breakdown && (
          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <div className="font-display font-700 text-neutral-900">{worker.name}</div>
                <div className="text-xs text-neutral-500">{worker.role} · {payMonth}</div>
              </div>
              {breakdown.total > 0 && (
                <Button variant="outline" icon={<Printer size={14} />} onClick={handlePrintPayslip}>Print Payslip / මුද්‍රණය කරන්න</Button>
              )}
            </div>
            <div className="divide-y divide-neutral-100">
              <BreakdownRow label="Base Salary (මූලික වැටුප)" value={breakdown.baseSalary} icon={<Wallet size={14} />} />
              <BreakdownRow label={`Daily Wages — ${breakdown.daysWorked} days (දෛනික වැටුප)`} value={breakdown.dailyWages} icon={<CalendarDays size={14} />} />
              <BreakdownRow label="Fuel / Transport (ඉන්ධන/ප්‍රවාහන දීමනා)" value={breakdown.fuel} icon={<Fuel size={14} />} />
              <BreakdownRow label="Attendance Bonus (සහභාගි දීමනා)" value={breakdown.attendanceBonus} icon={<Award size={14} />} />
              <BreakdownRow label="Other Allowances (වෙනත් දීමනා)" value={breakdown.other} icon={<Plus size={14} />} />
              <div className="px-4 py-2.5 flex items-center justify-between bg-success-50/50">
                <span className="font-600 text-sm text-success-800">Gross Earnings (මුළු ඉපැයීම්)</span>
                <span className="font-700 text-success-700">{LKR(breakdown.grossEarnings)}</span>
              </div>
              {breakdown.totalDeductions > 0 && (
                <>
                  <BreakdownRow label="Advances / Loans (අත්තිකාරම් / ණය)" value={-breakdown.advances} icon={<Wallet size={14} />} />
                  <div className="px-4 py-2.5 flex items-center justify-between bg-error-50/50">
                    <span className="font-600 text-sm text-error-800">Total Deductions (මුළු කුණු)</span>
                    <span className="font-700 text-error-700">{LKR(breakdown.totalDeductions)}</span>
                  </div>
                </>
              )}
              <div className="px-4 py-3 bg-primary-50 flex items-center justify-between">
                <span className="font-display font-700 text-primary-800">Net Payable (අතට ලැබෙන ශුද්ධ වැටුප)</span>
                <span className="font-display text-xl font-800 text-primary-700">{LKR(breakdown.netPayable)}</span>
              </div>
            </div>
          </div>
        )}

        {!worker && (
          <div className="grid sm:grid-cols-2 gap-3">
            {allWorkersBreakdown.map(({ worker: w, total, presentDays: pd }) => (
              <div key={w.id} className="p-3 rounded-xl border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition cursor-pointer" onClick={() => setSettlementWorkerId(w.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-600 text-neutral-900">{w.name}</div>
                    <div className="text-xs text-neutral-500">{w.type} · {pd} days present</div>
                  </div>
                  <div className="font-700 text-primary-700">{LKR(total)}</div>
                </div>
              </div>
            ))}
            {data.workers.length === 0 && <div className="text-neutral-400 text-sm">No workers added yet.</div>}
          </div>
        )}

        {worker && breakdown && isAdmin && breakdown.total > 0 && (
          <div className="flex justify-end gap-2 mt-4">
            <Button icon={<Printer size={14} />} onClick={() => setSettlementModal(true)}>Generate Settlement Voucher</Button>
          </div>
        )}
      </Card>

      {settlementModal && worker && breakdown && (
        <SettlementVoucherModal
          worker={worker}
          breakdown={breakdown}
          payMonth={payMonth}
          onClose={() => setSettlementModal(false)}
          onConfirm={() => {
            const v = {
              id: newId('vo'),
              voucherNo: nextVoucherNo(),
              date: todayISO(),
              kind: 'Payroll' as const,
              party: worker.name,
              description: `Settlement — ${payMonth}`,
              amount: breakdown.total,
              reference: `SETTLE-${payMonth}-${worker.id}`,
            };
            update('vouchers', [v, ...data.vouchers]);
            upsertRow('vouchers', v as never).catch(() => {});
            toast('Settlement voucher generated', 'success');
            setSettlementModal(false);
          }}
        />
      )}
      </div>

      {worker && breakdown && breakdown.total > 0 && (
        <div className="print-only-payslip" id="printable-payslip">
          <PayslipPrint
            farmName={data.farmName || 'ඉදැල්ලෑව ඇග්‍රෝ'}
            monthLabel={payMonth}
            workerName={worker.name}
            employmentType={employmentTypeLabel}
            designation={worker.role}
            breakdown={breakdown as PayslipBreakdown}
            owner={data.owner}
            logo={data.logo}
          />
        </div>
      )}
    </div>
  );
}

function BreakdownRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-neutral-700">
        <span className="text-neutral-400">{icon}</span>
        {label}
      </div>
      <span className={`font-600 ${value > 0 ? 'text-neutral-900' : 'text-neutral-400'}`}>{LKR(value)}</span>
    </div>
  );
}

function SettlementVoucherModal({ worker, breakdown, payMonth, onClose, onConfirm }: {
  worker: Worker;
  breakdown: { baseSalary: number; dailyWages: number; daysWorked: number; fuel: number; attendanceBonus: number; other: number; advances: number; grossEarnings: number; totalDeductions: number; netPayable: number; total: number };
  payMonth: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Confirm Settlement Voucher" size="md" footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm}>Generate Voucher</Button>
    </>}>
      <div className="space-y-2">
        <div className="text-sm text-neutral-600 mb-3">Review the payout breakdown for <strong className="text-neutral-900">{worker.name}</strong> for {payMonth}.</div>
        <BreakdownRow label="Base Salary" value={breakdown.baseSalary} icon={<Wallet size={14} />} />
        <BreakdownRow label={`Daily Wages — ${breakdown.daysWorked} days`} value={breakdown.dailyWages} icon={<CalendarDays size={14} />} />
        <BreakdownRow label="Fuel / Transport" value={breakdown.fuel} icon={<Fuel size={14} />} />
        <BreakdownRow label="Attendance Bonus" value={breakdown.attendanceBonus} icon={<Award size={14} />} />
        <BreakdownRow label="Other Allowances" value={breakdown.other} icon={<Plus size={14} />} />
        {breakdown.totalDeductions > 0 && (
          <BreakdownRow label="Advances / Loans" value={-breakdown.advances} icon={<Wallet size={14} />} />
        )}
        <div className="px-4 py-3 bg-primary-50 rounded-xl flex items-center justify-between mt-3">
          <span className="font-display font-700 text-primary-800">Net Payable</span>
          <span className="font-display text-xl font-800 text-primary-700">{LKR(breakdown.netPayable)}</span>
        </div>
      </div>
    </Modal>
  );
}

function AllocationBadge({ allocation, crops }: { allocation?: ExpenseAllocation; crops: { id: string; name: string; plot: string }[] }) {
  if (!allocation) return <span className="text-xs text-neutral-400">—</span>;
  if (allocation.allocationType === 'CROP') {
    const crop = crops.find((c) => c.id === allocation.cropId);
    return <Badge tone="green"><Sprout size={11} /> {crop ? `${crop.name} · ${crop.plot}` : 'Crop'}</Badge>;
  }
  return <Badge tone="blue"><Hammer size={11} /> {allocation.developmentCategory || 'Farm Dev'}</Badge>;
}

function WorkerModal({ edit, onClose }: { edit?: Worker; onClose: () => void }) {
  const { save } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<Worker>(() => {
    const base: Worker = edit || { id: newId('wk'), name: '', type: 'Casual', employmentType: 'DAILY', phone: '', role: '', monthlyBasic: 0, allowances: 0, dailyWage: 1800 };
    if (!base.employmentType) {
      base.employmentType = base.type === 'Permanent' ? 'MONTHLY' : 'DAILY';
    }
    if (base.baseMonthlySalary === undefined) {
      base.baseMonthlySalary = base.type === 'Permanent' ? base.monthlyBasic + base.allowances : 0;
    }
    if (base.defaultDailyRate === undefined) {
      base.defaultDailyRate = base.dailyWage;
    }
    return base;
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.name.trim()) e.name = true;
    if (!f.role.trim()) e.role = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Please fill in all required fields: Name, Role', 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    if (!validate()) return;
    const et = f.employmentType;
    const saved: Worker = {
      ...f,
      type: et === 'DAILY' ? 'Casual' : 'Permanent',
      monthlyBasic: et === 'MONTHLY' ? (f.baseMonthlySalary ?? 0) : et === 'HYBRID' ? (f.baseMonthlySalary ?? 0) : 0,
      allowances: 0,
      dailyWage: f.defaultDailyRate ?? f.dailyWage,
    };
    save('workers', saved, edit ? 'Worker updated' : 'Worker added');
    setConfirmSave(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={edit ? 'Edit worker' : 'Add worker'} size="lg" footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>Save</Button>
    </>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Name *" value={f.name} error={errors.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Phone" value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <DynamicSelect label="Role *" moduleName="worker_role" value={f.role} onChange={(v) => setF({ ...f, role: v })} placeholder="Select or add role" />
        <Select label="Employment Type (සේවා වර්ගය)" value={f.employmentType} onChange={(e) => setF({ ...f, employmentType: e.target.value as EmploymentType })}>
          <option value="DAILY">Daily / දෛනික</option>
          <option value="MONTHLY">Monthly / මාසික</option>
          <option value="HYBRID">Hybrid / මිශ්‍ර</option>
        </Select>
        {(f.employmentType === 'DAILY' || f.employmentType === 'HYBRID') && (
          <Input label="Default Daily Rate (Rs.) දෛනික අනුපාතය" type="number" value={f.defaultDailyRate ?? 0} onChange={(e) => setF({ ...f, defaultDailyRate: +e.target.value })} />
        )}
        {(f.employmentType === 'MONTHLY' || f.employmentType === 'HYBRID') && (
          <Input label="Base Monthly Salary (Rs.) මූලික මාසික වැටුප" type="number" value={f.baseMonthlySalary ?? 0} onChange={(e) => setF({ ...f, baseMonthlySalary: +e.target.value })} />
        )}
        {f.employmentType === 'MONTHLY' && (
          <Input label="Allowances (Rs.) දීමනා" type="number" value={f.allowances} onChange={(e) => setF({ ...f, allowances: +e.target.value })} />
        )}
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title="Save this entry?"
        message="Are you sure you want to save this worker record?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}

function AttendanceModal({ edit, onClose }: { edit?: Attendance; onClose: () => void }) {
  const { data, save, update, nextVoucherNo } = useStore();
  const { toast } = useToast();
  const worker = data.workers.find((w) => w.id === (edit?.workerId || data.workers[0]?.id));
  const [f, setF] = useState<Attendance>(edit || { id: newId('at'), workerId: data.workers[0]?.id || '', date: todayISO(), status: 'Present', taskPlot: '', hours: 8, amount: 0 });
  const [allocType, setAllocType] = useState<AllocationType | ''>(edit?.expenseAllocation?.allocationType || '');
  const [cropId, setCropId] = useState<string>(edit?.expenseAllocation?.cropId || '');
  const [plotId, setPlotId] = useState<string>(edit?.expenseAllocation?.plotId || '');
  const [activity, setActivity] = useState<string>(edit?.expenseAllocation?.activity || '');
  const [devCategory, setDevCategory] = useState<string>(edit?.expenseAllocation?.developmentCategory || '');
  const [workDetails, setWorkDetails] = useState<string>(edit?.expenseAllocation?.workDetails || '');
  const [fuelAlloc, setFuelAlloc] = useState<'CROP' | 'OVERHEAD' | ''>(edit?.fuelAllocation || '');
  const [fuelCropId, setFuelCropId] = useState<string>(edit?.fuelCropId || '');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const recompute = (next: Attendance): Attendance => {
    const w = data.workers.find((x) => x.id === next.workerId);
    if (!w) return next;
    if (next.status === 'Absent') return { ...next, hours: 0, amount: 0 };
    const hrs = next.hours;
    const et = w.employmentType || (w.type === 'Permanent' ? 'MONTHLY' : 'DAILY');
    if (et === 'MONTHLY') return { ...next, amount: 0 };
    const rate = next.overrideRate ?? (w.defaultDailyRate ?? w.dailyWage);
    const amount = Math.round(rate * (hrs / 8));
    return { ...next, amount };
  };

  const totalAllowances = (f.fuelTransportAllowance || 0) + (f.attendanceAllowance || 0) + (f.otherAllowances || 0);
  const totalPayout = recompute(f).amount + totalAllowances;

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.workerId) e.workerId = true;
    if (!f.date) e.date = true;
    if (allocType === 'CROP' && !cropId) e.cropId = true;
    if (allocType === 'FARM_DEVELOPMENT' && !devCategory) e.devCategory = true;
    if (fuelAlloc === 'CROP' && !fuelCropId) e.fuelCropId = true;
    setErrors(e);
    if (Object.keys(e).length) {
      const missing = Object.keys(e).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');
      toast(`Please fill in all required fields: ${missing}`, 'error');
      return false;
    }
    return true;
  };

  const buildAllocation = (): ExpenseAllocation | undefined => {
    if (!allocType) return undefined;
    if (allocType === 'CROP') {
      return { allocationType: 'CROP', cropId, plotId: plotId || cropId, activity: activity || undefined };
    }
    return { allocationType: 'FARM_DEVELOPMENT', developmentCategory: devCategory, workDetails: workDetails || undefined };
  };

  const doSave = () => {
    const allocation = buildAllocation();
    const finalAttendance = recompute({ ...f, expenseAllocation: allocation });
    save('attendance', finalAttendance, edit ? 'Attendance updated' : 'Attendance added');

    if (!edit && finalAttendance.amount > 0 && allocation) {
      const w = data.workers.find((x) => x.id === finalAttendance.workerId);
      const workerName = w?.name || 'Worker';

      if (allocation.allocationType === 'CROP') {
        const crop = data.crops.find((c) => c.id === allocation.cropId);
        const ce: CropExpense = {
          id: newId('ce'),
          cropId: allocation.cropId!,
          date: finalAttendance.date,
          category: 'Labor',
          description: `Labor — ${workerName} (${finalAttendance.hours}h)${allocation.activity ? ` — ${allocation.activity}` : ''}`,
          amount: finalAttendance.amount,
        };
        update('cropExpenses', [ce, ...data.cropExpenses]);
        upsertRow('cropExpenses', ce as never).catch(() => {});

        const v = {
          id: newId('vo'),
          voucherNo: nextVoucherNo(),
          date: finalAttendance.date,
          kind: 'Payment' as const,
          party: workerName,
          description: `Labor — ${crop?.name || 'Crop'} (${finalAttendance.hours}h)`,
          amount: finalAttendance.amount,
          reference: `LABOR-${finalAttendance.id}`,
        };
        update('vouchers', [v, ...data.vouchers]);
        upsertRow('vouchers', v as never).catch(() => {});
      } else {
        const exp: Expense = {
          id: newId('ex'),
          date: finalAttendance.date,
          class: 'Fixed Overhead',
          category: allocation.developmentCategory || 'Farm Development',
          description: `Labor — ${workerName} (${finalAttendance.hours}h) — Farm Development${allocation.workDetails ? ` — ${allocation.workDetails}` : ''}`,
          amount: finalAttendance.amount,
          reference: `LABOR-${finalAttendance.id}`,
        };
        update('expenses', [exp, ...data.expenses]);
        upsertRow('expenses', exp as never).catch(() => {});

        const v = {
          id: newId('vo'),
          voucherNo: nextVoucherNo(),
          date: finalAttendance.date,
          kind: 'Payment' as const,
          party: workerName,
          description: `Labor — ${allocation.developmentCategory || 'Farm Dev'} (${finalAttendance.hours}h)`,
          amount: finalAttendance.amount,
          reference: `LABOR-${finalAttendance.id}`,
        };
        update('vouchers', [v, ...data.vouchers]);
        upsertRow('vouchers', v as never).catch(() => {});
      }
    }

    if (!edit && (f.fuelTransportAllowance || 0) > 0) {
      const w = data.workers.find((x) => x.id === f.workerId);
      const workerName = w?.name || 'Worker';

      if (fuelAlloc === 'CROP' && fuelCropId) {
        const crop = data.crops.find((c) => c.id === fuelCropId);
        const ce: CropExpense = {
          id: newId('ce'),
          cropId: fuelCropId,
          date: f.date,
          category: 'Fuel/Transport',
          description: `Fuel/Transport — ${workerName} — ${crop?.name || ''}`,
          amount: f.fuelTransportAllowance!,
        };
        update('cropExpenses', [ce, ...data.cropExpenses]);
        upsertRow('cropExpenses', ce as never).catch(() => {});
      } else {
        const exp: Expense = {
          id: newId('ex'),
          date: f.date,
          class: 'Fixed Overhead',
          category: 'Fuel/Transport',
          description: `Fuel/Transport — ${workerName}`,
          amount: f.fuelTransportAllowance!,
          reference: `FUEL-${f.id}`,
        };
        update('expenses', [exp, ...data.expenses]);
        upsertRow('expenses', exp as never).catch(() => {});
      }
    }

    setConfirmSave(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={edit ? 'Edit attendance' : 'Mark Attendance / Add Daily Work'} size="lg" footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>Save</Button>
    </>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Worker *" value={f.workerId} error={errors.workerId} onChange={(e) => setF({ ...f, workerId: e.target.value })}>
          {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.type}</option>)}
        </Select>
        <Input label="Date *" type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Attendance['status'] })}>
          <option>Present</option><option>Absent</option><option>Half Day</option>
        </Select>
        <Input label="Hours" type="number" value={f.hours} onChange={(e) => setF({ ...f, hours: +e.target.value })} />
        {worker && (worker.employmentType === 'DAILY' || worker.employmentType === 'HYBRID' || (!worker.employmentType && worker.type === 'Casual')) && (
          <Input
            label="Override Daily Rate (අභිබවා දෛනික අනුපාතය)"
            type="number"
            value={f.overrideRate ?? ''}
            onChange={(e) => setF({ ...f, overrideRate: e.target.value ? +e.target.value : undefined })}
            placeholder={`Default: ${worker?.defaultDailyRate ?? worker?.dailyWage ?? 0}`}
          />
        )}
        {worker && (worker.employmentType === 'MONTHLY' || (!worker.employmentType && worker.type === 'Permanent')) && (
          <Input
            label="Override Monthly Salary (අභිබවා මාසික වැටුප)"
            type="number"
            value={f.overrideRate ?? ''}
            onChange={(e) => setF({ ...f, overrideRate: e.target.value ? +e.target.value : undefined })}
            placeholder={`Default: ${worker?.baseMonthlySalary ?? (worker?.monthlyBasic || 0) + (worker?.allowances || 0)}`}
          />
        )}
        <div className="flex items-end"><div className="w-full p-3 rounded-xl bg-primary-50 text-sm">Base payout: <strong className="text-primary-700">{LKR(recompute(f).amount)}</strong></div></div>
      </div>

      {/* Allowances Section */}
      <div className="mt-5 pt-4 border-t border-neutral-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-primary-600" />
          <h4 className="font-display text-sm font-700 text-neutral-900">Allowances</h4>
          <span className="text-xs text-neutral-500">දීමනා</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            label="Fuel/Transport (ඉන්ධන/ප්‍රවාහන)"
            type="number"
            value={f.fuelTransportAllowance ?? 0}
            onChange={(e) => setF({ ...f, fuelTransportAllowance: +e.target.value })}
          />
          <Input
            label="Attendance Bonus (සහභාගි දීමනා)"
            type="number"
            value={f.attendanceAllowance ?? 0}
            onChange={(e) => setF({ ...f, attendanceAllowance: +e.target.value })}
          />
          <Input
            label="Other (වෙනත්)"
            type="number"
            value={f.otherAllowances ?? 0}
            onChange={(e) => setF({ ...f, otherAllowances: +e.target.value })}
          />
        </div>

        {(f.fuelTransportAllowance || 0) > 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Select
              label="Fuel Allocation (ඉන්ධන වෙන් කිරීම)"
              value={fuelAlloc}
              onChange={(e) => { setFuelAlloc(e.target.value as 'CROP' | 'OVERHEAD' | ''); setFuelCropId(''); }}
            >
              <option value="">— General (no specific crop) —</option>
              <option value="CROP">Link to Crop (වගාවට)</option>
              <option value="OVERHEAD">General Farm Overhead (සාමාන්‍ය ප්‍රකාශ)</option>
            </Select>
            {fuelAlloc === 'CROP' && (
              <Select label="Link to Crop (බෝගය) *" value={fuelCropId} error={errors.fuelCropId} onChange={(e) => setFuelCropId(e.target.value)}>
                <option value="">— Select crop —</option>
                {data.crops.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.plot}</option>)}
              </Select>
            )}
          </div>
        )}

        {totalAllowances > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-success-50 border border-success-200 text-sm">
            Total Allowances: <strong className="text-success-700">{LKR(totalAllowances)}</strong>
            {' · '}Total Payout: <strong className="text-primary-700">{LKR(totalPayout)}</strong>
          </div>
        )}
      </div>

      {/* Expense Allocation Section */}
      <div className="mt-5 pt-4 border-t border-neutral-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-emerald-600" />
          <h4 className="font-display text-sm font-700 text-neutral-900">Expense Allocation</h4>
          <span className="text-xs text-neutral-500">පිරිවැය වර්ගය</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => { setAllocType('CROP'); setCropId(''); setPlotId(''); setActivity(''); setDevCategory(''); setWorkDetails(''); }}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${allocType === 'CROP'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
              : 'border-neutral-200 bg-white text-neutral-600 hover:border-emerald-300 hover:bg-emerald-50/50'}`}
          >
            <Sprout size={20} className={allocType === 'CROP' ? 'text-emerald-600' : 'text-neutral-400'} />
            <div className="text-left">
              <div className="font-600 text-sm">Crop Specific</div>
              <div className="text-xs text-neutral-500">වගා සෘජු වියදම්</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setAllocType('FARM_DEVELOPMENT'); setCropId(''); setPlotId(''); setActivity(''); setDevCategory(''); setWorkDetails(''); }}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${allocType === 'FARM_DEVELOPMENT'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
              : 'border-neutral-200 bg-white text-neutral-600 hover:border-emerald-300 hover:bg-emerald-50/50'}`}
          >
            <Hammer size={20} className={allocType === 'FARM_DEVELOPMENT' ? 'text-emerald-600' : 'text-neutral-400'} />
            <div className="text-left">
              <div className="font-600 text-sm">Farm Development</div>
              <div className="text-xs text-neutral-500">ගොවිපල සංවර්ධන</div>
            </div>
          </button>
        </div>

        {allocType === 'CROP' && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Select label="Select Crop / වගාව *" value={cropId} error={errors.cropId} onChange={(e) => { setCropId(e.target.value); const c = data.crops.find((x) => x.id === e.target.value); setPlotId(c?.plot || ''); }}>
              <option value="">— Select crop —</option>
              {data.crops.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.plot}</option>)}
            </Select>
            <Select label="Select Plot / බිම් කොටස" value={plotId} onChange={(e) => setPlotId(e.target.value)}>
              <option value="">— Select plot —</option>
              {data.crops.map((c) => <option key={c.id} value={c.plot}>{c.plot}</option>)}
            </Select>
            <Input label="Activity / කාර්යය" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Harvesting, Weeding, Spraying" />
          </div>
        )}

        {allocType === 'FARM_DEVELOPMENT' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Development Category / සංවර්ධන අංශය *" value={devCategory} error={errors.devCategory} onChange={(e) => setDevCategory(e.target.value)}>
              <option value="">— Select category —</option>
              {DEVELOPMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="Work Details / විස්තරය" value={workDetails} onChange={(e) => setWorkDetails(e.target.value)} placeholder="Describe the work done" />
          </div>
        )}

        {allocType && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {allocType === 'CROP' ? (
              <>Wage will be added to the selected crop's <strong>Labor expense</strong> in Crop P&L and a payment voucher will be created.</>
            ) : (
              <>Wage will be logged as a <strong>Farm Development expense</strong> in the Finance Expense Log and a payment voucher will be created.</>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title="Save this entry?"
        message="Are you sure you want to save this attendance record?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}
