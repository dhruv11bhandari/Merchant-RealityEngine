import type { MerchantProfile, WeeklyPoint } from '../types/merchant';
import type { WeeklyRow } from '../types/investigation';

export const EPSILON = 1;
/** R_t = (V_t − E_t) / max(E_t, ε) */
export const residual = (v: number, e: number, eps = EPSILON) => (v - e) / Math.max(e, eps);

/** Three baselines per week: anchored (declared level), seasonal (anchored × seasonal multiplier), rolling challenger (mean of previous 4 actual weeks). */
export function buildWeeklyRows(profile: MerchantProfile, weekly: WeeklyPoint[]): WeeklyRow[] {
  const hist: number[] = [];
  return weekly.map(w => {
    const anchored = profile.baselineWeekly;
    const seasonal = anchored * w.seasonalMult;
    const prev = hist.slice(-4);
    const rolling = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : anchored;
    const v = w.actual;
    if (v !== null) hist.push(v);
    return {
      week: w.week, actual: v, anchored, seasonal, rolling,
      rAnchored: v === null ? null : residual(v, anchored), rSeasonal: v === null ? null : residual(v, seasonal), rRolling: v === null ? null : residual(v, rolling),
    };
  });
}
