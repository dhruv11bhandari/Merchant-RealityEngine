import type { Scenario, ScenarioId, CoverageKey, CoverageState } from '../types/merchant';
import { genBakery, genRotation, genFabricated, genDiwali, weeklySeries, type Built } from './transactions';
import { PROFILES, PEERS, WEB } from './merchants';
import { GRAPHS } from './graphs';

const cov = (a: Partial<Record<CoverageKey, CoverageState>>): Record<CoverageKey, CoverageState> => ({
  acquiring: 'AVAILABLE', website: 'AVAILABLE', orders: 'MISSING', bank: 'MISSING', fulfillment: 'MISSING', calendar: 'AVAILABLE', verification: 'MISSING', ...a,
});
const ones = (n: number) => Array(n).fill(1);

function make(id: ScenarioId, built: Built, rest: Omit<Scenario, 'id' | 'events' | 'fixtures' | 'orders' | 'bankCredits' | 'profile' | 'peers' | 'web' | 'graph' | 'primaryMerchantId'>): Scenario {
  const profile = PROFILES[id];
  return { id, primaryMerchantId: profile.id, profile, peers: PEERS[id], web: WEB[id], graph: GRAPHS[id], events: built.events, fixtures: built.fixtures, orders: built.orders, bankCredits: built.bankCredits, ...rest };
}

const cache = new Map<ScenarioId, Scenario>();
const builders: Record<ScenarioId, () => Scenario> = {
  bakery: () => make('bakery', genBakery(), {
    title: 'Sweet Crumbs Bakery', subtitle: 'Undeclared betting collections behind a bakery',
    blurb: 'A registered bakery in Bengaluru shows a threefold rise in UPI collections, round-number tickets from nine states, funding that peaks before match starts, and a payment link on an undeclared betting deposit page.',
    tone: 'illicit', expectedOutcome: 'Case opened. Legitimate chain fails. Targeted link restriction recommended; in-store terminal stays live.', scriptedLabel: 'CONFIRMED_ILLICIT',
    weekly: weeklySeries(11, 180000, [...ones(12), 1.25, 1.8, 2.9, 3.0], [...ones(12), 1.2, 1.6, 2.0, 2.0]),
    coverage: cov({}), verification: null,
    footprint: { supplierPaymentsMonthly: 52000, gstTurnoverMonthly: 310000 },
    sightings: [{ source: 'Telegram', place: 'public channel “IPL Sure Win 24×7” (synthetic)', paymentRef: 'PL-SCB-07', seenAt: '2026-10-21', note: 'Pinned post: “deposit here, instant ID”' }],
    synthetic: '3× UPI collections · ₹500/1,000/2,000 heaping · payers from 9 states · funding before match starts · refunds with no original sale · refunds to different destinations · payment link on a betting deposit page · order and bank data missing',
  }),
  rotation: () => make('rotation', genRotation(), {
    title: 'Merchant rotation', subtitle: 'A collection account goes quiet; a replacement picks up the same pattern',
    blurb: 'Gift Galaxy Retail stops transacting on day 8. Nova Gift Emporium, a 19-day-old account, begins two days later with the same payers, similar tickets and a settlement account that matches the predecessor.',
    tone: 'illicit', expectedOutcome: 'Case opened. Rotation hypothesis leads, supported by cohort continuity and lifecycle evidence.', scriptedLabel: 'CONFIRMED_ILLICIT',
    weekly: weeklySeries(22, 90000, [null, null, null, 0.91, 2.6], [1, 1, 1, 1, 1]).map((w, i) => ({ ...w, week: `W${12 + i}` })),
    coverage: cov({}), verification: null,
    synthetic: 'Predecessor account dormant · successor opens within 2 days · 40 shared payers · same ticket heaping · evening collections outside declared hours · beneficiary changes twice and lands on the predecessor account',
  }),
  fabricated: () => make('fabricated', genFabricated(), {
    title: 'Fabricated commercial substance', subtitle: 'An online store that cannot substantiate its sales',
    blurb: 'Aarav Home Decor Online has a plausible storefront, but fewer than half of payments link to orders, shipment records reuse tracking IDs, catalogue images are shared with other stores, and most sampled purchasers deny buying.',
    tone: 'illicit', expectedOutcome: 'Case opened on four independent families. Adjudication stays unresolved until the merchant responds.', scriptedLabel: 'UNRESOLVED',
    weekly: weeklySeries(33, 150000, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.1, 1.2, 1.4, 1.9, 2.3, 2.4], ones(16)),
    coverage: cov({ orders: 'AVAILABLE', fulfillment: 'AVAILABLE', verification: 'AVAILABLE', calendar: 'MISSING' }), verification: { contacted: 12, confirmed: 3 },
    footprint: { supplierPaymentsMonthly: 31000, gstTurnoverMonthly: 140000 },
    synthetic: '41% of payments match an order · 22% of orders verified delivered · tracking IDs reused · duplicated catalogue imagery · 3 of 12 sampled purchasers confirm buying',
  }),
  diwali: () => make('diwali', genDiwali(), {
    title: 'Legitimate Diwali growth', subtitle: 'A real bakery has a real festival peak',
    blurb: 'Anand Sweets & Bakes triples its sales in the Diwali fortnight. Customers are local, baskets fit the menu, orders and deliveries are verified, and settlements reconcile with bank credits.',
    tone: 'benign', expectedOutcome: 'No illicit case opened. The volume alarm is explained; the seasonal profile is refreshed.', scriptedLabel: 'ADJUDICATED_BENIGN',
    weekly: weeklySeries(44, 160000, [...ones(12), 1.25, 1.8, 2.9, 3.0], [...ones(12), 1.2, 1.6, 2.0, 2.0]),
    coverage: cov({ orders: 'AVAILABLE', bank: 'AVAILABLE', fulfillment: 'AVAILABLE', verification: 'AVAILABLE' }), verification: { contacted: 10, confirmed: 10 },
    footprint: { supplierPaymentsMonthly: 220000, gstTurnoverMonthly: 520000 },
    synthetic: '3× festival volume · 96% local customers · menu-fit baskets · 98% of payments match orders · deliveries verified · settlements reconcile to bank credits',
  }),
};

export const SCENARIO_IDS: ScenarioId[] = ['bakery', 'rotation', 'fabricated', 'diwali'];
export function getScenario(id: ScenarioId): Scenario {
  if (!cache.has(id)) cache.set(id, builders[id]());
  return cache.get(id)!;
}
