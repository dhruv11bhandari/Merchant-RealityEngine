import type { EvidenceItem, Family, Mechanism } from './evidence';
import type { CoverageState, CoverageKey, Label, MerchantProfile, Scenario } from './merchant';
import type { PaymentEvent } from './payment';

export type LayerId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type LayerStatus = 'pending' | 'running' | 'done';

export interface WeeklyRow {
  week: string; actual: number | null; anchored: number; seasonal: number; rolling: number;
  rAnchored: number | null; rSeasonal: number | null; rRolling: number | null;
}
export interface CusumPoint { week: string; r: number | null; s: number; alarm: boolean }

export interface CohortMatch {
  peerId: string; name: string; score: number; jaccard: number; ticketSim: number; timingSim: number;
  gapDays: number | null; handoff: boolean; beneficiaryMatch: boolean;
}

export interface L1Result {
  counts: Record<string, { n: number; value: number }>;
  refundLinkage: { total: number; linked: number; orphan: number };
  coverage: Record<CoverageKey, CoverageState>;
  hashSamples: { raw: string; hash: string }[];
  sources: { name: string; key: CoverageKey | 'kyc' | 'payer'; state: CoverageState; records: number; note: string }[];
}
export interface L2Result { profile: MerchantProfile; rows: WeeklyRow[]; cusum: CusumPoint[]; peak: WeeklyRow | null }

export interface FusedItem { evidence: EvidenceItem; counted: boolean; reason: string; weight: number }
export interface FamilySummary { family: Family; illicit: number; benign: number; unknown: number; mass: number }
export interface MechanismScore { id: Mechanism; score: number; contributors: { id: string; contribution: number }[] }
export interface FusionResult {
  items: FusedItem[];
  families: FamilySummary[];
  independentFamilies: Family[];
  systems: string[];
  gatePassed: boolean;
  gateReason: string;
  illicitMass: number;
  benignMass: number;
  mechanisms: MechanismScore[];
  decision: 'OPEN_CASE' | 'NO_CASE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  priorityScore: number;
  unknownIds: string[];
}

export type ChainVerdict = 'SUPPORTED' | 'FAILED' | 'PARTIAL' | 'UNVERIFIED' | 'NOT_SUPPORTED';
export interface ChainItem { label: string; detail: string; evidenceIds: string[]; verdict: ChainVerdict }
export interface AnalystReview {
  legit: ChainItem[]; front: ChainItem[];
  legitStatus: 'HOLDS' | 'FAILED' | 'INCONCLUSIVE';
  frontFit: number;
  reasoning: string[];
  recommended: ResponseLevel;
}

export type ResponseLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export interface HoldRecord { id: string; amount: number; scope: string; expires: string; reviewBy: string; approver: string; basis: string }
export interface ActionRecord { seq: number; at: string; actor: string; action: string; detail: string }

export interface UserState {
  notes: string;
  clarification: string;
  chosenLevel: ResponseLevel | null;
  legalVerified: boolean;
  escrowConfirmed: boolean;
  executed: boolean;
  label: Label | null;
  audit: ActionRecord[];
}

export interface Timeline { op: string; ms: number }
export interface InvestigationResult {
  scenario: Scenario;
  events: PaymentEvent[];          // primary merchant, time-ordered
  l1: L1Result;
  l2: L2Result;
  evidence: EvidenceItem[];
  cohort: CohortMatch[];
  fusion: FusionResult;
  review: AnalystReview;
  timelines: Record<LayerId, Timeline[]>;
}
export type { Mechanism };
