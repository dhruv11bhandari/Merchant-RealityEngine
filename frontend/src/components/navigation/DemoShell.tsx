import { NavLink, Link, Outlet } from 'react-router-dom';
import { Activity, BarChart3, Briefcase, Boxes, FileSearch, GitFork, ListChecks, ShieldAlert, Store } from 'lucide-react';
import { PublicNav } from './PublicNav';
import { useInvestigation } from '../../hooks/useInvestigation';
import { cx } from '../../utils/format';

const NAV = [
  { to: '/demo', label: 'Four merchant scenarios', icon: Briefcase, end: true },
  { to: '/demo/investigations', label: 'Seven-layer run', icon: FileSearch },
  { to: '/demo/merchant', label: 'Merchant profile', icon: Store },
  { to: '/demo/graph', label: 'Evidence graph', icon: GitFork },
  { to: '/demo/detection', label: 'Detection engine', icon: Activity },
  { to: '/demo/patterns', label: 'Pattern board', icon: ListChecks },
  { to: '/demo/analyst', label: 'Analyst review', icon: Boxes },
  { to: '/demo/response', label: 'Response simulation', icon: ShieldAlert },
  { to: '/demo/audit', label: 'Audit and learning', icon: BarChart3 },
  { to: '/demo/portfolio', label: 'Four merchant results', icon: Briefcase },
];

export function DemoShell() {
  const { detailsOpen } = useInvestigation();
  const visibleNav = detailsOpen ? NAV : NAV.slice(0, 1);
  return (
    <>
      <PublicNav landing />
      <div className="flex min-h-screen bg-bg">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-panel/60 lg:flex">
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Guided demo">{visibleNav.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors', isActive ? 'bg-zinc-400/10 text-zinc-200' : 'text-mute hover:bg-panel2 hover:text-ink')}><n.icon size={16} />{n.label}</NavLink>)}</nav>
          <Link to="/ai-engine" className="border-t border-line p-4 text-xs text-mute transition hover:text-ink">Have your own data? Open AI Engine →</Link>
        </aside>
        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-[1280px] space-y-6 px-5 py-6">
            <nav className="flex w-full gap-1 overflow-x-auto pb-1 lg:hidden" aria-label="Guided demo mobile">{visibleNav.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('whitespace-nowrap rounded px-2.5 py-1 text-xs', isActive ? 'bg-zinc-400/10 text-zinc-200' : 'text-mute')}>{n.label}</NavLink>)}</nav>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
