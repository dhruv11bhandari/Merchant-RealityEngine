import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/format';
import type { EvidenceStatus } from '../../types/evidence';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'mute';
const toneCls: Record<Tone, string> = {
  ok: 'text-gray-300 bg-gray-400/10 border-gray-400/25',
  warn: 'text-stone-300 bg-stone-400/10 border-stone-400/25',
  bad: 'text-neutral-300 bg-neutral-400/10 border-neutral-400/25',
  info: 'text-zinc-300 bg-zinc-400/10 border-zinc-400/25',
  mute: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
export const toneText: Record<Tone, string> = { ok: 'text-gray-300', warn: 'text-stone-300', bad: 'text-neutral-300', info: 'text-zinc-300', mute: 'text-slate-400' };
export const toneBar: Record<Tone, string> = { ok: 'bg-gray-400', warn: 'bg-stone-400', bad: 'bg-neutral-400', info: 'bg-zinc-400', mute: 'bg-slate-500' };

export function Badge({ tone = 'mute', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap', toneCls[tone], className)}>{children}</span>;
}
export const statusTone = (s: EvidenceStatus): Tone => (s === 'ILLICIT' ? 'bad' : s === 'BENIGN' ? 'ok' : 'mute');
export const statusLabel = (s: EvidenceStatus) => (s === 'ILLICIT' ? 'Supports illicit' : s === 'BENIGN' ? 'Supports benign' : 'UNKNOWN');
export const StatusBadge = ({ s }: { s: EvidenceStatus }) => <Badge tone={statusTone(s)}>{statusLabel(s)}</Badge>;

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-md border border-line bg-panel', className)}>{children}</div>;
}
export function Panel({ title, subtitle, right, children, className, bodyClass }: { title?: ReactNode; subtitle?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <Card className={className}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div><div className="text-sm font-semibold text-ink">{title}</div>{subtitle && <div className="mt-0.5 text-xs text-mute">{subtitle}</div>}</div>
          {right}
        </div>
      )}
      <div className={cx('p-4', bodyClass)}>{children}</div>
    </Card>
  );
}
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs text-mute">{label}</div>
      <div className={cx('mt-1 text-2xl font-semibold tabular-nums tracking-tight', tone ? toneText[tone] : 'text-ink')}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-dim">{sub}</div>}
    </Card>
  );
}
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger'; size?: 'sm' | 'md' | 'lg' };
export function Btn({ variant = 'outline', size = 'md', className, ...p }: BtnProps) {
  const v = { primary: 'bg-zinc-400 text-slate-950 hover:bg-zinc-300 border-zinc-400', outline: 'border-line2 text-ink hover:bg-panel2 hover:border-slate-500', ghost: 'border-transparent text-mute hover:text-ink hover:bg-panel2', danger: 'border-neutral-400/40 text-neutral-300 hover:bg-neutral-400/10' }[variant];
  const s = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }[size];
  return <button {...p} className={cx('inline-flex items-center justify-center gap-2 rounded border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40', v, s, className)} />;
}
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line" role="tablist">
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cx('-mb-px border-b-2 px-3 py-2 text-sm transition-colors', value === t.id ? 'border-zinc-400 text-ink' : 'border-transparent text-mute hover:text-ink')}>{t.label}</button>
      ))}
    </div>
  );
}
export function Bar({ value, tone = 'info', className }: { value: number; tone?: Tone; className?: string }) {
  return <div className={cx('h-1.5 overflow-hidden rounded-full bg-line', className)}><div className={cx('h-full rounded-full transition-all duration-500', toneBar[tone])} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} /></div>;
}
export function Callout({ tone = 'info', title, children }: { tone?: Tone; title?: ReactNode; children: ReactNode }) {
  const b = { ok: 'border-gray-400/30', warn: 'border-stone-400/30', bad: 'border-neutral-400/30', info: 'border-zinc-400/30', mute: 'border-line2' }[tone];
  return <div className={cx('rounded border-l-2 bg-panel2 px-3.5 py-2.5 text-sm text-mute', b)}>{title && <div className={cx('mb-0.5 font-medium', toneText[tone])}>{title}</div>}{children}</div>;
}
export const Mono = ({ children, className }: { children: ReactNode; className?: string }) => <span className={cx('font-mono text-[12px]', className)}>{children}</span>;
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rounded-md border border-dashed border-line2 px-6 py-12 text-center"><div className="text-base font-medium text-ink">{title}</div><div className="mx-auto mt-1 max-w-md text-sm text-mute">{children}</div></div>;
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) { return <th className={cx('px-3 py-2 text-left text-xs font-medium text-mute', className)}>{children}</th>; }
export function Td({ children, className }: { children?: ReactNode; className?: string }) { return <td className={cx('px-3 py-2 text-[13px]', className)}>{children}</td>; }
export const tableCls = 'w-full border-collapse text-left';
export const rowCls = 'border-t border-line hover:bg-panel2/60';
