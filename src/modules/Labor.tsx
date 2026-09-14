import { useState } from 'react';
import { Plus, Users, Printer, CalendarDays, Wallet, Download, Sprout, Hammer, Pencil, Trash2 } from 'lucide-react';
import { useStore, newId, upsertRow } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { LKR, fmtDate, todayISO, downloadFile, toCSV } from '@/lib/format';
import { workerPayout, payrollMonthTotals } from '@/lib/calc';
import { Card, Button, Badge, SectionTitle, Stat, Modal, Input, Select, ConfirmDialog } from '@/components/ui';
import { DynamicSelect } from '@/components/DynamicSelect';
import { DataTable, StatusBadge } from '@/components/DataTable';
import { TabBar } from '@/components/TabBar';
import { printContent, VoucherPrint } from '@/components/print';
import { useToast } from '@/components/toast';
import type { Worker, Attendance, ExpenseAllocation, AllocationType, CropExpense, Expense } from '@/lib/types';

type Tab = 'workers' | 'attendance' | 'vouchers';

const DEVELOPMENT_CATEGORIES = ['Land Preparation', 'Fencing', 'Infrastructure', 'Irrigation', 'Machinery', 'Structures', 'Other'];

export function LaborModule() {
  const { data, save, remove, update, nextVoucherNo } = useStore();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('workers');
  const [modal, setModal] = useState<null | { kind: 'worker' | 'attendance'; edit?: Worker | Attendance }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: 'workers' | 'attendance'; id: string; name: string }>(null);
  const monthISO = new Date().toISOString().slice(0, 7);
  const [payMonth] = useState(monthISO);
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
              { key: 'hours', header: 'Hours', align: 'right', render: (a) => a.hours },
              { key: 'amount', header: 'Amount', align: 'right', render: (a) => <span className="font-700">{LKR(a.amount)}</span>, restricted: true },
            ]}
          />
        </Card>
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
  const [f, setF] = useState<Worker>(edit || { id: newId('wk'), name: '', type: 'Casual', phone: '', role: '', monthlyBasic: 0, allowances: 0, dailyWage: 1800 });
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
    save('workers', f, edit ? 'Worker updated' : 'Worker added');
    setConfirmSave(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={edit ? 'Edit worker' : 'Add worker'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Name *" value={f.name} error={errors.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Phone" value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <DynamicSelect label="Role *" moduleName="worker_role" value={f.role} onChange={(v) => setF({ ...f, role: v })} placeholder="Select or add role" />
        <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as 'Permanent' | 'Casual' })}>
          <option>Casual</option><option>Permanent</option>
        </Select>
        {f.type === 'Permanent' ? (
          <>
            <Input label="Monthly basic (Rs.)" type="number" value={f.monthlyBasic} onChange={(e) => setF({ ...f, monthlyBasic: +e.target.value })} />
            <Input label="Allowances (Rs.)" type="number" value={f.allowances} onChange={(e) => setF({ ...f, allowances: +e.target.value })} />
          </>
        ) : (
          <Input label="Daily wage (Rs.)" type="number" value={f.dailyWage} onChange={(e) => setF({ ...f, dailyWage: +e.target.value })} />
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>Save</Button>
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
  const [f, setF] = useState<Attendance>(edit || { id: newId('at'), workerId: data.workers[0]?.id || '', date: todayISO(), status: 'Present', taskPlot: '', hours: 8, amount: 0 });
  const [allocType, setAllocType] = useState<AllocationType | ''>(edit?.expenseAllocation?.allocationType || '');
  const [cropId, setCropId] = useState<string>(edit?.expenseAllocation?.cropId || '');
  const [plotId, setPlotId] = useState<string>(edit?.expenseAllocation?.plotId || '');
  const [devCategory, setDevCategory] = useState<string>(edit?.expenseAllocation?.developmentCategory || '');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const recompute = (next: Attendance): Attendance => {
    const w = data.workers.find((x) => x.id === next.workerId);
    if (!w) return next;
    if (next.status === 'Absent') return { ...next, hours: 0, amount: 0 };
    const hrs = next.hours;
    const amount = w.type === 'Casual' ? Math.round(w.dailyWage * (hrs / 8)) : 0;
    return { ...next, amount };
  };

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.workerId) e.workerId = true;
    if (!f.date) e.date = true;
    if (allocType === 'CROP' && !cropId) e.cropId = true;
    if (allocType === 'FARM_DEVELOPMENT' && !devCategory) e.devCategory = true;
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
      return { allocationType: 'CROP', cropId, plotId: plotId || cropId };
    }
    return { allocationType: 'FARM_DEVELOPMENT', developmentCategory: devCategory };
  };

  const doSave = () => {
    const allocation = buildAllocation();
    const final = recompute({ ...f, expenseAllocation: allocation });
    save('attendance', final, edit ? 'Attendance updated' : 'Attendance added');

    // Auto-sync: only for new entries with a positive payout and an allocation
    if (!edit && final.amount > 0 && allocation) {
      const worker = data.workers.find((w) => w.id === final.workerId);
      const workerName = worker?.name || 'Worker';

      if (allocation.allocationType === 'CROP') {
        // Sync to Crop Expenses (appears in Crops P&L)
        const crop = data.crops.find((c) => c.id === allocation.cropId);
        const ce: CropExpense = {
          id: newId('ce'),
          cropId: allocation.cropId!,
          date: final.date,
          category: 'Labor',
          description: `Labor — ${workerName} (${final.hours}h)`,
          amount: final.amount,
        };
        update('cropExpenses', [ce, ...data.cropExpenses]);
        upsertRow('cropExpenses', ce as never).catch(() => {});

        // Also create a voucher for the labor payment
        const v = {
          id: newId('vo'),
          voucherNo: nextVoucherNo(),
          date: final.date,
          kind: 'Payment' as const,
          party: workerName,
          description: `Labor — ${crop?.name || 'Crop'} (${final.hours}h)`,
          amount: final.amount,
          reference: `LABOR-${final.id}`,
        };
        update('vouchers', [v, ...data.vouchers]);
        upsertRow('vouchers', v as never).catch(() => {});
      } else {
        // Sync to Finance Expense Log as Farm Development
        const exp: Expense = {
          id: newId('ex'),
          date: final.date,
          class: 'Seasonal Crop',
          category: allocation.developmentCategory || 'Farm Development',
          description: `Labor — ${workerName} (${final.hours}h) — Farm Development`,
          amount: final.amount,
          reference: `LABOR-${final.id}`,
        };
        update('expenses', [exp, ...data.expenses]);
        upsertRow('expenses', exp as never).catch(() => {});

        const v = {
          id: newId('vo'),
          voucherNo: nextVoucherNo(),
          date: final.date,
          kind: 'Payment' as const,
          party: workerName,
          description: `Labor — ${allocation.developmentCategory || 'Farm Dev'} (${final.hours}h)`,
          amount: final.amount,
          reference: `LABOR-${final.id}`,
        };
        update('vouchers', [v, ...data.vouchers]);
        upsertRow('vouchers', v as never).catch(() => {});
      }
    }

    setConfirmSave(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={edit ? 'Edit attendance' : 'Mark Attendance / Add Daily Work'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Worker *" value={f.workerId} error={errors.workerId} onChange={(e) => setF({ ...f, workerId: e.target.value })}>
          {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.type}</option>)}
        </Select>
        <Input label="Date *" type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Attendance['status'] })}>
          <option>Present</option><option>Absent</option><option>Half Day</option>
        </Select>
        <Input label="Task / Plot" value={f.taskPlot || ''} onChange={(e) => setF({ ...f, taskPlot: e.target.value })} placeholder="Plot A1 / Nursery / Harvest" />
        <Input label="Hours" type="number" value={f.hours} onChange={(e) => setF({ ...f, hours: +e.target.value })} />
        <div className="flex items-end"><div className="w-full p-3 rounded-xl bg-primary-50 text-sm">Computed payout: <strong className="text-primary-700">{LKR(recompute(f).amount)}</strong></div></div>
      </div>

      {/* Expense Allocation Section */}
      <div className="mt-5 pt-4 border-t border-neutral-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-primary-600" />
          <h4 className="font-display text-sm font-700 text-neutral-900">Expense Allocation</h4>
          <span className="text-xs text-neutral-500">වියදම් වර්ගය</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label="Allocation Type (වියදම් වර්ගය) *"
            value={allocType}
            onChange={(e) => { setAllocType(e.target.value as AllocationType | ''); setCropId(''); setPlotId(''); setDevCategory(''); }}
          >
            <option value="">— Select allocation —</option>
            <option value="CROP">Crop Specific (වගා සෘජු වියදම්)</option>
            <option value="FARM_DEVELOPMENT">Farm Development (ගොවිපල සංවර්ධන)</option>
          </Select>

          {allocType === 'CROP' && (
            <>
              <Select label="Crop (බෝගය) *" value={cropId} error={errors.cropId} onChange={(e) => { setCropId(e.target.value); const c = data.crops.find((x) => x.id === e.target.value); setPlotId(c?.plot || ''); }}>
                <option value="">— Select crop —</option>
                {data.crops.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.plot}</option>)}
              </Select>
              <Select label="Plot (කොටස)" value={plotId} onChange={(e) => setPlotId(e.target.value)}>
                <option value="">— Select plot —</option>
                {data.crops.map((c) => <option key={c.id} value={c.plot}>{c.plot}</option>)}
              </Select>
            </>
          )}

          {allocType === 'FARM_DEVELOPMENT' && (
            <Select label="Development Category (සංවර්ධන වර්ගය) *" value={devCategory} error={errors.devCategory} onChange={(e) => setDevCategory(e.target.value)}>
              <option value="">— Select category —</option>
              {DEVELOPMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
        </div>

        {allocType && (
          <div className="mt-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
            {allocType === 'CROP' ? (
              <>Wage will be added to the selected crop's <strong>Labor expense</strong> in Crop P&L and a payment voucher will be created.</>
            ) : (
              <>Wage will be logged as a <strong>Farm Development expense</strong> in the Finance Expense Log and a payment voucher will be created.</>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>Save</Button>
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
