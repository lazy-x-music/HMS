import { useState, useMemo } from 'react';
import { ArrowLeft, History, CheckCircle2, ChevronRight, Search, Loader2, Trash2 } from 'lucide-react';
import { supabase, formatMonthYear, formatDateTime, type Inspection } from '@/lib/supabase';
import { BottomNav } from './Dashboard';

type Tab = 'dashboard' | 'history' | 'issues';

type Props = {
  onBack: () => void;
  onNavigate: (tab: Tab) => void;
  onViewInspection: (id: string) => void;
  inspections: Inspection[];
  loading: boolean;
  isAdmin?: boolean;
  onDeleted?: () => void;
};

export default function HistoryScreen({ onBack, onNavigate, onViewInspection, inspections, loading, isAdmin, onDeleted }: Props) {
  const [query, setQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const completed = useMemo(
    () => inspections.filter((i) => i.status === 'completed'),
    [inspections],
  );

  async function deleteInspection(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Slette denne inspeksjonen? Dette kan ikke angres.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('inspections').delete().eq('id', id);
      if (error) throw error;
      onDeleted?.();
    } catch {
      alert('Kunne ikke slette inspeksjonen.');
    } finally {
      setDeletingId(null);
    }
  }

  const years = useMemo(() => {
    const set = new Set(completed.map((i) => i.period_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [completed]);

  const filtered = useMemo(() => {
    let list = completed;
    if (yearFilter !== 'all') list = list.filter((i) => String(i.period_year) === yearFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.inspector_name.toLowerCase().includes(q) ||
          formatMonthYear(i.period_month, i.period_year).toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
  }, [completed, query, yearFilter]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-12 pb-6 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">Historikk</h1>
            <p className="text-slate-400 text-xs">Alle fullførte inspeksjoner</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3.5 py-2.5">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk etter inspektør eller måned..."
            className="flex-1 bg-transparent outline-none text-white placeholder-slate-500 text-sm"
          />
        </div>

        {/* Year filter */}
        {years.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setYearFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                yearFilter === 'all' ? 'bg-white text-slate-900' : 'bg-white/10 text-slate-300'
              }`}
            >
              Alle år
            </button>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYearFilter(String(y))}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  yearFilter === String(y) ? 'bg-white text-slate-900' : 'bg-white/10 text-slate-300'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="px-5 mt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center mt-4">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Ingen inspeksjoner funnet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((insp) => (
              <div
                key={insp.id}
                className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <button
                  onClick={() => onViewInspection(insp.id)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-sm truncate">
                      {formatMonthYear(insp.period_month, insp.period_year)}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">
                      {insp.inspector_name}
                    </p>
                    <p className="text-slate-300 text-xs mt-0.5">
                      {formatDateTime(insp.completed_at)}
                    </p>
                  </div>
                  <ChevronRight className="w-4.5 h-4.5 text-slate-300 shrink-0" />
                </button>
                {isAdmin && (
                  <button
                    onClick={(e) => deleteInspection(insp.id, e)}
                    disabled={deletingId === insp.id}
                    className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0 hover:bg-red-100 transition-colors disabled:opacity-40"
                  >
                    {deletingId === insp.id ? (
                      <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="history" onNavigate={onNavigate} />
    </div>
  );
}
