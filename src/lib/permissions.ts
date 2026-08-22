import type { PermissionEntry, PermissionModule, ModuleAccess } from './types';
import type { StaffUser } from './types';

export const ALL_PERMISSION_MODULES: { key: PermissionModule; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'dataentry', label: 'Data Entry' },
  { key: 'crops', label: 'Crops & P&L' },
  { key: 'nursery', label: 'Nursery' },
  { key: 'labor', label: 'Labor & Payroll' },
  { key: 'finance', label: 'Financials / Ledger Entries' },
  { key: 'vouchers', label: 'Vouchers & Billing' },
  { key: 'expenses', label: 'P&L / Expense Log' },
  { key: 'capex', label: 'Farm Development Costs (CAPEX)' },
  { key: 'settings', label: 'Setup / System Settings' },
  { key: 'reports', label: 'Reports & Exporting' },
];

export function getPermission(user: { role: string; permissions?: PermissionEntry[] } | null, module: PermissionModule): ModuleAccess {
  if (!user) return 'none';
  if (user.role === 'admin') return 'edit';
  const entry = user.permissions?.find((p) => p.module === module);
  if (entry) return entry.access;
  return 'view';
}

export function canView(user: { role: string; permissions?: PermissionEntry[] } | null, module: PermissionModule): boolean {
  return getPermission(user, module) !== 'none';
}

export function canEdit(user: { role: string; permissions?: PermissionEntry[] } | null, module: PermissionModule): boolean {
  return getPermission(user, module) === 'edit';
}

export function defaultPermissionsForRole(role: 'admin' | 'dataentry'): PermissionEntry[] {
  if (role === 'admin') {
    return ALL_PERMISSION_MODULES.map((m) => ({ module: m.key, access: 'edit' as const }));
  }
  return [
    { module: 'dashboard', access: 'view' },
    { module: 'dataentry', access: 'edit' },
    { module: 'crops', access: 'none' },
    { module: 'nursery', access: 'none' },
    { module: 'labor', access: 'none' },
    { module: 'finance', access: 'none' },
    { module: 'vouchers', access: 'none' },
    { module: 'expenses', access: 'none' },
    { module: 'capex', access: 'none' },
    { module: 'settings', access: 'none' },
    { module: 'reports', access: 'none' },
  ];
}

export function updatePermission(permissions: PermissionEntry[], module: PermissionModule, access: ModuleAccess): PermissionEntry[] {
  const existing = permissions.find((p) => p.module === module);
  if (existing) {
    return permissions.map((p) => (p.module === module ? { ...p, access } : p));
  }
  return [...permissions, { module, access }];
}

export function serializePermissions(permissions: PermissionEntry[]): PermissionEntry[] {
  return ALL_PERMISSION_MODULES.map((m) => {
    const entry = permissions.find((p) => p.module === m.key);
    return { module: m.key, access: entry?.access || 'none' };
  });
}
