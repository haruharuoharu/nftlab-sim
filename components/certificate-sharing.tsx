"use client";
import { useRef, useState } from 'react';
import { certificateShareText } from '@/lib/i18n';
import { useLanguage } from './language-provider';
import type { Mode } from '@/lib/scenarios';

export default function CertificateSharing({ mode, id }: { mode: Mode; id: string }) {
  const { locale, t } = useLanguage();
  const [message, setMessage] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const url = mode === 'devnet'
    ? `https://explorer.solana.com/address/${encodeURIComponent(id)}?cluster=devnet`
    : `${typeof window === 'undefined' ? '' : window.location.origin}/?lang=${locale}`;
  const text = certificateShareText(locale, mode, id);
  const details = `${text}\n${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(details);
      setManualCopy(false);
      setMessage('修了証の情報とリンクをコピーしました。');
    } catch {
      setManualCopy(true);
      setMessage('コピーできませんでした。下の共有用テキストを選択してコピーしてください。');
    }
  }
  async function share() {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (!navigator.share) { await copy(); return; }
      await navigator.share({ title: 'NFTLab Sim', text, url });
      setMessage('共有操作を完了しました。');
    } catch (error) {
      setMessage(error instanceof Error && error.name === 'AbortError'
        ? '共有を終了しました。必要なら修了証の情報とリンクをコピーできます。'
        : '共有を開けませんでした。「修了証の情報とリンクをコピー」をお使いください。');
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return <div className="certificate-sharing">
    <button className="primary" disabled={busy} onClick={share}>{t('修了証を共有 ↗')}</button>
    <button className="copy-certificate" disabled={busy} onClick={copy}>{t('修了証の情報とリンクをコピー')}</button>
    <p role="status" aria-live="polite">{t(message)}</p>
    {manualCopy && <label>{t('共有用テキスト')}
      <textarea aria-label={t('共有用テキスト')} ref={field} readOnly value={details} onFocus={event => event.currentTarget.select()}/>
      <button onClick={() => { field.current?.focus(); field.current?.select(); }}>{t('テキストを選択')}</button>
    </label>}
  </div>;
}
