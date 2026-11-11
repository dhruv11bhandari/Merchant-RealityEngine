import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Btn } from '../ui/ui';

export function useScrollTo() {
  const nav = useNavigate(), loc = useLocation();
  return (id: string) => {
    if (loc.pathname === '/' && loc.hash === `#${id}`) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    nav({ pathname: '/', hash: `#${id}` }, { state: { scroll: id }, preventScrollReset: true });
  };
}
const ITEMS = [['Platform', 'platform'], ['How It Works', 'how'], ['Technology', 'technology'], ['Use Cases', 'use-cases']] as const;

export function PublicNav({ landing = false }: { landing?: boolean }) {
  const go = useScrollTo(), [open, setOpen] = useState(false);
  if (landing) return (
    <header className="sticky top-0 z-40 bg-black px-5 pt-3 md:px-8">
      <nav className="mx-auto grid h-12 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center md:grid-cols-5" aria-label="Primary">
        <Link to="/demo" className="hidden justify-self-start text-[11px] font-semibold tracking-[.18em] text-[#6ee7b7] transition hover:text-[#a7f3d0] md:col-start-1 md:block">DEMO</Link>
        <Link to="/ai-engine" className="hidden justify-self-center text-[11px] font-semibold tracking-[.18em] text-[#6ee7b7] transition hover:text-[#a7f3d0] md:col-start-2 md:block">AI ENGINE</Link>
        <Link to="/" aria-label="Merchant Reality Engine home" className="col-start-2 justify-self-center text-[27px] font-black leading-none tracking-[-.07em] md:col-start-3">MRE.</Link>
        <button onClick={() => go('how')} className="hidden justify-self-center text-[11px] font-semibold tracking-[.18em] text-[#6ee7b7] transition hover:text-[#a7f3d0] md:col-start-4 md:block">HOW IT WORKS</button>
        <button onClick={() => go('workflow')} className="hidden justify-self-end text-[11px] font-semibold tracking-[.18em] text-[#6ee7b7] transition hover:text-[#a7f3d0] md:col-start-5 md:block">FLOWCHART</button>
        <button className="col-start-3 row-start-1 justify-self-end rounded p-2 text-[#6ee7b7] md:hidden" onClick={() => setOpen(v => !v)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </nav>
      {open && <div className="absolute inset-x-0 top-full z-50 grid gap-4 border-y border-white/15 bg-black px-6 py-5 text-xs font-semibold tracking-[.18em] text-[#6ee7b7] md:hidden"><Link onClick={() => setOpen(false)} to="/demo">DEMO</Link><Link onClick={() => setOpen(false)} to="/ai-engine">AI ENGINE</Link><button className="text-left" onClick={() => { setOpen(false); go('how'); }}>HOW IT WORKS</button><button className="text-left" onClick={() => { setOpen(false); go('workflow'); }}>FLOWCHART</button></div>}
    </header>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <Link to="/" aria-label="Merchant Reality Engine home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {ITEMS.map(([l, id]) => <button key={id} onClick={() => go(id)} className="rounded px-3 py-1.5 text-sm text-mute hover:text-ink">{l}</button>)}
          <Link to="/architecture" className="rounded px-3 py-1.5 text-sm text-mute hover:text-ink">Architecture</Link>
          <Link to="/ai-engine" className="rounded px-3 py-1.5 text-sm text-mute hover:text-ink">AI Engine</Link>
          <Link to="/demo" className="rounded px-3 py-1.5 text-sm text-mute hover:text-ink">Guided demo</Link>
        </nav>
        <div className="flex items-center gap-2"><Link to="/ai-engine"><Btn variant="primary" size="sm">Open AI Engine</Btn></Link>
          <button className="rounded p-1.5 text-mute md:hidden" onClick={() => setOpen(o => !o)} aria-label="Menu" aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button></div>
      </div>
      {open && <div className="border-t border-line px-5 py-3 md:hidden">{ITEMS.map(([l, id]) => <button key={id} onClick={() => { setOpen(false); go(id); }} className="block w-full py-2 text-left text-sm text-mute">{l}</button>)}
        <Link to="/architecture" className="block py-2 text-sm text-mute" onClick={() => setOpen(false)}>Architecture</Link><Link to="/ai-engine" className="block py-2 text-sm text-mute" onClick={() => setOpen(false)}>AI Engine</Link><Link to="/demo" className="block py-2 text-sm text-mute" onClick={() => setOpen(false)}>Guided demo</Link></div>}
    </header>
  );
}

export function Footer() {
  const go = useScrollTo();
  return (
    <footer className="border-t border-line bg-black">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-4">
        <div className="md:col-span-2"><Logo small /><p className="mt-3 max-w-sm text-sm text-mute">Does a merchant’s declared business match its financial, operational and digital behaviour?</p></div>
        <div className="text-sm"><div className="mb-2 font-medium">Product</div><div className="space-y-1.5 text-mute"><button onClick={() => go('platform')} className="block hover:text-ink">Platform</button><Link to="/architecture" className="block hover:text-ink">Architecture</Link><Link to="/ai-engine" className="block hover:text-ink">AI Engine</Link><Link to="/demo" className="block hover:text-ink">Demo</Link></div></div>
        <div className="text-sm"><div className="mb-2 font-medium">Contact</div><a href="mailto:321dhruv.b@gmail.com" className="text-mute hover:text-ink">321dhruv.b@gmail.com</a></div>
      </div>
      <div id="disclaimer" className="border-t border-line px-5 py-5"><p className="mx-auto max-w-7xl text-xs leading-relaxed text-dim">Disclaimer. Merchant Reality Engine is a prototype. All merchants, transactions, websites and figures are synthetic and illustrate the architecture; none is verified real-world evidence. References to other companies describe design inspiration only and imply no partnership, endorsement or use of proprietary technology. The response design is a product proposal, not a statement of legal or regulatory requirements, and the system never freezes funds automatically. There are no customers, testimonials or performance claims on this site.</p></div>
    </footer>
  );
}
