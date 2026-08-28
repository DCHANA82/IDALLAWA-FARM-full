import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { loadStaffUsers, upsertStaffUser, deleteStaffUser } from './db';
import { useToast } from '@/components/toast';
import { uid } from './format';
import { getPermission as getPerm, canView as canViewPerm, canEdit as canEditPerm } from './permissions';
import type { StaffUser, PermissionEntry, PermissionModule, ModuleAccess } from './types';

export type Role = 'admin' | 'dataentry';

export interface User {
  id: string;
  username: string;
  role: Role;
  displayName: string;
  permissions?: PermissionEntry[];
}

interface AuthCtx {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  isDataEntry: boolean;
  staffUsers: StaffUser[];
  staffLoading: boolean;
  refreshStaff: () => Promise<void>;
  createStaffUser: (data: Omit<StaffUser, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateStaffUser: (id: string, data: Partial<Omit<StaffUser, 'id' | 'created_at' | 'updated_at'>>) => Promise<boolean>;
  removeStaffUser: (id: string) => Promise<boolean>;
  updateOwnCredentials: (newUsername: string, newPassword?: string) => Promise<boolean>;
  getPermission: (module: PermissionModule) => ModuleAccess;
  canView: (module: PermissionModule) => boolean;
  canEdit: (module: PermissionModule) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

const SESSION_KEY = 'idallawa_auth_session';

const DEFAULT_USERS: StaffUser[] = [
  { id: 'staff-admin', full_name: 'Administrator', username: 'admin', password: '123', role: 'admin', status: 'Active' },
  { id: 'staff-dataentry', full_name: 'Data Entry Operator', username: 'dataentry', password: 'password', role: 'dataentry', status: 'Active' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(DEFAULT_USERS);
  const [staffLoading, setStaffLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as User;
    } catch { /* ignore */ }
    return null;
  });

  const refreshStaff = useCallback(async () => {
    try {
      const users = await loadStaffUsers();
      setStaffUsers(users.length > 0 ? users : DEFAULT_USERS);
    } catch {
      // Keep default users if DB is unreachable
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStaff();
  }, [refreshStaff]);

  const login = useCallback((username: string, password: string): boolean => {
    const key = username.toLowerCase().trim();
    const cred = staffUsers.find((u) => u.username.toLowerCase() === key);
    if (cred && cred.password === password && cred.status === 'Active') {
      const u: User = { id: cred.id, username: cred.username, role: cred.role, displayName: cred.full_name, permissions: cred.permissions };
      setUser(u);
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch { /* ignore */ }
      return true;
    }
    return false;
  }, [staffUsers]);

  const logout = useCallback(() => {
    setUser(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  const createStaffUser = useCallback(async (data: Omit<StaffUser, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const newUser: StaffUser = { ...data, id: uid('staff') };
      await upsertStaffUser(newUser);
      setStaffUsers((prev) => [...prev, newUser]);
      toast('User created successfully', 'success');
      return true;
    } catch (e) {
      toast(`Failed to create user: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
      return false;
    }
  }, [toast]);

  const updateStaffUser = useCallback(async (id: string, data: Partial<Omit<StaffUser, 'id' | 'created_at' | 'updated_at'>>): Promise<boolean> => {
    try {
      const existing = staffUsers.find((u) => u.id === id);
      if (!existing) return false;
      const updated: StaffUser = { ...existing, ...data, id };
      await upsertStaffUser(updated);
      setStaffUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      toast('User updated successfully', 'success');
      return true;
    } catch (e) {
      toast(`Failed to update user: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
      return false;
    }
  }, [staffUsers, toast]);

  const removeStaffUser = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteStaffUser(id);
      setStaffUsers((prev) => prev.filter((u) => u.id !== id));
      toast('User removed', 'success');
      return true;
    } catch (e) {
      toast(`Failed to remove user: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
      return false;
    }
  }, [toast]);

  const updateOwnCredentials = useCallback(async (newUsername: string, newPassword?: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const existing = staffUsers.find((u) => u.id === user.id);
      if (!existing) return false;
      const updated: StaffUser = { ...existing, username: newUsername, password: newPassword || existing.password };
      await upsertStaffUser(updated);
      setStaffUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      const newSession: User = { ...user, username: newUsername };
      setUser(newSession);
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession)); } catch { /* ignore */ }
      toast('Credentials updated successfully', 'success');
      return true;
    } catch (e) {
      toast(`Failed to update credentials: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
      return false;
    }
  }, [user, staffUsers, toast]);

  const value = useMemo<AuthCtx>(() => ({
    user, login, logout,
    isAdmin: user?.role === 'admin',
    isDataEntry: user?.role === 'dataentry',
    staffUsers, staffLoading,
    refreshStaff, createStaffUser, updateStaffUser, removeStaffUser,
    updateOwnCredentials,
    getPermission: (module: PermissionModule) => getPerm(user, module),
    canView: (module: PermissionModule) => canViewPerm(user, module),
    canEdit: (module: PermissionModule) => canEditPerm(user, module),
  }), [user, login, logout, staffUsers, staffLoading, refreshStaff, createStaffUser, updateStaffUser, removeStaffUser, updateOwnCredentials]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
