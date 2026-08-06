import { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Building2, Plus, Pencil, Trash2, X, Loader2, AlertCircle,
  QrCode, Printer, Check,
} from 'lucide-react';
import { supabase, type FireStation, fetchFireStations } from '@/lib/supabase';

type EditState = { id?: string; name: string; code: string; location: string; sort_order: number };

export default function StationManagement() {
  const [stations, setStations] = useState<FireStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [printMode, setPrintMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFireStations(false);
      setStations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste brannposter');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.code.trim()) {
      setError('Navn og kode er påkrevd.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing.id) {
        const { error } = await supabase
          .from('fire_stations')
          .update({
            name: editing.name,
            code: editing.code,
            location: editing.location,
            sort_order: editing.sort_order,
          })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fire_stations')
          .insert({
            name: editing.name,
            code: editing.code,
            location: editing.location,
            sort_order: editing.sort_order || stations.length + 1,
          });
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

  async function remove(s: FireStation) {
    if (!confirm(`Slette ${s.name}? Dette kan ikke angres.`)) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.from('fire_stations').delete().eq('id', s.id);
      if (error) throw error;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke slette');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(s: FireStation) {
    setBusy(true);
    const { error } = await supabase.from('fire_stations').update({ active: !s.active }).eq('id', s.id);
    if (!error) await load();
    setBusy(false);
  }

  if (printMode) {
    return <PrintLabels stations={stations} onBack={() => setPrintMode(false)} />;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPrintMode(true)}
          className="flex-1 py-2.5 rounded-xl bg-white shadow-sm text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-shadow"
        >
          <Printer className="w-4 h-4" /> Skriv ut QR-labels
        </button>
        <button
          onClick={() => setEditing({ name: '', code: '', location: '', sort_order: stations.length + 1 })}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
        >
          <Plus className="w-4 h-4" /> Ny brannpost
        </button>
      </div>

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
        <div className="space-y-2.5">
          {stations.map((s) => (
            <div key={s.id} className={`bg-white rounded-2xl shadow-sm p-4 ${!s.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm">{s.name}</p>
                  <p className="text-slate-400 text-xs">{s.code} · {s.location || 'Ingen lokasjon'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => toggleActive(s)}
                  disabled={busy}
                  className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                >
                  {s.active ? 'Deaktiver' : 'Aktiver'}
                </button>
                <button
                  onClick={() => setEditing({ id: s.id, name: s.name, code: s.code, location: s.location, sort_order: s.sort_order })}
                  className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                >
                  <Pencil className="w-3 h-3" /> Rediger
                </button>
                <button
                  onClick={() => remove(s)}
                  disabled={busy}
                  className="py-2 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 font-bold text-base">{editing.id ? 'Rediger brannpost' : 'Ny brannpost'}</h3>
              <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <FormField label="Navn">
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="f.eks. Brannpost 9"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
                />
              </FormField>
              <FormField label="Kode">
                <input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  placeholder="f.eks. BP9"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
                />
              </FormField>
              <FormField label="Lokasjon">
                <input
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  placeholder="f.eks. 3. etasje"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
                />
              </FormField>
              <FormField label="Sorteringsrekkefølge">
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
                />
              </FormField>
            </div>
            <button
              onClick={save}
              disabled={busy}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editing.id ? 'Lagre endringer' : 'Opprett brannpost'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function PrintLabels({ stations, onBack }: { stations: FireStation[]; onBack: () => void }) {
  const refs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function gen() {
      for (const s of stations) {
        const canvas = refs.current[s.id];
        if (canvas) {
          const url = `${window.location.origin}/#scan=${s.qr_token}`;
          await QRCode.toCanvas(canvas, url, { width: 200, margin: 1 });
        }
      }
      if (mounted) setReady(true);
    }
    gen();
    return () => { mounted = false; };
  }, [stations]);

  function print() {
    window.print();
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 print:hidden">
        <button onClick={onBack} className="flex-1 py-2.5 rounded-xl bg-white shadow-sm text-slate-700 text-sm font-semibold">
          Tilbake
        </button>
        <button
          onClick={print}
          disabled={!ready}
          className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Printer className="w-4 h-4" /> Skriv ut
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 print:shadow-none print:p-0">
        <p className="text-sm text-slate-500 mb-3 print:hidden">
          QR-kodene peker på appens skanner. Skriv ut og fest på hver brannpost.
        </p>
        <div className="grid grid-cols-2 gap-4 print:grid-cols-3">
          {stations.filter((s) => s.active).map((s) => (
            <div key={s.id} className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center print:break-inside-avoid">
              <canvas ref={(el) => { refs.current[s.id] = el; }} className="mx-auto" />
              <p className="text-slate-900 font-bold text-sm mt-2">{s.name}</p>
              <p className="text-slate-500 text-xs">{s.code}</p>
              <p className="text-slate-400 text-xs">{s.location}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
