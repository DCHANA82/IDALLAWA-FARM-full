import type { ReactNode } from 'react';
import { Badge } from './ui';
import { Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, idx: number) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  restricted?: boolean;
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, onEdit, onDelete, empty, dense, canEdit,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  empty?: ReactNode;
  dense?: boolean;
  canEdit?: boolean;
}) {
  const { isAdmin } = useAuth();
  const showActions = canEdit !== false && (onEdit || onDelete);

  if (!rows.length) {
    return <div className="py-10 text-center text-sm text-neutral-500">{empty || 'No records yet.'}</div>;
  }

  const visibleCols = columns.filter((c) => !c.restricted || isAdmin);
  const totalCols = visibleCols.length + (showActions ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50/60">
            {visibleCols.map((col) => (
              <th
                key={col.key}
                className={`text-xs font-700 uppercase tracking-wide text-neutral-500 px-3 ${dense ? 'py-2' : 'py-3'} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
            {showActions && <th className="text-xs font-700 uppercase tracking-wide text-neutral-500 px-3 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-neutral-100 ${onRowClick ? 'cursor-pointer hover:bg-primary-50/50' : ''} transition-colors`}
            >
              {visibleCols.map((col, c) => (
                <td
                  key={col.key}
                  data-grid={`r${r}c${c}`}
                  tabIndex={0}
                  className={`px-3 ${dense ? 'py-2' : 'py-3'} text-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:bg-accent-50 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.render(row, r)}
                </td>
              ))}
              {showActions && (
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {isAdmin && onEdit && (
                    <button
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary-100 text-primary-600 transition"
                      title="Edit"
                      data-grid={`r${r}c${visibleCols.length}`}
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                    >
                      <EditIcon />
                    </button>
                  )}
                  {isAdmin && onDelete && (
                    <button
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-error-100 text-error-600 transition ml-1"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Restricted columns overlay indicator */}
      {columns.some((c) => c.restricted) && !isAdmin && (
        <RestrictedBanner count={columns.filter((c) => c.restricted).length} />
      )}
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function RestrictedBanner({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-secondary-50 border border-secondary-200 text-sm text-secondary-700">
      <Lock size={15} className="shrink-0" />
      <span><strong className="font-700">{count} column{count > 1 ? 's' : ''} hidden</strong> — Restricted Access. Only Admin can view this data.</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: 'green' | 'yellow' | 'blue' | 'red' | 'gray' }> = {
    Active: { tone: 'green' }, Ready: { tone: 'green' }, Growing: { tone: 'yellow' },
    Harvested: { tone: 'blue' }, Abandoned: { tone: 'red' }, 'Sold Out': { tone: 'gray' },
    Transferred: { tone: 'blue' }, Present: { tone: 'green' }, Absent: { tone: 'red' }, 'Half Day': { tone: 'yellow' },
  };
  const m = map[status] || { tone: 'gray' as const };
  return <Badge tone={m.tone}>{status}</Badge>;
}
