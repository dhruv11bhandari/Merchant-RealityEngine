import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { labelInvestigation, openInvestigation, respondInvestigation, reviewInvestigation } from './workflow';

process.env.MRE_CASE_STORE = 'memory';

const sweet = JSON.parse(readFileSync(new URL('../frontend/public/samples/01-sweet-crumbs-betting-front.json', import.meta.url), 'utf8'));
const diwali = JSON.parse(readFileSync(new URL('../frontend/public/samples/04-anand-sweets-diwali-genuine.json', import.meta.url), 'utf8'));

const opened = openInvestigation(sweet);
assert.equal(opened.status, 200);
const steps = opened.body.workflow as { state: string; summary: string }[];
assert.equal(steps.length, 7);
assert.deepEqual(steps.slice(0, 5).map(s => s.state), ['done', 'done', 'done', 'done', 'done']);
assert.equal(steps[5].state, 'waiting');
assert.equal(steps[6].state, 'waiting');
assert.equal((opened.body.result as { decision: string }).decision, 'OPEN_CASE');

const id = opened.body.id as string;
const noted = reviewInvestigation(id, { notes: 'Collections do not match a bakery.' });
assert.match((noted.body.workflow as { summary: string }[])[4].summary, /bakery/);

const blocked = respondInvestigation(id, { chosenLevel: 'L4', legalVerified: false, escrowConfirmed: false });
assert.equal((blocked.body.workflow as { state: string }[])[5].state, 'blocked');
assert.match((blocked.body.workflow as { summary: string }[])[5].summary, /Legal authority/);

const acted = respondInvestigation(id, { chosenLevel: 'L3' });
assert.equal((acted.body.workflow as { state: string }[])[5].state, 'done');
assert.equal((acted.body.user as { executed: boolean }).executed, true);

const labeled = labelInvestigation(id, { label: 'CONFIRMED_ILLICIT' });
assert.equal((labeled.body.workflow as { state: string }[])[6].state, 'done');
assert.ok(((labeled.body.learning as { updates: unknown[] }).updates).length > 0);

const quiet = openInvestigation(diwali);
assert.equal((quiet.body.result as { decision: string }).decision, 'NO_CASE');

const bad = openInvestigation({ format: 'nope' });
assert.equal(bad.status, 400);

const rebuilt = respondInvestigation('INV-rebuilt', { chosenLevel: 'L0', dataset: diwali });
assert.equal(rebuilt.status, 200);
assert.equal((rebuilt.body.workflow as { state: string }[])[5].state, 'done');

console.log('api selfcheck ok');
console.log(steps.map((s, i) => `L${i + 1} ${s.state}: ${s.summary}`).join('\n'));
