import { useEffect, useRef } from 'react';

// A keyboard-navigable grid/table. Arrow keys move focus between cells/rows;
// Enter triggers onActivate on the focused row. High-contrast focus is via :focus-visible.
export function useGridKeyboard(rowCount: number, colCount: number, onActivate: (row: number) => void) {
  const posRef = useRef({ r: 0, c: 0 });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only act when not focused inside an input/select/textarea
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      let { r, c } = posRef.current;
      let handled = false;
      if (e.key === 'ArrowDown') { r = Math.min(rowCount - 1, r + 1); handled = true; }
      else if (e.key === 'ArrowUp') { r = Math.max(0, r - 1); handled = true; }
      else if (e.key === 'ArrowRight') { c = Math.min(colCount - 1, c + 1); handled = true; }
      else if (e.key === 'ArrowLeft') { c = Math.max(0, c - 1); handled = true; }
      else if (e.key === 'Enter') { onActivate(r); handled = true; }
      else if (e.key === 'Home') { c = 0; handled = true; }
      else if (e.key === 'End') { c = colCount - 1; handled = true; }
      if (handled) {
        e.preventDefault();
        posRef.current = { r, c };
        const cell = document.querySelector<HTMLElement>(`[data-grid="r${r}c${c}"]`);
        cell?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rowCount, colCount, onActivate]);
}
