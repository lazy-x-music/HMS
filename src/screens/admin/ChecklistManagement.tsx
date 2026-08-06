import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check,
  ArrowUp, ArrowDown, Eye, EyeOff,
} from 'lucide-react';
import { supabase, type ChecklistItem, fetchAllChecklistItems } from '@/lib/supabase';

type EditState = { id?: string; item_key: string; item_label: string; sort_order: number };

export default function ChecklistManagement() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllChecklistItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste sjekkliste');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing) return;
    if (!editing.item_key.trim() || !editing.item_label.trim()) {
      setError('Nummer og tekst er påkrevd.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing.id) {
        const { error } = await supabase
          .from('checklist_items')
          .update({ item_key: editing.item_key, item_label: editing.item_label, sort_order: editing.sort_order })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('checklist_items')
          .insert({ item_key: editing.item_key, item_label: editing.item_label, sort_order: editing.sort_order || items.length + 1 });
        if (error) throw error;
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lagre');
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: ChecklistItem) {
    if (!confirm(`Slette punkt ${c.item_key}?`)) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.from('checklist_items').delete().eq('id', c.id);
      if (error) throw error;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke slette');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: ChecklistItem) {
    setBusy(true);
    const { error } = await supabase.from('checklist_items').update({ active: !c.active }).eq('id', c.id);
    if (!error) await load();
    setBusy(false);
  }

  async function move(c: ChecklistItem, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === c.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const swap = items[swapIdx];
    setBusy(true);
    const { error: e1 } = await supabase.from('checklist_items').update({ sort_order: swap.sort_order }).eq('id', c.id);
    const { error: e2 } = await supabase.from('checklist_items').update({ sort_order: c.sort_order }).eq('id', swap.id);
    if (!e1 && !e2) await load();
    setBusy(false);
  }

  return (
    <div>
      <button
        onClick={() => setEditing({ item_key: '', item_label: '', sort_order: items.length + 1 })}
        className="w-full mb-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
      >
        <Plus className="w-4 h-4" /> Nytt kontrollpunkt
      </button>

      {error && (
        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c, idx) => (
            <div key={c.id} className={`bg-white rounded-2xl shadow-sm p-3 ${!c.active ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(c, -1)}
                    disabled={busy || idx === 0}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => move(c, 1)}
                    disabled={busy || idx === items.length - 1}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-600">{c.item_key}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-medium text-sm leading-snug">{c.item_label}</p>
                </div>
                <button
                  onClick={() => toggleActive(c)}
                  disabled={busy}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
                >
                  {c.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditing({ id: c.id, item_key: c.item_key, item_label: c.item_label, sort_order: c.sort_order })}
                  disabled={busy}
                  className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => remove(c)}
                  disabled={busy}
                  className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 font-bold text-base">{editing.id ? 'Rediger punkt' : 'Nytt kontrollpunkt'}</h3>
              <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Nummer</label>
                <input
                  value={editing.item_key}
                  onChange={(e) => setEditing({ ...editing, item_key: e.target.value })}
                  placeholder="f.eks. 1.31"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Tekst</label>
                <textarea
                  value={editing.item_label}
                  onChange={(e) => setEditing({ ...editing, item_label: e.target.value })}
                  placeholder="Kontrollpunkt beskrivelse..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Sorteringsrekkefølge</label>
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
                />
              </div>
            </div>
            <button
              onClick={save}
              disabled={busy}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editing.id ? 'Lagre endringer' : 'Opprett punkt'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
