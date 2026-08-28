import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, Loader2 } from 'lucide-react';
import { loadCustomCategories, createCustomCategory, type CustomCategory } from '@/lib/db';
import { Modal, Button, Input } from '@/components/ui';

interface DynamicSelectProps {
  label?: string;
  moduleName: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
}

export function DynamicSelect({ label, moduleName, value, onChange, className = '', required, placeholder }: DynamicSelectProps) {
  const [options, setOptions] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchOptions = useCallback(async () => {
    try {
      const cats = await loadCustomCategories(moduleName);
      setOptions(cats);
    } catch {
      // Fallback: empty list, user can still add
    } finally {
      setLoading(false);
    }
  }, [moduleName]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const handleAddNew = async () => {
    if (!newName.trim()) { setError('Category name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await createCustomCategory(moduleName, newName.trim(), newDesc.trim() || undefined);
      setOptions((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.name);
      setShowModal(false);
      setNewName('');
      setNewDesc('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setNewName('');
    setNewDesc('');
    setError('');
    setShowModal(true);
  };

  return (
    <>
      <label className="block">
        {label && <span className="block text-xs font-600 text-neutral-600 mb-1">{label}</span>}
        <div className="relative">
          <select
            value={value}
            onChange={(e) => {
              if (e.target.value === '__add_new__') {
                openModal();
                return;
              }
              onChange(e.target.value);
            }}
            required={required}
            className={`w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-100 outline-none transition appearance-none pr-9 ${className}`}
          >
            {loading && <option value="">Loading…</option>}
            {!loading && placeholder && <option value="">{placeholder}</option>}
            {!loading && options.map((opt) => (
              <option key={opt.id} value={opt.name}>{opt.name}</option>
            ))}
            <option value="__add_new__" disabled style={{ display: 'none' }}>__add_new__</option>
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            {loading ? <Loader2 size={14} className="text-neutral-400 animate-spin" /> : <ChevronDown size={14} className="text-neutral-400" />}
          </div>
        </div>
        {!loading && (
          <button
            type="button"
            onClick={openModal}
            className="mt-1 inline-flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 font-600 transition"
          >
            <Plus size={12} /> Add new category
          </button>
        )}
      </label>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Category" size="sm">
        <div className="space-y-3">
          <Input label="Category name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. New Category" autoFocus />
          <Input label="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description" />
          {error && <div className="text-sm text-error-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleAddNew} disabled={saving || !newName.trim()}>
              {saving ? 'Saving…' : 'Add category'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
