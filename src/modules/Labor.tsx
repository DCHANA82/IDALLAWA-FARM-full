import { useState } from 'react';
import { Plus, Users, Printer, CalendarDays, Wallet, Download, Pencil, Trash2 } from 'lucide-react';
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
import type { Worker, Attendance } from '@/lib/types';
import { UI_TEXT } from '@/lib/translations';

type Tab = 'workers' | 'attendance' | 'vouchers';

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
        <Stat label={UI_TEXT.PermanentStaff} value={String(permanent.length)} sub={`Salaries ${LKR(permanent.reduce((s, w) => s + w.monthlyBasic + w.allowances, 0))}/mo`} tone="blue" icon={<Users size={18} />} />
        <Stat label={UI_TEXT.CasualWorkers} value={String(casual.length)} sub={`Avg wage ${LKR(Math.round(casual.reduce((s, w) => s + w.dailyWage, 0) / (casual.length || 1)))}/day`} tone="yellow" icon={<Users size={18} />} />
        <Stat label={`Payroll ${payMonth}`} value={LKR(pay.total)} sub={`Perm ${LKR(pay.permanent)} · Casual ${LKR(pay.casual)}`} tone="green" icon={<Wallet size={18} />} />
        <Stat label={UI_TEXT.AttendanceEntries} value={String(data.attendance.length)} sub="All-time records" tone="neutral" icon={<CalendarDays size={18} />} />
      </div>

      <TabBar
        tabs={[
          { key: 'workers' as Tab, label: UI_TEXT.Workers },
          { key: 'attendance' as Tab, label: UI_TEXT.AttendanceTasks },
          { key: 'vouchers' as Tab, label: UI_TEXT.PaymentVouchers },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'workers' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.Workers} subtitle="Permanent staff & daily casual workers (ස්ථිර ශ්‍රමිකයින් හා දෛනික තාවකාලික ශ්‍රමිකයින්)" icon={<Users size={18} />}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => downloadFile('workers.csv', toCSV(data.workers as unknown as Record<string, unknown>[]), 'text/csv;charset=utf-8;')}>{UI_TEXT.Export}</Button>
              {isAdmin && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'worker' })}>{UI_TEXT.AddWorker}</Button>}
            </div>} />
          <DataTable
            rows={data.workers}
            onRowClick={(w) => isAdmin && setModal({ kind: 'worker', edit: w })}
            onEdit={(w) => setModal({ kind: 'worker', edit: w })}
            onDelete={(w) => setConfirmDelete({ kind: 'workers', id: w.id, name: w.name })}
            canEdit={isAdmin}
            columns={[
              { key: 'name', header: UI_TEXT.Name, render: (w) => <div><div className="font-600">{w.name}</div><div className="text-xs text-neutral-500">{w.phone || '—'}</div></div> },
              { key: 'role', header: UI_TEXT.Role, render: (w) => w.role },
              { key: 'type', header: UI_TEXT.Type, render: (w) => <Badge tone={w.type === 'Permanent' ? 'blue' : 'yellow'}>{w.type}</Badge> },
              { key: 'pay', header: UI_TEXT.PayBasis, align: 'right', render: (w) => w.type === 'Permanent' ? <span>Basic {LKR(w.monthlyBasic)} + {LKR(w.allowances)}</span> : <span>{LKR(w.dailyWage)}/day</span>, restricted: true },
              { key: 'month', header: `Payout ${payMonth}`, align: 'right', render: (w) => <span className="font-700 text-primary-700">{LKR(workerPayout(data, w, payMonth))}</span>, restricted: true },
            ]}
          />
        </Card>
      )}

      {tab === 'attendance' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.AttendanceTaskAllocation} subtitle="Daily attendance per field plot / nursery (කුඹුර කොටස / නර්සරි අනුව දෛනික අතිරික්ෂිත)" icon={<CalendarDays size={18} />}
            action={isAdmin && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'attendance' })}>{UI_TEXT.AddEntry}</Button>} />
          <DataTable
            rows={data.attendance}
            onRowClick={(a) => isAdmin && setModal({ kind: 'attendance', edit: a })}
            onEdit={(a) => setModal({ kind: 'attendance', edit: a })}
            onDelete={(a) => { const w = data.workers.find((x) => x.id === a.workerId); setConfirmDelete({ kind: 'attendance', id: a.id, name: w ? w.name : 'this record' }); }}
            canEdit={isAdmin}
            columns={[
              { key: 'date', header: UI_TEXT.Date, render: (a) => fmtDate(a.date) },
              { key: 'worker', header: UI_TEXT.Worker, render: (a) => { const w = data.workers.find((x) => x.id === a.workerId); return w ? <div><div className="font-600">{w.name}</div><div className="text-xs text-neutral-500">{w.role}</div></div> : a.workerId; } },
              { key: 'status', header: UI_TEXT.Status, render: (a) => <StatusBadge status={a.status} /> },
              { key: 'plot', header: UI_TEXT.TaskPlot, render: (a) => a.taskPlot || '—' },
              { key: 'hours', header: UI_TEXT.Hours, align: 'right', render: (a) => a.hours },
              { key: 'amount', header: UI_TEXT.Amount, align: 'right', render: (a) => <span className="font-700">{LKR(a.amount)}</span>, restricted: true },
            ]}
          />
        </Card>
      )}

      {tab === 'vouchers' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.PaymentVouchers} subtitle="Instant payout vouchers per worker or labor group (ශ්‍රමිකයා හෝ ශ්‍රම සමූහය අනුව ක්ෂණික ගෙවීම් වවුචර)" icon={<Printer size={18} />}
            action={isAdmin && <Button size="sm" icon={<Plus size={14} />} onClick={() => generatePayrollVoucher()}>{UI_TEXT.GeneratePayrollVoucher}</Button>} />
          <DataTable
            rows={data.vouchers.filter((v) => v.kind === 'Payroll')}
            columns={[
              { key: 'no', header: UI_TEXT.VoucherNo, render: (v) => <span className="font-mono font-700 text-primary-700">{v.voucherNo}</span> },
              { key: 'date', header: UI_TEXT.Date, render: (v) => fmtDate(v.date) },
              { key: 'party', header: UI_TEXT.Party, render: (v) => v.party },
              { key: 'desc', header: UI_TEXT.Description, render: (v) => v.description },
              { key: 'amount', header: UI_TEXT.Amount, align: 'right', render: (v) => <span className="font-700 text-success-700">{LKR(v.amount)}</span>, restricted: true },
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
        title={UI_TEXT.DeleteItem}
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmLabel={UI_TEXT.YesDelete}
        cancelLabel={UI_TEXT.Cancel}
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
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditWorker : UI_TEXT.AddWorker} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label={UI_TEXT.Name + ' *'} value={f.name} error={errors.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label={UI_TEXT.Phone} value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <DynamicSelect label={UI_TEXT.Role + ' *'} moduleName="worker_role" value={f.role} onChange={(v) => setF({ ...f, role: v })} placeholder="Select or add role" />
        <Select label={UI_TEXT.Type} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as 'Permanent' | 'Casual' })}>
          <option value="Casual">{UI_TEXT.Casual}</option><option value="Permanent">{UI_TEXT.Permanent}</option>
        </Select>
        {f.type === 'Permanent' ? (
          <>
            <Input label={UI_TEXT.MonthlyBasic} type="number" value={f.monthlyBasic} onChange={(e) => setF({ ...f, monthlyBasic: +e.target.value })} />
            <Input label={UI_TEXT.Allowances} type="number" value={f.allowances} onChange={(e) => setF({ ...f, allowances: +e.target.value })} />
          </>
        ) : (
          <Input label={UI_TEXT.DailyWage} type="number" value={f.dailyWage} onChange={(e) => setF({ ...f, dailyWage: +e.target.value })} />
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>{UI_TEXT.Cancel}</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{UI_TEXT.Save}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title={UI_TEXT.SaveEntry}
        message={UI_TEXT.SaveWorker}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}

function AttendanceModal({ edit, onClose }: { edit?: Attendance; onClose: () => void }) {
  const { data, save } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<Attendance>(edit || { id: newId('at'), workerId: data.workers[0]?.id || '', date: todayISO(), status: 'Present', taskPlot: '', hours: 8, amount: 0 });
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
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Please fill in all required fields: Worker, Date', 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    const final = recompute(f);
    save('attendance', final, edit ? 'Attendance updated' : 'Attendance added');
    setConfirmSave(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditAttendance : UI_TEXT.AddAttendance} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label={UI_TEXT.Worker + ' *'} value={f.workerId} error={errors.workerId} onChange={(e) => setF({ ...f, workerId: e.target.value })}>
          {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.type}</option>)}
        </Select>
        <Input label={UI_TEXT.Date + ' *'} type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Select label={UI_TEXT.Status} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Attendance['status'] })}>
          <option value="Present">{UI_TEXT.Present}</option><option value="Absent">{UI_TEXT.Absent}</option><option value="Half Day">{UI_TEXT.HalfDay}</option>
        </Select>
        <Input label={UI_TEXT.TaskPlot} value={f.taskPlot || ''} onChange={(e) => setF({ ...f, taskPlot: e.target.value })} placeholder="Plot A1 / Nursery / Harvest" />
        <Input label={UI_TEXT.Hours} type="number" value={f.hours} onChange={(e) => setF({ ...f, hours: +e.target.value })} />
        <div className="flex items-end"><div className="w-full p-3 rounded-xl bg-primary-50 text-sm">{UI_TEXT.ComputedPayout}: <strong className="text-primary-700">{LKR(recompute(f).amount)}</strong></div></div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>{UI_TEXT.Cancel}</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{UI_TEXT.Save}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title={UI_TEXT.SaveEntry}
        message={UI_TEXT.SaveAttendance}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}
