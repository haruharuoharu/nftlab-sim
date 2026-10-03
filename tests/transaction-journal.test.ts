import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, freshProgress, type Progress } from '../lib/scenarios';
import { JOURNAL_KEY, applyConfirmed, clearPending, commitConfirmed, readPending, recoveryState, savePending, type JournalStorage, type PendingTransaction } from '../lib/transaction-journal';

const asset = '11111111111111111111111111111111';
function pending(before = advance(freshProgress(), 'ticket', 'unlock')): PendingTransaction {
  return { version: 1, id: 'cd2e1417-907a-4b01-ae44-3944c52e6c1c', scope: 'ticket', action: 'mint',
    asset, owner: asset, signer: asset, signature: '2'.repeat(88), blockhash: asset,
    lastValidBlockHeight: 500, createdAt: '2026-10-03T12:00:00.000Z', before };
}
function storage(): JournalStorage {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
}

test('a pending transaction survives reopening and prevents another transaction', () => {
  const store = storage(), record = pending();
  savePending(store, record);
  assert.deepEqual(readPending(store), record);
  assert.throws(() => savePending(store, { ...record, id: 'bdb5b4bf-d8e8-4b0f-bb88-c1bf67fc6705' }), /確認待ち/);
  assert.throws(() => clearPending(store, 'wrong-id'), /更新/);
  assert.equal(readPending(store)!.signature, record.signature);
});

test('unknown, expired-looking or processed status is not mistaken for failure', () => {
  assert.equal(recoveryState(null), 'pending');
  assert.equal(recoveryState({ err: null, confirmationStatus: 'processed' }), 'pending');
  assert.equal(recoveryState({ err: 'failure', confirmationStatus: 'processed' }), 'pending');
  assert.equal(recoveryState({ err: null, confirmationStatus: 'confirmed' }), 'confirmed');
  assert.equal(recoveryState({ err: 'failure', confirmationStatus: 'finalized' }), 'failed');
});

test('confirmed mint restores missing progress and recovery remains idempotent', () => {
  const record = pending();
  const restored = applyConfirmed(freshProgress(), record);
  assert.equal(restored.records.ticket.stage, 'minted');
  assert.equal(restored.records.ticket.asset, asset);
  assert.equal(restored.records.ticket.signature, record.signature);
  assert.deepEqual(applyConfirmed(restored, record), restored);
  const newer = advance(restored, 'ticket', 'transfer', { owner: 'later owner' });
  assert.deepEqual(applyConfirmed(newer, record), newer);
});

test('recovery refuses to overwrite another NFT or certificate', () => {
  const record = pending();
  const other = advance(record.before, 'ticket', 'mint', { asset: 'different NFT' });
  assert.throws(() => applyConfirmed(other, record), /一致/);
  const completed: Progress = { version: 1, records: { ticket: { stage: 'redeemed' }, loyalty: { stage: 'redeemed' }, membership: { stage: 'redeemed' } } };
  const certificate = { ...record, scope: 'certificate' as const, before: completed };
  const restored = applyConfirmed(completed, certificate);
  assert.equal(restored.certificate!.id, asset);
  assert.deepEqual(applyConfirmed(restored, certificate), restored);
  assert.throws(() => applyConfirmed({ ...completed, certificate: { id: 'another', date: record.createdAt } }, certificate), /別の修了証/);
});

test('progress write failure keeps journal; successful retry commits before clearing', () => {
  const store = storage(), record = pending();savePending(store, record);
  const failing = { ...store, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => commitConfirmed(failing, record.before, record), /quota/);
  assert.ok(readPending(store));
  const next = commitConfirmed(store, record.before, record);
  assert.equal(next.records.ticket.asset, asset);
  assert.deepEqual(JSON.parse(store.getItem('nftlab-v1-devnet')!), next);
  assert.equal(store.getItem(JOURNAL_KEY), null);
});

test('journal removal failure can recover again without duplicating progress', () => {
  const store = storage(), record = pending();savePending(store, record);
  const failing = { ...store, removeItem: () => { throw new Error('unavailable'); } };
  assert.throws(() => commitConfirmed(failing, record.before, record), /unavailable/);
  const written = JSON.parse(store.getItem('nftlab-v1-devnet')!);
  assert.ok(readPending(store));
  assert.deepEqual(commitConfirmed(store, written, record), written);
});

test('malformed or oversized records fail closed instead of silently unlocking mint', () => {
  const store = storage();
  for (const value of ['{', JSON.stringify({ version: 2 }), 'x'.repeat(12_001)]) {
    store.setItem(JOURNAL_KEY, value);
    assert.throws(() => readPending(store), /読み取れません/);
    assert.equal(store.getItem(JOURNAL_KEY), value);
  }
});
