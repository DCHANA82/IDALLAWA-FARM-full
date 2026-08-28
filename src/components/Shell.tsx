import { useState, useRef, useEffect } from 'react';
import { Menu, X, Search, Bell, LogOut, ChevronDown, Lock, Shield } from 'lucide-react';
import { MODULES, modulesForRole, type ModuleKey } from './nav';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import logoAsset from '../Assets/logo.png';
import type { PermissionModule } from '@/lib/types';

const FALLBACK_PORTRAIT = 'https://images.pexels.com/photos/17168814/pexels-photo-17168814.jpeg?auto=compress&cs=tinysrgb&h=120&w=120';

export function Shell({ active, onNavigate, children }: { active: ModuleKey; onNavigate: (k: ModuleKey) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { data } = useStore();
  const { user, logout, isAdmin, canView } = useAuth();
  const navRef = useRef<HTMLElement>(null);
  const navItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const moduleKeyToPerm: Record<ModuleKey, PermissionModule> = {
    dashboard: 'dashboard',
    dataentry: 'dataentry',
    nursery: 'nursery',
    labor: 'labor',
    crops: 'crops',
    finance: 'finance',
    reports: 'reports',
    settings: 'settings',
  };

  const visibleModules = modulesForRole(user?.role).filter((m) => canView(moduleKeyToPerm[m.key]));
  const activeMod = visibleModules.find((m) => m.key === active) || visibleModules[0];

  // Sync navItemsRef array length
  useEffect(() => {
    navItemsRef.current = navItemsRef.current.slice(0, visibleModules.length);
  }, [visibleModules.length]);

  // Global keyboard navigation: Up/Down move between sidebar items, Enter navigates
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      // Only handle sidebar nav when no table cell is focused
      const onCell = document.activeElement?.hasAttribute('data-grid');
      if (onCell) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const cur = navItemsRef.current.findIndex((b) => b === document.activeElement);
        let next = cur < 0 ? 0 : cur;
        if (e.key === 'ArrowDown') next = Math.min(visibleModules.length - 1, next + 1);
        else next = Math.max(0, next - 1);
        navItemsRef.current[next]?.focus();
      } else if (e.key === 'Enter') {
        const cur = navItemsRef.current.findIndex((b) => b === document.activeElement);
        if (cur >= 0) {
          e.preventDefault();
          navItemsRef.current[cur]?.click();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visibleModules.length]);

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Sidebar */}
      <aside className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-primary-900 text-white transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-800/60">
          {data.logo ? <img src={data.logo} alt="Logo" className="w-9 h-9 rounded-xl object-cover" /> : <img src={logoAsset} alt="Idallawa Agro logo" className="w-9 h-9 rounded-xl object-cover" />}
          <div className="min-w-0">
            <div className="font-display font-800 text-sm leading-tight truncate">{data.farmName || 'Farm Management'}</div>
            <div className="text-[11px] text-primary-300 truncate">{data.owner ? data.owner : 'Farm & Nursery'}</div>
          </div>
          <button className="ml-auto lg:hidden text-primary-200" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav ref={navRef} className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {visibleModules.map((m, i) => {
            const isActive = m.key === active;
            return (
              <button
                key={m.key}
                ref={(el) => { navItemsRef.current[i] = el; }}
                onClick={() => { onNavigate(m.key); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left outline-none ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-primary-100 hover:bg-primary-800/70 focus-visible:ring-2 focus-visible:ring-accent-400'}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={isActive ? 'text-white' : 'text-primary-300'}>{m.icon}</span>
                <span className="flex-1">
                  <span className="block font-600 leading-tight">{m.short}</span>
                  <span className={`block text-[10px] leading-tight ${isActive ? 'text-primary-100' : 'text-primary-400'}`}>{m.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-primary-800/60 text-[11px] text-primary-300">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-accent-400" />
            <span className="font-600 text-primary-100">{user?.displayName || data.owner}</span>
          </div>
          <div className="mt-0.5">{isAdmin ? 'Administrator · Full access' : 'Data Entry · Limited access'}</div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-neutral-950/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-neutral-200">
          <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
            <button className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-neutral-100 text-neutral-700" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-800 text-neutral-900 leading-tight truncate">{activeMod?.label || 'Dashboard'}</h1>
              <p className="text-xs text-neutral-500 hidden sm:block">{activeMod?.desc}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-400 text-xs">
                <Search size={14} />
                <span>Use </span><kbd>↑↓→←</kbd><span> to navigate</span>
              </div>
              <button className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 relative" aria-label="Notifications">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary-500" />
              </button>

              {/* Profile menu */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-neutral-100 transition"
                >
                  <img src={data.profilePhoto || FALLBACK_PORTRAIT} alt="User portrait" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-200" />
                  <ChevronDown size={14} className="text-neutral-500" />
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-card-lg border border-neutral-200 z-40 overflow-hidden animate-slide-up">
                      <div className="p-4 border-b border-neutral-100 bg-gradient-to-br from-primary-50 to-accent-50">
                        <img src={data.profilePhoto || FALLBACK_PORTRAIT} alt="User portrait" className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-md mx-auto" />
                        <div className="mt-2 text-center">
                          <div className="font-display font-700 text-sm text-neutral-900">{user?.displayName}</div>
                          <div className="text-xs text-neutral-500 mt-0.5 flex items-center justify-center gap-1">
                            {isAdmin ? <><Shield size={11} /> Administrator</> : <><Lock size={11} /> Data Entry</>}
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-error-600 hover:bg-error-50 transition"
                        >
                          <LogOut size={15} /> Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto animate-fade-in relative">
          {data.dashboardBgUrl && (
            <img
              src={data.dashboardBgUrl}
              alt=""
              className="fixed inset-0 -z-10 w-full h-full object-cover pointer-events-none"
              style={{
                filter: `brightness(${data.dashboardBgBrightness ?? 1}) blur(${data.dashboardBgBlur ?? 0}px)`,
                opacity: data.dashboardBgOverlay ?? 0.1,
              }}
            />
          )}
          {children}
        </main>

        <footer className="px-6 py-3 text-[11px] text-neutral-400 border-t border-neutral-200 bg-white">
          {(data.farmName || 'Farm Management System') + (data.owner ? ' · ' + data.owner : '')} — Farm, Nursery & Financial Accounting. Keyboard-navigable · Role-aware access control.
        </footer>
      </div>
    </div>
  );
}
