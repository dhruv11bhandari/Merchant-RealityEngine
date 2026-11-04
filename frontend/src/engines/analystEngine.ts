import type { EvidenceItem } from '../types/evidence';
import type { AnalystReview, ChainItem, ChainVerdict, FusionResult, ResponseLevel } from '../types/investigation';
import { effWeight } from './evidenceFusion';

const LEGIT: [string, string, string[]][] = [
  ['Seasonal or promotional demand explains the volume', 'Festival or campaign growth would sit near the seasonal expectation.', ['H1']],
  ['Customers are genuine and local', 'Payers come from the service area, and independent purchasers recognise their orders.', ['B6', 'B9']],
  ['Baskets fit the declared products', 'Ticket sizes follow the menu or catalogue, without round-number heaping.', ['A1', 'A4', 'G2']],
  ['Orders and fulfilment are verified', 'Payments link to orders that were produced and delivered.', ['D10', 'F7']],
  ['Funding follows business hours and demand', 'Collections track trading hours, not external event calendars.', ['C2', 'C5', 'H3']],
  ['Refunds reconcile to original sales', 'Each refund returns to the payer who paid.', ['D7', 'D9']],
  ['Settlements are stable and explained', 'One beneficiary, reconciled to bank credits, no handoffs.', ['F5', 'F2', 'F8']],
  ['Payment links sit on declared channels only', 'Checkout appears only on the merchant’s own domain.', ['G6', 'E1']],
];
const FRONT: [string, string, string[]][] = [
  ['Undeclared offering behind retail credentials', 'The merchant’s payment link is used on a page for a different business.', ['G6', 'E1']],
  ['Coordinated funding events', 'Payments cluster around external triggers and form a joint off-profile population.', ['C5', 'H3']],
  ['Disguised collection', 'Ticket sizes, payer geography and hours are off the declared profile.', ['A1', 'A4', 'B6', 'C2']],
  ['Refunds as a return or onward channel', 'Refunds without sales, to other destinations, or fan-out payouts.', ['D7', 'D9', 'I2']],
  ['Settlement or account manoeuvres', 'Beneficiary changes, lifecycle handoffs or continuity with a dormant peer.', ['F5', 'F2', 'E3']],
  ['Commercial substance cannot be shown', 'Orders, fulfilment and purchasers fail to substantiate the sales.', ['D10', 'F7', 'B9', 'G2']],
];

function verdictFor(ev: EvidenceItem[], mode: 'legit' | 'front'): ChainVerdict {
  const ill = ev.filter(e => e.status === 'ILLICIT'), ben = ev.filter(e => e.status === 'BENIGN');
  const strongIll = ill.some(e => effWeight(e) >= 0.4);
  if (mode === 'legit') {
    if (strongIll) return 'FAILED';
    if (ill.length) return 'PARTIAL';
    if (ben.length) return 'SUPPORTED';
    return 'UNVERIFIED';
  }
  if (strongIll) return 'SUPPORTED';
  if (ill.length) return 'PARTIAL';
  if (ben.length) return 'NOT_SUPPORTED';
  return 'UNVERIFIED';
}

export function buildReview(evidence: EvidenceItem[], fusion: FusionResult): AnalystReview {
  const get = (ids: string[]) => evidence.filter(e => ids.includes(e.id));
  const mk = (rows: [string, string, string[]][], mode: 'legit' | 'front'): ChainItem[] => rows.map(([label, detail, evidenceIds]) => ({ label, detail, evidenceIds, verdict: verdictFor(get(evidenceIds), mode) }));
  const legit = mk(LEGIT, 'legit'), front = mk(FRONT, 'front');
  const failed = legit.filter(i => i.verdict === 'FAILED'), supported = legit.filter(i => i.verdict === 'SUPPORTED');
  const failedFamilies = new Set(failed.flatMap(i => get(i.evidenceIds).filter(e => e.status === 'ILLICIT').map(e => e.family)));
  const legitStatus = failed.length >= 2 && failedFamilies.size >= 2 ? 'FAILED' : failed.length === 0 && supported.length >= 3 ? 'HOLDS' : 'INCONCLUSIVE';
  const frontFit = front.filter(i => i.verdict === 'SUPPORTED').length / front.length;
  const reasoning: string[] = [];
  failed.forEach(i => { const e = get(i.evidenceIds).filter(x => x.status === 'ILLICIT').sort((a, b) => effWeight(b) - effWeight(a))[0]; if (e) reasoning.push(`“${i.label}” fails. ${e.id} ${e.name}: ${e.observed}.`); });
  const unverified = legit.filter(i => i.verdict === 'UNVERIFIED');
  if (unverified.length) reasoning.push(`${unverified.length} legitimate-chain link(s) cannot be verified because source data is missing (${unverified.map(i => i.label.toLowerCase()).join('; ')}). These stay UNKNOWN and do not count against the merchant.`);
  if (legitStatus === 'HOLDS') reasoning.push(`The legitimate chain holds on ${supported.length} links, including verified, hard-to-fake evidence. The volume alarm is explained.`);
  if (legitStatus === 'FAILED') reasoning.push(`The legitimate chain fails on ${failed.length} links across ${failedFamilies.size} independent evidence families, so it is no longer the most plausible explanation.`);
  if (legitStatus === 'INCONCLUSIVE') reasoning.push('Evidence neither confirms nor rules out the legitimate explanation. A merchant clarification is the proportionate next step.');
  const top = fusion.mechanisms[0];
  let recommended: ResponseLevel;
  if (fusion.decision === 'NO_CASE') recommended = legitStatus === 'HOLDS' ? 'L1' : 'L0';
  else if (legitStatus === 'INCONCLUSIVE') recommended = 'L2';
  else if (top.id === 'FABRICATED_SUBSTANCE') recommended = 'L2';
  else recommended = fusion.priority === 'HIGH' ? 'L3' : fusion.priority === 'MEDIUM' ? 'L2' : 'L1';
  return { legit, front, legitStatus, frontFit, reasoning, recommended };
}
