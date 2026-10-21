import test from 'node:test';
import assert from 'node:assert/strict';
import { base58 } from '@metaplex-foundation/umi/serializers';
import type { TransactionBuilder, Umi } from '@metaplex-foundation/umi';
import { sendNftTransaction } from '../lib/send-nft-transaction';
import type { PreparedTransaction } from '../lib/transaction-journal';

function fixture(options: { simulationError?: boolean; confirmationTimeout?: boolean; signatureRejected?: boolean } = {}) {
  const signature = Uint8Array.from({ length: 64 }, () => 3), events: string[] = [];
  const builder = {
    setBlockhash: () => builder,
    buildAndSign: async () => { events.push('sign');if(options.signatureRejected)throw new Error('wallet rejected');return { signatures: [signature] }; },
  } as unknown as TransactionBuilder;
  const umi = { identity: { publicKey: '11111111111111111111111111111111' }, rpc: {
    getLatestBlockhash: async () => ({ blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 500n }),
    simulateTransaction: async () => { events.push('simulate');return { err: options.simulationError ? 'insufficient funds' : null }; },
    sendTransaction: async () => { events.push('send');return signature; },
    confirmTransaction: async () => { events.push('confirm');if(options.confirmationTimeout)throw new Error('timeout');return { value: { err: null } }; },
  } } as unknown as Umi;
  return { builder, umi, events, signature: base58.deserialize(signature)[0] };
}
const effect = { asset: '11111111111111111111111111111111', owner: '11111111111111111111111111111111' };

test('stores the signed signature before broadcast and retains it on confirmation timeout', async () => {
  const f = fixture({ confirmationTimeout: true });let saved: PreparedTransaction | undefined;
  await assert.rejects(sendNftTransaction(f.umi, f.builder, effect, record => { f.events.push('save');saved = record; }), /timeout/);
  assert.deepEqual(f.events, ['sign', 'simulate', 'save', 'send', 'confirm']);
  assert.equal(saved!.signature, f.signature);
  assert.equal(saved!.asset, effect.asset);
  assert.equal(saved!.lastValidBlockHeight, 500);
});

test('storage failure stops broadcast after signing', async () => {
  const f = fixture();
  await assert.rejects(sendNftTransaction(f.umi, f.builder, effect, () => { throw new Error('quota'); }), /quota/);
  assert.deepEqual(f.events, ['sign', 'simulate']);
});

test('wallet rejection and simulation failure do not create a journal or broadcast', async () => {
  for (const options of [{ simulationError: true }, { signatureRejected: true }]) {
    const f = fixture(options);let saved = false;
    await assert.rejects(sendNftTransaction(f.umi, f.builder, effect, () => { saved = true; }));
    assert.equal(saved, false);
    assert.equal(f.events.includes('send'), false);
  }
});
