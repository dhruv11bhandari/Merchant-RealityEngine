import { AlertTriangle, CheckCircle2, Lock, Power, Store } from 'lucide-react';
import { useInvestigation } from '../../hooks/useInvestigation';
import { LayerFrame } from '../../components/common/LayerFrame';
import { Badge, Btn, Callout, Panel, Mono, Td, Th, rowCls, tableCls } from '../../components/ui/ui';
import { LEVEL_ORDER, RESPONSE_LEVELS } from '../../data/evidence';
import { planResponse } from '../../engines/responseEngine';
import { cx, inr } from '../../utils/format';

export function L6View() {
  const { result: r, user, patch, setLevel, execute, audit } = useInvestigation();
  const plan = planResponse(r, user), meta = RESPONSE_LEVELS.find(l => l.id === plan.level)!;
  const log = audit.filter(a => a.actor === 'MRE response engine');
  const isFlow = plan.level === 'L3' || plan.level === 'L4';
  return (
    <LayerFrame n={6} evidenceCount={plan.actions.length} evidenceLabel="actions proposed (none executed)" summary={<>Selected level <b className="text-ink">{plan.level} {meta.name}</b>{plan.level === plan.recommended ? ' (matches the analyst recommendation)' : ` (analyst recommended ${plan.recommended})`}. Nothing runs until you execute it.</>}>
      <Panel title="Six response levels" subtitle="The smallest action that addresses the evidence. Higher levels need more.">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {LEVEL_ORDER.map(id => { const l = RESPONSE_LEVELS.find(x => x.id === id)!, on = plan.level === id; return (
            <button key={id} onClick={() => setLevel(id)} aria-pressed={on} className={cx('rounded border p-3 text-left transition-colors', on ? 'border-zinc-400 bg-zinc-400/5' : 'border-line bg-panel2 hover:border-line2')}>
              <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold text-zinc-300">{id}</span>{id === plan.recommended && <Badge tone="info">Suggested</Badge>}</div>
              <div className="mt-1 text-[13px] font-medium leading-tight">{l.name}</div><div className="mt-1 text-[11px] text-mute">{l.blurb}</div>
              {l.needsAuthority && <div className="mt-2 flex items-center gap-1 text-[10px] text-stone-300"><Lock size={10} />Needs authority check</div>}</button>); })}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Legal-authority verification" subtitle="A separate step from the risk decision.">
          {plan.authorityRequired ? (
            <div className="space-y-3 text-sm">
              <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 accent-zinc-300" checked={user.legalVerified} onChange={e => patch({ legalVerified: e.target.checked, executed: false })} /><span><span className="block">Legal authority verified (simulated)</span><span className="text-xs text-mute">In practice: confirmation from legal or compliance that the action rests on a valid order, regulation or contract term.</span></span></label>
              {plan.level === 'L4' && <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 accent-zinc-300" checked={user.escrowConfirmed} onChange={e => patch({ escrowConfirmed: e.target.checked, executed: false })} /><span><span className="block">Escrow or reserve clause confirmed (simulated)</span><span className="text-xs text-mute">The merchant agreement permits holding the identified funds.</span></span></label>}
              {plan.blocked.map(b => <div key={b} className="flex gap-2 rounded border border-stone-400/30 bg-stone-400/5 px-3 py-2 text-xs text-stone-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{b}</div>)}
            </div>) : <div className="text-sm text-mute">{plan.level} does not restrict funds, so no legal-authority gate applies. L4 and L5 always require it.</div>}
        </Panel>
        <Panel title={`Proposed response: ${plan.level}`} subtitle={meta.blurb}>
          <ul className="space-y-2 text-[13px]">{plan.actions.map(a => <li key={a} className="flex gap-2"><Power size={14} className="mt-0.5 shrink-0 text-zinc-300" />{a}</li>)}</ul>
          {isFlow && plan.keepsRunning.length > 0 && (
            <div className="mt-4 rounded border border-gray-400/30 bg-gray-400/5 p-3"><div className="flex items-center gap-2 text-sm font-medium text-gray-300"><Store size={15} />Stays operational</div>
              <div className="mt-1 text-xs text-mute">{plan.keepsRunning.map(k => <Mono key={k} className="mr-2">{k}</Mono>)}The legitimate part of the business keeps trading. Only the identified flow {plan.suspectLinks.map(k => <Mono key={k} className="ml-1">{k}</Mono>)} is restricted.</div></div>)}
          <div className="mt-4 flex items-center gap-3">
            <Btn variant="primary" disabled={plan.blocked.length > 0 || user.executed} onClick={execute}>{user.executed ? 'Executed' : `Execute ${plan.level}`}</Btn>
            {user.executed && <span className="flex items-center gap-1.5 text-sm text-gray-300"><CheckCircle2 size={15} />Logged below</span>}
          </div>
        </Panel>
      </div>
      {(plan.level === 'L4') && (
        <Panel title="HoldRecord (simulated)" subtitle={plan.hold ? 'Created because authority and escrow are confirmed.' : 'Not created: requirements not met.'}>
          {plan.hold ? (
            <dl className="grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">{([['Record', plan.hold.id], ['Amount', inr(plan.hold.amount)], ['Scope', plan.hold.scope], ['Expires', plan.hold.expires + ' IST'], ['Review by', plan.hold.reviewBy + ' IST'], ['Approver', plan.hold.approver], ['Basis', plan.hold.basis]] as [string, string][]).map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line py-1.5"><dt className="text-mute">{k}</dt><dd className="text-right">{v}</dd></div>)}</dl>
          ) : <div className="text-sm text-mute">Candidate amount if all conditions were met: <b className="text-ink">{inr(plan.holdCandidate)}</b> of unsettled funds attributable to {plan.suspectLinks.join(', ') || 'the suspect flow'}. Nothing is frozen.</div>}
        </Panel>)}
      <Panel title="Action audit" subtitle="Every executed action, with scope and what was left running." bodyClass="p-0 overflow-x-auto">
        {log.length === 0 ? <div className="p-6 text-center text-sm text-mute">No actions executed yet.</div> : <table className={tableCls}><thead><tr><Th>#</Th><Th>Time (IST)</Th><Th>Action</Th><Th>Note</Th></tr></thead><tbody>{log.map(a => <tr key={a.seq} className={rowCls}><Td><Mono>{a.seq}</Mono></Td><Td className="font-mono text-xs">{a.at}</Td><Td>{a.action}</Td><Td className="text-xs text-mute">{a.detail}</Td></tr>)}</tbody></table>}
      </Panel>
      <Callout tone="warn" title="Product design, not legal advice">The levels, the separate authority check, and the time-boxed HoldRecord are this product’s proposed response design. They are not a statement of what any regulator, court or payment scheme requires. Real deployments must map each level to the legal and contractual rules that apply to them. Nothing here freezes real money.</Callout>
    </LayerFrame>
  );
}
