// Shared domain types for Idallawa Agro

export type Season = 'Yala' | 'Maha';
export type WorkerType = 'Permanent' | 'Casual';
export type ExpenseClass =
  | 'Fixed Overhead'
  | 'Perennial Crop'
  | 'Seasonal Crop'
  | 'Nursery Operations'
  | 'Payroll'
  | 'Loan Repayment'
  | 'Owner Equity Return'
  | 'Shop Credit Settlement';

export type LedgerKind = 'Capital' | 'Retail Shop Transfer' | 'Bank Loan' | 'Shop Credit' | 'Owner Equity Return';
export type LedgerDirection = 'In' | 'Out';

export type CropType = 'Seasonal' | 'Perennial';
export type PerennialStatus = 'Establishment / Non-Bearing' | 'Active Bearing' | 'Replanting';

export interface Crop {
  id: string;
  name: string;
  type: CropType;
  season: string;          // for seasonal crops; for perennial, the planting season (dynamic from settings)
  plot: string;            // plot/field identifier
  areaAcres: number;
  plantedDate: string;     // ISO — planting date for seasonal, establishment date for perennial
  status: 'Active' | 'Harvested' | 'Abandoned';
  notes?: string;
  // Perennial-specific fields
  bearingStartYear?: string;    // expected bearing start year
  perennialStatus?: PerennialStatus;
}

export interface CropExpense {
  id: string;
  cropId: string;
  date: string;
  category: string;        // Seeds, Land Preparation, Fertilizer, Harvesting, Maintenance...
  description: string;
  amount: number;
}

export interface CropHarvest {
  id: string;
  cropId: string;
  date: string;
  quantityKg: number;
  unitPrice: number;
  buyer: string;
}

export interface NurseryBatch {
  id: string;
  code: string;            // e.g. NUR-2026-001
  category: 'Seasonal Seedling' | 'Perennial Planting Material';
  variety: string;         // Capsicum, Banana sucker, etc.
  startDate: string;
  qtyUnits: number;        // trays or plants
  unitType: string;        // 'tray' | 'polybag' | 'sucker' | 'sapling'
  unitCost: number;        // production cost per unit
  status: 'Growing' | 'Ready' | 'Sold Out' | 'Transferred';
}

export interface NurseryCost {
  id: string;
  batchId: string;         // can be 'shared' for general nursery overhead
  date: string;
  category: string;        // Seedling trays, Potting media, Poly bags, Shade house, Rooting hormone, Labor
  description: string;
  amount: number;
}

export interface NurserySale {
  id: string;
  batchId: string;
  date: string;
  buyer: string;
  qty: number;
  unitPrice: number;
  invoiceNo: string;
}

export interface NurseryTransfer {
  id: string;
  batchId: string;
  date: string;
  cropId: string;          // destination crop plot
  qty: number;
  unitValue: number;       // credited to nursery / debited to plot
}

export interface Worker {
  id: string;
  name: string;
  type: WorkerType;
  phone?: string;
  role: string;
  monthlyBasic: number;    // permanent
  allowances: number;      // permanent
  dailyWage: number;       // casual
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Half Day';
  taskPlot?: string;       // plot/nursery allocation
  hours: number;
  amount: number;          // computed payout
}

export interface Voucher {
  id: string;
  voucherNo: string;
  date: string;
  kind: 'Payment' | 'Sales Receipt' | 'Gate Pass' | 'Loan Settlement' | 'Payroll';
  party: string;
  description: string;
  amount: number;
  reference?: string;
  paymentMethod?: 'Cash' | 'Cheque' | 'Bank Transfer';
  chequeNo?: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  kind: LedgerKind;
  direction: LedgerDirection;
  description: string;
  amount: number;
  reference?: string;
}

export interface Expense {
  id: string;
  date: string;
  class: ExpenseClass;
  category: string;
  description: string;
  amount: number;
  reference?: string;
}

export type ModuleAccess = 'view' | 'edit' | 'none';
export type PermissionModule = 'finance' | 'vouchers' | 'expenses' | 'capex' | 'settings' | 'reports' | 'crops' | 'nursery' | 'labor' | 'dashboard' | 'dataentry';

export interface PermissionEntry {
  module: PermissionModule;
  access: ModuleAccess;
}

export interface StaffUser {
  id: string;
  full_name: string;
  username: string;
  password: string;
  role: 'admin' | 'dataentry';
  status: 'Active' | 'Inactive';
  permissions?: PermissionEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface FarmDevelopment {
  id: string;
  name: string;              // Development/Asset name (Fencing, Drip Irrigation, etc.)
  category: string;          // Infrastructure, Land Prep, Irrigation, Machinery, Structures
  totalCost: number;         // Total development cost in LKR
  implementationDate: string; // ISO date
  lifespanYears: number;     // Expected lifespan in years
  linkedPlotId?: string;     // Optional link to a specific crop plot
  description?: string;
}

export interface AppSettings {
  adminPassword: string;
  dataentryPassword: string;
  cropExpenseCategories: string[];
  nurseryCostCategories: string[];
  expenseCategories: string[];
  seasons: string[];
  seasonYears: string[];
}

export interface AppData {
  farmName: string;
  owner: string;
  profilePhoto?: string;
  logo?: string;
  loginBgUrl?: string;
  dashboardBgUrl?: string;
  loginBgBrightness?: number;     // 0.2–1.0
  loginBgOverlay?: number;        // 0–1.0
  loginBgBlur?: number;           // 0–20px
  dashboardBgBrightness?: number; // 0.2–1.0
  dashboardBgOverlay?: number;    // 0–1.0
  dashboardBgBlur?: number;       // 0–20px
  address?: string;
  phone?: string;
  email?: string;
  crops: Crop[];
  cropExpenses: CropExpense[];
  cropHarvests: CropHarvest[];
  nurseryBatches: NurseryBatch[];
  nurseryCosts: NurseryCost[];
  nurserySales: NurserySale[];
  nurseryTransfers: NurseryTransfer[];
  workers: Worker[];
  attendance: Attendance[];
  vouchers: Voucher[];
  ledger: LedgerEntry[];
  expenses: Expense[];
  farmDevelopments: FarmDevelopment[];
}
