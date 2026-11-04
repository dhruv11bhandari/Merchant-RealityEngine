import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { useInvestigation } from '../hooks/useInvestigation';
import { SCENARIO_IDS, getScenario } from '../data/scenarios';
import { computeKpis } from '../engines/learningEngine';
import { planResponse } from '../engines/responseEngine';
import { Badge, Btn, Callout, Panel, Stat, Td, Th, rowCls, tableCls, Mono } from '../components/ui/ui';
import { LAYERS } from '../data/evidence';
import { cx } from '../utils/format';

const HISTORY: [string, string, string, string, 'CONFIRMED_ILLICIT' | 'ADJUDICATED_BENIGN' | 'UNRESOLVED' | 'AWAITING'][] = [
  ['INV-0128', 'Harbour Mobile Accessories', 'Transaction laundering', 'HIGH', 'AWAITING'], ['INV-0127', 'Pune Sweet House', 'None (volume alarm explained)', '—', 'ADJUDICATED_BENIGN'],
  ['INV-0126', 'Zenith Gift Corner', 'Rotation', 'HIGH', 'CONFIRMED_ILLICIT'], ['INV-0125', 'Lotus Home Linen', 'Fabricated substance', 'MEDIUM', 'UNRESOLVED'], ['INV-0124', 'Quick Bite Foods', 'Other abuse', 'LOW', 'ADJUDICATED_BENIGN'],
];
const tone = (l: string) => (l === 'CONFIRMED_ILLICIT' ? 'bad' : l === 'ADJUDICATED_BENIGN' ? 'ok' : l === 'AWAITING' ? 'warn' : 'mute') as 'bad' | 'ok' | 'warn' | 'mute';

export function DemoPage() {
  const { scenarioId, run, started, allDone, user, status, result, running } = useInvestigation();
  const nav = useNavigate(), plan = planResponse(result, user);
  const k = computeKpis(user.label, plan.level, user.executed, started, plan.holdCandidate);
  const launch = (id: typeof scenarioId) => { run(id); nav('/demo/investigations'); };
  return (
    <>
      <div><h1 className="text-2xl font-semibold tracking-tight">Investigation console</h1><p className="mt-1 text-sm text-mute">Choose a scenario and run all seven layers. Every figure on these pages is synthetic.</p></div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Merchants monitored" value={k.merchants.toLocaleString('en-IN')} sub="synthetic portfolio" /><Stat label="Investigations generated" value={k.investigations} /><Stat label="Awaiting review" value={k.awaiting} tone="warn" /><Stat label="Confirmed cases" value={k.confirmed} tone="bad" /><Stat label="Benign cases" value={k.benign} tone="ok" /><Stat label="Unresolved" value={k.unresolved} />
      </div>
      <Panel title="Launch a new investigation" subtitle="Four deterministic scenarios. Re-running the same scenario always gives the same result.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SCENARIO_IDS.map(id => { const s = getScenario(id), on = id === scenarioId; return (
            <div key={id} className={cx('flex flex-col rounded-md border p-4', on ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-line bg-panel2')}>
              <div className="flex items-start justify-between gap-2"><div className="text-sm font-semibold">{s.title}</div><Badge tone={s.tone === 'benign' ? 'ok' : 'bad'}>{s.tone === 'benign' ? 'Legitimate' : 'Suspicious'}</Badge></div>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-mute">{s.blurb}</p>
              <div className="mt-3 text-[11px] text-dim">Expected: {s.expectedOutcome}</div>
              <Btn className="mt-3" variant={on ? 'primary' : 'outline'} size="sm" disabled={running} onClick={() => launch(id)}><Play size={13} />Run investigation</Btn></div>); })}
        </div>
        {scenarioId === 'bakery' && <div className="mt-4"><Callout tone="info" title="Default case: Sweet Crumbs Bakery">{getScenario('bakery').synthetic}. These signals are synthetic. The system investigates them rather than declaring the merchant guilty.</Callout></div>}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Panel title="Recent investigations" subtitle="Earlier rows are synthetic history." bodyClass="p-0 overflow-x-auto">
          <table className={tableCls}><thead><tr><Th>Case</Th><Th>Merchant</Th><Th>Leading hypothesis</Th><Th>Priority</Th><Th>Outcome</Th></tr></thead>
            <tbody>
              {started && <tr className={cx(rowCls, 'bg-cyan-400/5')}><Td><Mono>This run</Mono></Td><Td>{result.scenario.profile.name}</Td><Td className="text-mute">{status[4] === 'done' ? (result.fusion.decision === 'OPEN_CASE' ? result.fusion.mechanisms[0].id : 'None (no case opened)') : 'Processing…'}</Td><Td>{status[4] === 'done' ? result.fusion.priority : '—'}</Td><Td><Badge tone={user.label ? tone(user.label) : 'warn'}>{user.label ?? (allDone ? 'AWAITING' : 'IN PROGRESS')}</Badge></Td></tr>}
              {HISTORY.map(h => <tr key={h[0]} className={rowCls}><Td><Mono>{h[0]}</Mono></Td><Td>{h[1]}</Td><Td className="text-mute">{h[2]}</Td><Td>{h[3]}</Td><Td><Badge tone={tone(h[4])}>{h[4]}</Badge></Td></tr>)}</tbody></table>
        </Panel>
        <Panel title="Pipeline status" subtitle={started ? result.scenario.title : 'Not started'}>
          <ol className="space-y-2">{LAYERS.map(l => <li key={l.n} className="flex items-center gap-3 text-[13px]"><span className={cx('flex h-6 w-8 items-center justify-center rounded font-mono text-xs', status[l.n] === 'done' ? 'bg-emerald-400/15 text-emerald-300' : status[l.n] === 'running' ? 'bg-cyan-400/15 text-cyan-300' : 'bg-panel2 text-dim')}>{l.code}</span><span className={status[l.n] === 'pending' ? 'text-dim' : ''}>{l.name}</span><span className="ml-auto text-xs text-dim">{status[l.n] === 'done' ? 'done' : status[l.n] === 'running' ? 'running' : ''}</span></li>)}</ol>
          {started && <Link to="/demo/investigations" className="mt-4 inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:underline">Open investigation <ArrowRight size={14} /></Link>}
        </Panel>
      </div>
    </>
  );
}
