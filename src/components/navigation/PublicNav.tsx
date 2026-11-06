import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Btn } from '../ui/ui';

export function useScrollTo() {
  const nav = useNavigate(), loc = useLocation();
  return (id: string) => {
    if (loc.pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else nav('/', { state: { scroll: id } });
  };
}
const ITEMS = [['Platform', 'platform'], ['How It Works', 'how'], ['Technology', 'technology'], ['Use Cases', 'use-cases']] as const;

export function PublicNav() {
  const go = useScrollTo(), [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <Link to="/" aria-label="Merchant Reality Engine home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {ITEMS.map(([l, id]) => <button key={id} onClick={() => go(id)} className="rounded px-3 py-1.5 text-sm text-mute hover:text-ink">{l}</button>)}
          <Link to="/architecture" className="rounded px-3 py-1.5 text-sm text-mute hover:text-ink">Architecture</Link>
          <Link to="/demo" className="rounded px-3 py-1.5 text-sm text-mute hover:text-ink">Demo</Link>
          <Link to="/engine" className="rounded px-3 py-1.5 text-sm text-mute hover:text-ink">Enter the Engine</Link>
        </nav>
        <div className="flex items-center gap-2"><Link to="/demo"><Btn variant="primary" size="sm">Open Demo</Btn></Link>
          <button className="rounded p-1.5 text-mute md:hidden" onClick={() => setOpen(o => !o)} aria-label="Menu" aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button></div>
      </div>
      {open && <div className="border-t border-line px-5 py-3 md:hidden">{ITEMS.map(([l, id]) => <button key={id} onClick={() => { setOpen(false); go(id); }} className="block w-full py-2 text-left text-sm text-mute">{l}</button>)}
        <Link to="/architecture" className="block py-2 text-sm text-mute" onClick={() => setOpen(false)}>Architecture</Link><Link to="/demo" className="block py-2 text-sm text-mute" onClick={() => setOpen(false)}>Demo</Link><Link to="/engine" className="block py-2 text-sm text-mute" onClick={() => setOpen(false)}>Enter the Engine</Link></div>}
    </header>
  );
}

export function Footer() {
  const go = useScrollTo();
  return (
    <footer className="border-t border-line bg-panel/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-4">
        <div className="md:col-span-2"><Logo small /><p className="mt-3 max-w-sm text-sm text-mute">Does a merchant’s declared business match its financial, operational and digital behaviour?</p></div>
        <div className="text-sm"><div className="mb-2 font-medium">Product</div><div className="space-y-1.5 text-mute"><button onClick={() => go('platform')} className="block hover:text-ink">Platform</button><Link to="/architecture" className="block hover:text-ink">Architecture</Link><Link to="/demo" className="block hover:text-ink">Demo</Link><Link to="/engine" className="block hover:text-ink">Enter the Engine</Link></div></div>
        <div className="text-sm"><div className="mb-2 font-medium">Contact</div><a href="mailto:hello@merchantrealityengine.example" className="text-mute hover:text-ink">hello@merchantrealityengine.example</a><div className="mt-1 text-xs text-dim">Placeholder address for this prototype.</div></div>
      </div>
      <div id="disclaimer" className="border-t border-line px-5 py-5"><p className="mx-auto max-w-7xl text-xs leading-relaxed text-dim">Disclaimer. Merchant Reality Engine is a prototype. All merchants, transactions, websites and figures are synthetic and illustrate the architecture; none is verified real-world evidence. References to other companies describe design inspiration only and imply no partnership, endorsement or use of proprietary technology. The response design is a product proposal, not a statement of legal or regulatory requirements, and the system never freezes funds automatically. There are no customers, testimonials or performance claims on this site.</p></div>
    </footer>
  );
}
