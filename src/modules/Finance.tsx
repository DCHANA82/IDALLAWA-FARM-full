import { useState } from 'react';
import { Plus, BookOpen, Printer, Download, Wallet, Landmark, Store, UserCog, ArrowDownLeft, ArrowUpRight, Hammer, Pencil, Trash2 } from 'lucide-react';
import { useStore, newId, upsertRow } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { LKR, fmtDate, todayISO } from '@/lib/format';
import { ledgerBalance } from '@/lib/calc';
import { Card, Button, Badge, SectionTitle, Stat, Modal, Input, Select, ConfirmDialog } from '@/components/ui';
import { DynamicSelect } from '@/components/DynamicSelect';
import { DataTable } from '@/components/DataTable';
import { TabBar } from '@/components/TabBar';
import { printContent, printVoucherSlip, printExpenseSlip, VoucherPrint, ExpensePrint } from '@/components/print';
import { exportCSV } from '@/lib/export';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/auth';
import { RestrictedModule } from '@/components/RestrictedOverlay';
import type { PermissionModule } from '@/lib/types';
import type { LedgerEntry, Voucher, Expense, LedgerKind, FarmDevelopment } from '@/lib/types';

type Tab = 'ledger' | 'vouchers' | 'expenses' | 'development';

const TAB_PERM_MAP: Record<Tab, PermissionModule> = {
  ledger: 'finance',
  vouchers: 'vouchers',
  expenses: 'expenses',
  development: 'capex',
};

const LEDGER_KINDS: LedgerKind[] = ['Capital', 'Retail Shop Transfer', 'Bank Loan', 'Shop Credit', 'Owner Equity Return'];

export function FinanceModule() {
  const { data, remove } = useStore();
  const { isAdmin, canView, canEdit } = useAuth();
  const [tab, setTab] = useState<Tab>('ledger');
  const [modal, setModal] = useState<null | { kind: 'ledger' | 'voucher' | 'expense' | 'development'; edit?: LedgerEntry | Voucher | Expense | FarmDevelopment }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { key: keyof typeof data; id: string; name: string }>(null);

  const allTabs: { key: Tab; label: string }[] = [
    { key: 'ledger', label: 'Ledger Entries' },
    { key: 'vouchers', label: 'Vouchers & Billing' },
    { key: 'expenses', label: 'Expense Log' },
    { key: 'development', label: 'Development Costs' },
  ];
  const visibleTabs = allTabs.filter((t) => canView(TAB_PERM_MAP[t.key]));
  const activeTab = visibleTabs.find((t) => t.key === tab) ? tab : (visibleTabs[0]?.key || 'ledger');
  const tabCanEdit = canEdit(TAB_PERM_MAP[activeTab]);

  const totalCapex = data.farmDevelopments.reduce((s, d) => s + d.totalCost, 0);

  const cap = ledgerBalance(data, 'Capital');
  const loan = ledgerBalance(data, 'Bank Loan');
  const shop = ledgerBalance(data, 'Retail Shop Transfer');
  const drawings = ledgerBalance(data, 'Owner Equity Return').out;
  const shopCredit = ledgerBalance(data, 'Shop Credit');

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.key as keyof typeof data, confirmDelete.id, 'Record deleted');
    setConfirmDelete(null);
  };

  const printVoucher = (v: Voucher) => {
    printVoucherSlip(<VoucherPrint voucherNo={v.voucherNo} date={fmtDate(v.date)} kind={v.kind} party={v.party} description={v.description} amount={v.amount} reference={v.reference} farmName={data.farmName} owner={data.owner} address={data.address} phone={data.phone} logo={data.logo} paymentMethod={v.paymentMethod} chequeNo={v.chequeNo} />);
  };

  const printExpense = (e: Expense) => {
    printExpenseSlip(<ExpensePrint date={fmtDate(e.date)} expenseClass={e.class} category={e.category} description={e.description} amount={e.amount} reference={e.reference} farmName={data.farmName} owner={data.owner} address={data.address} phone={data.phone} logo={data.logo} />);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Owner capital" value={LKR(cap.in)} sub={`Drawings ${LKR(drawings)}`} tone="green" icon={<Wallet size={18} />} />
        <Stat label="Bank loan outstanding" value={LKR(loan.net)} sub={`Received ${LKR(loan.in)} · Paid ${LKR(loan.out)}`} tone="red" icon={<Landmark size={18} />} />
        <Stat label="Shop transfers" value={LKR(shop.in)} sub="From retail shop entity" tone="blue" icon={<Store size={18} />} />
        <Stat label="Shop credit settled" value={LKR(shopCredit.out)} sub="Settlements to date" tone="yellow" icon={<UserCog size={18} />} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LEDGER_KINDS.map((k) => {
          const b = ledgerBalance(data, k);
          const icons: Record<string, React.ReactNode> = { Capital: <Wallet size={18} />, 'Retail Shop Transfer': <Store size={18} />, 'Bank Loan': <Landmark size={18} />, 'Shop Credit': <UserCog size={18} />, 'Owner Equity Return': <UserCog size={18} /> };
          return (
            <Card key={k} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-600 text-neutral-500 uppercase">{k}</span>
                <span className="text-primary-600">{icons[k]}</span>
              </div>
              <div className="mt-2 font-display text-xl font-800 text-neutral-900">{LKR(b.net)}</div>
              <div className="mt-1 text-xs text-neutral-500 flex gap-3">
                <span className="inline-flex items-center gap-1 text-success-700"><ArrowDownLeft size={12} /> {LKR(b.in)}</span>
                <span className="inline-flex items-center gap-1 text-error-700"><ArrowUpRight size={12} /> {LKR(b.out)}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <TabBar
        tabs={visibleTabs}
        value={activeTab}
        onChange={setTab}
      />

      {activeTab === 'ledger' && (canView('finance') ? (
        <Card className="p-5">
          <SectionTitle title="Capital, Funding & Liability Ledger" subtitle="Owner capital, retail shop transfers, loans & settlements" icon={<BookOpen size={18} />}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => exportCSV('ledger.csv', data.ledger as unknown as Record<string, unknown>[])}>Export</Button>
              {tabCanEdit && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'ledger' })}>Add Entry</Button>}
            </div>} />
          <DataTable
            rows={data.ledger}
            onRowClick={(l) => tabCanEdit && setModal({ kind: 'ledger', edit: l })}
            onEdit={(l) => setModal({ kind: 'ledger', edit: l })}
            onDelete={(l) => setConfirmDelete({ key: 'ledger', id: l.id, name: l.description || 'this entry' })}
            canEdit={tabCanEdit}
            columns={[
              { key: 'date', header: 'Date', render: (l) => fmtDate(l.date) },
              { key: 'kind', header: 'Account', render: (l) => <Badge tone={l.direction === 'In' ? 'green' : 'red'}>{l.kind}</Badge> },
              { key: 'dir', header: 'Direction', render: (l) => <span className={l.direction === 'In' ? 'text-success-700' : 'text-error-700'}>{l.direction === 'In' ? '↓ In' : '↑ Out'}</span> },
              { key: 'desc', header: 'Description', render: (l) => l.description },
              { key: 'ref', header: 'Reference', render: (l) => <span className="font-mono text-xs text-neutral-500">{l.reference || '—'}</span> },
              { key: 'amount', header: 'Amount', align: 'right', render: (l) => <span className="font-700">{LKR(l.amount)}</span> },
            ]}
          />
        </Card>
      ) : null)}

      {activeTab === 'vouchers' && (canView('vouchers') ? (
        <Card className="p-5">
          <SectionTitle title="Vouchers & Billing System" subtitle="Every expense, payout, sale & loan settlement generates a voucher" icon={<Printer size={18} />}
            action={tabCanEdit && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'voucher' })}>New Voucher</Button>} />
          <DataTable
            rows={data.vouchers}
            onRowClick={(v) => tabCanEdit && setModal({ kind: 'voucher', edit: v })}
            onEdit={(v) => setModal({ kind: 'voucher', edit: v })}
            onDelete={(v) => setConfirmDelete({ key: 'vouchers', id: v.id, name: v.voucherNo })}
            canEdit={tabCanEdit}
            columns={[
              { key: 'no', header: 'Voucher No.', render: (v) => <span className="font-mono font-700 text-primary-700">{v.voucherNo}</span> },
              { key: 'date', header: 'Date', render: (v) => fmtDate(v.date) },
              { key: 'kind', header: 'Type', render: (v) => <Badge tone={v.kind === 'Sales Receipt' ? 'green' : v.kind === 'Loan Settlement' ? 'red' : v.kind === 'Payroll' ? 'yellow' : 'blue'}>{v.kind}</Badge> },
              { key: 'party', header: 'Party', render: (v) => v.party },
              { key: 'desc', header: 'Description', render: (v) => v.description },
              { key: 'amount', header: 'Amount', align: 'right', render: (v) => <span className="font-700">{LKR(v.amount)}</span> },
              { key: 'act', header: 'Actions', render: (v) => (
                <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                  <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500" title="Print voucher" onClick={() => printVoucher(v)}><Printer size={15} /></button>
                </div>
              ) },
            ]}
          />
        </Card>
      ) : null)}

      {activeTab === 'expenses' && (canView('expenses') ? (
        <Card className="p-5">
          <SectionTitle title="Expense Log" subtitle="Classified expenses — fixed overheads, perennial, seasonal, nursery, payroll" icon={<Wallet size={18} />}
            action={tabCanEdit && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'expense' })}>Add Expense</Button>} />
          <DataTable
            rows={data.expenses}
            onRowClick={(e) => tabCanEdit && setModal({ kind: 'expense', edit: e })}
            onEdit={(e) => setModal({ kind: 'expense', edit: e })}
            onDelete={(e) => setConfirmDelete({ key: 'expenses', id: e.id, name: e.description || e.category || 'this expense' })}
            canEdit={tabCanEdit}
            columns={[
              { key: 'date', header: 'Date', render: (e) => fmtDate(e.date) },
              { key: 'class', header: 'Class', render: (e) => <Badge tone="blue">{e.class}</Badge> },
              { key: 'cat', header: 'Category', render: (e) => e.category || <span className="text-error-500">— missing —</span> },
              { key: 'desc', header: 'Description', render: (e) => e.description || <span className="text-error-500">— missing —</span> },
              { key: 'amount', header: 'Amount', align: 'right', render: (e) => <span className="font-700">{LKR(e.amount)}</span> },
              { key: 'act', header: 'Actions', render: (e) => (
                <div className="flex gap-1 justify-end" onClick={(e2) => e2.stopPropagation()}>
                  <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500" title="Print expense" onClick={() => printExpense(e)}><Printer size={15} /></button>
                </div>
              ) },
            ]}
          />
        </Card>
      ) : null)}

      {activeTab === 'development' && (canView('capex') ? (
        <Card className="p-5">
          <SectionTitle title="Farm Infrastructure & Development Costs" subtitle="Capital expenditure (CAPEX) — fencing, irrigation, land clearing, machinery" icon={<Hammer size={18} />}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => exportCSV('farm_developments.csv', data.farmDevelopments as unknown as Record<string, unknown>[])}>Export</Button>
              {tabCanEdit && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ kind: 'development' })}>Add Development</Button>}
            </div>} />
          <DataTable
            rows={data.farmDevelopments}
            onRowClick={(d) => tabCanEdit && setModal({ kind: 'development', edit: d })}
            onEdit={(d) => setModal({ kind: 'development', edit: d })}
            onDelete={(d) => setConfirmDelete({ key: 'farmDevelopments', id: d.id, name: d.name })}
            canEdit={tabCanEdit}
            columns={[
              { key: 'name', header: 'Asset / Development', render: (d) => <div><div className="font-600">{d.name}</div><div className="text-xs text-neutral-500">{d.description || '—'}</div></div> },
              { key: 'cat', header: 'Category', render: (d) => <Badge tone="blue">{d.category}</Badge> },
              { key: 'date', header: 'Implemented', render: (d) => fmtDate(d.implementationDate) },
              { key: 'lifespan', header: 'Lifespan', align: 'right', render: (d) => `${d.lifespanYears} yr` },
              { key: 'plot', header: 'Linked Plot', render: (d) => { const c = data.crops.find((x) => x.id === d.linkedPlotId); return c ? c.name : '—'; } },
              { key: 'cost', header: 'Total Cost', align: 'right', render: (d) => <span className="font-700 text-primary-700">{LKR(d.totalCost)}</span> },
            ]}
          />
        </Card>
      ) : null)}

      {modal && (
        modal.kind === 'ledger' ? <LedgerModal edit={modal.edit as LedgerEntry | undefined} onClose={() => setModal(null)} />
        : modal.kind === 'voucher' ? <VoucherModal edit={modal.edit as Voucher | undefined} onClose={() => setModal(null)} />
        : modal.kind === 'expense' ? <ExpenseModal edit={modal.edit as Expense | undefined} onClose={() => setModal(null)} />
        : <DevelopmentModal edit={modal.edit as FarmDevelopment | undefined} onClose={() => setModal(null)} />
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
}

function LedgerModal({ edit, onClose }: { edit?: LedgerEntry; onClose: () => void }) {
  const { data, save, update, nextVoucherNo } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<LedgerEntry>(edit || { id: newId('le'), date: todayISO(), kind: 'Capital', direction: 'In', description: '', amount: 0, reference: '' });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.date) e.date = true;
    if (!f.kind) e.kind = true;
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
    save('ledger', f, edit ? 'Ledger entry updated' : 'Ledger entry added');
    if (!edit) {
      const v = { id: newId('vo'), voucherNo: nextVoucherNo(), date: f.date, kind: (f.direction === 'In' ? 'Payment' : 'Loan Settlement') as Voucher['kind'], party: f.kind, description: f.description, amount: f.amount, reference: f.reference };
      update('vouchers', [v, ...data.vouchers]);
      upsertRow('vouchers', v as never).catch(() => {});
    }
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? 'Edit ledger entry' : 'Add ledger entry'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <DynamicSelect label="Account type *" moduleName="ledger_account" value={f.kind} onChange={(v) => setF({ ...f, kind: v as LedgerKind })} />
        <Select label="Direction" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as 'In' | 'Out' })}>
          <option value="In">In (received)</option><option value="Out">Out (paid/returned)</option>
        </Select>
        <Input label="Date *" type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Input label="Amount (Rs.) *" type="number" value={f.amount} error={errors.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
        <Input label="Reference" value={f.reference || ''} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <div className="sm:col-span-2"><Input label="Description *" value={f.description} error={errors.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? 'Save' : 'Save + voucher'}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title="Save this entry?"
        message="Are you sure you want to save this ledger entry?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}

function VoucherModal({ edit, onClose }: { edit?: Voucher; onClose: () => void }) {
  const { data, save, nextVoucherNo } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<Voucher>(edit || { id: newId('vo'), voucherNo: nextVoucherNo(), date: todayISO(), kind: 'Payment', party: '', description: '', amount: 0, reference: '', paymentMethod: 'Cash' });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.date) e.date = true;
    if (!f.party.trim()) e.party = true;
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
    save('vouchers', f, edit ? 'Voucher updated' : 'Voucher created');
    setConfirmSave(false);
    onClose();
  };
  const handlePrint = () => {
    if (!validate()) return;
    printVoucherSlip(<VoucherPrint voucherNo={f.voucherNo} date={fmtDate(f.date)} kind={f.kind} party={f.party} description={f.description} amount={f.amount} reference={f.reference} farmName={data.farmName} owner={data.owner} address={data.address} phone={data.phone} logo={data.logo} paymentMethod={f.paymentMethod} chequeNo={f.chequeNo} />);
  };
  return (
    <Modal open onClose={onClose} title={edit ? 'Edit voucher' : 'New voucher'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Voucher No." value={f.voucherNo} onChange={(e) => setF({ ...f, voucherNo: e.target.value })} />
        <Input label="Date *" type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <DynamicSelect label="Type *" moduleName="voucher_type" value={f.kind} onChange={(v) => setF({ ...f, kind: v as Voucher['kind'] })} />
        <Input label="Party *" value={f.party} error={errors.party} onChange={(e) => setF({ ...f, party: e.target.value })} />
        <Select label="Payment Method" value={f.paymentMethod || 'Cash'} onChange={(e) => setF({ ...f, paymentMethod: e.target.value as Voucher['paymentMethod'] })}>
          <option value="Cash">Cash</option>
          <option value="Cheque">Cheque</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </Select>
        <Input label="Cheque No." value={f.chequeNo || ''} onChange={(e) => setF({ ...f, chequeNo: e.target.value })} disabled={f.paymentMethod !== 'Cheque'} />
        <Input label="Amount (Rs.) *" type="number" value={f.amount} error={errors.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
        <Input label="Reference" value={f.reference || ''} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <div className="sm:col-span-2"><Input label="Description *" value={f.description} error={errors.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="outline" icon={<Printer size={15} />} onClick={handlePrint}>Print Voucher</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>Save</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title="Save this entry?"
        message="Are you sure you want to save this voucher?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}

function ExpenseModal({ edit, onClose }: { edit?: Expense; onClose: () => void }) {
  const { data, save, update, nextVoucherNo } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<Expense>(edit || { id: newId('ex'), date: todayISO(), class: 'Fixed Overhead', category: '', description: '', amount: 0, reference: '' });
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
    save('expenses', f, edit ? 'Expense updated' : 'Expense added');
    if (!edit) {
      const v = { id: newId('vo'), voucherNo: nextVoucherNo(), date: f.date, kind: 'Payment' as const, party: f.category, description: f.description, amount: f.amount, reference: f.reference };
      update('vouchers', [v, ...data.vouchers]);
      upsertRow('vouchers', v as never).catch(() => {});
    }
    setConfirmSave(false);
    onClose();
  };

  const handlePrint = () => {
    if (!validate()) return;
    printExpenseSlip(<ExpensePrint date={fmtDate(f.date)} expenseClass={f.class} category={f.category} description={f.description} amount={f.amount} reference={f.reference} farmName={data.farmName} owner={data.owner} address={data.address} phone={data.phone} logo={data.logo} />);
  };

  return (
    <Modal open onClose={onClose} title={edit ? 'Edit expense' : 'Add expense'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <DynamicSelect label="Expense class *" moduleName="expense_class" value={f.class} onChange={(v) => setF({ ...f, class: v as Expense['class'] })} placeholder="Select or add class" />
        <Input label="Date *" type="date" value={f.date} error={errors.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <DynamicSelect label="Category *" moduleName="expense_type" value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="Select or add category" />
        <Input label="Amount (Rs.) *" type="number" value={f.amount} error={errors.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} />
        <Input label="Reference" value={f.reference || ''} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <div className="sm:col-span-2"><Input label="Description *" value={f.description} error={errors.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="outline" icon={<Printer size={15} />} onClick={handlePrint}>Print Expense</Button>
        <Button onClick={() => { if (validate()) setConfirmSave(true); }}>{edit ? 'Save' : 'Save + voucher'}</Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={doSave}
        title="Save this entry?"
        message="Are you sure you want to save this expense?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}

function DevelopmentModal({ edit, onClose }: { edit?: FarmDevelopment; onClose: () => void }) {
  const { data, save } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState<FarmDevelopment>(edit || { id: newId('fd'), name: '', category: '', totalCost: 0, implementationDate: todayISO(), lifespanYears: 10, linkedPlotId: '', description: '' });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmSave, setConfirmSave] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!f.name.trim()) e.name = true;
    if (!f.category.trim()) e.category = true;
    if (!f.implementationDate) e.implementationDate = true;
    if (!f.totalCost || f.totalCost <= 0) e.totalCost = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast(`Please fill in all required fields: ${Object.keys(e).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`, 'error');
      return false;
    }
    return true;
  };

  const doSave = () => {
    save('farmDevelopments', f, edit ? 'Development cost updated' : 'Development cost added');
    setConfirmSave(false);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={edit ? 'Edit development cost' : 'Add development cost'} size="lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Development / Asset Name *" value={f.name} error={errors.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Drip Irrigation, Fencing" />
        <DynamicSelect label="Category *" moduleName="development_category" value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="Select or add category" />
        <Input label="Total Cost (LKR) *" type="number" value={f.totalCost} error={errors.totalCost} onChange={(e) => setF({ ...f, totalCost: +e.target.value })} />
        <Input label="Implementation Date *" type="date" value={f.implementationDate} error={errors.implementationDate} onChange={(e) => setF({ ...f, implementationDate: e.target.value })} />
        <Input label="Expected Lifespan (Years)" type="number" value={f.lifespanYears} onChange={(e) => setF({ ...f, lifespanYears: +e.target.value })} />
        <Select label="Linked Plot (optional)" value={f.linkedPlotId || ''} onChange={(e) => setF({ ...f, linkedPlotId: e.target.value })}>
          <option value="">— None —</option>
          {data.crops.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.plot}</option>)}
        </Select>
        <div className="sm:col-span-2"><Input label="Description" value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <div className="mt-4 p-3 rounded-xl bg-accent-50 text-sm">
        Annual Depreciation: <strong className="text-accent-700">{LKR(f.lifespanYears > 0 ? f.totalCost / f.lifespanYears : 0)}</strong>
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
        message="Are you sure you want to save this development cost?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </Modal>
  );
}
