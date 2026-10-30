import type { ReactNode } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export function AuthShell({ title, footer, children }: { title: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 p-5 [color-scheme:dark]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-accent-600/15 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-500/10 blur-[100px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 shadow-glow-primary">
            <ShieldCheck className="h-9 w-9 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Aksell HMS</h1>
          <p className="mt-1.5 text-sm text-neutral-400">Sikkerhetsportal for brannvern og HMS</p>
        </div>

        <div className="animate-scale-in rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-elevated backdrop-blur-xl">
          <h2 className="mb-6 font-display text-lg font-bold text-white">{title}</h2>
          {children}
        </div>

        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/40 px-4 py-3 transition-colors focus-within:border-primary-400/60 focus-within:bg-neutral-900/60">
      <span className="text-neutral-500">{icon}</span>
      {children}
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-300">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
