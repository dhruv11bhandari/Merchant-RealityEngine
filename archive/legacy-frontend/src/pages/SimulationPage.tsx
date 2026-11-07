import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { PublicNav, Footer } from '../components/navigation/PublicNav';
import { Btn } from '../components/ui/ui';

export function SimulationPage() {
  const [revision, setRevision] = useState(0);
  return (
    <div className="min-h-screen bg-bg">
      <PublicNav />
      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-300">ENGINE · PYTHON MODEL</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Merchant Reality Engine</h1>
            <p className="mt-1 max-w-3xl text-sm text-mute">This page shows the separate Python model running across its merchant, transaction, refund, and settlement datasets. The model output is independent from the illustrative scenarios on the Demo page.</p>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" onClick={() => setRevision(n => n + 1)}><RefreshCw size={14} />Reload results</Btn>
            <a href="/real-model.html" target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-2 rounded border border-line2 px-3 text-xs text-mute hover:text-ink"><ExternalLink size={14} />Open dashboard</a>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <iframe key={revision} title="Merchant Reality Engine Python model dashboard" src={`/real-model.html?view=${revision}`} className="block h-[78vh] min-h-[680px] w-full bg-white" />
        </div>
        <div className="mt-4"><Link to="/demo" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:underline"><ArrowLeft size={15} />Back to the guided demo</Link></div>
      </main>
      <Footer />
    </div>
  );
}
