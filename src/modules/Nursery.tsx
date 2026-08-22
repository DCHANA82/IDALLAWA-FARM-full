import { useState } from 'react';
import { Plus, Sprout, ShoppingCart, ArrowRightLeft, DollarSign, Printer, Download } from 'lucide-react';
import { useStore, newId, upsertRow } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { LKR, fmtDate, todayISO, downloadFile, toCSV } from '@/lib/format';
import { allBatchPnL, nurseryTotals, type NurseryBatchPnL } from '@/lib/calc';
import { Card, Button, Badge, SectionTitle, Stat, Modal, Input, Select, ConfirmDialog } from '@/components/ui';
import { DynamicSelect } from '@/components/DynamicSelect';
import { DataTable, StatusBadge } from '@/components/DataTable';
import { TabBar } from '@/components/TabBar';
import { printContent, SalesReceiptPrint } from '@/components/print';
import { useToast } from '@/components/toast';
import type { NurseryBatch, NurseryCost, NurserySale, NurseryTransfer } from '@/lib/types';
import { UI_TEXT } from '@/lib/translations';

type Tab = 'batches' | 'costs' | 'sales' | 'transfers';

export function NurseryModule() {
  const { data, remove } = useStore();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('batches');
  const [modal, setModal] = useState<null | { kind: 'batch' | 'cost' | 'sale' | 'transfer'; edit?: NurseryBatch | NurseryCost | NurserySale | NurseryTransfer }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { key: 'nurseryBatches' | 'nurseryCosts' | 'nurserySales' | 'nurseryTransfers'; id: string; name: string }>(null);
  const totals = nurseryTotals(data);
  const batchesPnL = allBatchPnL(data);

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.key, confirmDelete.id, 'Record deleted');
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={UI_TEXT.NurserySales} value={LKR(totals.salesRevenue)} sub={`${data.nurserySales.length} invoices`} tone="green" icon={<DollarSign size={18} />} />
        <Stat label={UI_TEXT.InternalTransfers} value={LKR(totals.transferCredit)} sub="Credited to nursery" tone="blue" icon={<ArrowRightLeft size={18} />} />
        <Stat label={UI_TEXT.ProductionCost} value={LKR(totals.productionCost + totals.sharedOverhead)} sub={`Shared overhead ${LKR(totals.sharedOverhead)}`} tone="neutral" icon={<Sprout size={18} />} />
        <Stat label={UI_TEXT.NetProfitLabel} value={LKR(totals.netProfit)} sub="Sales + transfers − cost" tone={totals.netProfit >= 0 ? 'green' : 'red'} icon={<DollarSign size={18} />} />
      </div>

      <TabBar
        tabs={[
          { key: 'batches' as Tab, label: UI_TEXT.BatchesInventory },
          { key: 'costs' as Tab, label: UI_TEXT.NurseryCosts },
          { key: 'sales' as Tab, label: UI_TEXT.ExternalSales },
          { key: 'transfers' as Tab, label: UI_TEXT.PlotTransfers },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'batches' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.ProductionBatches} subtitle="Seasonal seedlings & perennial planting material (කන්න පැළ හා ස්ථිර පැළ සිටුවීම් අමුද්‍රව්‍ය)" icon={<Sprout size={18} />}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => downloadFile('nursery_batches.csv', toCSV(data.nurseryBatches as unknown as Record<string, unknown>[]), 'text/csv;charset=utf-8;')}>{UI_TEXT.Export}</Button>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'batch' })}>{UI_TEXT.NewBatch}</Button>
            </div>} />
          <DataTable<NurseryBatchPnL>
            rows={batchesPnL}
            onRowClick={(p) => setModal({ kind: 'batch', edit: p.batch })}
            onEdit={(p) => setModal({ kind: 'batch', edit: p.batch })}
            onDelete={(p) => setConfirmDelete({ key: 'nurseryBatches', id: p.batch.id, name: p.batch.code })}
            canEdit={isAdmin}
            columns={[
              { key: 'code', header: UI_TEXT.Code, render: (p) => <span className="font-mono font-700 text-primary-700">{p.batch.code}</span> },
              { key: 'variety', header: UI_TEXT.Variety, render: (p) => <div><div className="font-600">{p.batch.variety}</div><div className="text-xs text-neutral-500">{p.batch.category}</div></div> },
              { key: 'qty', header: UI_TEXT.Units, align: 'right', render: (p) => <span>{p.batch.qtyUnits} <span className="text-neutral-400">{p.batch.unitType}</span></span> },
              { key: 'remaining', header: UI_TEXT.Remaining, align: 'right', render: (p) => <Badge tone={p.remainingQty > 0 ? 'green' : 'gray'}>{p.remainingQty}</Badge> },
              { key: 'cost', header: UI_TEXT.ProdCost, align: 'right', render: (p) => LKR(p.productionCost) },
              { key: 'profit', header: UI_TEXT.Profit, align: 'right', render: (p) => <span className={p.profit >= 0 ? 'text-success-700 font-700' : 'text-error-700 font-700'}>{LKR(p.profit)}</span> },
              { key: 'status', header: UI_TEXT.Status, render: (p) => <StatusBadge status={p.batch.status} /> },
            ]}
          />
        </Card>
      )}

      {tab === 'costs' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.NurseryOperationalCosts} subtitle="Batch-wise & shared overhead logging (සමුළු අනුව හා හවුල් ඔවර්හෙඩ් ලොග් කිරීම)" icon={<DollarSign size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'cost' })}>{UI_TEXT.LogCost}</Button>} />
          <DataTable
            rows={data.nurseryCosts}
            onRowClick={(c) => setModal({ kind: 'cost', edit: c })}
            onEdit={(c) => setModal({ kind: 'cost', edit: c })}
            onDelete={(c) => setConfirmDelete({ key: 'nurseryCosts', id: c.id, name: c.description || c.category || 'this cost' })}
            canEdit={isAdmin}
            columns={[
              { key: 'date', header: UI_TEXT.Date, render: (c) => fmtDate(c.date) },
              { key: 'batch', header: 'Batch (සමුළුව)', render: (c) => c.batchId === 'shared' ? <Badge tone="yellow">{UI_TEXT.SharedOverhead}</Badge> : <span className="font-mono text-xs">{data.nurseryBatches.find((b) => b.id === c.batchId)?.code || c.batchId}</span> },
              { key: 'category', header: UI_TEXT.Category, render: (c) => c.category },
              { key: 'desc', header: UI_TEXT.Description, render: (c) => c.description },
              { key: 'amount', header: UI_TEXT.Amount, align: 'right', render: (c) => <span className="font-700">{LKR(c.amount)}</span> },
            ]}
          />
        </Card>
      )}

      {tab === 'sales' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.ExternalCommercialSales} subtitle="Sell seedlings / planting material with invoices (පැළ / සිටුවීම් අමුද්‍රව්‍ය ඉන්වොයිසි සහිතව විකුණන්න)" icon={<ShoppingCart size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'sale' })}>{UI_TEXT.NewSale}</Button>} />
          <DataTable
            rows={data.nurserySales}
            onRowClick={(s) => setModal({ kind: 'sale', edit: s })}
            onEdit={(s) => setModal({ kind: 'sale', edit: s })}
            onDelete={(s) => setConfirmDelete({ key: 'nurserySales', id: s.id, name: s.invoiceNo })}
            canEdit={isAdmin}
            columns={[
              { key: 'inv', header: 'Invoice (ඉන්වොයිසිය)', render: (s) => <span className="font-mono font-700 text-accent-700">{s.invoiceNo}</span> },
              { key: 'date', header: UI_TEXT.Date, render: (s) => fmtDate(s.date) },
              { key: 'buyer', header: UI_TEXT.Buyer, render: (s) => s.buyer },
              { key: 'batch', header: UI_TEXT.Variety, render: (s) => { const b = data.nurseryBatches.find((x) => x.id === s.batchId); return b ? `${b.code} · ${b.variety}` : s.batchId; } },
              { key: 'qty', header: UI_TEXT.Quantity, align: 'right', render: (s) => s.qty },
              { key: 'price', header: UI_TEXT.UnitPrice, align: 'right', render: (s) => LKR(s.unitPrice) },
              { key: 'total', header: UI_TEXT.Total, align: 'right', render: (s) => <span className="font-700 text-success-700">{LKR(s.qty * s.unitPrice)}</span> },
              { key: 'act', header: UI_TEXT.Actions, render: (s) => (
                <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                  <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500" title="Print receipt" onClick={() => printSale(s)}><Printer size={15} /></button>
                </div>
              ) },
            ]}
          />
        </Card>
      )}

      {tab === 'transfers' && (
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.InternalPlotTransfers} subtitle="Move nursery plants into field plots — credits nursery, debits crop plot (නර්සරි පැළ කුඹුර කොටස් වෙත ගෙන යන්න — නර්සරියට ණය, කුඹුර කොටසට බර)" icon={<ArrowRightLeft size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'transfer' })}>{UI_TEXT.NewTransfer}</Button>} />
          <DataTable
            rows={data.nurseryTransfers}
            onRowClick={(t) => setModal({ kind: 'transfer', edit: t })}
            onEdit={(t) => setModal({ kind: 'transfer', edit: t })}
            onDelete={(t) => setConfirmDelete({ key: 'nurseryTransfers', id: t.id, name: `transfer to ${data.crops.find((c) => c.id === t.cropId)?.plot || ''}` })}
            canEdit={isAdmin}
            columns={[
              { key: 'date', header: UI_TEXT.Date, render: (t) => fmtDate(t.date) },
              { key: 'batch', header: 'Batch (සමුළුව)', render: (t) => { const b = data.nurseryBatches.find((x) => x.id === t.batchId); return b ? `${b.code} · ${b.variety}` : t.batchId; } },
              { key: 'crop', header: UI_TEXT.DestinationPlotShort, render: (t) => { const c = data.crops.find((x) => x.id === t.cropId); return c ? <div><div className="font-600">{c.plot}</div><div className="text-xs text-neutral-500">{c.name}</div></div> : t.cropId; } },
              { key: 'qty', header: UI_TEXT.Quantity, align: 'right', render: (t) => t.qty },
              { key: 'value', header: UI_TEXT.UnitValue, align: 'right', render: (t) => LKR(t.unitValue) },
              { key: 'credit', header: UI_TEXT.NurseryCredit, align: 'right', render: (t) => <span className="font-700 text-accent-700">{LKR(t.qty * t.unitValue)}</span> },
            ]}
          />
        </Card>
      )}

      {modal && (
        <NurseryModal kind={modal.kind} edit={modal.edit} onClose={() => setModal(null)} />
      )}

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

  function printSale(s: NurserySale) {
    const b = data.nurseryBatches.find((x) => x.id === s.batchId);
    printContent(<SalesReceiptPrint
      invoiceNo={s.invoiceNo} date={fmtDate(s.date)} buyer={s.buyer}
      farmName={data.farmName} owner={data.owner}
      lines={[{ description: b ? `${b.variety} (${b.unitType})` : 'Nursery material', qty: s.qty, unitPrice: s.unitPrice, amount: s.qty * s.unitPrice }]}
      total={s.qty * s.unitPrice}
    />);
  }
}

function NurseryModal({ kind, edit, onClose }: { kind: 'batch' | 'cost' | 'sale' | 'transfer'; edit?: NurseryBatch | NurseryCost | NurserySale | NurseryTransfer; onClose: () => void }) {
  if (kind === 'batch') return <BatchModal edit={edit as NurseryBatch | undefined} onClose={onClose} />;
  if (kind === 'cost') return <CostModal edit={edit as NurseryCost | undefined} onClose={onClose} />;
  if (kind === 'sale') return <SaleModal edit={edit as NurserySale | undefined} onClose={onClose} />;
  return <TransferModal edit={edit as NurseryTransfer | undefined} onClose={onClose} />;
}

function BatchModal({ edit, onClose }: { edit?: NurseryBatch; onClose: () => void }) {
  const { data, settings, save, nextBatchCode } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<NurseryBatch>(edit || { id: newId('nb'), code: nextBatchCode(), category: 'Seasonal Seedling', variety: '', startDate: todayISO(), qtyUnits: 100, unitType: 'tray', unitCost: 100, status: 'Growing' });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.code.trim()) e.code = true;
    if (!f.variety.trim()) e.variety = true;
    if (!f.startDate) e.startDate = true;
    if (!f.qtyUnits || f.qtyUnits <= 0) e.qtyUnits = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast(`Please fill in all required fields: ${Object.keys(e).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`, 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    save('nurseryBatches', f, edit ? 'Batch updated' : 'Batch created');
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditBatch : UI_TEXT.NewNurseryBatch} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label={UI_TEXT.BatchCode + ' *'} value={f.code} error={errors.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <Select label={UI_TEXT.BatchCategory} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as NurseryBatch['category'] })}>
          <option value="Seasonal Seedling">{UI_TEXT.SeasonalSeedling}</option><option value="Perennial Planting Material">{UI_TEXT.PerennialPlantingMaterial}</option>
        </Select>
        <Input label={UI_TEXT.Variety + ' *'} value={f.variety} error={errors.variety} onChange={(e) => setF({ ...f, variety: e.target.value })} />
        <Input label={UI_TEXT.StartDate + ' *'} type="date" value={f.startDate} error={errors.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        <Input label={UI_TEXT.TotalUnits + ' *'} type="number" value={f.qtyUnits} error={errors.qtyUnits} onChange={(e) => setF({ ...f, qtyUnits: +e.target.value })} />
        <Input label={UI_TEXT.UnitType} value={f.unitType} onChange={(e) => setF({ ...f, unitType: e.target.value })} placeholder="tray / polybag / sucker / sapling" />
        <Input label={UI_TEXT.UnitProductionCost} type="number" value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: +e.target.value })} />
        <Select label={UI_TEXT.Status} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as NurseryBatch['status'] })}>
          <option value="Growing">{UI_TEXT.Growing}</option><option value="Ready">{UI_TEXT.Ready}</option><option value="Sold Out">{UI_TEXT.SoldOut}</option><option value="Transferred">{UI_TEXT.Transferred}</option>
        </Select>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>{UI_TEXT.Cancel}</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? UI_TEXT.SaveChanges : UI_TEXT.CreateBatch}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title={UI_TEXT.SaveEntry}
        message={UI_TEXT.SaveBatch}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}

function CostModal({ edit, onClose }: { edit?: NurseryCost; onClose: () => void }) {
  const { data, save } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<NurseryCost>(edit || { id: newId('nc'), batchId: data.nurseryBatches[0]?.id || 'shared', date: todayISO(), category: '', description: '', amount: 0 });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
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
    save('nurseryCosts', f, edit ? 'Cost updated' : 'Cost logged');
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditCost : UI_TEXT.LogNurseryCost} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label={UI_TEXT.BatchOrShared} value={f.batchId} onChange={(e) => setF({ ...f, batchId: e.target.value })}>
          <option value="shared">{UI_TEXT.SharedOverheadDesc}</option>
          {data.nurseryBatches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.variety}</option>)}
        </Select>
        <Input label={UI_TEXT.Date + ' *'} type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <DynamicSelect label={UI_TEXT.Category + ' *'} moduleName="nursery_cost" value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="Select or add category" />
        <Input label={UI_TEXT.AmountRs + ' *'} type="number" value={f.amount} error={errors.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
        <div className="sm:col-span-2"><Input label={UI_TEXT.Description + ' *'} value={f.description} error={errors.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
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
        message={UI_TEXT.SaveNurseryCost}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}

function SaleModal({ edit, onClose }: { edit?: NurserySale; onClose: () => void }) {
  const { data, save, update, nextInvoiceNo, nextVoucherNo } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<NurserySale>(edit || { id: newId('ns'), batchId: data.nurseryBatches[0]?.id || '', date: todayISO(), buyer: '', qty: 10, unitPrice: 300, invoiceNo: nextInvoiceNo() });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);
  const batch = data.nurseryBatches.find((b) => b.id === f.batchId);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.batchId) e.batchId = true;
    if (!f.date) e.date = true;
    if (!f.buyer.trim()) e.buyer = true;
    if (!f.qty || f.qty <= 0) e.qty = true;
    if (!f.unitPrice || f.unitPrice <= 0) e.unitPrice = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast(`Please fill in all required fields: ${Object.keys(e).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`, 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    save('nurserySales', f, edit ? 'Sale updated' : 'Sale recorded');
    if (!edit) {
      const v = { id: newId('vo'), voucherNo: nextVoucherNo(), date: f.date, kind: 'Sales Receipt' as const, party: f.buyer, description: `Nursery sale ${f.invoiceNo}`, amount: f.qty * f.unitPrice, reference: f.invoiceNo };
      update('vouchers', [v, ...data.vouchers]);
      upsertRow('vouchers', v as never).catch(() => {});
    }
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditSale : UI_TEXT.NewExternalSale} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Batch (සමුළුව) *" value={f.batchId} error={errors.batchId} onChange={(e) => setF({ ...f, batchId: e.target.value })}>
          {data.nurseryBatches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.variety} ({b.qtyUnits} {b.unitType})</option>)}
        </Select>
        <Input label={UI_TEXT.InvoiceNo} value={f.invoiceNo} onChange={(e) => setF({ ...f, invoiceNo: e.target.value })} />
        <Input label={UI_TEXT.Date + ' *'} type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Input label={UI_TEXT.Buyer + ' *'} value={f.buyer} error={errors.buyer} onChange={(e) => setF({ ...f, buyer: e.target.value })} />
        <Input label={UI_TEXT.Quantity + ' *'} type="number" value={f.qty} error={errors.qty} onChange={(e) => setF({ ...f, qty: +e.target.value })} />
        <Input label={UI_TEXT.UnitPrice + ' *'} type="number" value={f.unitPrice} error={errors.unitPrice} onChange={(e) => setF({ ...f, unitPrice: +e.target.value })} />
      </div>
      <div className="mt-4 p-3 rounded-xl bg-primary-50 text-sm flex items-center justify-between">
        <span className="text-neutral-600">Sale total (විකුණුමේ සම්පූර්ණය): <strong className="text-primary-700">{LKR(f.qty * f.unitPrice)}</strong></span>
        {batch && <span className="text-xs text-neutral-500">Batch has {batch.qtyUnits} {batch.unitType}</span>}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>{UI_TEXT.Cancel}</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? UI_TEXT.Save : UI_TEXT.RecordSaleVoucher}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title={UI_TEXT.SaveEntry}
        message={UI_TEXT.SaveNurserySale}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}

function TransferModal({ edit, onClose }: { edit?: NurseryTransfer; onClose: () => void }) {
  const { data, save, update } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<NurseryTransfer>(edit || { id: newId('nt'), batchId: data.nurseryBatches[0]?.id || '', date: todayISO(), cropId: data.crops[0]?.id || '', qty: 20, unitValue: data.nurseryBatches[0]?.unitCost || 100 });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.batchId) e.batchId = true;
    if (!f.cropId) e.cropId = true;
    if (!f.date) e.date = true;
    if (!f.qty || f.qty <= 0) e.qty = true;
    if (!f.unitValue || f.unitValue <= 0) e.unitValue = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast(`Please fill in all required fields: ${Object.keys(e).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`, 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    save('nurseryTransfers', f, edit ? 'Transfer updated' : 'Transfer recorded');
    if (!edit) {
      const batch = data.nurseryBatches.find((b) => b.id === f.batchId);
      const exp = { id: newId('ce'), cropId: f.cropId, date: f.date, category: 'Planting Material (Nursery)', description: `Nursery transfer from ${batch?.code || ''} — ${f.qty} ${batch?.unitType || ''}`, amount: f.qty * f.unitValue };
      update('cropExpenses', [exp, ...data.cropExpenses]);
      upsertRow('cropExpenses', exp as never).catch(() => {});
    }
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? UI_TEXT.EditTransfer : UI_TEXT.NewPlotTransfer} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label={UI_TEXT.SourceBatch + ' *'} value={f.batchId} error={errors.batchId} onChange={(e) => { const b = data.nurseryBatches.find((x) => x.id === e.target.value); setF({ ...f, batchId: e.target.value, unitValue: b?.unitCost || f.unitValue }); }}>
          {data.nurseryBatches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.variety}</option>)}
        </Select>
        <Select label={UI_TEXT.DestinationPlot + ' *'} value={f.cropId} error={errors.cropId} onChange={(e) => setF({ ...f, cropId: e.target.value })}>
          {data.crops.map((c) => <option key={c.id} value={c.id}>{c.plot} · {c.name}</option>)}
        </Select>
        <Input label={UI_TEXT.Date + ' *'} type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Input label={UI_TEXT.Quantity + ' *'} type="number" value={f.qty} error={errors.qty} onChange={(e) => setF({ ...f, qty: +e.target.value })} />
        <Input label="Unit value (Rs.) — debited to plot (ඒකක අගය (රු.) — කොටසට බර)" type="number" value={f.unitValue} error={errors.unitValue} onChange={(e) => setF({ ...f, unitValue: +e.target.value })} />
      </div>
      <div className="mt-4 p-3 rounded-xl bg-accent-50 text-sm">
        {UI_TEXT.NurseryCredit}: <strong className="text-accent-700">{LKR(f.qty * f.unitValue)}</strong> · This amount is also added as a production expense to the destination crop plot.
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>{UI_TEXT.Cancel}</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? UI_TEXT.Save : UI_TEXT.RecordTransfer}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title={UI_TEXT.SaveEntry}
        message={UI_TEXT.SaveNurseryTransfer}
        confirmLabel={UI_TEXT.Confirm}
        cancelLabel={UI_TEXT.Cancel}
      />
    </Modal>
  );
}
