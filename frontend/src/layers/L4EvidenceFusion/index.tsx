import { useState } from 'react';
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import { useInvestigation } from '../../hooks/useInvestigation';
import { LayerFrame } from '../../components/common/LayerFrame';
import { Badge, Bar, Callout, Card, Panel, StatusBadge, Tabs, Mono, statusTone, Td, Th, rowCls, tableCls } from '../../components/ui/ui';
import { FAMILIES, MECHANISMS } from '../../data/evidence';
import { MIN_INDEPENDENT_FAMILIES } from '../../engines/evidenceFusion';
import { cx, pct } from '../../utils/format';

type Step = 'in' | 'corr' | 'unk' | 'weight' | 'indep' | 'mech';
export function L4View() {
  const { result: r } = useInvestigation();
  const f = r.fusion, [step, setStep] = useState<Step>('in');
  const collapsed = f.items.filter(i => i.evidence.status !== 'UNKNOWN' && !i.counted), counted = f.items.filter(i => i.counted).sort((a, b) => b.weight - a.weight);
  const top = f.mechanisms[0];
  return (
    <LayerFrame n={4} summary={<>{f.decision === 'OPEN_CASE' ? <>Case opened, priority <b className="text-ink">{f.priority}</b>. Leading hypothesis: <b className="text-ink">{MECHANISMS.find(m => m.id === top.id)!.name}</b>.</> : <>No case opened. {f.gateReason}</>}</>}>
      <Panel title="Fusion pipeline" subtitle="Six rules between raw evidence and a case.">
        <Tabs<Step> value={step} onChange={setStep} tabs={[{ id: 'in', label: '1 Evidence in' }, { id: 'corr', label: '2 Correlated signals' }, { id: 'unk', label: '3 UNKNOWN excluded' }, { id: 'weight', label: '4 Reliability and fake difficulty' }, { id: 'indep', label: '5 Source independence' }, { id: 'mech', label: '6 Mechanisms' }]} />
        <div className="pt-4">
          {step === 'in' && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FAMILIES.map(fm => { const x = r.evidence.filter(e => e.family === fm.id); return (
                <div key={fm.id} className="rounded border border-line bg-panel2 p-3"><div className="mb-2 text-xs"><span className="font-mono text-zinc-300">{fm.id}</span> <span className="text-mute">{fm.short}</span></div>
                  <div className="flex flex-wrap gap-1.5">{x.map(e => <span key={e.id} className={cx('rounded border px-1.5 py-0.5 font-mono text-[11px]', e.status === 'ILLICIT' ? 'border-neutral-400/40 text-neutral-300' : e.status === 'BENIGN' ? 'border-gray-400/40 text-gray-300' : 'border-line2 text-dim')}>{e.id}</span>)}</div></div>); })}
            </div>)}
          {step === 'corr' && (
            <div className="space-y-3">
              <Callout tone="info" title="Several signals from one family are not several facts">Signals in the same family that read the same data are collapsed to the strongest one, so one underlying fact is counted once.</Callout>
              {collapsed.length === 0 ? <div className="text-sm text-mute">No correlated duplicates in this case.</div> : collapsed.map(i => (
                <div key={i.evidence.id} className="flex flex-wrap items-center gap-3 rounded border border-line bg-panel2 px-3 py-2 text-[13px]"><MinusCircle size={15} className="text-stone-300" /><Mono>{i.evidence.id}</Mono><span>{i.evidence.name}</span><span className="text-mute">{i.reason}</span></div>))}
              <div className="text-xs text-dim">{r.evidence.filter(e => e.status !== 'UNKNOWN').length} informative signals in, {counted.length} counted.</div>
            </div>)}
          {step === 'unk' && (
            <div className="space-y-3">
              <Callout tone="info" title="UNKNOWN carries zero weight">A missing feed is not read as clean (which would reward gaps) or as suspicious (which would punish merchants for data we do not have).</Callout>
              <div className="grid gap-2 sm:grid-cols-2">{f.items.filter(i => i.evidence.status === 'UNKNOWN').map(i => <div key={i.evidence.id} className="rounded border border-line bg-panel2 p-3 text-[13px]"><div className="flex items-center gap-2"><Mono className="text-zinc-300">{i.evidence.id}</Mono><span>{i.evidence.name}</span></div><div className="mt-1 text-xs text-mute">{i.evidence.explanation}</div></div>)}</div>
              {f.unknownIds.length === 0 && <div className="text-sm text-mute">Every detector had the data it needed.</div>}
            </div>)}
          {step === 'weight' && (
            <div className="overflow-x-auto"><table className={tableCls}><thead><tr><Th>Signal</Th><Th>Status</Th><Th>Strength</Th><Th>Reliability</Th><Th>Fake difficulty</Th><Th>Effective weight</Th></tr></thead>
              <tbody>{counted.map(i => <tr key={i.evidence.id} className={rowCls}><Td><Mono className="text-zinc-300">{i.evidence.id}</Mono> {i.evidence.name}</Td><Td><StatusBadge s={i.evidence.status} /></Td><Td className="tabular-nums">{i.evidence.strength.toFixed(2)}</Td><Td className="tabular-nums">{i.evidence.reliability.toFixed(2)}</Td>
                <Td className="tabular-nums">{i.evidence.status === 'BENIGN' ? i.evidence.fakeDifficulty.toFixed(2) : <span className="text-dim">n/a</span>}</Td><Td><div className="flex items-center gap-2"><Bar className="w-24" value={i.weight} tone={statusTone(i.evidence.status)} /><span className="font-mono text-xs">{i.weight.toFixed(2)}</span></div></Td></tr>)}</tbody></table>
              <p className="mt-3 text-xs text-mute">Illicit weight = strength × reliability. Benign weight is also scaled by how hard the evidence is to fake: easy-to-match facts such as opening hours count for little, while verified orders and bank reconciliation count for a lot.</p></div>)}
          {step === 'indep' && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-9">{f.families.map(x => { const sup = f.independentFamilies.includes(x.family); return <div key={x.family} className={cx('rounded border p-2.5 text-center', sup ? 'border-neutral-400/50 bg-neutral-400/5' : 'border-line bg-panel2')}><div className="font-mono text-sm text-zinc-300">{x.family}</div><div className="text-[10px] text-mute">{x.illicit} illicit signals</div><div className="mt-1 font-mono text-xs">{x.mass.toFixed(2)}</div></div>; })}</div>
              <div className="flex flex-wrap items-center gap-3 text-sm"><span className="text-mute">Independent families:</span><b>{f.independentFamilies.length}</b><span className="text-mute">(minimum {MIN_INDEPENDENT_FAMILIES})</span><span className="text-mute">Source systems:</span><b>{f.systems.length}</b><span className="text-dim">{f.systems.join(', ') || '—'}</span></div>
              <Callout tone={f.gatePassed ? 'warn' : 'ok'} title={f.gatePassed ? 'Two-independent-family requirement met' : 'Two-independent-family requirement not met'}>{f.gateReason}</Callout>
            </div>)}
          {step === 'mech' && (
            <div className="grid gap-3 md:grid-cols-2">{f.mechanisms.map((m, i) => { const meta = MECHANISMS.find(x => x.id === m.id)!; return (
              <div key={m.id} className={cx('rounded border p-4', i === 0 && f.gatePassed ? 'border-zinc-400/50 bg-zinc-400/5' : 'border-line bg-panel2')}>
                <div className="flex items-center justify-between"><div className="font-mono text-[13px]">{m.id}</div>{i === 0 && f.gatePassed && <Badge tone="info">Leading</Badge>}</div>
                <div className="mt-0.5 text-xs text-mute">{meta.blurb}</div>
                <div className="mt-3 flex items-center gap-3"><Bar className="flex-1" value={m.score} tone={m.score >= 0.6 ? 'bad' : m.score >= 0.4 ? 'warn' : 'mute'} /><span className="font-mono text-sm">{pct(m.score)}</span></div>
                <div className="mt-2 text-[11px] text-dim">Driven by: {m.contributors.slice(0, 5).map(c => c.id).join(', ') || 'no supporting evidence'}</div></div>); })}</div>)}
        </div>
      </Panel>
      <Card className={cx('p-5', f.decision === 'OPEN_CASE' ? 'border-neutral-400/30' : 'border-gray-400/30')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">{f.decision === 'OPEN_CASE' ? <XCircle className="mt-0.5 text-neutral-300" size={22} /> : <CheckCircle2 className="mt-0.5 text-gray-300" size={22} />}
            <div><div className="text-base font-semibold">{f.decision === 'OPEN_CASE' ? `Investigation case opened for ${r.scenario.profile.name}` : `No illicit case opened for ${r.scenario.profile.name}`}</div>
              <p className="mt-1 max-w-2xl text-sm text-mute">{f.decision === 'OPEN_CASE' ? `Hypotheses are ranked, not proven. A human analyst reviews the case next (L5). ${f.gateReason}` : `${f.gateReason} The volume signal is logged and the profile can be refreshed.`}</p></div></div>
          <div className="flex gap-6 text-right"><div><div className="text-xs text-mute">Priority</div><div className="text-xl font-semibold">{f.priority}</div></div><div><div className="text-xs text-mute">Illicit mass</div><div className="font-mono text-xl">{f.illicitMass.toFixed(2)}</div></div><div><div className="text-xs text-mute">Benign mass</div><div className="font-mono text-xl">{f.benignMass.toFixed(2)}</div></div></div>
        </div>
      </Card>
    </LayerFrame>
  );
}
