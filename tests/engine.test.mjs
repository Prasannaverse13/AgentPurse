// Rule engine tests. Run: npm test  (Node 22.6+)
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../lib/engine.ts';

const agent = { id: 'a1', name: 'Shopper', kind: '', initials: 'SH', key: 'k', dailyCap: 200, autoApproveLimit: 100, status: 'active', shops: ['amazon', 'staples'], createdAt: '' };
const rule = (kind, params = {}, agentId = null) => ({ id: kind, agentId, text: kind, kind, params, on: true, parsedBy: 'seed', createdAt: '' });
const db = (over = {}) => ({ balance: 1000, agents: [agent], rules: [], txns: [], fundings: [], events: [], ...over });
const req = (over = {}) => ({ amount: 20, merchant: 'Amazon', item: 'Paper', reason: 'Out of paper', ...over });
const paid = (amount, minsAgo = 1) => ({ id: 'x' + Math.random(), agentId: 'a1', agentName: 'Shopper', item: 'i', merchant: 'm', merchantEmail: '', amount, currency: 'USD', reason: '', status: 'paid', decidedBy: 'rules', checks: [], createdAt: new Date(Date.now() - minsAgo * 60000).toISOString(), updatedAt: new Date(Date.now() - minsAgo * 60000).toISOString() });

test('small buy inside every limit is paid automatically', () => {
  assert.equal(evaluate(db(), agent, req()).decision, 'auto');
});
test('over the auto approve limit waits for the owner', () => {
  assert.equal(evaluate(db(), agent, req({ amount: 150 })).decision, 'ask');
});
test('over the daily cap waits for the owner', () => {
  const d = db({ txns: [paid(190, 1)] });
  assert.equal(evaluate(d, agent, req({ amount: 30 })).decision, 'ask');
});
test('frozen wallet is blocked', () => {
  assert.equal(evaluate(db(), { ...agent, status: 'frozen' }, req()).decision, 'block');
});
test('amount above the purse balance is blocked', () => {
  assert.equal(evaluate(db({ balance: 10 }), agent, req({ amount: 20 })).decision, 'block');
});
test('allow list blocks an unknown shop', () => {
  const d = db({ rules: [rule('allow_list_only')] });
  assert.equal(evaluate(d, agent, req({ merchant: 'Macys' })).decision, 'block');
  assert.equal(evaluate(d, agent, req({ merchant: 'Staples' })).decision, 'auto');
});
test('blocked words stop a buy', () => {
  const d = db({ rules: [rule('block_keywords', { words: ['gift card'] })] });
  assert.equal(evaluate(d, agent, req({ item: 'Gift card x20' })).decision, 'block');
});
test('ask_over asks, block_over blocks', () => {
  const big = { ...agent, dailyCap: 5000, autoApproveLimit: 5000 };
  assert.equal(evaluate(db({ rules: [rule('ask_over', { value: 300 })] }), big, req({ amount: 400 })).decision, 'ask');
  assert.equal(evaluate(db({ rules: [rule('block_over', { value: 300 })] }), big, req({ amount: 400 })).decision, 'block');
});
test('block beats ask', () => {
  const d = db({ rules: [rule('block_keywords', { words: ['crypto'] })] });
  assert.equal(evaluate(d, agent, req({ amount: 150, item: 'crypto coin' })).decision, 'block');
});
test('velocity rule freezes when many buys add up fast', () => {
  const old = Array.from({ length: 10 }, () => paid(5, 3000)); // small usual spend
  const small = { ...agent, dailyCap: 40, autoApproveLimit: 40 };
  const d = db({ agents: [small], rules: [rule('velocity_freeze', { factor: 3 })], txns: [paid(30), paid(30), paid(30), ...old] });
  assert.equal(evaluate(d, small, req({ amount: 30 })).decision, 'freeze');
});
test('rules for another agent are ignored', () => {
  const d = db({ rules: [rule('block_over', { value: 1 }, 'someone_else')] });
  assert.equal(evaluate(d, agent, req()).decision, 'auto');
});
test('time window asks outside the hours', () => {
  const h = new Date().getUTCHours();
  const out = db({ rules: [rule('time_window', { from: (h + 2) % 24, to: (h + 3) % 24 })] });
  assert.equal(evaluate(out, agent, req()).decision, 'ask');
});
