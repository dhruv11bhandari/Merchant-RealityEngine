import type { EvidenceItem } from '../types/evidence';
import type { InvestigationResult } from '../types/investigation';
import type { Label } from '../types/merchant';
import { clamp } from '../utils/format';

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
