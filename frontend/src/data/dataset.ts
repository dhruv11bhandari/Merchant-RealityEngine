/**
 * MRE dataset format (mre-dataset/v1).
 *
 * The upload format a payment aggregator would send to the engine: the declared merchant
 * profile, the payment ledger, and whatever context feeds exist (website crawl, orders,
 * bank credits, purchaser checks, match calendar). `datasetToScenario` validates a file and
 * converts it into the same `Scenario` the built-in cases use, so an uploaded dataset runs
 * through exactly the same engines. `scenarioToDataset` does the reverse and is used to
 * export the sample files.
 */
import type { Channel, EventType, PaymentEvent } from '../types/payment';
import type { CoverageKey, CoverageState, EmbedRecord, CatalogueItem, GraphSpec, MerchantProfile, OrderRecord, PeerInfo, Scenario, Sighting, WeeklyPoint } from '../types/merchant';
import { hashId } from '../utils/hash';

export const DATASET_FORMAT = 'mre-dataset/v1';

export interface DatasetTransaction {
  id: string;
  merchantId: string;
  type: EventType;
  amount: number;
  time: string;                    // ISO 8601, e.g. 2026-10-18T19:42:10+05:30
  settledAt?: string;              // when the sale was settled to the merchant
  payerId?: string;                // VPA / card token / customer ref (hashed on import)
  payerState?: string;             // 2-letter state code
  channel: Channel;
  paymentLinkId?: string;          // payment link or terminal used
  orderId?: string | null;         // order the payment belongs to (null = checked, none found)
  refundOfTransactionId?: string;  // REFUND only: the original sale
  paidTo?: string;                 // REFUND / TRANSFER: destination account, if not the payer
  beneficiaryAccount?: string;     // SETTLEMENT / TRANSFER: account that received the money
  sourceFeed?: string;
}

export interface MreDataset {
  format: typeof DATASET_FORMAT;
  title?: string;
  description?: string;
  merchant: MerchantProfile;
  peers?: PeerInfo[];
  weeklySales: { week: string; actual: number | null; seasonalMultiplier: number }[];
  transactions: DatasetTransaction[];
  matchFixtures?: string[];
  dataAvailability?: Partial<Record<CoverageKey, CoverageState>>;
  website?: { embeds: EmbedRecord[]; catalogue: CatalogueItem[] };
  orders?: OrderRecord[];
  bankCredits?: { amount: number; beneficiaryAccount: string }[];
  purchaserVerification?: { contacted: number; confirmed: number } | null;
  businessFootprint?: { supplierPaymentsMonthly: number; gstTurnoverMonthly: number } | null;
  externalSightings?: Sighting[];
  graph?: GraphSpec;
}

/* ---------- time helpers (IST, the timezone the scenarios are built in) ---------- */
const IST = 19800000;
export function toIst(ms: number): string {
  const d = new Date(Math.round(ms) + IST).toISOString();
  return d.slice(0, 19) + '+05:30';
}

/* ---------- export ---------- */
export function scenarioToDataset(sc: Scenario, extra?: { title?: string; description?: string }): MreDataset {
  // Destination and beneficiary identifiers are stored hashed; give each a stable readable alias.
  const alias = new Map<string, string>();
  const name = (h: string | undefined, prefix: string) => {
    if (!h || h === '—') return undefined;
    if (!alias.has(h)) alias.set(h, `${prefix}-${String([...alias.values()].filter(v => v.startsWith(prefix)).length + 1).padStart(3, '0')}`);
    return alias.get(h)!;
  };
  const transactions: DatasetTransaction[] = sc.events.map(e => {
    const t: DatasetTransaction = { id: e.id, merchantId: e.merchantId, type: e.type, amount: e.amount, time: toIst(e.eventTime), channel: e.channel };
    if (e.settleTime !== undefined && e.type === 'SALE') t.settledAt = toIst(e.settleTime);
    if (e.payerRef && e.payerRef !== '—') t.payerId = e.payerRef;
    if (e.payerState && e.payerState !== '—') t.payerState = e.payerState;
    if (e.linkId) t.paymentLinkId = e.linkId;
    if (e.orderId !== undefined) t.orderId = e.orderId;
    if (e.linkedSaleId) t.refundOfTransactionId = e.linkedSaleId;
    if (e.destHash !== e.payerHash && e.destHash !== '—') t.paidTo = name(e.destHash, 'ACC');
    if (e.beneficiaryHash) t.beneficiaryAccount = name(e.beneficiaryHash, 'BEN');
    t.sourceFeed = e.source;
    return t;
  });
  return {
    format: DATASET_FORMAT,
    title: extra?.title ?? sc.title,
    description: extra?.description ?? sc.blurb,
    merchant: sc.profile,
    peers: sc.peers,
    weeklySales: sc.weekly.map(w => ({ week: w.week, actual: w.actual, seasonalMultiplier: w.seasonalMult })),
    transactions,
    matchFixtures: sc.fixtures.map(toIst),
    dataAvailability: sc.coverage,
    website: sc.web,
    orders: sc.orders,
    bankCredits: sc.bankCredits.map(b => ({ amount: b.amount, beneficiaryAccount: name(b.beneficiaryHash, 'BEN') ?? 'UNKNOWN' })),
    purchaserVerification: sc.verification,
    businessFootprint: sc.footprint ?? null,
    externalSightings: sc.sightings ?? [],
    graph: sc.graph,
  };
}

/* ---------- import + validation ---------- */
export interface ParseResult { ok: boolean; errors: string[]; warnings: string[]; scenario?: Scenario; summary?: DatasetSummary }
export interface DatasetSummary {
  title: string; merchant: string; city: string; category: string; transactions: number; sales: number; refunds: number;
  settlements: number; transfers: number; from: string; to: string; weeks: number; fixtures: number;
  available: CoverageKey[]; missing: CoverageKey[];
}

const TYPES: EventType[] = ['SALE', 'REFUND', 'TRANSFER', 'SETTLEMENT', 'CHARGEBACK'];
const CHANNELS: Channel[] = ['POS', 'UPI_LINK', 'UPI_COLLECT', 'ONLINE', 'PAYOUT', 'BANK'];
const COVERAGE: CoverageKey[] = ['acquiring', 'website', 'orders', 'bank', 'fulfillment', 'calendar', 'verification'];
const STATES: CoverageState[] = ['AVAILABLE', 'PARTIAL', 'MISSING'];
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const strArr = (x: unknown) => Array.isArray(x) && x.every(isStr);

function defaultSource(t: DatasetTransaction): string {
  return t.type === 'SETTLEMENT' ? 'settlement.ledger' : t.type === 'TRANSFER' ? 'payout.ledger' : t.type === 'REFUND' || t.type === 'CHARGEBACK' ? 'acquirer.refund' : 'acquirer.upi';
}

/** Minimal evidence graph for datasets that do not supply one. */
function autoGraph(p: MerchantProfile, events: PaymentEvent[], embeds: EmbedRecord[], peers: PeerInfo[]): GraphSpec {
  const nodes: GraphSpec['nodes'] = [{ id: 'm1', type: 'merchant', label: p.name, sub: `MCC ${p.mcc} · ${p.city.split(',')[0]}` }];
  const edges: GraphSpec['edges'] = [];
  let k = 0; const edge = (source: string, target: string, type: GraphSpec['edges'][number]['type'], label: string, evidence: string[] = []) => edges.push({ id: `a${++k}`, source, target, type, label, evidence });
  const links = [...new Set(events.filter(e => e.merchantId === p.id && e.linkId).map(e => e.linkId!))];
  links.forEach((l, i) => { nodes.push({ id: `l${i}`, type: l.startsWith('TERM') ? 'device' : 'link', label: l }); edge('m1', `l${i}`, 'ENTITY_RESOLUTION', 'issued to merchant'); });
  [...new Set(embeds.map(e => e.host))].forEach((h, i) => {
    const em = embeds.filter(e => e.host === h), own = p.declaredDomains.includes(h);
    nodes.push({ id: `w${i}`, type: 'website', label: h, sub: own ? 'declared website' : `undeclared · ${em[0].category}` });
    em.forEach(e => { const li = links.indexOf(e.linkId); if (li >= 0) edge(`l${li}`, `w${i}`, 'WEBSITE_LINK', `embedded on ${e.pageType}`, own ? [] : ['G6']); });
  });
  const ben = [...new Set(events.filter(e => e.merchantId === p.id && e.type === 'SETTLEMENT' && e.beneficiaryHash).map(e => e.beneficiaryHash!))];
  ben.forEach((b, i) => { nodes.push({ id: `b${i}`, type: 'beneficiary', label: `Beneficiary ${i + 1}`, sub: b }); edge('m1', `b${i}`, 'SETTLEMENT_RELATIONSHIP', 'settles to', ben.length > 1 ? ['F5'] : []); });
  peers.forEach((q, i) => { nodes.push({ id: `q${i}`, type: 'peer', label: q.name, sub: `${q.status.toLowerCase()} · ${q.accountAgeDays} days` }); edge('m1', `q${i}`, 'BEHAVIOURAL_SIMILARITY', 'cohort peer', ['E3']); });
  return { nodes, edges };
}

export function datasetToScenario(raw: unknown): ParseResult {
  const errors: string[] = [], warnings: string[] = [];
  const fail = (m: string) => { errors.push(m); return { ok: false, errors, warnings }; };
  if (!raw || typeof raw !== 'object') return fail('The file is not a JSON object.');
  const d = raw as Partial<MreDataset>;
  if (d.format !== DATASET_FORMAT) warnings.push(`"format" should be "${DATASET_FORMAT}". Reading it as v1 anyway.`);

  // merchant
  const m = d.merchant as Partial<MerchantProfile> | undefined;
  if (!m || typeof m !== 'object') return fail('Missing "merchant" (the declared business profile).');
  const req: [keyof MerchantProfile, (x: unknown) => boolean, string][] = [
    ['id', isStr, 'text'], ['name', isStr, 'text'], ['city', isStr, 'text'], ['mcc', isStr, 'text'], ['category', isStr, 'text'],
    ['ticketMin', isNum, 'number'], ['ticketMax', isNum, 'number'], ['baselineWeekly', isNum, 'number'], ['accountAgeDays', isNum, 'number'],
    ['localStates', strArr, 'list of state codes'],
  ];
  req.forEach(([k, ok, t]) => { if (!ok(m[k])) errors.push(`merchant.${k} is required (${t}).`); });
  if (!Array.isArray(m.hours) || m.hours.length !== 2 || !m.hours.every(isNum)) errors.push('merchant.hours is required as [open, close] in 24h, e.g. [7, 22].');
  const defaults = { products: [], catchment: 'LOCAL', expectedRoundShare: 0.06, seasonalPeak: 1, declaredDomains: [], declaredChannels: [], declaredActivity: [] } as Partial<MerchantProfile>;
  const profile = { ...defaults, ...m } as MerchantProfile;

  // transactions
  if (!Array.isArray(d.transactions) || !d.transactions.length) errors.push('"transactions" must be a non-empty list.');
  if (!Array.isArray(d.weeklySales) || !d.weeklySales.length) errors.push('"weeklySales" must list weekly sales history (at least the last 8–16 weeks).');
  if (errors.length) return { ok: false, errors, warnings };

  const ids = new Set<string>();
  const events: PaymentEvent[] = [];
  d.transactions!.forEach((t, i) => {
    const at = `transactions[${i}]${t && isStr(t.id) ? ` (${t.id})` : ''}`;
    if (!t || typeof t !== 'object') { errors.push(`${at} is not an object.`); return; }
    if (!isStr(t.id)) errors.push(`${at}: "id" is required.`); else if (ids.has(t.id)) errors.push(`${at}: duplicate id.`); else ids.add(t.id);
    if (!TYPES.includes(t.type)) errors.push(`${at}: "type" must be one of ${TYPES.join(', ')}.`);
    if (!isNum(t.amount) || t.amount < 0) errors.push(`${at}: "amount" must be a positive number in rupees.`);
    if (!CHANNELS.includes(t.channel)) errors.push(`${at}: "channel" must be one of ${CHANNELS.join(', ')}.`);
    if (!isStr(t.merchantId)) errors.push(`${at}: "merchantId" is required.`);
    const time = Date.parse(t.time);
    if (!isStr(t.time) || Number.isNaN(time)) errors.push(`${at}: "time" must be an ISO date-time, e.g. 2026-10-18T19:42:10+05:30.`);
    if (errors.length > 25) return;
    const settle = t.settledAt ? Date.parse(t.settledAt) : undefined;
    const payerRef = t.payerId ?? '—', payerHash = t.payerId ? hashId(t.payerId) : '—';
    const ev: PaymentEvent = {
      id: t.id, merchantId: t.merchantId, type: t.type, amount: t.amount, eventTime: time,
      ingestTime: time + 30000, payerRef, payerHash, destHash: t.paidTo ? hashId(t.paidTo) : payerHash,
      payerState: t.payerState ?? '—', channel: t.channel, source: t.sourceFeed ?? defaultSource(t),
    };
    if (settle !== undefined && !Number.isNaN(settle)) ev.settleTime = settle;
    if (t.type === 'SETTLEMENT') ev.settleTime = time;
    if (t.paymentLinkId) ev.linkId = t.paymentLinkId;
    if (t.orderId !== undefined) ev.orderId = t.orderId;
    if (t.refundOfTransactionId) ev.linkedSaleId = t.refundOfTransactionId;
    if (t.beneficiaryAccount) ev.beneficiaryHash = hashId(t.beneficiaryAccount);
    events.push(ev);
  });
  if (errors.length) { if (errors.length > 25) errors.splice(25, errors.length, '…more errors not shown.'); return { ok: false, errors, warnings }; }
  events.sort((a, b) => a.eventTime - b.eventTime);

  const own = events.filter(e => e.merchantId === profile.id);
  if (!own.length) return fail(`No transactions belong to merchant.id "${profile.id}". Check the merchantId on each transaction.`);
  if (!own.some(e => e.type === 'SALE')) errors.push('The merchant has no SALE transactions to analyse.');
  own.filter(e => e.type === 'REFUND' && e.linkedSaleId && !ids.has(e.linkedSaleId)).length && warnings.push('Some refunds point to a refundOfTransactionId that is not in the file; they will count as refunds without an original sale.');
  if (!own.some(e => e.type === 'SETTLEMENT')) warnings.push('No SETTLEMENT records: settlement checks (F5, F8) will be weaker.');

  const weekly: WeeklyPoint[] = [];
  d.weeklySales!.forEach((w, i) => {
    if (!w || !isStr(w.week) || !(w.actual === null || isNum(w.actual)) || !isNum(w.seasonalMultiplier)) errors.push(`weeklySales[${i}] needs week (text), actual (number or null) and seasonalMultiplier (number).`);
    else weekly.push({ week: w.week, actual: w.actual, seasonalMult: w.seasonalMultiplier });
  });
  if (weekly.length < 6) warnings.push('Fewer than 6 weeks of history: baselines and CUSUM will be less reliable.');

  const fixtures = (d.matchFixtures ?? []).map(Date.parse).filter(x => !Number.isNaN(x));
  if ((d.matchFixtures ?? []).length !== fixtures.length) warnings.push('Some matchFixtures could not be read as dates and were skipped.');

  
  const coverage = { acquiring: 'AVAILABLE', website: 'MISSING', orders: 'MISSING', bank: 'MISSING', fulfillment: 'MISSING', calendar: fixtures.length ? 'AVAILABLE' : 'MISSING', verification: 'MISSING', ...(d.dataAvailability ?? {}) } as Record<CoverageKey, CoverageState>;
  COVERAGE.forEach(k => { if (!STATES.includes(coverage[k])) { errors.push(`dataAvailability.${k} must be AVAILABLE, PARTIAL or MISSING.`); } });
  if (d.website && !d.dataAvailability?.website) coverage.website = 'AVAILABLE';
  if (d.orders?.length && !d.dataAvailability?.orders) coverage.orders = 'AVAILABLE';
  if (d.bankCredits?.length && !d.dataAvailability?.bank) coverage.bank = 'AVAILABLE';
  if (d.purchaserVerification && !d.dataAvailability?.verification) coverage.verification = 'AVAILABLE';
  if (errors.length) return { ok: false, errors, warnings };

  const web = { embeds: d.website?.embeds ?? [], catalogue: d.website?.catalogue ?? [] };
  const peers = d.peers ?? [];
  const sc: Scenario = {
    id: 'custom',
    title: d.title ?? profile.name,
    subtitle: 'Uploaded dataset',
    blurb: d.description ?? `Dataset for ${profile.name}, ${profile.city}.`,
    tone: 'illicit',
    expectedOutcome: 'Unknown until the engine runs: this is your data.',
    scriptedLabel: 'UNRESOLVED',
    primaryMerchantId: profile.id,
    profile, peers, events, weekly, fixtures, coverage, web,
    orders: d.orders ?? [],
    verification: d.purchaserVerification ?? null,
    bankCredits: (d.bankCredits ?? []).map(b => ({ amount: b.amount, beneficiaryHash: hashId(b.beneficiaryAccount) })),
    graph: d.graph ?? autoGraph(profile, events, web.embeds, peers),
    synthetic: d.description ?? 'Uploaded dataset',
    footprint: d.businessFootprint ?? null,
    sightings: d.externalSightings ?? [],
  };

  const sales = own.filter(e => e.type === 'SALE');
  const summary: DatasetSummary = {
    title: sc.title, merchant: profile.name, city: profile.city, category: `${profile.category} (MCC ${profile.mcc})`,
    transactions: own.length, sales: sales.length, refunds: own.filter(e => e.type === 'REFUND').length,
    settlements: own.filter(e => e.type === 'SETTLEMENT').length, transfers: own.filter(e => e.type === 'TRANSFER').length,
    from: toIst(own[0].eventTime).slice(0, 10), to: toIst(own[own.length - 1].eventTime).slice(0, 10), weeks: weekly.length, fixtures: fixtures.length,
    available: COVERAGE.filter(k => coverage[k] !== 'MISSING'), missing: COVERAGE.filter(k => coverage[k] === 'MISSING'),
  };
  return { ok: true, errors, warnings, scenario: sc, summary };
}
