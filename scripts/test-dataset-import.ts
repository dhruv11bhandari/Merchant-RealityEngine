import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datasetToScenario } from '../frontend/src/data/dataset';
import { runInvestigation } from '../frontend/src/engines/investigationEngine';

const path = process.argv[2] ?? 'frontend/public/samples/mre-dataset-template.json';
const raw = JSON.parse(readFileSync(path, 'utf8')) as { transactions: { channel: string }[] };
const imported = datasetToScenario(raw);
assert.equal(imported.ok, true, imported.errors.join('\n'));
assert.ok(imported.scenario);
assert.ok(imported.scenario.events.every(event => ['POS', 'UPI_LINK', 'UPI_COLLECT', 'ONLINE', 'PAYOUT', 'BANK'].includes(event.channel)));
assert.ok(imported.scenario.events.some(event => event.channel === 'UPI_LINK'), 'UPI alias should normalize to UPI_LINK');
const analysis = runInvestigation(imported.scenario);
const primaryTransactions = imported.scenario.events.filter(event => event.merchantId === imported.scenario!.primaryMerchantId).length;
assert.equal(analysis.events.length, primaryTransactions, 'the AI engine should analyze every primary-merchant transaction');

const formattedAlias = structuredClone(raw);
formattedAlias.transactions[0].channel = ' pos ';
assert.equal(datasetToScenario(formattedAlias).ok, true, 'case and surrounding whitespace should normalize');

const invalid = structuredClone(raw);
invalid.transactions[0].channel = 'CRYPTO';
const rejected = datasetToScenario(invalid);
assert.equal(rejected.ok, false, 'unknown channel values must remain invalid');
assert.ok(rejected.errors.some(error => error.includes('channel')));

console.log(`Dataset import and AI engine checks passed for ${path} (${raw.transactions.length} transactions; ${analysis.fusion.decision}).`);
