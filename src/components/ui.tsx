import { type ReactNode, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

/* ---------- Card ---------- */
export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white shadow-card transition duration-200 ${
        hover ? 'hover:-translate-y-0.5 hover:shadow-card-hover' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Badge ---------- */
const badgeTones: Record<string, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  blue: 'bg-primary-50 text-primary-700',
  green: 'bg-success-50 text-success-700',
  amber: 'bg-warning-50 text-warning-700',
  red: 'bg-error-50 text-error-700',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones | string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        badgeTones[tone] || badgeTones.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------- Button ---------- */
const btnVariants: Record<string, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-glow-primary',
  accent: 'bg-accent-600 text-white hover:bg-accent-700 shadow-glow-accent',
  success: 'bg-success-600 text-white hover:bg-success-700 shadow-sm',
  danger: 'bg-error-600 text-white hover:bg-error-700 shadow-sm',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100',
  outline: 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
  dark: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: keyof typeof btnVariants | string;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        btnVariants[variant] || btnVariants.primary
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={`animate-scale-in max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- PageHeader (employee screens) ---------- */
export function PageHeader({
  onBack,
  eyebrow,
  title,
  accent = 'primary',
  children,
}: {
  onBack: () => void;
  eyebrow: string;
  title: string;
  accent?: 'primary' | 'accent' | 'success' | 'warning';
  children?: ReactNode;
}) {
  const accentColor: Record<string, string> = {
    primary: 'text-primary-300',
    accent: 'text-accent-300',
    success: 'text-success-300',
    warning: 'text-warning-300',
  };
  return (
    <header className="bg-neutral-900 px-5 pb-6 pt-7 text-white sm:px-8 sm:pt-9">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15"
            aria-label="Tilbake"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accentColor[accent]}`}>
              {eyebrow}
            </p>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ className = 'text-neutral-400' }: { className?: string }) {
  return <Loader2 className={`h-6 w-6 animate-spin ${className}`} />;
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
      <div className="text-neutral-300">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-neutral-600">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
    </div>
  );
}

/* ---------- ProgressBar ---------- */
export function ProgressBar({
  value,
  max = 100,
  color = 'primary',
}: {
  value: number;
  max?: number;
  color?: 'primary' | 'accent' | 'success';
}) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor: Record<string, string> = {
    primary: 'bg-primary-500',
    accent: 'bg-accent-500',
    success: 'bg-success-500',
  };
  return (
    <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------- StatCard ---------- */
export function StatCard({
  icon,
  value,
  label,
  tone = 'neutral',
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-neutral-100 text-neutral-700',
    blue: 'bg-primary-50 text-primary-700',
    green: 'bg-success-50 text-success-700',
    amber: 'bg-warning-50 text-warning-700',
    red: 'bg-error-50 text-error-700',
  };
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  );
}
