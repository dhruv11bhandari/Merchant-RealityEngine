import { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { LAYERS } from '../../data/evidence';
import { cx } from '../../utils/format';

export function ArchitectureExplorer() {
  const [n, setN] = useState(1), m = LAYERS[n - 1];
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div data-stagger className="space-y-1.5" role="tablist" aria-label="Seven layers">
        {LAYERS.map((l, i) => (
          <div key={l.n}>
            <button role="tab" aria-selected={n === l.n} onClick={() => setN(l.n)} className={cx('flex w-full items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-colors', n === l.n ? 'border-cyan-400/60 bg-cyan-400/5' : 'border-line bg-panel hover:border-line2')}>
              <span className={cx('flex h-8 w-9 items-center justify-center rounded font-mono text-sm font-semibold', n === l.n ? 'bg-cyan-400 text-slate-950' : 'bg-panel2 text-cyan-300')}>{l.code}</span>
              <span><span className="block text-sm font-medium">{l.name}</span><span className="block text-xs text-mute">{l.tagline}</span></span></button>
            {i < LAYERS.length - 1 && <div className="flex justify-center py-0.5 text-line2"><ArrowDown size={14} /></div>}
          </div>))}
      </div>
      <div className="rounded-md border border-line bg-panel p-6" role="tabpanel">
        <div className="flex items-center gap-3"><span className="font-mono text-sm text-cyan-300">{m.code}</span><h3 className="text-xl font-semibold tracking-tight">{m.name}</h3></div>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mute">{m.does}</p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {([['Inputs', m.inputs], ['Internal processes', m.processes], ['Outputs', m.outputs]] as const).map(([t, xs]) => (
            <div key={t}><div className="mb-2 text-xs font-medium text-mute">{t}</div><ul className="space-y-1.5 text-[13px]">{xs.map(x => <li key={x} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />{x}</li>)}</ul></div>))}
        </div>
        <div className="mt-6 rounded border border-line bg-panel2 px-4 py-3 text-sm"><span className="text-mute">Relationship to the next layer: </span>{m.next}</div>
      </div>
    </div>
  );
}
