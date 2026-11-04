import type { InvestigationResult } from '../../types/investigation';
import { Badge, Td, Th, rowCls, tableCls, Mono } from '../ui/ui';
import { fmtDateTime, inr } from '../../utils/format';

/** Shows the original synthetic records behind a signal. */
export function RecordPeek({ r, ids, max = 8 }: { r: InvestigationResult; ids: string[]; max?: number }) {
  if (!ids.length) return <div className="text-xs text-dim">No individual records: this signal is an aggregate or an absence.</div>;
  const em = ids.filter(i => i.startsWith('EMB')), evIds = ids.filter(i => !i.startsWith('EMB'));
  const byId = new Map(r.events.map(e => [e.id, e]));
  const evs = evIds.map(i => byId.get(i)).filter((e): e is NonNullable<typeof e> => !!e).slice(0, max);
  return (
    <div className="space-y-2 overflow-x-auto">
      {em.length > 0 && <table className={tableCls}><thead><tr><Th>Embed</Th><Th>Link</Th><Th>Host and path</Th><Th>Page</Th><Th>Category</Th><Th>First seen</Th></tr></thead>
        <tbody>{em.map(i => { const x = r.scenario.web.embeds.find(e => e.id === i)!; return <tr key={i} className={rowCls}><Td><Mono>{x.id}</Mono></Td><Td><Mono>{x.linkId}</Mono></Td><Td className="font-mono text-xs">{x.host}{x.path}</Td><Td>{x.pageType}</Td><Td><Badge tone={x.category === 'own' ? 'ok' : x.category === 'gambling' ? 'bad' : 'warn'}>{x.category}</Badge></Td><Td className="text-xs">{x.firstSeen}</Td></tr>; })}</tbody></table>}
      {evs.length > 0 && <table className={tableCls}><thead><tr><Th>Event</Th><Th>Type</Th><Th>Amount</Th><Th>Time (IST)</Th><Th>State</Th><Th>Payer / destination</Th></tr></thead>
        <tbody>{evs.map(e => <tr key={e.id} className={rowCls}><Td><Mono>{e.id}</Mono></Td><Td>{e.type.toLowerCase()}</Td><Td className="tabular-nums">{inr(e.amount)}</Td><Td className="font-mono text-xs">{fmtDateTime(e.eventTime)}</Td><Td>{e.payerState}</Td><Td><Mono className="text-mute">{e.type === 'REFUND' ? `${e.payerHash} → ${e.destHash}` : e.beneficiaryHash ?? e.payerHash}</Mono></Td></tr>)}</tbody></table>}
      {evIds.length > max && <div className="text-[11px] text-dim">Showing {max} of {evIds.length} records.</div>}
    </div>
  );
}
