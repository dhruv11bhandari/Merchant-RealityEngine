import { Check, Loader2 } from 'lucide-react';
import { useInvestigation } from '../hooks/useInvestigation';
import { LAYERS } from '../data/evidence';
import { L1View } from '../layers/L1Ingestion';
import { L2View } from '../layers/L2MerchantProfile';
import { L3View } from '../layers/L3Detection';
import { L4View } from '../layers/L4EvidenceFusion';
import { L5View } from '../layers/L5AnalystReview';
import { L6View } from '../layers/L6Response';
import { L7View } from '../layers/L7AuditLearning';
import { Btn, Callout, Panel } from '../components/ui/ui';
import { cx } from '../utils/format';
import type { LayerId } from '../types/investigation';

const VIEWS: Record<LayerId, () => JSX.Element> = { 1: L1View, 2: L2View, 3: L3View, 4: L4View, 5: L5View, 6: L6View, 7: L7View };

export function InvestigationPage({ progressOnly = false }: { progressOnly?: boolean }) {
  const { status, selectedLayer, selectLayer, scenario, run, started, running } = useInvestigation();
  const View = VIEWS[selectedLayer];
  const active = LAYERS[selectedLayer - 1];
  if (progressOnly) return (
    <>
      <div><h2 className="text-lg font-semibold">Seven-layer simulation</h2><p className="mt-1 text-sm text-mute">Each layer runs in sequence. The final finding appears when the full investigation is complete.</p></div>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ol className="space-y-1.5" aria-label="Seven-layer simulation progress">
          {LAYERS.map(l => { const st = status[l.n], selected = selectedLayer === l.n; return (
            <li key={l.n} aria-current={selected ? 'step' : undefined} className={cx('flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors', selected ? 'border-zinc-400/60 bg-zinc-400/5' : 'border-line bg-panel')}>
              <span className={cx('flex h-7 w-9 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold', st === 'done' ? 'bg-gray-400/15 text-gray-300' : st === 'running' ? 'bg-zinc-400/15 text-zinc-300' : 'bg-panel2 text-dim')}>{l.code}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{l.name}</span>{st === 'running' ? <span className="scanbar mt-1.5 block h-1 rounded-full bg-line" /> : <span className="block text-[11px] text-dim">{st === 'done' ? 'Complete' : 'Waiting'}</span>}</span>
              {st === 'done' ? <Check size={14} className="text-gray-300" /> : st === 'running' ? <Loader2 size={14} className="animate-spin text-zinc-300" /> : null}
            </li>); })}
        </ol>
        <Panel title={`${active.code} · ${active.name}`} subtitle={active.tagline} right={<span className="text-xs text-mute">Layer {selectedLayer} of 7</span>}>
          <div className="scanbar mb-4 h-1.5 rounded-full bg-line" />
          <p className="text-sm text-mute">{active.does}</p>
          <div className="mt-4 border-t border-line pt-4"><div className="mb-2 text-xs font-medium text-mute">Current layer operations</div><ul className="grid gap-2 text-sm sm:grid-cols-2">{active.processes.map(process => <li key={process} className="rounded border border-line bg-panel2 px-3 py-2">{process}</li>)}</ul></div>
        </Panel>
      </div>
    </>
  );
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Investigations</h1><p className="mt-1 text-sm text-mute">{scenario.profile.name} · {scenario.subtitle}</p></div>
        {!started && <Btn variant="primary" onClick={() => run()} disabled={running}>Run investigation</Btn>}</div>
      {!started && <Callout tone="info" title="Ready">{scenario.blurb}</Callout>}
      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <ol className="space-y-1.5 lg:sticky lg:top-24 lg:self-start" aria-label="Layer progress">
          {LAYERS.map(l => { const st = status[l.n], sel = selectedLayer === l.n; return (
            <li key={l.n}><button onClick={() => selectLayer(l.n)} aria-current={sel} className={cx('flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors', sel ? 'border-zinc-400/60 bg-zinc-400/5' : 'border-line bg-panel hover:border-line2')}>
              <span className={cx('flex h-7 w-9 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold', st === 'done' ? 'bg-gray-400/15 text-gray-300' : st === 'running' ? 'bg-zinc-400/15 text-zinc-300' : 'bg-panel2 text-dim')}>{l.code}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{l.name}</span>{st === 'running' ? <span className="scanbar mt-1.5 block h-1 rounded-full bg-line" /> : <span className="block text-[11px] text-dim">{st === 'done' ? 'Complete' : 'Pending'}</span>}</span>
              {st === 'done' ? <Check size={14} className="text-gray-300" /> : st === 'running' ? <Loader2 size={14} className="animate-spin text-zinc-300" /> : null}</button></li>); })}
          <li className="pt-2 text-[11px] text-dim">Select a completed layer to inspect its inputs, processing, output and results.</li>
        </ol>
        <div className="min-w-0"><View /></div>
      </div>
    </>
  );
}
