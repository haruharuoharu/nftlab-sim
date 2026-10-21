import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { Connection, PublicKey } from '@solana/web3.js';
import { MPL_CORE_PROGRAM_ID } from '@metaplex-foundation/mpl-core';
import { requireTestNetwork } from './test-wallet';

async function main() {
  const connection = new Connection(process.env.NFTLAB_CLONE_RPC || 'https://api.devnet.solana.com', 'confirmed');
  await requireTestNetwork(connection);
  const loader = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
  const program = await connection.getAccountInfo(new PublicKey(MPL_CORE_PROGRAM_ID));
  assert.ok(program?.executable && program.owner.equals(loader));
  assert.equal(program.data.readUInt32LE(0), 2, 'Expected upgradeable Program account');
  const address = new PublicKey(program.data.subarray(4, 36));
  const data = await connection.getAccountInfo(address);
  assert.ok(data);
  assert.ok(data.owner.equals(loader));
  assert.equal(data.data.readUInt32LE(0), 3, 'Expected ProgramData account');
  const elf = data.data.subarray(45);
  assert.ok(elf.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])));
  await mkdir('target/fixtures', { recursive: true });
  await writeFile('target/fixtures/core-devnet.so', elf);
  console.log(JSON.stringify({ network: 'devnet', program: MPL_CORE_PROGRAM_ID, programData: address.toBase58(),
    deploymentSlot: data.data.readBigUInt64LE(4).toString(), sha256: createHash('sha256').update(elf).digest('hex') }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
