import { useInvestigation } from '../hooks/useInvestigation';
import { SCENARIO_IDS, getScenario } from '../data/scenarios';
import { L2Body } from '../layers/L2MerchantProfile';
import { Badge, Panel, Td, Th, rowCls, tableCls, Mono } from '../components/ui/ui';
import { cx } from '../utils/format';

const FILLER: [string, string, string, string][] = [['M-PNE-091', 'Pune Sweet House', 'Bakeries', 'Normal'], ['M-QBF-033', 'Quick Bite Foods', 'Fast food', 'Normal'], ['M-LLN-170', 'Lotus Home Linen', 'Home furnishings', 'Under review'], ['M-HMA-052', 'Harbour Mobile Accessories', 'Electronics', 'Under review']];
export function MerchantPage() {
  const { scenarioId, setScenario, result, running, done } = useInvestigation();
  const decision = done(4) ? result.fusion.decision : null;
  return (
    <>
      <div><h1 className="text-2xl font-semibold tracking-tight">Merchant intelligence</h1><p className="mt-1 text-sm text-mute">Declared profiles and behavioural baselines. Select a merchant to load it as the active scenario.</p></div>
      <Panel title="Monitored merchants" subtitle="Four are demo scenarios; the rest are synthetic portfolio fillers." bodyClass="p-0 overflow-x-auto">
        <table className={tableCls}><thead><tr><Th>Merchant</Th><Th>ID</Th><Th>Category</Th><Th>Monitoring status</Th></tr></thead>
          <tbody>{SCENARIO_IDS.map(id => { const s = getScenario(id), on = id === scenarioId; return (
            <tr key={id} className={cx(rowCls, on && 'bg-zinc-400/5')}><Td><button disabled={running} onClick={() => setScenario(id)} className="font-medium text-zinc-200 hover:underline disabled:opacity-50">{s.profile.name}</button></Td><Td><Mono>{s.profile.id}</Mono></Td><Td className="text-mute">{s.profile.category}</Td>
              <Td>{on ? (decision ? <Badge tone={decision === 'OPEN_CASE' ? 'bad' : 'ok'}>{decision === 'OPEN_CASE' ? 'Case open' : 'No case'}</Badge> : <Badge tone="info">Active scenario</Badge>) : <Badge>Normal</Badge>}</Td></tr>); })}
            {FILLER.map(f => <tr key={f[0]} className={cx(rowCls, 'text-mute')}><Td>{f[1]}</Td><Td><Mono>{f[0]}</Mono></Td><Td>{f[2]}</Td><Td><Badge tone={f[3] === 'Normal' ? 'mute' : 'warn'}>{f[3]}</Badge></Td></tr>)}</tbody></table>
      </Panel>
      <h2 className="text-lg font-semibold">{result.scenario.profile.name}</h2>
      <L2Body r={result} />
    </>
  );
}
