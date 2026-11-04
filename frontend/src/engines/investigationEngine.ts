import type { Scenario } from '../types/merchant';
import type { InvestigationResult, L1Result, LayerId, Timeline } from '../types/investigation';
import type { PaymentEvent } from '../types/payment';
import { buildWeeklyRows } from './residualEngine';
import { cusum } from './cusumEngine';
import { cohortContinuity } from './cohortContinuity';
import { runDetectors } from './detectors';
import { fuse } from './evidenceFusion';
import { buildReview } from './analystEngine';

function layer1(sc: Scenario, ev: PaymentEvent[]): L1Result {
  const types = ['SALE', 'REFUND', 'TRANSFER', 'SETTLEMENT', 'CHARGEBACK'];
  const counts = Object.fromEntries(types.map(t => { const x = ev.filter(e => e.type === t); return [t, { n: x.length, value: x.reduce((s, e) => s + e.amount, 0) }]; }));
  const sid = new Set(ev.filter(e => e.type === 'SALE').map(e => e.id)), refunds = ev.filter(e => e.type === 'REFUND'), linked = refunds.filter(r => r.linkedSaleId && sid.has(r.linkedSaleId)).length;
  const seen = new Set<string>(), hashSamples: { raw: string; hash: string }[] = [];
  for (const e of ev) if (e.type === 'SALE' && !seen.has(e.payerRef) && hashSamples.length < 4) { seen.add(e.payerRef); hashSamples.push({ raw: e.payerRef, hash: e.payerHash }); }
  const c = sc.coverage;
  return { counts, refundLinkage: { total: refunds.length, linked, orphan: refunds.length - linked }, coverage: c, hashSamples, sources: [
    { name: 'Payment transactions', key: 'acquiring', state: c.acquiring, records: counts.SALE.n, note: 'Acquirer UPI and POS feed' },
    { name: 'Refunds and chargebacks', key: 'acquiring', state: c.acquiring, records: counts.REFUND.n + counts.CHARGEBACK.n, note: 'Refund ledger' },
    { name: 'Settlements', key: 'acquiring', state: c.acquiring, records: counts.SETTLEMENT.n, note: 'Settlement ledger' },
    { name: 'Merchant KYC', key: 'kyc', state: 'AVAILABLE', records: 1, note: 'Declared profile and documents' },
    { name: 'Website and checkout snapshots', key: 'website', state: c.website, records: sc.web.embeds.length, note: 'Crawler snapshots of declared and third-party pages' },
    { name: 'Payer identifiers', key: 'payer', state: 'AVAILABLE', records: new Set(ev.map(e => e.payerHash)).size, note: 'Hashed on entry' },
    { name: 'Order and fulfilment feeds', key: 'orders', state: c.orders, records: sc.orders.length, note: c.orders === 'MISSING' ? 'No feed connected' : 'Merchant order system' },
    { name: 'Bank-side information', key: 'bank', state: c.bank, records: sc.bankCredits.length, note: c.bank === 'MISSING' ? 'Not shared by the bank' : 'Bank credit feed' },
  ] };
}

const TL: Record<LayerId, Timeline[]> = {
  1: [{ op: 'Connect feeds and read records', ms: 160 }, { op: 'Normalise to PaymentEvent', ms: 240 }, { op: 'Classify sale / refund / transfer / settlement', ms: 120 }, { op: 'Separate event, settle and ingest time', ms: 90 }, { op: 'Link refunds to original sales', ms: 180 }, { op: 'Hash payer identifiers', ms: 70 }, { op: 'Build coverage map', ms: 60 }],
  2: [{ op: 'Load approved profile', ms: 80 }, { op: 'Anchored baseline', ms: 60 }, { op: 'Seasonal expectation', ms: 90 }, { op: 'Rolling challenger', ms: 110 }, { op: 'Residuals and CUSUM', ms: 140 }],
  3: [{ op: 'Run family A–B detectors', ms: 210 }, { op: 'Run family C–D detectors', ms: 260 }, { op: 'Cohort continuity search', ms: 320 }, { op: 'Run family E–G detectors', ms: 280 }, { op: 'Run family H–I detectors', ms: 150 }, { op: 'Emit EvidenceItems', ms: 40 }],
  4: [{ op: 'Exclude UNKNOWN evidence', ms: 40 }, { op: 'Collapse correlated signals', ms: 120 }, { op: 'Weight by reliability and fake difficulty', ms: 90 }, { op: 'Check source independence', ms: 70 }, { op: 'Score mechanism hypotheses', ms: 130 }, { op: 'Open or decline case', ms: 30 }],
  5: [{ op: 'Build competing chains', ms: 110 }, { op: 'Test each link against evidence', ms: 190 }, { op: 'Draft recommendation', ms: 70 }],
  6: [{ op: 'Map case to response level', ms: 60 }, { op: 'Scope action to defined flow', ms: 90 }, { op: 'Check legal-authority gate', ms: 120 }],
  7: [{ op: 'Prepare label options', ms: 50 }, { op: 'Compute indicators', ms: 80 }, { op: 'Stage learning updates', ms: 90 }, { op: 'Hash-chain audit entries', ms: 40 }],
};

/** Pure, deterministic. Same scenario in → same result out. */
export function runInvestigation(sc: Scenario): InvestigationResult {
  const events = sc.events.filter(e => e.merchantId === sc.primaryMerchantId);
  const rows = buildWeeklyRows(sc.profile, sc.weekly), cs = cusum(rows), cohort = cohortContinuity(sc);
  const evidence = runDetectors({ sc, p: sc.profile, all: events, sales: events.filter(e => e.type === 'SALE'), refunds: events.filter(e => e.type === 'REFUND'),
    settlements: events.filter(e => e.type === 'SETTLEMENT'), transfers: events.filter(e => e.type === 'TRANSFER'), rows, cusum: cs, cohort });
  const fusion = fuse(evidence), review = buildReview(evidence, fusion), peak = [...rows].reverse().find(r => r.actual !== null) ?? null;
  return { scenario: sc, events, l1: layer1(sc, events), l2: { profile: sc.profile, rows, cusum: cs, peak }, evidence, cohort, fusion, review, timelines: TL };
}
