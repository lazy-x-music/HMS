import { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ukjent feil';
      setError(msg.includes('Invalid login') ? 'Feil e-post eller passord.' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 p-5">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-accent-600/15 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-500/10 blur-[100px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo + brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 shadow-glow-primary">
            <ShieldCheck className="h-9 w-9 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Aksell HMS</h1>
          <p className="mt-1.5 text-sm text-neutral-400">Sikkerhetsportal for brannvern og HMS</p>
        </div>

        {/* Card */}
        <div className="animate-scale-in rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-elevated backdrop-blur-xl">
          <h2 className="mb-6 font-display text-lg font-bold text-white">Logg inn</h2>

          <form onSubmit={submit} className="space-y-3.5">
            <Field icon={<Mail className="h-5 w-5" />}>
              <input
                type="email"
                placeholder="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
              />
            </Field>
            <Field icon={<Lock className="h-5 w-5" />}>
              <input
                type="password"
                placeholder="Passord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 py-3 text-sm font-bold text-white shadow-glow-primary transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Logg inn
            </button>
          </form>
        </div>

        {/* Feature pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: Flame, label: 'Brannvern' },
            { icon: ShieldCheck, label: 'Trucksjekk' },
            { icon: Lock, label: 'Arbeidstøy' },
          ].map((pill) => (
            <span key={pill.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-neutral-400">
              <pill.icon className="h-3 w-3" />
              {pill.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/40 px-4 py-3 transition-colors focus-within:border-primary-400/60 focus-within:bg-neutral-900/60">
      <span className="text-neutral-500">{icon}</span>
      {children}
    </div>
  );
}
