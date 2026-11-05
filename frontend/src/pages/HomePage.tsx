import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, FileUp, PlayCircle, Activity, Boxes, Fingerprint, GitBranch, Layers, Network, Radar, Scale, SearchCheck, ShieldCheck, Waypoints } from 'lucide-react';
import { PublicNav, Footer } from '../components/navigation/PublicNav';
import { HeroBackdrop, useHero3D } from '../components/graphs/HeroVisual';
import { HeroGraphic } from '../components/graphs/HeroGraphic';
import { useHomeMotion } from '../hooks/useHomeMotion';
import { ArchitectureExplorer } from '../components/common/ArchitectureExplorer';
import { Btn } from '../components/ui/ui';
import { FAMILIES, TOTAL_PATTERNS } from '../data/evidence';

const Section = ({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-16 border-t border-line py-20"><div className="mx-auto max-w-7xl px-5">
    <h2 data-reveal className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>{lead && <p data-reveal className="mt-3 max-w-2xl text-base text-mute">{lead}</p>}<div className="mt-10">{children}</div></div></section>
);

function Bars({ data, color, hi }: { data: number[]; color: string; hi?: number[] }) {
  const m = Math.max(...data);
  return <div data-bars className="flex h-24 items-end gap-1.5">{data.map((v, i) => <div key={i} data-hi={hi?.includes(i) ? 'true' : undefined} className="flex-1 rounded-t" style={{ height: `${(v / m) * 100}%`, background: hi?.includes(i) ? '#8e8e8e' : color, opacity: 0.85 }} />)}</div>;
}

function Problem() {
  return (
    <div className="space-y-8">
      <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2">
        <div className="bg-panel p-6"><div className="text-sm font-semibold text-gray-300">Declared: Sweet Crumbs Bakery</div><p className="mt-1 text-xs text-mute">Registered as MCC 5462. In-store and local deliveries.</p>
          <div className="mt-5 text-xs text-mute">Expected ticket sizes (₹150–1,200)</div><Bars data={[3, 8, 14, 18, 15, 10, 6, 3]} color="#adadad" />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded border border-line bg-panel2 py-2"><div className="text-lg font-semibold">1</div><div className="text-mute">state</div></div><div className="rounded border border-line bg-panel2 py-2"><div className="text-lg font-semibold">7–22</div><div className="text-mute">hours</div></div><div className="rounded border border-line bg-panel2 py-2"><div className="text-lg font-semibold">2×</div><div className="text-mute">Diwali peak</div></div></div></div>
        <div className="bg-panel p-6"><div className="text-sm font-semibold text-neutral-300">Observed: payment behaviour (synthetic)</div><p className="mt-1 text-xs text-mute">The same credentials, a different business.</p>
          <div className="mt-5 text-xs text-mute">Actual ticket sizes: heaped at ₹500, ₹1,000, ₹2,000</div><Bars data={[3, 2, 22, 3, 24, 2, 25, 1]} color="#727272" hi={[2, 4, 6]} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded border border-neutral-400/30 bg-neutral-400/5 py-2"><div className="text-lg font-semibold">9</div><div className="text-mute">other states</div></div><div className="rounded border border-neutral-400/30 bg-neutral-400/5 py-2"><div className="text-lg font-semibold">Pre-match</div><div className="text-mute">funding peaks</div></div><div className="rounded border border-neutral-400/30 bg-neutral-400/5 py-2"><div className="text-lg font-semibold">3×</div><div className="text-mute">collections</div></div></div></div>
      </div>
      <div data-stagger className="grid gap-3 md:grid-cols-5">
        {[['Disguised betting collections', 'Deposits from a betting app are routed through a retail merchant’s payment link.'], ['Transaction laundering', 'One merchant’s credentials process another business’s payments.'], ['Merchant identity misuse', 'A genuine registration is used for activity its owner never declared.'], ['Fabricated commercial activity', 'Sales that no order, shipment or purchaser can substantiate.'], ['Rotating collection accounts', 'When one account is flagged, a similar one takes over.']].map(([t, d]) => (
          <div key={t} className="rounded-md border border-line bg-panel p-4"><div className="text-sm font-medium">{t}</div><p className="mt-1.5 text-xs leading-relaxed text-mute">{d}</p></div>))}
      </div>
    </div>
  );
}

const TECH = [
  [Fingerprint, 'Merchant behavioural profiling', 'Declared profile turned into numeric expectations: ticket band, hours, geography, seasonality.'],
  [Activity, 'Residual and change-point detection', 'R = (V − E) / max(E, ε) against anchored, seasonal and rolling baselines.'],
  [Radar, 'CUSUM drift tracking', 'Accumulates only sustained excess, so a single busy week does not raise an alarm.'],
  [Boxes, `${TOTAL_PATTERNS} detection patterns, nine families`, 'Ticket, payer, timing, money flow, networks, settlement, provenance, drift and other abuse.'],
  [Network, 'Heterogeneous relationship graphs', 'Merchants, payers, links, sites, devices and beneficiaries joined by typed edges.'],
  [GitBranch, 'Cohort continuity', 'Detects behaviour that carries on from a dormant account into a new one.'],
  [Layers, 'Evidence fusion', 'Collapses correlated signals, sets UNKNOWN aside and requires independent families.'],
  [SearchCheck, 'Explainable investigation', 'Every signal states what was seen, what was expected and why it matters.'],
  [Scale, 'Governed response', 'Six proportionate levels with a separate legal-authority check.'],
] as const;

function Usecase({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return <div className="rounded-md border border-line bg-panel"><div className="border-b border-line bg-bg p-4">{children}</div><div className="p-5"><div className="text-base font-semibold">{title}</div><p className="mt-1.5 text-sm leading-relaxed text-mute">{text}</p></div></div>;
}
const svgp = { viewBox: '0 0 300 110', className: 'h-28 w-full' };

export function HomePage() {
  const loc = useLocation();
  const root = useRef<HTMLDivElement>(null);
  useHomeMotion(root);
  const hero3dOk = useHero3D();
  const [hero3dFailed, setHero3dFailed] = useState(false);
  const hero3d = hero3dOk && !hero3dFailed;
  useEffect(() => { const id = (loc.state as { scroll?: string } | null)?.scroll; if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50); }, [loc]);
  return (
    <div ref={root} className="min-h-screen bg-bg">
      <PublicNav />
      <section className={hero3d ? 'relative overflow-hidden lg:min-h-[720px]' : 'grid-bg relative overflow-hidden'}>
        {hero3d ? <><HeroBackdrop onFail={() => setHero3dFailed(true)} />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[64%] bg-gradient-to-r from-bg via-bg/85 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" /></>
          : <div className="glow absolute inset-0" />}
        <div className="pointer-events-none relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="pointer-events-auto"><div data-hero-in className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-300/25 bg-zinc-400/[0.06] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-200"><span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />Merchant intelligence for payment aggregators</div>
            <h1 data-hero-in className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">Your merchant’s identity is not its <span className="bg-gradient-to-r from-zinc-200 via-zinc-300 to-stone-300 bg-clip-text text-transparent">reality.</span></h1>
            <p data-hero-in className="mt-6 max-w-xl text-lg leading-relaxed text-mute">Merchant Reality Engine connects financial, operational and digital evidence to uncover disguised merchant activity, detect transaction laundering and distinguish legitimate businesses from fraudulent fronts.</p>
            <div data-hero-in className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              <Link to="/demo/portfolio" className="group rounded-lg border border-zinc-400/50 bg-zinc-400/[0.07] p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-400/[0.12]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-300"><FileUp size={15} />Demo</div>
                <div className="mt-1.5 text-base font-semibold text-ink">Review a merchant portfolio</div>
                <p className="mt-1 text-[13px] leading-snug text-mute">See which merchants the engine flags, open one to see why, with charts and records as proof. Add your own dataset.</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium text-zinc-300">Open portfolio <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></div>
              </Link>
              <Link to="/demo" className="group rounded-lg border border-line2 bg-panel/80 p-4 transition-colors hover:border-slate-400">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-300"><PlayCircle size={15} />Live system</div>
                <div className="mt-1.5 text-base font-semibold text-ink">Run a full investigation</div>
                <p className="mt-1 text-[13px] leading-snug text-mute">Watch all seven layers investigate four prepared merchants, then review, respond and audit.</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium text-ink">Open console <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></div>
              </Link>
            </div>
            <p data-hero-in className="mt-5 text-xs text-dim">Runs entirely in your browser on synthetic data. <Link to="/architecture" className="text-mute underline-offset-2 hover:text-ink hover:underline">Explore the architecture</Link></p></div>
          {!hero3d && <div className="h-[380px] lg:h-[460px]"><HeroGraphic /></div>}
        </div></section>

      <Section id="platform" title="A merchant can pass KYC and still be someone else’s front." lead="Onboarding checks who a merchant is. They do not check whether the payments flowing through it look like the business it declared. Transaction monitoring sees single payments; the contradiction lives in the whole picture."><Problem /></Section>

      <Section id="approach" title="From transaction monitoring to merchant reality intelligence." lead="MRE does not ask whether one payment looks fraudulent. It asks whether the merchant behaves like the business it claims to be.">
        <div data-stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Financial behaviour', 'Volume, ticket shape, refunds and settlement against the profile.'], ['Customer composition', 'Who pays, from where, and whether they come back.'], ['Commercial authenticity', 'Orders, fulfilment and independent purchaser confirmation.'], ['Digital provenance', 'Where payment links and checkouts actually live on the web.'], ['Network relationships', 'Shared infrastructure, cohorts and beneficiaries across merchants.'], ['Operational consistency', 'Hours, timing, seasonality and lifecycle against the declared business.']].map(([t, d], i) => (
          <div key={t} className="rounded-md border border-line bg-panel p-5"><div className="font-mono text-xs text-zinc-300">0{i + 1}</div><div className="mt-2 text-base font-medium">{t}</div><p className="mt-1 text-sm text-mute">{d}</p></div>))}</div>
      </Section>

      <Section id="how" title="Seven layers, from raw events to governed action." lead="Select a layer to see its inputs, processes, outputs and how it hands off to the next."><ArchitectureExplorer />
        <div className="mt-6"><Link to="/demo"><Btn variant="primary">Watch all seven layers run <ArrowRight size={15} /></Btn></Link></div></Section>

      <Section id="technology" title="Transparent methods, not a black-box score.">
        <div data-stagger className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">{TECH.map(([I, t, d]) => (
          <div key={t} className="bg-panel p-5"><I size={20} className="text-zinc-300" /><div className="mt-3 text-sm font-semibold">{t}</div><p className="mt-1 text-[13px] leading-relaxed text-mute">{d}</p></div>))}</div>
        <div data-stagger className="mt-6 flex flex-wrap gap-2">{FAMILIES.map(f => <span key={f.id} className="rounded border border-line bg-panel px-2.5 py-1 text-xs text-mute"><span className="mr-1.5 font-mono text-zinc-300">{f.id}</span>{f.name} <span className="text-dim">· {f.patterns}</span></span>)}</div>
        <p className="mt-3 text-xs text-dim">Pattern counts describe the design catalogue. The demo runs a subset of 20 as live detectors.</p>
      </Section>

      <Section id="use-cases" title="Three investigations MRE is built for.">
        <div data-stagger className="grid gap-4 lg:grid-cols-3">
          <Usecase title="Merchant account rotation" text="A collection account goes quiet and a new one starts with the same payers, ticket shape and settlement destination. Cohort continuity links them as a lead for review.">
            <svg {...svgp}><rect x="14" y="32" width="96" height="46" rx="5" fill="#101010" stroke="#535353" strokeDasharray="4 3" /><text x="62" y="60" textAnchor="middle" fontSize="11" fill="#989898">Account A · dormant</text><rect x="190" y="32" width="96" height="46" rx="5" fill="#101010" stroke="#afafaf" /><text x="238" y="60" textAnchor="middle" fontSize="11" fill="#ececec">Account B · new</text><path d="M112 55 L188 55" stroke="#a6a6a6" strokeDasharray="5 4" className="anim-dash" /><text x="150" y="46" textAnchor="middle" fontSize="9.5" fill="#a6a6a6">same payers</text><text x="150" y="96" textAnchor="middle" fontSize="9.5" fill="#989898">gap: 2 days</text></svg></Usecase>
          <Usecase title="Transaction laundering" text="A bakery’s payment link appears on a betting deposit page. Payments look retail on paper, but timing, geography, ticket sizes and refunds all point elsewhere.">
            <svg {...svgp}><rect x="10" y="34" width="84" height="42" rx="5" fill="#101010" stroke="#adadad" /><text x="52" y="59" textAnchor="middle" fontSize="11" fill="#ececec">Bakery</text><rect x="110" y="34" width="84" height="42" rx="5" fill="#101010" stroke="#afafaf" /><text x="152" y="59" textAnchor="middle" fontSize="10.5" fill="#ececec">Payment link</text><rect x="212" y="34" width="80" height="42" rx="5" fill="#101010" stroke="#8e8e8e" /><text x="252" y="59" textAnchor="middle" fontSize="10.5" fill="#ececec">Betting page</text><path d="M96 55 H108 M196 55 H210" stroke="#afafaf" className="anim-dash" /><text x="152" y="96" textAnchor="middle" fontSize="9.5" fill="#989898">undeclared offering behind retail credentials</text></svg></Usecase>
          <Usecase title="Fabricated commercial substance" text="A store looks real, but most payments have no order, shipments reuse tracking IDs and sampled purchasers do not recognise their payments.">
            <svg {...svgp}>{[['Payments', 100, '#afafaf'], ['Orders', 41, '#a6a6a6'], ['Delivered', 22, '#8e8e8e'], ['Confirmed', 25, '#8e8e8e']].map(([l, v, c], i) => <g key={l as string}><text x="12" y={24 + i * 22} fontSize="10" fill="#989898">{l as string}</text><rect x="80" y={15 + i * 22} width={(v as number) * 2.1} height="11" rx="2" fill={c as string} opacity=".8" /><text x={86 + (v as number) * 2.1} y={24 + i * 22} fontSize="10" fill="#d4d4d4">{v as number}%</text></g>)}</svg></Usecase>
        </div>
      </Section>

      <Section id="why" title="Why it is different from conventional monitoring.">
        <div className="overflow-hidden rounded-md border border-line"><table className="w-full text-left text-sm"><thead className="bg-panel2 text-xs text-mute"><tr><th className="px-4 py-3 font-medium">Conventional monitoring</th><th className="px-4 py-3 font-medium text-zinc-300">Merchant Reality Engine</th></tr></thead>
          <tbody data-stagger>{[['Flags individual anomalies', 'Finds joint patterns: round amount, far-away payer and match-time funding in the same payments'], ['Adds up scores, so correlated signals inflate risk', 'Collapses correlated signals and requires independent evidence families'], ['Checks identity and documents', 'Checks commercial reality: orders, fulfilment, provenance and settlement'], ['Automatic holds from a score', 'A human reviews competing explanations before any action'], ['Restricts the whole merchant', 'Narrowest effective action, such as one payment link']].map(([a, b]) => <tr key={a} className="border-t border-line"><td className="px-4 py-3.5 text-mute">{a}</td><td className="px-4 py-3.5">{b}</td></tr>)}</tbody></table></div>
        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-md border border-line bg-panel p-6"><ShieldCheck className="text-gray-300" /><p className="max-w-2xl flex-1 text-sm text-mute">One of the four demo scenarios is a legitimate Diwali surge. MRE sees the same volume alarm, finds verified orders and local customers, and opens no case.</p><Link to="/demo"><Btn variant="primary">Try all four scenarios <Waypoints size={15} /></Btn></Link></div>
      </Section>
      <Footer />
    </div>
  );
}
