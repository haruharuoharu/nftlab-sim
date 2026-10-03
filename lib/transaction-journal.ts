import { z } from 'zod';
import { advance, completed, type Progress, type ScenarioId, type Stage } from './scenarios';
import { progressSchema } from './validation';

export const JOURNAL_KEY = 'nftlab-v1-pending';
const address = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const schema = z.object({
  version: z.literal(1), id: z.string().uuid(),
  scope: z.enum(['ticket', 'loyalty', 'membership', 'certificate']),
  action: z.enum(['mint', 'transfer', 'redeem', 'receipt']),
  asset: address, owner: address, signer: address,
  signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/),
  blockhash: address, lastValidBlockHeight: z.number().int().nonnegative(),
  createdAt: z.string().datetime(), before: progressSchema,
}).strict().refine(record => record.scope === 'certificate'
  ? ['mint', 'receipt'].includes(record.action) : record.action !== 'receipt');
export type PendingTransaction = z.infer<typeof schema>;
export type PreparedTransaction = Pick<PendingTransaction,
  'asset' | 'owner' | 'signer' | 'signature' | 'blockhash' | 'lastValidBlockHeight'>;
export type TransactionObserver = (transaction: PreparedTransaction) => void;
export type JournalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readPending(storage: JournalStorage): PendingTransaction | null {
  const raw = storage.getItem(JOURNAL_KEY);
  if (!raw) return null;
  if (raw.length > 12_000) throw new Error('確認待ち取引の保存内容を読み取れません。新しい取引を停止しています。');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('確認待ち取引の保存内容を読み取れません。新しい取引を停止しています。'); }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error('確認待ち取引の保存内容を読み取れません。新しい取引を停止しています。');
  return parsed.data;
}

export function savePending(storage: JournalStorage, pending: PendingTransaction) {
  if (readPending(storage)) throw new Error('確認待ちの取引があります。先に取引状況を再確認してください。');
  const raw = JSON.stringify(schema.parse(pending));
  storage.setItem(JOURNAL_KEY, raw);
  if (storage.getItem(JOURNAL_KEY) !== raw) throw new Error('取引を保存できないため、送信を停止しました。');
}

export function clearPending(storage: JournalStorage, id: string) {
  if (readPending(storage)?.id !== id) throw new Error('確認待ち取引が更新されています。画面を開き直してください。');
  storage.removeItem(JOURNAL_KEY);
  if (storage.getItem(JOURNAL_KEY) !== null) throw new Error('取引の保存内容を更新できませんでした。');
}

const stages: Stage[] = ['locked', 'ready', 'minted', 'transferred', 'redeemed'];
// Restore a lost progress snapshot, while preserving newer stages and refusing
// to overwrite another asset. Repeated recovery must not regress progress.
export function applyConfirmed(current: Progress, pending: PendingTransaction): Progress {
  const restored: Progress = { ...current, records: { ...current.records } };
  for (const id of ['ticket', 'loyalty', 'membership'] as ScenarioId[]) {
    const live = current.records[id], saved = pending.before.records[id];
    if (live.asset && saved.asset && live.asset !== saved.asset) throw new Error('学習記録と取引のNFTが一致しません。記録を保持しています。');
    if (stages.indexOf(live.stage) < stages.indexOf(saved.stage)) restored.records[id] = { ...saved };
  }
  if (pending.action === 'receipt') return restored;
  if (pending.scope === 'certificate') {
    if (pending.action !== 'mint' || completed(restored) !== 3) throw new Error('修了証の学習記録が一致しません。');
    if (current.certificate && current.certificate.id !== pending.asset) throw new Error('別の修了証が記録されています。');
    return { ...restored, certificate: current.certificate ?? { id: pending.asset, date: pending.createdAt, signature: pending.signature } };
  }
  const record = restored.records[pending.scope];
  if (record.asset && record.asset !== pending.asset) throw new Error('学習記録と取引のNFTが一致しません。記録を保持しています。');
  const next = { mint: 'minted', transfer: 'transferred', redeem: 'redeemed' } as const;
  if (stages.indexOf(record.stage) >= stages.indexOf(next[pending.action])) return restored;
  return advance(restored, pending.scope, pending.action,
    { asset: pending.asset, owner: pending.owner, signature: pending.signature });
}

// Persist progress first. If either write fails, retain the journal so recovery
// can safely run again, including after the first write has already succeeded.
export function commitConfirmed(storage: JournalStorage, current: Progress, pending: PendingTransaction): Progress {
  const next = applyConfirmed(current, pending);
  const raw = JSON.stringify(next);
  storage.setItem('nftlab-v1-devnet', raw);
  if (storage.getItem('nftlab-v1-devnet') !== raw) throw new Error('学習記録を保存できません。確認待ち取引を保持しています。');
  clearPending(storage, pending.id);
  return next;
}

export type ObservedStatus = { err: unknown; confirmationStatus?: string | null } | null;
export function recoveryState(status: ObservedStatus): 'confirmed' | 'failed' | 'pending' {
  if (!status || !['confirmed', 'finalized'].includes(status.confirmationStatus ?? '')) return 'pending';
  return status.err ? 'failed' : 'confirmed';
}
