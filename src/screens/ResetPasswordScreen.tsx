import { useState, type FormEvent } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AuthShell, AuthField, AuthError } from '@/components/AuthShell';

export default function ResetPasswordScreen() {
  const { signOut, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn.');
      return;
    }
    if (password !== confirm) {
      setError('Passordene er ikke like.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    clearPasswordRecovery();
  }

  return (
    <AuthShell title="Velg nytt passord">
      <form onSubmit={save} className="space-y-3.5">
        <AuthField icon={<Lock className="h-5 w-5" />}>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Nytt passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
          />
        </AuthField>
        <AuthField icon={<Lock className="h-5 w-5" />}>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Gjenta nytt passord"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          Lagre passord
        </button>
        <button
          type="button"
          onClick={signOut}
          className="w-full pt-1 text-center text-sm text-neutral-400 transition hover:text-white"
        >
          Avbryt
        </button>
      </form>
    </AuthShell>
  );
}
