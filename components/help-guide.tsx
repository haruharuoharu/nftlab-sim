"use client";

import { useLanguage } from './language-provider';

const copy = {
  ja: {
    title: '使い方・困ったとき',
    intro: '必要な項目を開いて確認できます。',
    items: [
      { title: 'はじめての使い方', steps: [
        'まずは「練習モード」で、クイズ → 発行 → 譲渡 → 利用を体験します。ウォレットやSOLは不要です。',
        'Devnetで試すときは練習用のウォレットを接続し、テストSOL残高を確認します。譲渡は「練習相手（ウォレット1つ）」を選ぶと、同じウォレットで最後まで進められます。',
      ] },
      { title: 'テストSOLを取得できない', steps: [
        '自動取得は配布制限や接続状況により失敗することがあります。再要求は10分間隔です。テストSOLを購入する必要はありません。',
        'Devnetウォレット欄の「公開アドレスをコピー」を押し、下のFaucetを開きます。Devnetを選び、公開アドレスを貼り付けて取得してください。秘密鍵やリカバリーフレーズは入力しません。',
        'アプリへ戻り「残高を再確認」を押します。Faucetでも取得できなければ時間をおき、その間は練習モードを利用できます。',
      ] },
      { title: 'ウォレット承認・取引確認が中断した', steps: [
        'まずウォレットの承認画面が開いていないか確認します。応答が戻らない場合は、同じブラウザでアプリを開き直し、同じウォレットを接続してください。',
        '「確認待ちの取引があります」と表示されたら、「取引状況を再確認」を押します。保存済みの取引を調べ、成功を確認できた場合は進捗を復旧します。',
        '結果が不明な間は、新しく発行したり、進捗をリセットしたり、ブラウザの保存データを削除したりしないでください。時間をおいて再確認します。確認待ちがなくても、ウォレットの履歴で未送信・失敗を確認してから再試行してください。',
      ] },
      { title: 'Explorerで表示エラーが出る', steps: [
        'Explorerは取引やNFTの記録を見るための外部サイトです。表示エラーだけでは、取引の失敗とは判断できません。',
        'アプリのリンクを開き直し、ネットワークがDevnetであることを確認します。改善しない場合は、Explorerのリンクだけをシークレットウィンドウや別のブラウザで開いてください。',
        '学習は元のブラウザで続けてください。表示エラーを理由にNFTを再発行せず、確認待ちの取引はアプリの「取引状況を再確認」から確認します。',
      ] },
      { title: '進捗の保存と修了証について', steps: [
        '学習進捗は、このブラウザに保存します。練習モードとDevnetの進捗は別々です。別の端末・ブラウザへの自動引き継ぎは保証されません。',
        'ブラウザの保存データの削除やシークレットウィンドウの終了で、進捗を失うことがあります。「学習をリセット」は現在のモードの進捗を初期化しますが、Devnet上のNFTは削除しません。',
        '修了証は自己申告の学習記録で、公的資格や認証ではありません。練習モードではブラウザ内のデジタル修了証、Devnetでは練習用NFTを発行します。',
      ] },
    ],
    faucet: '無料テストSOLのFaucetを開く ↗',
  },
  en: {
    title: 'How to use & troubleshooting',
    intro: 'Open a topic when you need help.',
    items: [
      { title: 'Getting started', steps: [
        'Start in Simulation: quiz → mint → transfer → redeem. No wallet or SOL is needed.',
        'For Devnet, connect a practice wallet and check your test SOL balance. Choose “Practice partner (one wallet)” to complete the transfer exercise with the same wallet.',
      ] },
      { title: 'Cannot get test SOL', steps: [
        'Automatic requests can fail due to distribution limits or connection issues. Requests are limited to once every 10 minutes. You do not need to buy test SOL.',
        'In the Devnet wallet section, select “Copy public address”, then open the faucet below. Select Devnet and paste your public address to request tokens. Never enter a private key or recovery phrase.',
        'Return to the app and select “Refresh balance”. If the faucet is also unavailable, wait and try later. You can use Simulation in the meantime.',
      ] },
      { title: 'Wallet approval or transaction confirmation was interrupted', steps: [
        'First check whether the wallet approval screen is still open. If the app does not respond, reopen it in the same browser and reconnect the same wallet.',
        'If “You have a pending transaction” appears, select “Check transaction status”. The app checks the saved transaction and restores progress when success is confirmed.',
        'While the result is unknown, do not mint again, reset progress, or delete browser storage. Wait and check again. Even without a pending record, check your wallet history and confirm that the transaction was not sent or failed before retrying.',
      ] },
      { title: 'Explorer shows a display error', steps: [
        'Explorer is an external site for viewing transaction and NFT records. A display error alone does not mean a transaction failed.',
        'Reopen the link from the app and check that the network is Devnet. If the error continues, open only the Explorer link in a private window or another browser.',
        'Continue learning in your original browser. Do not mint another NFT because of a display error. For pending transactions, use “Check transaction status” in the app.',
      ] },
      { title: 'Saved progress and certificates', steps: [
        'Learning progress is saved in this browser. Simulation and Devnet have separate progress. Automatic transfer to another device or browser is not guaranteed.',
        'Deleting browser storage or closing a private browsing session may lose your progress. “Reset progress” clears progress for the current mode, but does not delete NFTs on Devnet.',
        'Certificates are self-reported learning records, not official qualifications or accreditation. Simulation creates a digital certificate in this browser; Devnet mints a practice NFT.',
      ] },
    ],
    faucet: 'Open the free test SOL faucet ↗',
  },
};

export default function HelpGuide() {
  const { locale } = useLanguage();
  const c = copy[locale];
  return <section id="help" className="help-guide" aria-labelledby="help-title">
    <h2 id="help-title">{c.title}</h2>
    <p>{c.intro}</p>
    {c.items.map((item, i) => <details key={i}>
      <summary>{item.title}</summary>
      <ol>{item.steps.map(step => <li key={step}>{step}</li>)}</ol>
      {i === 1 && <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer">{c.faucet}</a>}
    </details>)}
  </section>;
}
