import { useState, useRef, useEffect } from 'react';
import { Sprout, Users, Wallet, TrendingUp, TrendingDown, Send, Sparkles, Download, ArrowUpRight, ArrowDownRight, Leaf, ClipboardList, Lock, MapPin, Phone, Mail, Plus, CalendarDays, CheckCircle2, Circle, AlertTriangle, Hammer, ShoppingCart, ArrowRightLeft, BarChart3, FileText } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { LKR, fmtDate, downloadFile, toCSV, todayISO } from '@/lib/format';
import { farmOverallPnL, nurseryTotals, seasonPnL, allCropPnL, payrollMonthTotals, ledgerBalance } from '@/lib/calc';
import { askAssistant, SUGGESTED_QUERIES } from '@/lib/assistant';
import { Card, Stat, SectionTitle, Button, Badge } from '@/components/ui';
import { StatusBadge } from '@/components/DataTable';
import type { ModuleKey } from '@/components/nav';
import { UI_TEXT } from '@/lib/translations';

const FARM_HERO = 'https://images.pexels.com/photos/33971679/pexels-photo-33971679.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const FALLBACK_PORTRAIT = 'https://images.pexels.com/photos/17168814/pexels-photo-17168814.jpeg?auto=compress&cs=tinysrgb&h=200&w=200';

interface Msg { role: 'user' | 'ai'; text: string; report?: { title: string; rows: Record<string, string | number>[] }; }

export function Dashboard({ onNavigate }: { onNavigate: (k: ModuleKey) => void }) {
  const { data } = useStore();
  const { isAdmin, user } = useAuth();

  if (isAdmin) return <AdminDashboard data={data} user={user} onNavigate={onNavigate} />;
  return <DataEntryDashboard data={data} user={user} onNavigate={onNavigate} />;
}

// ═══════════════════════════════════════════════════════════
// ADMIN EXECUTIVE DASHBOARD
// ═══════════════════════════════════════════════════════════

function AdminDashboard({ data, user, onNavigate }: { data: ReturnType<typeof useStore>['data']; user: { displayName: string } | null; onNavigate: (k: ModuleKey) => void }) {
  const overall = farmOverallPnL(data);
  const nur = nurseryTotals(data);
  const yala = seasonPnL(data, 'Yala');
  const maha = seasonPnL(data, 'Maha');
  const monthISO = new Date().toISOString().slice(0, 7);
  const pay = payrollMonthTotals(data, monthISO);
  const loan = ledgerBalance(data, 'Bank Loan');
  const cap = ledgerBalance(data, 'Capital');
  const topCrops = [...allCropPnL(data)].sort((a, b) => b.profit - a.profit).slice(0, 4);
  const totalCapex = data.farmDevelopments.reduce((s, d) => s + d.totalCost, 0);
  const annualDepreciation = data.farmDevelopments.reduce((s, d) => s + (d.lifespanYears > 0 ? d.totalCost / d.lifespanYears : 0), 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0) + data.cropExpenses.reduce((s, e) => s + e.amount, 0);
  const totalRevenue = overall.revenue;

  // System alerts
  const alerts: { level: 'warning' | 'info' | 'error'; message: string }[] = [];
  if (loan.net > 0) alerts.push({ level: 'warning', message: `Bank loan outstanding: ${LKR(loan.net)}` });
  const lowStockBatches = data.nurseryBatches.filter((b) => b.status === 'Ready' && b.qtyUnits < 20);
  if (lowStockBatches.length > 0) alerts.push({ level: 'warning', message: `${lowStockBatches.length} nursery batch(es) running low on stock (< 20 units)` });
  const abandonedCrops = data.crops.filter((c) => c.status === 'Abandoned');
  if (abandonedCrops.length > 0) alerts.push({ level: 'info', message: `${abandonedCrops.length} crop plot(s) marked as abandoned` });
  if (data.workers.length === 0) alerts.push({ level: 'error', message: 'No workers registered — add staff to enable payroll' });
  const recentVouchers = data.vouchers.length;
  if (recentVouchers === 0) alerts.push({ level: 'info', message: 'No vouchers generated yet this period' });

  // AI assistant
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: `Hello! I'm your Agro financial assistant. Ask me about nursery profits, seasonal P&L, payroll, or ledgers. Try one of the suggestions below.` },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);

  const send = (q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    const res = askAssistant(data, q);
    setMsgs((m) => [...m, { role: 'user', text: q }, { role: 'ai', text: res.answer, report: res.report }]);
    setInput('');
    setTimeout(() => setBusy(false), 250);
  };

  const maxRevenue = Math.max(totalRevenue, 1);
  const revenuePct = Math.round((totalRevenue / (totalRevenue + totalExpenses || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl shadow-card-lg">
        <img src={FARM_HERO} alt="Tropical agro farm" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/85 via-primary-900/50 to-neutral-950/50" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 lg:p-8 text-white">
          <div className="flex items-start gap-4">
            <img src={data.profilePhoto || FALLBACK_PORTRAIT} alt="Farm owner" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg hidden sm:block" />
            <div>
              <Badge tone="green" className="bg-white/20 text-white">{(data.farmName || 'Your Farm')} · Yala & Maha cycles</Badge>
              <h2 className="mt-3 font-display text-2xl lg:text-3xl font-800 leading-tight">Selvar, {user?.displayName?.split(' ').slice(-1)[0] || data.owner.split(' ').slice(-1)[0]}.</h2>
              <p className="mt-1 text-primary-100 text-sm max-w-lg">
                Your farm, nursery and accounts — all in one place. Net profit to date is <span className="font-700 text-white">{LKR(overall.profit)}</span>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(data.address || data.phone || data.email) && (
                  <div className="flex flex-wrap gap-3 text-xs text-primary-100">
                    {data.address && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {data.address}</span>}
                    {data.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {data.phone}</span>}
                    {data.email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {data.email}</span>}
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon={<Sprout size={15} />} onClick={() => onNavigate('nursery')}>Nursery</Button>
                <Button variant="outline" size="sm" className="bg-white/15 border-white/30 text-white hover:bg-white/25" icon={<Wallet size={15} />} onClick={() => onNavigate('finance')}>Ledger</Button>
                <Button variant="outline" size="sm" className="bg-white/15 border-white/30 text-white hover:bg-white/25" icon={<TrendingUp size={15} />} onClick={() => onNavigate('crops')}>P&L</Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:gap-4 shrink-0">
            <HeroStat label={UI_TEXT.Revenue} value={LKR(overall.revenue)} />
            <HeroStat label={UI_TEXT.NetProfit2} value={LKR(overall.profit)} tone="yellow" />
            <HeroStat label={UI_TEXT.NurserySales2} value={LKR(nur.salesRevenue)} />
            <HeroStat label={UI_TEXT.LoanOutstanding} value={LKR(loan.net)} tone="yellow" />
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={UI_TEXT.MahaProfit} value={LKR(maha.profit)} sub={`${maha.revenue ? ((maha.profit / maha.revenue) * 100).toFixed(1) : 0}% margin`} tone="green" icon={<TrendingUp size={18} />} />
        <Stat label={UI_TEXT.YalaProfit} value={LKR(yala.profit)} sub={`${yala.revenue ? ((yala.profit / yala.revenue) * 100).toFixed(1) : 0}% margin`} tone="blue" icon={<TrendingUp size={18} />} />
        <Stat label={UI_TEXT.PayrollThisMonth} value={LKR(pay.total)} sub={`Perm ${LKR(pay.permanent)} · Casual ${LKR(pay.casual)}`} tone="yellow" icon={<Users size={18} />} />
        <Stat label={UI_TEXT.CapitalInjected} value={LKR(cap.in)} sub={`Owner drawings ${LKR(ledgerBalance(data, 'Owner Equity Return').out)}`} tone="neutral" icon={<Wallet size={18} />} />
      </div>

      {/* Revenue vs Expenses + Crop yields */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.RevenueVsExpenses} subtitle="Total income versus total costs across all operations" icon={<BarChart3 size={18} />} />
          <div className="space-y-4 mt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-600 text-neutral-700 flex items-center gap-1.5"><TrendingUp size={14} className="text-success-600" /> {UI_TEXT.TotalRevenue}</span>
                <span className="font-display font-800 text-success-700">{LKR(totalRevenue)}</span>
              </div>
              <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full bg-success-500 rounded-full transition-all" style={{ width: `${revenuePct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-600 text-neutral-700 flex items-center gap-1.5"><TrendingDown size={14} className="text-error-600" /> {UI_TEXT.TotalExpenses}</span>
                <span className="font-display font-800 text-error-700">{LKR(totalExpenses)}</span>
              </div>
              <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full bg-error-500 rounded-full transition-all" style={{ width: `${Math.round((totalExpenses / (totalRevenue + totalExpenses || 1)) * 100)}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-sm text-neutral-600">{UI_TEXT.NetProfitMargin}</span>
              <span className={`font-display font-800 text-lg ${overall.profit >= 0 ? 'text-success-700' : 'text-error-700'}`}>{overall.revenue ? ((overall.profit / overall.revenue) * 100).toFixed(1) : '0'}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title={UI_TEXT.CropYield} subtitle="Top crops by harvest volume" icon={<Leaf size={18} />} action={<Button size="sm" variant="ghost" onClick={() => onNavigate('crops')}>View all</Button>} />
          <div className="space-y-2.5 mt-2">
            {topCrops.map((p) => {
              const maxKg = Math.max(...topCrops.map((c) => c.harvestsKg), 1);
              const pct = Math.round((p.harvestsKg / maxKg) * 100);
              return (
                <div key={p.crop.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-600 text-neutral-700">{p.crop.name}</span>
                    <span className="text-xs text-neutral-500 tabular-nums">{p.harvestsKg} kg · {LKR(p.revenue)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {topCrops.length === 0 && <div className="text-sm text-neutral-400 py-4 text-center">No harvest data yet</div>}
          </div>
        </Card>
      </div>

      {/* CAPEX + Top crops */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.DevelopmentCAPEX} subtitle="Capital expenditure & depreciation" icon={<Hammer size={18} />} action={<Button size="sm" variant="ghost" onClick={() => onNavigate('finance')}>Open</Button>} />
          <div className="space-y-3 mt-2">
            <Row label={UI_TEXT.TotalCAPEX} value={LKR(totalCapex)} />
            <Row label={UI_TEXT.Projects} value={String(data.farmDevelopments.length)} />
            <Row label={UI_TEXT.AnnualDepreciation} value={LKR(Math.round(annualDepreciation))} tone="green" />
          </div>
          <div className="mt-3 space-y-1.5">
            {data.farmDevelopments.slice(0, 3).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-50">
                <span className="text-neutral-700 font-600">{d.name}</span>
                <span className="text-neutral-500 tabular-nums">{LKR(d.totalCost)}</span>
              </div>
            ))}
            {data.farmDevelopments.length === 0 && <div className="text-xs text-neutral-400">No development costs logged</div>}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle title={UI_TEXT.TopCropsProfit} subtitle="Across all seasons" icon={<Leaf size={18} />} action={<Button size="sm" variant="ghost" onClick={() => onNavigate('crops')}>View all</Button>} />
          <div className="space-y-2">
            {topCrops.map((p) => (
              <div key={p.crop.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 hover:border-primary-200 hover:bg-primary-50/30 transition">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-700 text-sm">{p.crop.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-600 text-sm text-neutral-900 truncate">{p.crop.name}</div>
                  <div className="text-xs text-neutral-500">{p.crop.plot} · {p.crop.season} · {p.crop.type}</div>
                </div>
                <div className="text-right">
                  <div className={`font-display font-800 text-sm ${p.profit >= 0 ? 'text-success-700' : 'text-error-700'}`}>{LKR(p.profit)}</div>
                  <div className="text-xs text-neutral-500">{p.margin.toFixed(1)}% · {p.harvestsKg} kg</div>
                </div>
                {p.profit >= 0 ? <ArrowUpRight size={16} className="text-success-600" /> : <ArrowDownRight size={16} className="text-error-600" />}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* System Alerts + Nursery glance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.SystemAlerts} subtitle="Items needing your attention" icon={<AlertTriangle size={18} />} />
          <div className="space-y-2 mt-2">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success-50 text-sm text-success-700">
                <CheckCircle2 size={16} /> {UI_TEXT.AllSystemsNormal}
              </div>
            ) : alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-3 rounded-xl text-sm ${a.level === 'error' ? 'bg-error-50 text-error-700' : a.level === 'warning' ? 'bg-secondary-50 text-secondary-700' : 'bg-primary-50 text-primary-700'}`}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title={UI_TEXT.NurseryGlance} icon={<Sprout size={18} />} action={<Button size="sm" variant="ghost" onClick={() => onNavigate('nursery')}>Open</Button>} />
          <div className="space-y-3">
            <Row label={UI_TEXT.BatchStatus} value={String(data.nurseryBatches.length)} />
            <Row label={UI_TEXT.ReadyUnits} value={String(data.nurseryBatches.filter((b) => b.status === 'Ready').reduce((s, b) => s + b.qtyUnits, 0))} />
            <Row label={UI_TEXT.SalesRevenue} value={LKR(nur.salesRevenue)} />
            <Row label={UI_TEXT.TransferCredit} value={LKR(nur.transferCredit)} />
            <Row label={UI_TEXT.NetProfitLabel} value={LKR(nur.netProfit)} tone="green" />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {data.nurseryBatches.slice(0, 4).map((b) => <StatusBadge key={b.id} status={b.status} />)}
          </div>
        </Card>
      </div>

      {/* AI Assistant */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-gradient-to-r from-accent-50 to-primary-50">
          <SectionTitle title="AI Financial Assistant" subtitle="Ask in plain language — answers + exportable reports" icon={<Sparkles size={18} />} />
        </div>
        <div ref={scrollRef} className="px-5 py-4 max-h-80 overflow-y-auto space-y-3 bg-neutral-50/40">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-accent-600 text-white' : 'bg-white border border-neutral-200 text-neutral-800'}`}>
                <p className="leading-relaxed">{m.text}</p>
                {m.report && (
                  <div className="mt-2 pt-2 border-t border-neutral-200/60">
                    <div className="text-xs font-600 text-neutral-600 mb-1">{m.report.title}</div>
                    <Button size="sm" variant="outline" icon={<Download size={13} />} onClick={() => downloadFile(`${m.report!.title.replace(/\s+/g, '_')}.csv`, toCSV(m.report!.rows as Record<string, unknown>[]), 'text/csv;charset=utf-8;')}>Export CSV</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="text-xs text-neutral-400 animate-pulse-soft">Assistant is thinking…</div>}
        </div>
        <div className="px-5 py-3 border-t border-neutral-200">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUGGESTED_QUERIES.map((q) => (
              <button key={q} onClick={() => send(q)} className="text-[11px] px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 transition">{q}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask: Show Maha season profit for capsicum…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-100 outline-none"
            />
            <Button type="submit" icon={<Send size={15} />} disabled={busy || !input.trim()}>Ask</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DATA ENTRY OPERATIONAL DASHBOARD
// ═══════════════════════════════════════════════════════════

function DataEntryDashboard({ data, user, onNavigate }: { data: ReturnType<typeof useStore>['data']; user: { displayName: string } | null; onNavigate: (k: ModuleKey) => void }) {
  const recentEntries = data.nurseryBatches.length + data.attendance.length + data.cropExpenses.length;
  const today = todayISO();
  const todaysAttendance = data.attendance.filter((a) => a.date === today);
  const readyBatches = data.nurseryBatches.filter((b) => b.status === 'Ready');
  const growingBatches = data.nurseryBatches.filter((b) => b.status === 'Growing');
  const activeCrops = data.crops.filter((c) => c.status === 'Active');

  // Task checklist (dynamic based on data state)
  const tasks: { label: string; done: boolean }[] = [
    { label: UI_TEXT.RecordAttendance, done: todaysAttendance.length > 0 },
    { label: UI_TEXT.LogNurseryCosts, done: data.nurseryCosts.some((c) => c.date === today) },
    { label: UI_TEXT.AddCropExpensesToday, done: data.cropExpenses.some((e) => e.date === today) },
    { label: UI_TEXT.RecordHarvestSales, done: data.cropHarvests.some((h) => h.date === today) },
    { label: UI_TEXT.UpdateBatchStatuses, done: growingBatches.length === 0 || readyBatches.length > 0 },
  ];
  const completedTasks = tasks.filter((t) => t.done).length;

  return (
    <div className="space-y-6">
      {/* Hero — operational, no financial data */}
      <div className="relative overflow-hidden rounded-2xl shadow-card-lg">
        <img src={FARM_HERO} alt="Farm" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/85 via-primary-900/50 to-neutral-950/50" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 lg:p-8 text-white">
          <div className="flex items-start gap-4">
            <img src={data.profilePhoto || FALLBACK_PORTRAIT} alt="User" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg hidden sm:block" />
            <div>
              <Badge tone="green" className="bg-white/20 text-white">Data Entry Operator (දත්ත ඇතුළත් කිරීම් කර්මිකයා)</Badge>
              <h2 className="mt-3 font-display text-2xl lg:text-3xl font-800 leading-tight">Welcome, {user?.displayName?.split(' ').slice(-1)[0] || 'Operator'}.</h2>
              <p className="mt-1 text-primary-100 text-sm max-w-lg">
                You have submitted <span className="font-700 text-white">{recentEntries}</span> records across nursery, labor, and crops. {completedTasks}/{tasks.length} daily tasks complete.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon={<ClipboardList size={15} />} onClick={() => onNavigate('dataentry')}>Go to Data Entry (දත්ත ඇතුළත් කිරීමට යන්න)</Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:gap-4 shrink-0">
            <HeroStat label={UI_TEXT.BatchStatus} value={String(data.nurseryBatches.length)} />
            <HeroStat label={UI_TEXT.AttendanceTasks} value={String(data.attendance.length)} />
            <HeroStat label={UI_TEXT.CropExpenses2} value={String(data.cropExpenses.length)} />
            <HeroStat label={UI_TEXT.TotalRecords} value={String(recentEntries)} tone="yellow" />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <Card className="p-5">
        <SectionTitle title={UI_TEXT.QuickActions} subtitle="Jump straight to common data entry tasks" icon={<Plus size={18} />} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          <QuickAction icon={<Wallet size={20} />} label={UI_TEXT.NewExpense} color="bg-error-50 text-error-600 border-error-200" onClick={() => onNavigate('dataentry')} />
          <QuickAction icon={<Leaf size={20} />} label={UI_TEXT.NewHarvest} color="bg-success-50 text-success-600 border-success-200" onClick={() => onNavigate('dataentry')} />
          <QuickAction icon={<Users size={20} />} label={UI_TEXT.NewAttendance} color="bg-secondary-50 text-secondary-600 border-secondary-200" onClick={() => onNavigate('dataentry')} />
          <QuickAction icon={<Sprout size={20} />} label={UI_TEXT.NewNurseryBatch} color="bg-primary-50 text-primary-600 border-primary-200" onClick={() => onNavigate('dataentry')} />
        </div>
      </Card>

      {/* KPI grid — operational, no financials */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={UI_TEXT.NurseryEntries} value={String(data.nurseryBatches.length)} sub="Total batches" tone="green" icon={<Sprout size={18} />} />
        <Stat label={UI_TEXT.LaborEntries} value={String(data.attendance.length)} sub="Attendance records" tone="yellow" icon={<Users size={18} />} />
        <Stat label={UI_TEXT.CropExpenses2} value={String(data.cropExpenses.length)} sub="Field inputs logged" tone="blue" icon={<Leaf size={18} />} />
        <Stat label={UI_TEXT.TodaysAttendance} value={String(todaysAttendance.length)} sub="Records logged today" tone="neutral" icon={<CalendarDays size={18} />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily Task Checklist */}
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.DailyTaskChecklist} subtitle={`${completedTasks}/${tasks.length} completed`} icon={<CheckCircle2 size={18} />} />
          <div className="space-y-2 mt-2">
            {tasks.map((t, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition ${t.done ? 'border-success-200 bg-success-50/40' : 'border-neutral-100'}`}>
                {t.done ? <CheckCircle2 size={18} className="text-success-600 shrink-0" /> : <Circle size={18} className="text-neutral-300 shrink-0" />}
                <span className={`text-sm ${t.done ? 'text-neutral-500 line-through' : 'text-neutral-700 font-600'}`}>{t.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-neutral-100 overflow-hidden">
            <div className="h-full bg-success-500 rounded-full transition-all" style={{ width: `${(completedTasks / tasks.length) * 100}%` }} />
          </div>
        </Card>

        {/* Recent Entries */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title={UI_TEXT.RecentEntries} subtitle="Your latest data submissions" icon={<ClipboardList size={18} />} action={<Button size="sm" variant="ghost" onClick={() => onNavigate('dataentry')}>Add more (තව එක් කරන්න)</Button>} />
          <div className="space-y-2">
            {data.nurseryBatches.slice(0, 3).map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center"><Sprout size={18} /></div>
                <div className="flex-1"><div className="font-600 text-sm">{b.code} — {b.variety}</div><div className="text-xs text-neutral-500">{b.qtyUnits} {b.unitType} · {b.category}</div></div>
                <StatusBadge status={b.status} />
              </div>
            ))}
            {data.attendance.slice(0, 2).map((a) => {
              const w = data.workers.find((x) => x.id === a.workerId);
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100">
                  <div className="w-10 h-10 rounded-lg bg-secondary-100 text-secondary-700 flex items-center justify-center"><Users size={18} /></div>
                  <div className="flex-1"><div className="font-600 text-sm">{w?.name || 'Worker'}</div><div className="text-xs text-neutral-500">{a.date} · {a.taskPlot || '—'}</div></div>
                  <StatusBadge status={a.status} />
                </div>
              );
            })}
            {data.cropExpenses.slice(0, 2).map((e) => {
              const c = data.crops.find((x) => x.id === e.cropId);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100">
                  <div className="w-10 h-10 rounded-lg bg-success-100 text-success-700 flex items-center justify-center"><Leaf size={18} /></div>
                  <div className="flex-1"><div className="font-600 text-sm">{e.category}</div><div className="text-xs text-neutral-500">{c?.name || '—'} · {fmtDate(e.date)}</div></div>
                  <span className="text-xs text-neutral-500">{e.amount > 0 ? 'Logged' : '—'}</span>
                </div>
              );
            })}
            {recentEntries === 0 && <div className="text-sm text-neutral-400 py-4 text-center">No entries yet. Use Quick Actions to get started. (තවම සටහන් නැත. ආරම්භ කිරීමට ඉක්මන් ක්‍රියා භාවිතා කරන්න.)</div>}
          </div>
        </Card>
      </div>

      {/* Nursery & Crop Status Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle title={UI_TEXT.NurseryStatus} subtitle="Batch production overview" icon={<Sprout size={18} />} />
          <div className="grid grid-cols-3 gap-3 mt-2">
            <StatusCard label={UI_TEXT.Growing2} count={growingBatches.length} tone="yellow" icon={<Sprout size={16} />} />
            <StatusCard label={UI_TEXT.Ready2} count={readyBatches.length} tone="green" icon={<CheckCircle2 size={16} />} />
            <StatusCard label={UI_TEXT.Total2} count={data.nurseryBatches.length} tone="blue" icon={<ClipboardList size={16} />} />
          </div>
          <div className="mt-3 space-y-1.5">
            {data.nurseryBatches.slice(0, 4).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-50">
                <span className="text-neutral-700 font-600">{b.code} · {b.variety}</span>
                <StatusBadge status={b.status} />
              </div>
            ))}
            {data.nurseryBatches.length === 0 && <div className="text-xs text-neutral-400">No batches yet (තවම සමුළු නැත)</div>}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title={UI_TEXT.CropPlotStatus} subtitle="Active field plots" icon={<Leaf size={18} />} />
          <div className="grid grid-cols-3 gap-3 mt-2">
            <StatusCard label={UI_TEXT.Active2} count={activeCrops.length} tone="green" icon={<Leaf size={16} />} />
            <StatusCard label={UI_TEXT.Harvested2} count={data.crops.filter((c) => c.status === 'Harvested').length} tone="blue" icon={<CheckCircle2 size={16} />} />
            <StatusCard label={UI_TEXT.Total2} count={data.crops.length} tone="yellow" icon={<ClipboardList size={16} />} />
          </div>
          <div className="mt-3 space-y-1.5">
            {activeCrops.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-50">
                <span className="text-neutral-700 font-600">{c.name} · {c.plot}</span>
                <Badge tone={c.type === 'Perennial' ? 'blue' : 'green'}>{c.type}</Badge>
              </div>
            ))}
            {activeCrops.length === 0 && <div className="text-xs text-neutral-400">No active crops (ක්‍රියාකාරී බෝග නැත)</div>}
          </div>
        </Card>
      </div>

      {/* Access level notice */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-100 text-secondary-600 flex items-center justify-center shrink-0"><Lock size={20} /></div>
          <div>
            <div className="font-600 text-sm text-neutral-800">{UI_TEXT.YourAccessLevel}</div>
            <div className="text-xs text-neutral-500 mt-1">You can submit nursery, labor, and crop records. Financial totals, profit margins, and P&L charts are visible to Admin only. Your submissions will be reviewed by the farm administrator.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Shared components ───

function HeroStat({ label, value, tone = 'white' }: { label: string; value: string; tone?: 'white' | 'yellow' }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3 min-w-[140px]">
      <div className="text-[11px] uppercase tracking-wide text-primary-100">{label}</div>
      <div className={`mt-1 font-display text-lg font-800 ${tone === 'yellow' ? 'text-secondary-200' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={`font-700 ${tone === 'green' ? 'text-success-700' : 'text-neutral-900'}`}>{value}</span>
    </div>
  );
}

function QuickAction({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition hover:scale-[1.02] hover:shadow-card ${color}`}>
      {icon}
      <span className="text-sm font-700">{label}</span>
    </button>
  );
}

function StatusCard({ label, count, tone, icon }: { label: string; count: number; tone: 'green' | 'yellow' | 'blue'; icon: React.ReactNode }) {
  const tones: Record<string, string> = {
    green: 'bg-success-50 text-success-700 border-success-200',
    yellow: 'bg-secondary-50 text-secondary-700 border-secondary-200',
    blue: 'bg-primary-50 text-primary-700 border-primary-200',
  };
  return (
    <div className={`p-3 rounded-xl border ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs font-600">{icon} {label}</div>
      <div className="font-display text-2xl font-800 mt-1">{count}</div>
    </div>
  );
}
