import { useInvestigation } from '../hooks/useInvestigation';
import { EvidenceGraph } from '../components/graphs/EvidenceGraph';
import { Callout } from '../components/ui/ui';

export function EvidenceGraphPage() {
  const { result, scenario, done } = useInvestigation();
  return (
    <>
      <div><h1 className="text-2xl font-semibold tracking-tight">Evidence relationship graph</h1><p className="mt-1 text-sm text-mute">{scenario.profile.name} · merchants, payers, accounts, links, websites, devices and beneficiaries joined by typed edges.</p></div>
      {!done(3) && <Callout tone="info" title="Run the investigation to attach evidence">The structure is shown below. Detector evidence appears on each edge once L3 completes.</Callout>}
      <EvidenceGraph scenario={scenario} evidence={done(3) ? result.evidence : []} />
    </>
  );
}
