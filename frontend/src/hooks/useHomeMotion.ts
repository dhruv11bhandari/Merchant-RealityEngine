import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Home page motion. Elements opt in with data attributes:
 *   data-hero-in      hero entrance, staggered in DOM order
 *   data-reveal       section title / lead: fade + rise when it scrolls into view
 *   data-stagger      container whose direct children reveal in sequence
 *   data-bars         container of bar elements that grow from zero
 * With prefers-reduced-motion nothing animates and everything shows in its final state.
 */
export function useHomeMotion(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root);

      gsap.from(q('[data-hero-in]'), { y: 22, autoAlpha: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', delay: 0.1 });

      q('[data-reveal]').forEach(el => {
        gsap.from(el, {
          y: 26, autoAlpha: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        });
      });

      q('[data-stagger]').forEach(el => {
        gsap.from(el.children, {
          y: 24, autoAlpha: 0, duration: 0.65, stagger: 0.07, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 80%', once: true },
        });
      });

      q('[data-bars]').forEach(el => {
        const bars = Array.from(el.children) as HTMLElement[];
        const hot = bars.filter(b => b.dataset.hi === 'true');
        const t = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
        t.from(bars, { scaleY: 0, transformOrigin: 'bottom', duration: 0.7, stagger: 0.05, ease: 'power3.out' });
        if (hot.length) t.fromTo(hot, { boxShadow: '0 0 0 rgba(142, 142, 142,0)' }, { boxShadow: '0 0 18px rgba(142, 142, 142,0.85)', duration: 0.35, yoyo: true, repeat: 1, stagger: 0.12 }, '-=0.1');
      });

      // Recalculate trigger positions once fonts/images have settled.
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener('load', refresh);
      return () => window.removeEventListener('load', refresh);
    });

    return () => mm.revert();
  }, [scope]);
}
