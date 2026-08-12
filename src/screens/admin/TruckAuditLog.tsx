import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, CircleAlert, Download, Filter, History, Loader2, Search, X } from 'lucide-react';
import { fetchDailyCompliance, fetchTruckCheckItems, fetchTruckChecks, fetchTrucks, formatDateTime, type ComplianceEntry, type Truck, type TruckCheck, type TruckCheckItem, TRUCK_STATUS_META } from '@/lib/supabase';

type Range = 'today' | 'week' | 'month';

type Props = { onOpenCheck?: (id: string) => void };

function rangeStart(range: Range): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (range === 'week') date.setDate(date.getDate() - 6);
  if (range === 'month') date.setDate(1);
  return date;
}

function escapeCsv(value: string): string { return `"${value.replaceAll('"', '""')}"`; }

export default function TruckAuditLog({ onOpenCheck }: Props) {
  const [checks, setChecks] = useState<TruckCheck[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [compliance, setCompliance] = useState<ComplianceEntry[]>([]);
  const [range, setRange] = useState<Range>('today');
  const [truckId, setTruckId] = useState('all');
  const [query, setQuery] = useState('');
  const [onlyDefects, setOnlyDefects] = useState(false);
  const [selected, setSelected] = useState<TruckCheck | null>(null);
  const [selectedItems, setSelectedItems] = useState<TruckCheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextChecks, nextTrucks, nextCompliance] = await Promise.all([fetchTruckChecks(), fetchTrucks(false), fetchDailyCompliance()]);
      setChecks(nextChecks); setTrucks(nextTrucks); setCompliance(nextCompliance);
    } catch (err) { setError(err instanceof Error ? err.message : 'Kunne ikke laste truckloggen.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const start = rangeStart(range);
    const needle = query.trim().toLowerCase();
    return checks.filter((check) => {
      const completedAt = check.completed_at ? new Date(check.completed_at) : null;
      if (!completedAt || completedAt < start) return false;
      if (truckId !== 'all' && check.truck_id !== truckId) return false;
      if (onlyDefects && !check.has_red_flag) return false;
      if (needle && !`${check.truck_name} ${check.inspector_name} ${check.inspector_email}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [checks, onlyDefects, query, range, truckId]);

  const completedCount = compliance.filter((entry) => entry.checkedToday).length;
  const missingCount = compliance.length - completedCount;

  async function openDetails(check: TruckCheck) {
    setSelected(check); setDetailLoading(true);
    try { setSelectedItems(await fetchTruckCheckItems(check.id)); } catch { setSelectedItems([]); }
    finally { setDetailLoading(false); }
  }

  function exportCsv() {
    const rows = [['Dato og tid', 'Truck ID', 'Truck navn', 'Inspektør', 'E-post', 'Status'], ...filtered.map((check) => [check.completed_at ? new Date(check.completed_at).toLocaleString('nb-NO') : '', check.truck_id || '', check.truck_name, check.inspector_name, check.inspector_email, check.has_red_flag ? 'Defekt - Ut av drift' : 'Godkjent'])];
    const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `truck-logg-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-5">
    <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Ledelsesoversikt</p><h2 className="mt-1 text-2xl font-bold">Truck logg / historikk</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Følg daglig etterlevelse og finn komplette kontrollrapporter med eksakt tid, inspektør og eventuelle avvik.</p></div><History className="hidden h-8 w-8 text-cyan-300 sm:block" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-400">Truckkontroller i utvalg</p><p className="mt-1 text-2xl font-bold">{filtered.length}</p></div><div className="rounded-2xl bg-emerald-400/15 p-4"><p className="text-xs text-emerald-200">Kontrollert i dag</p><p className="mt-1 text-2xl font-bold text-emerald-300">{completedCount} <span className="text-sm font-medium text-emerald-200">/ {compliance.length}</span></p></div><div className="rounded-2xl bg-amber-400/15 p-4"><p className="text-xs text-amber-200">Mangler i dag</p><p className="mt-1 text-2xl font-bold text-amber-300">{missingCount}</p></div></div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Daglig status</p><h3 className="mt-1 text-lg font-bold">Hvilke trucker er kontrollert?</h3></div><CalendarDays className="h-5 w-5 text-slate-400" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{compliance.map((entry) => <div key={entry.truck.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${entry.checkedToday ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${entry.checkedToday ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{entry.checkedToday ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{entry.truck.name}</p><p className={`text-xs font-semibold ${entry.checkedToday ? 'text-emerald-700' : 'text-amber-700'}`}>{entry.checkedToday ? `Kontrollert ${entry.lastCheck ? formatDateTime(entry.lastCheck.completed_at) : 'i dag'}` : 'Mangler kontroll i dag'}</p></div></div>)}</div>{compliance.length === 0 && !loading && <p className="mt-4 text-sm text-slate-500">Ingen aktive trucker er registrert.</p>}</section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Kontrollrapporter</p><h3 className="mt-1 text-lg font-bold">Fullført trucksjekk</h3></div><button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-4 w-4" /> Eksporter CSV</button></div><div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_150px] md:items-center"><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk truck, inspektør eller e-post" className="w-full bg-transparent text-sm outline-none" /></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><Filter className="h-4 w-4 text-slate-400" /><select value={truckId} onChange={(e) => setTruckId(e.target.value)} className="w-full bg-transparent outline-none"><option value="all">Alle trucker</option>{trucks.map((truck) => <option key={truck.id} value={truck.id}>{truck.code} · {truck.name}</option>)}</select></label><div className="flex rounded-xl bg-slate-100 p-1">{(['today', 'week', 'month'] as Range[]).map((item) => <button key={item} onClick={() => setRange(item)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ${range === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{item === 'today' ? 'I dag' : item === 'week' ? 'Uke' : 'Måned'}</button>)}</div></div><button onClick={() => setOnlyDefects(!onlyDefects)} className={`mt-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${onlyDefects ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{onlyDefects ? '✓ Kun avvik / defekte sjekker' : 'Vis kun avvik / defekte sjekker'}</button>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-slate-400" /> : filtered.length === 0 ? <div className="py-12 text-center"><History className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Ingen fullførte kontroller matcher filtrene.</p></div> : <div className="mt-4 space-y-3">{filtered.map((check) => <div key={check.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-cyan-200 hover:shadow-sm"><div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${check.has_red_flag ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{check.has_red_flag ? <CircleAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{check.truck_name}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${check.has_red_flag ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{check.has_red_flag ? 'Defekt · Ut av drift' : 'Godkjent'}</span></div><p className="mt-1 text-xs text-slate-500">{check.truck_id || 'Ukjent ID'} · {check.completed_at ? new Date(check.completed_at).toLocaleString('nb-NO') : 'Ukjent tidspunkt'}</p><p className="mt-1 truncate text-sm text-slate-700">{check.inspector_name || 'Ukjent inspektør'} <span className="text-slate-400">· {check.inspector_email || 'E-post ikke registrert'}</span></p></div><button onClick={() => onOpenCheck ? onOpenCheck(check.id) : openDetails(check)} className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700">Detaljer</button></div></div>)}</div>}</section>

    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Full rapport</p><h2 className="mt-1 text-xl font-bold">{selected.truck_name}</h2><p className="mt-1 text-sm text-slate-500">{selected.completed_at ? new Date(selected.completed_at).toLocaleString('nb-NO') : ''} · {selected.inspector_name}</p></div><button onClick={() => setSelected(null)} className="rounded-xl bg-slate-100 p-2"><X className="h-4 w-4" /></button></div><div className={`mt-5 rounded-2xl p-4 ${selected.has_red_flag ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}><p className="font-bold">{selected.has_red_flag ? 'Defekt - truck satt ut av drift' : 'Godkjent for bruk'}</p><p className="mt-1 text-sm">Inspektør: {selected.inspector_name} · {selected.inspector_email || 'E-post ikke registrert'}</p></div>{detailLoading ? <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-slate-400" /> : <div className="mt-5 space-y-2">{selectedItems.map((item, index) => { const meta = TRUCK_STATUS_META[item.status]; return <div key={item.id} className={`rounded-2xl border p-3 ${meta.border}`}><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</span><div className="flex-1"><p className="text-sm font-bold">{item.item_label}</p><p className={`mt-1 text-xs font-semibold ${meta.color}`}>{meta.label}</p>{item.comment && <p className="mt-1 text-sm text-slate-600">{item.comment}</p>}</div></div></div>; })}<div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-bold text-slate-800">Signatur</p><p className="mt-1">{selected.signature || 'Ingen signatur registrert'}</p></div></div>}</div></div>}
  </div>;
}
