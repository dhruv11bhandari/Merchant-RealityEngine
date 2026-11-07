import { Link } from 'react-router-dom';
import { ArrowRight, FileUp, LockKeyhole, Sparkles } from 'lucide-react';
import { useInvestigation } from '../hooks/useInvestigation';
import { Badge, Btn } from '../components/ui/ui';

export function AIEnginePage() {
  const { custom, started, allDone, status, result } = useInvestigation();
  const completedLayers = Object.values(status).filter(s => s === 'done').length;
  const findings = result.evidence.filter(e => e.status === 'ILLICIT').length;

  if (!custom || !started) {
    return (
      <div className="mx-auto max-w-4xl py-10 md:py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-mute"><Sparkles size={14} /> YOUR PRIVATE WORKSPACE</div>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">Merchant intelligence, based on the data you choose.</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-mute">Upload one merchant dataset and run the analysis when you’re ready. This workspace starts empty and shows findings only for the dataset you submit.</p>
        <Link to="/ai-engine/analyze" className="mt-8 inline-flex"><Btn variant="primary" size="lg"><FileUp size={16} />Analyze your data <ArrowRight size={16} /></Btn></Link>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[['One dataset at a time', 'Your latest run replaces the previous result in this workspace.'], ['Local processing', 'The JSON file is processed in your browser; it is not sent to a server.'], ['Reviewable findings', 'Explore the seven layers and the evidence tied to your merchant.']].map(([title, body]) => <div key={title} className="rounded-md border border-line bg-panel p-4"><div className="text-sm font-medium">{title}</div><p className="mt-1.5 text-xs leading-relaxed text-mute">{body}</p></div>)}
        </div>
        <div className="mt-5 flex items-start gap-2 rounded border border-line bg-panel/60 px-4 py-3 text-xs leading-relaxed text-mute"><LockKeyhole size={15} className="mt-0.5 shrink-0" />The workspace waits for your file. No demo merchants or other merchants’ records are displayed here.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="font-mono text-xs tracking-[.16em] text-mute">YOUR LATEST ANALYSIS</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{custom.profile.name}</h1><p className="mt-1 text-sm text-mute">{custom.profile.city} · {custom.profile.category} · {custom.events.length.toLocaleString()} records</p></div>
        <Badge tone={allDone ? 'ok' : 'info'}>{allDone ? 'Analysis complete' : `Running · ${completedLayers} of 7 layers`}</Badge>
      </div>
      {allDone && <div className="mt-6 rounded-lg border border-line bg-panel p-5">
        <div className="text-xs text-mute">ENGINE RESULT</div><div className="mt-1 text-xl font-semibold">{result.fusion.decision === 'OPEN_CASE' ? 'Review recommended' : 'No case opened'}</div><p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute">{result.fusion.gateReason}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded border border-line bg-bg p-3"><div className="text-xs text-mute">Evidence signals</div><div className="mt-1 text-lg font-semibold">{result.evidence.length}</div></div><div className="rounded border border-line bg-bg p-3"><div className="text-xs text-mute">Signals needing review</div><div className="mt-1 text-lg font-semibold">{findings}</div></div><div className="rounded border border-line bg-bg p-3"><div className="text-xs text-mute">Priority</div><div className="mt-1 text-lg font-semibold">{result.fusion.priority}</div></div></div>
        <div className="mt-5 flex flex-wrap gap-2"><Link to="/ai-engine/investigations"><Btn variant="primary">View seven-layer findings <ArrowRight size={14} /></Btn></Link><Link to="/ai-engine/portfolio"><Btn>View this result</Btn></Link><Link to="/ai-engine/analyze"><Btn>Analyze another dataset</Btn></Link></div>
      </div>}
      {!allDone && <div className="mt-6 rounded-lg border border-line bg-panel p-5"><div className="text-sm font-medium">Analysis in progress</div><p className="mt-1 text-sm text-mute">The engine is working through this dataset. Your result will appear here when all seven layers finish.</p><div className="mt-4 h-1.5 overflow-hidden rounded bg-panel2"><div className="h-full rounded bg-zinc-300 transition-all" style={{ width: `${(completedLayers / 7) * 100}%` }} /></div></div>}
    </div>
  );
}
