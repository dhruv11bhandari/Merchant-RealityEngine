/**
 * L3 detector library. Each detector is a small, transparent function of the event store, profile and coverage.
 * The prototype implements 21 of the 112 designed patterns; the rest are catalogued in data/evidence.ts.
 */
import type { MerchantProfile, Scenario, CoverageKey } from '../types/merchant';
import type { PaymentEvent } from '../types/payment';
import type { EvidenceItem, EvidenceStatus, Family, Mechanism } from '../types/evidence';
import type { CohortMatch, CusumPoint, WeeklyRow } from '../types/investigation';
import { clamp, istMinuteOfDay, istDayKey, istHour, pct, inr } from '../utils/format';

export interface Ctx {
  sc: Scenario; p: MerchantProfile; all: PaymentEvent[];
  sales: PaymentEvent[]; refunds: PaymentEvent[]; settlements: PaymentEvent[]; transfers: PaymentEvent[];
  rows: WeeklyRow[]; cusum: CusumPoint[]; cohort: CohortMatch[];
}
interface Out { status: EvidenceStatus; strength: number; observed: string; expected: string; explanation: string; metrics?: Record<string, string | number>; records?: string[] }
interface Def {
  id: string; name: string; family: Family; lineage: string; system: string; reliability: number; fakeDifficulty: number;
  affinity: [number, number, number, number]; requires: CoverageKey[]; run: (c: Ctx) => Out;
}
const o = (status: EvidenceStatus, strength: number, observed: string, expected: string, explanation: string, metrics: Record<string, string | number> = {}, records: string[] = []): Out =>
  ({ status, strength: clamp(strength), observed, expected, explanation, metrics, records: records.slice(0, 40) });
const unk = (why: string, expected = '—'): Out => o('UNKNOWN', 0, 'Not assessable', expected, why);
const isRound = (a: number) => a >= 500 && a % 500 === 0;
const ids = (xs: PaymentEvent[]) => xs.map(e => e.id);

const PRE_MATCH_MIN = 45;
function matchWindows(c: Ctx) {
  const fx = c.sc.fixtures;
  const fixDays = new Set(fx.map(istDayKey));
  const wins = fx.map(f => [istMinuteOfDay(f) - PRE_MATCH_MIN, istMinuteOfDay(f)] as const);
  const inWin = (m: number) => wins.some(([a, b]) => m >= a && m < b);
  return { fixDays, inWin };
}
const offHours = (c: Ctx, e: PaymentEvent) => { const h = istHour(e.eventTime); return h < c.p.hours[0] || h >= c.p.hours[1]; };

export const DETECTORS: Def[] = [
  { id: 'A1', name: 'Ticket outside expected band', family: 'A', lineage: 'acq.ticket', system: 'acquirer', reliability: 0.8, fakeDifficulty: 0.2, affinity: [0.1, 0.4, 0.2, 0.1], requires: ['acquiring'],
    run: c => {
      const out = c.sales.filter(e => e.amount > c.p.ticketMax || e.amount < c.p.ticketMin), sh = out.length / c.sales.length;
      const exp = `≥ 95% of tickets within ${inr(c.p.ticketMin)}–${inr(c.p.ticketMax)}`;
      if (sh >= 0.12) return o('ILLICIT', sh * 2.2, `${pct(sh)} of tickets outside band (${out.length} of ${c.sales.length})`, exp, 'A material share of payments sit outside the merchant’s declared ticket band.', { outsideBand: out.length, share: pct(sh, 1) }, ids(out));
      if (sh <= 0.04) return o('BENIGN', 0.5, `${pct(sh)} outside band`, exp, 'Tickets stay inside the declared band.', { share: pct(sh, 1) });
      return o('UNKNOWN', 0, `${pct(sh)} outside band`, exp, 'Between thresholds; neither supports nor contradicts the profile.');
    } },
  { id: 'A4', name: 'Round-number heaping', family: 'A', lineage: 'acq.ticket', system: 'acquirer', reliability: 0.85, fakeDifficulty: 0.3, affinity: [0.1, 0.4, 0.2, 0.2], requires: ['acquiring'],
    run: c => {
      const r = c.sales.filter(e => isRound(e.amount)), sh = r.length / c.sales.length, ex = c.p.expectedRoundShare, lift = sh / Math.max(ex, 0.01);
      const exp = `about ${pct(ex)} of tickets at round ₹500 multiples`;
      if (sh >= 0.2 && lift >= 2.5) return o('ILLICIT', (sh - ex) * 1.8, `${pct(sh)} of tickets at ₹500 multiples (${lift.toFixed(1)}× expected)`, exp, 'Real baskets rarely land on round values this often. Heaping suggests amounts chosen by a payer rather than built from products.', { roundSales: r.length, share: pct(sh, 1), lift: lift.toFixed(1) + '×' }, ids(r));
      if (lift <= 1.6) return o('BENIGN', 0.5, `${pct(sh)} at ₹500 multiples (${lift.toFixed(1)}×)`, exp, 'Round-number share is in line with the profile.', { share: pct(sh, 1), lift: lift.toFixed(1) + '×' });
      return o('UNKNOWN', 0, `${pct(sh)} round (${lift.toFixed(1)}×)`, exp, 'Elevated but not conclusive.');
    } },
  { id: 'B6', name: 'Geographic catchment mismatch', family: 'B', lineage: 'acq.payer', system: 'acquirer', reliability: 0.8, fakeDifficulty: 0.6, affinity: [0.1, 0.4, 0.2, 0.1], requires: ['acquiring'],
    run: c => {
      if (c.p.catchment === 'NATIONAL') return o('BENIGN', 0.3, 'Payers spread across many states', 'National catchment declared', 'Wide geography matches the declared national e-commerce model.', {}, []);
      const non = c.sales.filter(e => !c.p.localStates.includes(e.payerState)), sh = non.length / c.sales.length, st = new Set(non.map(e => e.payerState));
      const exp = `payers mainly from ${c.p.localStates.join(', ')}`;
      if (sh >= 0.2 && st.size >= 4) return o('ILLICIT', sh * 1.5, `${pct(sh)} of payers from ${st.size} non-local states`, exp, 'A neighbourhood business is receiving payments from far outside its service area.', { nonLocal: non.length, states: st.size }, ids(non));
      if (sh <= 0.08) return o('BENIGN', 0.6, `${pct(sh)} outside ${c.p.localStates.join(', ')}`, exp, 'Customers come from the expected service area.', { nonLocal: non.length });
      return o('UNKNOWN', 0, `${pct(sh)} outside local area`, exp, 'Elevated but within plausible variation.');
    } },
  { id: 'B9', name: 'Independent purchaser verification', family: 'B', lineage: 'purchaser.panel', system: 'panel', reliability: 0.9, fakeDifficulty: 0.95, affinity: [0, 0.1, 0.9, 0], requires: ['verification'],
    run: c => {
      const v = c.sc.verification!, r = v.confirmed / v.contacted;
      if (r <= 0.5) return o('ILLICIT', 1 - r, `${v.confirmed} of ${v.contacted} sampled purchasers confirm buying`, '≥ 80% confirm', 'Most independently contacted payers do not recognise the purchase.', { contacted: v.contacted, confirmed: v.confirmed });
      if (r >= 0.8) return o('BENIGN', r, `${v.confirmed} of ${v.contacted} confirm`, '≥ 80% confirm', 'Sampled purchasers independently confirm their orders.', { contacted: v.contacted, confirmed: v.confirmed });
      return unk('Mixed verification result.');
    } },
  { id: 'C2', name: 'Operating-hours conformance', family: 'C', lineage: 'acq.timing', system: 'acquirer', reliability: 0.7, fakeDifficulty: 0.2, affinity: [0.1, 0.2, 0.2, 0.2], requires: ['acquiring'],
    run: c => {
      const off = c.sales.filter(e => offHours(c, e)), sh = off.length / c.sales.length, exp = `inside ${c.p.hours[0]}:00–${c.p.hours[1]}:00`;
      if (sh >= 0.25) return o('ILLICIT', sh, `${pct(sh)} of sales outside declared hours`, exp, 'Material collections arrive when the business is closed.', { offHours: off.length }, ids(off));
      if (sh <= 0.05) return o('BENIGN', 0.4, `${pct(sh)} outside hours`, exp, 'Sales fall inside declared hours. This alone says little, because hours are easy to match.', { offHours: off.length });
      return unk('Some off-hours activity; inconclusive.', exp);
    } },
  { id: 'C5', name: 'Pre-match funding alignment', family: 'C', lineage: 'acq.timing', system: 'acquirer', reliability: 0.8, fakeDifficulty: 0.6, affinity: [0.1, 0.7, 0.1, 0.3], requires: ['calendar'],
    run: c => {
      if (!c.sc.fixtures.length) return unk('No fixtures in the window; alignment cannot be tested.');
      const { fixDays, inWin } = matchWindows(c);
      const F = c.sales.filter(e => fixDays.has(istDayKey(e.eventTime))), C = c.sales.filter(e => !fixDays.has(istDayKey(e.eventTime)));
      const hit = F.filter(e => inWin(istMinuteOfDay(e.eventTime))), ctrl = C.filter(e => inWin(istMinuteOfDay(e.eventTime)));
      const obs = hit.length / Math.max(F.length, 1), base = (ctrl.length + 0.5) / (C.length + 1), lift = obs / base;
      const z = (obs - base) / Math.sqrt((base * (1 - base)) / Math.max(F.length, 1));
      const exp = `same clock window on non-match days: ${pct(base, 1)}`;
      const m = { matchDaySales: F.length, inWindow: hit.length, controlShare: pct(base, 1), lift: lift.toFixed(1) + '×', z: z.toFixed(1) };
      if (lift >= 3 && z >= 3) return o('ILLICIT', Math.log2(lift) / 5, `${pct(obs)} of match-day sales land in the 45 min before start (${lift.toFixed(1)}× control)`, exp, 'Funding clusters just before match starts, compared with the same clock time on days without matches.', m, ids(hit));
      if (lift <= 1.5) return o('BENIGN', 0.5, `${pct(obs)} in window (${lift.toFixed(1)}× control)`, exp, 'No alignment with fixtures beyond normal evening trade.', m);
      return unk('Some alignment, below thresholds.', exp);
    } },
  { id: 'D7', name: 'Refund without original sale', family: 'D', lineage: 'refund.ledger', system: 'acquirer', reliability: 0.85, fakeDifficulty: 0.6, affinity: [0.1, 0.5, 0.3, 0.2], requires: ['acquiring'],
    run: c => {
      if (!c.refunds.length) return unk('No refunds in the window.');
      const sid = new Set(c.sales.map(s => s.id)), orph = c.refunds.filter(r => !r.linkedSaleId || !sid.has(r.linkedSaleId)), sh = orph.length / c.refunds.length;
      const m = { refunds: c.refunds.length, orphan: orph.length, orphanValue: inr(orph.reduce((s, r) => s + r.amount, 0)) };
      if (orph.length >= 3 && sh >= 0.25) return o('ILLICIT', sh * 1.6, `${orph.length} of ${c.refunds.length} refunds have no original sale (${pct(sh)})`, 'Every refund links to a prior sale', 'Money is leaving as refunds with nothing to refund.', m, ids(orph));
      if (!orph.length) return o('BENIGN', 0.5, `All ${c.refunds.length} refunds link to a sale`, 'Every refund links to a prior sale', 'Refunds reconcile to original sales.', m);
      return unk('A few unlinked refunds; below threshold.');
    } },
  { id: 'D9', name: 'Refund to different destination', family: 'D', lineage: 'refund.ledger', system: 'acquirer', reliability: 0.85, fakeDifficulty: 0.6, affinity: [0.2, 0.6, 0.1, 0.3], requires: ['acquiring'],
    run: c => {
      const byId = new Map(c.sales.map(s => [s.id, s])), linked = c.refunds.filter(r => r.linkedSaleId && byId.has(r.linkedSaleId));
      const bad = linked.filter(r => byId.get(r.linkedSaleId!)!.payerHash !== r.destHash), sh = linked.length ? bad.length / linked.length : 0;
      const m = { linkedRefunds: linked.length, differentDestination: bad.length };
      if (bad.length >= 3 && sh >= 0.25) return o('ILLICIT', sh * 1.4, `${bad.length} of ${linked.length} linked refunds paid to a different identifier than the payer`, 'Refund returns to the original payer', 'Refunds are being routed to accounts that never paid.', m, ids(bad));
      if (linked.length >= 2 && !bad.length) return o('BENIGN', 0.5, `All ${linked.length} linked refunds return to the payer`, 'Refund returns to the original payer', 'Refund destinations match original payers.', m);
      return unk('Too few linked refunds to judge destinations.');
    } },
  { id: 'D10', name: 'Payment-to-order reconciliation', family: 'D', lineage: 'orders.feed', system: 'orders', reliability: 0.9, fakeDifficulty: 0.9, affinity: [0, 0.2, 0.8, 0], requires: ['orders'],
    run: c => {
      const m = c.sales.filter(s => s.orderId), sh = m.length / c.sales.length;
      const mt = { sales: c.sales.length, withOrder: m.length };
      if (sh <= 0.6) return o('ILLICIT', (1 - sh) * 1.3, `${pct(sh)} of payments match an order`, '≥ 90% match', 'Many payments have no corresponding order.', mt, ids(c.sales.filter(s => !s.orderId)));
      if (sh >= 0.9) return o('BENIGN', 0.9 * sh, `${pct(sh)} of payments match an order`, '≥ 90% match', 'Payments reconcile to orders in the merchant’s order feed.', mt);
      return unk('Partial order match.');
    } },
  { id: 'E1', name: 'Shared payment-link infrastructure', family: 'E', lineage: 'web.graph', system: 'web', reliability: 0.8, fakeDifficulty: 0.6, affinity: [0.5, 0.6, 0.1, 0.2], requires: ['website'],
    run: c => {
      const mine = c.sc.web.embeds.filter(e => e.merchantId === c.p.id && e.category !== 'own');
      if (!mine.length) return o('BENIGN', 0.25, 'No third-party embeds', 'Links only on declared domains', 'No payment link shared with other parties was found.');
      const peers = new Set(c.sc.web.embeds.filter(e => e.merchantId !== c.p.id && mine.some(m => m.host === e.host)).map(e => e.merchantId));
      if (peers.size) return o('ILLICIT', 0.35 + 0.2 * peers.size, `${peers.size} other merchant(s) have links on ${mine[0].host}`, 'Links on declared domains only', 'Unrelated merchants’ payment links sit on the same third-party page. This is a lead, not proof of common ownership.', { peers: peers.size, host: mine[0].host }, mine.map(m => m.id));
      return unk('Third-party embed found but not shared with other merchants.');
    } },
  { id: 'E3', name: 'Cohort continuity', family: 'E', lineage: 'cohort.continuity', system: 'acquirer', reliability: 0.75, fakeDifficulty: 0.5, affinity: [0.9, 0.1, 0, 0.1], requires: ['acquiring'],
    run: c => {
      if (!c.cohort.length) return unk('No cohort peers monitored for this merchant.');
      const b = c.cohort[0], m = { best: b.name, score: b.score.toFixed(2), payerOverlap: pct(b.jaccard), ticketSim: b.ticketSim.toFixed(2), timingSim: b.timingSim.toFixed(2), handoff: b.handoff ? 'yes' : 'no' };
      if (b.score >= 0.55 && b.handoff) return o('ILLICIT', b.score, `Continuity ${b.score.toFixed(2)} with ${b.name}`, 'Continuity below 0.40 against all peers', 'Payers, ticket shape and timing carry over from a dormant peer to this account.', m);
      if (b.score < 0.4) return o('BENIGN', 0.3, `Best peer continuity ${b.score.toFixed(2)}`, 'Continuity below 0.40', 'No peer’s behaviour carries over into this merchant.', m);
      return unk('Moderate similarity without a lifecycle handoff.');
    } },
  { id: 'F2', name: 'Account lifecycle handoff', family: 'F', lineage: 'acct.lifecycle', system: 'acquirer', reliability: 0.7, fakeDifficulty: 0.5, affinity: [0.8, 0.1, 0.1, 0.1], requires: ['acquiring'],
    run: c => {
      const h = c.cohort.find(x => x.handoff);
      if (c.p.accountAgeDays < 45 && h) return o('ILLICIT', 0.75, `Account ${c.p.accountAgeDays} days old; started ${h.gapDays!.toFixed(1)} days after ${h.name} went dormant`, 'Independent onboarding', 'A new account opens as a similar one stops.', { ageDays: c.p.accountAgeDays, gapDays: h.gapDays!.toFixed(1) });
      if (c.p.accountAgeDays >= 365) return o('BENIGN', 0.3, `Account ${c.p.accountAgeDays} days old, continuously active`, 'Established history', 'A long, continuous history is consistent with an ordinary business.', { ageDays: c.p.accountAgeDays });
      return unk('Recent account without a clear handoff.');
    } },
  { id: 'F5', name: 'Settlement-beneficiary changes', family: 'F', lineage: 'settle.ledger', system: 'settlement', reliability: 0.8, fakeDifficulty: 0.7, affinity: [0.7, 0.3, 0.1, 0.3], requires: ['acquiring'],
    run: c => {
      const s = [...c.settlements].sort((a, b) => a.eventTime - b.eventTime);
      if (s.length < 3) return unk('Too few settlements to judge.');
      let ch = 0, at: PaymentEvent | undefined;
      s.forEach((x, i) => { if (i && x.beneficiaryHash !== s[i - 1].beneficiaryHash) { ch++; at = at ?? x; } });
      const peerBen = new Set(c.sc.events.filter(e => e.merchantId !== c.p.id && e.type === 'SETTLEMENT').map(e => e.beneficiaryHash));
      const reuse = s.some(x => peerBen.has(x.beneficiaryHash));
      if (ch >= 1) return o('ILLICIT', 0.45 + 0.2 * ch + (reuse ? 0.15 : 0), `Beneficiary changed ${ch}× in ${s.length} settlements${reuse ? '; one beneficiary also settles another merchant' : ''}`, 'Stable settlement beneficiary', 'Settlement destinations moved during the period of unusual activity.', { changes: ch, settlements: s.length, sharedWithPeer: reuse ? 'yes' : 'no' }, s.map(x => x.id));
      return o('BENIGN', 0.5, `One beneficiary across ${s.length} settlements`, 'Stable settlement beneficiary', 'Settlements go to a single stable account.', { settlements: s.length });
    } },
  { id: 'F7', name: 'Order-to-fulfilment lifecycle', family: 'F', lineage: 'fulfil.feed', system: 'fulfilment', reliability: 0.85, fakeDifficulty: 0.9, affinity: [0, 0.1, 0.9, 0], requires: ['fulfillment'],
    run: c => {
      const od = c.sc.orders; if (!od.length) return unk('No orders to test.');
      const ver = od.filter(x => x.status === 'DELIVERED').length / od.length, trk = od.filter(x => x.trackingId), cnt = new Map<string, number>();
      trk.forEach(x => cnt.set(x.trackingId!, (cnt.get(x.trackingId!) ?? 0) + 1));
      const dup = trk.filter(x => cnt.get(x.trackingId!)! > 1).length / Math.max(od.length, 1);
      const m = { orders: od.length, delivered: pct(ver), reusedTracking: pct(dup) };
      if (ver <= 0.5 || dup >= 0.15) return o('ILLICIT', 1 - ver + dup, `${pct(ver)} of orders verified delivered; ${pct(dup)} share a tracking ID`, '≥ 90% delivered, unique tracking', 'Few orders reach customers, and shipment records are reused across orders.', m);
      if (ver >= 0.9 && dup < 0.02) return o('BENIGN', ver, `${pct(ver)} of orders verified delivered`, '≥ 90% delivered', 'Fulfilment evidence supports the commercial activity.', m);
      return unk('Fulfilment evidence is mixed.');
    } },
  { id: 'F8', name: 'Bank-side reconciliation', family: 'F', lineage: 'bank.feed', system: 'bank', reliability: 0.9, fakeDifficulty: 0.9, affinity: [0.1, 0.4, 0.4, 0.2], requires: ['bank'],
    run: c => {
      const bc = c.sc.bankCredits, m = c.settlements.filter(s => bc.some(b => Math.abs(b.amount - s.amount) <= 1 && b.beneficiaryHash === s.beneficiaryHash)), sh = m.length / Math.max(c.settlements.length, 1);
      if (sh >= 0.95) return o('BENIGN', 0.9, `${pct(sh)} of settlements match a bank credit`, '≥ 95% match', 'Settlements reconcile with bank-side credits.', { settlements: c.settlements.length, matched: m.length });
      if (sh <= 0.6) return o('ILLICIT', 1 - sh, `${pct(sh)} match`, '≥ 95% match', 'Settlements do not reconcile with bank credits.');
      return unk('Partial reconciliation.');
    } },
  { id: 'G2', name: 'Catalogue consistency', family: 'G', lineage: 'catalogue.crawl', system: 'web', reliability: 0.6, fakeDifficulty: 0.25, affinity: [0, 0.1, 0.9, 0.1], requires: ['website'],
    run: c => {
      const cat = c.sc.web.catalogue; if (!cat.length) return unk('No catalogue captured.');
      const off = cat.filter(i => !i.inCategory).length / cat.length, dup = cat.filter(i => i.dupImage).length / cat.length;
      const am = c.sales.filter(s => cat.some(i => Math.abs(i.price - s.amount) <= 1)).length / c.sales.length, inc = 0.4 * off + 0.4 * dup + 0.2 * (1 - am);
      const m = { offCategory: pct(off), duplicatedImages: pct(dup), paymentsAtCataloguePrice: pct(am), inconsistency: inc.toFixed(2) };
      if (inc >= 0.35) return o('ILLICIT', inc * 1.6, `Inconsistency ${inc.toFixed(2)}: ${pct(off)} items off-category, ${pct(dup)} reused images`, 'Inconsistency below 0.15', 'The catalogue does not look like the declared category and reuses imagery from elsewhere.', m);
      if (inc <= 0.15) return o('BENIGN', 0.4, `Inconsistency ${inc.toFixed(2)}`, 'Inconsistency below 0.15', 'Catalogue matches the declared category. Catalogues are cheap to fake, so this carries little weight.', m);
      return unk('Catalogue partly inconsistent.');
    } },
  { id: 'G6', name: 'Payment-link provenance', family: 'G', lineage: 'checkout.crawl', system: 'web', reliability: 0.9, fakeDifficulty: 0.7, affinity: [0.1, 0.9, 0.1, 0.3], requires: ['website'],
    run: c => {
      const mine = c.sc.web.embeds.filter(e => e.merchantId === c.p.id); if (!mine.length) return unk('No embeds captured for this merchant’s links.');
      const ext = mine.filter(e => !c.p.declaredDomains.includes(e.host)), gam = ext.filter(e => e.category === 'gambling');
      const m = { embeds: mine.length, external: ext.length, link: ext[0]?.linkId ?? '—', host: ext[0]?.host ?? '—' };
      if (gam.length) return o('ILLICIT', 0.92, `Link ${gam[0].linkId} embedded on ${gam[0].host}${gam[0].path} (${gam[0].pageType})`, 'Links only on declared domains', 'A merchant payment link appears on an undeclared betting application’s deposit page.', m, gam.map(g => g.id));
      if (ext.length) return o('ILLICIT', 0.5, `Link ${ext[0].linkId} embedded on undeclared ${ext[0].host} (${ext[0].pageType})`, 'Links only on declared domains', 'A payment link is used on a page unrelated to the declared business.', m, ext.map(g => g.id));
      return o('BENIGN', 0.6, `All ${mine.length} link embed(s) on declared domain`, 'Links only on declared domains', 'Checkout provenance matches the declared website.', m, mine.map(g => g.id));
    } },
  { id: 'H1', name: 'Volume drift against seasonal expectation', family: 'H', lineage: 'acq.volume', system: 'acquirer', reliability: 0.7, fakeDifficulty: 0.4, affinity: [0.2, 0.3, 0.3, 0.2], requires: ['acquiring'],
    run: c => {
      const last = [...c.rows].reverse().find(r => r.rSeasonal !== null);
      if (!last) return unk('No weekly history.');
      const alarm = c.cusum.some(x => x.alarm), S = c.cusum[c.cusum.length - 1].s, rr = last.rSeasonal!;
      const m = { residual: pct(rr, 0), cusum: S.toFixed(2), expected: Math.round(last.seasonal), actual: last.actual! };
      if (alarm) return o('ILLICIT', Math.min(0.5, rr * 0.8), `Volume ${pct(rr)} above seasonal expectation; CUSUM ${S.toFixed(2)} over limit`, 'Residual near 0%; CUSUM under 0.50', 'Growth is beyond even the seasonal expectation. Volume alone is weak evidence; it only matters alongside independent families.', m);
      return o('BENIGN', 0.3, `Volume ${pct(rr)} vs seasonal expectation`, 'Residual near 0%', 'Volume tracks the seasonal expectation.', m);
    } },
  { id: 'H3', name: 'Joint off-profile cluster', family: 'H', lineage: 'acq.joint', system: 'acquirer', reliability: 0.75, fakeDifficulty: 0.5, affinity: [0.4, 0.45, 0.2, 0.3], requires: ['acquiring'],
    run: c => {
      const { fixDays, inWin } = matchWindows(c);
      const traits = (e: PaymentEvent) => [isRound(e.amount),
        c.p.catchment === 'LOCAL' ? !c.p.localStates.includes(e.payerState) : e.amount > c.p.ticketMax || e.amount < c.p.ticketMin,
        offHours(c, e) || (fixDays.has(istDayKey(e.eventTime)) && inWin(istMinuteOfDay(e.eventTime)))].filter(Boolean).length;
      const joint = c.sales.filter(e => traits(e) >= 2), sh = joint.length / c.sales.length, val = joint.reduce((s, e) => s + e.amount, 0);
      const m = { jointSales: joint.length, share: pct(sh, 1), value: inr(val) };
      if (joint.length >= 10 && sh >= 0.2) return o('ILLICIT', sh * 1.4, `${joint.length} sales (${pct(sh)}) combine ≥ 2 off-profile traits`, 'Under 3% of sales combine off-profile traits', 'Round amount, out-of-area payer and odd timing co-occur in the same payments. Each trait alone is weak; together they describe a separate population hidden inside the merchant.', m, ids(joint));
      if (sh <= 0.03) return o('BENIGN', 0.4, `${pct(sh, 1)} of sales combine ≥ 2 off-profile traits`, 'Under 3%', 'Off-profile traits do not cluster.', m);
      return unk('Some clustering; below thresholds.');
    } },
  { id: 'I2', name: 'Onward payout fan-out', family: 'I', lineage: 'payout.ledger', system: 'payouts', reliability: 0.6, fakeDifficulty: 0.5, affinity: [0.1, 0.2, 0.1, 0.8], requires: ['acquiring'],
    run: c => {
      const b = new Set(c.transfers.map(t => t.beneficiaryHash));
      if (!c.transfers.length) return o('BENIGN', 0.25, 'No onward payouts', 'Few or no third-party payouts', 'No onward payouts to third parties.');
      if (b.size >= 4) return o('ILLICIT', 0.3 + b.size * 0.03, `${c.transfers.length} payouts to ${b.size} distinct beneficiaries`, 'Few or no third-party payouts', 'Funds fan out to several third-party beneficiaries, which does not fit a bakery’s cost structure.', { payouts: c.transfers.length, beneficiaries: b.size, value: inr(c.transfers.reduce((s, t) => s + t.amount, 0)) }, ids(c.transfers));
      return unk('Few payouts; inconclusive.');
    } },
];

export function runDetectors(c: Ctx): EvidenceItem[] {
  return DETECTORS.map(d => {
    const miss = d.requires.filter(k => c.sc.coverage[k] === 'MISSING'), part = d.requires.some(k => c.sc.coverage[k] === 'PARTIAL');
    const base = { id: d.id, name: d.name, family: d.family, reliability: part ? d.reliability * 0.7 : d.reliability, fakeDifficulty: d.fakeDifficulty, lineage: d.lineage, system: d.system, requires: d.requires,
      affinity: { ROTATION: d.affinity[0], TRANSACTION_LAUNDERING: d.affinity[1], FABRICATED_SUBSTANCE: d.affinity[2], OTHER_ABUSE: d.affinity[3] } as Record<Mechanism, number> };
    if (miss.length) return { ...base, status: 'UNKNOWN' as const, strength: 0, observed: 'Source not available', expected: '—', explanation: `Required source (${miss.join(', ')}) is missing for this merchant. Missing data is UNKNOWN: it is excluded from risk scoring and is not treated as clean or as suspicious.`, metrics: {}, records: [] };
    const r = d.run(c);
    return { ...base, ...r, metrics: r.metrics ?? {}, records: r.records ?? [] };
  });
}
