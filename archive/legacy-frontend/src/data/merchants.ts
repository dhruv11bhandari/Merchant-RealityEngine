import type { MerchantProfile, PeerInfo, WebData, CatalogueItem } from '../types/merchant';
import { FAB_PRICES } from './transactions';

export const PROFILES: Record<string, MerchantProfile> = {
  bakery: {
    id: 'M-SCB-001', name: 'Sweet Crumbs Bakery', city: 'Bengaluru, India', mcc: '5462', category: 'Bakeries',
    products: ['Breads', 'Cakes', 'Pastries', 'Festive boxes'], ticketMin: 150, ticketMax: 1200, hours: [7, 22],
    catchment: 'LOCAL', localStates: ['KA'], expectedRoundShare: 0.06, seasonalPeak: 2.0, baselineWeekly: 180000, accountAgeDays: 1180,
    declaredDomains: ['sweetcrumbs.example'], declaredChannels: ['In-store POS', 'Local deliveries'], declaredActivity: ['In-store purchases', 'Local deliveries'],
  },
  rotation: {
    id: 'M-NOVA-204', name: 'Nova Gift Emporium', city: 'Mumbai, India', mcc: '5947', category: 'Gift, card and novelty shops',
    products: ['Gift hampers', 'Greeting cards', 'Home novelties'], ticketMin: 200, ticketMax: 3500, hours: [10, 21],
    catchment: 'LOCAL', localStates: ['MH'], expectedRoundShare: 0.08, seasonalPeak: 1.5, baselineWeekly: 90000, accountAgeDays: 19,
    declaredDomains: ['novagifts.example'], declaredChannels: ['Online store', 'Local pickup'], declaredActivity: ['Gift retail'],
  },
  fabricated: {
    id: 'M-AHD-310', name: 'Aarav Home Decor Online', city: 'Jaipur, India', mcc: '5712', category: 'Furniture and home furnishings',
    products: ['Furniture', 'Lighting', 'Wall decor'], ticketMin: 800, ticketMax: 9000, hours: [0, 24],
    catchment: 'NATIONAL', localStates: [], expectedRoundShare: 0.04, seasonalPeak: 1.0, baselineWeekly: 150000, accountAgeDays: 240,
    declaredDomains: ['aaravhome.example'], declaredChannels: ['Online store (national shipping)'], declaredActivity: ['Home decor e-commerce'],
  },
  diwali: {
    id: 'M-ANS-045', name: 'Anand Sweets & Bakes', city: 'Bengaluru, India', mcc: '5462', category: 'Bakeries',
    products: ['Mithai', 'Cakes', 'Festive gift boxes', 'Snacks'], ticketMin: 150, ticketMax: 1200, hours: [7, 22],
    catchment: 'LOCAL', localStates: ['KA'], expectedRoundShare: 0.06, seasonalPeak: 2.0, baselineWeekly: 160000, accountAgeDays: 2410,
    declaredDomains: ['anandsweets.example'], declaredChannels: ['In-store POS', 'Local deliveries', 'Website orders'], declaredActivity: ['In-store purchases', 'Local deliveries'],
  },
};

export const PEERS: Record<string, PeerInfo[]> = {
  bakery: [
    { id: 'M-KCA-014', name: 'Koramangala Cafe & Bakes', status: 'ACTIVE', accountAgeDays: 940 },
    { id: 'M-HLB-022', name: 'Hebbal Lakeside Bakery', status: 'ACTIVE', accountAgeDays: 1620 },
  ],
  rotation: [
    { id: 'M-GGR-117', name: 'Gift Galaxy Retail', status: 'DORMANT', accountAgeDays: 211 },
    { id: 'M-UNR-308', name: 'Bandra Print & Gifts', status: 'ACTIVE', accountAgeDays: 1305 },
  ],
  fabricated: [], diwali: [],
};

const bakeryCatalogue: CatalogueItem[] = ['Sourdough loaf', 'Chocolate truffle cake', 'Butter croissant', 'Festive box (12)', 'Plum cake', 'Eclair set', 'Rusk jar', 'Cookie tin']
  .map((name, i) => ({ sku: `SCB-${i + 1}`, name, price: [198, 640, 165, 1040, 520, 378, 245, 312][i], inCategory: true, dupImage: false }));
const fabCatalogue: CatalogueItem[] = FAB_PRICES.map((p, i) => ({
  sku: `AHD-${i + 1}`, price: p, inCategory: i % 2 === 0,
  name: ['Teak console table', 'Smart LED earbuds', 'Linen cushion set', 'Designer sneakers', 'Brass pendant lamp', 'Fitness tracker', 'Wall mirror', 'Bluetooth speaker', 'Walnut bookshelf', 'Leather handbag', 'Table lamp', 'Phone gimbal', 'Accent armchair', 'Gaming headset'][i],
  dupImage: i % 14 < 9,
}));
const okCatalogue: CatalogueItem[] = [['Kaju katli box', 899], ['Festive hamper', 1150], ['Chocolate cake', 650], ['Samosa pack', 245], ['Milk sweets tray', 745], ['Bread loaf', 165], ['Diwali gift box', 1130], ['Cupcake six', 378]]
  .map(([name, price], i) => ({ sku: `ANS-${i + 1}`, name: name as string, price: price as number, inCategory: true, dupImage: false }));

export const WEB: Record<string, WebData> = {
  bakery: {
    catalogue: bakeryCatalogue,
    embeds: [
      { id: 'EMB-001', merchantId: 'M-SCB-001', linkId: 'PL-SCB-01', host: 'sweetcrumbs.example', path: '/order', category: 'own', pageType: 'checkout', firstSeen: '2025-08-02' },
      { id: 'EMB-002', merchantId: 'M-SCB-001', linkId: 'PL-SCB-07', host: 'stakearena.example', path: '/wallet/deposit', category: 'gambling', pageType: 'deposit page', firstSeen: '2026-10-17' },
      { id: 'EMB-003', merchantId: 'M-MMR-066', linkId: 'PL-MMR-02', host: 'stakearena.example', path: '/wallet/deposit', category: 'gambling', pageType: 'deposit page', firstSeen: '2026-10-09' },
    ],
  },
  rotation: {
    catalogue: [],
    embeds: [
      { id: 'EMB-101', merchantId: 'M-NOVA-204', linkId: 'PL-NOVA-01', host: 'giftvault-trade.example', path: '/redeem', category: 'resale', pageType: 'gift-card resale', firstSeen: '2026-10-14' },
      { id: 'EMB-102', merchantId: 'M-GGR-117', linkId: 'PL-GGR-05', host: 'giftvault-trade.example', path: '/redeem', category: 'resale', pageType: 'gift-card resale', firstSeen: '2026-08-20' },
    ],
  },
  fabricated: {
    catalogue: fabCatalogue,
    embeds: [{ id: 'EMB-201', merchantId: 'M-AHD-310', linkId: 'CHK-AHD-01', host: 'aaravhome.example', path: '/checkout', category: 'own', pageType: 'checkout', firstSeen: '2026-03-11' }],
  },
  diwali: {
    catalogue: okCatalogue,
    embeds: [
      { id: 'EMB-301', merchantId: 'M-ANS-045', linkId: 'PL-ANS-01', host: 'anandsweets.example', path: '/diwali-orders', category: 'own', pageType: 'checkout', firstSeen: '2025-09-30' },
    ],
  },
};
