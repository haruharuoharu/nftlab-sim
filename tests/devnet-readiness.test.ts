import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDevnetReadiness } from '../lib/devnet-readiness';
const reader = () => ({
  genesis: async () => 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  balance: async (_address: string) => 50_000_000,
  executable: async (_address: string) => true,
  metadata: async (_url: string) => ({ name: 'NFTLab test', image: 'https://app.example/nft-card.svg' }),
});
test('a wrong network stops before any account or metadata reads', async () => {
  const r = reader();r.genesis = async () => 'mainnet';
  r.balance = async () => { throw new Error('must not read'); };
  r.executable = async () => { throw new Error('must not read'); };
  const report = await checkDevnetReadiness({ wallet: 'test' }, r);
  assert.equal(report.checks.length, 1);assert.equal(report.checks[0].status, 'fail');
  assert.equal(report.corePrerequisitesMet, false);
});
test('missing inputs are pending; an RPC error is a failure without exposing credentials', async () => {
  const report = await checkDevnetReadiness({}, reader());
  assert.equal(report.checks.filter(c => c.status === 'pending').length, 3);
  assert.equal(report.corePrerequisitesMet, false);
  const r = reader();r.genesis = async () => { throw new Error('secret RPC api-key=private'); };
  const failed = await checkDevnetReadiness({}, r);
  assert.equal(failed.checks[0].status, 'fail');assert.doesNotMatch(JSON.stringify(failed), /private|api-key/);
});
test('low funds and an undeployed Anchor do not pass; Core readiness is independent of Anchor', async () => {
  const options = { wallet: 'test', program: 'anchor', metadataBase: 'https://app.example' };
  const r = reader();r.balance = async () => 9_995_000;r.executable = async address => address !== 'anchor';
  const blocked = await checkDevnetReadiness(options, r);
  assert.equal(blocked.corePrerequisitesMet, false);assert.equal(blocked.anchorPrerequisitesMet, false);
  r.balance = async () => 50_000_000;
  const ready = await checkDevnetReadiness(options, r);
  assert.equal(ready.corePrerequisitesMet, true);assert.equal(ready.anchorPrerequisitesMet, false);
});
test('metadata is checked before readiness, including all four endpoints and malformed JSON', async () => {
  const urls: string[] = [], r = reader();
  r.metadata = async url => { urls.push(url);return { name: 'NFTLab', image: 'https://app.example/nft-card.svg' }; };
  const options = { wallet: 'test', metadataBase: 'https://app.example' };
  assert.equal((await checkDevnetReadiness(options, r)).corePrerequisitesMet, true);
  assert.equal(urls.length, 4);assert.ok(urls[3].endsWith('/certificate'));
  r.metadata = async () => ({ name: '', image: 'http://localhost/image' });
  assert.equal((await checkDevnetReadiness(options, r)).corePrerequisitesMet, false);
});
