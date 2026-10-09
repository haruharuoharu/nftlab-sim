"use client";
import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { ensureDevnetFunds, type FundingResult } from '@/lib/devnet-airdrop';
import { useLanguage } from './language-provider';

// Strict Mode remounts and duplicate views share the same request in this tab.
const inFlight = new Map<string, Promise<FundingResult>>();
function funding(endpoint: string, address: string) {
  const key = `${endpoint}:${address}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const connection = new Connection(endpoint, { commitment: 'confirmed', disableRetryOnRateLimit: true,
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15_000) }) });
  const publicKey = new PublicKey(address);
  const reader = { genesis: () => connection.getGenesisHash(), balance: () => connection.getBalance(publicKey), request: (lamports: number) => connection.requestAirdrop(publicKey, lamports) };
  const noRequest = { getItem: () => { throw new Error('No transaction lock'); }, setItem: () => { throw new Error('No transaction lock'); } };
  const promise: Promise<FundingResult> = (async () => navigator.locks
    ? await navigator.locks.request<Promise<FundingResult>>(`nftlab-airdrop-${address}`, () => ensureDevnetFunds(address, localStorage, reader))
    : await ensureDevnetFunds(address, noRequest, reader))().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

export default function DevnetWalletStatus({ endpoint }: { endpoint: string }) {
  const {t}=useLanguage();
  const wallet = useWallet();
  const address = wallet.publicKey?.toBase58();
  const [funds, setFunds] = useState<{ address: string; result: FundingResult } | null>(null);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const check = useCallback(async (active: () => boolean = () => true) => {
    if (!address) return;
    setChecking(true);setMessage('');
    try { const result = await funding(endpoint, address); if (active()) setFunds({ address, result }); }
    catch { if (active()) setFunds({ address, result: { status: 'unavailable', balance: null } }); }
    finally { if (active()) setChecking(false); }
  }, [address, endpoint]);
  useEffect(() => { let active = true;void check(() => active);return () => { active = false; }; }, [check]);
  const result = funds && funds.address === address ? funds.result : null;
  // Give a landing airdrop a few balance checks, without another request.
  useEffect(() => {
    if (!result?.signature || result.status === 'ready') return;
    let active = true;let attempts = 0;let timer: ReturnType<typeof setTimeout>;
    const poll = async () => { if (!active) return;await check(() => active);if (active && ++attempts < 3) timer = setTimeout(poll, 2500); };
    timer = setTimeout(poll, 2500);
    return () => { active = false;clearTimeout(timer); };
  }, [check, result?.signature, result?.status === 'ready']);
  if (!wallet.connected || !address) return <section className="wallet-status" aria-label={t('Devnetウォレット')}>
    <p>{t(wallet.connecting ? 'ウォレットへの接続を待っています。' : 'ウォレットは未接続です。右上のボタンから接続してください。')}</p>
    <p>{t('再読み込み後は接続し直してください。学習進捗と発行済みの修了証は保存されています。')}</p>
  </section>;
  const needsFunds = result?.status !== 'ready';
  const status = checking ? '無料テストSOLの準備を確認しています…' : result?.status === 'ready' ? '準備完了。クイズとNFTの体験へ進めます。' : result?.status === 'wrong-network' ? '接続先がDevnetではありません。テストSOLは要求していません。' : result?.signature ? 'テストSOLを要求しました。入金を確認中です。' : result?.status === 'cooldown' ? '配布の再要求は10分間隔です。Faucetから取得することもできます。' : '自動取得できませんでした。配布制限や接続状況により、Faucetでの取得が必要な場合があります。';
  return <section className="wallet-status" aria-label={t('Devnetウォレット')}>
    <p>{t('接続中: ')}{wallet.wallet?.adapter.name ?? 'Wallet'}</p>
    <p className="address">{t('公開アドレス: ')}{address}</p>
    <p>{t('テストSOL残高: ')}{result?.balance !== null && result?.balance !== undefined ? `${(result.balance / LAMPORTS_PER_SOL).toFixed(5)} SOL` : checking ? t('確認中…') : t('取得できません')}</p>
    <p className="funding-status" role="status">{t(status)}</p>
    <div><button disabled={checking} onClick={() => void check()}>{t('残高を再確認')}</button><button onClick={async () => { try { await navigator.clipboard.writeText(address);setMessage('公開アドレスをコピーしました。'); } catch { setMessage('公開アドレスを選択してコピーしてください。'); } }}>{t('公開アドレスをコピー')}</button>
    {needsFunds && <a className="faucet-link" href="https://faucet.solana.com/" target="_blank" rel="noreferrer">{t('無料のテストSOLをFaucetで取得 ↗')}</a>}</div>
    {needsFunds && <p className="hint">{t('公開アドレスをコピーし、FaucetのDevnetに貼り付けて取得します。戻ったら残高を再確認してください。')}</p>}
    {result?.signature && <a className="tx" href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`} target="_blank" rel="noreferrer">{t('テストSOLの配布取引を確認 ↗')}</a>}
    <p role="status">{t(message)}</p>
  </section>;
}
