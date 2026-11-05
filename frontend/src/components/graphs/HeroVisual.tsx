import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

// three.js and the scene load only when the 3D hero is actually shown (separate chunk).
const HeroMap3D = lazy(() => import('./HeroMap3D'));

function canUse3D() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.innerWidth < 1024) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** True when the full-bleed 3D hero should be used (desktop, WebGL, motion allowed). */
export function useHero3D() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const decide = () => setOn(canUse3D());
    decide();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', decide); window.addEventListener('resize', decide);
    return () => { mq.removeEventListener('change', decide); window.removeEventListener('resize', decide); };
  }, []);
  return on;
}

class Guard extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const DESCRIPTION = 'Animated map of India: payments stream into a bakery in Bengaluru. Local payers are expected; payers from nine other states light up in amber, a scan wave crosses the map and the engine opens a case for transaction laundering.';

/** Full-bleed 3D backdrop for the hero section. */
export function HeroBackdrop({ onFail }: { onFail: () => void }) {
  return (
    <div className="absolute inset-0" role="img" aria-label={DESCRIPTION}>
      <Guard onFail={onFail}><Suspense fallback={<div className="grid-bg absolute inset-0" />}><HeroMap3D /></Suspense></Guard>
    </div>
  );
}
