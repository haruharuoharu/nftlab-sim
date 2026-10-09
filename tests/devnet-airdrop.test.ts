import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRDROP_COOLDOWN_MS, AIRDROP_LAMPORTS, DEVNET_GENESIS, MIN_TEST_LAMPORTS, ensureDevnetFunds } from '../lib/devnet-airdrop';
const signature = '2'.repeat(88), address = '11111111111111111111111111111111';
function fixture(balance = 0) {
  const values = new Map<string, string>();const calls: number[] = [];let current = balance;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const reader = { genesis: async () => DEVNET_GENESIS, balance: async () => current,
    request: async (lamports: number) => { calls.push(lamports);assert.ok(values.size, 'Cooldown must be saved before request');current += lamports;return signature; } };
  return { values, calls, storage, reader };
}
test('a low Devnet balance requests half a test SOL after saving the cooldown', async () => {
  const f = fixture();const result = await ensureDevnetFunds(address, f.storage, f.reader, 1000);
  assert.deepEqual(f.calls, [AIRDROP_LAMPORTS]);assert.equal(result.status, 'ready');assert.equal(result.balance, AIRDROP_LAMPORTS);
  assert.equal(result.signature, signature);
});
test('a sufficient balance makes no faucet request or storage write', async () => {
  const f = fixture(MIN_TEST_LAMPORTS);assert.equal((await ensureDevnetFunds(address, f.storage, f.reader)).status, 'ready');
  assert.deepEqual(f.calls, []);assert.equal(f.values.size, 0);
});
test('a non-Devnet connection makes no balance query or faucet request', async () => {
  const f = fixture();f.reader.genesis = async () => 'wrong-network';f.reader.balance = async () => { throw new Error('Must not read balance'); };
  assert.equal((await ensureDevnetFunds(address, f.storage, f.reader)).status, 'wrong-network');assert.deepEqual(f.calls, []);
});
test('a failed or timed-out request stays on cooldown across repeated checks', async () => {
  const f = fixture();f.reader.request = async (amount) => { f.calls.push(amount);throw new Error('rate limited'); };
  assert.equal((await ensureDevnetFunds(address, f.storage, f.reader, 1000)).status, 'unavailable');
  assert.equal((await ensureDevnetFunds(address, f.storage, f.reader, 1001)).status, 'cooldown');
  assert.equal((await ensureDevnetFunds(address, f.storage, f.reader, 1000 + AIRDROP_COOLDOWN_MS)).status, 'unavailable');
  assert.equal(f.calls.length, 2);
});
test('a request signature alone is not reported as a funded wallet', async () => {
  const f = fixture();f.reader.request = async amount => { f.calls.push(amount);return signature; };
  const result = await ensureDevnetFunds(address, f.storage, f.reader, 1000);
  assert.equal(result.status, 'requested');assert.equal(result.balance, 0);
  const next = await ensureDevnetFunds(address, f.storage, f.reader, 1001);
  assert.equal(next.status, 'cooldown');assert.equal(next.signature, signature);assert.equal(f.calls.length, 1);
});
test('blocked storage, a lost write or invalid cooldown prevents a request', async () => {
  for (const storage of [
    { getItem: () => { throw new Error('blocked'); }, setItem: () => {} },
    { getItem: () => null, setItem: () => {} },
    { getItem: () => '{', setItem: () => {} },
    { getItem: () => JSON.stringify({ at: 1, signature: 'invalid' }), setItem: () => {} },
  ]) { const f = fixture();assert.equal((await ensureDevnetFunds(address, storage, f.reader)).status, 'unavailable');assert.deepEqual(f.calls, []); }
});
test('a clock going backwards does not repeat a request', async () => {
  const f = fixture();f.reader.request = async amount => { f.calls.push(amount);return signature; };
  await ensureDevnetFunds(address, f.storage, f.reader, 1000);
  assert.equal((await ensureDevnetFunds(address, f.storage, f.reader, 999)).status, 'cooldown');assert.equal(f.calls.length, 1);
});
test('invalid balances and invalid signatures never imply funding success', async () => {
  const f = fixture();f.reader.balance = async () => NaN;
  const invalid = await ensureDevnetFunds(address, f.storage, f.reader);
  assert.equal(invalid.status, 'unavailable');assert.equal(invalid.balance, null);assert.equal(f.calls.length, 0);
  f.reader.balance = async () => 0;f.reader.request = async () => 'bad';
  assert.equal((await ensureDevnetFunds(address, f.storage, f.reader)).status, 'unavailable');
});
