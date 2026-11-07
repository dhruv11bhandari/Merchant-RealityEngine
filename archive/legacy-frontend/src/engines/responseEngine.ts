import type { InvestigationResult, ResponseLevel, UserState, HoldRecord, ActionRecord } from '../types/investigation';
import { fmtDateTime, inr } from '../utils/format';
import { RESPONSE_LEVELS } from '../data/evidence';

export interface ResponsePlan {
  level: ResponseLevel; recommended: ResponseLevel; actions: string[]; keepsRunning: string[];
  suspectLinks: string[]; holdCandidate: number; hold: HoldRecord | null; blocked: string[]; authorityRequired: boolean;
}
const H = 3600000;

/** Derive the response from investigation state. Nothing is hard-coded per scenario. */
export function planResponse(res: InvestigationResult, user: UserState): ResponsePlan {
  const sc = res.scenario, level = user.chosenLevel ?? res.review.recommended;
  const sales = res.events.filter(e => e.type === 'SALE');
  const ext = sc.web.embeds.filter(e => e.merchantId === sc.primaryMerchantId && !sc.profile.declaredDomains.includes(e.host)).map(e => e.linkId);
  const count = new Map<string, number>();
  sales.forEach(s => s.linkId && count.set(s.linkId, (count.get(s.linkId) ?? 0) + 1));
  const suspectLinks = ext.length ? ext : [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1).map(x => x[0]);
  const keepsRunning = [...count.keys()].filter(k => !suspectLinks.includes(k));
  const unsettled = sales.filter(s => !s.settleTime && s.linkId && suspectLinks.includes(s.linkId));
  const holdCandidate = unsettled.reduce((s, e) => s + e.amount, 0);
  const end = sc.events.length ? Math.max(...sc.events.map(e => e.eventTime)) : 0;
  const authorityRequired = RESPONSE_LEVELS.find(l => l.id === level)!.needsAuthority;
  const blocked: string[] = [];
  let hold: HoldRecord | null = null;
  if (level === 'L4' || level === 'L5') {
    if (!user.legalVerified) blocked.push('Legal authority not verified. The product design requires a separate legal check before any restriction on funds.');
    if (level === 'L4' && !user.escrowConfirmed) blocked.push('Escrow or contractual reserve clause not confirmed for this merchant agreement.');
    if (level === 'L4' && holdCandidate === 0) blocked.push('No unsettled funds can be precisely attributed to the suspect flow.');
    if (level === 'L5' && user.label !== 'CONFIRMED_ILLICIT') blocked.push('Termination requires an adjudicated CONFIRMED_ILLICIT label (see L7).');
  }
  if (level === 'L4' && !blocked.length) hold = { id: `HR-${sc.id.toUpperCase().slice(0, 3)}-0001`, amount: holdCandidate, scope: `Unsettled collections via ${suspectLinks.join(', ')} only`, expires: fmtDateTime(end + 72 * H), reviewBy: fmtDateTime(end + 24 * H), approver: 'Risk committee (two of three)', basis: 'Simulated: contractual reserve clause plus verified authority' };
  const actions: string[] = {
    L0: ['Log the investigation and evidence set', 'Keep standard monitoring thresholds'],
    L1: ['Send profile-refresh request to the merchant', 'Ask for an explanation of the volume change', 'Re-baseline the seasonal expectation once evidence is verified'],
    L2: ['Open Enhanced Due Diligence', 'Request invoices, supplier records and order evidence', 'Continue independent purchaser verification', 'Tighten monitoring thresholds'],
    L3: [`Disable payment flow ${suspectLinks.join(', ')}`, 'Open Enhanced Due Diligence in parallel', 'Notify the merchant with a route to appeal'],
    L4: [`Create time-boxed HoldRecord over ${inr(holdCandidate)} of identified unsettled funds`, `Disable payment flow ${suspectLinks.join(', ')}`, 'Schedule review within 24 hours'],
    L5: ['Disable the merchant relationship', 'File required reports with the relevant authority', 'Preserve evidence and audit trail'],
  }[level];
  return { level, recommended: res.review.recommended, actions, keepsRunning, suspectLinks, holdCandidate, hold, blocked, authorityRequired };
}

export function actionLog(res: InvestigationResult, plan: ResponsePlan, start: number): ActionRecord[] {
  const t0 = Math.max(...res.scenario.events.map(e => e.eventTime)) + 2 * H;
  return plan.actions.map((a, i) => ({ seq: start + i + 1, at: fmtDateTime(t0 + i * 600000), actor: 'MRE response engine', action: `${plan.level}: ${a}`, detail: plan.keepsRunning.length && /Disable payment flow/.test(a) ? `Left running: ${plan.keepsRunning.join(', ')}` : '' }));
}
