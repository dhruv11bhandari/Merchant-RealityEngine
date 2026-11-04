import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { gsap } from 'gsap';
import { getScenario } from '../../data/scenarios';
import { runInvestigation } from '../../engines/investigationEngine';
import { MECHANISMS } from '../../data/evidence';

/**
 * Hero scene: India as a dot map. Payments stream along arcs into a bakery in Bengaluru.
 * Local payers (cyan) are expected; then payers from nine other states (amber) light up,
 * a scan wave crosses the map and the live-scan panel fills with the engine's real
 * Sweet Crumbs Bakery results, ending in "Case opened".
 */

// Approximate outline of mainland India and the north-east (lon, lat). Illustrative, not survey-grade.
const MAINLAND: [number, number][] = [
  [68.2, 23.6], [69.5, 22.4], [70.4, 20.9], [72.6, 21.1], [72.9, 19.0], [73.4, 16.5], [74.1, 14.8], [74.8, 12.8], [75.6, 11.3], [76.3, 9.6],
  [77.0, 8.3], [77.6, 8.1], [78.2, 8.9], [79.0, 9.3], [79.9, 10.3], [79.8, 11.8], [80.3, 13.3], [80.1, 15.0], [81.3, 16.4], [82.3, 16.9],
  [84.2, 18.3], [85.4, 19.6], [86.6, 20.4], [87.0, 21.5], [88.2, 21.6], [88.9, 21.9], [89.0, 22.9], [88.7, 24.2], [88.0, 24.6], [88.3, 25.3],
  [88.1, 26.4], [88.9, 27.2], [88.1, 27.9], [86.0, 27.9], [84.0, 27.4], [81.9, 28.6], [80.1, 28.9], [79.2, 30.3], [78.4, 31.1], [78.9, 32.4],
  [78.0, 33.5], [78.7, 34.4], [77.8, 35.5], [76.2, 35.8], [74.6, 34.8], [73.7, 34.0], [74.2, 32.8], [74.6, 31.9], [74.5, 31.0], [73.7, 30.4],
  [73.4, 29.6], [72.4, 28.3], [71.0, 27.8], [70.1, 27.0], [69.6, 26.1], [70.3, 25.4], [71.1, 24.4], [69.2, 24.3],
];
const NORTHEAST: [number, number][] = [
  [89.8, 26.0], [92.1, 26.9], [93.9, 27.5], [95.6, 28.2], [97.1, 28.0], [96.0, 27.0], [95.2, 26.6], [94.6, 25.6], [94.2, 24.0], [93.3, 23.7],
  [92.6, 22.0], [92.2, 23.5], [91.6, 24.1], [92.4, 24.9], [90.4, 25.2], [89.8, 25.4],
];
const MERCHANT = { name: 'Bengaluru', lon: 77.59, lat: 12.97 };
const LOCAL = [{ name: 'Mysuru', lon: 76.64, lat: 12.3 }, { name: 'Mangaluru', lon: 74.86, lat: 12.91 }, { name: 'Hubballi', lon: 75.12, lat: 15.36 }, { name: 'Tumakuru', lon: 77.1, lat: 13.34 }, { name: 'Hassan', lon: 76.1, lat: 13.0 }];
const OUTSIDE = [
  { name: 'Delhi', lon: 77.2, lat: 28.6, amt: '₹2,000' }, { name: 'Mumbai', lon: 72.88, lat: 19.08, amt: '₹1,000' }, { name: 'Kolkata', lon: 88.36, lat: 22.57, amt: '₹500' },
  { name: 'Jaipur', lon: 75.79, lat: 26.91, amt: '₹1,000' }, { name: 'Lucknow', lon: 80.95, lat: 26.85, amt: '₹2,000' }, { name: 'Ahmedabad', lon: 72.57, lat: 23.02, amt: '₹500' },
  { name: 'Chennai', lon: 80.27, lat: 13.08, amt: '₹1,000' }, { name: 'Hyderabad', lon: 78.49, lat: 17.39, amt: '₹500' }, { name: 'Chandigarh', lon: 76.78, lat: 30.73, amt: '₹2,000' },
];
const K = 0.2;
const toXZ = (lon: number, lat: number) => new THREE.Vector3((lon - 80) * K, 0, -(lat - 22) * K);
function inside(poly: [number, number][], x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const CYAN = new THREE.Color('#22d3ee'), AMBER = new THREE.Color('#f59e0b'), RED = new THREE.Color('#f87171'), DOT = new THREE.Color('#2f7aa3'), HOME = new THREE.Color('#2dd4bf');

function useFacts() {
  return useMemo(() => {
    const r = runInvestigation(getScenario('bakery'));
    const sales = r.events.filter(e => e.type === 'SALE'), p = r.l2.profile;
    const out = sales.filter(s => !p.localStates.includes(s.payerState)).length / sales.length;
    const round = sales.filter(s => s.amount % 500 === 0).length / sales.length;
    const lift = r.evidence.find(e => e.id === 'C5')?.observed.match(/([\d.]+)×/)?.[1] ?? '—';
    const top = [...r.fusion.mechanisms].sort((a, b) => b.score - a.score)[0];
    return { name: p.name, id: p.id, mcc: p.mcc, sales: sales.length, out, round, lift, states: new Set(sales.map(s => s.payerState)).size - p.localStates.length,
      verdict: `${MECHANISMS.find(m => m.id === top.id)!.name} · ${top.score.toFixed(2)}`, priority: r.fusion.priority };
  }, []);
}

export default function HeroMap3D() {
  const host = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLDivElement | null)[]>([]);
  const merchantTag = useRef<HTMLDivElement>(null);
  const f = useFacts();

  useEffect(() => {
    const el = host.current, hudEl = hud.current;
    if (!el || !hudEl) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor('#05080f', 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.prepend(renderer.domElement);
    Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#05080f', 0.022);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    const world = new THREE.Group(); scene.add(world);
    const disposables: { dispose: () => void }[] = [];
    const T = <X extends { dispose: () => void }>(x: X) => (disposables.push(x), x);

    const merchant = toXZ(MERCHANT.lon, MERCHANT.lat);

    /* ---- dot map ---- */
    const pos: number[] = [], col: number[] = [], dist: number[] = [], hot: number[] = [];
    const step = 0.36;
    for (let lon = 67.5; lon <= 97.5; lon += step) for (let lat = 7.8; lat <= 36; lat += step) {
      const jl = lon + (Math.sin(lat * 12.9898) * 0.5) * 0.08, jt = lat + (Math.cos(lon * 78.233) * 0.5) * 0.08;
      if (!inside(MAINLAND, jl, jt) && !inside(NORTHEAST, jl, jt)) continue;
      const v = toXZ(jl, jt); pos.push(v.x, 0, v.z);
      const home = jl > 74 && jl < 78.6 && jt > 11.5 && jt < 18.4;
      const c = home ? HOME.clone().multiplyScalar(0.55) : DOT; col.push(c.r, c.g, c.b);
      dist.push(v.distanceTo(merchant));
      hot.push(OUTSIDE.some(o => Math.hypot(o.lon - jl, o.lat - jt) < 1.25) ? 1 : 0);
    }
    const dotGeo = T(new THREE.BufferGeometry());
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dotGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    dotGeo.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1));
    dotGeo.setAttribute('aHot', new THREE.Float32BufferAttribute(hot, 1));
    const U = { uReveal: { value: 0 }, uScan: { value: -10 }, uHot: { value: 0 }, uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } };
    const dotMat = T(new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aDist; attribute float aHot;
        uniform float uReveal; uniform float uScan; uniform float uHot; uniform float uTime; uniform float uPx;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float vis = clamp((uReveal - aDist) * 1.6, 0.0, 1.0);
          float wave = exp(-pow((aDist - uScan) * 2.4, 2.0));
          vec3 amber = vec3(0.96, 0.62, 0.04);
          vec3 c = mix(color, amber * 0.95, aHot * uHot * (0.75 + 0.25 * sin(uTime * 3.0 + aDist * 4.0)));
          c += vec3(0.13, 0.83, 0.93) * wave * 0.9;
          vColor = c; vAlpha = vis * (0.62 + wave * 0.38 + aHot * uHot * 0.3);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.9 + wave * 2.4 + aHot * uHot * 1.3) * uPx * (22.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.15, d)); }`,
    }));
    world.add(new THREE.Points(dotGeo, dotMat));

    /* ---- glow texture ---- */
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d')!, grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.3, 'rgba(255,255,255,.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const glow = T(new THREE.CanvasTexture(cv));

    /* ---- arcs and payment particles ---- */
    type Arc = { curve: THREE.QuadraticBezierCurve3; geo: THREE.BufferGeometry; mat: THREE.LineBasicMaterial; draw: { p: number }; out: boolean; n: number };
    const arcs: Arc[] = [];
    const mkArc = (lon: number, lat: number, out: boolean) => {
      const a = toXZ(lon, lat), d = a.distanceTo(merchant);
      const mid = a.clone().lerp(merchant, 0.5); mid.y = 0.2 + d * 0.38;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, merchant);
      const pts = curve.getPoints(80), geo = T(new THREE.BufferGeometry().setFromPoints(pts));
      const cols: number[] = []; pts.forEach((_, i) => { const t = i / 80, c = (out ? AMBER : CYAN).clone().multiplyScalar(0.35 + 0.65 * t); cols.push(c.r, c.g, c.b); });
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      geo.setDrawRange(0, 0);
      const mat = T(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: out ? 0.9 : 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
      world.add(new THREE.Line(geo, mat));
      arcs.push({ curve, geo, mat, draw: { p: 0 }, out, n: pts.length });
    };
    LOCAL.forEach(c => mkArc(c.lon, c.lat, false));
    OUTSIDE.forEach(c => mkArc(c.lon, c.lat, true));

    const PER = 5, parts = arcs.length * PER;
    const pPos = new Float32Array(parts * 3), pCol = new Float32Array(parts * 3), pT = Array.from({ length: parts }, (_, i) => (i % PER) / PER + Math.random() * 0.1);
    const pGeo = T(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pMat = T(new THREE.PointsMaterial({ size: 0.16, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    world.add(new THREE.Points(pGeo, pMat));

    /* ---- merchant beacon ---- */
    const beacon = new THREE.Mesh(T(new THREE.CylinderGeometry(0.012, 0.05, 2.4, 16, 1, true)), T(new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    beacon.position.copy(merchant).setY(1.2); world.add(beacon);
    const core = new THREE.Sprite(T(new THREE.SpriteMaterial({ map: glow, color: CYAN, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    core.position.copy(merchant).setY(0.02); core.scale.setScalar(0.5); world.add(core);
    const ringGeo = T(new THREE.RingGeometry(0.98, 1, 96));
    const rings = [0, 1, 2].map(i => {
      const m = new THREE.Mesh(ringGeo, T(new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })));
      m.rotation.x = -Math.PI / 2; m.position.copy(merchant).setY(0.01); world.add(m); return { m, t: i / 3 };
    });
    const scanRing = new THREE.Mesh(T(new THREE.RingGeometry(0.96, 1, 160)), T(new THREE.MeshBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })));
    scanRing.rotation.x = -Math.PI / 2; scanRing.position.copy(merchant).setY(0.02); world.add(scanRing);

    /* ---- post-processing ---- */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.12);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    /* ---- framing ---- */
    let mapShift = 0;
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
      camera.aspect = w / h;
      mapShift = camera.aspect > 1.5 ? 2.45 : camera.aspect > 1.1 ? 1.6 : 0;
      camera.position.set(0, 9.4, 5.9); camera.lookAt(0, -0.2, 0.05);
      camera.updateProjectionMatrix();
      world.position.x = mapShift;
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    /* ---- story timeline ---- */
    const maxD = Math.max(...dist);
    const rows = Array.from(hudEl.querySelectorAll<HTMLElement>('[data-row]'));
    const counters = Array.from(hudEl.querySelectorAll<HTMLElement>('[data-count]'));
    const verdict = hudEl.querySelector<HTMLElement>('[data-verdict]');
    const tl = gsap.timeline({ delay: 0.3 });
    if (reduce) {
      U.uReveal.value = maxD + 1; U.uHot.value = 1; arcs.forEach(a => { a.draw.p = 1; });
      rows.forEach(r => (r.style.opacity = '1')); counters.forEach(c => (c.textContent = c.dataset.count!)); if (verdict) verdict.style.opacity = '1';
    } else {
      gsap.set([...rows, verdict], { autoAlpha: 0, y: 8 });
      tl.to(U.uReveal, { value: maxD + 1, duration: 2.2, ease: 'power2.out' }, 0)
        .to(arcs.filter(a => !a.out).map(a => a.draw), { p: 1, duration: 1, stagger: 0.12, ease: 'power2.out' }, 0.5)
        .to(rows[0], { autoAlpha: 1, y: 0, duration: 0.4 }, 0.8)
        .to(arcs.filter(a => a.out).map(a => a.draw), { p: 1, duration: 1.1, stagger: 0.16, ease: 'power2.inOut' }, 2.0)
        .to(rows[1], { autoAlpha: 1, y: 0, duration: 0.4 }, 2.4)
        .to(U.uScan, { value: maxD + 1, duration: 2.6, ease: 'none', onStart: () => { (scanRing.material as THREE.MeshBasicMaterial).opacity = 0.8; } }, 3.6)
        .to(U.uHot, { value: 1, duration: 1.2 }, 4.0)
        .to(rows[2], { autoAlpha: 1, y: 0, duration: 0.4 }, 4.2)
        .to(rows[3], { autoAlpha: 1, y: 0, duration: 0.4 }, 5.0)
        .to(rows[4], { autoAlpha: 1, y: 0, duration: 0.4 }, 5.6)
        .to(verdict, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, 6.4);
      counters.forEach((c, i) => {
        const target = parseFloat(c.dataset.count!), dec = (c.dataset.count!.split('.')[1] ?? '').length, o = { v: 0 };
        tl.to(o, { v: target, duration: 1.4, ease: 'power2.out', onUpdate: () => { c.textContent = o.v.toFixed(dec); } }, [0.9, 2.5, 4.3, 5.1, 5.7][i] ?? 5);
      });
      chips.current.forEach((ch, i) => ch && tl.fromTo(ch, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 4.3 + i * 0.12));
    }

    /* ---- pointer parallax ---- */
    const tgt = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => { tgt.x = e.clientX / window.innerWidth - 0.5; tgt.y = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', onMove, { passive: true });

    /* ---- loop ---- */
    let raf = 0, last = performance.now(), visible = true, ambientScan = 0;
    const v = new THREE.Vector3();
    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      U.uTime.value += dt;
      world.rotation.y += (tgt.x * 0.14 - world.rotation.y) * 0.04;
      world.rotation.x += (tgt.y * 0.06 - world.rotation.x) * 0.04;

      // after the story, repeat a gentle scan every few seconds
      if (!tl.isActive() && !reduce) { ambientScan += dt; if (ambientScan > 7) { ambientScan = 0; U.uScan.value = -0.5; (scanRing.material as THREE.MeshBasicMaterial).opacity = 0.6; } U.uScan.value += dt * 2.2; }
      const sm = scanRing.material as THREE.MeshBasicMaterial;
      scanRing.scale.setScalar(Math.max(0.01, U.uScan.value)); sm.opacity = Math.max(0, sm.opacity - dt * 0.18) * (U.uScan.value > 0 && U.uScan.value < maxD ? 1 : 0);

      arcs.forEach(a => a.geo.setDrawRange(0, Math.floor(a.n * a.draw.p)));
      arcs.forEach((a, ai) => {
        for (let k = 0; k < PER; k++) {
          const i = ai * PER + k;
          pT[i] = (pT[i] + dt * (a.out ? 0.42 : 0.3)) % 1;
          const t = pT[i], on = t <= a.draw.p ? 1 : 0;
          a.curve.getPoint(t, v); pPos.set([v.x, v.y, v.z], i * 3);
          const c = a.out ? AMBER : CYAN, fade = Math.sin(Math.PI * t) * on * (reduce ? 0 : 1);
          pCol.set([c.r * fade, c.g * fade, c.b * fade], i * 3);
        }
      });
      pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;

      rings.forEach(r => { r.t = (r.t + dt * 0.35) % 1; r.m.scale.setScalar(0.15 + r.t * 1.4); (r.m.material as THREE.MeshBasicMaterial).opacity = (1 - r.t) * 0.35; });
      core.scale.setScalar(0.5 + Math.sin(U.uTime.value * 3) * 0.05);
      (core.material as THREE.SpriteMaterial).color.copy(CYAN).lerp(RED, U.uHot.value * 0.55);

      composer.render();

      // project HTML labels
      const w = el.clientWidth, h = el.clientHeight;
      const place = (node: HTMLElement | null, p3: THREE.Vector3, dy = 0) => {
        if (!node) return; v.copy(p3).applyMatrix4(world.matrixWorld).project(camera);
        node.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h + dy}px)`;
      };
      place(merchantTag.current, merchant.clone().setY(0.05), 70);
      OUTSIDE.forEach((o, i) => place(chips.current[i], toXZ(o.lon, o.lat), -6));

      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }, { threshold: 0.02 });
    io.observe(el);
    const onVis = () => start();
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      cancelAnimationFrame(raf); tl.kill(); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pointermove', onMove);
      composer.dispose(); disposables.forEach(d => d.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  const pct = (x: number) => (x * 100).toFixed(0);
  return (
    <div ref={host} className="absolute inset-0 select-none" aria-hidden="true">
      <div ref={merchantTag} className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-md border border-cyan-300/40 bg-[#05080f]/80 px-2.5 py-1 text-center backdrop-blur">
        <div className="text-[11px] font-semibold text-cyan-100">{f.name}</div>
        <div className="text-[10px] text-cyan-300/80">declared: bakery · Bengaluru</div>
      </div>
      {OUTSIDE.map((o, i) => (
        <div key={o.name} ref={x => { chips.current[i] = x; }} className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded border border-amber-400/50 bg-[#05080f]/75 px-1.5 py-0.5 font-mono text-[10px] text-amber-200 opacity-0">
          {o.amt} <span className="text-amber-400/70">· {o.name}</span>
        </div>))}

      <div ref={hud} className="pointer-events-none absolute bottom-8 right-6 w-[300px] rounded-xl border border-cyan-300/20 bg-[#070d18]/80 p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-md xl:right-10">
        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-cyan-300">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />Live scan</span><span className="text-dim">{f.id}</span>
        </div>
        <div className="mt-2 text-sm font-semibold text-ink">{f.name}</div>
        <div className="text-[11px] text-mute">Declared: Bakery, Bengaluru · MCC {f.mcc}</div>
        <div className="mt-3 space-y-2 font-mono text-[12px]">
          <div data-row className="flex justify-between"><span className="text-mute">Payments scanned</span><span className="text-ink"><span data-count={f.sales}>0</span></span></div>
          <div data-row className="flex justify-between"><span className="text-mute">Payer states outside KA</span><span className="text-amber-300"><span data-count={f.states}>0</span></span></div>
          <div data-row className="flex justify-between"><span className="text-mute">Payers from other states</span><span className="text-amber-300"><span data-count={pct(f.out)}>0</span>%</span></div>
          <div data-row className="flex justify-between"><span className="text-mute">Round ₹500 / 1k / 2k bills</span><span className="text-red-300"><span data-count={pct(f.round)}>0</span>%</span></div>
          <div data-row className="flex justify-between"><span className="text-mute">Funding before match start</span><span className="text-red-300"><span data-count={f.lift}>0</span>×</span></div>
        </div>
        <div data-verdict className="mt-3 rounded-md border border-red-400/50 bg-red-400/10 px-3 py-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-red-300">Case opened · {f.priority}</div>
          <div className="text-[12px] text-red-100">{f.verdict}</div>
        </div>
      </div>
    </div>
  );
}
