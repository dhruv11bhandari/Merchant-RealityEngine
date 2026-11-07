import { useInvestigation } from '../hooks/useInvestigation';
import { usePortfolio } from '../hooks/usePortfolio';
import { SCENARIO_IDS, getScenario } from '../data/scenarios';
import { L2Body } from '../layers/L2MerchantProfile';
import { Badge, Panel, Td, Th, rowCls, tableCls, Mono } from '../components/ui/ui';
import { cx } from '../utils/format';

export function MerchantPage() {
  const { scenarioId, setScenario, result, running, done, custom } = useInvestigation();
  const { mode } = usePortfolio();
  const demoMode = mode === 'demo';
  const merchants = demoMode ? SCENARIO_IDS.map(id => ({ id, scenario: getScenario(id) })) : custom ? [{ id: 'custom', scenario: custom }] : [];
  const decision = done(4) ? result.fusion.decision : null;
  return (
    <>
      <div><h1 className="text-2xl font-semibold tracking-tight">{demoMode ? 'Demo merchant profiles' : 'Your merchant profile'}</h1><p className="mt-1 text-sm text-mute">{demoMode ? 'Declared profiles and behavioural baselines for the four demo merchants.' : 'Declared profile and behavioural baseline for the merchant in your uploaded dataset.'}</p></div>
      <Panel title={demoMode ? 'The four demo merchants' : 'Uploaded merchant'} subtitle={demoMode ? 'Select a merchant to make it the active demo scenario.' : 'Only the merchant in your current dataset appears here.'} bodyClass="p-0 overflow-x-auto">
        <table className={tableCls}><thead><tr><Th>Merchant</Th><Th>ID</Th><Th>Category</Th><Th>Monitoring status</Th></tr></thead>
          <tbody>{merchants.map(({ id, scenario }) => { const on = id === scenarioId; return (
            <tr key={id} className={cx(rowCls, on && 'bg-zinc-400/5')}><Td>{demoMode ? <button disabled={running} onClick={() => setScenario(id as typeof scenarioId)} className="font-medium text-zinc-200 hover:underline disabled:opacity-50">{scenario.profile.name}</button> : <span className="font-medium">{scenario.profile.name}</span>}</Td><Td><Mono>{scenario.profile.id}</Mono></Td><Td className="text-mute">{scenario.profile.category}</Td>
              <Td>{on ? (decision ? <Badge tone={decision === 'OPEN_CASE' ? 'bad' : 'ok'}>{decision === 'OPEN_CASE' ? 'Case open' : 'No case'}</Badge> : <Badge tone="info">Active scenario</Badge>) : <Badge>Not selected</Badge>}</Td></tr>); })}
          </tbody></table>
      </Panel>
      <h2 className="text-lg font-semibold">{result.scenario.profile.name}</h2>
      <L2Body r={result} />
    </>
  );
}
