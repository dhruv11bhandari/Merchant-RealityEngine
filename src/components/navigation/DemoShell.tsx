import { NavLink, Link, Outlet } from 'react-router-dom';
import { Activity, BarChart3, Boxes, FileSearch, GitFork, LayoutDashboard, Play, RotateCcw, ShieldAlert, Store, Zap } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Badge, Btn } from '../ui/ui';
import { useInvestigation } from '../../hooks/useInvestigation';
import { SCENARIO_IDS, getScenario } from '../../data/scenarios';
import type { ScenarioId } from '../../types/merchant';
import { cx } from '../../utils/format';

const NAV = [
  { to: '/demo', label: 'Overview', icon: LayoutDashboard, end: true }, { to: '/demo/merchant', label: 'Merchant intelligence', icon: Store },
  { to: '/demo/investigations', label: 'Investigations', icon: FileSearch }, { to: '/demo/graph', label: 'Evidence graph', icon: GitFork },
  { to: '/demo/detection', label: 'Detection engine', icon: Activity }, { to: '/demo/analyst', label: 'Analyst workbench', icon: Boxes },
  { to: '/demo/response', label: 'Response centre', icon: ShieldAlert }, { to: '/demo/audit', label: 'Audit and learning', icon: BarChart3 },
];
export function DemoShell() {
  const { scenarioId, setScenario, run, reset, running, started, fast, setFast, allDone, status } = useInvestigation();
  const doneCount = Object.values(status).filter(s => s === 'done').length;
  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-panel/60 lg:flex">
        <Link to="/" className="flex h-14 items-center border-b border-line px-4" aria-label="Back to site"><Logo small /></Link>
        <nav className="flex-1 space-y-0.5 p-2" aria-label="Demo">{NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors', isActive ? 'bg-cyan-400/10 text-cyan-200' : 'text-mute hover:bg-panel2 hover:text-ink')}><n.icon size={16} />{n.label}</NavLink>)}</nav>
          <div className="border-t border-line p-4"><Link to="/engine" className="text-sm text-cyan-300 hover:underline">Enter the Engine →</Link><p className="mt-2 text-xs text-dim">This demo uses separate, synthetic browser scenarios.</p></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-5 py-2.5 backdrop-blur">
          <label className="flex items-center gap-2 text-xs text-mute">Scenario
            <select value={scenarioId} disabled={running} onChange={e => setScenario(e.target.value as ScenarioId)} className="rounded border border-line2 bg-panel px-2.5 py-1.5 text-sm text-ink outline-none focus:border-cyan-400 disabled:opacity-50">
              {SCENARIO_IDS.map(id => <option key={id} value={id}>{getScenario(id).title}</option>)}</select></label>
          <Btn variant="primary" size="sm" disabled={running} onClick={() => run()}><Play size={13} />{started ? 'Re-run investigation' : 'Run investigation'}</Btn>
          <Btn size="sm" disabled={!started && !running} onClick={reset}><RotateCcw size={13} />Reset</Btn>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-mute"><input type="checkbox" className="accent-cyan-400" checked={fast} onChange={e => setFast(e.target.checked)} /><Zap size={12} />Fast</label>
          <div className="ml-auto flex items-center gap-2">{started && <Badge tone={allDone ? 'ok' : 'info'}>{allDone ? 'All layers complete' : `${doneCount} of 7 layers`}</Badge>}<Badge tone="warn">Synthetic data</Badge></div>
          <nav className="flex w-full gap-1 overflow-x-auto lg:hidden" aria-label="Demo mobile">{NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('whitespace-nowrap rounded px-2.5 py-1 text-xs', isActive ? 'bg-cyan-400/10 text-cyan-200' : 'text-mute')}>{n.label}</NavLink>)}</nav>
        </header>
        <main className="mx-auto max-w-[1280px] space-y-6 px-5 py-6"><Outlet /></main>
      </div>
    </div>
  );
}
