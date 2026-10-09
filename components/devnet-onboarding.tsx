"use client";
import { useLanguage } from './language-provider';

export default function DevnetOnboarding() {
  const {t}=useLanguage();
  return <section className="devnet-onboarding" aria-label={t('Devnetをはじめる')}>
    <div><p className="eyebrow">START WITH CONFIDENCE</p><h2>{t('Devnetは、失敗しても学べる練習用ネットワークです。')}</h2><p>{t('ここで使うSOLやNFTに金銭的な価値はありません。実際の購入は不要です。')}</p></div>
    <ol><li><strong>{t('1. ウォレットを接続')}</strong><p>{t('右上から接続します。ウォレットにネットワークの設定がある場合はDevnetを選びます。このアプリはDevnetだけに接続します。')}</p></li>
    <li><strong>{t('2. 無料のテストSOLを用意')}</strong><p>{t('残高が少ないときは0.5テストSOLの自動取得を試みます。配布制限で取得できない場合は、下のFaucetから受け取れます。')}</p></li>
    <li><strong>{t('3. ウォレット1つで実践')}</strong><p>{t('発行 → 練習相手への譲渡と自動返送 → 利用の順に体験します。3つ完了すると修了証を発行できます。')}</p></li></ol>
  </section>;
}
