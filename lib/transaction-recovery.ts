import { Connection } from '@solana/web3.js';
import { recoveryState, type PendingTransaction } from './transaction-journal';

export async function recoverTransaction(endpoint: string, pending: PendingTransaction) {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('RPCの確認がタイムアウトしました。取引の記録を保持しています。')), 15_000); });
  try { return await Promise.race([checkTransaction(endpoint, pending), timeout]); }
  finally { clearTimeout(timer!); }
}

async function checkTransaction(endpoint: string, pending: PendingTransaction) {
  const connection = new Connection(endpoint, { commitment: 'confirmed', disableRetryOnRateLimit: true });
  if (await connection.getGenesisHash() !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') throw new Error('このRPCはSolana Devnetではありません。');
  const { value: [status] } = await connection.getSignatureStatuses([pending.signature], { searchTransactionHistory: true });
  const state = recoveryState(status);
  if (state !== 'pending') return { state, expired: false };
  const height = await connection.getBlockHeight('finalized');
  // Missing history is not proof of failure, even after expiry. Keep the record
  // rather than authorizing a second mint that may duplicate an older success.
  return { state, expired: height > pending.lastValidBlockHeight };
}
