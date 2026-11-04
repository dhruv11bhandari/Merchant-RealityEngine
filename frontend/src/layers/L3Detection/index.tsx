import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useInvestigation } from '../../hooks/useInvestigation';
import { LayerFrame } from '../../components/common/LayerFrame';
import { RecordPeek } from '../../components/common/RecordPeek';
import { Badge, Bar, Callout, Panel, StatusBadge, Tabs, Mono, statusTone } from '../../components/ui/ui';
import { CusumChart, HourChart, StateBars, TicketHistogram } from '../../components/charts/charts';
import { FAMILIES, TOTAL_PATTERNS } from '../../data/evidence';
import { CUSUM_H, CUSUM_K } from '../../engines/cusumEngine';
import { EPSILON } from '../../engines/residualEngine';
import { inrK, pct, cx } from '../../utils/format';
import type { EvidenceStatus, Family } from '../../types/evidence';

export function L3View() {
  const { result: r } = useInvestigation();
  const [fam, setFam] = useState<'ALL' | Family>('ALL'), [st, setSt] = useState<'ALL' | EvidenceStatus>('ALL'), [open, setOpen] = useState<string | null>(null), [vis, setVis] = useState<'ticket' | 'timing' | 'geo'>('ticket');
  const ev = r.evidence.filter(e => (fam === 'ALL' || e.family === fam) && (st === 'ALL' || e.status === st));
  const sales = r.events.filter(e => e.type === 'SALE'), pk = r.l2.peak, cnt = (s: EvidenceStatus) => r.evidence.filter(e => e.status === s).length;
  return (
    <LayerFrame n={3} summary={<>{r.evidence.length} detectors ran across 9 families: <b className="text-red-300">{cnt('ILLICIT')} support illicit</b>, <b className="text-emerald-300">{cnt('BENIGN')} support benign</b>, <b className="text-slate-300">{cnt('UNKNOWN')} UNKNOWN</b>.</>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Residual: how far from expectation?" subtitle="Computed from the weekly values in L2.">
          <div className="rounded border border-line2 bg-bg px-4 py-3 text-center font-mono text-[15px] text-cyan-200">R<sub>t</sub> = (V<sub>t</sub> − E<sub>t</sub>) / max(E<sub>t</sub>, ε)</div>
          {pk && pk.actual !== null ? (
            <div className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between"><span className="text-mute">V (actual, {pk.week})</span><span className="font-mono">{inrK(pk.actual)}</span></div>
              <div className="flex justify-between"><span className="text-mute">E (seasonal expectation)</span><span className="font-mono">{inrK(pk.seasonal)}</span></div>
              <div className="flex justify-between"><span className="text-mute">ε (floor)</span><span className="font-mono">{EPSILON}</span></div>
              <div className="flex justify-between border-t border-line pt-1.5"><span>R = ({inrK(pk.actual)} − {inrK(pk.seasonal)}) / {inrK(pk.seasonal)}</span><span className="font-mono text-amber-300">{pct(pk.rSeasonal!)}</span></div>
              <p className="pt-1 text-xs text-mute">The anchored baseline alone would give {pct(pk.rAnchored!)}. Attributing the festival to the season leaves a {pct(pk.rSeasonal!)} residual that the season does not explain.</p>
            </div>) : null}
        </Panel>
        <Panel title="CUSUM: is the excess persistent?" subtitle={`S_t = max(0, S_t−1 + R_t − k), k = ${CUSUM_K}; alarm above h = ${CUSUM_H}`}>
          <CusumChart points={r.l2.cusum} height={170} />
          <p className="text-xs text-mute">One high week can be noise. CUSUM accumulates only the excess above the allowance k, so it alarms on sustained drift and stays quiet on blips.</p>
        </Panel>
      </div>
      <Panel title="Nine evidence families" subtitle={`The full design catalogues ${TOTAL_PATTERNS} patterns. This prototype runs ${r.evidence.length} of them as live detectors. Select a family to filter.`}>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-9">
          {FAMILIES.map(f => {
            const x = r.evidence.filter(e => e.family === f.id), il = x.filter(e => e.status === 'ILLICIT').length, be = x.filter(e => e.status === 'BENIGN').length, un = x.filter(e => e.status === 'UNKNOWN').length;
            return <button key={f.id} onClick={() => setFam(fam === f.id ? 'ALL' : f.id)} aria-pressed={fam === f.id} className={cx('rounded border p-2.5 text-left transition-colors', fam === f.id ? 'border-cyan-400 bg-cyan-400/5' : 'border-line bg-panel2 hover:border-line2')}>
              <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold text-cyan-300">{f.id}</span><span className="text-[10px] text-dim">{x.length}/{f.patterns}</span></div>
              <div className="mt-1 text-[11px] leading-tight text-mute">{f.short}</div>
              <div className="mt-2 flex gap-1 text-[10px]"><span className="text-red-300">{il}</span><span className="text-dim">·</span><span className="text-emerald-300">{be}</span><span className="text-dim">·</span><span className="text-slate-400">{un}</span></div></button>;
          })}
        </div>
        <div className="mt-2 text-[11px] text-dim">Counts: supports illicit · supports benign · UNKNOWN. Chip shows live detectors / designed patterns.</div>
      </Panel>
      <Panel title="What the detectors saw" right={<Tabs tabs={[{ id: 'ticket', label: 'Ticket sizes' }, { id: 'timing', label: 'Timing' }, { id: 'geo', label: 'Geography' }]} value={vis} onChange={setVis} />}>
        {vis === 'ticket' && <><TicketHistogram sales={sales} profile={r.l2.profile} /><p className="text-xs text-mute">Red bars are exact round amounts (₹500 multiples). Expected round share for this profile: {pct(r.l2.profile.expectedRoundShare)}.</p></>}
        {vis === 'timing' && <><HourChart sales={sales} fixtures={r.scenario.fixtures} profile={r.l2.profile} /><p className="text-xs text-mute">{r.scenario.fixtures.length ? 'Red segments mark payments in the 45 minutes before a fixture start. Compared with the same clock time on days without fixtures.' : 'No fixtures in this window. Green lines mark declared opening hours.'}</p></>}
        {vis === 'geo' && <><StateBars sales={sales} local={r.l2.profile.catchment === 'LOCAL' ? r.l2.profile.localStates : []} /><p className="text-xs text-mute">Green: inside the declared catchment. Amber: outside it.</p></>}
      </Panel>
      <Panel title="Detector results" subtitle="Every signal states what it saw, what it expected, and why." right={<Tabs tabs={(['ALL', 'ILLICIT', 'BENIGN', 'UNKNOWN'] as const).map(s => ({ id: s, label: s === 'ALL' ? 'All' : s === 'ILLICIT' ? 'Illicit' : s === 'BENIGN' ? 'Benign' : 'UNKNOWN' }))} value={st} onChange={setSt} />} bodyClass="p-0">
        {ev.length === 0 && <div className="p-6 text-center text-sm text-mute">No detectors match this filter.</div>}
        {ev.map(e => (
          <div key={e.id} className="border-t border-line first:border-t-0">
            <button onClick={() => setOpen(open === e.id ? null : e.id)} className="grid w-full grid-cols-[18px_44px_1fr_auto] items-center gap-3 px-4 py-2.5 text-left hover:bg-panel2/60 md:grid-cols-[18px_44px_240px_130px_90px_1fr]" aria-expanded={open === e.id}>
              {open === e.id ? <ChevronDown size={14} className="text-mute" /> : <ChevronRight size={14} className="text-mute" />}
              <Mono className="text-cyan-300">{e.id}</Mono><span className="text-[13px] font-medium">{e.name}</span>
              <span className="hidden md:block"><StatusBadge s={e.status} /></span>
              <span className="hidden items-center gap-2 md:flex"><Bar className="w-12" value={e.strength} tone={statusTone(e.status)} /><span className="font-mono text-[11px] text-dim">{e.strength.toFixed(2)}</span></span>
              <span className="truncate text-xs text-mute md:block">{e.observed}</span>
            </button>
            {open === e.id && (
              <div className="fade-in space-y-3 border-t border-line bg-panel2/50 px-4 py-3 pl-[74px] text-[13px]">
                <div className="md:hidden"><StatusBadge s={e.status} /></div>
                <div className="grid gap-3 md:grid-cols-2"><div><div className="text-xs text-mute">Observed</div>{e.observed}</div><div><div className="text-xs text-mute">Expected</div>{e.expected}</div></div>
                <div><div className="text-xs text-mute">Why this signal</div>{e.explanation}</div>
                {Object.keys(e.metrics).length > 0 && <div className="flex flex-wrap gap-x-6 gap-y-1">{Object.entries(e.metrics).map(([k, v]) => <span key={k} className="text-xs"><span className="text-dim">{k}: </span><Mono>{v}</Mono></span>)}</div>}
                <div className="flex flex-wrap gap-2 text-[11px] text-dim"><Badge>family {e.family}</Badge><Badge>lineage {e.lineage}</Badge><Badge>source {e.system}</Badge><Badge>reliability {e.reliability.toFixed(2)}</Badge><Badge>fake difficulty {e.fakeDifficulty.toFixed(2)}</Badge></div>
                <RecordPeek r={r} ids={e.records} />
              </div>)}
          </div>))}
      </Panel>
      <Callout tone="info" title="No score is shown here, on purpose">Detectors report evidence, not guilt. The statuses above are combined only in L4, after correlated signals are collapsed and UNKNOWN is set aside.</Callout>
    </LayerFrame>
  );
}
