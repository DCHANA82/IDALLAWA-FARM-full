import { useState } from 'react';
import { Plus, Wheat, TrendingUp, Download, Sprout, Scale } from 'lucide-react';
import { useStore, newId, upsertRow } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { LKR, fmtDate, todayISO } from '@/lib/format';
import { allCropPnL, seasonPnL, cropPnL } from '@/lib/calc';
import { Card, Button, Badge, SectionTitle, Stat, Modal, Input, Select, EmptyState, ConfirmDialog } from '@/components/ui';
import { DynamicSelect } from '@/components/DynamicSelect';
import { DataTable, StatusBadge } from '@/components/DataTable';
import { TabBar } from '@/components/TabBar';
import { exportCSV } from '@/lib/export';
import { useToast } from '@/components/toast';
import type { Crop, CropExpense, CropHarvest, PerennialStatus } from '@/lib/types';
import { UI_TEXT } from '@/lib/translations';

type Tab = 'crops' | 'expenses' | 'harvests' | 'pnl';

export function CropsModule() {
  const { data, settings, remove } = useStore();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('crops');
  const [modal, setModal] = useState<null | { kind: 'crop' | 'expense' | 'harvest'; edit?: Crop | CropExpense | CropHarvest }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { key: 'crops' | 'cropExpenses' | 'cropHarvests'; id: string; name: string }>(null);
  const [seasonFilter, setSeasonFilter] = useState<string>('All');

  const seasons = settings?.seasons || ['Yala', 'Maha'];
  const pnls = allCropPnL(data);
  const seasonalPnls = pnls.filter((p) => p.crop.type === 'Seasonal' && (seasonFilter === 'All' || p.crop.season === seasonFilter));
  const seasonStats = seasons.map((s) => ({ name: s, ...seasonPnL(data, s) }));

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.key, confirmDelete.id, 'Record deleted');
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {seasonStats.slice(0, 4).map((s) => (
          <Stat key={s.name} label={`${s.name} revenue`} value={LKR(s.revenue)} sub={`${s.revenue ? ((s.profit / s.revenue) * 100).toFixed(1) : 0}% margin`} tone="blue" icon={<TrendingUp size={18} />} />
        ))}
        {seasonStats.length === 0 && <Stat label="No seasons" value="—" sub="Configure in Settings" tone="neutral" icon={<TrendingUp size={18} />} />}
      </div>

      <TabBar
        tabs={[
          { key: 'crops' as Tab, label: UI_TEXT.CropPlots },
          { key: 'expenses' as Tab, label: UI_TEXT.CropExpenses },
          { key: 'harvests' as Tab, label: UI_TEXT.Harvests },
          { key: 'pnl' as Tab, label: UI_TEXT.PnLStatements },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'crops' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.CropPlots} subtitle="Seasonal & perennial crops (කන්න හා ස්ථිර බෝග)" icon={<Wheat size={18} />}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => exportCSV('crops.csv', data.crops as unknown as Record<string, unknown>[])}>Export</Button>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'crop' })}>{UI_TEXT.AddCrop}</Button>
            </div>} />
          <DataTable
            rows={data.crops}
            onRowClick={(c) => setModal({ kind: 'crop', edit: c })}
            onEdit={(c) => setModal({ kind: 'crop', edit: c })}
            onDelete={(c) => setConfirmDelete({ key: 'crops', id: c.id, name: c.name })}
            canEdit={isAdmin}
            columns={[
              { key: 'name', header: UI_TEXT.CropName, render: (c) => <div><div className="font-600">{c.name}</div><div className="text-xs text-neutral-500">{c.plot} · {c.areaAcres} ac</div></div> },
              { key: 'type', header: UI_TEXT.Type, render: (c) => <Badge tone={c.type === 'Perennial' ? 'blue' : 'green'}>{c.type}</Badge> },
              { key: 'season', header: UI_TEXT.Season, render: (c) => c.type === 'Seasonal' ? <Badge tone="yellow">{c.season}</Badge> : <Badge tone="blue">{c.perennialStatus || '—'}</Badge> },
              { key: 'planted', header: UI_TEXT.PlantedDate, render: (c) => fmtDate(c.plantedDate) },
              { key: 'status', header: UI_TEXT.Status, render: (c) => <StatusBadge status={c.status} /> },
              { key: 'profit', header: UI_TEXT.NetProfit, align: 'right', render: (c) => { const p = cropPnL(data, c.id); return <span className={p.profit >= 0 ? 'text-success-700 font-700' : 'text-error-700 font-700'}>{LKR(p.profit)}</span>; } },
            ]}
          />
        </Card>
      )}

      {tab === 'expenses' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.CropExpenses} subtitle="Field inputs: seeds, land prep, fertilizer, harvesting (කුඹුර ආදාන: බීජ, කුඹුර සැකසීම, පොහොර, අස්වැන්න)" icon={<Sprout size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'expense' })}>{UI_TEXT.AddExpense}</Button>} />
          <DataTable
            rows={data.cropExpenses}
            onRowClick={(e) => setModal({ kind: 'expense', edit: e })}
            onEdit={(e) => setModal({ kind: 'expense', edit: e })}
            onDelete={(e) => setConfirmDelete({ key: 'cropExpenses', id: e.id, name: e.description || e.category || 'this expense' })}
            canEdit={isAdmin}
            columns={[
              { key: 'date', header: UI_TEXT.Date, render: (e) => fmtDate(e.date) },
              { key: 'crop', header: 'Crop', render: (e) => { const c = data.crops.find((x) => x.id === e.cropId); return c ? `${c.name} · ${c.plot}` : e.cropId; } },
              { key: 'cat', header: UI_TEXT.Category, render: (e) => <Badge tone="gray">{e.category}</Badge> },
              { key: 'desc', header: UI_TEXT.Description, render: (e) => e.description },
              { key: 'amount', header: UI_TEXT.Amount, align: 'right', render: (e) => <span className="font-700">{LKR(e.amount)}</span> },
            ]}
          />
        </Card>
      )}

      {tab === 'harvests' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.HarvestRecords} subtitle="Sales to buyers / economic centres (ගැණුම්කරුවන්ට / ආර්ථික මධ්‍යස්ථාන වෙත විකුණුම්)" icon={<Scale size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'harvest' })}>{UI_TEXT.AddHarvest}</Button>} />
          <DataTable
            rows={data.cropHarvests}
            onRowClick={(h) => setModal({ kind: 'harvest', edit: h })}
            onEdit={(h) => setModal({ kind: 'harvest', edit: h })}
            onDelete={(h) => setConfirmDelete({ key: 'cropHarvests', id: h.id, name: `${h.buyer || 'harvest'}` })}
            canEdit={isAdmin}
            columns={[
              { key: 'date', header: UI_TEXT.Date, render: (h) => fmtDate(h.date) },
              { key: 'crop', header: 'Crop', render: (h) => { const c = data.crops.find((x) => x.id === h.cropId); return c ? c.name : h.cropId; } },
              { key: 'qty', header: UI_TEXT.QtyKg, align: 'right', render: (h) => h.quantityKg },
              { key: 'price', header: UI_TEXT.UnitPrice, align: 'right', render: (h) => LKR(h.unitPrice) },
              { key: 'buyer', header: UI_TEXT.Buyer, render: (h) => h.buyer },
              { key: 'total', header: UI_TEXT.Revenue, align: 'right', render: (h) => <span className="font-700 text-success-700">{LKR(h.quantityKg * h.unitPrice)}</span> },
            ]}
          />
        </Card>
      )}

      {tab === 'pnl' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 p-1 bg-neutral-100 rounded-xl">
              {['All', ...seasons].map((s) => (
                <button key={s} onClick={() => setSeasonFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-600 transition ${seasonFilter === s ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-600'}`}>{s}</button>
              ))}
            </div>
            <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => exportCSV('crop_pnl.csv', pnls.map((p) => ({ Crop: p.crop.name, Season: p.crop.season, Revenue: p.revenue, Cost: p.totalCost, Profit: p.profit, 'Margin %': p.margin.toFixed(1) })))}>Export P&L (අපනයනය)</Button>
          </div>

          {seasonalPnls.map((p) => (
            <Card key={p.crop.id} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-700">{p.crop.name[0]}</div>
                  <div>
                    <div className="font-display font-700 text-neutral-900">{p.crop.name}</div>
                    <div className="text-xs text-neutral-500">{p.crop.plot} · {p.crop.season} · {p.crop.areaAcres} acres</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-display text-xl font-800 ${p.profit >= 0 ? 'text-success-700' : 'text-error-700'}`}>{LKR(p.profit)}</div>
                  <div className="text-xs text-neutral-500">Margin {p.margin.toFixed(1)}%</div>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <MiniStat label={UI_TEXT.Revenue} value={LKR(p.revenue)} tone="green" />
                <MiniStat label={UI_TEXT.FieldExpenses} value={LKR(p.expenses)} />
                <MiniStat label={UI_TEXT.NurseryTransfer} value={LKR(p.transferredSeedlingCost)} />
                <MiniStat label={UI_TEXT.TotalCost} value={LKR(p.totalCost)} tone="red" />
                <MiniStat label={UI_TEXT.Harvest} value={`${p.harvestsKg} kg`} />
              </div>
            </Card>
          ))}
          {seasonalPnls.length === 0 && <EmptyState icon={<Wheat size={36} />} title="No seasonal crops for this filter (මෙම පෙරහන සඳහා කන්න බෝග නැත)" />}
        </div>
      )}

      {modal && (modal.kind === 'crop' ? <CropModal edit={modal.edit as Crop | undefined} onClose={() => setModal(null)} /> : modal.kind === 'expense' ? <ExpenseModal edit={modal.edit as CropExpense | undefined} onClose={() => setModal(null)} /> : <HarvestModal edit={modal.edit as CropHarvest | undefined} onClose={() => setModal(null)} />)}

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
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  return (
    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`font-700 mt-0.5 ${tone === 'green' ? 'text-success-700' : tone === 'red' ? 'text-error-700' : 'text-neutral-900'}`}>{value}</div>
    </div>
  );
}

function CropModal({ edit, onClose }: { edit?: Crop; onClose: () => void }) {
  const { data, settings, save } = useStore();
  const { toast } = useToast();
  const seasons = settings?.seasons || ['Yala', 'Maha'];
  const [f, setF] = useState<Crop & { year?: string }>(edit || { id: newId('cr'), name: '', type: 'Seasonal', season: seasons[0] || 'Yala', plot: '', areaAcres: 1, plantedDate: todayISO(), status: 'Active', notes: '' });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);
  const isPerennial = f.type === 'Perennial';

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.name.trim()) e.name = true;
    if (!f.plot.trim()) e.plot = true;
    if (!f.plantedDate) e.plantedDate = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast(`Please fill in all required fields: ${Object.keys(e).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`, 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    save('crops', f, edit ? 'Crop updated' : 'Crop added');
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditCrop : UI_TEXT.AddCrop} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <DynamicSelect label={UI_TEXT.CropName + ' *'} moduleName="crop_name" value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Select or add crop" />
        <Input label={UI_TEXT.Plot + ' *'} value={f.plot} error={errors.plot} onChange={(e) => setF({ ...f, plot: e.target.value })} />
        <Select label={UI_TEXT.CropType} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as 'Seasonal' | 'Perennial' })}>
          <option value="Seasonal">Seasonal Crop (කන්න බෝග)</option>
          <option value="Perennial">Permanent / Perennial Crop (ස්ථිර බෝග)</option>
        </Select>
        <Input label={UI_TEXT.Area} type="number" step="0.25" value={f.areaAcres} onChange={(e) => setF({ ...f, areaAcres: +e.target.value })} />
        {isPerennial ? (
          <>
            <Input label={UI_TEXT.EstablishmentDate} type="date" value={f.plantedDate} onChange={(e) => setF({ ...f, plantedDate: e.target.value })} />
            <Input label={UI_TEXT.BearingStartYear} type="text" placeholder="e.g. 2028" value={f.bearingStartYear || ''} onChange={(e) => setF({ ...f, bearingStartYear: e.target.value })} />
            <Select label={UI_TEXT.CropStatus} value={f.perennialStatus || 'Establishment / Non-Bearing'} onChange={(e) => setF({ ...f, perennialStatus: e.target.value as PerennialStatus })}>
              <option value="Establishment / Non-Bearing">{UI_TEXT.EstablishmentNonBearing}</option>
              <option value="Active Bearing">{UI_TEXT.ActiveBearing}</option>
              <option value="Replanting">{UI_TEXT.Replanting}</option>
            </Select>
          </>
        ) : (
          <>
            <DynamicSelect label="Year" moduleName="crop_year" value={f.year || ''} onChange={(v) => setF({ ...f, year: v })} placeholder="Select or add year" />
            <Select label="Season" value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })}>
              {seasons.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Input label={UI_TEXT.PlantedDate} type="date" value={f.plantedDate} onChange={(e) => setF({ ...f, plantedDate: e.target.value })} />
            <Select label={UI_TEXT.Status} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Crop['status'] })}>
              <option value="Active">{UI_TEXT.Active}</option><option value="Harvested">{UI_TEXT.Harvested}</option><option value="Abandoned">{UI_TEXT.Abandoned}</option>
            </Select>
          </>
        )}
        {isPerennial && (
          <Select label={UI_TEXT.LifecycleStatus} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Crop['status'] })}>
            <option value="Active">{UI_TEXT.Active}</option><option value="Harvested">{UI_TEXT.Harvested}</option><option value="Abandoned">{UI_TEXT.Abandoned}</option>
          </Select>
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
        message={UI_TEXT.SaveCrop}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}

function ExpenseModal({ edit, onClose }: { edit?: CropExpense; onClose: () => void }) {
  const { data, save, update, nextVoucherNo } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<CropExpense>(edit || { id: newId('ce'), cropId: data.crops[0]?.id || '', date: todayISO(), category: '', description: '', amount: 0 });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.cropId) e.cropId = true;
    if (!f.date) e.date = true;
    if (!f.category.trim()) e.category = true;
    if (!f.description.trim()) e.description = true;
    if (!f.amount || f.amount <= 0) e.amount = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast(`Please fill in all required fields: ${Object.keys(e).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`, 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    save('cropExpenses', f, edit ? 'Expense updated' : 'Expense added');
    if (!edit) {
      const crop = data.crops.find((c) => c.id === f.cropId);
      const v = { id: newId('vo'), voucherNo: nextVoucherNo(), date: f.date, kind: 'Payment' as const, party: 'Crop input supplier', description: `${f.category} — ${crop?.name || ''}`, amount: f.amount, reference: f.description };
      update('vouchers', [v, ...data.vouchers]);
      upsertRow('vouchers', v as never).catch(() => {});
    }
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditExpense : 'Add crop expense (බෝග වියදම එක් කරන්න)'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Crop (බෝගය) *" value={f.cropId} error={errors.cropId} onChange={(e) => setF({ ...f, cropId: e.target.value })}>
          {data.crops.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.plot}</option>)}
        </Select>
        <Input label={UI_TEXT.Date + ' *'} type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <DynamicSelect label={UI_TEXT.Category + ' *'} moduleName="crop_expense" value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="Select or add category" />
        <Input label={UI_TEXT.AmountRs + ' *'} type="number" value={f.amount} error={errors.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
        <div className="sm:col-span-2"><Input label={UI_TEXT.Description + ' *'} value={f.description} error={errors.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>{UI_TEXT.Cancel}</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? UI_TEXT.Save : UI_TEXT.SaveVoucher}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title={UI_TEXT.SaveEntry}
        message={UI_TEXT.SaveCropExpense}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}

function HarvestModal({ edit, onClose }: { edit?: CropHarvest; onClose: () => void }) {
  const { data, save, update, nextVoucherNo } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<CropHarvest>(edit || { id: newId('ch'), cropId: data.crops[0]?.id || '', date: todayISO(), quantityKg: 100, unitPrice: 200, buyer: '' });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.cropId) e.cropId = true;
    if (!f.date) e.date = true;
    if (!f.buyer.trim()) e.buyer = true;
    if (!f.quantityKg || f.quantityKg <= 0) e.quantityKg = true;
    if (!f.unitPrice || f.unitPrice <= 0) e.unitPrice = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast(`Please fill in all required fields: ${Object.keys(e).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`, 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    save('cropHarvests', f, edit ? 'Harvest updated' : 'Harvest added');
    if (!edit) {
      const crop = data.crops.find((c) => c.id === f.cropId);
      const v = { id: newId('vo'), voucherNo: nextVoucherNo(), date: f.date, kind: 'Sales Receipt' as const, party: f.buyer, description: `Harvest sale — ${crop?.name || ''} (${f.quantityKg} kg)`, amount: f.quantityKg * f.unitPrice, reference: '' };
      update('vouchers', [v, ...data.vouchers]);
      upsertRow('vouchers', v as never).catch(() => {});
    }
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditHarvest : UI_TEXT.AddHarvest} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Crop (බෝගය) *" value={f.cropId} error={errors.cropId} onChange={(e) => setF({ ...f, cropId: e.target.value })}>
          {data.crops.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.plot}</option>)}
        </Select>
        <Input label={UI_TEXT.Date + ' *'} type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Input label={UI_TEXT.QtyKg + ' *'} type="number" value={f.quantityKg} error={errors.quantityKg} onChange={(e) => setF({ ...f, quantityKg: +e.target.value })} />
        <Input label="Unit price (Rs./kg) (ඒකක මිල (රු./කිලෝ)) *" type="number" value={f.unitPrice} error={errors.unitPrice} onChange={(e) => setF({ ...f, unitPrice: +e.target.value })} />
        <div className="sm:col-span-2"><Input label={UI_TEXT.Buyer + ' *'} value={f.buyer} error={errors.buyer} onChange={(e) => setF({ ...f, buyer: e.target.value })} /></div>
      </div>
      <div className="mt-4 p-3 rounded-xl bg-success-50 text-sm">{UI_TEXT.Revenue}: <strong className="text-success-700">{LKR(f.quantityKg * f.unitPrice)}</strong></div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>{UI_TEXT.Cancel}</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? UI_TEXT.Save : UI_TEXT.SaveReceipt}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title={UI_TEXT.SaveEntry}
        message={UI_TEXT.SaveHarvest}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}
