import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle size={18} className="text-success-600 shrink-0" />,
    error: <XCircle size={18} className="text-error-600 shrink-0" />,
    info: <Info size={18} className="text-accent-600 shrink-0" />,
  };

  const borders: Record<ToastType, string> = {
    success: 'border-success-200',
    error: 'border-error-200',
    info: 'border-accent-200',
  };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-card-lg border bg-white animate-slide-up pointer-events-auto ${borders[t.type]}`}
          >
            {icons[t.type]}
            <span className="text-sm text-neutral-800 flex-1 leading-snug">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-neutral-400 hover:text-neutral-600 mt-0.5 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used within ToastProvider');
  return c;
}
