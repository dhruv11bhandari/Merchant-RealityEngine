import { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useInvestigation } from '../../hooks/useInvestigation';
import { LayerFrame } from '../../components/common/LayerFrame';
import { RecordPeek } from '../../components/common/RecordPeek';
import { Badge, Btn, Callout, Panel, StatusBadge, Tabs, Td, Th, rowCls, tableCls, Mono, type Tone } from '../../components/ui/ui';
import { RESPONSE_LEVELS } from '../../data/evidence';
import type { ChainItem, ChainVerdict } from '../../types/investigation';
import { cx } from '../../utils/format';

const vTone: Record<'legit' | 'front', Record<ChainVerdict, Tone>> = {
  legit: { SUPPORTED: 'ok', FAILED: 'bad', PARTIAL: 'warn', UNVERIFIED: 'mute', NOT_SUPPORTED: 'mute' },
  front: { SUPPORTED: 'bad', FAILED: 'bad', PARTIAL: 'warn', UNVERIFIED: 'mute', NOT_SUPPORTED: 'ok' },
};
const vLabel: Record<'legit' | 'front', Record<ChainVerdict, string>> = {
  legit: { SUPPORTED: 'Holds', FAILED: 'Fails', PARTIAL: 'Weakened', UNVERIFIED: 'Unverified', NOT_SUPPORTED: '—' },
  front: { SUPPORTED: 'Supported', FAILED: '—', PARTIAL: 'Weak signs', UNVERIFIED: 'Unverified', NOT_SUPPORTED: 'Not supported' },
};
type Tool = 'signals' | 'links' | 'refunds' | 'domain' | 'gaps';
const GAPS: Record<string, [string, string]> = { orders: ['D10', 'Would show whether payments correspond to real orders.'], fulfillment: ['F7', 'Would show whether goods or services were delivered.'], bank: ['F8', 'Would reconcile settlements with bank credits.'], verification: ['B9', 'Would let independent purchasers confirm or deny their payments.'], calendar: ['C5', 'Needed to test funding alignment with events.'], website: ['G2, G6, E1', 'Needed to check catalogue and payment-link provenance.'] };

function Chain({ title, tone, items, mode, sel, onSel }: { title: string; tone: Tone; items: ChainItem[]; mode: 'legit' | 'front'; sel: string | null; onSel: (l: string) => void }) {
  return (
    <div className={cx('rounded-md border bg-panel', tone === 'ok' ? 'border-gray-400/25' : 'border-neutral-400/25')}>
      <div className="border-b border-line px-4 py-3"><div className="text-sm font-semibold">{title}</div></div>
      <ol className="divide-y divide-line">
        {items.map((it, i) => (
          <li key={it.label}><button onClick={() => onSel(it.label)} className={cx('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-panel2/60', sel === it.label && 'bg-panel2')}>
            <span className="relative mt-0.5 flex flex-col items-center"><span className={cx('h-2.5 w-2.5 rounded-full', vTone[mode][it.verdict] === 'bad' ? 'bg-neutral-400' : vTone[mode][it.verdict] === 'ok' ? 'bg-gray-400' : vTone[mode][it.verdict] === 'warn' ? 'bg-stone-400' : 'bg-slate-500')} />{i < items.length - 1 && <span className="absolute top-3 h-8 w-px bg-line2" />}</span>
            <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">{it.label}</span><span className="block text-xs text-mute">{it.detail}</span><span className="mt-1 block text-[11px] text-dim">Tests: {it.evidenceIds.join(', ')}</span></span>
            <Badge tone={vTone[mode][it.verdict]}>{vLabel[mode][it.verdict]}</Badge></button></li>))}
      </ol>
    </div>
  );
}

export function L5View() {
  const { result: r, user, patch, note, setLevel } = useInvestigation();
  const rv = r.review, [sel, setSel] = useState<string | null>(null), [tool, setTool] = useState<Tool>('signals'), [verified, setVerified] = useState<Record<string, string>>({}), [saved, setSaved] = useState(false);
  const item = [...rv.legit, ...rv.front].find(i => i.label === sel);
  const evs = item ? r.evidence.filter(e => item.evidenceIds.includes(e.id)) : r.evidence.filter(e => e.status !== 'UNKNOWN');
  const sc = r.scenario, byId = new Map(r.events.map(e => [e.id, e]));
  const refunds = r.events.filter(e => e.type === 'REFUND'), gaps = Object.entries(sc.coverage).filter(([k, v]) => v === 'MISSING' && GAPS[k]);
  const level = user.chosenLevel ?? rv.recommended;
  const statusTone: Tone = rv.legitStatus === 'FAILED' ? 'bad' : rv.legitStatus === 'HOLDS' ? 'ok' : 'warn';
  return (
    <LayerFrame n={5} evidenceCount={rv.legit.length + rv.front.length} evidenceLabel="chain links tested" summary={<>Legitimate explanation: <Badge tone={statusTone}>{rv.legitStatus === 'FAILED' ? 'Fails' : rv.legitStatus === 'HOLDS' ? 'Holds' : 'Inconclusive'}</Badge> Recommended action: <b className="text-ink">{level} {RESPONSE_LEVELS.find(l => l.id === level)!.name}</b></>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Chain title="Legitimate business chain" tone="ok" items={rv.legit} mode="legit" sel={sel} onSel={setSel} />
        <Chain title="Potential front chain" tone="bad" items={rv.front} mode="front" sel={sel} onSel={setSel} />
      </div>
      <Panel title="Analyst reasoning" subtitle="Generated from the evidence; the analyst can accept or override it.">
        <ul className="space-y-2 text-[13px]">{rv.reasoning.map((t, i) => <li key={i} className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-zinc-300" /><span className="text-ink/90">{t}</span></li>)}</ul>
        {rv.legitStatus === 'FAILED' && r.scenario.id === 'bakery' && <div className="mt-3"><Callout tone="warn" title="Why the legitimate chain fails here">Checkout provenance (G6) shows the payment link on an undeclared betting deposit page, and refund destinations (D9) do not match the original payers. These come from different data sources and are both hard to explain away with a bakery story.</Callout></div>}
      </Panel>
      <Panel title="Evidence inspection" subtitle={item ? `Showing evidence for “${item.label}”. Select another link or clear.` : 'Showing all informative signals. Select a link above to focus.'} right={item && <Btn size="sm" variant="ghost" onClick={() => setSel(null)}>Clear</Btn>}>
        <Tabs<Tool> value={tool} onChange={setTool} tabs={[{ id: 'signals', label: 'Signals and records' }, { id: 'links', label: 'Payment links' }, { id: 'refunds', label: 'Refund reconciliation' }, { id: 'domain', label: 'Domain provenance' }, { id: 'gaps', label: `Coverage gaps (${gaps.length})` }]} />
        <div className="pt-4">
          {tool === 'signals' && <div className="space-y-4">{evs.map(e => <div key={e.id} className="rounded border border-line bg-panel2 p-3"><div className="flex flex-wrap items-center gap-2"><Mono className="text-zinc-300">{e.id}</Mono><span className="text-[13px] font-medium">{e.name}</span><StatusBadge s={e.status} /></div><div className="mt-1 text-xs text-mute">{e.observed}</div><div className="mt-2"><RecordPeek r={r} ids={e.records} max={5} /></div></div>)}{evs.length === 0 && <div className="text-sm text-mute">No signals for this link.</div>}</div>}
          {tool === 'links' && (
            <div className="overflow-x-auto"><table className={tableCls}><thead><tr><Th>Link</Th><Th>Merchant</Th><Th>Embedded on</Th><Th>Category</Th><Th>Verification</Th></tr></thead>
              <tbody>{sc.web.embeds.map(e => (
                <tr key={e.id} className={rowCls}><Td><Mono>{e.linkId}</Mono></Td><Td className="text-xs">{e.merchantId === sc.primaryMerchantId ? 'This merchant' : e.merchantId}</Td><Td className="font-mono text-xs">{e.host}{e.path}</Td><Td><Badge tone={e.category === 'own' ? 'ok' : e.category === 'gambling' ? 'bad' : 'warn'}>{e.category}</Badge></Td>
                  <Td>{verified[e.id] ? <span className="text-xs text-gray-300">{verified[e.id]}</span> : <Btn size="sm" onClick={() => setVerified(v => ({ ...v, [e.id]: e.category === 'own' ? 'Confirmed: link is on the merchant’s declared domain.' : `Confirmed: ${e.pageType} on ${e.host} posts payments to ${e.linkId}.` }))}>Verify link</Btn>}</Td></tr>))}</tbody></table>
              <p className="mt-2 text-xs text-dim">Verification here replays the stored synthetic crawler snapshot. No external site is contacted.</p></div>)}
          {tool === 'refunds' && (refunds.length === 0 ? <div className="text-sm text-mute">No refunds in this window.</div> : (
            <div className="overflow-x-auto"><table className={tableCls}><thead><tr><Th>Refund</Th><Th>Amount</Th><Th>Original sale</Th><Th>Original payer</Th><Th>Refund destination</Th><Th>Reconciles</Th></tr></thead>
              <tbody>{refunds.map(x => { const s = x.linkedSaleId ? byId.get(x.linkedSaleId) : undefined, ok = !!s && s.payerHash === x.destHash; return (
                <tr key={x.id} className={rowCls}><Td><Mono>{x.id}</Mono></Td><Td className="tabular-nums">₹{x.amount.toLocaleString('en-IN')}</Td><Td>{s ? <Mono>{s.id}</Mono> : <Badge tone="bad">none</Badge>}</Td><Td><Mono className="text-mute">{s?.payerHash ?? '—'}</Mono></Td><Td><Mono className="text-mute">{x.destHash}</Mono></Td><Td>{ok ? <Badge tone="ok">Yes</Badge> : <Badge tone="bad">{s ? 'Different destination' : 'No sale'}</Badge>}</Td></tr>); })}</tbody></table></div>))}
          {tool === 'domain' && (
            <div className="space-y-3"><div className="text-[13px]"><span className="text-mute">Declared domains: </span>{sc.profile.declaredDomains.map(d => <Mono key={d} className="mr-2">{d}</Mono>)}</div>
              <table className={tableCls}><thead><tr><Th>Host</Th><Th>Declared</Th><Th>Category</Th><Th>First seen</Th><Th>Merchants using it</Th></tr></thead>
                <tbody>{[...new Set(sc.web.embeds.map(e => e.host))].map(h => { const es = sc.web.embeds.filter(e => e.host === h); return <tr key={h} className={rowCls}><Td><Mono>{h}</Mono></Td><Td>{sc.profile.declaredDomains.includes(h) ? <Badge tone="ok">Yes</Badge> : <Badge tone="bad">No</Badge>}</Td><Td>{es[0].category}</Td><Td className="text-xs">{es.map(e => e.firstSeen).sort()[0]}</Td><Td>{new Set(es.map(e => e.merchantId)).size}</Td></tr>; })}</tbody></table>
              <p className="text-xs text-dim">Domain categories come from the synthetic crawler fixture, not from a real classification service.</p></div>)}
          {tool === 'gaps' && (gaps.length === 0 ? <div className="text-sm text-mute">Every source is connected for this merchant.</div> : <div className="grid gap-2 sm:grid-cols-2">{gaps.map(([k]) => <div key={k} className="rounded border border-line bg-panel2 p-3 text-[13px]"><div className="flex items-center gap-2"><Badge>Missing</Badge><span className="font-medium capitalize">{k}</span></div><div className="mt-1 text-xs text-mute">{GAPS[k][1]} Affects {GAPS[k][0]}.</div><div className="mt-1 text-[11px] text-dim">Treated as UNKNOWN, not as a finding against the merchant.</div></div>)}</div>)}
        </div>
      </Panel>
      <Panel title="Record findings" subtitle="Your inputs are written to the audit trail and carried into L6 and L7.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm"><span className="mb-1 block text-xs text-mute">Investigation findings</span><textarea value={user.notes} onChange={e => { patch({ notes: e.target.value }); setSaved(false); }} rows={4} placeholder="What did you verify? What remains open?" className="w-full rounded border border-line2 bg-bg px-3 py-2 text-sm outline-none focus:border-zinc-400" /></label>
          <label className="block text-sm"><span className="mb-1 block text-xs text-mute">Merchant clarification (optional)</span><textarea value={user.clarification} onChange={e => { patch({ clarification: e.target.value }); setSaved(false); }} rows={4} placeholder="Paste or summarise the merchant’s explanation." className="w-full rounded border border-line2 bg-bg px-3 py-2 text-sm outline-none focus:border-zinc-400" /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block text-sm"><span className="mb-1 block text-xs text-mute">Recommended action</span>
            <select value={level} onChange={e => { setLevel(e.target.value as typeof level); setSaved(false); }} className="rounded border border-line2 bg-bg px-3 py-2 text-sm outline-none focus:border-zinc-400">{RESPONSE_LEVELS.map(l => <option key={l.id} value={l.id}>{l.id} · {l.name}{l.id === rv.recommended ? ' (system suggestion)' : ''}</option>)}</select></label>
          <Btn variant="primary" onClick={() => { note('Review recorded', `Recommended ${level}. ${user.notes ? 'Findings: ' + user.notes.slice(0, 120) : 'No free-text findings.'}`); if (user.clarification) note('Merchant clarification added', user.clarification.slice(0, 160)); setSaved(true); }}>Record review</Btn>
          {saved && <span className="flex items-center gap-1.5 text-sm text-gray-300"><CheckCircle2 size={15} />Recorded in audit trail</span>}
        </div>
        <p className="mt-3 text-xs text-dim">The recommendation sets the starting level in L6. It does not execute anything.</p>
      </Panel>
    </LayerFrame>
  );
}
