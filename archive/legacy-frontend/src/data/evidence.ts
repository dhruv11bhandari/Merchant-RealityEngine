import type { Family, Mechanism } from '../types/evidence';
import type { LayerId, ResponseLevel } from '../types/investigation';

export const FAMILIES: { id: Family; name: string; short: string; patterns: number }[] = [
  { id: 'A', name: 'Ticket size and menu fit', short: 'Ticket', patterns: 12 },
  { id: 'B', name: 'Payer behaviour and geography', short: 'Payer / geo', patterns: 14 },
  { id: 'C', name: 'Timing and seasonality', short: 'Timing', patterns: 12 },
  { id: 'D', name: 'Money-flow shape and refunds', short: 'Money flow', patterns: 14 },
  { id: 'E', name: 'Cross-merchant cohorts and networks', short: 'Networks', patterns: 12 },
  { id: 'F', name: 'Settlement and lifecycle', short: 'Settlement', patterns: 12 },
  { id: 'G', name: 'Catalogue, website and payment-link provenance', short: 'Provenance', patterns: 14 },
  { id: 'H', name: 'Drift, blending and rotation', short: 'Drift', patterns: 12 },
  { id: 'I', name: 'Other abuse', short: 'Other', patterns: 10 },
];
export const TOTAL_PATTERNS = FAMILIES.reduce((s, f) => s + f.patterns, 0); // 112

export const MECHANISMS: { id: Mechanism; name: string; blurb: string }[] = [
  { id: 'ROTATION', name: 'Rotation', blurb: 'Collection moves between accounts or merchants to evade monitoring.' },
  { id: 'TRANSACTION_LAUNDERING', name: 'Transaction laundering', blurb: 'Undeclared activity is processed through a legitimate merchant’s credentials.' },
  { id: 'FABRICATED_SUBSTANCE', name: 'Fabricated substance', blurb: 'Commercial activity is manufactured and cannot be substantiated.' },
  { id: 'OTHER_ABUSE', name: 'Other abuse', blurb: 'Payout fan-out and other patterns that fit none of the above.' },
];

export interface LayerMeta {
  n: LayerId; code: string; name: string; tagline: string; does: string;
  inputs: string[]; processes: string[]; outputs: string[]; next: string;
}
export const LAYERS: LayerMeta[] = [
  { n: 1, code: 'L1', name: 'Ingest & Lineage', tagline: 'One clean event store, with provenance and honest gaps.',
    does: 'Brings every feed into a single PaymentEvent store, classifies each record, separates timestamps, links refunds to sales, hashes identifiers and maps which sources exist for the merchant.',
    inputs: ['Payment transactions', 'Refunds and chargebacks', 'Settlements', 'Merchant KYC', 'Website and checkout snapshots', 'Payer identifiers', 'Order and fulfilment feeds', 'Bank-side information (where available)'],
    processes: ['Normalise to PaymentEvent', 'Classify sale / refund / transfer / payout', 'Separate event, settle and ingest time', 'Link refunds to original sales', 'Hash identifiers', 'Build coverage map', 'Record source lineage'],
    outputs: ['Clean event store', 'Merchant coverage map'], next: 'The coverage map tells L3 which detectors may run and which must answer UNKNOWN.' },
  { n: 2, code: 'L2', name: 'Merchant Profile', tagline: 'What this business should look like.',
    does: 'Holds the approved declared profile and turns it into behavioural expectations through three baselines, so growth can be judged against what the merchant is expected to do, not against a flat line.',
    inputs: ['Declared category, products and MCC', 'Expected ticket band and hours', 'Catchment geography', 'Seasonal expectations', 'Event history from L1'],
    processes: ['Anchored baseline', 'Seasonal expectation', 'Rolling challenger', 'Residual calculation', 'CUSUM drift tracking'],
    outputs: ['Approved merchant profile', 'Behavioural expectations'], next: 'L3 detectors compare observed behaviour with these expectations.' },
  { n: 3, code: 'L3', name: 'Detection', tagline: 'Joint patterns across nine evidence families.',
    does: 'Runs transparent detectors for each evidence family. Every detector reports what it observed, what it expected, and why it produced a signal. Missing data produces UNKNOWN, never a guess.',
    inputs: ['Event store and coverage map', 'Merchant profile and baselines', 'Website and order data', 'Cohort peers'],
    processes: ['Run detectors per family', 'Compute residuals and CUSUM', 'Check cohort continuity', 'Emit EvidenceItems with status'],
    outputs: ['EvidenceItems (supports illicit / supports benign / UNKNOWN)'], next: 'EvidenceItems pass to L4, where correlated signals are collapsed before anything is counted.' },
  { n: 4, code: 'L4', name: 'Evidence Fusion', tagline: 'Independent evidence, not inflated scores.',
    does: 'Removes correlated duplicates, excludes UNKNOWN from risk scoring, weights by reliability and fake difficulty, checks source independence and scores four mechanism hypotheses. A case needs at least two independent families.',
    inputs: ['EvidenceItems from L3'],
    processes: ['Correlated signal removal', 'UNKNOWN exclusion', 'Reliability weighting', 'Source independence', 'Fake difficulty', 'Mechanism identification'],
    outputs: ['Evidence-backed case with mechanism hypotheses'], next: 'A prioritised case enters the analyst queue. No case means no analyst time spent.' },
  { n: 5, code: 'L5', name: 'Analyst Review', tagline: 'Two competing explanations, side by side.',
    does: 'Presents the legitimate business chain against the potential front chain, lets the analyst inspect source records, record findings and a merchant clarification, and recommend an action.',
    inputs: ['Case and evidence from L4', 'Source records', 'Merchant clarifications'],
    processes: ['Test each link in both chains', 'Inspect records, links, refunds, domains and gaps', 'Record findings', 'Recommend action'],
    outputs: ['Reviewed investigation and recommended response'], next: 'The analyst recommendation sets the starting point for L6.' },
  { n: 6, code: 'L6', name: 'Governed Response', tagline: 'The smallest action that works, with authority checked.',
    does: 'Maps the reviewed case to one of six proportionate levels, verifies legal authority separately, and prefers narrow actions such as disabling one link over restricting the merchant.',
    inputs: ['Reviewed case', 'Analyst recommendation', 'Legal and contractual basis'],
    processes: ['Select response level', 'Verify legal authority', 'Scope the action', 'Create time-boxed records', 'Log every action'],
    outputs: ['Response record and action audit'], next: 'Every action and its outcome flows to L7.' },
  { n: 7, code: 'L7', name: 'Audit, Labels & Learning', tagline: 'Outcomes feed back into the system.',
    does: 'Records adjudicated labels, measures precision, false positives and collateral harm, and feeds verified outcomes back into detector reliability and merchant profiles.',
    inputs: ['Action audit', 'Adjudicated outcomes', 'Detector results'],
    processes: ['Label outcomes', 'Compute performance indicators', 'Update reliability and profiles', 'Hash-chain the audit trail'],
    outputs: ['Audit trail and learning feedback'], next: 'Updated reliabilities and profiles return to L2 and L3 for the next investigation.' },
];

export const RESPONSE_LEVELS: { id: ResponseLevel; name: string; blurb: string; needsAuthority: boolean }[] = [
  { id: 'L0', name: 'Observe and log', blurb: 'Keep monitoring. Nothing changes for the merchant.', needsAuthority: false },
  { id: 'L1', name: 'Profile refresh and clarification', blurb: 'Ask the merchant to update the profile or explain the change.', needsAuthority: false },
  { id: 'L2', name: 'Enhanced Due Diligence', blurb: 'Open EDD: documents, site visit, purchaser checks.', needsAuthority: false },
  { id: 'L3', name: 'Restrict a defined prospective flow', blurb: 'Disable one identified payment flow, such as a single link.', needsAuthority: false },
  { id: 'L4', name: 'Time-boxed fund restriction', blurb: 'Hold a precisely identified amount for a limited time, subject to legal and escrow requirements.', needsAuthority: true },
  { id: 'L5', name: 'Terminate and report', blurb: 'Disable the merchant relationship and file required reports.', needsAuthority: true },
];
export const LEVEL_ORDER: ResponseLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
