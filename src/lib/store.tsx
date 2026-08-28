import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AppData, AppSettings } from './types';
import { SEED_DATA } from './seed';
import { uid } from './format';
import { loadAllData, loadSettings, upsertRow, deleteRow, updateProfile, updateSettings, seedAllData } from './db';
export { upsertRow, deleteRow };
import { useToast } from '@/components/toast';

interface StoreCtx {
  data: AppData;
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  update: <K extends keyof AppData>(key: K, value: AppData[K]) => void;
  patch: (partial: Partial<AppData>) => void;
  save: (key: keyof AppData, item: { id: string }, msg?: string) => void;
  remove: (key: keyof AppData, id: string, msg?: string) => void;
  saveProfile: (name: string, owner: string, photo?: string, logo?: string, address?: string, phone?: string, email?: string, loginBgUrl?: string, dashboardBgUrl?: string, loginBgBrightness?: number, loginBgOverlay?: number, loginBgBlur?: number, dashboardBgBrightness?: number, dashboardBgOverlay?: number, dashboardBgBlur?: number) => void;
  saveSettings: (s: AppSettings) => void;
  reset: () => void;
  replaceAll: (d: AppData) => void;
  nextVoucherNo: () => string;
  nextInvoiceNo: () => string;
  nextBatchCode: () => string;
}

const Ctx = createContext<StoreCtx | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  adminPassword: 'password',
  dataentryPassword: 'password',
  cropExpenseCategories: ['Seeds', 'Land Preparation', 'Fertilizer', 'Pesticide', 'Harvesting', 'Planting Material', 'Maintenance', 'Other'],
  nurseryCostCategories: ['Seedling trays', 'Potting media', 'Poly bags', 'Shade house', 'Rooting hormone', 'Labor'],
  expenseCategories: ['Electricity', 'Water', 'Fuel', 'Equipment Repair', 'Insurance', 'Office Supplies', 'Transport', 'Other'],
  seasons: ['Yala', 'Maha'],
  seasonYears: ['2025', '2026'],
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [data, setData] = useState<AppData>(() => JSON.parse(JSON.stringify(SEED_DATA)) as AppData);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [dbData, dbSettings] = await Promise.all([loadAllData(), loadSettings()]);
        if (!mounted) return;
        setData(dbData);
        setSettings(dbSettings);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load data from database');
        setSettings(DEFAULT_SETTINGS);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const update = useCallback(<K extends keyof AppData>(key: K, value: AppData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  const patch = useCallback((partial: Partial<AppData>) => {
    setData((d) => ({ ...d, ...partial }));
  }, []);

  const save = useCallback((key: keyof AppData, item: { id: string }, msg?: string) => {
    setData((d) => {
      const arr = d[key];
      if (!Array.isArray(arr)) return d;
      const list = arr as { id: string }[];
      const exists = list.some((it) => it.id === item.id);
      const newList = exists
        ? list.map((it) => (it.id === item.id ? item : it))
        : [item, ...list];
      return { ...d, [key]: newList };
    });
    upsertRow(key, item as never)
      .then(() => toast(msg || 'Saved', 'success'))
      .catch((e) => toast(`Save failed: ${e.message || 'Unknown error'}`, 'error'));
  }, [toast]);

  const remove = useCallback((key: keyof AppData, id: string, msg?: string) => {
    setData((d) => {
      const arr = d[key];
      if (!Array.isArray(arr)) return d;
      return { ...d, [key]: (arr as { id: string }[]).filter((it) => it.id !== id) };
    });
    deleteRow(key, id)
      .then(() => toast(msg || 'Deleted', 'success'))
      .catch((e) => toast(`Delete failed: ${e.message || 'Unknown error'}`, 'error'));
  }, [toast]);

  const saveProfile = useCallback((name: string, owner: string, photo?: string, logo?: string, address?: string, phone?: string, email?: string, loginBgUrl?: string, dashboardBgUrl?: string, loginBgBrightness?: number, loginBgOverlay?: number, loginBgBlur?: number, dashboardBgBrightness?: number, dashboardBgOverlay?: number, dashboardBgBlur?: number) => {
    setData((d) => ({ ...d, farmName: name, owner, profilePhoto: photo, logo, loginBgUrl, dashboardBgUrl, loginBgBrightness, loginBgOverlay, loginBgBlur, dashboardBgBrightness, dashboardBgOverlay, dashboardBgBlur, address, phone, email }));
    updateProfile(name, owner, photo, logo, address, phone, email, loginBgUrl, dashboardBgUrl, loginBgBrightness, loginBgOverlay, loginBgBlur, dashboardBgBrightness, dashboardBgOverlay, dashboardBgBlur)
      .then(() => toast('Profile saved', 'success'))
      .catch((e) => toast(`Profile save failed: ${e.message || 'Unknown error'}`, 'error'));
  }, [toast]);

  const saveSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    updateSettings(s)
      .then(() => toast('Settings saved', 'success'))
      .catch((e) => toast(`Settings save failed: ${e.message || 'Unknown error'}`, 'error'));
  }, [toast]);

  const reset = useCallback(() => {
    const fresh = JSON.parse(JSON.stringify(SEED_DATA)) as AppData;
    setData(fresh);
    seedAllData(fresh).catch((e) => setError(e instanceof Error ? e.message : 'Reset failed'));
    toast('All data cleared', 'info');
  }, [toast]);

  const replaceAll = useCallback((d: AppData) => {
    setData(d);
    seedAllData(d)
      .then(() => toast('Data restored', 'success'))
      .catch((e) => toast(`Restore failed: ${e.message || 'Unknown error'}`, 'error'));
  }, [toast]);

  const nextVoucherNo = useCallback(() => {
    const n = (data.vouchers?.length ?? 0) + 1;
    return 'PV-2026-' + String(n).padStart(3, '0');
  }, [data.vouchers]);

  const nextInvoiceNo = useCallback(() => {
    const n = (data.nurserySales?.length ?? 0) + 1;
    return 'INV-NS-' + String(n).padStart(3, '0');
  }, [data.nurserySales]);

  const nextBatchCode = useCallback(() => {
    const n = (data.nurseryBatches?.length ?? 0) + 1;
    return 'NUR-26-' + String(n).padStart(2, '0');
  }, [data.nurseryBatches]);

  const value = useMemo<StoreCtx>(() => ({
    data, settings, loading, error,
    update, patch, save, remove, saveProfile, saveSettings,
    reset, replaceAll, nextVoucherNo, nextInvoiceNo, nextBatchCode,
  }), [data, settings, loading, error, update, patch, save, remove, saveProfile, saveSettings, reset, replaceAll, nextVoucherNo, nextInvoiceNo, nextBatchCode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used within StoreProvider');
  return c;
}

export const newId = uid;
