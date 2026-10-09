# Cloudflare Workersで公開する

Next.js 16の既存アプリをOpenNextでWorkers用にビルドします。PCで検証済みのAnchorはそのまま利用します。この手順でAnchorの再ビルド・再デプロイは行いません。

## 現在の公開状態

2026-10-04 10:13 JSTに [NFTLab Sim](https://nftlab-sim.haruharuoharu.workers.dev) を公開済みです。画面・4種類のHTTPSメタデータ・800×800 PNGの取得、公開URLからの修了証発行、PC SolflareとSeekerウォレットの画像・名称表示を確認しています（[検証記録](devnet-verification.md#cloudflare公開と修了証の外部表示)）。既存の公開環境は同じURLへの再デプロイで更新できます。

## 構成

- `nftlab-sim` というWorkerを `workers.dev` のHTTPS URLで公開します。
- 画面、`/api/metadata/*`、800×800の `/nft-card.png`、保存APIを同じoriginで提供します。
- 進捗はブラウザ内に保存します。この公開構成ではPostgreSQL、R2、D1の作成や設定は不要です。
- Devnet RPCと検証済みAnchor Program IDは `wrangler.json` に公開値として固定しています。公開アプリも初期表示は練習モードです。
- NFTのメタデータURIはアクセス中の公開originから生成します。画像もリクエストのoriginを使用するため、初回公開前にURLを調べたり `.env.local` を書き換えたりする必要はありません。

`build:cloudflare` はWorkerの設定をビルド時にも使用します。PCの `.env.local` にあるlocalhost URLやDB設定で公開設定を上書きしません。OpenNextが生成するローカル環境変数のモジュールも空にしてからアップロードします。PCの環境変数ファイル自体は変更しません。

Cloudflare Workers Freeを利用します。Workerのリクエスト数・CPU時間には無料枠の制限があります。公開前のローカルプレビューでの成功は、公開環境の制限内での動作を保証するものではありません。

## PCから公開

ローカルの `npm run dev` が起動中なら、まずそのターミナルでCtrl+Cを押して停止します。ビルドが同じ `.next` を更新するためです。

```sh
cd ~/nftlab-sim
git pull --ff-only origin codex/nftlab-sim-mvp
npm ci
npx wrangler login
```

ブラウザでCloudflareへログインし、Wranglerの操作を許可します。Cloudflareの認証情報をチャットへ貼る必要はありません。

認証完了後、同じターミナルで実行します。

```sh
npm run deploy:cloudflare
```

最後に表示される `https://nftlab-sim.<あなたのサブドメイン>.workers.dev` が公開URLです。このコマンドはCloudflareに実際の公開デプロイを行います。Workerに同名の既存デプロイがあれば更新します。

GitHubとCloudflareの自動連携・PRのマージは、このCLI手順には不要です。PRのブランチを直接ビルドして公開できます。

## 公開後の読み取り確認

初心者向け改善の更新後は「Devnetで体験」を選び、練習用ネットワークの3段階の導入案内を確認します。テストSOL残高が少ない練習用ウォレットで接続し、自動取得かFaucet案内が表示されること、初期選択の「練習相手（ウォレット1つ）」で譲渡・返送した後に同じウォレットで利用できることを確認します。日本語と英語、PCとSeekerで確認してください。既存の進捗・修了証のリセットとAnchorの再デプロイは不要です。

日英切替を含む更新を公開した後は、ヘッダーの「日本語 / English」を確認します。英語から開く共有リンクは `https://nftlab-sim.haruharuoharu.workers.dev/?lang=en` です。教材・クイズ・操作案内・アプリのメッセージ・共有文が英語になります。言語を切り替えても、進捗・修了証・確認待ち取引は共通です。ウォレット自身の画面はウォレット側の言語設定を使用し、発行済みNFTの名前やメタデータURIは変更しません。言語切替の更新にAnchorの再デプロイは不要です。

取得したURLを使用します。

```sh
npm run check:public -- https://nftlab-sim.YOUR_SUBDOMAIN.workers.dev
```

画面の応答、4種類のメタデータ、画像のHTTP応答とPNGデータ・サイズ、未定義IDの404を確認します。ウォレットの署名、Devnetへの送信、進捗の書き込みは行いません。

公開URLをPCのChromeで開き、Devnetに切り替えてSolflareを接続します。公開URLで新たに発行したNFTを、消費する前にSolflareで開き、画像・名前・説明が表示されることを確認します。公開したアプリの取得確認だけでは、Solflareの表示確認を完了したことにはなりません。

localhostと公開URLではブラウザ保存領域が別です。PCの既存の3/3の進捗・修了証は自動移行しません。既存の修了証NFTやAnchorの学習記録はDevnet上に残ります。localhostで発行済みの修了証のURIは元のままで、公開しても外部ウォレットから読めるURIに自動更新されません。

Android/SeekerではWalletProviderのMobile Wallet Adapterが使用されます。修了証発行前のAnchor記録はv0取引で署名します。旧公開版で「Missing signature for public key」が出た場合は、修正版をPCから同じWorkerへデプロイし、SeekerのChromeで再読み込み・同じウォレットへの再接続後に「修了証を発行」を再試行します。学習進捗をリセットしたり、ブラウザの保存データを削除したりする必要はありません。確認待ち取引がある場合は先に「取引状況を再確認」を使います。2026-10-04 10:59 JSTの再デプロイ後、SeekerでAnchor記録と修了証発行がfinalized・err:nullとなり、11:04 JSTにウォレットの画像・名称表示も確認しました（[実機結果](devnet-verification.md#seeker公開修正の実機結果)）。

## 公開せずに検証する

```sh
npm run build:cloudflare
npm run check:cloudflare
npm run dry-run:cloudflare
```

`check:cloudflare` は127.0.0.1:8787でWorkersのローカルランタイムを一時起動し、終了時に停止します。画面・メタデータ・PNG・ブラウザ保存API・異なるOriginの拒否・ローカル環境変数の除外を確認します。`dry-run:cloudflare` はアップロードせずにWorkerのバンドルを検証します。CloudflareのログインやDevnetの署名鍵は不要です。

手動でWorkersの画面を確認する場合:

```sh
npm run preview:cloudflare
```

通常のNode.js開発環境に戻る場合はプレビューをCtrl+Cで停止し、`npm run dev` を実行します。Node.js版の任意PostgreSQL同期も引き続き利用できます。

## 設定・依存の参考

- [OpenNext: Next.js 16対応](https://opennext.js.org/cloudflare)
- [Cloudflare: OpenNextによるWorkers公開](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [OpenNext: 環境変数](https://opennext.js.org/cloudflare/howtos/env-vars)
- [Cloudflare: Workersの制限](https://developers.cloudflare.com/workers/platform/limits/)
- [Metaplex Core: JSON metadataと対応画像形式](https://www.metaplex.com/docs/smart-contracts/core/json-schema)
