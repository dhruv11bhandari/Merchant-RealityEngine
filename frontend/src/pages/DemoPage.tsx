import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Play, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { useInvestigation } from '../hooks/useInvestigation';
import { SCENARIO_IDS, getScenario } from '../data/scenarios';
import { MECHANISMS, RESPONSE_LEVELS } from '../data/evidence';
import { InvestigationPage } from './InvestigationPage';
import { PatternBoard } from '../components/common/PatternBoard';
import { Badge, Btn, Callout, Panel } from '../components/ui/ui';
import { cx } from '../utils/format';

export function DemoPage() {
  const { scenarioId, run, reset, started, allDone, result, running, user, detailsOpen, setDetailsOpen, fast, setFast } = useInvestigation();
  const nav = useNavigate();
  const launch = (id: typeof scenarioId) => { setDetailsOpen(false); run(id); nav('/demo'); };
  const lead = [...result.fusion.mechanisms].sort((a, b) => b.score - a.score)[0];
  const mechanism = lead ? MECHANISMS.find(m => m.id === lead.id)?.name ?? lead.id : 'None';
  const response = RESPONSE_LEVELS.find(r => r.id === result.review.recommended);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{!started ? 'Try the engine with demo files' : allDone ? 'Investigation result' : 'Investigation in progress'}</h1>
          <p className="mt-1 text-sm text-mute">{!started ? 'These four sample merchants let you test the investigation flow. To analyze your own merchant data, open the AI Engine.' : `${result.scenario.profile.name} · ${allDone ? 'completed across all seven layers.' : 'moving through the seven analysis layers.'}`}</p>
        </div>
        <Link to="/ai-engine"><Btn variant="outline"><BrainCircuit size={15} />Open AI Engine</Btn></Link>
      </div>

      {!started && <>
        <Panel title="Choose a merchant" subtitle="Each scenario is deterministic and uses synthetic data. Select one to run the full investigation." right={<label className="flex cursor-pointer items-center gap-1.5 text-xs text-mute"><input type="checkbox" className="accent-zinc-300" checked={fast} onChange={e => setFast(e.target.checked)} /><Zap size={12} />Fast simulation</label>}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SCENARIO_IDS.map(id => { const s = getScenario(id), on = id === scenarioId; return (
              <div key={id} className={cx('flex flex-col rounded-md border p-4', on ? 'border-zinc-400/50 bg-zinc-400/5' : 'border-line bg-panel2')}>
                <div className="flex items-start justify-between gap-2"><div className="text-sm font-semibold">{s.title}</div><Badge tone={s.tone === 'benign' ? 'ok' : 'bad'}>{s.tone === 'benign' ? 'Legitimate' : 'Suspicious'}</Badge></div>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-mute">{s.blurb}</p>
                <div className="mt-3 text-[11px] text-dim">Expected: {s.expectedOutcome}</div>
                <Btn className="mt-3" variant={on ? 'primary' : 'outline'} size="sm" disabled={running} onClick={() => launch(id)}><Play size={13} />Run investigation</Btn>
              </div>); })}
          </div>
        </Panel>
        {scenarioId === 'bakery' && <Callout tone="info" title="Four examples, one guided demo">Choose a merchant to watch the seven layers run, then review its result and evidence.</Callout>}
      </>}

      {started && !allDone && <><InvestigationPage progressOnly /><div className="flex justify-end"><Btn onClick={reset}>Reset investigation</Btn></div></>}

      {started && allDone && <>
        <Panel title={`${result.scenario.profile.name} · final result`} subtitle={result.fusion.gateReason} right={<Badge tone={result.fusion.decision === 'OPEN_CASE' ? 'bad' : 'ok'}>{result.fusion.decision === 'OPEN_CASE' ? `${result.fusion.priority} priority` : 'No case opened'}</Badge>}>
          <div className="flex flex-wrap items-start gap-4">
            {result.fusion.decision === 'OPEN_CASE' ? <ShieldAlert className="text-neutral-300" size={30} /> : <ShieldCheck className="text-gray-300" size={30} />}
            <div className="grid min-w-0 flex-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><div className="text-xs text-mute">Outcome</div><div className="mt-1 font-medium">{result.fusion.decision === 'OPEN_CASE' ? 'Analyst review opened' : 'Activity explained'}</div></div>
              <div><div className="text-xs text-mute">Leading finding</div><div className="mt-1 font-medium">{result.fusion.decision === 'OPEN_CASE' ? mechanism : 'No remaining risk signal'}</div></div>
              <div><div className="text-xs text-mute">Priority</div><div className="mt-1 font-medium">{result.fusion.priority}</div></div>
              <div><div className="text-xs text-mute">Recommended response</div><div className="mt-1 font-medium">{response ? `${response.id} · ${response.name}` : 'Analyst review'}</div></div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Btn variant="primary" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen} aria-controls="demo-evidence">{detailsOpen ? 'Hide evidence' : 'Evidence'} <ArrowRight size={14} /></Btn>
            <Btn onClick={reset}>Choose another merchant</Btn>
          </div>
        </Panel>

        {detailsOpen && <div id="demo-evidence" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Investigation evidence</h2><p className="mt-1 text-sm text-mute">Inspect this merchant’s seven-layer findings and pattern checks.</p></div><Link to="/demo/graph"><Btn size="sm">Open evidence graph <ArrowRight size={13} /></Btn></Link></div>
          <InvestigationPage />
          <PatternBoard res={result} label={user.label} />
        </div>}
      </>}
    </>
  );
}
