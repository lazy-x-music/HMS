import { useEffect, useState } from 'react';
import { Users, ShieldCheck, Wrench, Loader2, Mail, AlertCircle, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, formatDate, type Profile, type Role, type TruckTraining } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type TrainingMap = Record<string, TruckTraining[]>;

export default function UserManagement() {
  const { profile: me, refreshProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [trainings, setTrainings] = useState<TrainingMap>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const [usersResult, trainingResult] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, created_at').order('created_at', { ascending: false }),
      supabase.from('truck_trainings').select('*').order('completed_date', { ascending: false }),
    ]);
    if (usersResult.error) setError(usersResult.error.message);
    setUsers((usersResult.data || []) as Profile[]);
    const trainingMap: TrainingMap = {};
    ((trainingResult.data || []) as TruckTraining[]).forEach((t) => {
      if (t.employee_id) {
        if (!trainingMap[t.employee_id]) trainingMap[t.employee_id] = [];
        trainingMap[t.employee_id].push(t);
      }
    });
    setTrainings(trainingMap);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setRole(uid: string, role: Role) {
    setBusyId(uid);
    setError('');
    const { error } = await supabase.from('profiles').update({ role }).eq('id', uid);
    if (error) {
      setError(error.message);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, role } : u)));
      if (uid === me?.id) refreshProfile();
    }
    setBusyId(null);
  }

  const admins = users.filter((u) => u.role === 'admin');
  const inspectors = users.filter((u) => u.role === 'inspector');

  return (
    <div>
      {error && (
        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{admins.length}</p>
          <p className="text-xs text-slate-400">Administratorer</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
            <Wrench className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{inspectors.length}</p>
          <p className="text-xs text-slate-400">Inspektører</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map((u) => {
            const userTrainings = trainings[u.id] || [];
            const isExpanded = expanded === u.id;
            return (
              <div key={u.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                    {u.role === 'admin' ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <Wrench className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-sm truncate">
                      {u.full_name || 'Uten navn'}
                      {u.id === me?.id && <span className="text-xs text-slate-400 font-normal"> (deg)</span>}
                    </p>
                    <p className="text-slate-400 text-xs flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" /> {u.email}
                    </p>
                    {userTrainings.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {userTrainings.slice(0, 3).map((t) => (
                          <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            <GraduationCap className="w-3 h-3" />
                            {t.truck_name} · {formatDate(t.completed_date)}
                          </span>
                        ))}
                        {userTrainings.length > 3 && (
                          <span className="text-[11px] font-semibold text-slate-400">+{userTrainings.length - 3} flere</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {userTrainings.length > 0 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : u.id)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? 'Skjul godkjente trucker' : `Vis alle ${userTrainings.length} godkjente trucker`}
                  </button>
                )}

                {isExpanded && userTrainings.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Godkjente trucker for {u.full_name || u.email}</p>
                    {userTrainings.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 rounded-xl bg-indigo-50/50 px-3 py-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            Godkjent på {t.truck_name}
                            {t.truck_brand && ` (${t.truck_brand} ${t.truck_model})`.trim()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(t.completed_date)} · Instruktør: {t.instructor_name}
                          </p>
                        </div>
                        {t.truck_class && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{t.truck_class}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setRole(u.id, 'inspector')}
                    disabled={busyId === u.id}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      u.role === 'inspector'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    } disabled:opacity-60`}
                  >
                    {busyId === u.id ? '...' : 'Inspektør'}
                  </button>
                  <button
                    onClick={() => setRole(u.id, 'admin')}
                    disabled={busyId === u.id}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      u.role === 'admin'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    } disabled:opacity-60`}
                  >
                    {busyId === u.id ? '...' : 'Admin'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
