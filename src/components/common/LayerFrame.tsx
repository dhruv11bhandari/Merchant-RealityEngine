import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react';
import { LAYERS } from '../../data/evidence';
import type { LayerId } from '../../types/investigation';
import { useInvestigation } from '../../hooks/useInvestigation';
import { Badge, Btn, Card } from '../ui/ui';
import { cx } from '../../utils/format';

/** Wraps a layer's results with its standard header: input, processing, output, evidence generated, and processing timeline. */
export function LayerFrame({ n, children, evidenceCount, evidenceLabel, summary }: { n: LayerId; children: ReactNode; evidenceCount?: number; evidenceLabel?: string; defaultOpen?: boolean; summary?: ReactNode }) {
  const { status, result, started, run } = useInvestigation();
  const m = LAYERS[n - 1], st = status[n], tl = result.timelines[n], total = tl.reduce((s, t) => s + t.ms, 0);
  const onInv = useLocation().pathname.endsWith('/investigations'), [open, setOpen] = useState(onInv);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-10 items-center justify-center rounded border border-cyan-400/40 bg-cyan-400/10 font-mono text-sm font-semibold text-cyan-300">{m.code}</span>
          <div className="min-w-0 flex-1"><div className="text-base font-semibold">{m.name}</div><div className="text-xs text-mute">{m.tagline}</div></div>
          {st === 'done' ? <Badge tone="ok"><Check size={11} />Complete · {total} ms simulated</Badge> : st === 'running' ? <Badge tone="info"><Loader2 size={11} className="animate-spin" />Running</Badge> : <Badge>Pending</Badge>}
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-mute hover:text-ink" aria-expanded={open}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}Inputs, processing and timeline</button>
        </div>
        {summary && <div className="border-t border-line px-4 py-2.5 text-sm text-mute">{summary}</div>}
        {open && (
          <div className="fade-in grid gap-px border-t border-line bg-line md:grid-cols-4">
            {[['Input', m.inputs], ['Processing', m.processes], ['Output', m.outputs]].map(([t, xs]) => (
              <div key={t as string} className="bg-panel p-4"><div className="mb-2 text-xs font-medium text-mute">{t as string}</div><ul className="space-y-1 text-[13px] text-ink/90">{(xs as string[]).map(x => <li key={x}>{x}</li>)}</ul></div>
            ))}
            <div className="bg-panel p-4"><div className="mb-2 text-xs font-medium text-mute">{n === 3 || n === 4 ? 'Evidence generated' : 'Artifacts produced'}</div>
              <div className="text-2xl font-semibold tabular-nums">{evidenceCount ?? (n === 3 ? result.evidence.length : n === 4 ? result.fusion.items.filter(i => i.counted).length : 0)}</div>
              <div className="text-[11px] text-dim">{evidenceLabel ?? (n === 3 ? 'EvidenceItems emitted' : 'items counted after fusion')}</div></div>
            <div className="col-span-full bg-panel p-4"><div className="mb-2 text-xs font-medium text-mute">Technical operations and processing timeline</div>
              <div className="space-y-1.5">{tl.map((t, i) => { const before = tl.slice(0, i).reduce((s, x) => s + x.ms, 0); return (
                <div key={t.op} className="grid grid-cols-[1fr_60px] items-center gap-3 text-[13px] md:grid-cols-[320px_1fr_60px]">
                  <span className="text-ink/90">{t.op}</span>
                  <div className="relative hidden h-1.5 rounded-full bg-line md:block"><div className={cx('absolute h-full rounded-full', st === 'done' ? 'bg-cyan-400/80' : 'bg-line2')} style={{ left: `${(before / total) * 100}%`, width: `${(t.ms / total) * 100}%` }} /></div>
                  <span className="text-right font-mono text-xs text-dim">{t.ms} ms</span></div>); })}</div>
              <div className="mt-3 text-xs text-dim">Next layer: {m.next}</div></div>
          </div>
        )}
      </Card>
      {st === 'done' ? <div className="fade-in space-y-4">{children}</div> : (
        <div className="rounded-md border border-dashed border-line2 px-6 py-10 text-center text-sm text-mute">
          {st === 'running' ? <div className="mx-auto max-w-xs"><div className="scanbar mb-3 h-1.5 rounded-full bg-line" />Processing layer {m.code}…</div> : <div className="space-y-3"><div>{m.code} results appear once the investigation has run.</div>{!started && <Btn variant="primary" onClick={() => run()}>Run investigation</Btn>}</div>}
        </div>
      )}
    </div>
  );
}
