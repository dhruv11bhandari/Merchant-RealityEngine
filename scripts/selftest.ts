import { SCENARIO_IDS, getScenario } from '../src/data/scenarios';
import { runInvestigation } from '../src/engines/investigationEngine';

for (const id of SCENARIO_IDS) {
  const a = runInvestigation(getScenario(id)), b = runInvestigation(getScenario(id));
  const same = JSON.stringify(a.evidence) === JSON.stringify(b.evidence);
  console.log(`\n=== ${id} | events ${a.events.length} | deterministic ${same} ===`);
  a.evidence.forEach(e => console.log(`${e.id.padEnd(4)} ${e.status.padEnd(8)} s=${e.strength.toFixed(2)} ${e.observed}`));
  const f = a.fusion;
  console.log('families', f.independentFamilies.join(','), '| systems', f.systems.join(','), '| gate', f.gatePassed, '| decision', f.decision, f.priority, f.priorityScore.toFixed(2));
  console.log('mechanisms', f.mechanisms.map(m => `${m.id}:${m.score.toFixed(2)}`).join(' '));
  console.log('legit', a.review.legitStatus, '| recommended', a.review.recommended, '| fit', a.review.frontFit.toFixed(2));
  console.log('residuals', a.l2.rows.slice(-3).map(r => r.rSeasonal?.toFixed(2)).join(' '), 'cusum', a.l2.cusum.map(c => c.s.toFixed(2)).slice(-3).join(' '));
  
}
