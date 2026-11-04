import type { EvidenceItem, Family, Mechanism } from '../types/evidence';
import type { FusionResult, FusedItem, FamilySummary, MechanismScore } from '../types/investigation';
import { FAMILIES } from '../data/evidence';

export const MIN_FAMILY_MASS = 0.25;
export const MIN_INDEPENDENT_FAMILIES = 2;
const MECHS: Mechanism[] = ['TRANSACTION_LAUNDERING', 'ROTATION', 'FABRICATED_SUBSTANCE', 'OTHER_ABUSE'];

/** Effective weight. Illicit: strength × reliability. Benign is further discounted by how easy it is to fake: strength × reliability × (0.35 + 0.65 × fakeDifficulty). */
export const effWeight = (e: EvidenceItem) =>
  e.status === 'ILLICIT' ? e.strength * e.reliability : e.status === 'BENIGN' ? e.strength * e.reliability * (0.35 + 0.65 * e.fakeDifficulty) : 0;

export function fuse(evidence: EvidenceItem[]): FusionResult {
  const items: FusedItem[] = evidence.map(e => ({ evidence: e, counted: false, reason: '', weight: 0 }));
  // 1+2: UNKNOWN exclusion, then correlated-signal removal inside (family, lineage, status)
  const groups = new Map<string, FusedItem[]>();
  items.forEach(it => {
    if (it.evidence.status === 'UNKNOWN') { it.reason = 'UNKNOWN: excluded from risk scoring'; return; }
    const k = `${it.evidence.family}|${it.evidence.lineage}|${it.evidence.status}`;
    groups.set(k, [...(groups.get(k) ?? []), it]);
  });
  groups.forEach(g => {
    g.sort((a, b) => effWeight(b.evidence) - effWeight(a.evidence));
    g.forEach((it, i) => {
      if (i === 0) { it.counted = true; it.weight = effWeight(it.evidence); it.reason = g.length > 1 ? `Counted: strongest of ${g.length} correlated signals` : 'Counted'; }
      else it.reason = `Collapsed into ${g[0].evidence.id}: same family and data lineage (${it.evidence.lineage})`;
    });
  });
  const counted = items.filter(i => i.counted), ill = counted.filter(i => i.evidence.status === 'ILLICIT'), ben = counted.filter(i => i.evidence.status === 'BENIGN');
  const families: FamilySummary[] = FAMILIES.map(f => {
    const inF = items.filter(i => i.evidence.family === f.id);
    return { family: f.id, illicit: inF.filter(i => i.evidence.status === 'ILLICIT').length, benign: inF.filter(i => i.evidence.status === 'BENIGN').length, unknown: inF.filter(i => i.evidence.status === 'UNKNOWN').length,
      mass: ill.filter(i => i.evidence.family === f.id).reduce((s, i) => s + i.weight, 0) };
  });
  const independentFamilies = families.filter(f => f.mass >= MIN_FAMILY_MASS).map(f => f.family) as Family[];
  const systems = [...new Set(ill.filter(i => i.weight >= MIN_FAMILY_MASS * 0.8).map(i => i.evidence.system))];
  const gatePassed = independentFamilies.length >= MIN_INDEPENDENT_FAMILIES && systems.length >= 2;
  const gateReason = gatePassed
    ? `${independentFamilies.length} independent families (${independentFamilies.join(', ')}) across ${systems.length} source systems meet the minimum of ${MIN_INDEPENDENT_FAMILIES}.`
    : independentFamilies.length < MIN_INDEPENDENT_FAMILIES
      ? `Only ${independentFamilies.length} family supports an illicit reading; at least ${MIN_INDEPENDENT_FAMILIES} independent families are required. Several signals from one family do not count as several independent facts.`
      : `Supporting families draw on a single source system; independent sources are required.`;
  const illicitMass = ill.reduce((s, i) => s + i.weight, 0), benignMass = ben.reduce((s, i) => s + i.weight, 0);
  const mechanisms: MechanismScore[] = MECHS.map(m => {
    const contrib = ill.map(i => ({ id: i.evidence.id, contribution: i.weight * i.evidence.affinity[m] })).filter(c => c.contribution > 0.01).sort((a, b) => b.contribution - a.contribution);
    return { id: m, score: 1 - Math.exp(-0.5 * contrib.reduce((s, c) => s + c.contribution, 0)), contributors: contrib };
  }).sort((a, b) => b.score - a.score);
  const benShare = benignMass / Math.max(benignMass + illicitMass, 1e-6);
  const priorityScore = gatePassed ? mechanisms[0].score * (1 - 0.4 * benShare) : 0;
  const priority = !gatePassed ? 'NONE' : priorityScore >= 0.6 ? 'HIGH' : priorityScore >= 0.4 ? 'MEDIUM' : 'LOW';
  return { items, families, independentFamilies, systems, gatePassed, gateReason, illicitMass, benignMass, mechanisms, decision: gatePassed ? 'OPEN_CASE' : 'NO_CASE', priority, priorityScore, unknownIds: items.filter(i => i.evidence.status === 'UNKNOWN').map(i => i.evidence.id) };
}
