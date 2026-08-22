import { LayoutDashboard, Sprout, Users, Wheat, BookOpen, FileText, Settings, Leaf, ClipboardList } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Role } from '@/lib/auth';
import { UI_TEXT } from '@/lib/translations';

export type ModuleKey = 'dashboard' | 'nursery' | 'labor' | 'crops' | 'finance' | 'reports' | 'settings' | 'dataentry';

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  short: string;
  icon: ReactNode;
  desc: string;
  roles: Role[];
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: UI_TEXT.Dashboard, short: 'Home', icon: <LayoutDashboard size={18} />, desc: 'Overview, KPIs & AI assistant', roles: ['admin', 'dataentry'] },
  { key: 'dataentry', label: UI_TEXT.DataEntry, short: 'Data Entry', icon: <ClipboardList size={18} />, desc: 'Submit nursery, labor & crop data', roles: ['admin', 'dataentry'] },
  { key: 'nursery', label: UI_TEXT.Nursery, short: 'Nursery', icon: <Sprout size={18} />, desc: 'Seedlings, planting material & transfers', roles: ['admin'] },
  { key: 'labor', label: UI_TEXT.Labor, short: 'Payroll', icon: <Users size={18} />, desc: 'Staff, attendance & vouchers', roles: ['admin'] },
  { key: 'crops', label: UI_TEXT.Crops, short: 'Crops', icon: <Wheat size={18} />, desc: 'Yala/Maha seasonal profitability', roles: ['admin'] },
  { key: 'finance', label: UI_TEXT.Finance, short: 'Finance', icon: <BookOpen size={18} />, desc: 'Capital, loans, vouchers & billing', roles: ['admin'] },
  { key: 'reports', label: UI_TEXT.Reports, short: 'Reports', icon: <FileText size={18} />, desc: 'Exports, P&L & historical import', roles: ['admin'] },
  { key: 'settings', label: UI_TEXT.Settings, short: 'Setup', icon: <Settings size={18} />, desc: 'Farm profile & data reset', roles: ['admin'] },
];

export function modulesForRole(role: Role | undefined): ModuleDef[] {
  if (!role) return [];
  return MODULES.filter((m) => m.roles.includes(role));
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="inline-flex items-center justify-center rounded-xl bg-primary-700 text-white shadow-sm" style={{ width: size, height: size }}>
      <Leaf size={size * 0.55} />
    </div>
  );
}
