import { randomBytes } from 'node:crypto';
import { datasetToScenario } from '../frontend/src/data/dataset';
import { LAYERS, MECHANISMS } from '../frontend/src/data/evidence';
import { runInvestigation } from '../frontend/src/engines/investigationEngine';
import { profileUpdates, reliabilityUpdates } from '../frontend/src/engines/learningEngine';
import { actionLog, planResponse } from '../frontend/src/engines/responseEngine';
import type { ResponseLevel } from '../frontend/src/types/investigation';
import type { Label } from '../frontend/src/types/merchant';
import { emptyUser, getCase, putCase, readUser, type CaseRecord } from './store';

export interface ApiReply { status: number; body: Record<string, unknown> }

const LEVELS: ResponseLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const LABELS: Label[] = ['CONFIRMED_ILLICIT', 'ADJUDICATED_BENIGN', 'UNRESOLVED'];

function fail(status: number, error: string): ApiReply {
  return { status, body: { error } };
}

function view(rec: CaseRecord): ApiReply {
  const { result, user } = rec;
  const counts = result.l1.counts;
  const missing = result.l1.sources.filter(s => s.state === 'MISSING').map(s => s.name);
  const alarms = result.l2.cusum.filter(p => p.alarm).length;
  const peak = result.l2.peak;
  const n = (status: string) => result.evidence.filter(e => e.status === status).length;
  const top = [...result.fusion.mechanisms].sort((a, b) => b.score - a.score)[0];
  const mechanism = top ? (MECHANISMS.find(m => m.id === top.id)?.name ?? top.id) : 'none';
  const l6 = user.executed ? 'done' : rec.response?.blocked.length ? 'blocked' : 'waiting';
  const l7 = user.label ? 'done' : 'waiting';
  const steps = [
    `Read ${counts.SALE?.n ?? 0} sales, ${counts.REFUND?.n ?? 0} refunds, ${counts.SETTLEMENT?.n ?? 0} settlements, ${counts.TRANSFER?.n ?? 0} payouts. ${missing.length ? `Missing feeds stay UNKNOWN: ${missing.join(', ')}.` : 'No feed is marked missing.'}`,
    `${result.l2.profile.name}, ${result.l2.profile.category}. ${alarms} CUSUM alarm week${alarms === 1 ? '' : 's'}.${peak?.rSeasonal != null ? ` Latest seasonal residual ${peak.rSeasonal.toFixed(2)}.` : ''}`,
    `${n('ILLICIT')} illicit, ${n('BENIGN')} benign, ${n('UNKNOWN')} unknown. UNKNOWN is excluded from the score.`,
    `${result.fusion.decision} (${result.fusion.priority}). ${result.fusion.gateReason} Leading mechanism: ${mechanism}${top ? ` (${top.score.toFixed(2)})` : ''}.`,
    `Legitimate-business chain ${result.review.legitStatus}. Recommended response ${result.review.recommended}.${user.notes ? ` Analyst note: ${user.notes}` : ' Engine draft is waiting for a human note.'}`,
    user.executed
      ? rec.response!.actions.join(' ')
      : rec.response?.blocked.length
        ? rec.response.blocked.join(' ')
        : `Waiting for a human decision. The engine recommends ${result.review.recommended}.`,
    user.label
      ? `${user.label}. ${rec.learning?.profile[0] ?? ''}`
      : 'Waiting for a label: CONFIRMED_ILLICIT, ADJUDICATED_BENIGN, or UNRESOLVED.',
  ];
  const state = ['done', 'done', 'done', 'done', 'done', l6, l7];
  return {
    status: 200,
    body: {
      id: rec.id,
      createdAt: rec.createdAt,
      merchant: { id: result.scenario.profile.id, name: result.scenario.profile.name, category: result.scenario.profile.category, city: result.scenario.profile.city },
      workflow: LAYERS.map((layer, i) => ({ layer: layer.n, code: layer.code, name: layer.name, state: state[i], summary: steps[i] })),
      result: {
        decision: result.fusion.decision,
        priority: result.fusion.priority,
        gatePassed: result.fusion.gatePassed,
        gateReason: result.fusion.gateReason,
        recommended: result.review.recommended,
        legitStatus: result.review.legitStatus,
        topMechanism: mechanism,
        evidence: { illicit: n('ILLICIT'), benign: n('BENIGN'), unknown: n('UNKNOWN') },
      },
      user: { notes: user.notes, clarification: user.clarification, chosenLevel: user.chosenLevel, legalVerified: user.legalVerified, escrowConfirmed: user.escrowConfirmed, executed: user.executed, label: user.label },
      response: rec.response,
      learning: rec.learning,
      audit: user.audit.map(({ at, actor, action, detail }) => ({ at, actor, action, detail })),
    },
  };
}

function ensure(id: string, body: unknown): CaseRecord | ApiReply {
  const input = body && typeof body === 'object' ? body as { dataset?: unknown; user?: unknown } : {};
  let rec = getCase(id);
  if (!rec && input.dataset) {
    const opened = openInvestigation(input.dataset, id);
    if (opened.status !== 200) return opened;
    rec = getCase(id);
  }
  if (!rec) return fail(404, 'No case with that id. Call this step again with the original dataset so the server can rebuild it.');
  rec.user = readUser(input.user, rec.user);
  return rec;
}

export function openInvestigation(raw: unknown, id = `INV-${randomBytes(4).toString('hex')}`): ApiReply {
  const parsed = datasetToScenario(raw);
  if (!parsed.ok || !parsed.scenario) return fail(400, parsed.errors.join(' ') || 'Dataset could not be read.');
  const rec: CaseRecord = {
    id, createdAt: new Date().toISOString(), dataset: raw, result: runInvestigation(parsed.scenario),
    user: emptyUser(), response: null, learning: null,
  };
  putCase(rec);
  return view(rec);
}

export function getInvestigation(id: string): ApiReply {
  const rec = getCase(id);
  return rec ? view(rec) : fail(404, 'No case with that id.');
}

export function reviewInvestigation(id: string, body: unknown): ApiReply {
  const rec = ensure(id, body);
  if ('status' in rec) return rec;
  const input = body as { notes?: unknown; clarification?: unknown };
  if (typeof input.notes === 'string') rec.user.notes = input.notes.slice(0, 2000);
  if (typeof input.clarification === 'string') rec.user.clarification = input.clarification.slice(0, 2000);
  rec.user.audit.push({ seq: rec.user.audit.length + 1, at: new Date().toISOString(), actor: 'Analyst', action: 'Recorded review', detail: rec.user.notes });
  putCase(rec);
  return view(rec);
}

export function respondInvestigation(id: string, body: unknown): ApiReply {
  const rec = ensure(id, body);
  if ('status' in rec) return rec;
  const input = body as { chosenLevel?: ResponseLevel; legalVerified?: boolean; escrowConfirmed?: boolean };
  if (input.chosenLevel) {
    if (!LEVELS.includes(input.chosenLevel)) return fail(400, 'chosenLevel must be L0 through L5.');
    rec.user.chosenLevel = input.chosenLevel;
  }
  if (typeof input.legalVerified === 'boolean') rec.user.legalVerified = input.legalVerified;
  if (typeof input.escrowConfirmed === 'boolean') rec.user.escrowConfirmed = input.escrowConfirmed;
  const plan = planResponse(rec.result, rec.user);
  rec.response = plan;
  if (plan.blocked.length) {
    rec.user.executed = false;
    rec.user.audit.push({ seq: rec.user.audit.length + 1, at: new Date().toISOString(), actor: 'MRE response engine', action: `${plan.level} blocked`, detail: plan.blocked.join(' ') });
  } else {
    rec.user.executed = true;
    rec.user.audit.push(...actionLog(rec.result, plan, rec.user.audit.length));
  }
  putCase(rec);
  return view(rec);
}

export function labelInvestigation(id: string, body: unknown): ApiReply {
  const rec = ensure(id, body);
  if ('status' in rec) return rec;
  const label = (body as { label?: Label }).label;
  if (!label || !LABELS.includes(label)) return fail(400, 'label must be CONFIRMED_ILLICIT, ADJUDICATED_BENIGN, or UNRESOLVED.');
  rec.user.label = label;
  rec.learning = { updates: reliabilityUpdates(rec.result.evidence, label), profile: profileUpdates(rec.result, label) };
  rec.user.audit.push({ seq: rec.user.audit.length + 1, at: new Date().toISOString(), actor: 'Analyst', action: `Label ${label}`, detail: rec.learning.profile[0] ?? '' });
  putCase(rec);
  return view(rec);
}
