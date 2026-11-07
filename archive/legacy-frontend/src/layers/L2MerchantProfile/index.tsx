import { useInvestigation } from '../../hooks/useInvestigation';
import { LayerFrame } from '../../components/common/LayerFrame';
import { Badge, Callout, Panel, Td, Th, rowCls, tableCls } from '../../components/ui/ui';
import { BaselineChart } from '../../components/charts/charts';
import { inr, inrK, pct } from '../../utils/format';
import type { InvestigationResult } from '../../types/investigation';

export function ProfileCard({ r }: { r: InvestigationResult }) {
  const p = r.l2.profile;
  const rows: [string, string][] = [['Business category', `${p.category} (MCC ${p.mcc})`], ['Location', p.city], ['Products', p.products.join(', ')], ['Declared activity', p.declaredActivity.join(', ')],
    ['Expected ticket size', `${inr(p.ticketMin)}–${inr(p.ticketMax)}`], ['Operating hours', p.hours[1] === 24 ? '24 hours (online)' : `${p.hours[0]}:00–${p.hours[1]}:00`], ['Customer geography', p.catchment === 'LOCAL' ? `Local service area (${p.localStates.join(', ')})` : 'National'],
    ['Expected weekly volume', inrK(p.baselineWeekly)], ['Seasonal expectation', p.seasonalPeak > 1 ? `${p.seasonalPeak.toFixed(1)}× in peak season` : 'No strong seasonality'], ['Declared domains', p.declaredDomains.join(', ')], ['Account age', `${p.accountAgeDays} days`]];
  return <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line py-1.5 text-[13px]"><dt className="text-mute">{k}</dt><dd className="text-right">{v}</dd></div>)}</dl>;
}

export function L2Body({ r }: { r: InvestigationResult }) {
  const { rows, peak, cusum } = r.l2, p = r.l2.profile, alarm = cusum.find(c => c.alarm);
  return (
    <>
      <Panel title="Approved merchant profile" subtitle="Declared at onboarding and approved after KYC."><ProfileCard r={r} /></Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        {[['Anchored baseline', 'The declared level of business, fixed at onboarding. Catches long, slow drift.', 'bg-slate-500'], ['Seasonal expectation', `The anchored level × a seasonal multiplier (${p.seasonalPeak.toFixed(1)}× at peak). Stops festivals looking like fraud.`, 'bg-amber-400'], ['Rolling challenger', 'Mean of the previous four weeks. Adapts quickly, so a slow ramp can hide inside it.', 'bg-violet-400']].map(([t, d, c]) => (
          <div key={t} className="rounded-md border border-line bg-panel p-4"><div className="flex items-center gap-2 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${c}`} />{t}</div><p className="mt-1.5 text-[13px] text-mute">{d}</p></div>))}
      </div>
      <Panel title="Expected versus actual weekly collections" subtitle="Synthetic weekly totals aggregated from the event store.">
        <BaselineChart rows={rows} />
        {peak && peak.actual !== null && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Callout tone="mute" title={`Against anchored baseline: ${pct(peak.rAnchored!)}`}>{inrK(peak.actual)} against {inrK(peak.anchored)}. Large, but it ignores the season.</Callout>
            <Callout tone="warn" title={`Against seasonal expectation: ${pct(peak.rSeasonal!)}`}>{inrK(peak.actual)} against {inrK(peak.seasonal)}. This is the number that matters.</Callout>
            <Callout tone="mute" title={`Against rolling challenger: ${pct(peak.rRolling!)}`}>{inrK(peak.actual)} against {inrK(peak.rolling)}. Shrinks as the challenger catches up.</Callout>
          </div>)}
      </Panel>
      <Panel title="Residuals by week" bodyClass="p-0 overflow-x-auto">
        <table className={tableCls}><thead><tr><Th>Week</Th><Th>Actual</Th><Th>Anchored E</Th><Th>Seasonal E</Th><Th>Rolling E</Th><Th>R (anchored)</Th><Th>R (seasonal)</Th><Th>R (rolling)</Th></tr></thead>
          <tbody>{rows.slice(-6).map(w => <tr key={w.week} className={rowCls}><Td>{w.week}</Td><Td className="tabular-nums">{w.actual === null ? <span className="text-dim">not active</span> : inrK(w.actual)}</Td><Td className="tabular-nums">{inrK(w.anchored)}</Td><Td className="tabular-nums">{inrK(w.seasonal)}</Td><Td className="tabular-nums">{inrK(w.rolling)}</Td>
            {[w.rAnchored, w.rSeasonal, w.rRolling].map((x, i) => <Td key={i} className="tabular-nums">{x === null ? '—' : <span className={Math.abs(x) > 0.3 ? 'text-amber-300' : ''}>{pct(x)}</span>}</Td>)}</tr>)}</tbody></table>
      </Panel>
      <Callout tone="info" title="Why seasonal growth is not automatically suspicious">
        A bakery is expected to do roughly {p.seasonalPeak.toFixed(1)}× its normal business in the festival weeks, so a rise in volume alone is not a finding. MRE asks how far the merchant is beyond what the season explains{alarm ? `, and the CUSUM drift tracker first alarms in ${alarm.week}` : ''}. Even then, volume is only one weak signal; it needs independent evidence from other families before any case opens.
      </Callout>
      <div className="text-xs text-dim">Profile status: <Badge tone="ok">Approved</Badge> Expectations are derived from the declared profile. Nothing here is a verdict.</div>
    </>
  );
}
export function L2View() {
  const { result: r } = useInvestigation();
  return <LayerFrame n={2} evidenceCount={3} evidenceLabel="baselines built" summary="Three baselines turn the declared profile into numeric expectations."><L2Body r={r} /></LayerFrame>;
}
