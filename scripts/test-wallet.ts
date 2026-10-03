import { readFile } from 'node:fs/promises';
import { Connection, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

// CLI-only adapter for disposable testing keys. Never imported into the app.
export function testWallet(keypair: Keypair): WalletContextState {
  async function signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof VersionedTransaction) tx.sign([keypair]);
    else tx.partialSign(keypair);
    return tx;
  }
  return {
    publicKey: keypair.publicKey,
    signTransaction,
    signAllTransactions: async (txs) => Promise.all(txs.map(signTransaction)),
    sendTransaction: async (tx, connection, options) => {
      const signed = await signTransaction(tx);
      return connection.sendRawTransaction(signed.serialize(), options);
    },
  } as WalletContextState;
}
export async function loadTestKey() {
  const path = process.env.NFTLAB_TEST_KEYPAIR;
  if (!path) throw new Error('Set NFTLAB_TEST_KEYPAIR to a funded disposable test keypair JSON path.');
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path, 'utf8'))));
}
export async function requireTestNetwork(connection: Connection, allowLocal = false) {
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(connection.rpcEndpoint).hostname);
  if (allowLocal && local) return;
  if (await connection.getGenesisHash() !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') {
    throw new Error('Only Solana Devnet is allowed.');
  }
}
