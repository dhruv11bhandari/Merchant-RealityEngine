import type { CusumPoint, WeeklyRow } from '../types/investigation';

/** One-sided CUSUM: S_t = max(0, S_{t−1} + R_t − k). Alarm when S_t > h. */
export const CUSUM_K = 0.1;
export const CUSUM_H = 0.5;
export function cusum(rows: WeeklyRow[], k = CUSUM_K, h = CUSUM_H): CusumPoint[] {
  let s = 0;
  return rows.map(r => {
    if (r.rSeasonal === null) return { week: r.week, r: null, s, alarm: false };
    s = Math.max(0, s + r.rSeasonal - k);
    return { week: r.week, r: r.rSeasonal, s, alarm: s > h };
  });
}
