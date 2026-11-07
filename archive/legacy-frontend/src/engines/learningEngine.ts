import type { EvidenceItem } from '../types/evidence';
import type { InvestigationResult, ResponseLevel } from '../types/investigation';
import type { Label } from '../types/merchant';
import { clamp } from '../utils/format';

export const BASE_PORTFOLIO = { merchants: 12480, investigations: 128, awaiting: 14, confirmed: 64, benign: 31, unresolved: 19,
  valueIntercepted: 4820000, benignPrincipalHours: 1260, settlementDelayHrs: 6.4, detectionDelayDays: 3.1, reviewMinutes: 38, wrongfulTerminations: 0 };

export interface ReliabilityUpdate { id: string; name: string; before: number; after: number }
export function reliabilityUpdates(evidence: EvidenceItem[], label: Label): ReliabilityUpdate[] {
  if (label === 'UNRESOLVED') return [];
  return evidence.filter(e => e.status !== 'UNKNOWN').map(e => {
    const up = (label === 'CONFIRMED_ILLICIT') === (e.status === 'ILLICIT');
    const after = up ? e.reliability + 0.06 * (1 - e.reliability) : e.reliability - (e.status === 'ILLICIT' ? 0.08 : 0.04) * e.reliability;
    return { id: e.id, name: e.name, before: e.reliability, after: clamp(after, 0.05, 0.99) };
  });
}

export function profileUpdates(res: InvestigationResult, label: Label): string[] {
  const sc = res.scenario, peak = res.l2.peak;
  if (label === 'UNRESOLVED') return ['No labels applied. Unresolved cases are excluded from training and are not treated as negatives.', 'Case stays on the watchlist until the merchant responds or evidence changes.'];
  if (label === 'ADJUDICATED_BENIGN') {
    const obs = peak && peak.actual ? peak.actual / peak.anchored : sc.profile.seasonalPeak, next = 0.5 * sc.profile.seasonalPeak + 0.5 * obs;
    return [`Seasonal peak expectation updated ${sc.profile.seasonalPeak.toFixed(1)}× → ${next.toFixed(1)}× (average of prior and adjudicated observation).`, 'Verified order, delivery and bank-reconciliation evidence now weigh more in future reviews.', 'Volume-only alarms for this merchant need a smaller extra margin before escalating.'];
  }
  const host = sc.web.embeds.find(e => e.merchantId === sc.primaryMerchantId && e.category !== 'own');
  return [host ? `Add ${host.host} to the undeclared-host watchlist; flag every merchant link found on it.` : 'Add the merchant’s order and fulfilment gaps to the substantiation checklist.',
    sc.id === 'rotation' ? 'Link beneficiary BEN_GGR_OLD to the cohort watchlist; any new account settling to it is flagged on day one.' : 'Pattern signature saved for cohort search across similar merchants.',
    'Detector reliabilities raised for the signals that fired (see table).', 'Merchant profile marked “under review”; automatic seasonal refresh suspended.'];
}

export interface Kpis { merchants: number; investigations: number; awaiting: number; confirmed: number; benign: number; unresolved: number; precision: number; fpr: number; unresolvedCoverage: number;
  value: number; benignHours: number; settlementDelay: number; detectionDelay: number; effort: number; wrongful: number }
export function computeKpis(label: Label | null, level: ResponseLevel | null, executed: boolean, started: boolean, intercepted: number): Kpis {
  const b = BASE_PORTFOLIO;
  let { investigations, awaiting, confirmed, benign, unresolved } = b, value = b.valueIntercepted, hours = b.benignPrincipalHours, delay = b.settlementDelayHrs;
  if (started) { investigations += 1; awaiting += 1; }
  if (started && label) { awaiting -= 1; if (label === 'CONFIRMED_ILLICIT') confirmed++; else if (label === 'ADJUDICATED_BENIGN') benign++; else unresolved++; }
  if (executed && level && (level === 'L3' || level === 'L4')) value += intercepted;
  if (executed && level === 'L4' && label === 'ADJUDICATED_BENIGN') { hours += 72 * 0.2; delay += 0.1; }
  return { merchants: b.merchants, investigations, awaiting, confirmed, benign, unresolved,
    precision: confirmed / (confirmed + benign), fpr: benign / (b.merchants - confirmed), unresolvedCoverage: unresolved / (confirmed + benign + unresolved),
    value, benignHours: hours, settlementDelay: delay, detectionDelay: b.detectionDelayDays, effort: b.reviewMinutes, wrongful: b.wrongfulTerminations };
}
