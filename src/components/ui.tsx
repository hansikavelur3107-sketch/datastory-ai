import type { ReactNode } from 'react';
import { twMerge } from '@/lib/twMerge';

export function cn(...classes: (string | undefined | false | null)[]): string {
  return twMerge(...classes);
}

export function Card({
  children,
  className,
  elevated,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return <div className={cn(elevated ? 'surface-elevated' : 'surface', className)}>{children}</div>;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">{title}</h2>
      {description && <p className="max-w-2xl text-pretty text-[0.95rem] leading-relaxed text-ink-600">{description}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'indigo' | 'teal' | 'amber' | 'rose';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'border-paper-300 bg-paper-100 text-ink-600',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-paper-300 bg-white px-1.5 font-mono text-[0.7rem] text-ink-600 shadow-soft">
      {children}
    </kbd>
  );
}
