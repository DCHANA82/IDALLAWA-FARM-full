import { supabase } from './supabase';
import type {
  AppData, AppSettings, Crop, CropExpense, CropHarvest, NurseryBatch, NurseryCost,
  NurserySale, NurseryTransfer, Worker, Attendance, Voucher, LedgerEntry, Expense, StaffUser,
  FarmDevelopment, PermissionEntry, PermissionModule, ModuleAccess,
  EmployeeAdvance, AdvanceRecovery, SalaryPayment,
} from './types';

// ─── Column mapping helpers ───

function toCrop(r: Record<string, unknown>): Crop {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as Crop['type'],
    season: r.season as Crop['season'],
    plot: r.plot as string,
    areaAcres: Number(r.area_acres),
    plantedDate: r.planted_date as string,
    status: r.status as Crop['status'],
    notes: (r.notes as string) || undefined,
    bearingStartYear: (r.bearing_start_year as string) || undefined,
    perennialStatus: (r.perennial_status as Crop['perennialStatus']) || undefined,
  };
}
function fromCrop(c: Crop): Record<string, unknown> {
  return { id: c.id, name: c.name, type: c.type, season: c.season, plot: c.plot, area_acres: c.areaAcres, planted_date: c.plantedDate, status: c.status, notes: c.notes || null, bearing_start_year: c.bearingStartYear || null, perennial_status: c.perennialStatus || null };
}

function toCropExpense(r: Record<string, unknown>): CropExpense {
  return { id: r.id as string, cropId: r.crop_id as string, date: r.date as string, category: r.category as string, description: r.description as string, amount: Number(r.amount), reference: (r.reference as string) || undefined };
}
function fromCropExpense(e: CropExpense): Record<string, unknown> {
  return { id: e.id, crop_id: e.cropId, date: e.date, category: e.category, description: e.description, amount: e.amount, reference: e.reference || null };
}

function toCropHarvest(r: Record<string, unknown>): CropHarvest {
  return { id: r.id as string, cropId: r.crop_id as string, date: r.date as string, quantityKg: Number(r.quantity_kg), unitPrice: Number(r.unit_price), buyer: r.buyer as string };
}
function fromCropHarvest(h: CropHarvest): Record<string, unknown> {
  return { id: h.id, crop_id: h.cropId, date: h.date, quantity_kg: h.quantityKg, unit_price: h.unitPrice, buyer: h.buyer };
}

function toNurseryBatch(r: Record<string, unknown>): NurseryBatch {
  return { id: r.id as string, code: r.code as string, category: r.category as NurseryBatch['category'], variety: r.variety as string, startDate: r.start_date as string, qtyUnits: Number(r.qty_units), unitType: r.unit_type as string, unitCost: Number(r.unit_cost), status: r.status as NurseryBatch['status'] };
}
function fromNurseryBatch(b: NurseryBatch): Record<string, unknown> {
  return { id: b.id, code: b.code, category: b.category, variety: b.variety, start_date: b.startDate, qty_units: b.qtyUnits, unit_type: b.unitType, unit_cost: b.unitCost, status: b.status };
}

function toNurseryCost(r: Record<string, unknown>): NurseryCost {
  return { id: r.id as string, batchId: r.batch_id as string, date: r.date as string, category: r.category as string, description: r.description as string, amount: Number(r.amount) };
}
function fromNurseryCost(c: NurseryCost): Record<string, unknown> {
  return { id: c.id, batch_id: c.batchId, date: c.date, category: c.category, description: c.description, amount: c.amount };
}

function toNurserySale(r: Record<string, unknown>): NurserySale {
  return { id: r.id as string, batchId: r.batch_id as string, date: r.date as string, buyer: r.buyer as string, qty: Number(r.qty), unitPrice: Number(r.unit_price), invoiceNo: r.invoice_no as string };
}
function fromNurserySale(s: NurserySale): Record<string, unknown> {
  return { id: s.id, batch_id: s.batchId, date: s.date, buyer: s.buyer, qty: s.qty, unit_price: s.unitPrice, invoice_no: s.invoiceNo };
}

function toNurseryTransfer(r: Record<string, unknown>): NurseryTransfer {
  return { id: r.id as string, batchId: r.batch_id as string, date: r.date as string, cropId: r.crop_id as string, qty: Number(r.qty), unitValue: Number(r.unit_value) };
}
function fromNurseryTransfer(t: NurseryTransfer): Record<string, unknown> {
  return { id: t.id, batch_id: t.batchId, date: t.date, crop_id: t.cropId, qty: t.qty, unit_value: t.unitValue };
}

function toWorker(r: Record<string, unknown>): Worker {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as Worker['type'],
    employmentType: (r.employment_type as Worker['employmentType']) || (r.type === 'Permanent' ? 'MONTHLY' : 'DAILY'),
    phone: (r.phone as string) || undefined,
    role: r.role as string,
    monthlyBasic: Number(r.monthly_basic),
    allowances: Number(r.allowances),
    dailyWage: Number(r.daily_wage),
    baseMonthlySalary: r.base_monthly_salary != null ? Number(r.base_monthly_salary) : undefined,
    defaultDailyRate: r.default_daily_rate != null ? Number(r.default_daily_rate) : undefined,
  };
}
function fromWorker(w: Worker): Record<string, unknown> {
  return {
    id: w.id, name: w.name, type: w.type,
    employment_type: w.employmentType || (w.type === 'Permanent' ? 'MONTHLY' : 'DAILY'),
    phone: w.phone || '', role: w.role,
    monthly_basic: w.monthlyBasic, allowances: w.allowances, daily_wage: w.dailyWage,
    base_monthly_salary: w.baseMonthlySalary ?? null,
    default_daily_rate: w.defaultDailyRate ?? null,
  };
}

function toAttendance(r: Record<string, unknown>): Attendance {
  const allocType = (r.allocation_type as string) || undefined;
  const fuelAlloc = (r.fuel_allocation as string) || undefined;
  return {
    id: r.id as string,
    workerId: r.worker_id as string,
    date: r.date as string,
    status: r.status as Attendance['status'],
    taskPlot: (r.task_plot as string) || undefined,
    hours: Number(r.hours),
    amount: Number(r.amount),
    overrideRate: r.override_rate != null ? Number(r.override_rate) : undefined,
    fuelTransportAllowance: Number(r.fuel_transport_allowance) || 0,
    attendanceAllowance: Number(r.attendance_allowance) || 0,
    otherAllowances: Number(r.other_allowances) || 0,
    fuelAllocation: fuelAlloc ? (fuelAlloc as 'CROP' | 'OVERHEAD') : undefined,
    fuelCropId: (r.fuel_crop_id as string) || undefined,
    expenseAllocation: allocType ? {
      allocationType: allocType as 'CROP' | 'FARM_DEVELOPMENT',
      cropId: (r.crop_id as string) || undefined,
      plotId: (r.plot_id as string) || undefined,
      activity: (r.activity as string) || undefined,
      developmentCategory: (r.development_category as string) || undefined,
      workDetails: (r.work_details as string) || undefined,
    } : undefined,
  };
}
function fromAttendance(a: Attendance): Record<string, unknown> {
  return {
    id: a.id,
    worker_id: a.workerId,
    date: a.date,
    status: a.status,
    task_plot: a.taskPlot || '',
    hours: a.hours,
    amount: a.amount,
    override_rate: a.overrideRate ?? null,
    fuel_transport_allowance: a.fuelTransportAllowance || 0,
    attendance_allowance: a.attendanceAllowance || 0,
    other_allowances: a.otherAllowances || 0,
    fuel_allocation: a.fuelAllocation || null,
    fuel_crop_id: a.fuelCropId || null,
    allocation_type: a.expenseAllocation?.allocationType || null,
    crop_id: a.expenseAllocation?.cropId || null,
    plot_id: a.expenseAllocation?.plotId || null,
    activity: a.expenseAllocation?.activity || null,
    development_category: a.expenseAllocation?.developmentCategory || null,
    work_details: a.expenseAllocation?.workDetails || null,
  };
}

function toVoucher(r: Record<string, unknown>): Voucher {
  return { id: r.id as string, voucherNo: r.voucher_no as string, date: r.date as string, kind: r.kind as Voucher['kind'], party: r.party as string, description: r.description as string, amount: Number(r.amount), reference: (r.reference as string) || undefined, paymentMethod: (r.payment_method as Voucher['paymentMethod']) || undefined, chequeNo: (r.cheque_no as string) || undefined };
}
function fromVoucher(v: Voucher): Record<string, unknown> {
  return { id: v.id, voucher_no: v.voucherNo, date: v.date, kind: v.kind, party: v.party, description: v.description, amount: v.amount, reference: v.reference || null, payment_method: v.paymentMethod || null, cheque_no: v.chequeNo || null };
}

function toLedgerEntry(r: Record<string, unknown>): LedgerEntry {
  return { id: r.id as string, date: r.date as string, kind: r.kind as LedgerEntry['kind'], direction: r.direction as LedgerEntry['direction'], description: r.description as string, amount: Number(r.amount), reference: (r.reference as string) || undefined };
}
function fromLedgerEntry(l: LedgerEntry): Record<string, unknown> {
  return { id: l.id, date: l.date, kind: l.kind, direction: l.direction, description: l.description, amount: l.amount, reference: l.reference || null };
}

function toExpense(r: Record<string, unknown>): Expense {
  return { id: r.id as string, date: r.date as string, class: r.class as Expense['class'], category: r.category as string, description: r.description as string, amount: Number(r.amount), reference: (r.reference as string) || undefined };
}
function fromExpense(e: Expense): Record<string, unknown> {
  return { id: e.id, date: e.date, class: e.class, category: e.category, description: e.description, amount: e.amount, reference: e.reference || null };
}

function toFarmDevelopment(r: Record<string, unknown>): FarmDevelopment {
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    totalCost: Number(r.total_cost),
    implementationDate: r.implementation_date as string,
    lifespanYears: Number(r.lifespan_years),
    linkedPlotId: (r.linked_plot_id as string) || undefined,
    description: (r.description as string) || undefined,
  };
}
function fromFarmDevelopment(d: FarmDevelopment): Record<string, unknown> {
  return { id: d.id, name: d.name, category: d.category, total_cost: d.totalCost, implementation_date: d.implementationDate, lifespan_years: d.lifespanYears, linked_plot_id: d.linkedPlotId || null, description: d.description || null };
}

function toEmployeeAdvance(r: Record<string, unknown>): EmployeeAdvance {
  return {
    id: r.id as string,
    workerId: r.worker_id as string,
    advanceDate: r.advance_date as string,
    amount: Number(r.amount),
    recoveredAmount: Number(r.recovered_amount),
    remainingBalance: Number(r.remaining_balance),
    paymentMethod: (r.payment_method as EmployeeAdvance['paymentMethod']) || 'Cash',
    reference: (r.reference as string) || undefined,
    recoveryTarget: (r.recovery_target as EmployeeAdvance['recoveryTarget']) || 'ANY',
    status: (r.status as EmployeeAdvance['status']) || 'Outstanding',
    createdAt: (r.created_at as string) || undefined,
  };
}
function fromEmployeeAdvance(a: EmployeeAdvance): Record<string, unknown> {
  return {
    id: a.id, worker_id: a.workerId, advance_date: a.advanceDate,
    amount: a.amount, recovered_amount: a.recoveredAmount, remaining_balance: a.remainingBalance,
    payment_method: a.paymentMethod, reference: a.reference || null,
    recovery_target: a.recoveryTarget, status: a.status,
  };
}

function toAdvanceRecovery(r: Record<string, unknown>): AdvanceRecovery {
  return {
    id: r.id as string,
    advanceId: r.advance_id as string,
    workerId: r.worker_id as string,
    recoveryDate: r.recovery_date as string,
    amount: Number(r.amount),
    source: (r.source as AdvanceRecovery['source']) || 'DAILY',
    salaryPaymentId: (r.salary_payment_id as string) || undefined,
    reference: (r.reference as string) || undefined,
  };
}
function fromAdvanceRecovery(r: AdvanceRecovery): Record<string, unknown> {
  return {
    id: r.id, advance_id: r.advanceId, worker_id: r.workerId,
    recovery_date: r.recoveryDate, amount: r.amount, source: r.source,
    salary_payment_id: r.salaryPaymentId || null, reference: r.reference || null,
  };
}

function toSalaryPayment(r: Record<string, unknown>): SalaryPayment {
  return {
    id: r.id as string,
    workerId: r.worker_id as string,
    salaryType: (r.salary_type as SalaryPayment['salaryType']) || 'DAILY',
    workDate: r.work_date as string,
    paymentDate: r.payment_date as string,
    payMonth: r.pay_month as string,
    grossAmount: Number(r.gross_amount),
    allowances: Number(r.allowances),
    advanceDeduction: Number(r.advance_deduction),
    otherDeductions: Number(r.other_deductions),
    netAmount: Number(r.net_amount),
    paymentMethod: (r.payment_method as SalaryPayment['paymentMethod']) || 'Cash',
    reference: (r.reference as string) || undefined,
    daysWorked: Number(r.days_worked) || 0,
    status: (r.status as SalaryPayment['status']) || 'Paid',
    attendanceIds: (r.attendance_ids as string) || undefined,
  };
}
function fromSalaryPayment(p: SalaryPayment): Record<string, unknown> {
  return {
    id: p.id, worker_id: p.workerId, salary_type: p.salaryType,
    work_date: p.workDate, payment_date: p.paymentDate, pay_month: p.payMonth,
    gross_amount: p.grossAmount, allowances: p.allowances,
    advance_deduction: p.advanceDeduction, other_deductions: p.otherDeductions,
    net_amount: p.netAmount, payment_method: p.paymentMethod,
    reference: p.reference || null, days_worked: p.daysWorked,
    status: p.status, attendance_ids: p.attendanceIds || null,
  };
}

// ─── Load all data from Supabase ───

export async function loadAllData(): Promise<AppData> {
  const [
    profile, crops, cropExp, cropHarv, nurBatch, nurCost, nurSale, nurTrans,
    workers, attend, vouchers, ledger, expenses, farmDev,
    empAdv, advRec, salPay,
  ] = await Promise.all([
    supabase.from('farm_profile').select('*').eq('id', 'singleton').maybeSingle(),
    supabase.from('crops').select('*'),
    supabase.from('crop_expenses').select('*'),
    supabase.from('crop_harvests').select('*'),
    supabase.from('nursery_batches').select('*'),
    supabase.from('nursery_costs').select('*'),
    supabase.from('nursery_sales').select('*'),
    supabase.from('nursery_transfers').select('*'),
    supabase.from('workers').select('*'),
    supabase.from('attendance').select('*'),
    supabase.from('vouchers').select('*'),
    supabase.from('ledger_entries').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('farm_developments').select('*'),
    supabase.from('employee_advances').select('*'),
    supabase.from('advance_recoveries').select('*'),
    supabase.from('salary_payments').select('*'),
  ]);

  const errMsg = [profile.error, crops.error, cropExp.error, cropHarv.error, nurBatch.error, nurCost.error, nurSale.error, nurTrans.error, workers.error, attend.error, vouchers.error, ledger.error, expenses.error, farmDev.error, empAdv.error, advRec.error, salPay.error].find(Boolean);
  if (errMsg) throw errMsg;

  return {
    farmName: (profile.data?.farm_name as string) || '',
    owner: (profile.data?.owner as string) || '',
    profilePhoto: (profile.data?.profile_photo as string) || undefined,
    logo: (profile.data?.logo as string) || undefined,
    loginBgUrl: (profile.data?.login_bg_url as string) || undefined,
    dashboardBgUrl: (profile.data?.dashboard_bg_url as string) || undefined,
    loginBgBrightness: (profile.data?.login_bg_brightness as number) ?? undefined,
    loginBgOverlay: (profile.data?.login_bg_overlay as number) ?? undefined,
    loginBgBlur: (profile.data?.login_bg_blur as number) ?? undefined,
    dashboardBgBrightness: (profile.data?.dashboard_bg_brightness as number) ?? undefined,
    dashboardBgOverlay: (profile.data?.dashboard_bg_overlay as number) ?? undefined,
    dashboardBgBlur: (profile.data?.dashboard_bg_blur as number) ?? undefined,
    address: (profile.data?.address as string) || undefined,
    phone: (profile.data?.phone as string) || undefined,
    email: (profile.data?.email as string) || undefined,
    crops: (crops.data as Record<string, unknown>[] || []).map(toCrop),
    cropExpenses: (cropExp.data as Record<string, unknown>[] || []).map(toCropExpense),
    cropHarvests: (cropHarv.data as Record<string, unknown>[] || []).map(toCropHarvest),
    nurseryBatches: (nurBatch.data as Record<string, unknown>[] || []).map(toNurseryBatch),
    nurseryCosts: (nurCost.data as Record<string, unknown>[] || []).map(toNurseryCost),
    nurserySales: (nurSale.data as Record<string, unknown>[] || []).map(toNurserySale),
    nurseryTransfers: (nurTrans.data as Record<string, unknown>[] || []).map(toNurseryTransfer),
    workers: (workers.data as Record<string, unknown>[] || []).map(toWorker),
    attendance: (attend.data as Record<string, unknown>[] || []).map(toAttendance),
    vouchers: (vouchers.data as Record<string, unknown>[] || []).map(toVoucher),
    ledger: (ledger.data as Record<string, unknown>[] || []).map(toLedgerEntry),
    expenses: (expenses.data as Record<string, unknown>[] || []).map(toExpense),
    farmDevelopments: (farmDev.data as Record<string, unknown>[] || []).map(toFarmDevelopment),
    employeeAdvances: (empAdv.data as Record<string, unknown>[] || []).map(toEmployeeAdvance),
    advanceRecoveries: (advRec.data as Record<string, unknown>[] || []).map(toAdvanceRecovery),
    salaryPayments: (salPay.data as Record<string, unknown>[] || []).map(toSalaryPayment),
  };
}

// ─── Upsert (insert-or-update) a single row ───

type TableKey =
  | 'crops' | 'crop_expenses' | 'crop_harvests' | 'nursery_batches'
  | 'nursery_costs' | 'nursery_sales' | 'nursery_transfers' | 'workers'
  | 'attendance' | 'vouchers' | 'ledger_entries' | 'expenses' | 'farm_developments'
  | 'employee_advances' | 'advance_recoveries' | 'salary_payments';

const tableMap: Record<keyof AppData, TableKey | null> = {
  farmName: null, owner: null, profilePhoto: null, logo: null,
  address: null, phone: null, email: null,
  crops: 'crops', cropExpenses: 'crop_expenses', cropHarvests: 'crop_harvests',
  nurseryBatches: 'nursery_batches', nurseryCosts: 'nursery_costs',
  nurserySales: 'nursery_sales', nurseryTransfers: 'nursery_transfers',
  workers: 'workers', attendance: 'attendance', vouchers: 'vouchers',
  ledger: 'ledger_entries', expenses: 'expenses',
  farmDevelopments: 'farm_developments',
  employeeAdvances: 'employee_advances',
  advanceRecoveries: 'advance_recoveries',
  salaryPayments: 'salary_payments',
};

const converters: Record<TableKey, { to: (item: never) => Record<string, unknown> }> = {
  crops: { to: fromCrop as never },
  crop_expenses: { to: fromCropExpense as never },
  crop_harvests: { to: fromCropHarvest as never },
  nursery_batches: { to: fromNurseryBatch as never },
  nursery_costs: { to: fromNurseryCost as never },
  nursery_sales: { to: fromNurserySale as never },
  nursery_transfers: { to: fromNurseryTransfer as never },
  workers: { to: fromWorker as never },
  attendance: { to: fromAttendance as never },
  vouchers: { to: fromVoucher as never },
  ledger_entries: { to: fromLedgerEntry as never },
  expenses: { to: fromExpense as never },
  farm_developments: { to: fromFarmDevelopment as never },
  employee_advances: { to: fromEmployeeAdvance as never },
  advance_recoveries: { to: fromAdvanceRecovery as never },
  salary_payments: { to: fromSalaryPayment as never },
};

export async function upsertRow<K extends keyof AppData>(key: K, item: AppData[K]): Promise<void> {
  const table = tableMap[key];
  if (!table) return;
  const row = converters[table].to(item as never);
  const { error } = await supabase.from(table).upsert(row);
  if (error) throw error;
}

export async function deleteRow<K extends keyof AppData>(key: K, id: string): Promise<void> {
  const table = tableMap[key];
  if (!table) return;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function updateProfile(farmName: string, owner: string, photo?: string, logo?: string, address?: string, phone?: string, email?: string, loginBgUrl?: string, dashboardBgUrl?: string, loginBgBrightness?: number, loginBgOverlay?: number, loginBgBlur?: number, dashboardBgBrightness?: number, dashboardBgOverlay?: number, dashboardBgBlur?: number): Promise<void> {
  const { error } = await supabase.from('farm_profile').upsert({ id: 'singleton', farm_name: farmName, owner, profile_photo: photo || null, logo: logo || null, login_bg_url: loginBgUrl || null, dashboard_bg_url: dashboardBgUrl || null, login_bg_brightness: loginBgBrightness ?? null, login_bg_overlay: loginBgOverlay ?? null, login_bg_blur: loginBgBlur ?? null, dashboard_bg_brightness: dashboardBgBrightness ?? null, dashboard_bg_overlay: dashboardBgOverlay ?? null, dashboard_bg_blur: dashboardBgBlur ?? null, address: address || null, phone: phone || null, email: email || null, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ─── Bulk seed: replace all rows in a table ───

export async function bulkSeed<K extends keyof AppData>(key: K, items: AppData[K]): Promise<void> {
  const table = tableMap[key];
  if (!table || !Array.isArray(items)) return;
  const rows = (items as unknown[]).map((item) => converters[table].to(item as never));
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows);
  if (error) throw error;
}

export async function seedAllData(data: AppData): Promise<void> {
  await updateProfile(data.farmName, data.owner, data.profilePhoto, data.logo, data.address, data.phone, data.email, data.loginBgUrl, data.dashboardBgUrl, data.loginBgBrightness, data.loginBgOverlay, data.loginBgBlur, data.dashboardBgBrightness, data.dashboardBgOverlay, data.dashboardBgBlur);
  const keys: (keyof AppData)[] = [
    'crops', 'cropExpenses', 'cropHarvests', 'nurseryBatches', 'nurseryCosts',
    'nurserySales', 'nurseryTransfers', 'workers', 'attendance', 'vouchers',
    'ledger', 'expenses', 'farmDevelopments',
    'employeeAdvances', 'advanceRecoveries', 'salaryPayments',
  ];
  for (const k of keys) {
    await bulkSeed(k, data[k]);
  }
}

// ─── Staff users ───

export async function loadStaffUsers(): Promise<StaffUser[]> {
  const { data, error } = await supabase
    .from('staff_users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Record<string, unknown>[] || []).map(toStaffUser);
}

export async function upsertStaffUser(u: StaffUser): Promise<void> {
  const row = fromStaffUser(u);
  const { error } = await supabase.from('staff_users').upsert(row);
  if (error) throw error;
}

export async function deleteStaffUser(id: string): Promise<void> {
  const { error } = await supabase.from('staff_users').delete().eq('id', id);
  if (error) throw error;
}

function toStaffUser(r: Record<string, unknown>): StaffUser {
  let permissions: PermissionEntry[] | undefined;
  const rawPerms = r.permissions;
  if (Array.isArray(rawPerms)) {
    permissions = (rawPerms as Record<string, unknown>[]).map((p) => ({
      module: p.module as PermissionModule,
      access: p.access as ModuleAccess,
    }));
  }
  return {
    id: r.id as string,
    full_name: r.full_name as string,
    username: r.username as string,
    password: r.password as string,
    role: r.role as StaffUser['role'],
    status: r.status as StaffUser['status'],
    permissions,
    created_at: r.created_at as string | undefined,
    updated_at: r.updated_at as string | undefined,
  };
}

function fromStaffUser(u: StaffUser): Record<string, unknown> {
  return {
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    password: u.password,
    role: u.role,
    status: u.status,
    permissions: u.permissions || [],
    updated_at: new Date().toISOString(),
  };
}

// ─── Custom categories ───

export interface CustomCategory {
  id: string;
  module_name: string;
  name: string;
  description?: string;
  is_system_default: boolean;
}

export async function loadCustomCategories(moduleName?: string): Promise<CustomCategory[]> {
  let query = supabase.from('custom_categories').select('*').order('name', { ascending: true });
  if (moduleName) query = query.eq('module_name', moduleName);
  const { data, error } = await query;
  if (error) throw error;
  return (data as Record<string, unknown>[] || []).map((r) => ({
    id: r.id as string,
    module_name: r.module_name as string,
    name: r.name as string,
    description: (r.description as string) || undefined,
    is_system_default: Boolean(r.is_system_default),
  }));
}

export async function createCustomCategory(moduleName: string, name: string, description?: string): Promise<CustomCategory> {
  const { data, error } = await supabase
    .from('custom_categories')
    .insert({ module_name: moduleName, name, description: description || null, is_system_default: false })
    .select('*')
    .single();
  if (error) throw error;
  return {
    id: data.id as string,
    module_name: data.module_name as string,
    name: data.name as string,
    description: (data.description as string) || undefined,
    is_system_default: Boolean(data.is_system_default),
  };
}

// ─── Settings ───

const DEFAULT_SETTINGS: AppSettings = {
  adminPassword: 'password',
  dataentryPassword: 'password',
  cropExpenseCategories: ['Seeds', 'Land Preparation', 'Fertilizer', 'Pesticide', 'Harvesting', 'Planting Material', 'Maintenance', 'Other'],
  nurseryCostCategories: ['Seedling trays', 'Potting media', 'Poly bags', 'Shade house', 'Rooting hormone', 'Labor'],
  expenseCategories: ['Electricity', 'Water', 'Fuel', 'Equipment Repair', 'Insurance', 'Office Supplies', 'Transport', 'Other'],
  seasons: ['Yala', 'Maha'],
  seasonYears: ['2025', '2026'],
};

export async function loadSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 'singleton').maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;
  return {
    adminPassword: data.admin_password || 'password',
    dataentryPassword: data.dataentry_password || 'password',
    cropExpenseCategories: data.crop_expense_categories || DEFAULT_SETTINGS.cropExpenseCategories,
    nurseryCostCategories: data.nursery_cost_categories || DEFAULT_SETTINGS.nurseryCostCategories,
    expenseCategories: data.expense_categories || DEFAULT_SETTINGS.expenseCategories,
    seasons: data.seasons || ['Yala', 'Maha'],
    seasonYears: data.season_years || ['2025', '2026'],
  };
}

export async function updateSettings(s: AppSettings): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({
    id: 'singleton',
    admin_password: s.adminPassword,
    dataentry_password: s.dataentryPassword,
    crop_expense_categories: s.cropExpenseCategories,
    nursery_cost_categories: s.nurseryCostCategories,
    expense_categories: s.expenseCategories,
    seasons: s.seasons,
    season_years: s.seasonYears,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function updatePassword(role: 'admin' | 'dataentry', password: string): Promise<void> {
  const col = role === 'admin' ? 'admin_password' : 'dataentry_password';
  const { error } = await supabase.from('app_settings').upsert({
    id: 'singleton',
    [col]: password,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
