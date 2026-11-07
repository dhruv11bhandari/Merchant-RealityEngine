import type { CoverageKey } from './merchant';

export type Family = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
export type EvidenceStatus = 'ILLICIT' | 'BENIGN' | 'UNKNOWN';
export type Mechanism = 'ROTATION' | 'TRANSACTION_LAUNDERING' | 'FABRICATED_SUBSTANCE' | 'OTHER_ABUSE';

export interface EvidenceItem {
  id: string;                 // detector id, e.g. A4
  name: string;
  family: Family;
  status: EvidenceStatus;
  strength: number;           // 0..1, detector-local
  reliability: number;        // 0..1, data-quality weight
  fakeDifficulty: number;     // 0..1, how hard it is for an adversary to fake this evidence
  lineage: string;            // correlation key within a family
  system: string;             // source system, used for independence
  affinity: Record<Mechanism, number>;
  observed: string;
  expected: string;
  explanation: string;
  metrics: Record<string, string | number>;
  records: string[];          // event ids / link ids behind the signal
  requires: CoverageKey[];
}
