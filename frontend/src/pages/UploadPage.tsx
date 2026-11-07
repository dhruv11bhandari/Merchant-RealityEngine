import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Download, FileJson, FileUp, Play, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useInvestigation } from '../hooks/useInvestigation';
import { usePortfolio } from '../hooks/usePortfolio';
import { datasetToScenario, type ParseResult } from '../data/dataset';
import { MECHANISMS, RESPONSE_LEVELS } from '../data/evidence';
import { runPatternPack, LADDER } from '../engines/patternPack';
import { InvestigationPage } from './InvestigationPage';
import { PatternBoard } from '../components/common/PatternBoard';
import { Badge, Btn, Callout, Panel } from '../components/ui/ui';
import { cx } from '../utils/format';

const BASE = import.meta.env.BASE_URL;
const TEST_DATASETS = [
  { file: '01-sweet-crumbs-betting-front.json', title: 'Sweet Crumbs Bakery · suspected betting collections' },
  { file: '02-merchant-rotation.json', title: 'Nova Gift Emporium · merchant rotation' },
  { file: '03-fabricated-online-store.json', title: 'Aarav Home Decor Online · fabricated commercial activity' },
  { file: '04-anand-sweets-diwali-genuine.json', title: 'Anand Sweets & Bakes · genuine Diwali growth' },
];

export function UploadPage() {
  const { loadCustom, clearCustom, custom, scenarioId, result, user, started, allDone, detailsOpen, setDetailsOpen } = useInvestigation();
  const { addUploaded, clearUploaded } = usePortfolio();
  const [caseKey, setCaseKey] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [over, setOver] = useState(false);
  const [analysed, setAnalysed] = useState(false);
  const [sampleFile, setSampleFile] = useState('');
  const [loadingSample, setLoadingSample] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { clearCustom(); clearUploaded(); setCaseKey(null); }, [clearCustom, clearUploaded]);

  const read = (name: string, text: string) => {
    clearCustom();
    clearUploaded();
    setCaseKey(null);
    setFileName(name); setAnalysed(false);
    try { setParsed(datasetToScenario(JSON.parse(text))); }
    catch (e) { setParsed({ ok: false, errors: [`Could not read the file as JSON: ${(e as Error).message}`], warnings: [] }); }
  };
  const onFile = async (f?: File | null) => { if (f) read(f.name, await f.text()); };
  const loadSample = async () => {
    const sample = TEST_DATASETS.find(item => item.file === sampleFile);
    if (!sample) return;
    setLoadingSample(true);
    try {
      const response = await fetch(`${BASE}samples/${sample.file}`);
      if (!response.ok) throw new Error(`Could not load the test file (${response.status}).`);
      read(sample.title, await response.text());
    } catch (e) {
      clearCustom();
      clearUploaded();
      setCaseKey(null);
      setFileName(sample.title);
      setAnalysed(false);
      setParsed({ ok: false, errors: [(e as Error).message], warnings: [] });
    } finally {
      setLoadingSample(false);
    }
  };
  const analyse = () => { if (parsed?.scenario) { setDetailsOpen(false); loadCustom(parsed.scenario, true); setCaseKey(addUploaded(parsed.scenario)); setAnalysed(true); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const newAnalysis = () => {
    clearCustom(); clearUploaded(); setCaseKey(null); setParsed(null); setFileName(''); setAnalysed(false); setDetailsOpen(false);
    if (input.current) input.current.value = '';
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); };

  const hasRun = analysed && scenarioId === 'custom' && !!custom && started;
  const showSimulation = hasRun && !allDone;
  const showResult = hasRun && allDone;
  const fu = result.fusion, top = [...fu.mechanisms].sort((a, b) => b.score - a.score)[0];
  const pack = showResult ? runPatternPack(result, user.label) : null;
  const level = RESPONSE_LEVELS.find(l => l.id === result.review.recommended);
  const s = parsed?.summary;
  const datasetPanel = parsed && (
    <Panel title={<span className="flex items-center gap-2"><FileJson size={15} className="text-zinc-300" />{fileName}</span>}
      right={!analysed && parsed.ok ? <Btn variant="primary" onClick={analyse}><Play size={14} />Run all seven layers</Btn> : parsed.ok ? <Badge tone="ok">Dataset analyzed</Badge> : <Badge tone="bad">Cannot run</Badge>}>
      {!parsed.ok && <div className="space-y-1.5">{parsed.errors.map(e => <div key={e} className="flex gap-2 text-sm text-neutral-300"><X size={15} className="mt-0.5 shrink-0" />{e}</div>)}</div>}
      {s && (
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-mute">Merchant</div><div className="font-medium">{s.merchant}</div><div className="text-xs text-mute">{s.city} · {s.category}</div></div>
          <div><div className="text-xs text-mute">Ledger</div><div className="font-medium">{s.transactions} records</div><div className="text-xs text-mute">{s.sales} sales · {s.refunds} refunds · {s.settlements} settlements · {s.transfers} payouts</div></div>
          <div><div className="text-xs text-mute">Window</div><div className="font-medium">{s.from} → {s.to}</div><div className="text-xs text-mute">{s.weeks} weeks of history · {s.fixtures} match fixtures</div></div>
          <div><div className="text-xs text-mute">Data available</div><div className="flex flex-wrap gap-1">{s.available.map(k => <Badge key={k} tone="ok">{k}</Badge>)}{s.missing.map(k => <Badge key={k} tone="mute">{k}: missing</Badge>)}</div></div>
        </div>)}
      {parsed.warnings.length > 0 && <div className="mt-3 space-y-1">{parsed.warnings.map(w => <div key={w} className="flex gap-2 text-xs text-stone-300"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{w}</div>)}</div>}
    </Panel>
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">{showSimulation ? 'Investigation in progress' : showResult ? 'Investigation result' : 'Analyze a dataset'}</h1>
          <p className="mt-1 max-w-2xl text-sm text-mute">{showSimulation ? `${custom?.profile.name} is moving through the seven analysis layers.` : showResult ? `${custom?.profile.name} · completed across all seven layers.` : <>Upload a merchant’s data in the <span className="font-mono text-zinc-300">mre-dataset/v1</span> format. Your selected file runs through the seven analysis layers and returns a result with supporting evidence.</>}</p></div>
        {!analysed && <div className="flex gap-2"><a href={`${BASE}samples/DATASET_FORMAT.md`} download><Btn size="sm"><FileJson size={14} />Format guide</Btn></a><a href={`${BASE}samples/mre-dataset-template.json`} download><Btn size="sm"><Download size={14} />Empty template</Btn></a></div>}
      </div>

      {!analysed && <>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
          className={cx('flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors', over ? 'border-zinc-400 bg-zinc-400/5' : 'border-line2 bg-panel')}>
          <FileUp className="text-zinc-300" size={30} />
          <div className="text-sm font-medium">Drop a dataset (.json) here</div>
          <div className="text-xs text-mute">or</div>
          <Btn variant="primary" onClick={() => input.current?.click()}>Choose file</Btn>
          <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
          <div className="text-[11px] text-dim">Processed in your browser. Nothing is uploaded to a server.</div>
        </div>

        <Panel title="Before you run" subtitle="The engine analyzes only the file you choose.">
          <ul className="space-y-3 text-sm text-mute">
            <li><span className="font-medium text-ink">One merchant profile</span><br />Declared category, location and expected ticket range.</li>
            <li><span className="font-medium text-ink">Payment records</span><br />Transactions plus any refunds and settlements you have.</li>
            <li><span className="font-medium text-ink">Optional context</span><br />Calendar, payer geography and checkout source improve coverage.</li>
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs text-dim">Use the empty template to see the required file structure. Loading a file prepares one merchant for review; it does not start the investigation.</p>
        </Panel>
      </div>

      <Panel title="Use a built-in test file" subtitle="Choose one of four sample datasets if you do not have a file of your own.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select value={sampleFile} onChange={e => setSampleFile(e.target.value)} disabled={loadingSample} className="min-h-10 min-w-0 flex-1 rounded border border-line2 bg-panel2 px-3 text-sm text-ink outline-none focus:border-zinc-400 disabled:opacity-50">
            <option value="">Choose a test file</option>
            {TEST_DATASETS.map(sample => <option key={sample.file} value={sample.file}>{sample.title}</option>)}
          </select>
          <Btn variant="outline" disabled={!sampleFile || loadingSample} onClick={loadSample}><FileJson size={14} />{loadingSample ? 'Loading file…' : 'Load test file'}</Btn>
        </div>
        <p className="mt-3 text-xs text-dim">The selected file will appear below for review. Press “Run all seven layers” when you are ready.</p>
      </Panel>
      </>}

      {!analysed && datasetPanel}

      {showSimulation && <InvestigationPage progressOnly />}

      {showResult && (
        <>
        <Panel title="Final result" subtitle={fu.gateReason} right={<Badge tone={fu.decision === 'OPEN_CASE' ? 'bad' : 'ok'}>{fu.decision === 'OPEN_CASE' ? `${fu.priority} priority` : 'No case opened'}</Badge>}>
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><div className="text-xs text-mute">Outcome</div><div className="mt-1 font-medium">{fu.decision === 'OPEN_CASE' ? 'Analyst review opened' : 'Activity explained'}</div></div>
            <div><div className="text-xs text-mute">Leading finding</div><div className="mt-1 font-medium">{fu.decision === 'OPEN_CASE' && top ? `${MECHANISMS.find(m => m.id === top.id)?.name ?? top.id} (${top.score.toFixed(2)})` : 'No remaining risk signal'}</div></div>
            <div><div className="text-xs text-mute">Recommended response</div><div className="mt-1 font-medium">{level?.id} · {level?.name}</div></div>
            {pack && <div><div className="text-xs text-mute">Trust ladder</div><div className="mt-1 font-medium">{LADDER.find(l => l.id === pack.ladder)?.name}</div></div>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Btn variant="primary" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen} aria-controls="analysis-evidence">{detailsOpen ? 'Hide evidence' : 'Evidence'} <ArrowRight size={14} /></Btn>
            <Btn onClick={newAnalysis}><FileUp size={14} />Analyze another dataset</Btn>
          </div>
        </Panel>

        {detailsOpen && pack && <div id="analysis-evidence" className="scroll-mt-20 space-y-6">
          {datasetPanel}
          <div className={cx('rounded-lg border p-5', fu.decision === 'OPEN_CASE' ? 'border-neutral-400/50 bg-neutral-400/[0.06]' : 'border-gray-400/50 bg-gray-400/[0.06]')}>
            <div className="flex flex-wrap items-start gap-4">
              {fu.decision === 'OPEN_CASE' ? <ShieldAlert className="text-neutral-300" size={34} /> : <ShieldCheck className="text-gray-300" size={34} />}
              <div className="min-w-0 flex-1">
                <div className={cx('text-xl font-semibold', fu.decision === 'OPEN_CASE' ? 'text-neutral-200' : 'text-gray-200')}>{fu.decision === 'OPEN_CASE' ? `Case opened · ${fu.priority} priority` : 'No case opened'}</div>
                <div className="mt-1 text-sm text-mute">{fu.gateReason}</div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><div className="text-xs text-mute">Leading hypothesis</div><div className="font-medium">{fu.decision === 'OPEN_CASE' && top ? `${MECHANISMS.find(m => m.id === top.id)?.name ?? top.id} (${top.score.toFixed(2)})` : 'None: alarm explained'}</div></div>
                  <div><div className="text-xs text-mute">Legitimate-business explanation</div><div className="font-medium">{result.review.legitStatus === 'HOLDS' ? 'Holds' : result.review.legitStatus === 'FAILED' ? 'Fails' : 'Inconclusive'}</div></div>
                  <div><div className="text-xs text-mute">Recommended response</div><div className="font-medium">{level?.id} · {level?.name}</div></div>
                  <div><div className="text-xs text-mute">Trust ladder</div><div className="font-medium">{LADDER.find(l => l.id === pack.ladder)!.name}</div></div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {caseKey && <Link to={`/ai-engine/portfolio/${caseKey}`}><Btn size="sm" variant="primary">Why: reasons and proof <ArrowRight size={13} /></Btn></Link>}
              {[['Investigation (all layers)', '/ai-engine/investigations'], ['Evidence graph', '/ai-engine/graph'], ['Analyst workbench', '/ai-engine/analyst'], ['Response centre', '/ai-engine/response']].map(([l, to]) => <Link key={to} to={to}><Btn size="sm">{l} <ArrowRight size={13} /></Btn></Link>)}
            </div>
          </div>
          <Callout tone="info" title="Every flag, by pattern type">Core detectors feed the verdict above. Solution patterns S1–S7 and the new betting patterns N1–N3 run alongside and set the trust ladder.</Callout>
          <PatternBoard res={result} label={user.label} />
        </div>}
        </>
      )}
    </>
  );
}
