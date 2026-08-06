import { useEffect, useState } from 'react';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  Calendar, User, Camera, Loader2, ImageOff, Building2, ScanLine, MapPin,
} from 'lucide-react';
import {
  supabase, formatMonthYear, formatDateTime, STATUS_META,
  type Inspection, type InspectionItem, type Issue, type InspectionStation,
} from '@/lib/supabase';

type Props = {
  inspectionId: string;
  onBack: () => void;
};

export default function InspectionDetail({ inspectionId, onBack }: Props) {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stations, setStations] = useState<InspectionStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [{ data: insp }, { data: its }, { data: iss }, { data: sts }] = await Promise.all([
        supabase.from('inspections').select('*').eq('id', inspectionId).maybeSingle(),
        supabase.from('inspection_items').select('*').eq('inspection_id', inspectionId),
        supabase.from('issues').select('*').eq('inspection_id', inspectionId),
        supabase.from('inspection_stations').select('*').eq('inspection_id', inspectionId).order('checked_at', { ascending: true }),
      ]);
      if (!mounted) return;
      if (insp) setInspection(insp as Inspection);
      setItems((its || []) as InspectionItem[]);
      setIssues((iss || []) as Issue[]);
      setStations((sts || []) as InspectionStation[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [inspectionId]);

  const sortedItems = [...items].sort((a, b) => a.item_key.localeCompare(b.item_key));
  const redCount = items.filter((i) => i.status === 'tiltak_nodvendig').length;
  const yellowCount = items.filter((i) => i.status === 'tiltak_vurderes').length;
  const greenCount = items.filter((i) => i.status === 'tilfredsstillende').length;
  const naCount = items.filter((i) => i.status === 'ikke_relevant').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-12 pb-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">
              {inspection ? formatMonthYear(inspection.period_month, inspection.period_year) : 'Rapport'}
            </h1>
            <p className="text-slate-400 text-xs">Inspeksjonsrapport</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : !inspection ? (
        <div className="px-5 py-20 text-center text-slate-400 text-sm">
          Inspeksjon ikke funnet
        </div>
      ) : (
        <>
          {/* Meta */}
          <div className="px-5 mt-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-700 font-semibold text-sm">Fullført</span>
              </div>
              <div className="space-y-2.5">
                <MetaRow icon={<Calendar className="w-4 h-4" />} label="Fullført" value={formatDateTime(inspection.completed_at)} />
                <MetaRow icon={<User className="w-4 h-4" />} label="Inspektør" value={inspection.inspector_name || '—'} />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="px-5 mt-3 grid grid-cols-4 gap-2">
            <SummaryCard count={greenCount} label="OK" color="bg-emerald-50 text-emerald-600" />
            <SummaryCard count={yellowCount} label="Vurderes" color="bg-amber-50 text-amber-600" />
            <SummaryCard count={redCount} label="Tiltak" color="bg-red-50 text-red-600" />
            <SummaryCard count={naCount} label="N/A" color="bg-gray-100 text-gray-500" />
          </div>

          {/* Stations */}
          {stations.length > 0 && (
            <div className="px-5 mt-5">
              <h2 className="text-slate-900 font-bold text-base mb-3">Brannposter</h2>
              <div className="grid grid-cols-2 gap-2">
                {stations.map((st) => (
                  <div key={st.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      {st.checked_method === 'scanned' ? (
                        <ScanLine className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <MapPin className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-900 text-xs font-semibold truncate">{st.station_name}</p>
                      {st.skip_reason ? (
                        <p className="text-amber-600 text-[10px] truncate">{st.skip_reason}</p>
                      ) : (
                        <p className="text-slate-400 text-[10px]">
                          {st.checked_method === 'scanned' ? 'Skannet' : 'Manuell'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="px-5 mt-5">
            <h2 className="text-slate-900 font-bold text-base mb-3">Kontrollpunkter</h2>
            <div className="space-y-2.5">
              {sortedItems.map((item) => {
                const meta = STATUS_META[item.status];
                const hasIssue = issues.some((iss) => iss.item_key === item.item_key && iss.status === 'open');
                return (
                  <div key={item.id} className={`bg-white rounded-2xl shadow-sm border-l-4 p-4 ${meta.border.replace('border-', 'border-l-')}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <span className="text-xs font-bold text-slate-700">{item.item_key}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-semibold text-sm leading-snug">{item.item_label}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.color}`}>
                            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                          {hasIssue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" /> Åpent avvik
                            </span>
                          )}
                        </div>
                        {item.comment && (
                          <p className="text-slate-500 text-xs mt-2 leading-relaxed">{item.comment}</p>
                        )}
                        {item.photo_url && (
                          <button
                            onClick={() => setPhotoModal(item.photo_url)}
                            className="mt-2.5 inline-block"
                          >
                            <img src={item.photo_url} alt="Bevis" className="w-20 h-20 rounded-xl object-cover" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Photo modal */}
      {photoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-5"
          onClick={() => setPhotoModal(null)}
        >
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={photoModal} alt="Bevis" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-400 text-xs">{label}:</span>
      <span className="text-slate-900 text-sm font-medium">{value}</span>
    </div>
  );
}

function SummaryCard({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mx-auto mb-1.5`}>
        <span className="text-lg font-bold">{count}</span>
      </div>
      <p className="text-slate-400 text-[10px] font-medium">{label}</p>
    </div>
  );
}
