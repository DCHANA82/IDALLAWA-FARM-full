import { useRef, type ReactNode } from 'react';

export interface TabItem {
  key: string;
  label: ReactNode;
}

export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: ReactNode }[]; value: T; onChange: (key: T) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (idx: number) => {
    const n = tabs.length;
    const next = ((idx % n) + n) % n;
    refs.current[next]?.focus();
    onChange(tabs[next].key);
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 p-1 bg-neutral-100 rounded-xl w-fit"
      role="tablist"
      onKeyDown={(e) => {
        const idx = tabs.findIndex((t) => t.key === value);
        if (e.key === 'ArrowRight') { e.preventDefault(); focusTab(idx + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); focusTab(idx - 1); }
      }}
    >
      {tabs.map((t, i) => (
        <button
          key={t.key}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          aria-selected={value === t.key}
          tabIndex={value === t.key ? 0 : -1}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 rounded-lg text-sm font-600 transition ${value === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
