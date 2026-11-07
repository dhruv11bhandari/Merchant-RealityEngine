/**
 * Deterministic synthetic transaction generators.
 * Every record is fabricated for demonstration. Seeds are fixed so repeated runs are identical.
 */
import type { PaymentEvent, EventType } from '../types/payment';
import type { OrderRecord, WeeklyPoint } from '../types/merchant';
import { mulberry32, pick, weighted, type Rng } from '../utils/prng';
import { hashId } from '../utils/hash';
import { istMs, istDayKey } from '../utils/format';

export const DAY = 86400000;
const HOUR = 3600000;
const pad = (n: number, w = 3) => String(n).padStart(w, '0');

type Draft = Partial<PaymentEvent> & { merchantId: string; type: EventType; amount: number; eventTime: number };

export class Gen {
  events: PaymentEvent[] = [];
  private seq = 0;
  constructor(public rng: Rng, private prefix: string) {}
  add(e: Draft): PaymentEvent {
    const payerRef = e.payerRef ?? '—';
    const h = payerRef === '—' ? '—' : hashId(payerRef);
    const ev: PaymentEvent = {
      id: `${this.prefix}-${++this.seq}`,
      payerRef, payerHash: h, destHash: h, payerState: '—', channel: 'UPI_LINK',
      ingestTime: e.eventTime + 20000 + Math.floor(this.rng() * 40000), source: 'acquirer.upi',
      ...e,
    };
    this.events.push(ev);
    return ev;
  }
}

/** Sort chronologically and assign TX0001… ids, remapping refund links. */
export function finalize(events: PaymentEvent[]): PaymentEvent[] {
  const sorted = [...events].sort((a, b) => a.eventTime - b.eventTime || a.id.localeCompare(b.id));
  const map = new Map<string, string>();
  sorted.forEach((e, i) => map.set(e.id, `TX${pad(i + 1, 4)}`));
  return sorted.map(e => ({ ...e, id: map.get(e.id)!, linkedSaleId: e.linkedSaleId ? map.get(e.linkedSaleId) : undefined }));
}

/** Aggregate each day's sales into one settlement paid the next morning (11:00 IST). */
function settleDaily(g: Gen, merchantId: string, windowEnd: number, benef: (dayIndex: number) => string) {
  const byDay = new Map<string, PaymentEvent[]>();
  g.events.filter(e => e.merchantId === merchantId && e.type === 'SALE').forEach(s => {
    const k = istDayKey(s.eventTime);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(s);
  });
  [...byDay.keys()].sort().forEach((k, i) => {
    const t = Date.parse(k + 'T00:00:00Z') - 19800000 + DAY + 11 * HOUR;
    if (t > windowEnd) return;
    const grp = byDay.get(k)!;
    grp.forEach(s => (s.settleTime = t));
    g.add({ merchantId, type: 'SETTLEMENT', amount: grp.reduce((s, e) => s + e.amount, 0), eventTime: t, settleTime: t, beneficiaryHash: hashId(benef(i)), channel: 'BANK', source: 'settlement.ledger' });
  });
}

const OUT_STATES = ['DL', 'MH', 'UP', 'TN', 'WB', 'GJ', 'RJ', 'TS', 'PB'];
const pickHour = (r: Rng, w: [number, number][]) => weighted(r, w);

export interface Built { events: PaymentEvent[]; fixtures: number[]; orders: OrderRecord[]; bankCredits: { amount: number; beneficiaryHash: string }[]; windowStart: number; windowEnd: number }

function addPeer(g: Gen, id: string, prefix: string, n: number, day0: number, days: number, amounts: number[]) {
  const r = g.rng;
  for (let i = 0; i < n; i++) {
    const ref = `${prefix}${pad(1 + Math.floor(Math.pow(r(), 1.4) * 30), 2)}@upi`;
    g.add({ merchantId: id, type: 'SALE', amount: pick(r, amounts), eventTime: day0 + Math.floor(r() * days) * DAY + (9 + r() * 12) * HOUR, payerRef: ref, payerState: 'KA', channel: 'POS', linkId: 'TERM-01' });
  }
}

/* ───────── Scenario 0: Sweet Crumbs Bakery (default) ───────── */
export function genBakery(): Built {
  const r = mulberry32(1103), g = new Gen(r, 'b'), M = 'M-SCB-001';
  const day0 = istMs(2026, 10, 19), windowEnd = day0 + 14 * DAY;
  const menu = [165, 198, 245, 312, 378, 455, 520, 640, 745, 890, 1040, 1130];
  const fixtureDays = [1, 3, 5, 6, 8, 10, 11, 12, 13];
  const fixtures = fixtureDays.map(d => day0 + d * DAY + 19.5 * HOUR);
  const base: PaymentEvent[] = [];

  for (let d = 0; d < 14; d++) {
    const n = 8 + (d % 7 >= 5 ? 3 : 0) + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const h = pickHour(r, [[8, 2], [9, 3], [11, 2], [13, 3], [17, 3], [18, 4], [20, 2]]);
      const ref = `cust${pad(1 + Math.floor(Math.pow(r(), 1.6) * 55))}@upi`;
      const pos = r() < 0.7;
      base.push(g.add({ merchantId: M, type: 'SALE', amount: r() < 0.06 ? pick(r, [500, 1000]) : pick(r, menu), eventTime: day0 + d * DAY + (h + r()) * HOUR, payerRef: ref, payerState: r() < 0.03 ? 'TN' : 'KA', channel: pos ? 'POS' : 'UPI_LINK', linkId: pos ? 'TERM-01' : 'PL-SCB-01' }));
    }
  }
  const injected: PaymentEvent[] = [];
  fixtureDays.forEach(d => {
    const start = day0 + d * DAY + 19.5 * HOUR, n = 13 + Math.floor(r() * 8);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(r() * 130), local = r() < 0.15;
      injected.push(g.add({ merchantId: M, type: 'SALE', amount: weighted(r, [[500, 0.3], [1000, 0.35], [2000, 0.35]]), eventTime: start - (2 + r() * 43) * 60000, payerRef: `fund${pad(idx)}@upi`, payerState: local ? 'KA' : OUT_STATES[idx % 9], channel: 'UPI_LINK', linkId: 'PL-SCB-07' }));
    }
  });
  // Refunds: 8 without an original sale, 7 linked but paid to a different destination, 4 ordinary
  for (let k = 0; k < 8; k++) g.add({ merchantId: M, type: 'REFUND', amount: pick(r, [500, 1000, 2000]), eventTime: day0 + (2 + Math.floor(r() * 11)) * DAY + (10 + r() * 10) * HOUR, destHash: hashId('ext-acct-' + (k % 6)), channel: 'UPI_LINK', linkId: 'PL-SCB-07', source: 'acquirer.refund' });
  injected.filter(s => s.eventTime < day0 + 12 * DAY).slice(5, 60).filter((_, i) => i % 8 === 0).slice(0, 7).forEach((s, k) =>
    g.add({ merchantId: M, type: 'REFUND', amount: s.amount, eventTime: s.eventTime + DAY + k * 600000, payerRef: s.payerRef, payerState: s.payerState, destHash: hashId('ext-dest-' + k), linkedSaleId: s.id, channel: 'UPI_LINK', linkId: 'PL-SCB-07', source: 'acquirer.refund' }));
  base.filter(s => s.amount < 400).slice(3, 40).filter((_, i) => i % 9 === 0).slice(0, 4).forEach(s =>
    g.add({ merchantId: M, type: 'REFUND', amount: s.amount, eventTime: s.eventTime + 2 * HOUR, payerRef: s.payerRef, payerState: s.payerState, linkedSaleId: s.id, channel: s.channel, linkId: s.linkId, source: 'acquirer.refund' }));
  // Onward payouts to several beneficiaries
  [[9, 2000], [10, 4000], [11, 2000], [12, 3000], [12, 2000], [13, 4000]].forEach(([d, a], k) =>
    g.add({ merchantId: M, type: 'TRANSFER', amount: a, eventTime: day0 + d * DAY + (11 + k) * HOUR, beneficiaryHash: hashId('BEN-X' + (k % 5)), destHash: hashId('BEN-X' + (k % 5)), channel: 'PAYOUT', source: 'payout.ledger' }));
  settleDaily(g, M, windowEnd, i => (i < 9 ? 'BEN_SCB_MAIN' : 'BEN_SCB_NEW'));
  addPeer(g, 'M-KCA-014', 'kca', 36, day0, 14, menu);
  addPeer(g, 'M-HLB-022', 'hlb', 32, day0, 14, [180, 260, 340, 420, 610, 780]);
  return { events: finalize(g.events), fixtures, orders: [], bankCredits: [], windowStart: day0, windowEnd };
}

/* ───────── Scenario A: Merchant rotation ───────── */
export function genRotation(): Built {
  const r = mulberry32(2207), g = new Gen(r, 'r');
  const OLD = 'M-GGR-117', NEW = 'M-NOVA-204', UNR = 'M-UNR-308';
  const day0 = istMs(2026, 10, 5), windowEnd = day0 + 14 * DAY, ST = ['MH', 'DL', 'UP', 'GJ', 'TN', 'WB'];
  const amt = () => weighted(r, [[1000, 0.35], [2000, 0.35], [5000, 0.2], [750, 0.1]]);
  const run = (M: string, from: number, to: number, perDay: number, lo: number, hi: number) => {
    for (let d = from; d <= to; d++) for (let i = 0; i < perDay; i++) {
      const idx = lo + Math.floor(r() * (hi - lo + 1));
      const t = d === from && i === 0 && M === NEW ? day0 + d * DAY + 20.17 * HOUR : day0 + d * DAY + (20 + r() * 3.5) * HOUR;
      g.add({ merchantId: M, type: 'SALE', amount: amt(), eventTime: t, payerRef: `gp${pad(idx)}@upi`, payerState: ST[idx % 6], channel: 'UPI_LINK', linkId: M === OLD ? 'PL-GGR-05' : 'PL-NOVA-01' });
    }
  };
  run(OLD, 0, 7, 12, 0, 49);
  run(NEW, 9, 13, 14, 10, 69);
  [[OLD, 1], [OLD, 4], [NEW, 11], [NEW, 12], [NEW, 12]].forEach(([m, d], k) => {
    const s = g.events.filter(e => e.merchantId === m && e.type === 'SALE' && e.eventTime >= day0 + (d as number) * DAY - DAY)[k % 3];
    if (s) g.add({ merchantId: m as string, type: 'REFUND', amount: s.amount, eventTime: s.eventTime + 3 * HOUR, payerRef: s.payerRef, payerState: s.payerState, linkedSaleId: s.id, linkId: s.linkId, source: 'acquirer.refund' });
  });
  for (let i = 0; i < 40; i++) g.add({ merchantId: UNR, type: 'SALE', amount: pick(r, [350, 640, 1200, 1800]), eventTime: day0 + Math.floor(r() * 14) * DAY + (11 + r() * 9) * HOUR, payerRef: `unr${pad(1 + Math.floor(r() * 25), 2)}@upi`, payerState: 'MH', channel: 'POS', linkId: 'TERM-01' });
  settleDaily(g, OLD, windowEnd, () => 'BEN_GGR_OLD');
  settleDaily(g, NEW, windowEnd, i => (i === 0 ? 'BEN_NOVA_N1' : i === 1 ? 'BEN_NOVA_N2' : 'BEN_GGR_OLD'));
  return { events: finalize(g.events), fixtures: [], orders: [], bankCredits: [], windowStart: day0, windowEnd };
}

/* ───────── Scenario B: Fabricated commercial substance ───────── */
export const FAB_PRICES = [1499, 2399, 3299, 899, 1899, 4999, 2799, 1299, 6499, 3899, 2199, 999, 5499, 7999];
export function genFabricated(): Built {
  const r = mulberry32(3319), g = new Gen(r, 'f'), M = 'M-AHD-310';
  const day0 = istMs(2026, 10, 19), windowEnd = day0 + 14 * DAY, ST = ['RJ', 'DL', 'MH', 'KA', 'UP', 'GJ', 'TN', 'WB', 'HR', 'MP'];
  const sales: PaymentEvent[] = [];
  for (let i = 0; i < 132; i++) {
    const d = Math.min(13, Math.floor(Math.pow(r(), 0.8) * 14));
    sales.push(g.add({ merchantId: M, type: 'SALE', amount: pick(r, FAB_PRICES), eventTime: day0 + d * DAY + (8 + r() * 15) * HOUR, payerRef: `buyer${pad(1 + (i % 124), 4)}@upi`, payerState: ST[Math.floor(r() * ST.length)], channel: 'ONLINE', linkId: 'CHK-AHD-01' }));
  }
  const orders: OrderRecord[] = [];
  const withOrder = sales.filter(() => r() < 0.41);
  withOrder.forEach((s, i) => {
    s.orderId = `ORD-${pad(5000 + i, 4)}`;
    const status = weighted<OrderRecord['status']>(r, [['DELIVERED', 0.22], ['SHIPPED', 0.33], ['NONE', 0.45]]);
    orders.push({ orderId: s.orderId, saleId: s.id, status, trackingId: status === 'NONE' ? undefined : r() < 0.6 ? `TRK-${pad(1 + Math.floor(r() * 5), 3)}` : `TRK-${pad(100 + i, 3)}` });
  });
  sales.filter(s => !s.orderId).forEach(s => (s.orderId = null));
  sales.filter((_, i) => i % 40 === 7).forEach(s => g.add({ merchantId: M, type: 'REFUND', amount: s.amount, eventTime: s.eventTime + DAY, payerRef: s.payerRef, payerState: s.payerState, linkedSaleId: s.id, channel: 'ONLINE', source: 'acquirer.refund' }));
  settleDaily(g, M, windowEnd, () => 'BEN_AHD_MAIN');
  return { events: finalize(g.events), fixtures: [], orders, bankCredits: [], windowStart: day0, windowEnd };
}

/* ───────── Scenario C: Legitimate Diwali growth ───────── */
export function genDiwali(): Built {
  const r = mulberry32(4421), g = new Gen(r, 'd'), M = 'M-ANS-045';
  const day0 = istMs(2026, 10, 19), windowEnd = day0 + 14 * DAY;
  const fixtures = [1, 3, 5, 6, 8, 10, 11, 12, 13].map(d => day0 + d * DAY + 19.5 * HOUR);
  const menu = [165, 245, 312, 378, 455, 520, 640, 745, 890, 1040, 1130, 650, 899, 1150];
  const sales: PaymentEvent[] = [];
  for (let d = 0; d < 14; d++) {
    const n = 20 + (d % 7 >= 5 ? 6 : 0) + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const h = pickHour(r, [[8, 2], [10, 3], [12, 3], [14, 2], [17, 4], [18, 5], [19, 5], [20, 3]]);
      const pos = r() < 0.55, ref = `cust${pad(1 + Math.floor(Math.pow(r(), 1.5) * 140))}@upi`;
      sales.push(g.add({ merchantId: M, type: 'SALE', amount: r() < 0.08 ? pick(r, [500, 1000]) : pick(r, menu), eventTime: day0 + d * DAY + (h + r()) * HOUR, payerRef: ref, payerState: r() < 0.04 ? pick(r, ['TN', 'MH']) : 'KA', channel: pos ? 'POS' : 'UPI_LINK', linkId: pos ? 'TERM-01' : 'PL-ANS-01' }));
    }
  }
  const orders: OrderRecord[] = [];
  sales.forEach((s, i) => {
    if (r() < 0.98) {
      s.orderId = `ORD-${pad(9000 + i, 4)}`;
      orders.push({ orderId: s.orderId, saleId: s.id, status: r() < 0.97 ? 'DELIVERED' : 'SHIPPED', trackingId: s.channel === 'POS' ? undefined : `TRK-${pad(200 + i, 4)}` });
    } else s.orderId = null;
  });
  sales.filter((_, i) => i % 60 === 11).forEach(s => g.add({ merchantId: M, type: 'REFUND', amount: s.amount, eventTime: s.eventTime + 2 * HOUR, payerRef: s.payerRef, payerState: s.payerState, linkedSaleId: s.id, channel: s.channel, linkId: s.linkId, source: 'acquirer.refund' }));
  settleDaily(g, M, windowEnd, () => 'BEN_ANS_MAIN');
  const bankCredits = g.events.filter(e => e.type === 'SETTLEMENT').map(e => ({ amount: e.amount, beneficiaryHash: e.beneficiaryHash! }));
  return { events: finalize(g.events), fixtures, orders, bankCredits, windowStart: day0, windowEnd };
}

/** Weekly volume index series. Multipliers are relative to the declared weekly baseline. */
export function weeklySeries(seed: number, baseline: number, mult: (number | null)[], seasonal: number[]): WeeklyPoint[] {
  const r = mulberry32(seed);
  return mult.map((m, i) => ({ week: `W${i + 1}`, actual: m === null ? null : Math.round(baseline * m * (1 + (r() - 0.5) * (m < 1.15 ? 0.06 : 0))), seasonalMult: seasonal[i] }));
}
