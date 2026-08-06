import { useEffect, useState } from 'react';
import { Users, ShieldCheck, Wrench, Loader2, Mail, AlertCircle } from 'lucide-react';
import { supabase, type Profile, type Role } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function UserManagement() {
  const { profile: me, refreshProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    setUsers((data || []) as Profile[]);
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
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  u.role === 'admin' ? 'bg-emerald-50' : 'bg-blue-50'
                }`}>
                  {u.role === 'admin' ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Wrench className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm truncate">
                    {u.full_name || 'Uten navn'}
                    {u.id === me?.id && <span className="text-xs text-slate-400 font-normal"> (deg)</span>}
                  </p>
                  <p className="text-slate-400 text-xs flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3" /> {u.email}
                  </p>
                </div>
              </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
