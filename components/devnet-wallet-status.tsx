"use client";
import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function DevnetWalletStatus({ endpoint }: { endpoint: string }) {
  const wallet = useWallet();
  const address = wallet.publicKey?.toBase58();
  const [balance, setBalance] = useState<{ address: string; sol: number } | null>(null);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const check = useCallback(async (active: () => boolean = () => true) => {
    if (!wallet.publicKey || !address) return;
    setChecking(true);setMessage('');
    try {
      const connection = new Connection(endpoint, { commitment: 'confirmed', disableRetryOnRateLimit: true,
        fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15_000) }) });
      if (await connection.getGenesisHash() !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') throw new Error('Devnet RPCを確認できません。');
      const lamports = await connection.getBalance(wallet.publicKey);
      if (active()) setBalance({ address, sol: lamports / LAMPORTS_PER_SOL });
    } catch { if (active()) { setBalance(null);setMessage('Devnet残高を取得できません。少し待って再確認してください。'); } }
    finally { if (active()) setChecking(false); }
  }, [address, wallet.publicKey, endpoint]);
  useEffect(() => { let active = true;void check(() => active);return () => { active = false; }; }, [check]);
  if (!wallet.connected || !address) return <section className="wallet-status" aria-label="Devnetウォレット">
    <p>{wallet.connecting ? 'ウォレットへの接続を待っています。' : 'ウォレットは未接続です。右上のボタンから接続してください。'}</p>
    <p>再読み込み後は接続し直してください。学習進捗と発行済みの修了証は保存されています。</p>
  </section>;
  return <section className="wallet-status" aria-label="Devnetウォレット">
    <p>接続中: {wallet.wallet?.adapter.name ?? 'Wallet'}</p>
    <p className="address">公開アドレス: {address}</p>
    <p>テストSOL残高: {balance?.address === address ? `${balance.sol.toFixed(5)} SOL` : checking ? '確認中…' : '取得できません'}</p>
    <div><button disabled={checking} onClick={() => void check()}>残高を再確認</button><button onClick={async () => { try { await navigator.clipboard.writeText(address);setMessage('公開アドレスをコピーしました。'); } catch { setMessage('公開アドレスを選択してコピーしてください。'); } }}>公開アドレスをコピー</button></div>
    <p role="status">{message}</p>
  </section>;
}
