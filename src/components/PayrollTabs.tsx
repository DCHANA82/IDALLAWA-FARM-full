import { useState } from 'react';
import { HandCoins, History, BookOpen, Plus, Wallet, TrendingDown, TrendingUp, Printer } from 'lucide-react';
import { useStore, newId, upsertRow } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { LKR, fmtDate, todayISO } from '@/lib/format';
import {
  workerOutstandingAdvances, workerTotalOutstanding, workerAdvanceHistory, advanceRecoveriesFor,
  workerRecoveryHistory, computeAdvanceStatus, recomputeAdvanceBalances,
  eligibleAdvancesForRecovery, suggestAdvanceRecovery,
  workerSalaryPayments, isPaymentDuplicate, workerAdvanceLedger,
} from '@/lib/calc';
import { Card, Button, Badge, SectionTitle, Stat, Modal, Input, Select, ConfirmDialog } from '@/components/ui';
import { DataTable, StatusBadge } from '@/components/DataTable';
import { useToast } from '@/components/toast';
import type {
  Worker, EmployeeAdvance, AdvanceRecovery, SalaryPayment,
  AdvanceRecoveryTarget, SalaryType, PaymentMethod,
} from '@/lib/types';

// ─── Advances Tab ───

export function AdvancesTab() {
  const { data, update, nextAdvanceNo } = useStore();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [giveModal, setGiveModal] = useState(false);
  const [recoverModal, setRecoverModal] = useState(false);
  const [ledgerWorkerId, setLedgerWorkerId] = useState('');
  const [confirmRecover, setConfirmRecover] = useState(false);

  const totalOutstanding = data.workers.reduce(
    (s, w) => s + workerTotalOutstanding(data, w.id), 0
  );
  const totalAdvances = data.employeeAdvances.reduce((s, a) => s + a.amount, 0);
  const totalRecovered = data.advanceRecoveries.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total Advances Given" value={LKR(totalAdvances)} sub={`${data.employeeAdvances.length} advances`} tone="blue" icon={<HandCoins size={18} />} />
        <Stat label="Total Recovered" value={LKR(totalRecovered)} sub="All-time recoveries" tone="green" icon={<TrendingDown size={18} />} />
        <Stat label="Outstanding Balance" value={LKR(totalOutstanding)} sub="To be recovered" tone="yellow" icon={<Wallet size={18} />} />
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Employee Advances"
          subtitle="Track advances given to employees and recover from salary payments"
          icon={<HandCoins size={18} />}
          action={isAdmin && <Button size="sm" icon={<Plus size={14} />} onClick={() => setGiveModal(true)}>Give Advance</Button>}
        />
        <DataTable
          rows={data.employeeAdvances}
          columns={[
            { key: 'ref', header: 'Ref', render: (a: EmployeeAdvance) => <span className="font-mono text-xs text-primary-700">{a.reference || a.id}</span> },
            { key: 'worker', header: 'Worker', render: (a: EmployeeAdvance) => { const w = data.workers.find((x) => x.id === a.workerId); return w ? <div><div className="font-600">{w.name}</div><div className="text-xs text-neutral-500">{w.role}</div></div> : a.workerId; } },
            { key: 'date', header: 'Date', render: (a: EmployeeAdvance) => fmtDate(a.advanceDate) },
            { key: 'amount', header: 'Amount', align: 'right', render: (a: EmployeeAdvance) => <span className="font-700">{LKR(a.amount)}</span> },
            { key: 'recovered', header: 'Recovered', align: 'right', render: (a: EmployeeAdvance) => <span className="text-success-700">{LKR(a.recoveredAmount)}</span> },
            { key: 'remaining', header: 'Outstanding', align: 'right', render: (a: EmployeeAdvance) => <span className={`font-700 ${a.remainingBalance > 0 ? 'text-error-700' : 'text-neutral-400'}`}>{LKR(a.remainingBalance)}</span> },
            { key: 'target', header: 'Recover From', render: (a: EmployeeAdvance) => {
              if (a.recoveryTarget === 'DAILY') return <Badge tone="yellow">Daily</Badge>;
              if (a.recoveryTarget === 'MONTHLY') return <Badge tone="blue">Monthly</Badge>;
              return <Badge tone="neutral">Any</Badge>;
            }},
            { key: 'status', header: 'Status', render: (a: EmployeeAdvance) => {
              if (a.status === 'Fully Recovered') return <Badge tone="green">Recovered</Badge>;
              if (a.status === 'Partially Recovered') return <Badge tone="yellow">Partial</Badge>;
              return <Badge tone="red">Outstanding</Badge>;
            }},
          ]}
        />
      </Card>

      <Card className="p-5">
        <SectionTitle
          title="Advance Recovery History"
          subtitle="All advance deductions from salary payments"
          icon={<History size={18} />}
        />
        <DataTable
          rows={data.advanceRecoveries}
          columns={[
            { key: 'date', header: 'Date', render: (r: AdvanceRecovery) => fmtDate(r.recoveryDate) },
            { key: 'worker', header: 'Worker', render: (r: AdvanceRecovery) => { const w = data.workers.find((x) => x.id === r.workerId); return w ? w.name : r.workerId; } },
            { key: 'source', header: 'From', render: (r: AdvanceRecovery) => r.source === 'MONTHLY' ? <Badge tone="blue">Monthly Salary</Badge> : <Badge tone="yellow">Daily Payment</Badge> },
            { key: 'amount', header: 'Amount', align: 'right', render: (r: AdvanceRecovery) => <span className="font-700 text-error-700">{LKR(r.amount)}</span> },
            { key: 'ref', header: 'Reference', render: (r: AdvanceRecovery) => r.reference || '—' },
          ]}
        />
      </Card>

      <Card className="p-5">
        <SectionTitle
          title="Advance Ledger (Per Worker)"
          subtitle="Complete advance and recovery history per employee"
          icon={<BookOpen size={18} />}
          action={
            <Select label="" value={ledgerWorkerId} onChange={(e) => setLedgerWorkerId(e.target.value)} className="w-56">
              <option value="">— Select worker —</option>
              {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          }
        />
        {ledgerWorkerId && <AdvanceLedger workerId={ledgerWorkerId} />}
      </Card>

      {giveModal && <GiveAdvanceModal onClose={() => setGiveModal(false)} />}
      {recoverModal && <RecoverAdvanceModal onClose={() => setRecoverModal(false)} />}
    </div>
  );
}

function AdvanceLedger({ workerId }: { workerId: string }) {
  const { data } = useStore();
  const ledger = workerAdvanceLedger(data, workerId);
  const w = data.workers.find((x) => x.id === workerId);

  if (!w) return <div className="text-neutral-400 text-sm">Worker not found.</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-blue-50 text-center">
          <div className="text-xs text-neutral-500">Total Advanced</div>
          <div className="font-700 text-blue-700">{LKR(ledger.advances.reduce((s, a) => s + a.amount, 0))}</div>
        </div>
        <div className="p-3 rounded-xl bg-success-50 text-center">
          <div className="text-xs text-neutral-500">Total Recovered</div>
          <div className="font-700 text-success-700">{LKR(ledger.recoveries.reduce((s, r) => s + r.amount, 0))}</div>
        </div>
        <div className="p-3 rounded-xl bg-error-50 text-center">
          <div className="text-xs text-neutral-500">Outstanding</div>
          <div className="font-700 text-error-700">{LKR(ledger.finalBalance)}</div>
        </div>
      </div>

      {ledger.lines.length === 0 ? (
        <div className="text-neutral-400 text-sm py-4 text-center">No advance history for this worker.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 uppercase">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3 text-right">Advanced (Debit)</th>
                <th className="py-2 px-3 text-right">Recovered (Credit)</th>
                <th className="py-2 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.lines.map((line, i) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="py-2 px-3 text-xs">{fmtDate(line.date)}</td>
                  <td className="py-2 px-3">{line.description}</td>
                  <td className="py-2 px-3 text-right font-600 text-blue-700">{line.debit > 0 ? LKR(line.debit) : '—'}</td>
                  <td className="py-2 px-3 text-right font-600 text-success-700">{line.credit > 0 ? LKR(line.credit) : '—'}</td>
                  <td className="py-2 px-3 text-right font-700">{LKR(line.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GiveAdvanceModal({ onClose }: { onClose: () => void }) {
  const { data, update, nextAdvanceNo } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState({
    workerId: '',
    advanceDate: todayISO(),
    amount: 0,
    paymentMethod: 'Cash' as PaymentMethod,
    reference: '',
    recoveryTarget: 'ANY' as AdvanceRecoveryTarget,
  });
  const [confirm, setConfirm] = useState(false);

  const worker = data.workers.find((w) => w.id === f.workerId);

  const doSave = () => {
    if (!f.workerId) { toast('Select a worker', 'error'); return; }
    if (f.amount <= 0) { toast('Amount must be greater than 0', 'error'); return; }

    const advance: EmployeeAdvance = {
      id: newId('adv'),
      workerId: f.workerId,
      advanceDate: f.advanceDate,
      amount: f.amount,
      recoveredAmount: 0,
      remainingBalance: f.amount,
      paymentMethod: f.paymentMethod,
      reference: f.reference || nextAdvanceNo(),
      recoveryTarget: f.recoveryTarget,
      status: 'Outstanding',
    };
    update('employeeAdvances', [advance, ...data.employeeAdvances]);
    upsertRow('employeeAdvances', advance as never).catch(() => {});
    toast('Advance recorded', 'success');
    setConfirm(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Give Advance / අත්තිකාරම්" size="md" footer={<>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button onClick={() => setConfirm(true)}>Record Advance</Button>
    </>}>
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-blue-50 text-sm text-blue-800">
          An advance is money paid <strong>before</strong> salary is earned. It will be recovered from future payments, NOT counted as salary expense.
        </div>
        <Select label="Worker * / සේවකයා" value={f.workerId} onChange={(e) => setF({ ...f, workerId: e.target.value })}>
          <option value="">— Select worker —</option>
          {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.role}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Advance Date / දිනය" type="date" value={f.advanceDate} onChange={(e) => setF({ ...f, advanceDate: e.target.value })} />
          <Input label="Amount (Rs.) / මුදල" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Payment Method" value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value as PaymentMethod })}>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </Select>
          <Select label="Recover From / කුණු කරන්නේ" value={f.recoveryTarget} onChange={(e) => setF({ ...f, recoveryTarget: e.target.value as AdvanceRecoveryTarget })}>
            <option value="ANY">Any payment</option>
            <option value="DAILY">Daily payments only</option>
            <option value="MONTHLY">Monthly salary only</option>
          </Select>
        </div>
        <Input label="Reference / Note" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="Optional note" />
        {worker && (
          <div className="p-3 rounded-xl bg-neutral-50 text-sm">
            Current outstanding: <strong className="text-error-700">{LKR(workerTotalOutstanding(data, worker.id))}</strong>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doSave}
        title="Record this advance?"
        message={`Give ${LKR(f.amount)} as advance to ${worker?.name || 'this worker'}?`}
        confirmLabel="Yes, Record"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}

function RecoverAdvanceModal({ onClose }: { onClose: () => void }) {
  const { data, update } = useStore();
  const { toast } = useToast();
  const [workerId, setWorkerId] = useState('');
  const [source, setSource] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [recoveries, setRecoveries] = useState<{ advanceId: string; amount: number }[]>([]);
  const [confirm, setConfirm] = useState(false);

  const eligible = workerId ? eligibleAdvancesForRecovery(data, workerId, source) : [];
  const worker = data.workers.find((w) => w.id === workerId);
  const totalDeduction = recoveries.reduce((s, r) => s + r.amount, 0);

  const updateRecovery = (advanceId: string, amount: number) => {
    const adv = eligible.find((a) => a.id === advanceId);
    if (!adv) return;
    const capped = Math.min(amount, adv.remainingBalance);
    setRecoveries((prev) => {
      const existing = prev.find((r) => r.advanceId === advanceId);
      if (existing) {
        return capped <= 0
          ? prev.filter((r) => r.advanceId !== advanceId)
          : prev.map((r) => r.advanceId === advanceId ? { ...r, amount: capped } : r);
      }
      return capped > 0 ? [...prev, { advanceId, amount: capped }] : prev;
    });
  };

  const doSave = () => {
    if (!workerId) { toast('Select a worker', 'error'); return; }
    if (recoveries.length === 0 || totalDeduction <= 0) { toast('Enter at least one recovery amount', 'error'); return; }

    const recoveryDate = todayISO();
    const newRecoveries: AdvanceRecovery[] = recoveries.map((r) => ({
      id: newId('rec'),
      advanceId: r.advanceId,
      workerId,
      recoveryDate,
      amount: r.amount,
      source,
      reference: '',
    }));

    update('advanceRecoveries', [...newRecoveries, ...data.advanceRecoveries]);
    newRecoveries.forEach((r) => upsertRow('advanceRecoveries', r as never).catch(() => {}));

    const updatedAdvances = data.employeeAdvances.map((a) => {
      const r = newRecoveries.find((x) => x.advanceId === a.id);
      if (!r) return a;
      const newRecovered = a.recoveredAmount + r.amount;
      const newRemaining = Math.max(0, a.amount - newRecovered);
      return {
        ...a,
        recoveredAmount: newRecovered,
        remainingBalance: newRemaining,
        status: computeAdvanceStatus(newRecovered, a.amount),
      };
    });
    update('employeeAdvances', updatedAdvances);
    updatedAdvances.forEach((a) => upsertRow('employeeAdvances', a as never).catch(() => {}));

    toast(`Recovered ${LKR(totalDeduction)} from advances`, 'success');
    setConfirm(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Recover Advance / අත්තිකාරම් කුණු කිරීම" size="md" footer={<>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button onClick={() => setConfirm(true)}>Record Recovery</Button>
    </>}>
      <div className="space-y-3">
        <Select label="Worker * / සේවකයා" value={workerId} onChange={(e) => { setWorkerId(e.target.value); setRecoveries([]); }}>
          <option value="">— Select worker —</option>
          {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
        <Select label="Recover From / කුණු කරන්නේ" value={source} onChange={(e) => { setSource(e.target.value as 'DAILY' | 'MONTHLY'); setRecoveries([]); }}>
          <option value="DAILY">Daily Payment</option>
          <option value="MONTHLY">Monthly Salary</option>
        </Select>

        {workerId && eligible.length === 0 && (
          <div className="p-3 rounded-xl bg-neutral-50 text-sm text-neutral-500">
            No outstanding advances eligible for recovery from {source === 'MONTHLY' ? 'monthly salary' : 'daily payments'}.
          </div>
        )}

        {eligible.map((adv) => {
          const current = recoveries.find((r) => r.advanceId === adv.id);
          return (
            <div key={adv.id} className="p-3 rounded-xl border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-600 text-sm">{adv.reference || adv.id}</div>
                  <div className="text-xs text-neutral-500">Outstanding: {LKR(adv.remainingBalance)} · Given: {fmtDate(adv.advanceDate)}</div>
                </div>
              </div>
              <Input
                label=""
                type="number"
                value={current?.amount || 0}
                onChange={(e) => updateRecovery(adv.id, +e.target.value)}
                placeholder={`Max: ${LKR(adv.remainingBalance)}`}
              />
            </div>
          );
        })}

        {totalDeduction > 0 && (
          <div className="p-3 rounded-xl bg-error-50 text-sm">
            Total to recover: <strong className="text-error-700">{LKR(totalDeduction)}</strong>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doSave}
        title="Confirm recovery?"
        message={`Recover ${LKR(totalDeduction)} from ${worker?.name}'s advances?`}
        confirmLabel="Yes, Recover"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}

// ─── Payments Tab ───

export function PaymentsTab() {
  const { data } = useStore();
  const [filterWorker, setFilterWorker] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const payments = data.salaryPayments.filter((p) => {
    if (filterWorker && p.workerId !== filterWorker) return false;
    if (filterMonth && !p.payMonth.startsWith(filterMonth)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle
          title="Salary Payment History"
          subtitle="All salary payments with separate work date and payment date"
          icon={<History size={18} />}
          action={
            <div className="flex gap-2 items-end">
              <Select label="" value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)} className="w-44">
                <option value="">All workers</option>
                {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
              <Input label="" type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-36" />
            </div>
          }
        />
        {payments.length === 0 ? (
          <div className="text-neutral-400 text-sm py-8 text-center">No salary payments recorded yet. Payments are created from the Month-End Settlement tab.</div>
        ) : (
          <DataTable
            rows={payments}
            columns={[
              { key: 'worker', header: 'Worker', render: (p: SalaryPayment) => { const w = data.workers.find((x) => x.id === p.workerId); return w ? <div><div className="font-600">{w.name}</div><div className="text-xs text-neutral-500">{w.role}</div></div> : p.workerId; } },
              { key: 'type', header: 'Type', render: (p: SalaryPayment) => p.salaryType === 'MONTHLY' ? <Badge tone="blue">Monthly</Badge> : <Badge tone="yellow">Daily</Badge> },
              { key: 'workDate', header: 'Work Date', render: (p: SalaryPayment) => fmtDate(p.workDate) },
              { key: 'payDate', header: 'Payment Date', render: (p: SalaryPayment) => fmtDate(p.paymentDate) },
              { key: 'gross', header: 'Gross', align: 'right', render: (p: SalaryPayment) => LKR(p.grossAmount) },
              { key: 'allow', header: 'Allowances', align: 'right', render: (p: SalaryPayment) => p.allowances > 0 ? LKR(p.allowances) : '—' },
              { key: 'advDed', header: 'Advance Ded.', align: 'right', render: (p: SalaryPayment) => p.advanceDeduction > 0 ? <span className="text-error-700">{LKR(p.advanceDeduction)}</span> : '—' },
              { key: 'otherDed', header: 'Other Ded.', align: 'right', render: (p: SalaryPayment) => p.otherDeductions > 0 ? <span className="text-error-700">{LKR(p.otherDeductions)}</span> : '—' },
              { key: 'net', header: 'Net Paid', align: 'right', render: (p: SalaryPayment) => <span className="font-700 text-success-700">{LKR(p.netAmount)}</span> },
              { key: 'method', header: 'Method', render: (p: SalaryPayment) => p.paymentMethod },
              { key: 'ref', header: 'Ref', render: (p: SalaryPayment) => p.reference || '—' },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
