import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Camera, CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  Loader2, X, Save, ScanLine, MapPin, ChevronRight, ClipboardList, Building2,
  FlaskConical, ChevronDown,
} from 'lucide-react';
import {
  supabase, STATUS_META, type ItemStatus, type Inspection,
  type FireStation, type ChecklistItem, fetchChecklistItems, fetchFireStations,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import QRScanner from '@/components/QRScanner';

type Props = {
  onBack: () => void;
  onComplete: (inspectionId: string) => void;
  existing?: Inspection | null;
  testMode?: boolean;
};

type Step = 1 | 2 | 3;

type StationCheck = {
  station: FireStation;
  checked: boolean;
  method: 'scanned' | 'manual' | '';
  skipReason: string;
};

type ItemState = {
  status: ItemStatus;
  comment: string;
  photo_url: string;
};

const DEFAULT_STATUS: ItemStatus = 'tilfredsstillende';

const STATUS_OPTIONS: { value: ItemStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'tilfredsstillende', label: 'Tilfredsstillende', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600' },
  { value: 'tiltak_vurderes', label: 'Tiltak vurderes', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-600' },
  { value: 'tiltak_nodvendig', label: 'Tiltak nødvendig', icon: <XCircle className="w-4 h-4" />, color: 'text-red-600' },
  { value: 'ikke_relevant', label: 'Ikke relevant', icon: <MinusCircle className="w-4 h-4" />, color: 'text-gray-500' },
];

export default function InspectionForm({ onBack, onComplete, existing, testMode }: Props) {
  const { profile } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [step, setStep] = useState<Step>(1);
  const [stations, setStations] = useState<FireStation[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [stationChecks, setStationChecks] = useState<Record<string, StationCheck>>({});
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simulatingStation, setSimulatingStation] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [stns, chk] = await Promise.all([fetchFireStations(true), fetchChecklistItems()]);
        if (!mounted) return;
        setStations(stns);
        setChecklist(chk);
        const sc: Record<string, StationCheck> = {};
        for (const s of stns) {
          sc[s.id] = { station: s, checked: false, method: '', skipReason: '' };
        }
        setStationChecks(sc);
        const it: Record<string, ItemState> = {};
        for (const c of chk) {
          it[c.id] = { status: DEFAULT_STATUS, comment: '', photo_url: '' };
        }
        setItems(it);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke laste data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const requiresComment = (s: ItemStatus) => s === 'tiltak_vurderes' || s === 'tiltak_nodvendig';

  const setStatus = useCallback((id: string, status: ItemStatus) => {
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], status } }));
    if (requiresComment(status)) setExpandedKey(id);
  }, []);

  const setComment = useCallback((id: string, comment: string) => {
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], comment } }));
  }, []);

  async function uploadPhoto(id: string, file: File) {
    setPhotoBusy(id);
    setError('');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}-${id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('inspection-photos').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('inspection-photos').getPublicUrl(path);
      setItems((prev) => ({ ...prev, [id]: { ...prev[id], photo_url: pub.publicUrl } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste opp bilde');
    } finally {
      setPhotoBusy(null);
    }
  }

  function removePhoto(id: string) {
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], photo_url: '' } }));
  }

  function onScanStation(station: FireStation) {
    setStationChecks((prev) => ({
      ...prev,
      [station.id]: { ...prev[station.id], checked: true, method: 'scanned', skipReason: '' },
    }));
    setScanning(false);
  }

  function manualCheck(stationId: string) {
    setStationChecks((prev) => ({
      ...prev,
      [stationId]: { ...prev[stationId], checked: true, method: 'manual', skipReason: '' },
    }));
  }

  function setSkipReason(stationId: string, reason: string) {
    setStationChecks((prev) => ({
      ...prev,
      [stationId]: {
        ...prev[stationId],
        checked: true,
        method: 'manual',
        skipReason: reason,
      },
    }));
  }

  const stationsCheckedCount = Object.values(stationChecks).filter((s) => s.checked).length;
  const allStationsChecked = stations.length > 0 && stationsCheckedCount === stations.length;

  const answeredCount = checklist.filter((c) => items[c.id]?.status !== DEFAULT_STATUS).length;
  const redCount = checklist.filter((c) => items[c.id]?.status === 'tiltak_nodvendig').length;
  const yellowCount = checklist.filter((c) => items[c.id]?.status === 'tiltak_vurderes').length;

  function canProceedToStep2() {
    return allStationsChecked;
  }

  async function save() {
    setError('');
    for (const c of checklist) {
      const st = items[c.id];
      if (!st) continue;
      if (requiresComment(st.status) && !st.comment.trim()) {
        setError(`Punkt ${c.item_key} krever en kommentar (${STATUS_META[st.status].label}).`);
        setExpandedKey(c.id);
        setStep(2);
        return;
      }
    }
    setSaving(true);
    try {
      let inspectionId: string;
      if (existing) {
        inspectionId = existing.id;
      } else if (testMode) {
        const { data: newIns, error: insErr } = await supabase
          .from('inspections')
          .insert({
            period_month: currentMonth,
            period_year: currentYear,
            status: 'pending',
            inspector_name: `${profile?.full_name || 'Test'} (TEST)`,
          })
          .select('id')
          .single();
        if (insErr) throw insErr;
        inspectionId = newIns.id;
      } else {
        const { data: existingInsp } = await supabase
          .from('inspections')
          .select('id')
          .eq('period_month', currentMonth)
          .eq('period_year', currentYear)
          .maybeSingle();
        if (existingInsp) {
          inspectionId = existingInsp.id;
        } else {
          const { data: newIns, error: insErr } = await supabase
            .from('inspections')
            .insert({
              period_month: currentMonth,
              period_year: currentYear,
              status: 'pending',
              inspector_name: profile?.full_name || '',
            })
            .select('id')
            .single();
          if (insErr) throw insErr;
          inspectionId = newIns.id;
        }
      }

      // Save station checks (delete old first)
      await supabase.from('inspection_stations').delete().eq('inspection_id', inspectionId);
      const stationRows = Object.values(stationChecks).map((sc) => ({
        inspection_id: inspectionId,
        station_id: sc.station.id,
        station_name: sc.station.name,
        checked_method: sc.method === 'scanned' ? 'scanned' : 'manual',
        skip_reason: sc.skipReason || '',
      }));
      if (stationRows.length > 0) {
        const { error: stErr } = await supabase.from('inspection_stations').insert(stationRows);
        if (stErr) throw stErr;
      }

      // Save checklist items
      await supabase.from('inspection_items').delete().eq('inspection_id', inspectionId);
      const rows = checklist.map((c) => ({
        inspection_id: inspectionId,
        checklist_item_id: c.id,
        item_key: c.item_key,
        item_label: c.item_label,
        status: items[c.id].status,
        comment: items[c.id].comment,
        photo_url: items[c.id].photo_url,
      }));
      const { error: itemsErr } = await supabase.from('inspection_items').insert(rows);
      if (itemsErr) throw itemsErr;

      // Mark completed
      const { error: updErr } = await supabase
        .from('inspections')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          inspector_name: profile?.full_name || '',
        })
        .eq('id', inspectionId);
      if (updErr) throw updErr;

      // Create issues for red items
      const redItems = checklist.filter((c) => items[c.id].status === 'tiltak_nodvendig');
      await supabase.from('issues').delete().eq('inspection_id', inspectionId).eq('status', 'open');
      if (redItems.length > 0) {
        const issueRows = redItems.map((c) => ({
          inspection_id: inspectionId,
          item_key: c.item_key,
          item_label: c.item_label,
          comment: items[c.id].comment,
          photo_url: items[c.id].photo_url,
          status: 'open',
        }));
        const { error: issErr } = await supabase.from('issues').insert(issueRows);
        if (issErr) throw issErr;
      }

      onComplete(inspectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lagre inspeksjon');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (scanning) {
    return <QRScanner stations={stations} onScan={onScanStation} onClose={() => setScanning(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-12 pb-5 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg flex items-center gap-2">
              Brannvernrunde
              {testMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  <FlaskConical className="w-3 h-3" /> TEST
                </span>
              )}
            </h1>
            <p className="text-slate-400 text-xs">
              {currentMonth}.{currentYear}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-2 ${step >= s ? 'text-white' : 'text-white/30'}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step > s
                      ? 'bg-emerald-500 text-white'
                      : step === s
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                <span className="text-xs font-medium hidden sm:inline">
                  {s === 1 ? 'Brannposter' : s === 2 ? 'Sjekkliste' : 'Gjennomgang'}
                </span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${step > s ? 'bg-emerald-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="px-5 mt-4">
          <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* STEP 1: Fire Stations */}
      {step === 1 && (
        <div className="px-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-slate-900 font-semibold text-sm">Trinn 1: Brannposter</p>
                <p className="text-slate-400 text-xs">
                  {stationsCheckedCount}/{stations.length} sjekket
                </p>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stationsCheckedCount}</div>
            </div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                style={{ width: `${(stationsCheckedCount / Math.max(stations.length, 1)) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setScanning(true)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mb-3"
          >
            <ScanLine className="w-5 h-5" />
            Skann QR-kode
          </button>

          {/* Simulate scan dropdown */}
          <div className="relative mb-4">
            <button
              onClick={() => setSimulatingStation((v) => !v)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${simulatingStation ? 'rotate-180' : ''}`} />
              Simuler skann (velg brannpost)
            </button>
            {simulatingStation && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 z-20 max-h-64 overflow-y-auto">
                {stations.map((s) => {
                  const alreadyChecked = stationChecks[s.id]?.checked;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        onScanStation(s);
                        setSimulatingStation(false);
                      }}
                      disabled={alreadyChecked}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors disabled:opacity-40"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 text-sm font-medium truncate">{s.name}</p>
                        <p className="text-slate-400 text-xs">{s.code} · {s.location || 'Ingen lokasjon'}</p>
                      </div>
                      {alreadyChecked && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {stations.map((s) => {
              const check = stationChecks[s.id];
              const checked = check?.checked;
              return (
                <div
                  key={s.id}
                  className={`bg-white rounded-2xl shadow-sm p-4 border-2 transition-all ${
                    checked ? 'border-emerald-200' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      checked ? 'bg-emerald-50' : 'bg-slate-100'
                    }`}>
                      {checked ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <MapPin className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-semibold text-sm">{s.name}</p>
                      <p className="text-slate-400 text-xs">{s.location || s.code}</p>
                      {checked && check.method === 'scanned' && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-emerald-600">
                          <ScanLine className="w-3 h-3" /> Skannet
                        </span>
                      )}
                      {checked && check.skipReason && (
                        <p className="text-xs text-amber-600 mt-1">Hoppet over: {check.skipReason}</p>
                      )}
                    </div>
                    {!checked && (
                      <button
                        onClick={() => manualCheck(s.id)}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                      >
                        Sjekk
                      </button>
                    )}
                  </div>
                  {!checked && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-1.5">Kan ikke sjekkes? Oppgi årsak:</p>
                      <input
                        type="text"
                        placeholder="f.eks. QR skadet, ingen tilgang..."
                        onBlur={(e) => {
                          if (e.target.value.trim()) setSkipReason(s.id, e.target.value);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-red-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => canProceedToStep2() && setStep(2)}
            disabled={!canProceedToStep2()}
            className="w-full mt-5 py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {canProceedToStep2() ? 'Videre til sjekkliste' : 'Sjekk alle brannposter først'}
            {canProceedToStep2() && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* STEP 2: Checklist */}
      {step === 2 && (
        <div className="px-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-slate-900 font-semibold text-sm">Trinn 2: Sjekkliste</p>
                <p className="text-slate-400 text-xs">{checklist.length} kontrollpunkter</p>
              </div>
            </div>
            {(redCount > 0 || yellowCount > 0) && (
              <div className="flex gap-2 mt-3">
                {redCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                    <XCircle className="w-3 h-3" /> {redCount} tiltak nødvendig
                  </span>
                )}
                {yellowCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" /> {yellowCount} tiltak vurderes
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {checklist.map((c) => {
              const st = items[c.id] || { status: DEFAULT_STATUS, comment: '', photo_url: '' };
              const meta = STATUS_META[st.status];
              const expanded = expandedKey === c.id;
              const needsComment = requiresComment(st.status);
              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-2xl shadow-sm border-2 transition-all overflow-hidden ${
                    expanded ? meta.border : 'border-transparent'
                  }`}
                >
                  <button
                    onClick={() => setExpandedKey(expanded ? null : c.id)}
                    className="w-full flex items-start gap-3 p-4 text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <span className="text-xs font-bold text-slate-700">{c.item_key}</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-slate-900 font-semibold text-sm leading-snug">{c.item_label}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {STATUS_OPTIONS.map((opt) => {
                          const active = st.status === opt.value;
                          const optMeta = STATUS_META[opt.value];
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(c.id, opt.value)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                                active ? `${optMeta.bg} ${optMeta.border}` : 'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <span className={opt.color}>{opt.icon}</span>
                              <span className={`text-xs font-medium ${active ? optMeta.color : 'text-slate-500'}`}>
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {needsComment && (
                        <div className="mb-3">
                          <textarea
                            value={st.comment}
                            onChange={(e) => setComment(c.id, e.target.value)}
                            placeholder="Skriv kommentar..."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-400 focus:bg-white transition-colors resize-none"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {st.photo_url ? (
                          <div className="relative">
                            <img src={st.photo_url} alt="Bevis" className="w-20 h-20 rounded-xl object-cover" />
                            <button
                              onClick={() => removePhoto(c.id)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                            photoBusy === c.id ? 'bg-slate-100 border-slate-300' : 'border-slate-200 hover:border-slate-300'
                          }`}>
                            {photoBusy === c.id ? (
                              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="text-xs text-slate-500 font-medium">
                              {photoBusy === c.id ? 'Laster opp...' : 'Legg til bilde'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadPhoto(c.id, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Tilbake
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              Gjennomgang <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className="px-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <p className="text-slate-900 font-semibold text-sm mb-3">Trinn 3: Gjennomgang</p>

            {/* Stations summary */}
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase mb-2">Brannposter ({stationsCheckedCount}/{stations.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {stations.map((s) => {
                  const check = stationChecks[s.id];
                  return (
                    <div key={s.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs text-slate-700 truncate">{s.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklist summary */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase mb-2">Sjekkliste ({checklist.length})</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <SummaryPill count={checklist.filter((c) => items[c.id]?.status === 'tilfredsstillende').length} label="OK" cls="bg-emerald-50 text-emerald-600" />
                <SummaryPill count={yellowCount} label="Vurderes" cls="bg-amber-50 text-amber-600" />
                <SummaryPill count={redCount} label="Tiltak" cls="bg-red-50 text-red-600" />
                <SummaryPill count={checklist.filter((c) => items[c.id]?.status === 'ikke_relevant').length} label="N/A" cls="bg-gray-100 text-gray-500" />
              </div>

              {redCount > 0 && (
                <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-lg p-3 mb-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{redCount} punkt(er) med tiltak nødvendig vil bli registrert som åpne avvik.</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Tilbake
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
              {saving ? 'Lagrer...' : 'Send inn inspeksjon'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryPill({ count, label, cls }: { count: number; label: string; cls: string }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${cls}`}>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-[10px] font-medium">{label}</p>
    </div>
  );
}
