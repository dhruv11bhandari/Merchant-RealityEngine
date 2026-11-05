/**
 * Pattern pack: the seven solution patterns (S1–S7) and two newer betting patterns (N1–N2),
 * computed from the same scenario data the core detectors use. They are shown on the
 * Pattern board next to the 21 core detectors.
 *
 * These checks are transparent heuristics. They do not change the core fusion verdict
 * (L4); they add their own flags, and the trust ladder (S5) combines both.
 * Category prototypes in S1 are illustrative values, not a trained model.
 */
import type { InvestigationResult } from '../types/investigation';
import type { PaymentEvent } from '../types/payment';
import type { Label } from '../types/merchant';
import { istDayKey, istHour, inrK } from '../utils/format';

export type PatternStatus = 'FLAGGED' | 'CLEAR' | 'UNKNOWN' | 'INPUT';
export interface PatternResult {
  id: string; name: string; group: 'Solution pattern' | 'New pattern';
  status: PatternStatus; observed: string; expected: string; why: string; data: string;
  detail?: { label: string; value: string }[];
}

const H = 3600000;
const pc = (x: number) => `${Math.round(x * 100)}%`;

/* ---------- behaviour features ---------- */
export interface Features { median: number; round: number; outState: number; night: number; repeat: number; refund: number; payers: number; sales: number }
export function features(sales: PaymentEvent[], refunds: number, local: string[]): Features {
  const n = sales.length || 1;
  const am = sales.map(e => e.amount).sort((a, b) => a - b);
  const perDay = new Map<string, number>();
  sales.forEach(e => { const k = e.payerHash + istDayKey(e.eventTime); perDay.set(k, (perDay.get(k) ?? 0) + 1); });
  return {
    median: am[am.length >> 1] ?? 0,
    round: sales.filter(e => e.amount > 0 && e.amount % 500 === 0).length / n,
    outState: sales.filter(e => !local.includes(e.payerState)).length / n,
    night: sales.filter(e => { const h = istHour(e.eventTime); return h >= 23 || h < 6; }).length / n,
    repeat: sales.filter(e => (perDay.get(e.payerHash + istDayKey(e.eventTime)) ?? 0) >= 3).length / n,
    refund: refunds / n,
    payers: new Set(sales.map(e => e.payerHash)).size,
    sales: sales.length,
  };
}

/** Payers who made 3+ rising payments within 2 hours (betting top-ups after losses). */
export function chasingSequences(sales: PaymentEvent[]) {
  const byPayer = new Map<string, PaymentEvent[]>();
  sales.forEach(e => { if (!byPayer.has(e.payerHash)) byPayer.set(e.payerHash, []); byPayer.get(e.payerHash)!.push(e); });
  const out: { payer: string; state: string; events: PaymentEvent[]; windows: number }[] = [];
  byPayer.forEach((list, payer) => {
    let windows = 0; const hit = new Set<PaymentEvent>();
    for (let i = 0; i + 2 < list.length; i++) {
      const a = list[i], b = list[i + 1], c = list[i + 2];
      if (c.eventTime - a.eventTime <= 2 * H && b.amount >= a.amount && c.amount >= b.amount && c.amount > a.amount) { windows++; [a, b, c].forEach(x => hit.add(x)); }
    }
    if (windows) out.push({ payer, state: list[0].payerState, events: [...hit].sort((x, y) => x.eventTime - y.eventTime), windows });
  });
  return out;
}

/* ---------- S1 category model ---------- */
type Proto = { id: string; name: string; f: Omit<Features, 'payers' | 'sales'> };
export const CATEGORY_PROTOTYPES: Proto[] = [
  { id: 'food', name: 'Food & bakery (local)', f: { median: 600, round: 0.05, outState: 0.05, night: 0.02, repeat: 0.04, refund: 0.02 } },
  { id: 'retail', name: 'Local retail shop', f: { median: 750, round: 0.15, outState: 0.06, night: 0.01, repeat: 0.03, refund: 0.02 } },
  { id: 'online', name: 'Online goods store', f: { median: 2500, round: 0.05, outState: 0.8, night: 0.04, repeat: 0.01, refund: 0.03 } },
  { id: 'betting', name: 'Betting / gaming wallet top-ups', f: { median: 1000, round: 0.6, outState: 0.5, night: 0.12, repeat: 0.12, refund: 0.06 } },
  { id: 'resale', name: 'Gift-card / voucher resale', f: { median: 2000, round: 0.85, outState: 0.8, night: 0.05, repeat: 0.04, refund: 0.04 } },
];
function declaredProto(mcc: string, catchment: string) {
  if (['5462', '5812', '5814', '5441', '5499'].includes(mcc)) return 'food';
  return catchment === 'NATIONAL' ? 'online' : 'retail';
}
export function classify(f: Features) {
  const d = CATEGORY_PROTOTYPES.map(p => {
    const dm = (Math.log10(Math.max(f.median, 1)) - Math.log10(p.f.median)) / 0.5;
    const v = [dm, (f.round - p.f.round) * 2, (f.outState - p.f.outState) * 1.5, (f.night - p.f.night) * 2, (f.repeat - p.f.repeat) * 2, (f.refund - p.f.refund) * 3];
    return { p, d: Math.sqrt(v.reduce((s, x) => s + x * x, 0)) };
  });
  const w = d.map(x => Math.exp(-x.d / 0.25)), z = w.reduce((a, b) => a + b, 0);
  return d.map((x, i) => ({ id: x.p.id, name: x.p.name, prob: w[i] / z })).sort((a, b) => b.prob - a.prob);
}

/* ---------- context passport (S4) ---------- */
export const PASSPORT_REASONS = [
  { id: 'festival', label: 'Festival or seasonal rush', explains: ['H1'], evidence: 'Last year’s festival sales, GST filing for the period' },
  { id: 'bulk', label: 'Bulk / catering order', explains: ['H1', 'A1'], evidence: 'Customer invoice and purchase order' },
  { id: 'branch', label: 'Opened a new branch', explains: ['H1', 'B6'], evidence: 'Shop licence or rent agreement for the new outlet' },
  { id: 'delivery', label: 'Started online delivery (Swiggy/Zomato/own site)', explains: ['H1', 'B6', 'C2'], evidence: 'Marketplace listing and order exports' },
  { id: 'product', label: 'New product line', explains: ['H1', 'A1'], evidence: 'Updated menu or catalogue, supplier bills' },
] as const;
export type PassportReason = (typeof PASSPORT_REASONS)[number]['id'];
const CHECKABLE = ['H1', 'A1', 'A4', 'B6', 'C2', 'C5', 'D7', 'D9', 'F5', 'G6', 'I2'];
export function checkPassport(res: InvestigationResult, reason: PassportReason) {
  const r = PASSPORT_REASONS.find(x => x.id === reason)!;
  const flagged = res.evidence.filter(e => e.status === 'ILLICIT' && CHECKABLE.includes(e.id));
  const covered = flagged.filter(e => (r.explains as readonly string[]).includes(e.id));
  const open = flagged.filter(e => !(r.explains as readonly string[]).includes(e.id));
  return { reason: r, flagged, covered, open, explained: open.length === 0 };
}

/* ---------- S5 trust ladder ---------- */
export const LADDER = [
  { id: 'LOW', name: 'Low', action: 'Watch silently; refresh the profile if volume changed' },
  { id: 'MEDIUM', name: 'Medium', action: 'Context Passport request: ask the merchant to explain the change' },
  { id: 'HIGH', name: 'High', action: 'Delayed settlement or rolling reserve; transaction caps on the suspect flow' },
  { id: 'VERY_HIGH', name: 'Very high', action: 'Analyst review and a controlled test transaction' },
  { id: 'CONFIRMED', name: 'Confirmed', action: 'Suspend the flow, report to FIU-IND, appeal path stays open' },
] as const;
export type LadderLevel = (typeof LADDER)[number]['id'];

export interface PatternPack { results: PatternResult[]; ladder: LadderLevel; ladderWhy: string; features: Features; categories: ReturnType<typeof classify>; declared: string }

export function runPatternPack(res: InvestigationResult, label: Label | null = null): PatternPack {
  const sc = res.scenario, p = sc.profile;
  const own = res.events, sales = own.filter(e => e.type === 'SALE');
  const f = features(sales, own.filter(e => e.type === 'REFUND').length, p.localStates);
  const out: PatternResult[] = [];
  const g = (id: string) => res.evidence.find(e => e.id === id);

  // S1 — category mismatch
  const cats = classify(f), top = cats[0], declared = declaredProto(p.mcc, p.catchment);
  const declName = CATEGORY_PROTOTYPES.find(c => c.id === declared)!.name;
  const mismatch = top.id !== declared && top.prob >= 0.55;
  out.push({ id: 'S1', name: 'Does this still look like the declared business?', group: 'Solution pattern',
    status: sales.length < 20 ? 'UNKNOWN' : mismatch ? 'FLAGGED' : 'CLEAR',
    observed: `Payments look like: ${top.name} (${pc(top.prob)} confidence)`, expected: `Declared: ${declName} (MCC ${p.mcc})`,
    why: 'Infers the business type from transactions alone (ticket size, round amounts, payer spread, night share, repeat payers, refunds) and compares it with the declared category.',
    data: 'Payment ledger', detail: cats.slice(0, 3).map(c => ({ label: c.name, value: pc(c.prob) })) });

  // S2 — peer-cohort drift (self + peer)
  const last = [...res.l2.rows].reverse().find(r => r.actual !== null);
  const self = last?.rAnchored ?? 0, selfHigh = self >= 0.5;
  const activePeers = sc.peers.filter(q => q.status === 'ACTIVE');
  const peerSales = sc.events.filter(e => e.type === 'SALE' && activePeers.some(q => q.id === e.merchantId));
  const ref = peerSales.length >= 20
    ? { ...features(peerSales, 0, p.localStates), src: `${activePeers.length} active peer(s) in the same category` }
    : { round: p.expectedRoundShare, outState: p.catchment === 'LOCAL' ? 0.05 : 0.8, src: 'declared profile (no peer data in this file)' };
  const shape = Math.max(Math.abs(f.round - ref.round), Math.abs(f.outState - ref.outState));
  const peerHigh = shape >= 0.25;
  out.push({ id: 'S2', name: 'Peer-cohort drift (self and peers)', group: 'Solution pattern',
    status: selfHigh && peerHigh ? 'FLAGGED' : 'CLEAR',
    observed: `Self-drift ${pc(self)} vs own baseline; shape gap ${pc(shape)} vs ${ref.src}`,
    expected: 'Flag only when the merchant changes AND diverges from its cohort',
    why: selfHigh && !peerHigh ? 'Volume moved, but the shape still matches the cohort, so the change is treated as explained (e.g. a festival).' : 'Compares the merchant with its own history and with similar merchants at the same time.',
    data: activePeers.length ? 'Payment ledger + peer merchants' : 'Payment ledger + declared profile',
    detail: [{ label: 'Round-amount share', value: `${pc(f.round)} vs ${pc(ref.round)}` }, { label: 'Out-of-state payers', value: `${pc(f.outState)} vs ${pc(ref.outState)}` }] });

  // S3 — payer network
  const mine = new Set(sales.map(e => e.payerHash));
  const others = [...new Set(sc.events.filter(e => e.merchantId !== p.id && e.type === 'SALE').map(e => e.merchantId))];
  const overlaps = others.map(id => { const ps = new Set(sc.events.filter(e => e.merchantId === id && e.type === 'SALE').map(e => e.payerHash)); return { id, n: [...mine].filter(h => ps.has(h)).length }; }).filter(x => x.n > 0);
  const myLinks = new Set(sales.map(e => e.linkId).filter(Boolean));
  const extHosts = sc.web.embeds.filter(e => e.merchantId === p.id && !p.declaredDomains.includes(e.host)).map(e => e.host);
  const sharedHost = sc.web.embeds.filter(e => e.merchantId !== p.id && extHosts.includes(e.host));
  const myBen = new Set(own.filter(e => e.type === 'SETTLEMENT').map(e => e.beneficiaryHash));
  const sharedBen = sc.events.some(e => e.merchantId !== p.id && e.type === 'SETTLEMENT' && myBen.has(e.beneficiaryHash));
  const bigOverlap = overlaps.filter(o => o.n >= 10);
  const netFlag = bigOverlap.length > 0 || sharedHost.length > 0 || sharedBen;
  out.push({ id: 'S3', name: 'Payer-network links to other merchants', group: 'Solution pattern',
    status: others.length === 0 && sc.web.embeds.length === 0 ? 'UNKNOWN' : netFlag ? 'FLAGGED' : 'CLEAR',
    observed: [bigOverlap.length ? `${bigOverlap.map(o => o.n).join(', ')} shared payers with ${bigOverlap.length} merchant(s)` : null, sharedHost.length ? `same betting/third-party page as ${new Set(sharedHost.map(e => e.merchantId)).size} other merchant(s)` : null, sharedBen ? 'settles to an account another merchant also uses' : null].filter(Boolean).join('; ') || `No shared payers, pages or accounts across ${others.length} other merchant(s)`,
    expected: 'An independent business shares no payer ring, page or settlement account with others',
    why: 'Fraud runs in networks: one flagged merchant exposes the others that share its payers, pages or accounts.',
    data: 'Payment ledger across merchants + crawl + settlements', detail: [{ label: 'Merchants compared', value: String(others.length) }, { label: 'Links checked', value: String(myLinks.size) }] });

  // S4 — context passport
  const flagged = res.evidence.filter(e => e.status === 'ILLICIT' && CHECKABLE.includes(e.id));
  out.push({ id: 'S4', name: 'Context Passport (merchant explanation)', group: 'Solution pattern',
    status: flagged.length ? 'INPUT' : 'CLEAR',
    observed: flagged.length ? `${flagged.length} signal(s) need an explanation: ${flagged.map(e => e.id).join(', ')}` : 'Nothing to explain',
    expected: 'A genuine reason should explain every flagged signal, not just the volume',
    why: 'Before any restriction, the merchant is asked why the pattern changed, and the system checks which signals that reason can and cannot explain.',
    data: 'Merchant response + detector results' });

  // S6 — business reality
  const days = sales.length ? (Math.max(...own.map(e => e.eventTime)) - Math.min(...own.map(e => e.eventTime))) / (24 * H) : 0;
  const monthlyIn = days > 0 ? sales.reduce((s, e) => s + e.amount, 0) * (30 / Math.max(days, 7)) : 0;
  const fp = sc.footprint;
  if (fp) {
    const supplierShare = fp.supplierPaymentsMonthly / Math.max(monthlyIn, 1), gstRatio = monthlyIn / Math.max(fp.gstTurnoverMonthly, 1);
    const bad = supplierShare < 0.15 || gstRatio > 1.5;
    out.push({ id: 'S6', name: 'Business-reality cross-check', group: 'Solution pattern', status: bad ? 'FLAGGED' : 'CLEAR',
      observed: `Collections ≈${inrK(monthlyIn)}/month; supplier spend ${pc(supplierShare)} of that; ${gstRatio.toFixed(1)}× the GST-declared turnover`,
      expected: 'A real bakery spends roughly 25–60% of sales on inputs and collects close to what it declares for GST',
      why: 'Faking a business’s outgoings (flour, packaging, rent) costs real money, so a missing footprint is hard to hide.',
      data: 'Supplier payments + GST turnover feed (synthetic)', detail: [{ label: 'Supplier payments / month', value: inrK(fp.supplierPaymentsMonthly) }, { label: 'GST turnover / month', value: inrK(fp.gstTurnoverMonthly) }] });
  } else out.push({ id: 'S6', name: 'Business-reality cross-check', group: 'Solution pattern', status: 'UNKNOWN', observed: 'No supplier-payment or GST feed in this dataset', expected: 'Needs a businessFootprint feed', why: 'Missing data is shown as UNKNOWN, never as clean.', data: 'Not available' });

  // S7 — outside-in
  const gamb = sc.web.embeds.filter(e => e.merchantId === p.id && (e.category === 'gambling' || e.category === 'resale'));
  const myRefs = new Set([...myLinks].map(String));
  const sight = (sc.sightings ?? []).filter(s => myRefs.has(s.paymentRef) || s.paymentRef === p.id);
  const known = sc.web.embeds.length > 0 || (sc.sightings ?? []).length > 0;
  out.push({ id: 'S7', name: 'Outside-in: payment IDs advertised elsewhere', group: 'Solution pattern',
    status: !known ? 'UNKNOWN' : gamb.length || sight.length ? 'FLAGGED' : 'CLEAR',
    observed: [...gamb.map(e => `${e.linkId} on ${e.host}${e.path} (${e.category})`), ...sight.map(s => `${s.paymentRef} seen on ${s.source}: ${s.place}`)].join('; ') || 'No merchant payment IDs found on betting, resale or promo pages',
    expected: 'Payment links appear only on the merchant’s declared channels',
    why: 'Looks from the outside in: where are people being told to pay this merchant?',
    data: 'Website crawl + promo-channel sightings', detail: sight.map(s => ({ label: `${s.source} · ${s.seenAt}`, value: s.note ?? s.place })) });

  // N1 — loss-chasing sequences
  const seqs = chasingSequences(sales), chainPayers = seqs.length, chains = seqs.reduce((s, x) => s + x.windows, 0);
  out.push({ id: 'N1', name: 'Loss-chasing sequences', group: 'New pattern',
    status: chainPayers >= 3 ? 'FLAGGED' : 'CLEAR',
    observed: chainPayers ? `${chainPayers} payer(s) made 3+ rising payments within 2 hours (${chains} sequences)` : 'No rising repeat-payment sequences',
    expected: 'Shop customers rarely pay 3 times in 2 hours with growing amounts',
    why: 'Bettors who lose top up again, often with bigger amounts. Shop customers do not.',
    data: 'Payment ledger' });

  // N2 — late-night collections
  out.push({ id: 'N2', name: 'Late-night collections (23:00–06:00)', group: 'New pattern',
    status: f.night >= 0.1 ? 'FLAGGED' : 'CLEAR',
    observed: `${pc(f.night)} of sales between 23:00 and 06:00`,
    expected: `Declared hours ${p.hours[0]}:00–${p.hours[1]}:00; under 2% at night`,
    why: 'Live betting and casino play peak late at night, long after a bakery has closed.',
    data: 'Payment ledger' });

  // N3 — rapid pass-through (settlement swept out to third parties)
  const st = own.filter(e => e.type === 'SETTLEMENT'), tr = own.filter(e => e.type === 'TRANSFER');
  const fast = tr.filter(t => st.some(s => t.eventTime >= s.eventTime && t.eventTime - s.eventTime <= 24 * H));
  const bens = new Set(tr.map(t => t.beneficiaryHash)).size;
  out.push({ id: 'N3', name: 'Rapid pass-through after settlement', group: 'New pattern',
    status: !st.length ? 'UNKNOWN' : fast.length >= 3 && bens >= 3 ? 'FLAGGED' : 'CLEAR',
    observed: tr.length ? `${fast.length} of ${tr.length} payouts left within 24h of a settlement, to ${bens} accounts` : 'No onward payouts',
    expected: 'Settlements stay with the business or pay known suppliers',
    why: 'Collection fronts sweep money out quickly so it cannot be held.',
    data: 'Settlement + payout ledgers' });

  // S5 — trust ladder (combines core verdict and pattern flags)
  const nFlags = out.filter(r => r.status === 'FLAGGED').length;
  const fu = res.fusion;
  const ladder: LadderLevel = label === 'CONFIRMED_ILLICIT' ? 'CONFIRMED'
    : fu.decision === 'OPEN_CASE' && fu.priority === 'HIGH' ? 'VERY_HIGH'
    : fu.decision === 'OPEN_CASE' ? 'HIGH'
    : nFlags >= 2 || g('H1')?.status === 'ILLICIT' ? 'MEDIUM' : 'LOW';
  const ladderWhy = `Core engine: ${fu.decision === 'OPEN_CASE' ? `case opened (${fu.priority})` : 'no case'}; ${nFlags} pattern flag(s)${label ? `; label ${label}` : ''}.`;
  const lv = LADDER.find(l => l.id === ladder)!;
  out.splice(4, 0, { id: 'S5', name: 'Graduated trust ladder', group: 'Solution pattern', status: ladder === 'LOW' ? 'CLEAR' : ladder === 'MEDIUM' ? 'INPUT' : 'FLAGGED',
    observed: `Level: ${lv.name}. ${lv.action}`, expected: 'Proportionate, reversible steps: money is held, not seized', why: ladderWhy, data: 'Core verdict + pattern flags' });

  return { results: out, ladder, ladderWhy, features: f, categories: cats, declared: declName };
}
