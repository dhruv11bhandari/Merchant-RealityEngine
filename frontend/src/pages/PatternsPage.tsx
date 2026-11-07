import { Link } from 'react-router-dom';
import { useInvestigation } from '../hooks/useInvestigation';
import { usePortfolio } from '../hooks/usePortfolio';
import { PatternBoard } from '../components/common/PatternBoard';
import { Btn, Callout } from '../components/ui/ui';

export function PatternsPage() {
  const { result, scenario, started, user } = useInvestigation();
  const { mode } = usePortfolio();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Pattern board</h1>
          <p className="mt-1 text-sm text-mute">Every pattern checked for <span className="text-ink">{scenario.profile.name}</span>, grouped by type: core detectors, solution patterns S1–S7 and new betting patterns N1–N3.</p></div>
        {mode === 'user' && <Link to="/ai-engine/analyze"><Btn size="sm">Analyze another dataset</Btn></Link>}
      </div>
      {!started && <Callout tone="info" title="Results are computed from the selected scenario">Run the investigation from the header to animate the seven layers. The pattern results below are the same either way.</Callout>}
      <PatternBoard res={result} label={user.label} />
    </>
  );
}
