'use client';
/**
 * Shared admin dashboard primitives (build-dashboard layout):
 * dark header with actions → KPI row → panels → detail table.
 * Colour system: page #f8f9fa, cards #fff, header #1a1a2e,
 * text #212529 / #6c757d, brand accent rose-600 for primary actions.
 */
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-h-screen bg-[#f8f9fa] text-[#212529]', className)}>
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4">{children}</div>
  </div>;
}

export function DashboardHeader({ title, description, meta, actions, children }: {
  title: string; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; children?: ReactNode;
}) {
  return <header className="rounded-lg bg-[#1a1a2e] px-5 py-4 text-white sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1 max-w-3xl text-[13px] leading-5 text-white/65">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">{children}</div>}
  </header>;
}

type ButtonTone = 'primary' | 'ghost-dark' | 'secondary' | 'danger' | 'dark';
const toneClass: Record<ButtonTone, string> = {
  primary: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600',
  dark: 'bg-[#1a1a2e] text-white hover:bg-black focus-visible:outline-[#1a1a2e]',
  'ghost-dark': 'border border-white/20 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white',
  secondary: 'border border-[#dee2e6] bg-white text-[#212529] hover:bg-[#f1f3f5] focus-visible:outline-rose-600',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50 focus-visible:outline-red-600',
};
export function DashButton({ tone = 'secondary', className, children, ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return <button type="button" {...props} className={cn(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45',
    toneClass[tone], className)}>{children}</button>;
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{children}</section>;
}

const kpiTone = {
  default: 'text-[#6c757d]', positive: 'text-[#28a745]', warning: 'text-amber-600', negative: 'text-[#dc3545]',
} as const;
export function KpiCard({ label, value, hint, tone = 'default', icon }: {
  label: string; value: ReactNode; hint?: ReactNode; tone?: keyof typeof kpiTone; icon?: ReactNode;
}) {
  return <div className="rounded-lg bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:px-5">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[12px] font-medium uppercase tracking-[0.5px] text-[#6c757d]">{label}</p>
      {icon && <span className="text-[#adb5bd]" aria-hidden>{icon}</span>}
    </div>
    <p className="mt-1 text-[26px] font-bold leading-tight tabular-nums text-[#212529]">{value}</p>
    {hint && <p className={cn('mt-1 text-[12px] font-medium', kpiTone[tone])}>{hint}</p>}
  </div>;
}

export function Panel({ title, description, actions, children, className, bodyClassName, id }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode;
  className?: string; bodyClassName?: string; id?: string;
}) {
  return <section id={id} className={cn('min-w-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]', className)}>
    {(title || actions) && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
      <div className="min-w-0">
        {title && <h2 className="text-[14px] font-semibold text-[#212529]">{title}</h2>}
        {description && <p className="mt-0.5 text-[12px] text-[#6c757d]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>}
    <div className={cn('p-4', bodyClassName)}>{children}</div>
  </section>;
}

export function Toggle({ checked, onChange, disabled, label, description, id }: {
  checked: boolean; onChange: (next: boolean) => void; disabled?: boolean;
  label?: ReactNode; description?: ReactNode; id?: string;
}) {
  const control = <button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled}
    aria-label={typeof label === 'string' ? label : undefined}
    onClick={() => onChange(!checked)}
    className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-40',
      checked ? 'bg-rose-600' : 'bg-[#ced4da]')}>
    <span className={cn('inline-block size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
  </button>;
  if (!label) return control;
  return <div className={cn('flex items-start justify-between gap-3 rounded-md border border-[#e9ecef] px-3 py-2.5', disabled && 'bg-[#f8f9fa]')}>
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[13px] font-medium text-[#212529]">{label}</label>
      {description && <p className="mt-0.5 text-[12px] leading-4 text-[#6c757d]">{description}</p>}
    </div>
    {control}
  </div>;
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'md', disabled }: {
  value: T; onChange: (next: T) => void; label: string; size?: 'sm' | 'md'; disabled?: boolean;
  options: { value: T; label: ReactNode; icon?: ReactNode; title?: string }[];
}) {
  return <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-md border border-[#dee2e6] bg-[#f8f9fa] p-0.5">
    {options.map(option => {
      const active = option.value === value;
      return <button key={option.value} type="button" role="radio" aria-checked={active} title={option.title}
        disabled={disabled} onClick={() => onChange(option.value)}
        className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-rose-600 disabled:opacity-45',
          size === 'sm' ? 'px-2 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]',
          active ? 'bg-white text-[#212529] shadow-sm' : 'text-[#6c757d] hover:text-[#212529]')}>
        {option.icon}{option.label}
      </button>;
    })}
  </div>;
}

export type SortState<K extends string> = { key: K; dir: 'asc' | 'desc' };
export function SortHeader<K extends string>({ label, sortKey, sort, onSort, className }: {
  label: string; sortKey: K; sort: SortState<K>; onSort: (next: SortState<K>) => void; className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    className={cn('whitespace-nowrap border-b-2 border-[#dee2e6] px-3 py-2.5 text-left', className)}>
    <button type="button" onClick={() => onSort({ key: sortKey, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })}
      className="inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#6c757d] hover:text-[#212529]">
      {label}<Icon size={12} className={active ? 'text-[#212529]' : 'opacity-50'} />
    </button>
  </th>;
}
export function PlainHeader({ label, className }: { label: string; className?: string }) {
  return <th scope="col" className={cn('whitespace-nowrap border-b-2 border-[#dee2e6] px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.5px] text-[#6c757d]', className)}>{label}</th>;
}

export function StatusPill({ tone, children }: { tone: 'positive' | 'warning' | 'neutral' | 'negative' | 'info'; children: ReactNode }) {
  const map = {
    positive: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    neutral: 'bg-[#f1f3f5] text-[#495057] ring-[#adb5bd]/30',
    negative: 'bg-red-50 text-red-700 ring-red-600/20',
    info: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  } as const;
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', map[tone])}>{children}</span>;
}

export const fieldClass = 'w-full rounded-md border border-[#dee2e6] bg-white px-3 py-2 text-[14px] text-[#212529] placeholder:text-[#adb5bd] focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:bg-[#f8f9fa] disabled:text-[#6c757d]';
export const labelClass = 'mb-1.5 block text-[12px] font-semibold text-[#495057]';

export function formatWhen(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + ' min ago';
  if (minutes < 1440) return Math.round(minutes / 60) + ' h ago';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
