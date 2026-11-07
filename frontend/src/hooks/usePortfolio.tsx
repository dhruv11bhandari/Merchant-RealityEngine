import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Scenario, ScenarioId } from '../types/merchant';
import type { InvestigationResult } from '../types/investigation';
import { SCENARIO_IDS, getScenario } from '../data/scenarios';
import { runInvestigation } from '../engines/investigationEngine';
import { runPatternPack, type PatternPack } from '../engines/patternPack';

/** A merchant in the reviewed portfolio, already analysed by the engine. */
export interface PortfolioEntry {
  key: string;
  source: 'built-in' | 'uploaded';
  builtInId?: ScenarioId;
  scenario: Scenario;
  result: InvestigationResult;
  pack: PatternPack;
  suspicious: boolean;
  risk: number;            // for ranking: higher = review first
  coreFlags: number;
  patternFlags: number;
}

export function analyse(key: string, source: PortfolioEntry['source'], scenario: Scenario, builtInId?: ScenarioId): PortfolioEntry {
  const result = runInvestigation(scenario), pack = runPatternPack(result), f = result.fusion;
  const coreFlags = result.evidence.filter(e => e.status === 'ILLICIT').length;
  const patternFlags = pack.results.filter(r => r.status === 'FLAGGED' && r.id !== 'S5').length;
  const suspicious = f.decision === 'OPEN_CASE';
  const risk = (suspicious ? 10 + f.priorityScore * 10 : 0) + patternFlags * 0.3 + coreFlags * 0.1;
  return { key, source, builtInId, scenario, result, pack, suspicious, risk, coreFlags, patternFlags };
}

export type PortfolioMode = 'demo' | 'user';
interface Ctx { entries: PortfolioEntry[]; loading: boolean; mode: PortfolioMode; get: (key: string) => PortfolioEntry | undefined; addUploaded: (sc: Scenario) => string; clearUploaded: () => void }
const C = createContext<Ctx | null>(null);
export const usePortfolio = () => { const c = useContext(C); if (!c) throw new Error('PortfolioProvider missing'); return c; };

export function PortfolioProvider({ children, mode }: { children: ReactNode; mode: PortfolioMode }) {
  const builtIns = useMemo(() => mode === 'demo' ? SCENARIO_IDS.map(id => analyse(id, 'built-in', getScenario(id), id)) : [], [mode]);
  const [uploaded, setUploaded] = useState<PortfolioEntry[]>([]);
  const entries = useMemo(() => [...uploaded, ...builtIns].sort((a, b) => b.risk - a.risk), [uploaded, builtIns]);
  const get = useCallback((key: string) => entries.find(e => e.key === key), [entries]);
  const addUploaded = useCallback((sc: Scenario) => {
    const key = `upload-${sc.profile.id}-${Date.now().toString(36)}`;
    const entry = analyse(key, 'uploaded', sc);
    setUploaded(u => mode === 'user' ? [entry] : [entry, ...u.filter(x => x.scenario.profile.id !== sc.profile.id)]);
    return key;
  }, [mode]);
  const clearUploaded = useCallback(() => setUploaded([]), []);
  return <C.Provider value={{ entries, loading: false, mode, get, addUploaded, clearUploaded }}>{children}</C.Provider>;
}
