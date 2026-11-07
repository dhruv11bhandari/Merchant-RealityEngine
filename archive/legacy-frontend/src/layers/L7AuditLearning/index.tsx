import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useInvestigation } from '../../hooks/useInvestigation';
import { LayerFrame } from '../../components/common/LayerFrame';
import { Badge, Btn, Callout, Panel, Stat, Td, Th, rowCls, tableCls, Mono, type Tone } from '../../components/ui/ui';
import { ReliabilityBars } from '../../components/charts/charts';
import { computeKpis, profileUpdates, reliabilityUpdates } from '../../engines/learningEngine';
import { planResponse } from '../../engines/responseEngine';
import { hashId } from '../../utils/hash';
import { inrK, pct, cx } from '../../utils/format';
import type { Label } from '../../types/merchant';

const LABELS: { id: Label; name: string; blurb: string; tone: Tone }[] = [
  { id: 'CONFIRMED_ILLICIT', name: 'Confirmed illicit', blurb: 'Verified by adjudication or merchant failure to substantiate.', tone: 'bad' },
  { id: 'ADJUDICATED_BENIGN', name: 'Adjudicated benign', blurb: 'Reviewed and found legitimate. Used to reduce false positives.', tone: 'ok' },
  { id: 'UNRESOLVED', name: 'Unresolved', blurb: 'Not enough to decide. Kept out of training; not treated as negative.', tone: 'mute' },
];

export function L7View() {
  const { result: r, user, setLabel, audit, started } = useInvestigation();
  const label = user.label, plan = planResponse(r, user);
  const k = computeKpis(label, plan.level, user.executed, started, plan.holdCandidate);
  const rel = useMemo(() => (label ? reliabilityUpdates(r.evidence, label) : []), [label, r]);
  const upd = label ? profileUpdates(r, label) : [];
  const chain = useMemo(() => { let prev = 'genesis'; return audit.map(a => { const h = hashId(prev + a.action + a.at + a.detail, 'audit'); prev = h; return { ...a, hash: h }; }); }, [audit]);
  const top = rel.slice().sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before)).slice(0, 8);
  return (
    <LayerFrame n={7} evidenceCount={audit.length} evidenceLabel="audit entries" summary={label ? <>Case labelled <b className="text-ink">{LABELS.find(l => l.id === label)!.name}</b>. Learning updates are staged below.</> : 'Choose a label to see how this outcome feeds back into detectors and profiles.'}>
      <Panel title="Adjudicated label" subtitle="Simulated adjudication. In production a human or a legal process decides.">
        <div className="grid gap-3 md:grid-cols-3">{LABELS.map(l => <button key={l.id} onClick={() => setLabel(label === l.id ? null : l.id)} aria-pressed={label === l.id} className={cx('rounded border p-3 text-left transition-colors', label === l.id ? 'border-cyan-400 bg-cyan-400/5' : 'border-line bg-panel2 hover:border-line2')}><div className="flex items-center justify-between"><span className="font-mono text-[12px]">{l.id}</span>{l.id === r.scenario.scriptedLabel && <Badge tone="info">Scripted outcome</Badge>}</div><div className="mt-1 text-[13px] text-mute">{l.blurb}</div></button>)}</div>
        {!label && <div className="mt-3"><Btn size="sm" onClick={() => setLabel(r.scenario.scriptedLabel)}>Apply the scripted outcome for this scenario</Btn></div>}
      </Panel>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Merchants monitored" value={k.merchants.toLocaleString('en-IN')} sub="synthetic" /><Stat label="Investigations" value={k.investigations} /><Stat label="Awaiting review" value={k.awaiting} tone="warn" /><Stat label="Confirmed" value={k.confirmed} tone="bad" /><Stat label="Benign" value={k.benign} tone="ok" /><Stat label="Unresolved" value={k.unresolved} />
      </div>
      <Panel title="Performance indicators" subtitle="Portfolio figures are synthetic demonstration data; this case adds to them once labelled.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Precision" value={pct(k.precision, 1)} sub="confirmed ÷ adjudicated" /><Stat label="False-positive rate" value={pct(k.fpr, 2)} sub="benign cases ÷ merchants" /><Stat label="Unresolved coverage" value={pct(k.unresolvedCoverage, 1)} sub="share of closed cases" />
          <Stat label="Value intercepted" value={inrK(k.value)} sub={user.executed && (plan.level === 'L3' || plan.level === 'L4') ? 'includes this case' : 'cumulative'} /><Stat label="Benign principal-hours held" value={k.benignHours.toLocaleString('en-IN')} sub="₹ thousand-hours" />
          <Stat label="Settlement delay" value={`${k.settlementDelay.toFixed(1)} h`} sub="avg per restricted flow" /><Stat label="Detection delay" value={`${k.detectionDelay.toFixed(1)} d`} sub="first signal to case" /><Stat label="Analyst review effort" value={`${k.effort} min`} sub="per case" /><Stat label="Wrongful terminations" value={k.wrongful} tone="ok" sub="target: zero" />
        </div>
      </Panel>
      <Panel title="How a verified finding changes the system" subtitle="Labels flow back to L3 detector reliability and the L2 merchant profile.">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">{['Verified finding', 'Label', 'Reliability and profile updates', 'Next investigation'].map((t, i, a) => <span key={t} className="flex items-center gap-2"><span className="rounded border border-line2 bg-panel2 px-3 py-1.5">{t}</span>{i < a.length - 1 && <ArrowRight size={14} className="text-dim" />}</span>)}</div>
        {!label ? <div className="text-sm text-mute">No label chosen yet.</div> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>{rel.length ? <><ReliabilityBars data={top} /><div className="text-xs text-dim">Detector reliability before and after (largest changes). Used by L4 as the reliability weight.</div></> : <div className="text-sm text-mute">No reliability change for an unresolved label.</div>}</div>
            <div className="space-y-2">{upd.map(u => <div key={u} className="rounded border border-line bg-panel2 px-3 py-2 text-[13px]">{u}</div>)}</div>
          </div>)}
      </Panel>
      <Panel title="Audit trail" subtitle="Each entry carries a hash of the one before it, so edits to history are detectable." bodyClass="p-0 overflow-x-auto">
        <table className={tableCls}><thead><tr><Th>#</Th><Th>Time (IST)</Th><Th>Actor</Th><Th>Action</Th><Th>Hash chain</Th></tr></thead>
          <tbody>{chain.map(a => <tr key={a.seq} className={rowCls}><Td><Mono>{a.seq}</Mono></Td><Td className="font-mono text-xs">{a.at}</Td><Td className="text-xs text-mute">{a.actor}</Td><Td>{a.action}{a.detail && <div className="text-xs text-dim">{a.detail}</div>}</Td><Td><Mono className="text-dim">{a.hash}</Mono></Td></tr>)}</tbody></table>
      </Panel>
      <Callout tone="info" title="Unresolved is not the same as clean">Unresolved cases are reported separately and kept out of precision calculations and training labels, so uncertainty is not quietly counted as a win.</Callout>
    </LayerFrame>
  );
}
