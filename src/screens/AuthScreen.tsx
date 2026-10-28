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
    if (!email || !password) {
      setError('Fyll inn e-post og passord.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        if (!fullName.trim()) {
          setError('Fyll inn fullt navn.');
          setBusy(false);
          return;
        }
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (err) throw err;
        if (data.user) {
          await supabase
            .from('profiles')
            .upsert({ id: data.user.id, email, full_name: fullName.trim(), role: 'inspector' });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ukjent feil';
      setError(
        msg.includes('Invalid login')
          ? 'Feil e-post eller passord.'
          : msg.includes('already registered')
          ? 'Denne e-posten er allerede registrert.'
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 p-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-900/40">
            <ShieldCheck className="h-9 w-9 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Aksell HMS</h1>
          <p className="mt-1 text-sm text-neutral-400">Enterprise HMS-portal</p>
        </div>

        <div className="animate-scale-in rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-6 flex gap-1 rounded-xl bg-neutral-100 p-1">
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === 'login' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Logg inn
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === 'signup' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Ny konto
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <Field icon={<User className="h-5 w-5" />}>
                <input
                  type="text"
                  placeholder="Fullt navn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                />
              </Field>
            )}
            <Field icon={<Mail className="h-5 w-5" />}>
              <input
                type="email"
                placeholder="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </Field>
            <Field icon={<Lock className="h-5 w-5" />}>
              <input
                type="password"
                placeholder="Passord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-0.5 hover:shadow-primary-600/40 disabled:translate-y-0 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Logg inn' : 'Opprett konto'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Brannvern · Trucksjekk · Arbeidstøy · RUH
        </p>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 transition-colors focus-within:border-primary-400 focus-within:bg-white">
      <span className="text-neutral-400">{icon}</span>
      {children}
    </div>
  );
}
