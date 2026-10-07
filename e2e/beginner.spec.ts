import { test, expect, type Page, type BrowserContext, type Route } from '@playwright/test';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { createPublicKey, verify } from 'node:crypto';
import bs58 from 'bs58';
import { MPL_CORE_PROGRAM_ID, Key } from '@metaplex-foundation/mpl-core';
import { getAssetV1AccountDataSerializer } from '@metaplex-foundation/mpl-core/dist/src/generated/types/assetV1AccountData';
import { publicKey } from '@metaplex-foundation/umi';
import { advance, freshProgress } from '../lib/scenarios';
import { translate, type Locale } from '../lib/i18n';
import { JOURNAL_KEY } from '../lib/transaction-journal';
import { AIRDROP_LAMPORTS, DEVNET_GENESIS } from '../lib/devnet-airdrop';

async function setup(page: Page, context: BrowserContext, options: { faucetFails?: boolean; pauseConfirmation?: boolean } = {}) {
  // Ephemeral signer and mocked RPC only. No on-chain writes or stored secrets.
  const learner = Keypair.generate(), asset = Keypair.generate().publicKey.toBase58();
  const owner = learner.publicKey.toBase58();const calls: string[] = [];let balance = 0, sent = 0, confirm = !options.pauseConfirmation;
  const progress = advance(advance(freshProgress(), 'ticket', 'unlock'), 'ticket', 'mint', { asset, owner });
  const accountData = Buffer.from(getAssetV1AccountDataSerializer().serialize({ key: Key.AssetV1, owner: publicKey(owner),
    updateAuthority: { __kind: 'Address', fields: [publicKey(owner)] }, name: 'NFTLab test', uri: 'https://nftlab.invalid/api/metadata/ticket', seq: null })).toString('base64');
  await page.exposeFunction('signTrainingTransaction', (bytes: number[]) => {
    const tx = VersionedTransaction.deserialize(Uint8Array.from(bytes));tx.sign([learner]);return [...tx.serialize()];
  });
  await context.addInitScript(({ address, bytes, progress }) => {
    if (!sessionStorage.getItem('beginner-seeded')) {
      localStorage.setItem('nftlab-v1-devnet', JSON.stringify(progress));sessionStorage.setItem('beginner-seeded', 'yes');
    }
    const account = { address, publicKey: new Uint8Array(bytes), chains: ['solana:devnet'], features: ['solana:signTransaction'] };
    let connected = false;const listeners = new Set<(properties: unknown) => void>();
    const wallet = { version: '1.0.0', name: 'NFTLab Beginner Wallet', icon: 'data:image/svg+xml;base64,PHN2Zy8+', chains: ['solana:devnet'],
      get accounts() { return connected ? [account] : []; }, features: {
        'standard:connect': { version: '1.0.0', connect: async () => { connected = true;listeners.forEach(fn => fn({ accounts: [account] }));return { accounts: [account] }; } },
        'standard:disconnect': { version: '1.0.0', disconnect: async () => { connected = false;listeners.forEach(fn => fn({ accounts: [] })); } },
        'standard:events': { version: '1.0.0', on: (_event: string, fn: (properties: unknown) => void) => { listeners.add(fn);return () => listeners.delete(fn); } },
        'solana:signTransaction': { version: '1.0.0', supportedTransactionVersions: ['legacy', 0], signTransaction: async (...inputs: { transaction: Uint8Array }[]) => Promise.all(inputs.map(async input => ({ signedTransaction: Uint8Array.from(await (window as unknown as { signTrainingTransaction(bytes: number[]): Promise<number[]> }).signTrainingTransaction([...input.transaction])) }))) },
      } };
    window.addEventListener('wallet-standard:app-ready', event => (event as CustomEvent<{ register(wallet: unknown): void }>).detail.register(wallet));
  }, { address: owner, bytes: [...learner.publicKey.toBytes()], progress });
  const respond = async (route: Route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': '*' } });return; }
    const req = route.request().postDataJSON();calls.push(req.method);let result: unknown;
    switch (req.method) {
      case 'getGenesisHash': result = DEVNET_GENESIS;break;
      case 'getBalance': result = { context: { slot: 100 }, value: balance };break;
      case 'requestAirdrop':
        expect(req.params).toEqual([owner, AIRDROP_LAMPORTS]);
        if (options.faucetFails) { await route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32005, message: 'Test distribution limit' } }) });return; }
        balance = AIRDROP_LAMPORTS;result = '2'.repeat(88);break;
      case 'getAccountInfo': result = { context: { slot: 100 }, value: { data: [accountData, 'base64'], executable: false, lamports: 10_000_000, owner: MPL_CORE_PROGRAM_ID, rentEpoch: 0 } };break;
      case 'getLatestBlockhash': result = { context: { slot: 100 }, value: { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 500 } };break;
      case 'simulateTransaction':
      case 'sendTransaction': {
        const tx = VersionedTransaction.deserialize(Buffer.from(req.params[0], 'base64'));
        const keys = tx.message.getAccountKeys();
        for (let i = 0; i < tx.message.header.numRequiredSignatures; i++) {
          const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), keys.get(i)!.toBuffer()]), format: 'der', type: 'spki' });
          expect(verify(null, tx.message.serialize(), key, tx.signatures[i])).toBe(true);
        }
        expect(keys.get(0)!.toBase58()).toBe(owner);
        expect(tx.message.compiledInstructions.every(ix => keys.get(ix.programIdIndex)!.toBase58() === MPL_CORE_PROGRAM_ID)).toBe(true);
        expect(tx.message.compiledInstructions).toHaveLength(sent === 0 ? 2 : 1);
        if (sent === 0) expect(tx.message.header.numRequiredSignatures).toBe(2);
        if (req.method === 'simulateTransaction') result = { context: { slot: 100 }, value: { err: null, logs: [], unitsConsumed: 1000 } };
        else {
          const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), JOURNAL_KEY);
          expect(saved.signature).toBe(bs58.encode(tx.signatures[0]));expect(saved.owner).toBe(owner);
          if (sent === 0) { expect(saved.practicePartner).toBe(keys.get(1)!.toBase58());expect(saved.action).toBe('transfer'); }
          sent++;result = saved.signature;
        }
        break;
      }
      case 'getBlockHeight': result = 100;break;
      case 'getSignatureStatuses': result = { context: { slot: 100 }, value: [confirm ? { slot: 100, confirmations: null, err: null, confirmationStatus: 'confirmed' } : null] };break;
      default: throw new Error(`Unexpected beginner RPC: ${req.method}`);
    }
    await route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) });
  };
  await context.route('https://api.devnet.solana.com', respond);await context.route('https://api.devnet.solana.com/**', respond);
  await context.routeWebSocket('wss://api.devnet.solana.com/**', ws => ws.onMessage(message => {
    const req = JSON.parse(String(message));ws.send(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: req.method === 'signatureSubscribe' ? 1 : true }));
  }));
  return { owner, calls, confirm: () => { confirm = true; }, sends: () => sent };
}
async function connect(page: Page, locale: Locale, selected = false) {
  const t = (s: string) => translate(locale, s);
  if (!selected) { await page.getByRole('button', { name: t('ウォレットを選択') }).click();await page.getByRole('button', { name: 'NFTLab Beginner Wallet', exact: false }).click(); }
  await page.getByRole('button', { name: locale === 'en' ? 'Connect NFTLab Beginner Wallet' : 'NFTLab Beginner Walletを接続', exact: true }).click();
}
for (const locale of ['ja', 'en'] as const) {
  const t = (s: string) => translate(locale, s);
  test(`${locale}: low balance auto-funds and one wallet transfers, returns, and redeems`, async ({ page, context }) => {
    const f = await setup(page, context);await page.goto(`/?lang=${locale}`);
    await page.getByRole('button', { name: t('Devnetで体験 ↗'), exact: true }).click();
    await expect(page.getByRole('region', { name: t('Devnetをはじめる') })).toBeVisible();
    await expect(page.getByRole('button', { name: t('練習相手（ウォレット1つ）') })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: t('別のウォレットへ送る') }).click();
    await expect(page.getByLabel(t('譲渡先のDevnetアドレス'))).toBeVisible();
    await expect(page.getByRole('button', { name: t('NFTを譲渡する →'), exact: true })).toBeDisabled();
    await page.getByRole('button', { name: t('練習相手（ウォレット1つ）') }).click();await connect(page, locale);
    await expect(page.getByText(t('準備完了。クイズとNFTの体験へ進めます。'))).toBeVisible();
    expect(f.calls.filter(x => x === 'requestAirdrop')).toHaveLength(1);
    await page.getByRole('button', { name: t('NFTを譲渡して受け取る →') }).click();
    await expect(page.getByText(t('往復の譲渡が完了しました。現在の所有者はあなたです。同じウォレットでNFTを利用できます。'))).toBeVisible();
    await page.reload();await page.getByRole('button', { name: t('Devnetで体験 ↗'), exact: true }).click();await connect(page, locale, true);
    await expect(page.getByText(t('往復の譲渡が完了しました。現在の所有者はあなたです。同じウォレットでNFTを利用できます。'))).toBeVisible();
    await page.getByRole('button', { name: t('NFTを利用・消費する →') }).click();
    await expect(page.getByText(t('利用を確認しました。このシナリオは完了です。'))).toBeVisible();
    const stored = await page.evaluate(key => ({ progress: JSON.parse(localStorage.getItem('nftlab-v1-devnet')!), pending: localStorage.getItem(key) }), JOURNAL_KEY);
    expect(stored.progress.records.ticket.stage).toBe('redeemed');expect(stored.progress.records.ticket.owner).toBe(f.owner);expect(stored.progress.records.ticket.practicePartner).toBeTruthy();expect(stored.pending).toBeNull();
    expect(f.sends()).toBe(2);expect(f.calls.filter(x => x === 'requestAirdrop')).toHaveLength(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test(`${locale}: distribution limits show faucet guidance and do not retry on reload`, async ({ page, context }) => {
    const f = await setup(page, context, { faucetFails: true });await page.goto(`/?lang=${locale}`);
    await page.getByRole('button', { name: t('Devnetで体験 ↗'), exact: true }).click();await connect(page, locale);
    await expect(page.getByText(t('自動取得できませんでした。配布制限や接続状況により、Faucetでの取得が必要な場合があります。'))).toBeVisible();
    await expect(page.getByRole('link', { name: t('無料のテストSOLをFaucetで取得 ↗') })).toHaveAttribute('href', 'https://faucet.solana.com/');
    await page.getByRole('button', { name: t('残高を再確認') }).click();
    await expect(page.getByText(t('配布の再要求は10分間隔です。Faucetから取得することもできます。'))).toBeVisible();
    await page.reload();await page.getByRole('button', { name: t('Devnetで体験 ↗'), exact: true }).click();await connect(page, locale, true);
    await expect(page.getByText(t('配布の再要求は10分間隔です。Faucetから取得することもできます。'))).toBeVisible();
    expect(f.calls.filter(x => x === 'requestAirdrop')).toHaveLength(1);expect(f.sends()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test(`${locale}: interrupted practice transfer recovers its partner and owner without resending`, async ({ page, context }) => {
    const f = await setup(page, context, { pauseConfirmation: true });await page.goto(`/?lang=${locale}`);
    await page.getByRole('button', { name: t('Devnetで体験 ↗'), exact: true }).click();await connect(page, locale);
    await page.getByRole('button', { name: t('NFTを譲渡して受け取る →') }).click();
    await expect.poll(f.sends).toBe(1);
    const pending = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), JOURNAL_KEY);
    expect(pending.practicePartner).toBeTruthy();expect(pending.owner).toBe(f.owner);
    await page.reload();await page.getByRole('button', { name: t('Devnetで体験 ↗'), exact: true }).click();
    f.confirm();await page.getByRole('button', { name: t('取引状況を再確認') }).click();
    await expect(page.getByText(t('往復の譲渡が完了しました。現在の所有者はあなたです。同じウォレットでNFTを利用できます。'))).toBeVisible();
    const restored = await page.evaluate(key => ({ progress: JSON.parse(localStorage.getItem('nftlab-v1-devnet')!), pending: localStorage.getItem(key) }), JOURNAL_KEY);
    expect(restored.progress.records.ticket.practicePartner).toBe(pending.practicePartner);
    expect(restored.progress.records.ticket.signature).toBe(pending.signature);expect(restored.progress.records.ticket.owner).toBe(f.owner);
    expect(restored.pending).toBeNull();expect(f.sends()).toBe(1);
  });
}
