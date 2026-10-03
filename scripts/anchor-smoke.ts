import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import { loadTestKey, requireTestNetwork, testWallet } from './test-wallet';
import { recordReceiptOnConnection } from '../lib/anchor-receipt';
import type { PreparedTransaction } from '../lib/transaction-journal';

async function main() {
  const endpoint = process.env.NFTLAB_TEST_RPC || 'https://api.devnet.solana.com';
  const connection = new Connection(endpoint, 'confirmed');
  await requireTestNetwork(connection, process.env.NFTLAB_ALLOW_LOCAL === '1');
  const payer = await loadTestKey();
  if (!process.env.NFTLAB_TEST_PROGRAM_ID) throw new Error('Set NFTLAB_TEST_PROGRAM_ID to the deployed program address.');
  const programId = new PublicKey(process.env.NFTLAB_TEST_PROGRAM_ID);
  assert.ok((await connection.getAccountInfo(programId))?.executable, 'Program must be deployed');
  const learner = Keypair.generate(), other = Keypair.generate(), clientLearner = Keypair.generate();
  await sendAndConfirmTransaction(connection, new Transaction().add(...[learner, other, clientLearner].map(key => SystemProgram.transfer({
    fromPubkey: payer.publicKey, toPubkey: key.publicKey, lamports: 5_000_000,
  }))), [payer]);
  const [receipt] = PublicKey.findProgramAddressSync([Buffer.from('progress'), learner.publicKey.toBuffer()], programId);
  const discriminator = createHash('sha256').update('global:record_scenario').digest().subarray(0, 8);
  const ix = (scenario: number, signer = learner, address = receipt) => new TransactionInstruction({
    programId, keys: [
      { pubkey: address, isSigner: false, isWritable: true },
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ], data: Buffer.concat([discriminator, Buffer.from([scenario])]),
  });
  let attempt = 0;
  const send = (scenario: number, signer = learner, address = receipt) => sendAndConfirmTransaction(connection,
    new Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 + attempt++ }), ix(scenario, signer, address)), [signer]);
  // Assert the exact custom errors, so an RPC outage cannot look like a passed negative test.
  await assert.rejects(send(1), /OutOfOrder|0x1771/);
  await assert.rejects(send(3), /InvalidScenario|0x1770/);
  const signatures = [];
  for (const scenario of [0, 1, 2]) signatures.push(await send(scenario));
  const info = await connection.getAccountInfo(receipt);
  assert.ok(info);
  assert.ok(info.owner.equals(programId));
  assert.ok(info.data.subarray(0, 8).equals(createHash('sha256').update('account:LearningReceipt').digest().subarray(0, 8)));
  assert.ok(new PublicKey(info.data.subarray(8, 40)).equals(learner.publicKey));
  assert.equal(info.data[40], 7);
  assert.ok(info.data.readBigInt64LE(41) > 0n);
  await send(2);
  assert.ok((await connection.getAccountInfo(receipt))!.data.equals(info.data), 'Retry must preserve completion time');
  await assert.rejects(send(0, other), /ConstraintSeeds|0x7d6/);
  const [otherReceipt] = PublicKey.findProgramAddressSync([Buffer.from('progress'), other.publicKey.toBuffer()], programId);
  signatures.push(await sendAndConfirmTransaction(connection, new Transaction().add(...[0, 1, 2].map(s => ix(s, other, otherReceipt))), [other]));
  assert.equal((await connection.getAccountInfo(otherReceipt))!.data[40], 7, 'The app records all three scenarios atomically');
  let saved: PreparedTransaction | undefined;
  const clientSignature=await recordReceiptOnConnection(connection,testWallet(clientLearner),programId.toBase58(),record=>{saved=record;});
  assert.ok(saved);
  assert.equal(saved.signature,clientSignature);
  assert.equal(saved.signer,clientLearner.publicKey.toBase58());
  assert.equal((await connection.getAccountInfo(new PublicKey(saved.asset)))!.data[40],7,'Wallet-adapter client records and journals the atomic receipt');
  signatures.push(clientSignature);
  console.log(JSON.stringify({ endpoint, programId: programId.toBase58(), receipt: receipt.toBase58(), checks: ['out-of-order rejected', 'invalid index rejected', 'ordered records', 'receipt owner and discriminator', 'completion timestamp', 'idempotent retry', 'other signer rejected', 'atomic completion', 'wallet-adapter receipt and pre-broadcast journal'], signatures }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
