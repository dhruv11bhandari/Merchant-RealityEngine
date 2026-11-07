import type { Scenario } from '../types/merchant';
import type { PaymentEvent } from '../types/payment';
import type { CohortMatch } from '../types/investigation';
import { istHour } from '../utils/format';

const BINS = [250, 500, 1000, 2000, 5000, Infinity];
const hist = (xs: number[], f: (x: number) => number, n: number) => { const h = Array(n).fill(0); xs.forEach(x => h[f(x)]++); return h; };
const cosine = (a: number[], b: number[]) => {
  const d = a.reduce((s, x, i) => s + x * b[i], 0), na = Math.hypot(...a), nb = Math.hypot(...b);
  return na && nb ? d / (na * nb) : 0;
};
const sales = (ev: PaymentEvent[], id: string) => ev.filter(e => e.merchantId === id && e.type === 'SALE');

/**
 * Cohort continuity: does a peer's behaviour carry on into the primary merchant?
 * score = .35 payer overlap + .20 ticket shape + .15 timing shape + .20 lifecycle handoff + .10 shared beneficiary.
 * A high score is a lead for investigation. It is NOT proof of common ownership.
 */
export function cohortContinuity(sc: Scenario): CohortMatch[] {
  const P = sales(sc.events, sc.primaryMerchantId);
  if (!P.length) return [];
  const pPayers = new Set(P.map(e => e.payerHash)), pStart = Math.min(...P.map(e => e.eventTime));
  const pBen = new Set(sc.events.filter(e => e.merchantId === sc.primaryMerchantId && e.type === 'SETTLEMENT').map(e => e.beneficiaryHash));
  return sc.peers.map(peer => {
    const Q = sales(sc.events, peer.id);
    if (!Q.length) return null;
    const qPayers = new Set(Q.map(e => e.payerHash));
    const inter = [...pPayers].filter(x => qPayers.has(x)).length, union = new Set([...pPayers, ...qPayers]).size;
    const jaccard = inter / union;
    const ticketSim = cosine(hist(P.map(e => e.amount), x => BINS.findIndex(b => x <= b), 6), hist(Q.map(e => e.amount), x => BINS.findIndex(b => x <= b), 6));
    const timingSim = cosine(hist(P.map(e => istHour(e.eventTime)), x => x, 24), hist(Q.map(e => istHour(e.eventTime)), x => x, 24));
    const qLast = Math.max(...Q.map(e => e.eventTime));
    const gapDays = (pStart - qLast) / 86400000;
    const handoff = gapDays >= 0 && gapDays <= 7 && peer.status === 'DORMANT';
    const beneficiaryMatch = sc.events.some(e => e.merchantId === peer.id && e.type === 'SETTLEMENT' && pBen.has(e.beneficiaryHash));
    const score = 0.35 * Math.min(1, jaccard * 1.5) + 0.2 * ticketSim + 0.15 * timingSim + (handoff ? 0.2 : 0) + (beneficiaryMatch ? 0.1 : 0);
    return { peerId: peer.id, name: peer.name, score, jaccard, ticketSim, timingSim, gapDays: gapDays >= 0 ? gapDays : null, handoff, beneficiaryMatch };
  }).filter((x): x is CohortMatch => x !== null).sort((a, b) => b.score - a.score);
}
