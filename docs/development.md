# NFTLab Sim v0.1 開発・検証ガイド

## 起動

Node.js 22以上を使用します。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

http://localhost:3000 を開きます。環境変数はなくても練習モードが使えます。
初期状態は練習モードです。クイズを全問正解すると発行・譲渡・利用を順番に体験でき、利用完了が次のシナリオを解放します。3つを完了すると修了証を発行し、情報を共有できます。

## モードの違い

| 機能 | 練習モード | Devnet |
|---|---|---|
| ウォレット | 不要 | Wallet Standard対応ウォレット |
| NFT | ブラウザ内のシミュレーション | Metaplex Core Asset |
| 手数料 | なし | テストSOL |
| 譲渡先 | 練習パートナー | 別のDevnetアドレス |
| 利用 | 状態を消費済みに変更 | 現在の所有者がNFTをburn |
| 修了証 | シミュレーションID | Devnet Core NFT |

学習内容は実在の特定企業のパイロット実証結果ではなく、一般化した教材です。販売・価格決定・決済機能はありません。特典券はポイント残高ではなく1回限りのクーポンです。会員証シナリオは継続会員証ではなく単発イベント入場権です。

## Devnetのテスト

1. 練習用のウォレットA・Bを用意し、両方をDevnetに切り替えます。Mainnetの資産を使用しません。
2. Devnet Faucet等でテストSOLを受け取ります。
3. DevnetモードでAを接続し、クイズ合格後にNFTを発行します。
4. Bのアドレスを入力し、譲渡します。Explorerリンクで所有者変更を確認します。
5. 同じブラウザでAを切断してBを接続し、NFTを利用します。Bも手数料用テストSOLが必要です。もしくはBからAへ返送してAで利用します。
6. 3シナリオ完了後、修了証を発行してExplorerで確認します。

RPCはトランザクション前にGenesis Hashを確認し、Devnet以外を拒否します。ウォレットの拒否やRPCエラーは画面に表示し、成功確認前には進捗を進めません。**確認がタイムアウトした場合は、Explorerやウォレットで成功状況を確認してから再試行してください。** 現状では送信済み・確認待ち取引の復旧ジャーナルがないため、発行が成功して確認だけ失敗した場合に重複発行の可能性があります。

NFTメタデータは `/api/metadata/ticket` 等で提供します。公開運用時は `NEXT_PUBLIC_APP_URL` にHTTPSの公開URLを設定してください。localhostで発行したNFTのメタデータは外部ウォレットから読めません。公開前に再発行してください。Android/SeekerのMobile Wallet Adapter専用フローはまだ追加していません。Wallet Standard以外の互換性は実機検証が必要です。

## PostgreSQL

PostgreSQL 16以上のDBを用意し、`DATABASE_URL` を設定します。

```sh
psql "$DATABASE_URL" -f db/schema.sql
npm run test:db
```

Next.jsを再起動します。設定済みなら進捗をPostgreSQLに同期します。未設定・障害時もブラウザ内の進捗を保持します。保存状態は画面に表示します。学習進捗は練習／Devnetで分離し、HttpOnlyの匿名セッションCookieでDBの行を分離します。ウォレットの本人認証や端末間同期ではありません。同じブラウザではウォレットを切り替えても同じDevnet学習進捗を使用します。

ローカルの進捗がある場合はローカルを優先し、なければ同じ匿名セッションのDB進捗を復元します。共有端末で複数人が使う場合はブラウザプロファイルを分けてください。複数タブの同時編集には競合解決がなく、最後の保存が優先されます。修了証は自己申告の学習記録であり、編集可能な進捗を公的資格や報酬の条件に使用しないでください。

## Anchor（任意の学習記録プログラム）

`programs/nftlab-progress` は学習者ごとのPDAへ3つのシナリオ完了ビットと日時を保存します。学習者の署名と順序を検査し、繰り返し記録は冪等です。**クイズ正解・Metaplexの取引を検証する証明ではなく、自己申告の学習記録です。** NFT発行・譲渡・消費はMetaplex Coreのデプロイ済みプログラムを直接使用します。独自AnchorプログラムはCoreへのCPIを行いません。

このプログラムは未デプロイで、デフォルトでは無効です。Rust、Solana CLI、Anchor 0.32.1を備えた環境で以下を実施します。

```sh
anchor build
anchor keys sync
anchor build
solana config set --url devnet
anchor deploy --provider.cluster devnet
```

`anchor keys sync` が設定するProgram IDを `.env.local` の `NEXT_PUBLIC_ANCHOR_PROGRAM_ID` に設定し、Next.jsを再ビルドします。公開リポジトリに鍵をコミットしないでください。UIは修了証発行前に3件の自己申告記録を1つの取引で書き込みます。プログラムが存在しなければエラーを表示します。Anchor記録とCore NFT発行は別々の取引です。2件目の失敗時は、学習記録のみ成功している可能性があります。

## チェック

```sh
npm test
npm run typecheck
npm run build
npm run test:db
npx playwright install --with-deps chromium
npm run test:e2e
```

GitHub Actionsはアプリの単体テスト、型検査、ビルド、PostgreSQL結合テスト、ブラウザE2Eを実行します。Rust/Anchorのコンパイル・Devnet取引テストは含みません。

## 今回の検証結果

- ローカル単体テスト、TypeScript検査、Next.js本番ビルド: 成功。
- HTTP/APIスモークテスト: 画面、メタデータ、404、ブラウザ保存fallback、送信元・形式・サイズ検査に成功。
- ブラウザ操作: 3クイズ、9回の練習操作、修了証発行、再読み込み復元、モード分離、390px幅の横はみ出し検査に成功（JavaScriptエラー0件）。Playwright E2E 2件（desktop/mobile）もローカルで成功。
- PostgreSQL実接続: ローカル未実施。GitHub ActionsでDBスキーマ・保存・セッション／モード分離の結合テストに成功。
- Devnet実取引・Android実機: 未実施。実ウォレットで検証が必要。
- Anchorビルド・デプロイ: CLIがないため未実施。

## 公開

Next.jsのNode.jsサーバーとPostgreSQLが必要です。静的ファイルだけのCloudflare PagesデプロイではAPI/DBは動きません。公開URL・DB・RPCの設定が必要で、このPR自体は公開デプロイを行いません。

## 依存パッケージの監査

`npm audit --omit=dev` は29件（high 13件、moderate 16件、critical 0件）を報告しました。主にWallet AdapterのReact Native/Metro系の間接依存と、Solana web3.jsのJSON-RPC系依存に由来します。集計は依存連鎖も数えるため、29件すべてが独立した脆弱性を意味するものではありません。現行依存範囲では自動修正のない項目が含まれます。本番公開前に各アドバイザリの到達可能性と上流修正版を確認してください。このPRでは互換性未確認の強制的なメジャーバージョン置換をしていません。
