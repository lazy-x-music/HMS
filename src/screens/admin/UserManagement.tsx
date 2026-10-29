import { useEffect, useState } from 'react';
import {
  Users, ShieldCheck, Wrench, Loader2, Mail, AlertCircle,
  GraduationCap, ChevronDown, ChevronUp, UserPlus, X, Check,
} from 'lucide-react';
import { supabase, formatDate, type Profile, type Role, type TruckTraining } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button, Modal } from '@/components/ui';

type TrainingMap = Record<string, TruckTraining[]>;

type NewUser = {
  email: string;
  password: string;
  fullName: string;
  role: Role;
};

export default function UserManagement() {
  const { profile: me, refreshProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [trainings, setTrainings] = useState<TrainingMap>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({ email: '', password: '', fullName: '', role: 'inspector' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

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

  async function createUser() {
    setCreating(true);
    setCreateError('');
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setCreateError('Ingen gyldig sesjon.');
        setCreating(false);
        return;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: newUser.email.trim(),
          password: newUser.password,
          fullName: newUser.fullName.trim(),
          role: newUser.role,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setCreateError(result.error || 'Kunne ikke opprette bruker');
        setCreating(false);
        return;
      }
      setShowAdd(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'inspector' });
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setCreating(false);
    }
  }

  const admins = users.filter((u) => u.role === 'admin');
  const inspectors = users.filter((u) => u.role === 'inspector');

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-success-50">
            <ShieldCheck className="h-5 w-5 text-success-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{admins.length}</p>
          <p className="text-xs text-neutral-400">Administratorer</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Wrench className="h-5 w-5 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{inspectors.length}</p>
          <p className="text-xs text-neutral-400">Inspektører</p>
        </div>
      </div>

      {/* Add user button */}
      <Button variant="primary" className="mb-4 w-full" onClick={() => { setShowAdd(true); setCreateError(''); }}>
        <UserPlus className="h-4 w-4" /> Legg til ny bruker
      </Button>

      {/* Add user modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Legg til ny bruker" maxWidth="max-w-md">
        <div className="space-y-4">
          {createError && (
            <div className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Fullt navn</label>
            <input
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              placeholder="f.eks. Ola Nordmann"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500">E-post</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="ola@aksell.no"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Passord</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Minst 6 tegn"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500">Rolle</label>
            <div className="flex gap-2">
              <button
                onClick={() => setNewUser({ ...newUser, role: 'inspector' })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                  newUser.role === 'inspector'
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 bg-white text-neutral-500'
                }`}
              >
                <Wrench className="h-4 w-4" /> Inspektør
              </button>
              <button
                onClick={() => setNewUser({ ...newUser, role: 'admin' })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                  newUser.role === 'admin'
                    ? 'border-success-400 bg-success-50 text-success-700'
                    : 'border-neutral-200 bg-white text-neutral-500'
                }`}
              >
                <ShieldCheck className="h-4 w-4" /> Admin
              </button>
            </div>
          </div>
          <Button variant="primary" className="w-full" disabled={creating || !newUser.email || !newUser.password} onClick={createUser}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Opprett bruker
          </Button>
        </div>
      </Modal>

      {/* User list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map((u) => {
            const userTrainings = trainings[u.id] || [];
            const isExpanded = expanded === u.id;
            return (
              <div key={u.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${u.role === 'admin' ? 'bg-success-50' : 'bg-primary-50'}`}>
                    {u.role === 'admin' ? <ShieldCheck className="h-5 w-5 text-success-600" /> : <Wrench className="h-5 w-5 text-primary-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {u.full_name || 'Uten navn'}
                      {u.id === me?.id && <span className="text-xs font-normal text-neutral-400"> (deg)</span>}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-neutral-400">
                      <Mail className="h-3 w-3" /> {u.email}
                    </p>
                    {userTrainings.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {userTrainings.slice(0, 3).map((t) => (
                          <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                            <GraduationCap className="h-3 w-3" />
                            {t.truck_name} · {formatDate(t.completed_date)}
                          </span>
                        ))}
                        {userTrainings.length > 3 && (
                          <span className="text-[11px] font-semibold text-neutral-400">+{userTrainings.length - 3} flere</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {userTrainings.length > 0 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : u.id)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-neutral-50 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isExpanded ? 'Skjul godkjente trucker' : `Vis alle ${userTrainings.length} godkjente trucker`}
                  </button>
                )}

                {isExpanded && userTrainings.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Godkjente trucker for {u.full_name || u.email}</p>
                    {userTrainings.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 rounded-xl bg-primary-50/50 px-3 py-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-800">
                            Godkjent på {t.truck_name}
                            {t.truck_brand && ` (${t.truck_brand} ${t.truck_model})`.trim()}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatDate(t.completed_date)} · Instruktør: {t.instructor_name}
                          </p>
                        </div>
                        {t.truck_class && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">{t.truck_class}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setRole(u.id, 'inspector')}
                    disabled={busyId === u.id}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                      u.role === 'inspector'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    } disabled:opacity-60`}
                  >
                    {busyId === u.id ? '...' : 'Inspektør'}
                  </button>
                  <button
                    onClick={() => setRole(u.id, 'admin')}
                    disabled={busyId === u.id}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                      u.role === 'admin'
                        ? 'bg-success-100 text-success-700'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
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
