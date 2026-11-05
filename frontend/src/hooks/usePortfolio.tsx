import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Scenario, ScenarioId } from '../types/merchant';
import type { InvestigationResult } from '../types/investigation';
import { SCENARIO_IDS, getScenario } from '../data/scenarios';
import { datasetToScenario } from '../data/dataset';
import { runInvestigation } from '../engines/investigationEngine';
import { runPatternPack, type PatternPack } from '../engines/patternPack';

/** A merchant in the reviewed portfolio, already analysed by the engine. */
export interface PortfolioEntry {
  key: string;
  source: 'built-in' | 'sample' | 'uploaded';
  builtInId?: ScenarioId;
  scenario: Scenario;
  result: InvestigationResult;
  pack: PatternPack;
  suspicious: boolean;
  risk: number;            // for ranking: higher = review first
  coreFlags: number;
  patternFlags: number;
}

// Extra synthetic merchants shipped as dataset files (the built-in four are loaded from code).
export const EXTRA_SAMPLES = ['05-chai-corner-night-betting.json', '06-shree-ganesh-sweets-genuine.json', '07-udupi-tiffin-steady.json', '08-nandi-kirana-genuine.json'];
const BASE = import.meta.env.BASE_URL;

export function analyse(key: string, source: PortfolioEntry['source'], scenario: Scenario, builtInId?: ScenarioId): PortfolioEntry {
  const result = runInvestigation(scenario), pack = runPatternPack(result), f = result.fusion;
  const coreFlags = result.evidence.filter(e => e.status === 'ILLICIT').length;
  const patternFlags = pack.results.filter(r => r.status === 'FLAGGED' && r.id !== 'S5').length;
  const suspicious = f.decision === 'OPEN_CASE';
  const risk = (suspicious ? 10 + f.priorityScore * 10 : 0) + patternFlags * 0.3 + coreFlags * 0.1;
  return { key, source, builtInId, scenario, result, pack, suspicious, risk, coreFlags, patternFlags };
}

interface Ctx { entries: PortfolioEntry[]; loading: boolean; get: (key: string) => PortfolioEntry | undefined; addUploaded: (sc: Scenario) => string }
const C = createContext<Ctx | null>(null);
export const usePortfolio = () => { const c = useContext(C); if (!c) throw new Error('PortfolioProvider missing'); return c; };

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const builtIns = useMemo(() => SCENARIO_IDS.map(id => analyse(id, 'built-in', getScenario(id), id)), []);
  const [extra, setExtra] = useState<PortfolioEntry[]>([]);
  const [uploaded, setUploaded] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    Promise.all(EXTRA_SAMPLES.map(async f => {
      try {
        const p = datasetToScenario(await (await fetch(`${BASE}samples/${f}`)).json());
        return p.ok && p.scenario ? analyse(f.replace('.json', ''), 'sample', p.scenario) : null;
      } catch { return null; }
    })).then(list => { if (live) { setExtra(list.filter((x): x is PortfolioEntry => !!x)); setLoading(false); } });
    return () => { live = false; };
  }, []);

  const entries = useMemo(() => [...uploaded, ...builtIns, ...extra].sort((a, b) => b.risk - a.risk), [uploaded, builtIns, extra]);
  const get = useCallback((key: string) => entries.find(e => e.key === key), [entries]);
  const addUploaded = useCallback((sc: Scenario) => {
    const key = `upload-${sc.profile.id}-${Date.now().toString(36)}`;
    setUploaded(u => [analyse(key, 'uploaded', sc), ...u.filter(x => x.scenario.profile.id !== sc.profile.id)]);
    return key;
  }, []);
  return <C.Provider value={{ entries, loading, get, addUploaded }}>{children}</C.Provider>;
}
