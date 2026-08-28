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
        <Stat label="Nursery sales" value={LKR(totals.salesRevenue)} sub={`${data.nurserySales.length} invoices`} tone="green" icon={<DollarSign size={18} />} />
        <Stat label="Internal transfers" value={LKR(totals.transferCredit)} sub="Credited to nursery" tone="blue" icon={<ArrowRightLeft size={18} />} />
        <Stat label="Production cost" value={LKR(totals.productionCost + totals.sharedOverhead)} sub={`Shared overhead ${LKR(totals.sharedOverhead)}`} tone="neutral" icon={<Sprout size={18} />} />
        <Stat label="Net profit" value={LKR(totals.netProfit)} sub="Sales + transfers − cost" tone={totals.netProfit >= 0 ? 'green' : 'red'} icon={<DollarSign size={18} />} />
      </div>

      <TabBar
        tabs={[
          { key: 'batches' as Tab, label: 'Batches & Inventory' },
          { key: 'costs' as Tab, label: 'Nursery Costs' },
          { key: 'sales' as Tab, label: 'External Sales' },
          { key: 'transfers' as Tab, label: 'Plot Transfers' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'batches' && (
        <Card className="p-5">
          <SectionTitle title="Production Batches" subtitle="Seasonal seedlings & perennial planting material" icon={<Sprout size={18} />}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => downloadFile('nursery_batches.csv', toCSV(data.nurseryBatches as unknown as Record<string, unknown>[]), 'text/csv;charset=utf-8;')}>Export</Button>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'batch' })}>New Batch</Button>
            </div>} />
          <DataTable<NurseryBatchPnL>
            rows={batchesPnL}
            onRowClick={(p) => setModal({ kind: 'batch', edit: p.batch })}
            onEdit={(p) => setModal({ kind: 'batch', edit: p.batch })}
            onDelete={(p) => setConfirmDelete({ key: 'nurseryBatches', id: p.batch.id, name: p.batch.code })}
            canEdit={isAdmin}
            columns={[
              { key: 'code', header: 'Code', render: (p) => <span className="font-mono font-700 text-primary-700">{p.batch.code}</span> },
              { key: 'variety', header: 'Variety', render: (p) => <div><div className="font-600">{p.batch.variety}</div><div className="text-xs text-neutral-500">{p.batch.category}</div></div> },
              { key: 'qty', header: 'Units', align: 'right', render: (p) => <span>{p.batch.qtyUnits} <span className="text-neutral-400">{p.batch.unitType}</span></span> },
              { key: 'remaining', header: 'Remaining', align: 'right', render: (p) => <Badge tone={p.remainingQty > 0 ? 'green' : 'gray'}>{p.remainingQty}</Badge> },
              { key: 'cost', header: 'Prod. Cost', align: 'right', render: (p) => LKR(p.productionCost) },
              { key: 'profit', header: 'Profit', align: 'right', render: (p) => <span className={p.profit >= 0 ? 'text-success-700 font-700' : 'text-error-700 font-700'}>{LKR(p.profit)}</span> },
              { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.batch.status} /> },
            ]}
          />
        </Card>
      )}

      {tab === 'costs' && (
        <Card className="p-5">
          <SectionTitle title="Nursery Operational Costs" subtitle="Batch-wise & shared overhead logging" icon={<DollarSign size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'cost' })}>Log Cost</Button>} />
          <DataTable
            rows={data.nurseryCosts}
            onRowClick={(c) => setModal({ kind: 'cost', edit: c })}
            onEdit={(c) => setModal({ kind: 'cost', edit: c })}
            onDelete={(c) => setConfirmDelete({ key: 'nurseryCosts', id: c.id, name: c.description || c.category || 'this cost' })}
            canEdit={isAdmin}
            columns={[
              { key: 'date', header: 'Date', render: (c) => fmtDate(c.date) },
              { key: 'batch', header: 'Batch', render: (c) => c.batchId === 'shared' ? <Badge tone="yellow">Shared overhead</Badge> : <span className="font-mono text-xs">{data.nurseryBatches.find((b) => b.id === c.batchId)?.code || c.batchId}</span> },
              { key: 'category', header: 'Category', render: (c) => c.category },
              { key: 'desc', header: 'Description', render: (c) => c.description },
              { key: 'amount', header: 'Amount', align: 'right', render: (c) => <span className="font-700">{LKR(c.amount)}</span> },
            ]}
          />
        </Card>
      )}

      {tab === 'sales' && (
        <Card className="p-5">
          <SectionTitle title="External Commercial Sales" subtitle="Sell seedlings / planting material with invoices" icon={<ShoppingCart size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'sale' })}>New Sale</Button>} />
          <DataTable
            rows={data.nurserySales}
            onRowClick={(s) => setModal({ kind: 'sale', edit: s })}
            onEdit={(s) => setModal({ kind: 'sale', edit: s })}
            onDelete={(s) => setConfirmDelete({ key: 'nurserySales', id: s.id, name: s.invoiceNo })}
            canEdit={isAdmin}
            columns={[
              { key: 'inv', header: 'Invoice', render: (s) => <span className="font-mono font-700 text-accent-700">{s.invoiceNo}</span> },
              { key: 'date', header: 'Date', render: (s) => fmtDate(s.date) },
              { key: 'buyer', header: 'Buyer', render: (s) => s.buyer },
              { key: 'batch', header: 'Variety', render: (s) => { const b = data.nurseryBatches.find((x) => x.id === s.batchId); return b ? `${b.code} · ${b.variety}` : s.batchId; } },
              { key: 'qty', header: 'Qty', align: 'right', render: (s) => s.qty },
              { key: 'price', header: 'Unit Price', align: 'right', render: (s) => LKR(s.unitPrice) },
              { key: 'total', header: 'Total', align: 'right', render: (s) => <span className="font-700 text-success-700">{LKR(s.qty * s.unitPrice)}</span> },
              { key: 'act', header: 'Actions', render: (s) => (
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
          <SectionTitle title="Internal Plot Transfers" subtitle="Move nursery plants into field plots — credits nursery, debits crop plot" icon={<ArrowRightLeft size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'transfer' })}>New Transfer</Button>} />
          <DataTable
            rows={data.nurseryTransfers}
            onRowClick={(t) => setModal({ kind: 'transfer', edit: t })}
            onEdit={(t) => setModal({ kind: 'transfer', edit: t })}
            onDelete={(t) => setConfirmDelete({ key: 'nurseryTransfers', id: t.id, name: `transfer to ${data.crops.find((c) => c.id === t.cropId)?.plot || ''}` })}
            canEdit={isAdmin}
            columns={[
              { key: 'date', header: 'Date', render: (t) => fmtDate(t.date) },
              { key: 'batch', header: 'Batch', render: (t) => { const b = data.nurseryBatches.find((x) => x.id === t.batchId); return b ? `${b.code} · ${b.variety}` : t.batchId; } },
              { key: 'crop', header: 'Destination Plot', render: (t) => { const c = data.crops.find((x) => x.id === t.cropId); return c ? <div><div className="font-600">{c.plot}</div><div className="text-xs text-neutral-500">{c.name}</div></div> : t.cropId; } },
              { key: 'qty', header: 'Qty', align: 'right', render: (t) => t.qty },
              { key: 'value', header: 'Unit Value', align: 'right', render: (t) => LKR(t.unitValue) },
              { key: 'credit', header: 'Nursery Credit', align: 'right', render: (t) => <span className="font-700 text-accent-700">{LKR(t.qty * t.unitValue)}</span> },
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
        title="Delete this item?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
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
    <Modal open onClose={onClose} title={edit ? 'Edit batch' : 'New nursery batch'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Batch code *" value={f.code} error={errors.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <Select label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as NurseryBatch['category'] })}>
          <option>Seasonal Seedling</option><option>Perennial Planting Material</option>
        </Select>
        <Input label="Variety *" value={f.variety} error={errors.variety} onChange={(e) => setF({ ...f, variety: e.target.value })} />
        <Input label="Start date *" type="date" value={f.startDate} error={errors.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        <Input label="Total units *" type="number" value={f.qtyUnits} error={errors.qtyUnits} onChange={(e) => setF({ ...f, qtyUnits: +e.target.value })} />
        <Input label="Unit type" value={f.unitType} onChange={(e) => setF({ ...f, unitType: e.target.value })} placeholder="tray / polybag / sucker / sapling" />
        <Input label="Unit production cost (Rs.)" type="number" value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: +e.target.value })} />
        <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as NurseryBatch['status'] })}>
          <option>Growing</option><option>Ready</option><option>Sold Out</option><option>Transferred</option>
        </Select>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? 'Save changes' : 'Create batch'}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title="Save this entry?"
        message="Are you sure you want to save this nursery batch?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
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
    <Modal open onClose={onClose} title={edit ? 'Edit cost' : 'Log nursery cost'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Batch (or shared overhead)" value={f.batchId} onChange={(e) => setF({ ...f, batchId: e.target.value })}>
          <option value="shared">Shared overhead (shade house, general labor)</option>
          {data.nurseryBatches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.variety}</option>)}
        </Select>
        <Input label="Date *" type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <DynamicSelect label="Category *" moduleName="nursery_cost" value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="Select or add category" />
        <Input label="Amount (Rs.) *" type="number" value={f.amount} error={errors.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
        <div className="sm:col-span-2"><Input label="Description *" value={f.description} error={errors.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
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
        message="Are you sure you want to save this nursery cost?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
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
    <Modal open onClose={onClose} title={edit ? 'Edit sale' : 'New external sale'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Batch *" value={f.batchId} error={errors.batchId} onChange={(e) => setF({ ...f, batchId: e.target.value })}>
          {data.nurseryBatches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.variety} ({b.qtyUnits} {b.unitType})</option>)}
        </Select>
        <Input label="Invoice no." value={f.invoiceNo} onChange={(e) => setF({ ...f, invoiceNo: e.target.value })} />
        <Input label="Date *" type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Input label="Buyer *" value={f.buyer} error={errors.buyer} onChange={(e) => setF({ ...f, buyer: e.target.value })} />
        <Input label="Quantity *" type="number" value={f.qty} error={errors.qty} onChange={(e) => setF({ ...f, qty: +e.target.value })} />
        <Input label="Unit price (Rs.) *" type="number" value={f.unitPrice} error={errors.unitPrice} onChange={(e) => setF({ ...f, unitPrice: +e.target.value })} />
      </div>
      <div className="mt-4 p-3 rounded-xl bg-primary-50 text-sm flex items-center justify-between">
        <span className="text-neutral-600">Sale total: <strong className="text-primary-700">{LKR(f.qty * f.unitPrice)}</strong></span>
        {batch && <span className="text-xs text-neutral-500">Batch has {batch.qtyUnits} {batch.unitType}</span>}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? 'Save' : 'Record sale + voucher'}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title="Save this entry?"
        message="Are you sure you want to save this nursery sale?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
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
    <Modal open onClose={onClose} title={edit ? 'Edit transfer' : 'New plot transfer'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Source batch *" value={f.batchId} error={errors.batchId} onChange={(e) => { const b = data.nurseryBatches.find((x) => x.id === e.target.value); setF({ ...f, batchId: e.target.value, unitValue: b?.unitCost || f.unitValue }); }}>
          {data.nurseryBatches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.variety}</option>)}
        </Select>
        <Select label="Destination crop plot *" value={f.cropId} error={errors.cropId} onChange={(e) => setF({ ...f, cropId: e.target.value })}>
          {data.crops.map((c) => <option key={c.id} value={c.id}>{c.plot} · {c.name}</option>)}
        </Select>
        <Input label="Date *" type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Input label="Quantity *" type="number" value={f.qty} error={errors.qty} onChange={(e) => setF({ ...f, qty: +e.target.value })} />
        <Input label="Unit value (Rs.) — debited to plot" type="number" value={f.unitValue} error={errors.unitValue} onChange={(e) => setF({ ...f, unitValue: +e.target.value })} />
      </div>
      <div className="mt-4 p-3 rounded-xl bg-accent-50 text-sm">
        Nursery credit: <strong className="text-accent-700">{LKR(f.qty * f.unitValue)}</strong> · This amount is also added as a production expense to the destination crop plot.
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? 'Save' : 'Record transfer'}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title="Save this entry?"
        message="Are you sure you want to save this nursery transfer?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}
