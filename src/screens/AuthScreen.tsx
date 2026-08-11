import { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Fyll inn e-post og passord.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        if (!fullName.trim()) { setError('Fyll inn fullt navn.'); setBusy(false); return; }
        const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } });
        if (err) throw err;
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: fullName.trim(), role: 'inspector' });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ukjent feil';
      setError(msg.includes('Invalid login') ? 'Feil e-post eller passord.' : msg.includes('already registered') ? 'Denne e-posten er allerede registrert.' : msg);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30 mb-4">
            <ShieldCheck className="w-9 h-9 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Aksell HMS</h1>
          <p className="text-slate-400 text-sm mt-1">Enterprise HMS-portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Logg inn</button>
            <button onClick={() => { setMode('signup'); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Ny konto</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <Field icon={<User className="w-5 h-5" />}>
                <input type="text" placeholder="Fullt navn" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm" />
              </Field>
            )}
            <Field icon={<Mail className="w-5 h-5" />}>
              <input type="email" placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm" />
            </Field>
            <Field icon={<Lock className="w-5 h-5" />}>
              <input type="password" placeholder="Passord" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm" />
            </Field>

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Logg inn' : 'Opprett konto'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">Brannvern · Trucksjekk · Arbeidstøy · RUH</p>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-red-400 focus-within:bg-white transition-colors">
      <span className="text-slate-400">{icon}</span>
      {children}
    </div>
  );
}
