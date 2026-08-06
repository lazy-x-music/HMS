import { useEffect, useState } from 'react';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, ChevronRight, Loader2,
  Calendar, User, ImageOff,
} from 'lucide-react';
import { supabase, formatMonthYear, formatDateTime, type Issue, type Inspection } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { BottomNav } from './Dashboard';

type Tab = 'dashboard' | 'history' | 'issues';

type Props = {
  onBack: () => void;
  onNavigate: (tab: Tab) => void;
  onViewInspection: (id: string) => void;
};

export default function IssuesScreen({ onBack, onNavigate, onViewInspection }: Props) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [issues, setIssues] = useState<Issue[]>([]);
  const [inspMap, setInspMap] = useState<Record<string, Inspection>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: iss }, { data: insps }] = await Promise.all([
      supabase.from('issues').select('*').order('created_at', { ascending: false }),
      supabase.from('inspections').select('*'),
    ]);
    setIssues((iss || []) as Issue[]);
    const map: Record<string, Inspection> = {};
    for (const i of (insps || []) as Inspection[]) map[i.id] = i;
    setInspMap(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function resolve(issue: Issue) {
    setBusyId(issue.id);
    const { error } = await supabase
      .from('issues')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', issue.id);
    if (!error) {
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status: 'resolved', resolved_at: new Date().toISOString() } : i)));
    }
    setBusyId(null);
  }

  async function reopen(issue: Issue) {
    setBusyId(issue.id);
    const { error } = await supabase
      .from('issues')
      .update({ status: 'open', resolved_at: null })
      .eq('id', issue.id);
    if (!error) {
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status: 'open', resolved_at: null } : i)));
    }
    setBusyId(null);
  }

  const filtered = issues.filter((i) => filter === 'all' || i.status === filter);
  const openCount = issues.filter((i) => i.status === 'open').length;
  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;

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
            <h1 className="text-white font-bold text-lg">Avvik</h1>
            <p className="text-slate-400 text-xs">Åpne og løste avvik</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-white/10 rounded-xl">
          {([
            { id: 'open', label: `Åpne (${openCount})` },
            { id: 'resolved', label: `Løste (${resolvedCount})` },
            { id: 'all', label: 'Alle' },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                filter === f.id ? 'bg-white text-slate-900' : 'text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 mt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Ingen avvik å vise</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((issue) => {
              const insp = inspMap[issue.inspection_id];
              const isOpen = issue.status === 'open';
              return (
                <div
                  key={issue.id}
                  className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${
                    isOpen ? 'border-red-500' : 'border-emerald-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isOpen ? 'bg-red-50' : 'bg-emerald-50'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${isOpen ? 'text-red-500' : 'text-emerald-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">{issue.item_key}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isOpen ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isOpen ? 'ÅPEN' : 'LØST'}
                        </span>
                      </div>
                      <p className="text-slate-900 font-semibold text-sm mt-0.5 leading-snug">{issue.item_label}</p>
                      {issue.comment && (
                        <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{issue.comment}</p>
                      )}
                      {issue.photo_url && (
                        <button onClick={() => setPhotoModal(issue.photo_url)} className="mt-2 inline-block">
                          <img src={issue.photo_url} alt="Bevis" className="w-20 h-20 rounded-xl object-cover" />
                        </button>
                      )}
                      {insp && (
                        <div className="mt-2.5 space-y-1 text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {formatMonthYear(insp.period_month, insp.period_year)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {insp.inspector_name}
                          </div>
                        </div>
                      )}
                      {insp && (
                        <button
                          onClick={() => onViewInspection(insp.id)}
                          className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1"
                        >
                          Se inspeksjon <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => (isOpen ? resolve(issue) : reopen(issue))}
                          disabled={busyId === issue.id}
                          className={`mt-3 w-full py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                            isOpen
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          } disabled:opacity-60`}
                        >
                          {busyId === issue.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {isOpen ? 'Merk som løst' : 'Gjenåpne avvik'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav active="issues" onNavigate={onNavigate} />

      {photoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-5"
          onClick={() => setPhotoModal(null)}
        >
          <img src={photoModal} alt="Bevis" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}
