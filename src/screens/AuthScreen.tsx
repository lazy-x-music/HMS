import { useState, type FormEvent } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, Flame, ArrowLeft, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthShell, AuthField, AuthError } from '@/components/AuthShell';

type Mode = 'login' | 'forgot';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setSent(false);
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Fyll inn e-post og passord.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError(err.message.includes('Invalid login') ? 'Feil e-post eller passord.' : err.message);
    }
  }

  async function sendResetLink(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Skriv inn e-postadressen din.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  const footer = (
    <div className="flex flex-wrap items-center justify-center gap-2">
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
  );

  if (mode === 'forgot') {
    return (
      <AuthShell title="Glemt passord" footer={footer}>
        {sent ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-500/15 text-success-300">
              <MailCheck className="h-6 w-6" />
            </div>
            <p className="text-sm leading-6 text-neutral-300">
              Hvis e-postadressen finnes hos oss, har vi sendt en lenke for å velge nytt passord.
            </p>
            <button onClick={() => switchMode('login')} className="text-sm font-semibold text-primary-300 transition hover:text-primary-200">
              Tilbake til innlogging
            </button>
          </div>
        ) : (
          <form onSubmit={sendResetLink} className="space-y-3.5">
            <p className="text-sm leading-6 text-neutral-400">
              Skriv inn e-postadressen din, så sender vi deg en lenke for å velge nytt passord.
            </p>
            <AuthField icon={<Mail className="h-5 w-5" />}>
              <input
                type="email"
                autoComplete="email"
                placeholder="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
              />
            </AuthField>
            {error && <AuthError message={error} />}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 py-3 text-sm font-bold text-white shadow-glow-primary transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Send lenke
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="flex w-full items-center justify-center gap-1.5 pt-1 text-sm text-neutral-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Tilbake til innlogging
            </button>
          </form>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Logg inn" footer={footer}>
      <form onSubmit={signIn} className="space-y-3.5">
        <AuthField icon={<Mail className="h-5 w-5" />}>
          <input
            type="email"
            autoComplete="email"
            placeholder="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
          />
        </AuthField>
        <AuthField icon={<Lock className="h-5 w-5" />}>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
          />
        </AuthField>

        {error && <AuthError message={error} />}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 py-3 text-sm font-bold text-white shadow-glow-primary transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Logg inn
        </button>
        <button
          type="button"
          onClick={() => switchMode('forgot')}
          className="w-full pt-1 text-center text-sm text-neutral-400 transition hover:text-white"
        >
          Glemt passord?
        </button>
      </form>
    </AuthShell>
  );
}
