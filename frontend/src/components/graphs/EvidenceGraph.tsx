import { useMemo, useState } from 'react';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Building2, Users, Landmark, Link2, Globe, Cpu, Wallet, Store } from 'lucide-react';
import type { EdgeType, GraphEdgeSpec, GraphNodeSpec, Scenario } from '../../types/merchant';
import type { EvidenceItem } from '../../types/evidence';
import { Badge, Btn, Callout, StatusBadge } from '../ui/ui';
import { cx } from '../../utils/format';

export const EDGE_STYLE: Record<EdgeType, { color: string; dash?: string; label: string; blurb: string }> = {
  ENTITY_RESOLUTION: { color: '#22c55e', label: 'Entity resolution', blurb: 'Deterministic identifier match, such as a link issued to a merchant.' },
  BEHAVIOURAL_SIMILARITY: { color: '#f59e0b', dash: '6 4', label: 'Behavioural similarity', blurb: 'Statistical resemblance. Not proof of common ownership or identity.' },
  PAYMENT_FLOW: { color: '#ef4444', label: 'Payment flow', blurb: 'Money moving between parties.' },
  SHARED_INFRASTRUCTURE: { color: '#a855f7', dash: '2 4', label: 'Shared infrastructure', blurb: 'Common hosting, device, template or asset.' },
  WEBSITE_LINK: { color: '#3b82f6', dash: '10 3 2 3', label: 'Website link', blurb: 'A payment link or checkout embedded on a page.' },
  SETTLEMENT_RELATIONSHIP: { color: '#06b6d4', label: 'Settlement relationship', blurb: 'Where collected funds are paid out.' },
};
const ICON = { merchant: Building2, payer: Users, account: Wallet, link: Link2, website: Globe, device: Cpu, beneficiary: Landmark, peer: Store };
const NCOL: Record<GraphNodeSpec['type'], string> = { merchant: '#38bdf8', payer: '#22c55e', account: '#f97316', link: '#ef4444', website: '#3b82f6', device: '#a855f7', beneficiary: '#f59e0b', peer: '#14b8a6' };

type NData = { spec: GraphNodeSpec; dim: boolean; sel: boolean; path: boolean };
function MreNode({ data }: NodeProps) {
  const { spec, dim, sel, path } = data as unknown as NData;
  const I = ICON[spec.type], c = NCOL[spec.type];
  const hs = { left: '50%', top: '50%', opacity: 0, pointerEvents: 'none' as const, transform: 'translate(-50%,-50%)' };
  return (
    <div className={cx('flex w-[190px] items-center gap-2 rounded-md border bg-[#101010] px-2.5 py-2 transition-opacity', dim && 'opacity-25', sel ? 'ring-2 ring-zinc-300' : '')} style={{ borderColor: path || sel ? c : '#343434' }}>
      <Handle type="target" position={Position.Top} style={hs} isConnectable={false} /><Handle type="source" position={Position.Top} style={hs} isConnectable={false} />
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded" style={{ background: c + '22', color: c }}><I size={15} /></span>
      <div className="min-w-0"><div className="truncate text-[12px] font-medium text-ink" title={spec.label}>{spec.label}</div>{spec.sub && <div className="truncate text-[10.5px] text-mute" title={spec.sub}>{spec.sub}</div>}</div>
    </div>
  );
}
const nodeTypes = { mre: MreNode };

function layout(nodes: GraphNodeSpec[], edges: GraphEdgeSpec[]) {
  const root = nodes.find(n => n.type === 'merchant')!.id, adj = new Map<string, string[]>();
  edges.forEach(e => { adj.set(e.source, [...(adj.get(e.source) ?? []), e.target]); adj.set(e.target, [...(adj.get(e.target) ?? []), e.source]); });
  const depth = new Map<string, number>([[root, 0]]), q = [root];
  while (q.length) { const x = q.shift()!; (adj.get(x) ?? []).forEach(y => { if (!depth.has(y)) { depth.set(y, depth.get(x)! + 1); q.push(y); } }); }
  const byD = new Map<number, GraphNodeSpec[]>();
  nodes.forEach(n => { const d = depth.get(n.id) ?? 3; byD.set(d, [...(byD.get(d) ?? []), n]); });
  const pos = new Map<string, { x: number; y: number }>();
  byD.forEach((g, d) => {
    const r = d === 0 ? 0 : d === 1 ? 215 : d === 2 ? 370 : 480;
    g.sort((a, b) => a.type.localeCompare(b.type)).forEach((n, i) => { const a = (i / g.length) * Math.PI * 2 + d * 0.5 - Math.PI / 2; pos.set(n.id, { x: Math.cos(a) * r * 1.3, y: Math.sin(a) * r * 0.9 }); });
  });
  return pos;
}
function pathFrom(root: string, target: string, edges: GraphEdgeSpec[]) {
  const prev = new Map<string, { n: string; e: string }>(), q = [root], seen = new Set([root]);
  while (q.length) { const x = q.shift()!; for (const e of edges) { const y = e.source === x ? e.target : e.target === x ? e.source : null; if (y && !seen.has(y)) { seen.add(y); prev.set(y, { n: x, e: e.id }); q.push(y); } } }
  const ns = new Set([target]), es = new Set<string>(); let c = target;
  while (prev.has(c)) { const p = prev.get(c)!; es.add(p.e); ns.add(p.n); c = p.n; }
  return { ns: c === root ? ns : new Set([target]), es: c === root ? es : new Set<string>() };
}

export function EvidenceGraph({ scenario, evidence, height = 700 }: { scenario: Scenario; evidence: EvidenceItem[]; height?: number }) {
  const { nodes: ns, edges: es } = scenario.graph;
  const [types, setTypes] = useState<Set<EdgeType>>(new Set(Object.keys(EDGE_STYLE) as EdgeType[]));
  const [selN, setSelN] = useState<string | null>(null);
  const [selE, setSelE] = useState<string | null>(null);
  const pos = useMemo(() => layout(ns, es), [ns, es]);
  const root = ns.find(n => n.type === 'merchant')!.id;
  const vis = useMemo(() => es.filter(e => types.has(e.type)), [es, types]);
  const hl = useMemo(() => (selN && selN !== root ? pathFrom(root, selN, vis) : { ns: new Set<string>(), es: new Set<string>() }), [selN, root, vis]);
  const focus = selN !== null || selE !== null;
  const selEdge = es.find(e => e.id === selE);
  const litNodes = useMemo(() => {
    const s = new Set<string>(hl.ns);
    if (selN) { s.add(selN); vis.forEach(e => { if (e.source === selN) s.add(e.target); if (e.target === selN) s.add(e.source); }); }
    if (selEdge) { s.add(selEdge.source); s.add(selEdge.target); }
    return s;
  }, [hl, selN, vis, selEdge]);

  const nodes: Node[] = ns.map(n => ({ id: n.id, type: 'mre', position: pos.get(n.id)!, data: { spec: n, dim: focus && !litNodes.has(n.id), sel: n.id === selN, path: hl.ns.has(n.id) } as unknown as Record<string, unknown> }));
  const edges: Edge[] = vis.map(e => {
    const st = EDGE_STYLE[e.type], lit = hl.es.has(e.id) || e.id === selE || (selN !== null && (e.source === selN || e.target === selN));
    return { id: e.id, source: e.source, target: e.target, type: 'straight', animated: e.type === 'PAYMENT_FLOW' && (!focus || lit), label: lit ? e.label : undefined,
      labelStyle: { fill: '#ececec', fontSize: 11 }, labelBgStyle: { fill: '#151515' }, labelBgPadding: [4, 2] as [number, number],
      style: { stroke: st.color, strokeWidth: lit ? 2.6 : e.type === 'BEHAVIOURAL_SIMILARITY' ? 1.2 : 1.6, strokeDasharray: st.dash, opacity: focus && !lit ? 0.12 : 0.9 },
      markerEnd: e.type === 'PAYMENT_FLOW' || e.type === 'SETTLEMENT_RELATIONSHIP' ? { type: MarkerType.ArrowClosed, color: st.color, width: 14, height: 14 } : undefined };
  });
  const node = ns.find(n => n.id === selN);
  const incident = node ? es.filter(e => e.source === node.id || e.target === node.id) : selEdge ? [selEdge] : [];
  const nm = (id: string) => ns.find(n => n.id === id)?.label ?? id;
  const evOf = (ids: string[]) => ids.map(i => evidence.find(e => e.id === i)).filter((x): x is EvidenceItem => !!x);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(EDGE_STYLE) as EdgeType[]).map(t => {
            const on = types.has(t), st = EDGE_STYLE[t];
            return <button key={t} onClick={() => setTypes(p => { const n = new Set(p); on ? n.delete(t) : n.add(t); return n; })} title={st.blurb}
              className={cx('flex items-center gap-2 rounded border px-2.5 py-1 text-xs transition-colors', on ? 'border-line2 bg-panel2 text-ink' : 'border-line text-dim')}>
              <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke={st.color} strokeWidth="2" strokeDasharray={st.dash} opacity={on ? 1 : 0.35} /></svg>{st.label}</button>;
          })}
          <Btn size="sm" variant="ghost" onClick={() => { setSelN(null); setSelE(null); }}>Clear selection</Btn>
        </div>
        <div className="grid-bg overflow-hidden rounded-md border border-line bg-[#0b0b0b]" style={{ height }}>
          <ReactFlow key={scenario.id} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.25} maxZoom={2.2} nodesConnectable={false} proOptions={{ hideAttribution: true }}
            onNodeClick={(_, n) => { setSelN(n.id); setSelE(null); }} onEdgeClick={(_, e) => { setSelE(e.id); setSelN(null); }} onPaneClick={() => { setSelN(null); setSelE(null); }}>
            <Background color="#1f1f1f" gap={32} /><Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <div className="text-xs text-dim">Scroll to zoom, drag to pan. Click a node to highlight its neighbourhood and the shortest path from the merchant. Click an edge to inspect it.</div>
      </div>
      <div className="space-y-3">
        <Callout tone="warn" title="Similarity is not identity">Behavioural-similarity and shared-infrastructure edges are leads for a human to verify. They are never treated as proof of common ownership.</Callout>
        <div className="rounded-md border border-line bg-panel">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">{node ? node.label : selEdge ? `${nm(selEdge.source)} → ${nm(selEdge.target)}` : 'Inspector'}</div>
          <div className="space-y-3 p-4 text-sm">
            {!node && !selEdge && <div className="text-mute">Select a node or an edge to see its relationships and the evidence behind them.</div>}
            {node && <div className="space-y-1 text-mute"><Badge tone="info">{node.type}</Badge>{node.sub && <div>{node.sub}</div>}{node.note && <div className="text-stone-300/90">{node.note}</div>}
              {hl.es.size > 0 && <div className="text-xs text-dim">Path from merchant: {hl.es.size} hop{hl.es.size > 1 ? 's' : ''} highlighted.</div>}</div>}
            {incident.map(e => (
              <div key={e.id} className="rounded border border-line bg-panel2 p-3">
                <div className="mb-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: EDGE_STYLE[e.type].color }} /><span className="text-xs font-medium">{EDGE_STYLE[e.type].label}</span></div>
                <div className="text-[13px] text-ink/90">{nm(e.source)} → {nm(e.target)}</div><div className="text-xs text-mute">{e.label}</div>
                {e.note && <div className="mt-1.5 text-xs text-stone-300/90">{e.note}</div>}
                {evOf(e.evidence).map(ev => <div key={ev.id} className="mt-2 border-t border-line pt-2"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{ev.id} {ev.name}</span><StatusBadge s={ev.status} /></div><div className="mt-0.5 text-xs text-mute">{ev.observed}</div></div>)}
                {!e.evidence.length && <div className="mt-1.5 text-[11px] text-dim">No detector evidence attached to this edge.</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
