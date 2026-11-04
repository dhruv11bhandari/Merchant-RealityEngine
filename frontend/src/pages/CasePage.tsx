import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown, ShieldAlert, ShieldCheck } from 'lucide-react';
import { usePortfolio, type PortfolioEntry } from '../hooks/usePortfolio';
import { useInvestigation } from '../hooks/useInvestigation';
import { verdictOf } from './PortfolioPage';
import { BaselineChart, CusumChart, HourChart, StateBars, TicketHistogram } from '../components/charts/charts';
import { PatternBoard } from '../components/common/PatternBoard';
import { chasingSequences, LADDER, PASSPORT_REASONS, checkPassport, type PassportReason } from '../engines/patternPack';
import { RESPONSE_LEVELS } from '../data/evidence';
import type { UserState } from '../types/investigation';
import { planResponse } from '../engines/responseEngine';
import { Badge, Btn, Td, Th, rowCls, tableCls } from '../components/ui/ui';
import { cx, fmtDateTime, inr, inrK } from '../utils/format';

/* A reason = one theme of flagged evidence, explained in plain words, with its proof. */
interface Item { id: string; name: string; observed: string; expected: string; flagged: boolean }
interface Theme { id: string; title: string; plain: string; ids: string[]; proof: (e: PortfolioEntry) => ReactNode }

const pct = (x: number) => `${Math.round(x * 100)}%`;
const NO_USER: UserState = { notes: '', clarification: '', chosenLevel: null, legalVerified: false, escrowConfirmed: false, executed: false, label: null, audit: [] };

function items(e: PortfolioEntry, ids: string[]): Item[] {
  const core = e.result.evidence.filter(x => ids.includes(x.id)).map(x => ({ id: x.id, name: x.name, observed: x.observed, expected: x.expected, flagged: x.status === 'ILLICIT' }));
  const pats = e.pack.results.filter(x => ids.includes(x.id)).map(x => ({ id: x.id, name: x.name, observed: x.observed, expected: x.expected, flagged: x.status === 'FLAGGED' }));
  return [...core, ...pats];
}

function ChartBox({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return <div className="rounded-md border border-line bg-bg/50 p-3"><div className="mb-2 text-xs font-medium text-mute">{title}</div>{children}{note && <div className="mt-1.5 text-[11px] text-dim">{note}</div>}</div>;
}
function Meter({ label, value, good, note }: { label: string; value: number; good: boolean; note?: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className={cx('tabular-nums', good ? 'text-emerald-300' : 'text-red-300')}>{pct(value)}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-panel2"><div className={cx('h-full rounded', good ? 'bg-emerald-400' : 'bg-red-400')} style={{ width: `${Math.min(100, value * 100)}%` }} /></div>
      {note && <div className="mt-0.5 text-[11px] text-dim">{note}</div>}
    </div>);
}

const sales = (e: PortfolioEntry) => e.result.events.filter(x => x.type === 'SALE');

const THEMES: Theme[] = [
  { id: 'shape', title: 'Payments don’t look like the declared business', plain: 'Bill sizes and the overall payment pattern match a different kind of business.', ids: ['S1', 'A4', 'A1', 'H3'],
    proof: e => (
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartBox title="Ticket sizes (red bars = exact round amounts)" note={`Declared bill range ₹${e.scenario.profile.ticketMin}–₹${e.scenario.profile.ticketMax.toLocaleString('en-IN')}`}><TicketHistogram sales={sales(e)} profile={e.scenario.profile} height={220} /></ChartBox>
        <ChartBox title="What the payments look like (category model, S1)" note={`Declared: ${e.pack.declared}. Prototypes are illustrative, not trained.`}>
          <div className="space-y-2.5 pt-1">{e.pack.categories.map((c, i) => <Meter key={c.id} label={c.name} value={c.prob} good={i !== 0 || c.name === e.pack.declared} />)}</div>
        </ChartBox>
      </div>) },
  { id: 'geo', title: 'Customers come from the wrong places', plain: 'A local business is being paid by people from all over the country.', ids: ['B6'],
    proof: e => <ChartBox title="Sales by payer state (amber = outside the merchant’s home state)" note={`Home state: ${e.scenario.profile.localStates.join(', ')}`}><StateBars sales={sales(e)} local={e.scenario.profile.localStates} height={240} /></ChartBox> },
  { id: 'time', title: 'Money arrives at the wrong times', plain: 'Payments cluster before match start times or late at night, outside normal trading.', ids: ['C5', 'C2', 'N2'],
    proof: e => <ChartBox title="Sales by hour of day, IST (red = in the 45 minutes before a match starts; green lines = declared opening hours)"><HourChart sales={sales(e)} fixtures={e.scenario.fixtures} profile={e.scenario.profile} height={250} /></ChartBox> },
  { id: 'volume', title: 'Volume jumped beyond what the season explains', plain: 'Weekly collections rose well above the merchant’s own normal and its seasonal expectation.', ids: ['H1', 'S2'],
    proof: e => (
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartBox title="Weekly collections vs three baselines"><BaselineChart rows={e.result.l2.rows} height={230} /></ChartBox>
        <ChartBox title="CUSUM drift (alarm when the line crosses the limit)"><CusumChart points={e.result.l2.cusum} height={230} /></ChartBox>
      </div>) },
  { id: 'refunds', title: 'Refunds that don’t reconcile', plain: 'Refunds are paid out with no original sale, or to someone other than the person who paid.', ids: ['D7', 'D9'],
    proof: e => {
      const ev = e.result.events, byId = new Map(ev.map(x => [x.id, x]));
      const bad = ev.filter(x => x.type === 'REFUND').map(r => { const s = r.linkedSaleId ? byId.get(r.linkedSaleId) : undefined; return { r, s, issue: !s ? 'No original sale' : s.payerHash !== r.destHash ? 'Paid to a different account' : '' }; }).filter(x => x.issue);
      return (
        <ChartBox title={`${bad.length} problem refund(s)`}>
          <div className="max-h-64 overflow-auto"><table className={tableCls}><thead><tr><Th>Refund</Th><Th>Amount</Th><Th>When</Th><Th>Original sale</Th><Th>Problem</Th></tr></thead>
            <tbody>{bad.slice(0, 20).map(({ r, s, issue }) => <tr key={r.id} className={rowCls}><Td className="font-mono">{r.id}</Td><Td className="tabular-nums">{inr(r.amount)}</Td><Td>{fmtDateTime(r.eventTime)}</Td><Td className="font-mono">{s ? s.id : '—'}</Td><Td className="text-red-300">{issue}</Td></tr>)}</tbody></table></div>
        </ChartBox>);
    } },
  { id: 'links', title: 'Its payment link is advertised on betting or third-party pages', plain: 'The merchant’s link or ID appears where it was never declared, and other merchants share the same page.', ids: ['G6', 'E1', 'S7', 'S3'],
    proof: e => {
      const sc = e.scenario, p = sc.profile;
      return (
        <ChartBox title="Where the merchant’s payment links were found">
          <div className="space-y-2">
            {sc.web.embeds.filter(x => x.merchantId === p.id || sc.web.embeds.some(y => y.merchantId === p.id && y.host === x.host && !p.declaredDomains.includes(x.host))).map(x => {
              const own = p.declaredDomains.includes(x.host), mine = x.merchantId === p.id;
              return <div key={x.id} className={cx('flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm', own ? 'border-line' : 'border-red-400/40 bg-red-400/5')}>
                <span><span className="font-mono">{x.linkId}</span> <span className="text-mute">on</span> {x.host}{x.path} <span className="text-mute">({x.pageType})</span>{!mine && <span className="ml-1 text-xs text-amber-300">· another merchant’s link</span>}</span>
                <Badge tone={own ? 'ok' : 'bad'}>{own ? 'declared site' : x.category}</Badge></div>;
            })}
            {(sc.sightings ?? []).map(s => <div key={s.place} className="rounded border border-red-400/40 bg-red-400/5 px-3 py-2 text-sm"><span className="font-mono">{s.paymentRef}</span> seen on <b>{s.source}</b>: {s.place} · {s.seenAt}{s.note && <div className="text-xs text-mute">“{s.note.replace(/[“”]/g, '')}”</div>}</div>)}
          </div>
        </ChartBox>);
    } },
  { id: 'money', title: 'Money is moved on quickly', plain: 'Settlement accounts change, and money leaves for several other accounts soon after it arrives.', ids: ['F5', 'I2', 'N3'],
    proof: e => {
      const flows = e.result.events.filter(x => x.type === 'SETTLEMENT' || x.type === 'TRANSFER');
      const names = new Map<string, string>(); const nm = (h?: string) => { if (!h) return '—'; if (!names.has(h)) names.set(h, `Account ${names.size + 1}`); return names.get(h)!; };
      return (
        <ChartBox title="Settlements in, payouts out">
          <div className="max-h-64 overflow-auto"><table className={tableCls}><thead><tr><Th>When</Th><Th>Type</Th><Th>Amount</Th><Th>Account</Th></tr></thead>
            <tbody>{flows.map((x, i) => { const changed = x.type === 'SETTLEMENT' && i > 0 && flows.slice(0, i).filter(y => y.type === 'SETTLEMENT').slice(-1)[0]?.beneficiaryHash !== x.beneficiaryHash && flows.slice(0, i).some(y => y.type === 'SETTLEMENT');
              return <tr key={x.id} className={rowCls}><Td>{fmtDateTime(x.eventTime)}</Td><Td className={x.type === 'TRANSFER' ? 'text-red-300' : ''}>{x.type === 'TRANSFER' ? 'Payout out' : 'Settlement in'}</Td><Td className="tabular-nums">{inr(x.amount)}</Td><Td className={changed ? 'text-amber-300' : ''}>{nm(x.beneficiaryHash)}{changed ? ' · changed' : ''}</Td></tr>; })}</tbody></table></div>
        </ChartBox>);
    } },
  { id: 'chasing', title: 'Repeat top-ups that look like loss-chasing', plain: 'The same people pay again and again within minutes, with growing amounts, the way bettors top up after losing.', ids: ['N1'],
    proof: e => {
      const seq = chasingSequences(sales(e));
      return (
        <ChartBox title={`${seq.length} payer(s) with rising repeat payments inside 2 hours`}>
          <div className="grid gap-2 sm:grid-cols-2">{seq.slice(0, 8).map(s => (
            <div key={s.payer} className="rounded border border-red-400/30 bg-red-400/5 p-2.5 text-sm">
              <div className="text-xs text-mute"><span className="font-mono text-ink">{s.events[0].payerRef}</span> · {s.state}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">{s.events.map((x, i) => <span key={x.id} className="flex items-center gap-1.5">{i > 0 && <ArrowRight size={12} className="text-dim" />}<span className="rounded bg-panel2 px-1.5 py-0.5 tabular-nums">{inr(x.amount)}</span><span className="text-[11px] text-dim">{fmtDateTime(x.eventTime).slice(-5)}</span></span>)}</div>
            </div>))}</div>
        </ChartBox>);
    } },
  { id: 'substance', title: 'Sales can’t be backed by real business activity', plain: 'Payments don’t match orders, deliveries don’t happen, buyers don’t confirm, or the business spends almost nothing on supplies.', ids: ['D10', 'F7', 'B9', 'G2', 'S6'],
    proof: e => {
      const sc = e.scenario, s = sales(e), withOrder = s.filter(x => x.orderId).length / Math.max(1, s.length);
      const delivered = sc.orders.length ? sc.orders.filter(o => o.status === 'DELIVERED').length / sc.orders.length : null;
      const conf = sc.verification ? sc.verification.confirmed / Math.max(1, sc.verification.contacted) : null;
      const s6 = e.pack.results.find(r => r.id === 'S6');
      return (
        <ChartBox title="Does real commerce stand behind the payments?">
          <div className="space-y-3">
            {sc.coverage.orders !== 'MISSING' && <Meter label="Payments that match an order" value={withOrder} good={withOrder >= 0.9} />}
            {delivered !== null && <Meter label="Orders verified delivered" value={delivered} good={delivered >= 0.9} />}
            {conf !== null && <Meter label={`Sampled buyers who confirm buying (${sc.verification!.confirmed} of ${sc.verification!.contacted})`} value={conf} good={conf >= 0.8} />}
            {sc.footprint && s6 && <div className="rounded border border-line p-2.5 text-sm"><div className="text-xs text-mute">Business footprint (synthetic feed)</div><div className="mt-1">{s6.observed}</div></div>}
          </div>
        </ChartBox>);
    } },
  { id: 'rotation', title: 'It carries on from another account', plain: 'A new account picked up the payers, ticket shape and settlement account of one that went quiet.', ids: ['E3', 'F2'],
    proof: e => (
      <ChartBox title="Behavioural continuity with other accounts">
        <table className={tableCls}><thead><tr><Th>Account</Th><Th>Continuity</Th><Th>Shared payers</Th><Th>Gap</Th><Th>Same settlement account</Th></tr></thead>
          <tbody>{e.result.cohort.map(c => <tr key={c.peerId} className={rowCls}><Td>{c.name}</Td><Td className={cx('tabular-nums', c.score >= 0.4 ? 'text-red-300' : '')}>{c.score.toFixed(2)}</Td><Td className="tabular-nums">{pct(c.jaccard)}</Td><Td>{c.gapDays === null ? '—' : `${c.gapDays} days`}</Td><Td>{c.beneficiaryMatch ? <span className="text-red-300">Yes</span> : 'No'}</Td></tr>)}</tbody></table>
      </ChartBox>) },
];

function Reason({ t, e, n, defaultOpen }: { t: Theme; e: PortfolioEntry; n: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const its = items(e, t.ids).filter(i => i.flagged);
  return (
    <div className="rounded-lg border border-red-400/30 bg-panel">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left" aria-expanded={open}>
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-400/15 font-mono text-xs text-red-300">{n}</span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">{t.title}</span><span className="block text-sm text-mute">{t.plain}</span>
          <span className="mt-1.5 flex flex-wrap gap-1">{its.map(i => <span key={i.id} className="rounded bg-red-400/10 px-1.5 py-0.5 font-mono text-[11px] text-red-300">{i.id}</span>)}</span></span>
        <ChevronDown size={18} className={cx('mt-1 shrink-0 text-mute transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="space-y-3 border-t border-line px-4 py-4">
        <div className="grid gap-2 md:grid-cols-2">{its.map(i => (
          <div key={i.id} className="rounded border border-line bg-panel2/60 p-2.5 text-[12.5px]">
            <div className="font-medium"><span className="mr-1.5 font-mono text-xs text-cyan-300">{i.id}</span>{i.name}</div>
            <div className="mt-1 grid gap-2 sm:grid-cols-2"><div><div className="text-[10px] uppercase tracking-wide text-dim">Observed</div><div className="text-red-100">{i.observed}</div></div><div><div className="text-[10px] uppercase tracking-wide text-dim">Expected</div><div className="text-mute">{i.expected}</div></div></div>
          </div>))}</div>
        <div className="text-xs font-medium uppercase tracking-wide text-dim">Proof</div>
        {t.proof(e)}
      </div>}
    </div>);
}

function Cleared({ e }: { e: PortfolioEntry }) {
  const [reason, setReason] = useState<PassportReason>('festival');
  const benign = e.result.evidence.filter(x => x.status === 'BENIGN' && x.fakeDifficulty >= 0.6).sort((a, b) => b.fakeDifficulty - a.fakeDifficulty).slice(0, 6);
  const alarm = e.result.evidence.find(x => x.id === 'H1' && x.status === 'ILLICIT');
  const pp = checkPassport(e.result, reason);
  return (
    <div className="space-y-4">
      {alarm && <div className="rounded-lg border border-amber-400/40 bg-panel p-4">
        <div className="font-semibold text-amber-200">The volume alarm fired, and was explained</div>
        <p className="mt-1 text-sm text-mute">{alarm.observed}. Only one evidence family points that way, so no case opens. The merchant gets a Context Passport request instead of a restriction.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2"><ChartBox title="Weekly collections vs baselines"><BaselineChart rows={e.result.l2.rows} height={220} /></ChartBox>
          <ChartBox title="Context Passport: the merchant says…">
            <div className="flex flex-wrap gap-1.5">{PASSPORT_REASONS.map(r => <button key={r.id} onClick={() => setReason(r.id)} className={cx('rounded border px-2 py-1 text-xs', reason === r.id ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200' : 'border-line2 text-mute hover:text-ink')}>{r.label}</button>)}</div>
            <div className={cx('mt-3 text-sm', pp.explained ? 'text-emerald-300' : 'text-red-300')}>{pp.explained ? 'Explained. Request: ' + pp.reason.evidence : `Not explained: ${pp.open.map(x => x.id).join(', ')} remain.`}</div>
          </ChartBox></div>
      </div>}
      <div className="rounded-lg border border-emerald-400/30 bg-panel p-4">
        <div className="font-semibold text-emerald-200">Why it behaves like the business it declared ({e.scenario.profile.category})</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{benign.map(x => <div key={x.id} className="rounded border border-line bg-panel2/60 p-2.5 text-[12.5px]"><div className="font-medium"><span className="mr-1.5 font-mono text-xs text-cyan-300">{x.id}</span>{x.name}</div><div className="mt-0.5 text-emerald-100">{x.observed}</div><div className="text-[11px] text-dim">Hard to fake: {pct(x.fakeDifficulty)}</div></div>)}</div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2"><ChartBox title="Ticket sizes"><TicketHistogram sales={sales(e)} profile={e.scenario.profile} height={200} /></ChartBox><ChartBox title="Payer states"><StateBars sales={sales(e)} local={e.scenario.profile.localStates} height={200} /></ChartBox></div>
      </div>
    </div>);
}

export function CasePage() {
  const { key = '' } = useParams();
  const { get, loading } = usePortfolio();
  const { run, loadCustom } = useInvestigation();
  const nav = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const e = get(key);
  if (!e) return <div className="py-16 text-center text-mute">{loading ? 'Loading merchant…' : <>Merchant not found. <Link to="/demo/portfolio" className="text-cyan-300">Back to the portfolio</Link></>}</div>;

  const p = e.scenario.profile, f = e.result.fusion, v = verdictOf(e);
  const reasons = THEMES.filter(t => items(e, t.ids).some(i => i.flagged));
  const level = RESPONSE_LEVELS.find(l => l.id === e.result.review.recommended)!;
  const plan = planResponse(e.result, NO_USER);
  const sl = e.result.events.filter(x => x.type === 'SALE');
  const open7 = () => { if (e.builtInId) run(e.builtInId); else loadCustom(e.scenario, true); nav('/demo/investigations'); };

  return (
    <>
      <Link to="/demo/portfolio" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"><ArrowLeft size={15} />Portfolio</Link>

      <div className={cx('rounded-lg border p-5', e.suspicious ? 'border-red-400/50 bg-red-400/[0.05]' : 'border-emerald-400/50 bg-emerald-400/[0.05]')}>
        <div className="flex flex-wrap items-start gap-4">
          {e.suspicious ? <ShieldAlert className="text-red-300" size={36} /> : <ShieldCheck className="text-emerald-300" size={36} />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1><Badge tone={v.tone}>{v.label}{e.suspicious ? ` · ${f.priority} priority` : ''}</Badge></div>
            <div className="mt-0.5 text-sm text-mute">{p.city} · {p.category} (MCC {p.mcc}) · account {p.accountAgeDays.toLocaleString('en-IN')} days old · <span className="font-mono">{p.id}</span></div>
            <p className="mt-3 max-w-3xl text-[15px]">{e.suspicious ? `Under suspicion for ${v.reason.toLowerCase()}. ${reasons.length} independent reasons below, each with its proof.` : `Cleared. ${v.reason}.`}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div><div className="text-xs text-mute">Sales analysed</div><div className="font-medium tabular-nums">{sl.length} · {inrK(sl.reduce((a, x) => a + x.amount, 0))}</div></div>
              <div><div className="text-xs text-mute">Evidence families</div><div className="font-medium">{f.independentFamilies.length ? f.independentFamilies.join(', ') : 'none'} </div></div>
              <div><div className="text-xs text-mute">Flags</div><div className="font-medium tabular-nums">{e.coreFlags} core · {e.patternFlags} pattern</div></div>
              <div><div className="text-xs text-mute">Recommended response</div><div className="font-medium">{level.id} · {level.name}</div></div>
              <div><div className="text-xs text-mute">Trust ladder</div><div className="font-medium">{LADDER.find(l => l.id === e.pack.ladder)!.name}</div></div>
            </div>
          </div>
        </div>
        {e.suspicious && <div className="mt-4 rounded border border-line bg-bg/40 px-3 py-2.5 text-sm"><span className="text-mute">Proposed action: </span>{plan.actions[0]}{plan.keepsRunning.length > 0 && <span className="text-emerald-300"> · keeps running: {plan.keepsRunning.join(', ')}</span>}</div>}
        <div className="mt-4 flex flex-wrap gap-2"><Btn variant="primary" onClick={open7}>Investigate in the 7-layer console <ArrowRight size={14} /></Btn></div>
      </div>

      {e.suspicious ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Why this merchant is under suspicion</h2>
          {reasons.map((t, i) => <Reason key={t.id} t={t} e={e} n={i + 1} defaultOpen={i < 2} />)}
        </section>
      ) : (
        <section className="space-y-3"><h2 className="text-lg font-semibold">Why this merchant was cleared</h2><Cleared e={e} /></section>
      )}

      <section className="space-y-3">
        <button onClick={() => setShowAll(s => !s)} className="flex items-center gap-2 text-lg font-semibold">All {e.result.evidence.length + e.pack.results.length} patterns checked <ChevronDown size={18} className={cx('text-mute transition-transform', showAll && 'rotate-180')} /></button>
        {showAll ? <PatternBoard res={e.result} /> : <p className="text-sm text-mute">Core detectors, solution patterns S1–S7 and betting patterns N1–N3, each marked Flagged, Clear, Unknown or Needs input. Click to expand.</p>}
      </section>
    </>
  );
}
