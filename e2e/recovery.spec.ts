import { test, expect, type BrowserContext } from '@playwright/test';
import { advance, freshProgress, type Progress } from '../lib/scenarios';
import { JOURNAL_KEY, type PendingTransaction } from '../lib/transaction-journal';

const before = advance(freshProgress(), 'ticket', 'unlock');
const pending: PendingTransaction = { version: 1, id: 'cd2e1417-907a-4b01-ae44-3944c52e6c1c',
  scope: 'ticket', action: 'mint', asset: '11111111111111111111111111111111',
  owner: '11111111111111111111111111111111', signer: '11111111111111111111111111111111',
  signature: '2'.repeat(88), blockhash: '11111111111111111111111111111111',
  lastValidBlockHeight: 500, createdAt: '2026-10-03T12:00:00.000Z', before };

async function seed(context: BrowserContext, raw = JSON.stringify(pending), progress: Progress = before) {
  await context.addInitScript(({ raw, before, key }) => {
    if (sessionStorage.getItem('recovery-seeded')) return;
    localStorage.setItem(key, raw);
    localStorage.setItem('nftlab-v1-devnet', JSON.stringify(before));
    sessionStorage.setItem('recovery-seeded', 'yes');
  }, { raw, before: progress, key: JOURNAL_KEY });
}
async function rpc(context: BrowserContext, status: unknown, calls: string[] = []) {
  await context.route('https://api.devnet.solana.com/**', route => respond(route));
  await context.route('https://api.devnet.solana.com', route => respond(route));
  async function respond(route: import('@playwright/test').Route) {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': '*' } });return; }
    const req = route.request().postDataJSON();calls.push(req.method);
    const result = req.method === 'getGenesisHash' ? 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'
      : req.method === 'getSignatureStatuses' ? { context: { slot: 100 }, value: [status] }
      : req.method === 'getBlockHeight' ? 501 : null;
    await route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) });
  }
}

test('pending mint survives reload and confirmed recovery updates progress without wallet approval', async ({ page, context }) => {
  const calls: string[] = [];await seed(context);await rpc(context, { slot: 100, confirmations: null, err: null, confirmationStatus: 'confirmed' }, calls);
  await page.goto('/');await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await expect(page.getByRole('region', { name: '確認待ち取引' })).toBeVisible();
  await expect(page.getByRole('button', { name: '学習をリセット' })).toBeDisabled();
  await page.reload();await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await expect(page.getByRole('region', { name: '確認待ち取引' })).toBeVisible();
  await page.getByRole('button', { name: '取引状況を再確認' }).click();
  await expect(page.getByText('取引の成功を確認し、学習記録を復旧しました。')).toBeVisible();
  await expect(page.getByRole('region', { name: '確認待ち取引' })).toHaveCount(0);
  const result = await page.evaluate(key => ({ journal: localStorage.getItem(key), progress: JSON.parse(localStorage.getItem('nftlab-v1-devnet')!) }), JOURNAL_KEY);
  expect(result.journal).toBeNull();expect(result.progress.records.ticket.stage).toBe('minted');expect(result.progress.records.ticket.signature).toBe(pending.signature);
  expect(calls).not.toContain('sendTransaction');expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('missing transaction history after expiry keeps journal and blocks reset', async ({ page, context }) => {
  const calls: string[] = [];await seed(context);await rpc(context, null, calls);
  await page.goto('/');await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await page.getByRole('button', { name: '取引状況を再確認' }).click();
  await expect(page.getByText('取引の有効期限は過ぎていますが', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '学習をリセット' })).toBeDisabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).signature, JOURNAL_KEY)).toBe(pending.signature);
  expect(calls).not.toContain('sendTransaction');
});

test('confirmed failure clears journal without advancing the scenario', async ({ page, context }) => {
  await seed(context);await rpc(context, { slot: 100, confirmations: null, err: { InstructionError: [0, { Custom: 1 }] }, confirmationStatus: 'finalized' });
  await page.goto('/');await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await page.getByRole('button', { name: '取引状況を再確認' }).click();
  await expect(page.getByText('取引の失敗を確認しました。', { exact: false })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), JOURNAL_KEY)).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('nftlab-v1-devnet')!).records.ticket.stage)).toBe('ready');
});

test('corrupted pending record remains stored and prevents a new Devnet operation', async ({ page, context }) => {
  await seed(context, '{');await page.goto('/');await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await expect(page.getByText('確認待ち取引の保存内容を読み取れません。', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '学習をリセット' })).toBeDisabled();
  expect(await page.evaluate(key => localStorage.getItem(key), JOURNAL_KEY)).toBe('{');
});

test('another tab lock blocks recovery until the existing operation finishes', async ({ page, context }) => {
  const calls: string[] = [];await seed(context);await rpc(context, { slot: 100, confirmations: null, err: null, confirmationStatus: 'confirmed' }, calls);
  await page.goto('/');await page.evaluate(() => { void navigator.locks.request('nftlab-devnet-transaction', () => new Promise<void>(resolve => { (window as unknown as { releaseTestLock: () => void }).releaseTestLock = resolve; })); });
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { releaseTestLock: () => void }).releaseTestLock)).toBe('function');
  const other = await context.newPage();await other.goto('/');await other.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await other.getByRole('button', { name: '取引状況を再確認' }).click();
  await expect(other.getByText('別のタブで取引を処理しています。', { exact: false })).toBeVisible();expect(calls).toEqual([]);
  await page.evaluate(() => (window as unknown as { releaseTestLock: () => void }).releaseTestLock());
  await other.getByRole('button', { name: '取引状況を再確認' }).click();
  await expect(other.getByText('取引の成功を確認し、学習記録を復旧しました。')).toBeVisible();
});

test('receipt recovery retains the existing certificate and its links after reload without minting', async ({ page, context }) => {
  const completed: Progress = { version: 1, records: { ticket: { stage: 'redeemed' }, loyalty: { stage: 'redeemed' }, membership: { stage: 'redeemed' } },
    certificate: { id: '6J8sX1je9fFSfLjQo4G8aUCNLAq93e8Q4oNDU8uixo4j', date: '2026-10-03T15:01:16.000Z', signature: '3'.repeat(88) } };
  const receipt: PendingTransaction = { ...pending, scope: 'certificate', action: 'receipt', before: completed, programId: 'BUdXZQwEUkSkQve9wmdzGG4kkz8ViGmvnJ1b2EDAviwR' };
  const calls: string[] = [];await seed(context, JSON.stringify(receipt), completed);await rpc(context, { slot: 100, confirmations: null, err: null, confirmationStatus: 'finalized' }, calls);
  await page.goto('/');await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await page.getByRole('button', { name: '取引状況を再確認' }).click();
  await expect(page.getByRole('region', { name: '確認待ち取引' })).toHaveCount(0);
  const section = page.getByRole('region', { name: 'チェーンの学習記録' });
  await expect(section.getByText('学習完了を記録済みです。')).toBeVisible();
  await expect(section.getByRole('link', { name: '記録の取引を確認' })).toHaveAttribute('href', `https://explorer.solana.com/tx/${receipt.signature}?cluster=devnet`);
  await page.reload();await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await expect(section.getByText('学習完了を記録済みです。')).toBeVisible();
  await expect(page.getByRole('link', { name: '修了証NFTを確認' })).toHaveAttribute('href', `https://explorer.solana.com/address/${completed.certificate!.id}?cluster=devnet`);
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('nftlab-v1-devnet')!));
  expect(restored.certificate).toEqual(completed.certificate);expect(restored.receipt.programId).toBe(receipt.programId);expect(restored.receipt.signature).toBe(receipt.signature);
  expect(calls).not.toContain('sendTransaction');expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
