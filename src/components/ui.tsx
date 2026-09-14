import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { X, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-xl shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 text-primary-600">{icon}</div>}
        <div>
          <h2 className="font-display text-lg font-700 text-neutral-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent';
  size?: 'sm' | 'md';
  icon?: ReactNode;
};

export function Button({ variant = 'primary', size = 'md', icon, className = '', children, ...rest }: BtnProps) {
  const variants: Record<string, string> = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm',
    secondary: 'bg-secondary-500 hover:bg-secondary-600 text-neutral-900 shadow-sm',
    accent: 'bg-accent-600 hover:bg-accent-700 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-700',
    outline: 'bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700',
    danger: 'bg-error-600 hover:bg-error-700 text-white shadow-sm',
  };
  const sizes: Record<string, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
    md: 'text-sm px-4 py-2.5 gap-2 rounded-xl',
  };
  return (
    <button className={`inline-flex items-center justify-center font-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {icon}{children}
    </button>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'yellow' | 'blue' | 'red' | 'gray'; className?: string }) {
  const tones: Record<string, string> = {
    neutral: 'bg-neutral-100 text-neutral-700',
    green: 'bg-success-100 text-success-700',
    yellow: 'bg-secondary-100 text-secondary-800',
    blue: 'bg-accent-100 text-accent-700',
    red: 'bg-error-100 text-error-700',
    gray: 'bg-neutral-100 text-neutral-500',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 ${tones[tone]} ${className}`}>{children}</span>;
}

export function Input({ label, className = '', error, ...rest }: { label?: string; error?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const borderClass = error ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-100' : 'border-neutral-300 focus:border-accent-500 focus:ring-2 focus:ring-accent-100';
  return (
    <label className="block">
      {label && <span className={`block text-xs font-600 mb-1 ${error ? 'text-error-600' : 'text-neutral-600'}`}>{label}</span>}
      <input className={`w-full px-3 py-2 rounded-lg border bg-white text-sm text-neutral-900 placeholder-neutral-400 outline-none transition ${borderClass} ${className}`} {...rest} />
    </label>
  );
}

export function Select({ label, className = '', error, children, ...rest }: { label?: string; error?: boolean } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const borderClass = error ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-100' : 'border-neutral-300 focus:border-accent-500 focus:ring-2 focus:ring-accent-100';
  return (
    <label className="block">
      {label && <span className={`block text-xs font-600 mb-1 ${error ? 'text-error-600' : 'text-neutral-600'}`}>{label}</span>}
      <select className={`w-full px-3 py-2 rounded-lg border bg-white text-sm text-neutral-900 outline-none transition ${borderClass} ${className}`} {...rest}>
        {children}
      </select>
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-600 text-neutral-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 2);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      const container = bodyRef.current;
      if (!container) return;
      updateScrollState();
      const firstInput = container.querySelector<HTMLElement>('input, select, textarea, button');
      firstInput?.focus();
    }, 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(timer);
    };
  }, [open, onClose, updateScrollState]);

  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    const handler = () => updateScrollState();
    el.addEventListener('scroll', handler);
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', handler);
      ro.disconnect();
    };
  }, [open, updateScrollState]);

  const scrollBy = useCallback((delta: number) => {
    bodyRef.current?.scrollBy({ top: delta, behavior: 'smooth' });
  }, []);

  const handleBodyKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = bodyRef.current;
    if (!el) return;
    const tag = (e.target as HTMLElement)?.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;
    if (isTyping) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        el.scrollBy({ top: 60, behavior: 'smooth' });
        break;
      case 'ArrowUp':
        e.preventDefault();
        el.scrollBy({ top: -60, behavior: 'smooth' });
        break;
      case 'PageDown':
        e.preventDefault();
        el.scrollBy({ top: el.clientHeight * 0.85, behavior: 'smooth' });
        break;
      case 'PageUp':
        e.preventDefault();
        el.scrollBy({ top: -el.clientHeight * 0.85, behavior: 'smooth' });
        break;
      case 'Home':
        e.preventDefault();
        el.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'End':
        e.preventDefault();
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        break;
    }
  }, []);

  if (!open) return null;
  const sizes: Record<string, string> = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ overflow: 'hidden' }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm animate-fade-in" />
      <div
        className={`relative bg-white rounded-2xl shadow-card-lg w-full ${sizes[size]} animate-slide-up`}
        style={{
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr) auto',
          height: 'min(720px, calc(100dvh - 32px))',
          maxHeight: 'calc(100dvh - 32px)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/50 rounded-t-2xl"
          style={{ overflow: 'hidden' }}
        >
          <h3 className="font-display text-base font-700 text-neutral-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div style={{ position: 'relative', minHeight: 0, overflow: 'hidden' }}>
          {canScrollUp && (
            <button
              onClick={() => scrollBy(-200)}
              aria-label="Scroll up"
              style={{
                position: 'absolute',
                top: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                width: 36,
                height: 28,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#525252',
              }}
            >
              <ChevronUp size={18} />
            </button>
          )}
          <div
            ref={bodyRef}
            tabIndex={0}
            className="modal-scroll-body px-5 py-4"
            onScroll={updateScrollState}
            onKeyDown={handleBodyKeyDown}
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              minHeight: 0,
              height: '100%',
            }}
          >
            {children}
          </div>
          {canScrollDown && (
            <button
              onClick={() => scrollBy(200)}
              aria-label="Scroll down"
              style={{
                position: 'absolute',
                bottom: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                width: 36,
                height: 28,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 -2px 6px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#525252',
              }}
            >
              <ChevronDown size={18} />
            </button>
          )}
        </div>
        {footer && (
          <div
            className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 rounded-b-2xl"
            style={{ overflow: 'hidden' }}
          >
            {footer}
          </div>
        )}
        {!footer && <div style={{ minHeight: 0 }} />}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone = 'neutral', icon }: { label: string; value: ReactNode; sub?: string; tone?: 'neutral' | 'green' | 'yellow' | 'blue' | 'red'; icon?: ReactNode }) {
  const ring: Record<string, string> = {
    neutral: 'text-neutral-700',
    green: 'text-success-700',
    yellow: 'text-secondary-700',
    blue: 'text-accent-700',
    red: 'text-error-700',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-600 text-neutral-500 uppercase tracking-wide">{label}</span>
        {icon && <span className={ring[tone]}>{icon}</span>}
      </div>
      <div className={`mt-2 font-display text-2xl font-800 ${ring[tone]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
    </Card>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {icon && <div className="text-neutral-300 mb-3">{icon}</div>}
      <p className="text-sm font-600 text-neutral-700">{title}</p>
      {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string;
  confirmLabel?: string; cancelLabel?: string; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ overflow: 'hidden' }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-card-lg animate-slide-up"
        style={{
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr) auto',
          maxHeight: 'calc(100dvh - 32px)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ minHeight: 0 }} />
        <div
          className="px-5 py-4"
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            minHeight: 0,
          }}
        >
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-error-100 text-error-600' : 'bg-accent-100 text-accent-600'}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-700 text-neutral-900">{title}</h3>
              <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }} autoFocus>{confirmLabel}</Button>
          </div>
        </div>
        <div style={{ minHeight: 0 }} />
      </div>
    </div>
  );
}
