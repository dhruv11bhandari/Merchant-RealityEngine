import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { InvestigationResult, LayerId, LayerStatus, ResponseLevel, UserState, ActionRecord } from '../types/investigation';
import type { Label, Scenario, ScenarioId } from '../types/merchant';
import { getScenario } from '../data/scenarios';
import { runInvestigation } from '../engines/investigationEngine';
import { actionLog, planResponse } from '../engines/responseEngine';
import { fmtDateTime } from '../utils/format';
import { LAYERS } from '../data/evidence';

const IDS: LayerId[] = [1, 2, 3, 4, 5, 6, 7];
const idle = (): Record<LayerId, LayerStatus> => ({ 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending', 6: 'pending', 7: 'pending' });
const freshUser = (): UserState => ({ notes: '', clarification: '', chosenLevel: null, legalVerified: false, escrowConfirmed: false, executed: false, label: null, audit: [] });

export type ActiveId = ScenarioId | 'custom';
interface Ctx {
  scenarioId: ActiveId; scenario: Scenario; custom: Scenario | null; loadCustom: (sc: Scenario, runNow?: boolean) => void; result: InvestigationResult;
  status: Record<LayerId, LayerStatus>; started: boolean; running: boolean; allDone: boolean; fast: boolean; setFast: (b: boolean) => void;
  selectedLayer: LayerId; selectLayer: (n: LayerId) => void;
  setScenario: (id: ActiveId) => void; run: (id?: ActiveId) => void; reset: () => void;
  done: (n: LayerId) => boolean;
  user: UserState; patch: (p: Partial<UserState>) => void; note: (action: string, detail?: string, actor?: string) => void;
  setLevel: (l: ResponseLevel | null) => void; execute: () => void; setLabel: (l: Label | null) => void;
  audit: ActionRecord[];
}
const C = createContext<Ctx | null>(null);
export const useInvestigation = () => { const c = useContext(C); if (!c) throw new Error('InvestigationProvider missing'); return c; };

export function InvestigationProvider({ children }: { children: ReactNode }) {
  const [scenarioId, setScenarioId] = useState<ActiveId>('bakery');
  const [custom, setCustom] = useState<Scenario | null>(null);
  const [status, setStatus] = useState(idle());
  const [started, setStarted] = useState(false);
  const [fast, setFast] = useState(false);
  const [selectedLayer, selectLayer] = useState<LayerId>(1);
  const [user, setUser] = useState<UserState>(freshUser());
  const token = useRef(0);
  const pick = useCallback((id: ActiveId) => (id === 'custom' && custom ? custom : getScenario(id === 'custom' ? 'bakery' : id)), [custom]);
  const scenario = useMemo(() => pick(scenarioId), [scenarioId, pick]);
  const result = useMemo(() => runInvestigation(scenario), [scenario]);
  const running = IDS.some(n => status[n] === 'running');
  const allDone = IDS.every(n => status[n] === 'done');

  const reset = useCallback(() => { token.current++; setStatus(idle()); setStarted(false); setUser(freshUser()); selectLayer(1); }, []);
  const setScenario = useCallback((id: ActiveId) => { token.current++; setScenarioId(id); setStatus(idle()); setStarted(false); setUser(freshUser()); selectLayer(1); }, []);
  const start = useCallback((res: InvestigationResult) => {
    const my = ++token.current;
    setUser(freshUser()); setStatus(idle()); setStarted(true); selectLayer(1);
    (async () => {
      for (const n of IDS) {
        if (token.current !== my) return;
        setStatus(s => ({ ...s, [n]: 'running' })); selectLayer(n);
        const ms = res.timelines[n].reduce((s, t) => s + t.ms, 0) * (fast ? 0.12 : 1);
        await new Promise(r => setTimeout(r, ms));
        if (token.current !== my) return;
        setStatus(s => ({ ...s, [n]: 'done' }));
      }
    })();
  }, [fast]);
  const run = useCallback((id?: ActiveId) => { if (id) setScenarioId(id); start(id ? runInvestigation(pick(id)) : result); }, [result, pick, start]);
  const loadCustom = useCallback((sc: Scenario, runNow = true) => {
    token.current++; setCustom(sc); setScenarioId('custom'); setUser(freshUser()); setStatus(idle()); setStarted(false); selectLayer(1);
    if (runNow) start(runInvestigation(sc));
  }, [start]);
  useEffect(() => () => { token.current++; }, []);

  const patch = useCallback((p: Partial<UserState>) => setUser(u => ({ ...u, ...p })), []);
  const t0 = useMemo(() => Math.max(...scenario.events.map(e => e.eventTime)) + 3600000, [scenario]);
  const note = useCallback((action: string, detail = '', actor = 'Analyst (demo user)') => setUser(u => ({ ...u, audit: [...u.audit, { seq: u.audit.length + 1, at: fmtDateTime(t0 + (30 + u.audit.length * 4) * 60000), actor, action, detail }] })), [t0]);
  const setLevel = useCallback((l: ResponseLevel | null) => setUser(u => ({ ...u, chosenLevel: l, executed: false })), []);
  const setLabel = useCallback((l: Label | null) => setUser(u => ({ ...u, label: l })), []);
  const execute = useCallback(() => setUser(u => {
    const plan = planResponse(result, u);
    if (plan.blocked.length) return u;
    return { ...u, executed: true, audit: [...u.audit, ...actionLog(result, plan, u.audit.length).map(a => ({ ...a, seq: a.seq }))] };
  }), [result]);

  const audit = useMemo<ActionRecord[]>(() => {
    const sys: ActionRecord[] = LAYERS.filter(l => status[l.n] === 'done').map((l, i) => ({ seq: 0, at: fmtDateTime(t0 + i * 60000), actor: 'MRE pipeline', action: `${l.code} ${l.name} complete`, detail: l.outputs.join('; ') }));
    return [...sys, ...user.audit].map((a, i) => ({ ...a, seq: i + 1 }));
  }, [status, user.audit, t0]);

  const v: Ctx = { scenarioId, scenario, custom, loadCustom, result, status, started, running, allDone, fast, setFast, selectedLayer, selectLayer, setScenario, run, reset, done: n => status[n] === 'done', user, patch, note, setLevel, execute, setLabel, audit };
  return <C.Provider value={v}>{children}</C.Provider>;
}
