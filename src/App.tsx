import { useState } from 'react';
import { StoreProvider, useStore } from '@/lib/store';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/toast';
import { Shell } from '@/components/Shell';
import { LoginScreen } from '@/components/LoginScreen';
import { RestrictedModule } from '@/components/RestrictedOverlay';
import type { ModuleKey } from '@/components/nav';
import type { PermissionModule } from '@/lib/types';
import { Dashboard } from '@/modules/Dashboard';
import { DataEntryModule } from '@/modules/DataEntry';
import { NurseryModule } from '@/modules/Nursery';
import { LaborModule } from '@/modules/Labor';
import { CropsModule } from '@/modules/Crops';
import { FinanceModule } from '@/modules/Finance';
import { ReportsModule } from '@/modules/Reports';
import { SettingsModule } from '@/modules/Settings';

const MODULE_PERM_MAP: Record<ModuleKey, PermissionModule> = {
  dashboard: 'dashboard',
  dataentry: 'dataentry',
  nursery: 'nursery',
  labor: 'labor',
  crops: 'crops',
  finance: 'finance',
  reports: 'reports',
  settings: 'settings',
};

function AppInner() {
  const { user, canView } = useAuth();
  const { loading, error } = useStore();
  const [active, setActive] = useState<ModuleKey>('dashboard');

  if (!user) return <LoginScreen />;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
          <div className="mt-3 text-sm text-neutral-500">Loading farm data…</div>
        </div>
      </div>
    );
  }

  const permModule = MODULE_PERM_MAP[active];
  const hasView = canView(permModule);

  const renderModule = () => {
    if (!hasView) {
      return (
        <RestrictedModule>
          <div className="space-y-6">
            <div className="h-32 rounded-xl bg-neutral-100" />
            <div className="h-64 rounded-xl bg-neutral-100" />
            <div className="h-48 rounded-xl bg-neutral-100" />
          </div>
        </RestrictedModule>
      );
    }
    switch (active) {
      case 'dashboard': return <Dashboard onNavigate={(k) => setActive(k)} />;
      case 'dataentry': return <DataEntryModule />;
      case 'nursery': return <NurseryModule />;
      case 'labor': return <LaborModule />;
      case 'crops': return <CropsModule />;
      case 'finance': return <FinanceModule />;
      case 'reports': return <ReportsModule />;
      case 'settings': return <SettingsModule />;
      default: return <Dashboard onNavigate={(k) => setActive(k)} />;
    }
  };

  return (
    <Shell active={active} onNavigate={setActive}>
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-error-50 border border-error-200 text-sm text-error-700">
          Could not load data from the database. The app will use local data instead. ({error})
        </div>
      )}
      {renderModule()}
    </Shell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <StoreProvider>
          <AppInner />
        </StoreProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
