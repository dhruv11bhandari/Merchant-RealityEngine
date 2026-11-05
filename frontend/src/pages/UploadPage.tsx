import { useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Download, FileJson, FileUp, Play, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useInvestigation } from '../hooks/useInvestigation';
import { usePortfolio } from '../hooks/usePortfolio';
import { datasetToScenario, type ParseResult } from '../data/dataset';
import { MECHANISMS, RESPONSE_LEVELS } from '../data/evidence';
import { runPatternPack, LADDER } from '../engines/patternPack';
import { PatternBoard } from '../components/common/PatternBoard';
import { Badge, Btn, Callout, Panel } from '../components/ui/ui';
import { cx } from '../utils/format';

const BASE = import.meta.env.BASE_URL;
export const SAMPLES = [
  { file: '01-sweet-crumbs-betting-front.json', name: 'Sweet Crumbs Bakery', kind: 'Suspicious', note: 'Bakery collecting betting top-ups' },
  { file: '05-chai-corner-night-betting.json', name: 'Chai Corner Café', kind: 'Suspicious · new', note: 'Late-night top-ups and loss-chasing' },
  { file: '02-merchant-rotation.json', name: 'Nova Gift Emporium', kind: 'Suspicious', note: 'Replaces a dormant account' },
  { file: '03-fabricated-online-store.json', name: 'Aarav Home Decor Online', kind: 'Suspicious', note: 'Sales with no real orders' },
  { file: '04-anand-sweets-diwali-genuine.json', name: 'Anand Sweets & Bakes', kind: 'Genuine', note: 'Real 3× Diwali surge' },
  { file: '06-shree-ganesh-sweets-genuine.json', name: 'Shree Ganesh Sweets', kind: 'Genuine · new', note: 'Real festive surge in Pune' },
  { file: '07-udupi-tiffin-steady.json', name: 'Udupi Tiffin Corner', kind: 'Genuine · new', note: 'Steady local trade' },
  { file: '08-nandi-kirana-genuine.json', name: 'Nandi Kirana & General', kind: 'Genuine · new', note: 'Grocer with a festive lift' },
];

export function UploadPage() {
  const { loadCustom, custom, scenarioId, result, user } = useInvestigation();
  const { addUploaded } = usePortfolio();
  const [caseKey, setCaseKey] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [analysed, setAnalysed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const read = (name: string, text: string) => {
    setFileName(name); setAnalysed(false);
    try { setParsed(datasetToScenario(JSON.parse(text))); }
    catch (e) { setParsed({ ok: false, errors: [`Could not read the file as JSON: ${(e as Error).message}`], warnings: [] }); }
  };
  const onFile = async (f?: File | null) => { if (f) read(f.name, await f.text()); };
  const loadSample = async (file: string) => {
    setBusy(true);
    try { const r = await fetch(`${BASE}samples/${file}`); read(file, await r.text()); } finally { setBusy(false); }
  };
  const analyse = () => { if (parsed?.scenario) { loadCustom(parsed.scenario, true); setCaseKey(addUploaded(parsed.scenario)); setAnalysed(true); setTimeout(() => document.getElementById('verdict')?.scrollIntoView({ behavior: 'smooth' }), 60); } };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); };

  const showResult = analysed && scenarioId === 'custom' && custom;
  const fu = result.fusion, top = [...fu.mechanisms].sort((a, b) => b.score - a.score)[0];
  const pack = showResult ? runPatternPack(result, user.label) : null;
  const level = RESPONSE_LEVELS.find(l => l.id === result.review.recommended);
  const s = parsed?.summary;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Analyze a dataset</h1>
          <p className="mt-1 max-w-2xl text-sm text-mute">Upload a merchant’s data in the <span className="font-mono text-zinc-300">mre-dataset/v1</span> format. It runs through the same seven layers as the built-in cases and returns every flag, the verdict and a proportionate response.</p></div>
        <div className="flex gap-2"><a href={`${BASE}samples/DATASET_FORMAT.md`} download><Btn size="sm"><FileJson size={14} />Format guide</Btn></a><a href={`${BASE}samples/mre-dataset-template.json`} download><Btn size="sm"><Download size={14} />Empty template</Btn></a></div>
      </div>

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

        <Panel title="Sample datasets" subtitle="Generated synthetic data in the upload format. Load one, or download it and edit it to test the engine.">
          <div className="space-y-1.5">{SAMPLES.map(x => (
            <div key={x.file} className={cx('flex items-center gap-3 rounded border px-3 py-2', fileName === x.file ? 'border-zinc-400/60 bg-zinc-400/5' : 'border-line')}>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-sm"><span className="truncate">{x.name}</span><Badge tone={x.kind.startsWith('Genuine') ? 'ok' : 'bad'}>{x.kind}</Badge></div><div className="truncate text-xs text-mute">{x.note}</div></div>
              <Btn size="sm" disabled={busy} onClick={() => loadSample(x.file)}>Load</Btn>
              <a href={`${BASE}samples/${x.file}`} download aria-label={`Download ${x.name}`}><Btn size="sm" variant="ghost"><Download size={13} /></Btn></a>
            </div>))}</div>
        </Panel>
      </div>

      {parsed && (
        <Panel title={<span className="flex items-center gap-2"><FileJson size={15} className="text-zinc-300" />{fileName}</span>}
          right={parsed.ok ? <Btn variant="primary" onClick={analyse}><Play size={14} />Run all seven layers</Btn> : <Badge tone="bad">Cannot run</Badge>}>
          {!parsed.ok && <div className="space-y-1.5">{parsed.errors.map(e => <div key={e} className="flex gap-2 text-sm text-neutral-300"><X size={15} className="mt-0.5 shrink-0" />{e}</div>)}</div>}
          {s && (
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><div className="text-xs text-mute">Merchant</div><div className="font-medium">{s.merchant}</div><div className="text-xs text-mute">{s.city} · {s.category}</div></div>
              <div><div className="text-xs text-mute">Ledger</div><div className="font-medium">{s.transactions} records</div><div className="text-xs text-mute">{s.sales} sales · {s.refunds} refunds · {s.settlements} settlements · {s.transfers} payouts</div></div>
              <div><div className="text-xs text-mute">Window</div><div className="font-medium">{s.from} → {s.to}</div><div className="text-xs text-mute">{s.weeks} weeks of history · {s.fixtures} match fixtures</div></div>
              <div><div className="text-xs text-mute">Data available</div><div className="flex flex-wrap gap-1">{s.available.map(k => <Badge key={k} tone="ok">{k}</Badge>)}{s.missing.map(k => <Badge key={k} tone="mute">{k}: missing</Badge>)}</div></div>
            </div>)}
          {parsed.warnings.length > 0 && <div className="mt-3 space-y-1">{parsed.warnings.map(w => <div key={w} className="flex gap-2 text-xs text-stone-300"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{w}</div>)}</div>}
        </Panel>)}

      {showResult && pack && (
        <div id="verdict" className="scroll-mt-20 space-y-6">
          <div className={cx('rounded-lg border p-5', fu.decision === 'OPEN_CASE' ? 'border-neutral-400/50 bg-neutral-400/[0.06]' : 'border-gray-400/50 bg-gray-400/[0.06]')}>
            <div className="flex flex-wrap items-start gap-4">
              {fu.decision === 'OPEN_CASE' ? <ShieldAlert className="text-neutral-300" size={34} /> : <ShieldCheck className="text-gray-300" size={34} />}
              <div className="min-w-0 flex-1">
                <div className={cx('text-xl font-semibold', fu.decision === 'OPEN_CASE' ? 'text-neutral-200' : 'text-gray-200')}>{fu.decision === 'OPEN_CASE' ? `Case opened · ${fu.priority} priority` : 'No case opened'}</div>
                <div className="mt-1 text-sm text-mute">{fu.gateReason}</div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><div className="text-xs text-mute">Leading hypothesis</div><div className="font-medium">{fu.decision === 'OPEN_CASE' ? `${MECHANISMS.find(m => m.id === top.id)!.name} (${top.score.toFixed(2)})` : 'None: alarm explained'}</div></div>
                  <div><div className="text-xs text-mute">Legitimate-business explanation</div><div className="font-medium">{result.review.legitStatus === 'HOLDS' ? 'Holds' : result.review.legitStatus === 'FAILED' ? 'Fails' : 'Inconclusive'}</div></div>
                  <div><div className="text-xs text-mute">Recommended response</div><div className="font-medium">{level?.id} · {level?.name}</div></div>
                  <div><div className="text-xs text-mute">Trust ladder</div><div className="font-medium">{LADDER.find(l => l.id === pack.ladder)!.name}</div></div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {caseKey && <Link to={`/demo/portfolio/${caseKey}`}><Btn size="sm" variant="primary">Why: reasons and proof <ArrowRight size={13} /></Btn></Link>}
              {[['Investigation (all layers)', '/demo/investigations'], ['Evidence graph', '/demo/graph'], ['Analyst workbench', '/demo/analyst'], ['Response centre', '/demo/response']].map(([l, to]) => <Link key={to} to={to}><Btn size="sm">{l} <ArrowRight size={13} /></Btn></Link>)}
            </div>
          </div>
          <Callout tone="info" title="Every flag, by pattern type">Core detectors feed the verdict above. Solution patterns S1–S7 and the new betting patterns N1–N3 run alongside and set the trust ladder.</Callout>
          <PatternBoard res={result} label={user.label} />
        </div>)}
    </>
  );
}
