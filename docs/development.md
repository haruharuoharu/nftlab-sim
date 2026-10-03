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

RPCはトランザクション前にGenesis Hashを確認し、Devnet以外を拒否します。ウォレットの拒否やRPCエラーは画面に表示し、成功確認前には進捗を進めません。**承認後に確認が中断した場合は、確認待ち取引の「取引状況を再確認」を使用してください。** 署名・NFTアドレス・操作・進捗のスナップショットを送信前にブラウザへ保存します。確認待ちの間は、新規取引と進捗リセットを停止します。成功時は同じ署名から進捗を復旧し、確定失敗時のみ再試行可能にします。履歴が取得できない場合は期限後も記録を保持します。ブラウザのデータ削除や別端末での復旧は対象外です。Web Locksによる排他制御のためHTTPSまたはlocalhostで利用してください。

NFTメタデータは `/api/metadata/ticket` 等で提供します。公開運用時は `NEXT_PUBLIC_APP_URL` にHTTPSの公開URLを設定してください。localhostで発行したNFTのメタデータは外部ウォレットから読めません。公開前に再発行してください。Android/SeekerのMobile Wallet Adapter専用フローはまだ追加していません。Wallet Standard以外の互換性は実機検証が必要です。

PCのSolflareでの操作は [実機検証ガイド](solflare-pc-test.md) を参照してください。

### 実取引前の読み取り確認

署名鍵を使わず、公開アドレスだけで事前確認できます。RPCは10秒でタイムアウトし、429の自動再試行を行いません。RPCエラーの原文や認証付きURLは出力しません。

```sh
npm run check:devnet -- --wallet YOUR_DEVNET_PUBLIC_ADDRESS
# 公開アプリと独自Anchorを用意した後:
npm run check:devnet -- --wallet YOUR_DEVNET_PUBLIC_ADDRESS --metadata-base https://your-app.example --program YOUR_DEPLOYED_PROGRAM_ID
```

Devnet Genesis Hash、Coreの実行可否、テストSOL残高、指定したAnchorプログラムの実行可否、4種類の公開メタデータJSONを検査します。未指定項目は `pending`、RPC失敗・不足残高・未デプロイは `fail` と表示します。`fail` がある場合は終了コード1です。メタデータの画像URLはHTTPS形式を確認するだけで、画像の取得・ウォレット表示は別途検証します。

`corePrerequisitesMet` と `anchorPrerequisitesMet` は読み取りで確認した条件だけを表します。署名・送信・Faucet要求・デプロイは行いません。Anchorは任意であり、Anchorを設定しなくてもSolflareからのCore NFT操作は可能です。Anchorを有効にする場合は、Devnet上で実行可能なデプロイ済みProgram IDを設定してください。

## PostgreSQL

PostgreSQL 16以上のDBを用意し、`DATABASE_URL` を設定します。

```sh
psql "$DATABASE_URL" -f db/schema.sql
npm run test:db
```

Next.jsを再起動します。設定済みなら進捗をPostgreSQLに同期します。未設定・障害時もブラウザ内の進捗を保持します。保存状態は画面に表示します。学習進捗は練習／Devnetで分離し、HttpOnlyの匿名セッションCookieでDBの行を分離します。ウォレットの本人認証や端末間同期ではありません。同じブラウザではウォレットを切り替えても同じDevnet学習進捗を使用します。

ローカルの進捗がある場合はローカルを優先し、なければ同じ匿名セッションのDB進捗を復元します。共有端末で複数人が使う場合はブラウザプロファイルを分けてください。複数タブの同時編集には競合解決がなく、最後の保存が優先されます。修了証は自己申告の学習記録であり、編集可能な進捗を公的資格や報酬の条件に使用しないでください。

## Anchor（任意の学習記録プログラム）

`programs/nftlab-progress` は学習者のPDAへ3つの完了ビットと日時を保存し、署名と記録順序を検査します。繰り返し記録は冪等です。**クイズ正解やNFT取引を証明するものではなく、自己申告の学習記録です。** 独自プログラムはCoreへのCPIを行いません。NFT操作は既存のMetaplex Coreを直接使用します。

独自プログラムは2026-10-04 JSTにDevnetへデプロイ済みです。Program IDは `BUdXZQwEUkSkQve9wmdzGG4kkz8ViGmvnJ1b2EDAviwR`。Devnetの9項目の学習記録検証にも成功しています（[取引・アカウントの検証結果](devnet-verification.md)）。アプリではデフォルト無効のため、利用する場合は `NEXT_PUBLIC_ANCHOR_PROGRAM_ID` にこのIDを設定し、Next.jsを再起動／再ビルドします。既存のデプロイ済みプログラムを利用するだけなら、Anchorの再ビルドや再デプロイは不要です。

以下は独自にビルド・ローカル検証する場合の手順です。Anchor 0.32.1、Agave 2.3.0、Rust 1.84.1を使用します。Linux x86_64ではRustとCコンパイラ等の開発ツールをインストール後、チェックサムを固定した公式リリースを導入できます。

```sh
bash scripts/install-chain-tools.sh
export PATH="$PWD/target/toolchain:$PWD/target/toolchain/solana-release/bin:$PATH"
anchor build
npm run test:chain
```

`anchor build` はSolana用 `.so` とIDLを生成します。初回は `target/deploy` にProgram ID用の鍵を生成し、ソースとAnchor.tomlのIDを同期します。新しいチェックアウトにデプロイ済みの鍵を持ち込まずビルドすると、記載されたDevnetのIDとは別のIDに変わります。既存のプログラムを更新する場合は、元のProgram ID鍵とアップグレード権限の鍵を使用してください。両方の鍵は運用者のPCで安全に保管し、Gitから除外しています。

Agaveの標準SBFツールチェーンはRust 1.84です。`rust-version`、`.cargo/config.toml`、コミット済み `Cargo.lock` で互換依存を固定しています。ロックファイルを削除して依存を更新する場合は、SBFビルドを再検証してください。ビルドには上流マクロ由来のcfg警告が出ますが、ローカルチェーンでの実行を検証しています。

`npm run test:chain` は一時的なローカルバリデータとテスト鍵を生成します。Devnetの公式Core ProgramDataからプログラムを読み取り、アドレス・ローダー・ELFを検査し、SHA-256とデプロイスロットを出力します。Anchorの9項目とCoreの3シナリオ・修了証を検証し、終了時にローカルチェーンとテスト鍵を削除します。RPC取得にネット接続が必要ですが、DevnetのSOLは使いません。ローカル用メタデータURIは検証用の架空URLであり、外部ウォレット表示は検証していません。アプリ本体はローカルRPCを拒否します。

### Devnetへデプロイ

入金済みの運用者自身のDevnet署名鍵を使用します。

```sh
export NFTLAB_DEPLOY_KEYPAIR=/absolute/path/to/devnet-deployer.json
solana balance --url devnet --keypair "$NFTLAB_DEPLOY_KEYPAIR"
anchor build
anchor deploy --provider.cluster devnet --provider.wallet "$NFTLAB_DEPLOY_KEYPAIR"
solana-keygen pubkey target/deploy/nftlab_progress-keypair.json
```

出力されたProgram IDを `.env.local` の `NEXT_PUBLIC_ANCHOR_PROGRAM_ID` に設定し、Next.jsを再ビルドします。デプロイにはプログラムのrent、IDL、手数料分のテストSOLが必要です。NFTテストの最低残高0.05 SOLだけでは足りません。UIは修了証発行前に3件の自己申告記録を1つの取引で書き込みます。発行済み修了証からも「学習完了を記録」で追加できます。確認済みの記録は署名者・Program ID・PDA・取引署名とともに進捗へ保存し、同じウォレットでの再送信を防ぎます。送信前の記録から復旧する場合も、既存の修了証を保持します（[PC操作手順](solflare-pc-test.md#6-任意のanchor学習記録を追加)）。

### Devnet実取引の自動検証

```sh
export NFTLAB_TEST_KEYPAIR=/absolute/path/to/disposable-devnet-wallet.json
export NFTLAB_TEST_RPC=https://api.devnet.solana.com
export NFTLAB_METADATA_BASE=https://your-public-app.example
npm run test:devnet

export NFTLAB_TEST_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
npm run test:anchor
```

テスト鍵に最低0.05テストSOLを用意します。スクリプトはGenesis Hashを確認し、別の一時ウォレットへ0.002テストSOLを送金します。3シナリオを発行→譲渡→返送→消費し、修了証を発行します。所有者・消費後の状態・所有者以外の消費拒否を検査し、公開鍵と署名だけを出力します。Devnet上の修了証と少量のテスト残高は残ります。`NFTLAB_METADATA_BASE` は `/api/metadata/*` が読める公開アプリのHTTPS originです。実機のWallet Standard/Mobile Wallet Adapter認証を代替するテストではありません。

## チェック

```sh
npm test
npm run typecheck
npm run build
npm run audit
npx playwright install chromium
npm run test:e2e
anchor build
npm run test:chain
```

## 今回の検証結果

2026-10-04 JST時点:

- 単体22件・型チェック・本番ビルド: 成功。確認タイムアウト・保存失敗・復旧の冪等性・履歴不明時の維持、Devnetの読み取り事前確認、既存修了証を保持する学習記録の復旧も検査。
- デスクトップ／モバイル画面のE2E: 学習フローに加え、確認待ち取引の再読込・成功/失敗・履歴不明・破損・複数タブの復旧、発行済み修了証からの記録追加と再読込を検査（16件）。記録追加のテストは一時的なWallet Standardウォレットで署名し、RPCをモックします。実Solflareの承認画面の検証とは区別します。任意Anchorを無効にしたビルドでは追加署名の2件はスキップします。
- PostgreSQL: GitHub Actionsで保存・セッション／モード分離・復元を検証済み。
- Anchor: SBF・IDL生成に成功。ローカルチェーンで順序違反・範囲外・正常記録・所有者とdiscriminator・日時・冪等性・別署名者の拒否・3件の原子的記録、および実際のウォレットクライアントからの署名・事前保存の9項目に成功。
- Core: Devnetから読み取った実プログラムをローカルチェーンで実行し、3シナリオの発行・譲渡・返送・消費、所有者検査、所有者以外の消費拒否、修了証の発行に成功（基本フローは送金を含む14取引）。追加の障害テストはチェーンで発行成功後に確認応答を失い、保存署名から復旧するケースと、保存失敗時に送信しないケースにも成功（復旧用の発行・消費を含め計16取引）。読み取り・preflight・確認を `confirmed` に統一。
- Devnet Core実取引: PCのSolflareで3シナリオの発行・譲渡・利用と修了証発行を完了。10取引すべて `finalized`・`err: null`、修了証の所有者と再読み込み後の進捗保持も確認済み。
- 独自AnchorのDevnetデプロイ・検証: ユーザーのPCからデプロイ成功。RPCで実行可能状態、更新権限、ELF、IDLを確認。`test:anchor` の9項目に成功し、6件の記録取引すべて `finalized`・`err: null`、3つの学習記録が完了ビット `7` と完了日時を保持することを照合済み。[詳細と署名](devnet-verification.md)。
- 公開アプリ・外部ウォレットのメタデータ表示: 未検証。実機で発行したNFTのURIはlocalhost。
- Android/Seeker実機: 未実施。

GitHub Actionsではアプリ／DB／E2Eと、独立したAnchorビルド／ローカルチェーンのジョブを実行します。アプリジョブは任意Anchorの公開Program IDを設定して画面をビルドし、モックRPCで署名から保存・復旧を検証します。実Devnetへは送信しません。DevnetのFaucet・署名鍵はCIへ保存しません。

### 中断後の再開確認

- [PR #1](https://github.com/haruharuoharu/nftlab-sim/pull/1) と現在のHEAD・CIを確認します。`188872d` の [CI run 37132243809](https://github.com/haruharuoharu/nftlab-sim/actions/runs/37132243809) はapp・chainとも成功済みです。
- 2026-10-04 JSTにPCでAnchor再ビルド、ローカルチェーン、Devnetデプロイ、Devnetの `test:anchor` まで完了しました。完了済みの検証を再開のためだけに繰り返す必要はありません。
- `check:devnet` は公開アドレスだけで読み取り確認できます。署名鍵やFaucetを使いません。検証済みのProgram IDと取引・学習記録は [Devnet検証結果](devnet-verification.md) を参照してください。
- 残作業は公開アプリとメタデータの外部表示、Android/Seeker実機、および任意Anchorを有効にしたブラウザ実機の署名フローです。秘密鍵・シードフレーズをチャットへ貼る必要はありません。

## 公開

Next.jsのNode.jsサーバーとPostgreSQLが必要です。静的ファイルだけのCloudflare PagesではAPI/DBは動きません。公開URL・DB・RPCの設定が必要で、このPR自体は公開デプロイを行いません。

## 依存パッケージの監査

`npm audit --omit=dev` は **3件（high 0、critical 0、moderate 3）** です。従来は29件（high 13、moderate 16）でした。未使用のReact Native/Metro依存を除き、jaysonのuuidを修正版へ固定しました。残る3件は同じstream-jsonアドバイザリの依存連鎖です。利用経路と互換性上の理由は [監査記録](dependency-audit.md) に記載しています。CIの `npm run audit` はhigh/criticalの再発時に失敗し、moderateの報告は表示します。
