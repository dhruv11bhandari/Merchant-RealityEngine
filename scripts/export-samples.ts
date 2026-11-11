/**
 * Writes the sample upload files to frontend/public/samples/.
 *   npm run samples
 * Four files are exports of the built-in scenarios. Two are new synthetic datasets
 * derived from them with a fixed seed, so they are reproducible.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { getScenario } from '../frontend/src/data/scenarios';
import { scenarioToDataset, toIst, type DatasetTransaction, type MreDataset } from '../frontend/src/data/dataset';
import { mulberry32 } from '../frontend/src/utils/prng';

const OUT = 'frontend/public/samples';
mkdirSync(OUT, { recursive: true });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const H = 3600000;

/** Rename a dataset to a different merchant and home state. */
function rebrand(ds: MreDataset, o: { id: string; name: string; city: string; domain: string; linkPrefix: [string, string]; homeFrom: string; homeTo: string; peers?: [string, string][] }) {
  const d = clone(ds), oldId = d.merchant.id;
  const swap = (st?: string) => st === o.homeFrom ? o.homeTo : st === o.homeTo ? o.homeFrom : st;
  const link = (l?: string) => l?.replace(o.linkPrefix[0], o.linkPrefix[1]);
  const peerMap = new Map(o.peers ?? []);
  d.merchant = { ...d.merchant, id: o.id, name: o.name, city: o.city, localStates: [o.homeTo], declaredDomains: [o.domain] };
  d.transactions.forEach(t => {
    t.merchantId = t.merchantId === oldId ? o.id : peerMap.get(t.merchantId) ?? t.merchantId;
    t.payerState = swap(t.payerState); t.paymentLinkId = link(t.paymentLinkId);
  });
  d.peers = (d.peers ?? []).map(p => ({ ...p, id: peerMap.get(p.id) ?? p.id }));
  d.website?.embeds.forEach(e => { e.merchantId = e.merchantId === oldId ? o.id : peerMap.get(e.merchantId) ?? e.merchantId; e.linkId = link(e.linkId)!; if (e.category === 'own') e.host = o.domain; });
  d.externalSightings?.forEach(s => { s.paymentRef = link(s.paymentRef)!; });
  delete d.graph; // let the engine build a graph from the data
  return d;
}

const write = (file: string, ds: MreDataset) => { writeFileSync(`${OUT}/${file}`, JSON.stringify(ds, null, 2)); console.log('wrote', file, ds.transactions.length, 'transactions'); };

// 1–4: built-in cases
write('01-sweet-crumbs-betting-front.json', scenarioToDataset(getScenario('bakery'), { title: 'Sweet Crumbs Bakery — suspected betting collections' }));
write('demo-ai-engine-test.json', scenarioToDataset(getScenario('bakery'), {
  title: 'AI Engine Upload Test — Sweet Crumbs Bakery',
  description: 'Synthetic end-to-end test dataset for the Merchant Reality Engine. Includes a bakery profile, 16 weeks of sales, payment transactions, payment-link context and supporting evidence. It is designed to exercise the upload and analysis flow; all records are fictional.',
}));
write('02-merchant-rotation.json', scenarioToDataset(getScenario('rotation'), { title: 'Nova Gift Emporium — merchant rotation' }));
write('03-fabricated-online-store.json', scenarioToDataset(getScenario('fabricated'), { title: 'Aarav Home Decor Online — fabricated commercial substance' }));
write('04-anand-sweets-diwali-genuine.json', scenarioToDataset(getScenario('diwali'), { title: 'Anand Sweets & Bakes — genuine Diwali growth' }));

// 5: new betting front with late-night play and loss-chasing
{
  const r = mulberry32(5150);
  const d = rebrand(scenarioToDataset(getScenario('bakery')), {
    id: 'M-CCC-210', name: 'Chai Corner Café', city: 'Hyderabad, India', domain: 'chaicorner.example',
    linkPrefix: ['PL-SCB', 'PL-CCC'], homeFrom: 'TS', homeTo: 'TS', peers: [['M-KCA-014', 'M-IRC-031'], ['M-HLB-022', 'M-BHB-057']],
  });
  d.merchant = { ...d.merchant, category: 'Eating places and restaurants', mcc: '5814', products: ['Tea', 'Coffee', 'Snacks', 'Buns'], ticketMin: 40, ticketMax: 600, hours: [6, 22] };
  d.peers = [{ id: 'M-IRC-031', name: 'Irani Chai House', status: 'ACTIVE', accountAgeDays: 1410 }, { id: 'M-BHB-057', name: 'Banjara Hills Bakery', status: 'ACTIVE', accountAgeDays: 980 }];
  // home state becomes TS: swap KA and TS everywhere
  d.transactions.forEach(t => { t.payerState = t.payerState === 'KA' ? 'TS' : t.payerState === 'TS' ? 'KA' : t.payerState; });
  d.merchant.localStates = ['TS'];
  const own = d.transactions.filter(t => t.merchantId === 'M-CCC-210' && t.type === 'SALE');
  // move ~a quarter of the round-amount link payments to late night
  own.filter(t => t.channel === 'UPI_LINK' && t.amount % 500 === 0).forEach(t => {
    if (r() < 0.45) { const day = Date.parse(t.time.slice(0, 10) + 'T00:00:00+05:30'); t.time = toIst(day + (23 + r() * 3.5) * H); }
  });
  // loss-chasing: 8 payers, 3–4 rising top-ups within 90 minutes, late at night
  const extra: DatasetTransaction[] = [];
  const start = Date.parse(own[0].time), span = Date.parse(own[own.length - 1].time) - start;
  for (let p = 0; p < 8; p++) {
    const payer = `chase${String(p + 1).padStart(2, '0')}@upi`, st = ['DL', 'MH', 'UP', 'WB', 'RJ', 'GJ', 'PB', 'TN'][p];
    const day = Date.parse(toIst(start + r() * span).slice(0, 10) + 'T00:00:00+05:30'), t0 = day + (23.2 + r() * 1.5) * H;
    [500, 1000, 2000, 5000].slice(0, 3 + (p % 2)).forEach((amt, k) => extra.push({ id: `TX9${p}${k}`, merchantId: 'M-CCC-210', type: 'SALE', amount: amt, time: toIst(t0 + k * (18 + r() * 12) * 60000), payerId: payer, payerState: st, channel: 'UPI_LINK', paymentLinkId: 'PL-CCC-07', sourceFeed: 'acquirer.upi' }));
  }
  d.transactions.push(...extra);
  d.transactions.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  d.weeklySales = d.weeklySales.map(w => ({ ...w, actual: w.actual === null ? null : Math.round(w.actual * 0.62) }));
  d.merchant.baselineWeekly = Math.round(d.merchant.baselineWeekly * 0.62);
  d.businessFootprint = { supplierPaymentsMonthly: 21000, gstTurnoverMonthly: 140000 };
  d.externalSightings = [{ source: 'WhatsApp', place: 'group invite “Night Satta Club” forwarded publicly (synthetic)', paymentRef: 'PL-CCC-07', seenAt: '2026-10-24', note: '“Top up after 11 pm, 2x bonus”' }];
  d.title = 'Chai Corner Café — late-night betting collections (new synthetic dataset)';
  d.description = 'A Hyderabad tea stall whose payment link collects late-night, round-amount top-ups from across India, including rising repeat payments from the same payers.';
  write('05-chai-corner-night-betting.json', d);
}

// 6: new genuine merchant, festive surge in another city
{
  const d = rebrand(scenarioToDataset(getScenario('diwali')), {
    id: 'M-SGS-118', name: 'Shree Ganesh Sweets', city: 'Pune, India', domain: 'shreeganeshsweets.example',
    linkPrefix: ['PL-ANS', 'PL-SGS'], homeFrom: 'KA', homeTo: 'MH',
  });
  d.businessFootprint = { supplierPaymentsMonthly: 205000, gstTurnoverMonthly: 495000 };
  d.title = 'Shree Ganesh Sweets — genuine festive surge (new synthetic dataset)';
  d.description = 'A Pune sweet shop triples sales for Diwali. Local customers, menu-sized bills, verified orders and deliveries, bank-reconciled settlements.';
  write('06-shree-ganesh-sweets-genuine.json', d);
}

/** Make a distinct genuine merchant: drop some sales, rescale amounts, shift dates. */
function perturb(ds: MreDataset, seed: number, o: { scale: number; drop: number; shiftDays: number; flatWeeks?: boolean }) {
  const r = mulberry32(seed), d = clone(ds), id = d.merchant.id;
  const dropped = new Set(d.transactions.filter(t => t.merchantId === id && t.type === 'SALE' && r() < o.drop).map(t => t.id));
  d.transactions = d.transactions.filter(t => !dropped.has(t.id) && !(t.refundOfTransactionId && dropped.has(t.refundOfTransactionId)));
  if (d.orders) d.orders = d.orders.filter(x => !dropped.has(x.saleId));
  const shift = (iso?: string) => iso ? toIst(Date.parse(iso) + o.shiftDays * 24 * H) : iso;
  d.transactions.forEach(t => {
    if (t.type === 'SALE' || t.type === 'REFUND') t.amount = Math.max(20, Math.round((t.amount * o.scale) / 5) * 5);
    t.time = shift(t.time)!; if (t.settledAt) t.settledAt = shift(t.settledAt);
  });
  // settlements follow the sales they cover
  const sales = d.transactions.filter(t => t.merchantId === id && t.type === 'SALE');
  d.transactions.filter(t => t.type === 'SETTLEMENT').forEach(st => { st.amount = sales.filter(s => s.settledAt === st.time).reduce((a, s) => a + s.amount, 0) || st.amount; });
  const stl = d.transactions.filter(t => t.type === 'SETTLEMENT');
  if (d.bankCredits) d.bankCredits = stl.map(t => ({ amount: t.amount, beneficiaryAccount: t.beneficiaryAccount ?? 'BEN-001' }));
  d.matchFixtures = (d.matchFixtures ?? []).map(f => shift(f)!);
  d.merchant.baselineWeekly = Math.round(d.merchant.baselineWeekly * o.scale);
  d.weeklySales = d.weeklySales.map(w => ({ ...w, actual: w.actual === null ? null : o.flatWeeks ? Math.round(d.merchant.baselineWeekly * (0.94 + r() * 0.12)) : Math.round(w.actual * o.scale), seasonalMultiplier: o.flatWeeks ? 1 : w.seasonalMultiplier }));
  return d;
}

// 7: steady genuine café (no festival surge)
{
  let d = rebrand(scenarioToDataset(getScenario('diwali')), { id: 'M-UTC-077', name: 'Udupi Tiffin Corner', city: 'Mysuru, India', domain: 'udupitiffin.example', linkPrefix: ['PL-ANS', 'PL-UTC'], homeFrom: 'KA', homeTo: 'KA' });
  d = perturb(d, 7007, { scale: 0.55, drop: 0.25, shiftDays: -3, flatWeeks: true });
  d.merchant = { ...d.merchant, mcc: '5814', category: 'Fast food restaurants', products: ['Idli', 'Dosa', 'Filter coffee', 'Meals'], ticketMin: 60, ticketMax: 700, seasonalPeak: 1 };
  d.businessFootprint = { supplierPaymentsMonthly: 118000, gstTurnoverMonthly: 240000 };
  d.title = 'Udupi Tiffin Corner — steady trading (new synthetic dataset)';
  d.description = 'A Mysuru tiffin café with steady local trade, small bills, verified orders and reconciled settlements.';
  write('07-udupi-tiffin-steady.json', d);
}
// 8: genuine grocer with a modest seasonal lift
{
  let d = rebrand(scenarioToDataset(getScenario('diwali')), { id: 'M-NKG-302', name: 'Nandi Kirana & General', city: 'Chennai, India', domain: 'nandikirana.example', linkPrefix: ['PL-ANS', 'PL-NKG'], homeFrom: 'KA', homeTo: 'TN' });
  d = perturb(d, 8008, { scale: 1.3, drop: 0.15, shiftDays: 5 });
  d.merchant = { ...d.merchant, mcc: '5411', category: 'Grocery stores', products: ['Staples', 'Snacks', 'Household'], ticketMin: 80, ticketMax: 2500, catchment: 'LOCAL' };
  d.businessFootprint = { supplierPaymentsMonthly: 470000, gstTurnoverMonthly: 690000 };
  d.title = 'Nandi Kirana & General — genuine festive lift (new synthetic dataset)';
  d.description = 'A Chennai grocery store with a real festive lift, local customers and supplier spend in line with sales.';
  write('08-nandi-kirana-genuine.json', d);
}

// 9: a new, independent upload fixture following the empty template's schema.
// Its deterministic seed keeps the sample stable when the sample exporter runs.
{
  const r = mulberry32(110926), id = 'M-RND-926', base = Date.parse('2026-09-01T00:00:00+05:30');
  const states = ['MH', 'KA', 'GJ', 'MP', 'RJ', 'UP', 'DL'];
  const transactions: DatasetTransaction[] = [];
  const weeklyActual = Array(8).fill(0) as number[];
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  for (let i = 0; i < 96; i++) {
    const week = Math.floor(i / 12), unusual = week >= 6;
    const day = week * 7 + Math.floor(r() * 7), hour = unusual && r() < 0.3 ? 22 + r() * 2 : 8 + r() * 13;
    const amount = unusual ? pick([500, 750, 1000, 1500, 2000]) : pick([90, 140, 180, 240, 320, 450, 600]);
    const channel: DatasetTransaction['channel'] = !unusual && r() < 0.28 ? 'POS' : 'UPI_LINK';
    const payer = `buyer${String(1 + Math.floor(r() * (unusual ? 18 : 64))).padStart(3, '0')}@upi`;
    const time = toIst(base + day * 24 * H + hour * H + Math.floor(r() * 3600000));
    transactions.push({ id: `RND-${String(i + 1).padStart(3, '0')}`, merchantId: id, type: 'SALE', amount, time, payerId: payer, payerState: unusual && r() < 0.55 ? pick(states) : 'MH', channel, paymentLinkId: channel === 'POS' ? 'TERM-RND-01' : 'PL-RND-04', sourceFeed: channel === 'POS' ? 'acquirer.pos' : 'acquirer.upi' });
    weeklyActual[week] += amount;
  }
  const sales = [...transactions];
  sales.filter((_, i) => i % 17 === 4).forEach((sale, i) => transactions.push({ id: `RND-R${String(i + 1).padStart(2, '0')}`, merchantId: id, type: 'REFUND', amount: sale.amount, time: toIst(Date.parse(sale.time) + (2 + r() * 20) * H), payerId: sale.payerId, payerState: sale.payerState, channel: sale.channel, paymentLinkId: sale.paymentLinkId, refundOfTransactionId: sale.id, sourceFeed: 'acquirer.refund' }));
  const merchant: MreDataset['merchant'] = {
    id, name: 'Juniper Lane Stationery', city: 'Pune, India', mcc: '5943', category: 'Stationery and office supplies',
    products: ['Notebooks', 'Pens', 'Art supplies', 'Greeting cards'], ticketMin: 50, ticketMax: 1200, hours: [8, 21] as [number, number],
    catchment: 'LOCAL', localStates: ['MH'], expectedRoundShare: 0.08, seasonalPeak: 1.25, baselineWeekly: 7000, accountAgeDays: 420,
    declaredDomains: ['juniperlane.example'], declaredChannels: ['In-store POS', 'UPI at counter'], declaredActivity: ['Stationery retail', 'School and office supplies'],
  };
  const weeks = Array.from({ length: 16 }, (_, i) => ({
    week: `W${i + 1}`, actual: i < 8 ? 6200 + Math.round(r() * 900) : i < 14 ? 6500 + Math.round(r() * 1000) : weeklyActual[i - 8],
    seasonalMultiplier: i === 14 ? 1.15 : i === 15 ? 1.3 : 1,
  }));
  const generated: MreDataset = {
    format: 'mre-dataset/v1', title: 'Juniper Lane Stationery — random AI Engine test',
    description: 'New synthetic upload fixture. A Pune stationery shop has ordinary counter sales followed by a short period of larger, repetitive UPI-link payments from a wider set of states. All merchants and transactions are fictional.',
    merchant, weeklySales: weeks, transactions: transactions.sort((a, b) => Date.parse(a.time) - Date.parse(b.time)), matchFixtures: [],
    dataAvailability: { acquiring: 'AVAILABLE', website: 'MISSING', orders: 'MISSING', bank: 'MISSING', fulfillment: 'MISSING', calendar: 'MISSING', verification: 'MISSING' },
  };
  write('random-ai-engine-test.json', generated);
}

// Format guide and an empty template next to the samples
import { copyFileSync } from 'node:fs';
copyFileSync('docs/DATASET_FORMAT.md', `${OUT}/DATASET_FORMAT.md`);
{
  const weeks = Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, actual: 100000, seasonalMultiplier: 1 }));
  const tpl: MreDataset = {
    format: 'mre-dataset/v1', title: 'Template — replace with your merchant', description: 'Minimal valid file. Replace the values and add transactions.',
    merchant: { id: 'M-0001', name: 'Your Merchant', city: 'City, India', mcc: '5462', category: 'Bakeries', products: ['Bread'], ticketMin: 100, ticketMax: 1000, hours: [8, 21], catchment: 'LOCAL', localStates: ['KA'], expectedRoundShare: 0.06, seasonalPeak: 1, baselineWeekly: 100000, accountAgeDays: 400, declaredDomains: ['yourmerchant.example'], declaredChannels: ['In-store POS'], declaredActivity: ['In-store purchases'] },
    weeklySales: weeks,
    transactions: [
      { id: 'T1', merchantId: 'M-0001', type: 'SALE', amount: 240, time: '2026-10-20T09:15:00+05:30', payerId: 'cust1@upi', payerState: 'KA', channel: 'POS', paymentLinkId: 'TERM-01' },
      { id: 'T2', merchantId: 'M-0001', type: 'SALE', amount: 410, time: '2026-10-20T18:05:00+05:30', payerId: 'cust2@upi', payerState: 'KA', channel: 'UPI_LINK', paymentLinkId: 'PL-01' },
      { id: 'T3', merchantId: 'M-0001', type: 'REFUND', amount: 240, time: '2026-10-20T19:00:00+05:30', payerId: 'cust1@upi', payerState: 'KA', channel: 'POS', refundOfTransactionId: 'T1' },
      { id: 'T4', merchantId: 'M-0001', type: 'SETTLEMENT', amount: 410, time: '2026-10-21T11:00:00+05:30', channel: 'BANK', beneficiaryAccount: 'BEN-001' },
    ],
    matchFixtures: [], dataAvailability: { acquiring: 'AVAILABLE', website: 'MISSING', orders: 'MISSING', bank: 'MISSING', fulfillment: 'MISSING', calendar: 'MISSING', verification: 'MISSING' },
  };
  writeFileSync(`${OUT}/mre-dataset-template.json`, JSON.stringify(tpl, null, 2));
  console.log('wrote format guide and template');
}
