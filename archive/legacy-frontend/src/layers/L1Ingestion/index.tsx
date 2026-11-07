import { useEffect, useState } from 'react';
import { ArrowRight, Fingerprint, Link2Off } from 'lucide-react';
import { useInvestigation } from '../../hooks/useInvestigation';
import { LayerFrame } from '../../components/common/LayerFrame';
import { Badge, Bar, Callout, Panel, Stat, Td, Th, rowCls, tableCls, Tabs, Btn, Mono, type Tone } from '../../components/ui/ui';
import { fmtDateTime, inr, pct } from '../../utils/format';
import type { CoverageState } from '../../types/merchant';
import type { EventType } from '../../types/payment';

const covTone = (s: CoverageState): Tone => (s === 'AVAILABLE' ? 'ok' : s === 'PARTIAL' ? 'warn' : 'mute');
const typeTone: Record<EventType, Tone> = { SALE: 'info', REFUND: 'warn', TRANSFER: 'bad', SETTLEMENT: 'ok', CHARGEBACK: 'mute' };

export function L1View() {
  const { result: r } = useInvestigation();
  const l1 = r.l1, ev = [...r.events].reverse();
  const [f, setF] = useState<'ALL' | EventType>('ALL');
  const [shown, setShown] = useState(0), [limit, setLimit] = useState(14);
  const rows = ev.filter(e => f === 'ALL' || e.type === f);
  useEffect(() => { setShown(0); const t = setInterval(() => setShown(s => { if (s >= limit) { clearInterval(t); return s; } return s + 3; }), 45); return () => clearInterval(t); }, [f, limit, r]);
  const missing = Object.entries(l1.coverage).filter(([, v]) => v === 'MISSING').map(([k]) => k);
  const sample = r.events.find(e => e.type === 'SETTLEMENT' && e.settleTime) ?? r.events[0];
  return (
    <LayerFrame n={1} evidenceCount={r.events.length} evidenceLabel="records in the event store" summary={<>Event store holds <b className="text-ink">{r.events.length}</b> normalised events for {r.scenario.profile.name}. {missing.length ? `${missing.length} source(s) missing, kept as UNKNOWN.` : 'All sources connected.'}</>}>
      <Panel title="Incoming data sources" subtitle="Each source reports its own coverage and record count.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {l1.sources.map(s => (
            <div key={s.name} className="rounded border border-line bg-panel2 p-3">
              <div className="flex items-start justify-between gap-2"><span className="text-[13px] font-medium">{s.name}</span><Badge tone={covTone(s.state)}>{s.state === 'AVAILABLE' ? 'Available' : s.state === 'PARTIAL' ? 'Partial' : 'Missing'}</Badge></div>
              <div className="mt-2 font-mono text-lg tabular-nums">{s.state === 'MISSING' ? '—' : s.records.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-dim">{s.note}</div>
            </div>))}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-5">
        {(['SALE', 'REFUND', 'TRANSFER', 'SETTLEMENT', 'CHARGEBACK'] as EventType[]).map(t => <Stat key={t} label={t[0] + t.slice(1).toLowerCase() + ' events'} value={l1.counts[t].n} sub={inr(l1.counts[t].value)} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Refund-to-sale linkage" subtitle="Refunds are matched to original sales by reference.">
          <div className="flex items-end justify-between"><div className="text-3xl font-semibold tabular-nums">{l1.refundLinkage.linked}<span className="text-base text-mute"> / {l1.refundLinkage.total} linked</span></div>
            {l1.refundLinkage.orphan > 0 && <Badge tone="bad"><Link2Off size={11} />{l1.refundLinkage.orphan} without a sale</Badge>}</div>
          <Bar className="mt-3" value={l1.refundLinkage.total ? l1.refundLinkage.linked / l1.refundLinkage.total : 0} tone={l1.refundLinkage.orphan ? 'warn' : 'ok'} />
          <p className="mt-3 text-xs text-mute">Orphan refunds are stored as facts. Whether they matter is decided later by detector D7.</p>
        </Panel>
        <Panel title="Timestamp separation" subtitle={`Settlement ${sample.id}`}>
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-mute">Event time</dt><dd className="font-mono">{fmtDateTime(sample.eventTime)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Settle time</dt><dd className="font-mono">{sample.settleTime ? fmtDateTime(sample.settleTime) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Ingest time</dt><dd className="font-mono">{fmtDateTime(sample.ingestTime)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-mute">Three clocks stay separate so timing detectors use when the payer paid, not when the data arrived.</p>
        </Panel>
        <Panel title="Identifier hashing" subtitle="Raw payer identifiers never enter the store.">
          <div className="space-y-1.5">{l1.hashSamples.map(h => <div key={h.raw} className="flex items-center gap-2 text-[12px]"><Mono className="text-mute">{h.raw}</Mono><ArrowRight size={12} className="text-dim" /><Fingerprint size={12} className="text-cyan-400" /><Mono>{h.hash}</Mono></div>)}</div>
          <p className="mt-3 text-xs text-dim">Demo uses a simple hash. Production design: salted HMAC-SHA256 with managed keys.</p>
        </Panel>
      </div>
      <Panel title="Merchant coverage map" subtitle="Which evidence exists for this merchant.">
        <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {(['acquiring', 'website', 'orders', 'bank', 'fulfillment', 'calendar', 'verification'] as const).map(k => (
            <div key={k} className="rounded border border-line bg-panel2 px-3 py-2"><div className="text-xs text-mute capitalize">{k === 'bank' ? 'Bank-side' : k}</div><Badge className="mt-1" tone={covTone(l1.coverage[k])}>{l1.coverage[k] === 'AVAILABLE' ? 'Available' : l1.coverage[k] === 'PARTIAL' ? 'Partial' : 'Missing'}</Badge></div>))}
        </div>
        <div className="mt-3"><Callout tone="info" title="Missing data is UNKNOWN">A missing feed is not evidence of good or bad behaviour. Detectors that need it return UNKNOWN, and UNKNOWN is excluded from risk scoring in L4.{missing.length ? ` Here: ${missing.join(', ')}.` : ''}</Callout></div>
      </Panel>
      <Panel title="Event store" subtitle="Synthetic records, newest first. Source lineage is kept on every row." right={
        <Tabs tabs={(['ALL', 'SALE', 'REFUND', 'TRANSFER', 'SETTLEMENT'] as const).map(t => ({ id: t, label: t === 'ALL' ? 'All' : t[0] + t.slice(1).toLowerCase() }))} value={f as 'ALL'} onChange={v => { setF(v); setLimit(14); }} />} bodyClass="p-0 overflow-x-auto">
        <table className={tableCls}><thead><tr><Th>Event</Th><Th>Type</Th><Th>Amount</Th><Th>Event time (IST)</Th><Th>Payer hash</Th><Th>State</Th><Th>Channel</Th><Th>Linked sale</Th><Th>Source</Th></tr></thead>
          <tbody>{rows.slice(0, Math.min(shown, limit)).map(e => (
            <tr key={e.id} className={rowCls}><Td><Mono>{e.id}</Mono></Td><Td><Badge tone={typeTone[e.type]}>{e.type[0] + e.type.slice(1).toLowerCase()}</Badge></Td><Td className="tabular-nums">{inr(e.amount)}</Td><Td className="font-mono text-xs">{fmtDateTime(e.eventTime)}</Td>
              <Td><Mono className="text-mute">{e.payerHash}</Mono></Td><Td>{e.payerState}</Td><Td className="text-mute">{e.channel}</Td><Td>{e.type === 'REFUND' ? (e.linkedSaleId ? <Mono>{e.linkedSaleId}</Mono> : <Badge tone="bad">none</Badge>) : '—'}</Td><Td className="text-xs text-dim">{e.source}</Td></tr>))}</tbody></table>
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-mute"><span>Showing {Math.min(shown, limit, rows.length)} of {rows.length}{shown < limit && <span className="blink ml-2 text-cyan-300">streaming…</span>}</span>
          {limit < rows.length && <Btn size="sm" onClick={() => setLimit(l => l + 20)}>Show 20 more</Btn>}</div>
      </Panel>
      <div className="text-xs text-dim">Lineage: {Array.from(new Set(r.events.map(e => e.source))).join(' · ')}. {pct(r.events.filter(e => e.type === 'SALE').length / r.events.length)} of stored events are sales.</div>
    </LayerFrame>
  );
}
