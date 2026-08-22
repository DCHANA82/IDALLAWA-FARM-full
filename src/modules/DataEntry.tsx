import { useState } from 'react';
import { Sprout, Users, Wheat, Send, CheckCircle2, Shield, Lock } from 'lucide-react';
import { useStore, newId } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { LKR, todayISO } from '@/lib/format';
import { Card, Button, SectionTitle, Input, Select, Badge, EmptyState } from '@/components/ui';
import { DynamicSelect } from '@/components/DynamicSelect';
import { DataTable, StatusBadge } from '@/components/DataTable';
import type { Worker, NurseryBatch } from '@/lib/types';
import { UI_TEXT } from '@/lib/translations';

type FormTab = 'nursery' | 'labor' | 'crops';

export function DataEntryModule() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<FormTab>('nursery');
  const [recentCount, setRecentCount] = useState(0);
  const [submitted, setSubmitted] = useState<{ tab: FormTab; msg: string } | null>(null);

  const tabs: { key: FormTab; label: string; icon: React.ReactNode }[] = [
    { key: 'nursery', label: UI_TEXT.Nursery, icon: <Sprout size={16} /> },
    { key: 'labor', label: UI_TEXT.Labor, icon: <Users size={16} /> },
    { key: 'crops', label: UI_TEXT.Crops, icon: <Wheat size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-600 text-neutral-500 uppercase tracking-wide">{UI_TEXT.YourRole}</span>
            {isAdmin ? <Shield size={16} className="text-primary-600" /> : <Lock size={16} className="text-secondary-600" />}
          </div>
          <div className="mt-2 font-display text-lg font-800 text-neutral-900">{isAdmin ? UI_TEXT.Administrator : UI_TEXT.DataEntryOperator}</div>
          <div className="mt-1 text-xs text-neutral-500">{isAdmin ? UI_TEXT.FullAccess : UI_TEXT.SubmitDataOnly}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-600 text-neutral-500 uppercase tracking-wide">{UI_TEXT.EntriesSubmitted}</span>
            <CheckCircle2 size={16} className="text-success-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-800 text-neutral-900">{recentCount}</div>
          <div className="mt-1 text-xs text-neutral-500">{UI_TEXT.ThisSession}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-600 text-neutral-500 uppercase tracking-wide">{UI_TEXT.Status}</span>
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          </div>
          <div className="mt-2 font-display text-lg font-800 text-success-700">{UI_TEXT.ReadyStatus}</div>
          <div className="mt-1 text-xs text-neutral-500">{UI_TEXT.AllFormsOperational}</div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-100 rounded-xl w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-600 inline-flex items-center gap-2 transition ${tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {submitted && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-success-50 border border-success-200 animate-slide-up">
          <CheckCircle2 size={20} className="text-success-600 shrink-0" />
          <div>
            <div className="font-600 text-sm text-success-800">{submitted.msg}</div>
            <div className="text-xs text-success-600">{UI_TEXT.RecordSubmittedSaved}</div>
          </div>
          <button onClick={() => setSubmitted(null)} className="ml-auto text-success-600 hover:text-success-800 text-sm font-600">{UI_TEXT.Dismiss}</button>
        </div>
      )}

      {tab === 'nursery' && <NurseryForm onSubmit={(msg) => { setSubmitted({ tab: 'nursery', msg }); setRecentCount((c) => c + 1); }} />}
      {tab === 'labor' && <LaborForm onSubmit={(msg) => { setSubmitted({ tab: 'labor', msg }); setRecentCount((c) => c + 1); }} />}
      {tab === 'crops' && <CropsForm onSubmit={(msg) => { setSubmitted({ tab: 'crops', msg }); setRecentCount((c) => c + 1); }} />}
    </div>
  );
}

function NurseryForm({ onSubmit }: { onSubmit: (msg: string) => void }) {
  const { data, settings, save, nextBatchCode } = useStore();
  const [f, setF] = useState({
    variety: '',
    category: 'Seasonal Seedling' as 'Seasonal Seedling' | 'Perennial Planting Material',
    unitType: 'tray',
    qtyUnits: 100,
    unitCost: 100,
    startDate: todayISO(),
    status: 'Growing' as NurseryBatch['status'],
  });

  const saveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const batch: NurseryBatch = {
      id: newId('nb'),
      code: nextBatchCode(),
      variety: f.variety,
      category: f.category,
      startDate: f.startDate,
      qtyUnits: f.qtyUnits,
      unitType: f.unitType,
      unitCost: f.unitCost,
      status: f.status,
    };
    save('nurseryBatches', batch, 'Nursery batch submitted');
    onSubmit(`Nursery batch ${batch.code} (${batch.variety}) submitted.`);
    setF({ ...f, variety: '' });
  };

  return (
    <Card className="p-5">
      <SectionTitle title={UI_TEXT.NurseryBatchEntry} subtitle={UI_TEXT.RegisterNewBatch} icon={<Sprout size={18} />} />
      <form onSubmit={saveForm} className="grid sm:grid-cols-2 gap-3">
        <Input label={UI_TEXT.Variety} value={f.variety} onChange={(e) => setF({ ...f, variety: e.target.value })} placeholder="e.g. Capsicum Red Calif." required />
        <Select label={UI_TEXT.BatchCategory} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as 'Seasonal Seedling' | 'Perennial Planting Material' })}>
          <option>Seasonal Seedling</option><option>Perennial Planting Material</option>
        </Select>
        <Input label={UI_TEXT.StartDate} type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} required />
        <Select label={UI_TEXT.UnitType} value={f.unitType} onChange={(e) => setF({ ...f, unitType: e.target.value })}>
          {['tray', 'polybag', 'sucker', 'sapling'].map((u) => <option key={u}>{u}</option>)}
        </Select>
        <Input label={UI_TEXT.QtyUnits} type="number" value={f.qtyUnits} onChange={(e) => setF({ ...f, qtyUnits: +e.target.value })} required />
        <Input label={UI_TEXT.UnitCostRs} type="number" value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: +e.target.value })} required />
        <Select label={UI_TEXT.Status} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as NurseryBatch['status'] })}>
          {['Growing', 'Ready', 'Sold Out', 'Transferred'].map((s) => <option key={s}>{s}</option>)}
        </Select>
        <div className="flex items-end">
          <div className="w-full p-3 rounded-xl bg-primary-50 text-sm">{UI_TEXT.BatchValue}: <strong className="text-primary-700">{LKR(f.qtyUnits * f.unitCost)}</strong></div>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
          <Button type="reset" variant="ghost" onClick={() => setF({ ...f, variety: '' })}>{UI_TEXT.Clear}</Button>
          <Button type="submit" icon={<Send size={14} />}>{UI_TEXT.SubmitBatch}</Button>
        </div>
      </form>

      <div className="mt-6 pt-4 border-t border-neutral-100">
        <div className="text-xs font-600 text-neutral-500 mb-2">{UI_TEXT.RecentlySubmittedBatches}</div>
        {data.nurseryBatches.length > 0 ? (
          <DataTable
            rows={data.nurseryBatches.slice(0, 3)}
            dense
            columns={[
              { key: 'code', header: UI_TEXT.Code, render: (b) => <span className="font-mono font-700 text-primary-700">{b.code}</span> },
              { key: 'variety', header: UI_TEXT.Variety, render: (b) => b.variety },
              { key: 'qty', header: UI_TEXT.Quantity, align: 'right', render: (b) => `${b.qtyUnits} ${b.unitType}` },
              { key: 'status', header: UI_TEXT.Status, render: (b) => <StatusBadge status={b.status} /> },
            ]}
          />
        ) : <EmptyState title={UI_TEXT.NoBatchesYet} />}
      </div>
    </Card>
  );
}

function LaborForm({ onSubmit }: { onSubmit: (msg: string) => void }) {
  const { data, save } = useStore();
  const [f, setF] = useState({
    workerId: data.workers[0]?.id || '',
    date: todayISO(),
    status: 'Present' as 'Present' | 'Absent' | 'Half Day',
    taskPlot: '',
    hours: 8,
  });

  const selectedWorker = data.workers.find((w) => w.id === f.workerId);
  const computeAmount = (): number => {
    if (!selectedWorker || f.status === 'Absent') return 0;
    const hrs = f.status === 'Half Day' ? Math.min(f.hours, 4) : f.hours;
    return selectedWorker.type === 'Casual' ? Math.round(selectedWorker.dailyWage * (hrs / 8)) : 0;
  };

  const saveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const att = {
      id: newId('at'),
      workerId: f.workerId,
      date: f.date,
      status: f.status,
      taskPlot: f.taskPlot,
      hours: f.status === 'Absent' ? 0 : f.hours,
      amount: computeAmount(),
    };
    save('attendance', att, 'Attendance submitted');
    const w = data.workers.find((x) => x.id === f.workerId);
    onSubmit(`Attendance for ${w?.name || 'worker'} on ${f.date} submitted.`);
  };

  return (
    <Card className="p-5">
      <SectionTitle title={UI_TEXT.LaborAttendanceEntry} subtitle={UI_TEXT.LogDailyAttendance} icon={<Users size={18} />} />
      <form onSubmit={saveForm} className="grid sm:grid-cols-2 gap-3">
        <Select label={UI_TEXT.Worker} value={f.workerId} onChange={(e) => setF({ ...f, workerId: e.target.value })} required>
          {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.type}</option>)}
        </Select>
        <Input label={UI_TEXT.Date} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
        <Select label={UI_TEXT.Status} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as 'Present' | 'Absent' | 'Half Day' })}>
          <option>Present</option><option>Absent</option><option>Half Day</option>
        </Select>
        <Input label={UI_TEXT.TaskPlot} value={f.taskPlot} onChange={(e) => setF({ ...f, taskPlot: e.target.value })} placeholder="Plot A1 / Nursery / Harvest" />
        <Input label={UI_TEXT.Hours} type="number" value={f.hours} onChange={(e) => setF({ ...f, hours: +e.target.value })} disabled={f.status === 'Absent'} />
        <div className="flex items-end">
          <div className="w-full p-3 rounded-xl bg-primary-50 text-sm">
            {selectedWorker?.type === 'Casual' ? <>{UI_TEXT.ComputedPayout}: <strong className="text-primary-700">{LKR(computeAmount())}</strong></> : <>{UI_TEXT.PermanentStaffNoPayout}</>}
          </div>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
          <Button type="reset" variant="ghost">{UI_TEXT.Clear}</Button>
          <Button type="submit" icon={<Send size={14} />}>{UI_TEXT.SubmitAttendance}</Button>
        </div>
      </form>
    </Card>
  );
}

function CropsForm({ onSubmit }: { onSubmit: (msg: string) => void }) {
  const { data, save } = useStore();
  const [f, setF] = useState({
    cropId: data.crops[0]?.id || '',
    date: todayISO(),
    category: '',
    description: '',
    amount: 0,
  });

  const saveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const exp = {
      id: newId('ce'),
      cropId: f.cropId,
      date: f.date,
      category: f.category,
      description: f.description,
      amount: f.amount,
    };
    save('cropExpenses', exp, 'Crop expense submitted');
    const c = data.crops.find((x) => x.id === f.cropId);
    onSubmit(`Crop expense for ${c?.name || 'crop'} — ${f.category} (${LKR(f.amount)}) submitted.`);
    setF({ ...f, description: '', amount: 0 });
  };

  return (
    <Card className="p-5">
      <SectionTitle title={UI_TEXT.CropExpenseEntry} subtitle={UI_TEXT.LogFieldInputs} icon={<Wheat size={18} />} />
      <form onSubmit={saveForm} className="grid sm:grid-cols-2 gap-3">
        <Select label={UI_TEXT.CropPlot} value={f.cropId} onChange={(e) => setF({ ...f, cropId: e.target.value })} required>
          {data.crops.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.plot}</option>)}
        </Select>
        <Input label={UI_TEXT.Date} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
        <DynamicSelect label={UI_TEXT.Category} moduleName="crop_experience" value={f.category} onChange={(v) => setF({ ...f, category: v })} required />
        <Input label={UI_TEXT.AmountRs} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} required />
        <div className="sm:col-span-2"><Input label={UI_TEXT.Description} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. Basal NPK + top dress" required /></div>
        <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
          <Button type="reset" variant="ghost">{UI_TEXT.Clear}</Button>
          <Button type="submit" icon={<Send size={14} />}>{UI_TEXT.SubmitExpense}</Button>
        </div>
      </form>
    </Card>
  );
}
