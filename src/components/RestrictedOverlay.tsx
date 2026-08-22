import { Lock } from 'lucide-react';

export function RestrictedOverlay({ message = 'Restricted Access — Admin Permission Required' }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 backdrop-blur-md bg-white/30" />
      <div className="relative flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-white/80 border border-neutral-200 shadow-card-lg">
        <div className="w-12 h-12 rounded-full bg-error-100 text-error-600 flex items-center justify-center">
          <Lock size={24} />
        </div>
        <div className="text-sm font-700 text-neutral-800 text-center">{message}</div>
      </div>
    </div>
  );
}

export function RestrictedModule({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <div className="relative">
      <div className="blur-md pointer-events-none select-none opacity-60">{children}</div>
      <RestrictedOverlay message={message} />
    </div>
  );
}
