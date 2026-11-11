import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { MathUtils, Vector2 } from 'three';
import { ArrowUpRight, ArrowRight, Activity, Boxes, Fingerprint, GitBranch, Layers, Network, Radar, Scale, SearchCheck, ShieldCheck, Waypoints } from 'lucide-react';
import { PublicNav, Footer } from '../components/navigation/PublicNav';
import { ArchitectureExplorer } from '../components/common/ArchitectureExplorer';
import { FlowchartExperience } from '../components/common/FlowchartExperience';
import { Btn } from '../components/ui/ui';
import { FAMILIES, TOTAL_PATTERNS } from '../data/evidence';

const Section = ({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-16 border-t border-line py-20"><div className="mx-auto max-w-7xl px-5">
    <h2 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>{lead && <p className="mt-3 max-w-2xl text-base text-mute">{lead}</p>}<div className="mt-10">{children}</div></div></section>
);


function Bars({ data, color, hi }: { data: number[]; color: string; hi?: number[] }) {
  const m = Math.max(...data);
  return <div className="flex h-24 items-end gap-1.5">{data.map((v, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${(v / m) * 100}%`, background: hi?.includes(i) ? '#f87171' : color, opacity: 0.85 }} />)}</div>;
}

function Problem() {
  return (
    <div className="space-y-8">
      <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2">
        <div className="bg-panel p-6"><div className="text-sm font-semibold text-emerald-300">Declared: Sweet Crumbs Bakery</div><p className="mt-1 text-xs text-mute">Registered as MCC 5462. In-store and local deliveries.</p>
          <div className="mt-5 text-xs text-mute">Expected ticket sizes (₹150–1,200)</div><Bars data={[3, 8, 14, 18, 15, 10, 6, 3]} color="#34d399" />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded border border-line bg-panel2 py-2"><div className="text-lg font-semibold">1</div><div className="text-mute">state</div></div><div className="rounded border border-line bg-panel2 py-2"><div className="text-lg font-semibold">7–22</div><div className="text-mute">hours</div></div><div className="rounded border border-line bg-panel2 py-2"><div className="text-lg font-semibold">2×</div><div className="text-mute">Diwali peak</div></div></div></div>
        <div className="bg-panel p-6"><div className="text-sm font-semibold text-red-300">Observed: payment behaviour (synthetic)</div><p className="mt-1 text-xs text-mute">The same credentials, a different business.</p>
          <div className="mt-5 text-xs text-mute">Actual ticket sizes: heaped at ₹500, ₹1,000, ₹2,000</div><Bars data={[3, 2, 22, 3, 24, 2, 25, 1]} color="#64748b" hi={[2, 4, 6]} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded border border-red-400/30 bg-red-400/5 py-2"><div className="text-lg font-semibold">9</div><div className="text-mute">other states</div></div><div className="rounded border border-red-400/30 bg-red-400/5 py-2"><div className="text-lg font-semibold">Pre-match</div><div className="text-mute">funding peaks</div></div><div className="rounded border border-red-400/30 bg-red-400/5 py-2"><div className="text-lg font-semibold">3×</div><div className="text-mute">collections</div></div></div></div>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
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
  const heroRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLImageElement>(null);
  const coinRef = useRef<HTMLImageElement>(null);
  useEffect(() => { const id = (loc.state as { scroll?: string } | null)?.scroll; if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50); }, [loc]);
  useEffect(() => {
    const hero = heroRef.current, note = noteRef.current, coin = coinRef.current;
    if (!hero || !note || !coin || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const pointer = new Vector2();
    const quick = (target: HTMLElement, property: string) => gsap.quickTo(target, property, { duration: 0.65, ease: 'power3.out' });
    const noteX = quick(note, 'x'), noteY = quick(note, 'y');
    const noteTiltX = quick(note, 'rotationX'), noteTiltY = quick(note, 'rotationY');
    const coinX = quick(coin, 'x'), coinY = quick(coin, 'y');
    const coinTiltX = quick(coin, 'rotationX'), coinTiltY = quick(coin, 'rotationY');

    const move = (event: PointerEvent) => {
      const bounds = hero.getBoundingClientRect();
      pointer.set(
        MathUtils.clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
        MathUtils.clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1),
      );
      noteX(pointer.x * 12); noteY(pointer.y * 10);
      noteTiltX(pointer.y * -5); noteTiltY(pointer.x * 6);
      coinX(pointer.x * 18); coinY(pointer.y * 14);
      coinTiltX(pointer.y * -7); coinTiltY(pointer.x * 9);
    };
    const reset = () => {
      noteX(0); noteY(0); noteTiltX(0); noteTiltY(0);
      coinX(0); coinY(0); coinTiltX(0); coinTiltY(0);
    };
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', reset);
    return () => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', reset); gsap.killTweensOf([note, coin]); };
  }, []);
  return (
    <div className="mre-page min-h-screen bg-black text-white">
      <PublicNav landing />
      <section ref={heroRef} className="mre-hero relative isolate flex min-h-[calc(100svh-60px)] flex-col justify-center overflow-hidden px-5 pb-20 pt-12 md:px-10 md:pb-10 md:pt-4">
        <div className="mre-metric mre-metric-left"><span>TRANSACTIONS</span><strong>12.4M+</strong></div>
        <div className="mre-metric mre-metric-right"><span>MERCHANTS</span><strong>2.1M+</strong></div>
        <img ref={noteRef} className="mre-note" src="/images/rupee-500-note.png" alt="Floating Indian five hundred rupee note" />
        <div className="relative z-10 mx-auto w-full max-w-[1080px]">
          <h1 className="mre-title"><span>SEE THE BUSINESS</span><span>BEHIND EVERY</span><span>PAYMENT.</span><img ref={coinRef} className="mre-coin" src="/images/rupee-10-coin.png" alt="" aria-hidden="true" /></h1>
          <p className="mre-tagline">MERCHANT REALITY ENGINE</p>
          <Link to="/demo" className="mre-cta">TRY DEMO <ArrowUpRight size={18} strokeWidth={2.5} /></Link>
        </div>
        <div className="mre-footer-left">MERCHANT REALITY / 001</div>
        <div className="mre-footer-right">MERCHANT REALITY ENGINE</div>
      </section>

      <Section id="platform" title="A merchant can pass KYC and still be someone else’s front." lead="Onboarding checks who a merchant is. They do not check whether the payments flowing through it look like the business it declared. Transaction monitoring sees single payments; the contradiction lives in the whole picture."><Problem /></Section>

      <Section id="approach" title="From transaction monitoring to merchant reality." lead="MRE does not ask whether one payment looks fraudulent. It asks whether the merchant behaves like the business it claims to be.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Financial behaviour', 'Volume, ticket shape, refunds and settlement against the profile.'], ['Customer composition', 'Who pays, from where, and whether they come back.'], ['Commercial authenticity', 'Orders, fulfilment and independent purchaser confirmation.'], ['Digital provenance', 'Where payment links and checkouts actually live on the web.'], ['Network relationships', 'Shared infrastructure, cohorts and beneficiaries across merchants.'], ['Operational consistency', 'Hours, timing, seasonality and lifecycle against the declared business.']].map(([t, d], i) => (
          <div key={t} className="rounded-md border border-line bg-panel p-5"><div className="font-mono text-xs text-cyan-300">0{i + 1}</div><div className="mt-2 text-base font-medium">{t}</div><p className="mt-1 text-sm text-mute">{d}</p></div>))}</div>
      </Section>

      <Section id="how" title="Seven layers, from raw events to governed action." lead="Select a layer to see its inputs, processes, outputs and how it hands off to the next."><ArchitectureExplorer />
        <div id="workflow" className="mt-12 scroll-mt-16">
          <div className="mb-7 rounded-lg border border-white/25 bg-white/[.04] px-5 py-5 text-center md:py-6">
            <h3 className="text-xl font-bold tracking-tight text-white md:text-3xl">Click a layer below to open its detailed flowchart</h3>
          </div>
          <FlowchartExperience mode="workflow" />
        </div>
        <div className="mt-6"><Link to="/demo"><Btn variant="primary">Watch a seven-layer demo <ArrowRight size={15} /></Btn></Link></div></Section>

      <Section id="technology" title="Transparent methods, not a black-box score.">
        <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">{TECH.map(([I, t, d]) => (
          <div key={t} className="bg-panel p-5"><I size={20} className="text-cyan-300" /><div className="mt-3 text-sm font-semibold">{t}</div><p className="mt-1 text-[13px] leading-relaxed text-mute">{d}</p></div>))}</div>
        <div className="mt-6 flex flex-wrap gap-2">{FAMILIES.map(f => <span key={f.id} className="rounded border border-line bg-panel px-2.5 py-1 text-xs text-mute"><span className="mr-1.5 font-mono text-cyan-300">{f.id}</span>{f.name} <span className="text-dim">· {f.patterns}</span></span>)}</div>
        <p className="mt-3 text-xs text-dim">Pattern counts describe the design catalogue. The demo runs a subset of 21 as live detectors.</p>
      </Section>

      <Section id="use-cases" title="Three investigations MRE is built for.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Usecase title="Merchant account rotation" text="A collection account goes quiet and a new one starts with the same payers, ticket shape and settlement destination. Cohort continuity links them as a lead for review.">
            <svg {...svgp}><rect x="14" y="32" width="96" height="46" rx="5" fill="#0a101b" stroke="#475569" strokeDasharray="4 3" /><text x="62" y="60" textAnchor="middle" fontSize="11" fill="#8a99b3">Account A · dormant</text><rect x="190" y="32" width="96" height="46" rx="5" fill="#0a101b" stroke="#22d3ee" /><text x="238" y="60" textAnchor="middle" fontSize="11" fill="#e6edf7">Account B · new</text><path d="M112 55 L188 55" stroke="#f59e0b" strokeDasharray="5 4" className="anim-dash" /><text x="150" y="46" textAnchor="middle" fontSize="9.5" fill="#f59e0b">same payers</text><text x="150" y="96" textAnchor="middle" fontSize="9.5" fill="#8a99b3">gap: 2 days</text></svg></Usecase>
          <Usecase title="Transaction laundering" text="A bakery’s payment link appears on a betting deposit page. Payments look retail on paper, but timing, geography, ticket sizes and refunds all point elsewhere.">
            <svg {...svgp}><rect x="10" y="34" width="84" height="42" rx="5" fill="#0a101b" stroke="#34d399" /><text x="52" y="59" textAnchor="middle" fontSize="11" fill="#e6edf7">Bakery</text><rect x="110" y="34" width="84" height="42" rx="5" fill="#0a101b" stroke="#22d3ee" /><text x="152" y="59" textAnchor="middle" fontSize="10.5" fill="#e6edf7">Payment link</text><rect x="212" y="34" width="80" height="42" rx="5" fill="#0a101b" stroke="#f87171" /><text x="252" y="59" textAnchor="middle" fontSize="10.5" fill="#e6edf7">Betting page</text><path d="M96 55 H108 M196 55 H210" stroke="#22d3ee" className="anim-dash" /><text x="152" y="96" textAnchor="middle" fontSize="9.5" fill="#8a99b3">undeclared offering behind retail credentials</text></svg></Usecase>
          <Usecase title="Fabricated commercial substance" text="A store looks real, but most payments have no order, shipments reuse tracking IDs and sampled purchasers do not recognise their payments.">
            <svg {...svgp}>{[['Payments', 100, '#22d3ee'], ['Orders', 41, '#f59e0b'], ['Delivered', 22, '#f87171'], ['Confirmed', 25, '#f87171']].map(([l, v, c], i) => <g key={l as string}><text x="12" y={24 + i * 22} fontSize="10" fill="#8a99b3">{l as string}</text><rect x="80" y={15 + i * 22} width={(v as number) * 2.1} height="11" rx="2" fill={c as string} opacity=".8" /><text x={86 + (v as number) * 2.1} y={24 + i * 22} fontSize="10" fill="#cbd5e1">{v as number}%</text></g>)}</svg></Usecase>
        </div>
      </Section>

      <Section id="why" title="Why it is different from conventional monitoring.">
        <div className="overflow-hidden rounded-md border border-line"><table className="w-full text-left text-sm"><thead className="bg-panel2 text-xs text-mute"><tr><th className="px-4 py-3 font-medium">Conventional monitoring</th><th className="px-4 py-3 font-medium text-cyan-300">Merchant Reality Engine</th></tr></thead>
          <tbody>{[['Flags individual anomalies', 'Finds joint patterns: round amount, far-away payer and match-time funding in the same payments'], ['Adds up scores, so correlated signals inflate risk', 'Collapses correlated signals and requires independent evidence families'], ['Checks identity and documents', 'Checks commercial reality: orders, fulfilment, provenance and settlement'], ['Automatic holds from a score', 'A human reviews competing explanations before any action'], ['Restricts the whole merchant', 'Narrowest effective action, such as one payment link']].map(([a, b]) => <tr key={a} className="border-t border-line"><td className="px-4 py-3.5 text-mute">{a}</td><td className="px-4 py-3.5">{b}</td></tr>)}</tbody></table></div>
        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-md border border-line bg-panel p-6"><ShieldCheck className="text-emerald-300" /><p className="max-w-2xl flex-1 text-sm text-mute">One of the four demo scenarios is a legitimate Diwali surge. MRE sees the same volume alarm, finds verified orders and local customers, and opens no case.</p><Link to="/demo"><Btn variant="primary">Try all four scenarios <Waypoints size={15} /></Btn></Link></div>
      </Section>
      <section id="company-influences" className="border-t border-line py-16"><div className="mx-auto max-w-7xl px-5"><FlowchartExperience mode="studies" /></div></section>
      <Footer />
    </div>
  );
}
