import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { Connection, Keypair, PublicKey, SystemProgram, VersionedTransaction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { recordReceiptOnConnection } from '../lib/anchor-receipt';
import type { PreparedTransaction } from '../lib/transaction-journal';

const programId = new PublicKey('BUdXZQwEUkSkQve9wmdzGG4kkz8ViGmvnJ1b2EDAviwR');
function fixture(options: { unsigned?: boolean; simulationError?: boolean; confirmationTimeout?: boolean } = {}) {
  const learner = Keypair.generate(), events: string[] = [];
  let transaction: VersionedTransaction | undefined, sentBytes: Uint8Array | undefined;
  const wallet = { publicKey: learner.publicKey, signTransaction: async (tx: VersionedTransaction) => {
    // Reproduce the mobile adapter's serialize-before-sign behavior. Legacy
    // transactions throw here before the wallet can display an approval screen.
    events.push('wallet');const bytes = tx.serialize();
    transaction = VersionedTransaction.deserialize(bytes);
    if (!options.unsigned) transaction.sign([learner]);
    return transaction;
  } } as unknown as WalletContextState;
  const connection = {
    getAccountInfo: async () => ({ executable: true }),
    getLatestBlockhash: async () => ({ blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 500 }),
    simulateTransaction: async (tx: VersionedTransaction, config: { sigVerify: boolean }) => {
      events.push('simulate');assert.equal(config.sigVerify, true);
      const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), learner.publicKey.toBuffer()]), format: 'der', type: 'spki' });
      assert.ok(verify(null, tx.message.serialize(), key, tx.signatures[0]));
      return { value: { err: options.simulationError ? 'insufficient funds' : null } };
    },
    sendRawTransaction: async (bytes: Uint8Array) => { events.push('send');sentBytes = bytes;return bs58.encode(VersionedTransaction.deserialize(bytes).signatures[0]); },
    confirmTransaction: async () => { events.push('confirm');if (options.confirmationTimeout) throw new Error('timeout');return { value: { err: null } }; },
  } as unknown as Connection;
  return { connection, wallet, learner, events, get transaction() { return transaction!; }, get sentBytes() { return sentBytes; } };
}

test('mobile serialize-before-sign accepts an unsigned v0 receipt and preserves all three Anchor instructions', async () => {
  const f = fixture();let saved: PreparedTransaction | undefined;
  const signature = await recordReceiptOnConnection(f.connection, f.wallet, programId.toBase58(), record => { f.events.push('save');saved = record; });
  assert.deepEqual(f.events, ['wallet', 'simulate', 'save', 'send', 'confirm']);
  assert.equal(f.transaction.version, 0);assert.equal(f.transaction.message.header.numRequiredSignatures, 1);
  assert.ok(Buffer.from(f.sentBytes!).equals(Buffer.from(f.transaction.serialize())));
  assert.equal(saved!.signature, signature);assert.equal(saved!.signer, f.learner.publicKey.toBase58());
  assert.equal(saved!.lastValidBlockHeight, 500);
  const [receipt] = PublicKey.findProgramAddressSync([Buffer.from('progress'), f.learner.publicKey.toBuffer()], programId);
  assert.equal(saved!.asset, receipt.toBase58());
  const instructions = f.transaction.message.compiledInstructions, keys = f.transaction.message.getAccountKeys();
  assert.equal(instructions.length, 3);
  const discriminator = createHash('sha256').update('global:record_scenario').digest().subarray(0, 8);
  instructions.forEach((ix, index) => {
    assert.equal(keys.get(ix.programIdIndex)!.toBase58(), programId.toBase58());
    assert.deepEqual([...ix.accountKeyIndexes].map(i => keys.get(i)!.toBase58()), [receipt.toBase58(), f.learner.publicKey.toBase58(), SystemProgram.programId.toBase58()]);
    assert.ok(Buffer.from(ix.data).equals(Buffer.concat([discriminator, Buffer.from([index])])));
  });
});

test('unsigned wallet responses and simulation failures never save or broadcast a receipt', async () => {
  for (const options of [{ unsigned: true }, { simulationError: true }]) {
    const f = fixture(options);let saved = false;
    await assert.rejects(recordReceiptOnConnection(f.connection, f.wallet, programId.toBase58(), () => { saved = true; }));
    assert.equal(saved, false);assert.equal(f.events.includes('send'), false);
  }
});

test('receipt storage failure stops broadcast and confirmation timeout preserves the original signed record', async () => {
  const failedStorage = fixture();
  await assert.rejects(recordReceiptOnConnection(failedStorage.connection, failedStorage.wallet, programId.toBase58(), () => { throw new Error('quota'); }), /quota/);
  assert.deepEqual(failedStorage.events, ['wallet', 'simulate']);
  const f = fixture({ confirmationTimeout: true });let saved: PreparedTransaction | undefined;
  await assert.rejects(recordReceiptOnConnection(f.connection, f.wallet, programId.toBase58(), record => { saved = record; }), /timeout/);
  assert.ok(saved);assert.equal(saved.signature, bs58.encode(f.transaction.signatures[0]));
  assert.deepEqual(f.events, ['wallet', 'simulate', 'send', 'confirm']);
});
