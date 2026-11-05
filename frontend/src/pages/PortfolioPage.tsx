import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, FileUp, ShieldAlert, ShieldCheck } from 'lucide-react';
import { usePortfolio, type PortfolioEntry } from '../hooks/usePortfolio';
import { MECHANISMS } from '../data/evidence';
import { LADDER } from '../engines/patternPack';
import { Badge, Btn, Tabs } from '../components/ui/ui';
import { cx } from '../utils/format';

type View = 'all' | 'suspicious' | 'cleared';

export const verdictOf = (e: PortfolioEntry) => {
  const f = e.result.fusion, top = [...f.mechanisms].sort((a, b) => b.score - a.score)[0];
  return e.suspicious
    ? { label: 'Suspicious', tone: 'bad' as const, reason: MECHANISMS.find(m => m.id === top.id)!.name, priority: f.priority }
    : { label: 'Cleared', tone: 'ok' as const, reason: e.result.evidence.some(x => x.status === 'ILLICIT') ? 'Alarm explained by genuine activity' : 'Behaves like the declared business', priority: 'NONE' as const };
};

export function PortfolioPage() {
  const { entries, loading } = usePortfolio();
  const nav = useNavigate();
  const [view, setView] = useState<View>('all');
  const sus = entries.filter(e => e.suspicious), clear = entries.filter(e => !e.suspicious);
  const rows = view === 'suspicious' ? sus : view === 'cleared' ? clear : entries;
  const ask = entries.filter(e => e.pack.ladder === 'MEDIUM').length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Merchant portfolio</h1>
          <p className="mt-1 max-w-2xl text-sm text-mute">Every merchant below was run through all seven layers and every pattern. Suspicious merchants are ranked first. Open one to see why it was flagged and the proof behind each reason.</p>
        </div>
        <Link to="/demo/upload"><Btn variant="primary"><FileUp size={15} />Add a merchant dataset</Btn></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[['Merchants reviewed', entries.length, 'text-ink', loading ? 'loading more…' : 'synthetic portfolio'], ['Suspicious', sus.length, 'text-red-300', 'case opened for analyst review'], ['Cleared', clear.length, 'text-emerald-300', 'no case opened'], ['Asked to explain', ask, 'text-amber-300', 'volume changed; Context Passport sent']].map(([l, v, c, s]) => (
          <div key={l as string} className="rounded-md border border-line bg-panel px-4 py-3"><div className="text-xs text-mute">{l}</div><div className={cx('mt-1 text-2xl font-semibold tabular-nums', c as string)}>{v}</div><div className="text-[11px] text-dim">{s}</div></div>))}
      </div>

      <Tabs<View> value={view} onChange={setView} tabs={[{ id: 'all', label: `All (${entries.length})` }, { id: 'suspicious', label: `Suspicious (${sus.length})` }, { id: 'cleared', label: `Cleared (${clear.length})` }]} />

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-panel2 text-xs text-mute"><tr>
            {['Merchant', 'Declared business', 'Verdict', 'Main reason', 'Flags', 'Next step', ''].map(h => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map(e => {
            const v = verdictOf(e), p = e.scenario.profile, step = LADDER.find(l => l.id === e.pack.ladder)!;
            return (
              <tr key={e.key} onClick={() => nav(`/demo/portfolio/${e.key}`)} className={cx('cursor-pointer border-t border-line transition-colors hover:bg-panel2/70', e.suspicious && 'bg-red-400/[0.03]')}>
                <td className="px-4 py-3"><div className="flex items-center gap-2.5">{e.suspicious ? <ShieldAlert size={17} className="shrink-0 text-red-300" /> : <ShieldCheck size={17} className="shrink-0 text-emerald-300" />}
                  <div><div className="font-medium">{p.name}</div><div className="text-xs text-mute">{p.city.split(',')[0]} · <span className="font-mono">{p.id}</span>{e.source === 'uploaded' && <span className="ml-1.5 text-cyan-300">uploaded</span>}</div></div></div></td>
                <td className="px-4 py-3"><div>{p.category}</div><div className="text-xs text-mute">MCC {p.mcc}</div></td>
                <td className="px-4 py-3"><Badge tone={v.tone}>{v.label}{e.suspicious ? ` · ${v.priority}` : ''}</Badge></td>
                <td className="px-4 py-3 text-[13px]">{v.reason}</td>
                <td className="px-4 py-3 tabular-nums"><span className={e.coreFlags + e.patternFlags ? 'text-red-300' : 'text-mute'}>{e.coreFlags + e.patternFlags}</span><span className="text-xs text-dim"> / {e.result.evidence.length + e.pack.results.length - 1}</span></td>
                <td className="px-4 py-3 text-xs text-mute">{step.name}: {step.action.split(';')[0]}</td>
                <td className="px-3 py-3 text-mute"><ChevronRight size={16} /></td>
              </tr>);
          })}</tbody>
        </table>
      </div>
      <p className="text-xs text-dim">All merchants and transactions are synthetic. Flags = core detectors plus solution and betting patterns that fired.</p>
    </>
  );
}
