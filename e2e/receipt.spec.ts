import { test, expect, type Route } from '@playwright/test';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import type { Progress } from '../lib/scenarios';
import { JOURNAL_KEY } from '../lib/transaction-journal';

const programId = process.env.NEXT_PUBLIC_ANCHOR_PROGRAM_ID || 'BUdXZQwEUkSkQve9wmdzGG4kkz8ViGmvnJ1b2EDAviwR';
const completed: Progress = { version: 1, records: { ticket: { stage: 'redeemed' }, loyalty: { stage: 'redeemed' }, membership: { stage: 'redeemed' } },
  certificate: { id: '6J8sX1je9fFSfLjQo4G8aUCNLAq93e8Q4oNDU8uixo4j', date: '2026-10-03T15:01:16.000Z', signature: '3'.repeat(88) } };

test('an issued certificate can add a signed receipt without another NFT mint', async ({ page, context }) => {
  test.skip(!process.env.NEXT_PUBLIC_ANCHOR_PROGRAM_ID, 'Optional Anchor UI is disabled; CI enables it explicitly.');
  // This ephemeral wallet and all RPC responses are test-only. No network writes.
  const learner = Keypair.generate();const calls: string[] = [];let savedBeforeSend = false;
  await context.addInitScript(({ publicKey, address, seed, progress }) => {
    if (!sessionStorage.getItem('receipt-seeded')) {
      localStorage.setItem('nftlab-v1-devnet', JSON.stringify(progress));sessionStorage.setItem('receipt-seeded', 'yes');
    }
    const account = { address, publicKey: new Uint8Array(publicKey), chains: ['solana:devnet'], features: ['solana:signTransaction'] };
    let connected = false;const listeners = new Set<(properties: unknown) => void>();
    const wallet = { version: '1.0.0', name: 'NFTLab Test Wallet', icon: 'data:image/svg+xml;base64,PHN2Zy8+', chains: ['solana:devnet'],
      get accounts() { return connected ? [account] : []; },
      features: {
        'standard:connect': { version: '1.0.0', connect: async () => { connected = true;listeners.forEach(fn => fn({ accounts: [account] }));return { accounts: [account] }; } },
        'standard:disconnect': { version: '1.0.0', disconnect: async () => { connected = false;listeners.forEach(fn => fn({ accounts: [] })); } },
        'standard:events': { version: '1.0.0', on: (_event: string, fn: (properties: unknown) => void) => { listeners.add(fn);return () => listeners.delete(fn); } },
        'solana:signTransaction': { version: '1.0.0', supportedTransactionVersions: ['legacy', 0], signTransaction: async (...inputs: { transaction: Uint8Array }[]) => {
          // Ed25519 PKCS8 header followed by the temporary 32-byte private seed.
          const key = await crypto.subtle.importKey('pkcs8', new Uint8Array([48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32, ...seed]), 'Ed25519', false, ['sign']);
          return Promise.all(inputs.map(async ({ transaction }) => {
            if (transaction[0] !== 1) throw new Error('Expected one test signer');
            const signedTransaction = new Uint8Array(transaction);
            signedTransaction.set(new Uint8Array(await crypto.subtle.sign('Ed25519', key, signedTransaction.slice(65))), 1);
            return { signedTransaction };
          }));
        } },
      },
    };
    window.addEventListener('wallet-standard:app-ready', event => (event as CustomEvent<{ register: (wallet: unknown) => void }>).detail.register(wallet));
  }, { publicKey: [...learner.publicKey.toBytes()], address: learner.publicKey.toBase58(), seed: [...learner.secretKey.slice(0, 32)], progress: completed });
  const respond = async (route: Route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': '*' } });return; }
    const request = route.request().postDataJSON();calls.push(request.method);let result: unknown;
    switch (request.method) {
      case 'getGenesisHash': result = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';break;
      case 'getBalance': result = { context: { slot: 100 }, value: 10_000_000 };break;
      case 'getAccountInfo': result = { context: { slot: 100 }, value: { data: ['', 'base64'], executable: true, lamports: 1, owner: 'BPFLoaderUpgradeab1e11111111111111111111111', rentEpoch: 0 } };break;
      case 'getLatestBlockhash': result = { context: { slot: 100 }, value: { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 500 } };break;
      case 'simulateTransaction': result = { context: { slot: 100 }, value: { err: null, logs: [], unitsConsumed: 1000 } };break;
      case 'sendTransaction': {
        const transaction = Transaction.from(Buffer.from(request.params[0], 'base64'));
        expect(transaction.verifySignatures()).toBe(true);expect(transaction.instructions).toHaveLength(3);
        expect(transaction.instructions.every(ix => ix.programId.toBase58() === programId)).toBe(true);
        const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), JOURNAL_KEY);
        const signature = bs58.encode(transaction.signature!);expect(saved.signature).toBe(signature);expect(saved.programId).toBe(programId);
        expect(saved.before.certificate).toEqual(completed.certificate);savedBeforeSend = true;result = signature;break;
      }
      case 'getBlockHeight': result = 100;break;
      case 'getSignatureStatuses': result = { context: { slot: 100 }, value: [{ slot: 100, confirmations: null, err: null, confirmationStatus: 'confirmed' }] };break;
      default: throw new Error(`Unexpected mock RPC: ${request.method}`);
    }
    await route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) });
  };
  await context.route('https://api.devnet.solana.com', respond);await context.route('https://api.devnet.solana.com/**', respond);
  await context.routeWebSocket('wss://api.devnet.solana.com/**', ws => ws.onMessage(message => {
    const request = JSON.parse(String(message));ws.send(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: request.method === 'signatureSubscribe' ? 1 : true }));
  }));
  await page.goto('/');await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  const button = page.getByRole('button', { name: '学習完了を記録', exact: false });
  await expect(button).toBeDisabled();await page.getByRole('button', { name: 'ウォレットを選択' }).click();
  await page.getByRole('button', { name: 'NFTLab Test Wallet', exact: false }).click();
  await expect(button).toBeEnabled();await button.click();
  await expect(page.getByText('接続ウォレットに学習完了を記録しました。')).toBeVisible();
  await expect(page.getByRole('button', { name: 'このウォレットに記録済み' })).toBeDisabled();
  expect(savedBeforeSend).toBe(true);expect(calls.filter(method => method === 'sendTransaction')).toHaveLength(1);
  const stored = await page.evaluate(key => ({ progress: JSON.parse(localStorage.getItem('nftlab-v1-devnet')!), pending: localStorage.getItem(key) }), JOURNAL_KEY);
  const [receipt] = PublicKey.findProgramAddressSync([Buffer.from('progress'), learner.publicKey.toBuffer()], new PublicKey(programId));
  expect(stored.progress.certificate).toEqual(completed.certificate);expect(stored.progress.receipt.id).toBe(receipt.toBase58());expect(stored.progress.receipt.wallet).toBe(learner.publicKey.toBase58());expect(stored.pending).toBeNull();
  await page.reload();await page.getByRole('button', { name: 'Devnetで体験', exact: false }).click();
  await expect(page.getByText('学習完了を記録済みです。')).toBeVisible();await page.getByRole('button', { name: 'NFTLab Test Walletを接続' }).click();
  await expect(page.getByRole('button', { name: 'このウォレットに記録済み' })).toBeDisabled();
  expect(calls.filter(method => method === 'sendTransaction')).toHaveLength(1);expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
