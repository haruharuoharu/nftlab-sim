# Devnet検証結果

2026-10-04 JST時点。ユーザーのPCで署名・実行し、Devnet RPCの読み取りで取引とアカウントを照合しました。公開アドレスと署名のみを記載しています。

## 完了した検証

- PC Solflareでチケット・ロイヤルティ特典・メンバーシップを発行→別口座へ譲渡→所有者が利用（Core Burn）。3シナリオ9取引と修了証1取引の計10件がすべて `finalized`・`err: null`。修了証 `6J8sX1je9fFSfLjQo4G8aUCNLAq93e8Q4oNDU8uixo4j` の所有者は口座B `7K49ZAinyCvsZdMf6aWJN7jJ8YbjgnBrpqmm49SnMoSg`。再読み込み・再接続後の3/3完了と修了証の保持も確認。各NFT取引の署名は [PR #1](https://github.com/haruharuoharu/nftlab-sim/pull/1) に記載。
- Fedora PCでRust 1.84.1、Anchor 0.32.1、Agave 2.3.0を使用し、`anchor build` と `npm run test:chain` が成功。
- 独自AnchorをDevnetへデプロイし、`npm run test:anchor` の9項目が成功。順序違反・範囲外・別署名者は期待するエラーで拒否。正常な順次記録、所有者とdiscriminator、完了日時、冪等性、3件の原子的記録、クライアントによる署名と送信前の保存を検証。
- RPCでCLI検証の6件の記録取引（再実行1件を含む）がすべて `finalized`・`err: null`、3つの学習記録が完了ビット `7` と完了日時を保持することを照合。拒否テストはpreflightの検証であり、確定済みの失敗取引として数えていません。
- 任意Anchorを有効にしたPCブラウザで、発行済み修了証から「学習完了を記録」を実行。Solflareの口座Bの署名で3教材の記録に成功し、RPCで取引と学習記録を照合しました（下記）。

## デプロイ済みAnchor

| 項目 | 値 |
|---|---|
| Program ID | [BUdXZQwEUkSkQve9wmdzGG4kkz8ViGmvnJ1b2EDAviwR](https://explorer.solana.com/address/BUdXZQwEUkSkQve9wmdzGG4kkz8ViGmvnJ1b2EDAviwR?cluster=devnet) |
| Loader | `BPFLoaderUpgradeab1e11111111111111111111111`（executable確認済み） |
| Upgrade Authority | `A5T6JpszB9QtBAW6gRYHX7kHTPswiJ8MP5AdhCAEGE8M` |
| ProgramData | `HA9FB2h22NDCof9zttGEVQJG7PyU3uEUK1rHoZREjqgb` |
| デプロイスロット | `507160082` |
| ELFサイズ | 208,576バイト |
| チェーン上ELFのSHA-256 | `06c3ae1ba4cc5ca0d22261a86de8c702f6e6a83a2a6276965ff4fcbf3bc370cd` |
| IDL | `EqK3XzQuWySvXJ9a2rKNkW8SXi7PhhCHFTmKGdXMBTMa` |

IDLを取得・展開し、Program ID、権限、`nftlab_progress` v0.1.0、`record_scenario` 命令が一致することを確認しました。ELFハッシュはチェーンから取得したバイナリの値であり、ソースとの再現可能ビルド照合を実施したという意味ではありません。

| 操作 | Devnet取引 |
|---|---|
| デプロイ | [2PjTJiiB…](https://explorer.solana.com/tx/2PjTJiiBVuVhmXn48A4sd2XbNgWe56MCU1LgHotoF13Yf4T2ocYiE5kU9ieFeVs7bpaPDgojUi8CvRWTFsnJKvPK?cluster=devnet) |
| 教材0を記録 | [2vTDRmWC…](https://explorer.solana.com/tx/2vTDRmWCNbcn79upoQyKsmXEKeJwd4ULMJnzx5FRqkTvzWU7RS3npy53JNMi9zqZEjdPXKrgD8Y6NHPnnV1ZgakM?cluster=devnet) |
| 教材1を記録 | [3CJkMvUd…](https://explorer.solana.com/tx/3CJkMvUdSvfxAJ6PdPp4zJ6TgAzQvMZ1t5rejtV84BDSYmtbiKMXKPm7mJ9uNHuBbJXQugZgbz761HKfC52W2H49?cluster=devnet) |
| 教材2を記録 | [42QgedRS…](https://explorer.solana.com/tx/42QgedRSjvAL89HMfRpC1RrodXNuKibg3dFwMfrdWjFmioYzi3QBnWwxj8anZhmQWJoA5ZkdcFaCvCNg1bJc1mst?cluster=devnet) |
| 教材2を再実行 | [2UoePYPv…](https://explorer.solana.com/tx/2UoePYPvuckzfzFa35eexPqs5t37whRMiaWeffRdVdf7MNyCRefa5shkdcY7N96QSi9tykU3ruoTkhSJZ2ScLWyz?cluster=devnet) |
| 3教材を原子的に記録 | [4PfxDnEM…](https://explorer.solana.com/tx/4PfxDnEMvUZhmzJpayAZekbqDtTbWpMwPeDwMTiyt6JsaNsPkvddS1DeP8oa3SULRMVqPC5YdyBcJmJV7JedMXAB?cluster=devnet) |
| クライアントから3教材を記録 | [5risuuP9…](https://explorer.solana.com/tx/5risuuP94jpfR8M65MgKhomsssEFprApHHu2wdkcCxsjwnyBHM5XeFkNUDFVAAeKbkaJ5gXUQ6QSoiFSjHRXnE6c?cluster=devnet) |

| 学習記録PDA | 完了ビット | 完了日時（Unix秒） |
|---|---|---|
| `tZMbAR6fW5yBEsy87BPT3ojEVSLXPVrSY13UKSAUT5r` | `7` | `1791069313` |
| `BBVdbBURQfMUkmvCaGyjKx6bzVSCckdxVgTrF7SyUAXU` | `7` | `1791069315` |
| `DwMDjtcQwJL1zm6yK9uFtYZP1DTKAXxssjeAnuoYMLsb` | `7` | `1791069316` |

3つとも所有プログラム、学習者公開鍵、`LearningReceipt` discriminatorを確認しました。

## SolflareブラウザからのAnchor記録

2026-10-04 09:00:04 JST。既存の3/3完了と発行済み修了証を使い、「学習完了を記録」を実行しました。

| 項目 | 確認結果 |
|---|---|
| 取引 | [3MJe5ttQ…](https://explorer.solana.com/tx/3MJe5ttQC1WnNp7Vu21T2WNSQVS2kKW6AJyHj7BGXHXzvYwwJGycULAyJVfha8TRwWkve7AFrEFfFsFRScMqtopv?cluster=devnet) |
| 確定状態 | `finalized`、`err: null`、スロット `507172700` |
| 署名者・学習者 | `7K49ZAinyCvsZdMf6aWJN7jJ8YbjgnBrpqmm49SnMoSg`（口座B） |
| 命令 | 同じAnchorプログラムの `record_scenario` を教材0・1・2の順で3件。すべて成功 |
| 学習記録PDA | [2M2WS8UuraJQNGKjutJbBAHcerW3YkxcJoMsP7C4vxSb](https://explorer.solana.com/address/2M2WS8UuraJQNGKjutJbBAHcerW3YkxcJoMsP7C4vxSb?cluster=devnet) |
| アカウント | 50バイト、所有プログラム `BUdXZQwEUkSkQve9wmdzGG4kkz8ViGmvnJ1b2EDAviwR`、`LearningReceipt` discriminatorと学習者公開鍵が一致 |
| 完了状態 | 完了ビット `7`、完了日時 `1791072004`（Unix秒） |
| 取引手数料 | 5,000 lamports（記録アカウントのrentは別） |

この取引の命令はAnchorの学習記録3件のみで、Core NFTの新規発行命令はありません。CLI検証6件に実Solflareの1件を加え、Anchor記録取引は計7件を照合済みです。2026-10-04 09:18 JSTのPC実機画面で、ブラウザの再読み込み・口座Bへの再接続後も3教材の完了、同じ修了証、記録した口座Bの公開アドレス、学習記録と取引のリンクが表示されることを確認しました。追加ボタンは「このウォレットに記録済み」として無効になっており、再送信せずに保持を検証しました。

## Cloudflare公開と修了証の外部表示

2026-10-04 10:13 JSTに [公開アプリ](https://nftlab-sim.haruharuoharu.workers.dev) のデプロイが成功しました。Version IDは `45b6f08f-f72e-441e-8431-d9520af9afe2`、Worker startupは20ms。独立した外部環境から `npm run check:public` に成功し、画面・4種類のHTTPSメタデータ・800×800 PNGと未定義IDの404を確認しました。

| 項目 | 確認結果 |
|---|---|
| 新規修了証 | [2FfsRyv17pSSAA8qXwiTNZB12L8Y4Lj53VSEe5FUNVmj](https://explorer.solana.com/address/2FfsRyv17pSSAA8qXwiTNZB12L8Y4Lj53VSEe5FUNVmj?cluster=devnet) |
| 所有者 | `74Pdkr5RVm7L9brVVWWNZHdMvNUEJknqPZR4vTPXv2x5` |
| 発行取引 | [2kqyirYm…](https://explorer.solana.com/tx/2kqyirYm8hEbaXCjU2m9PEJ3wCuqDnB1J3vU6eWT1Y68uu4NC56J8FupcS5weBirK6sCnG6Z9tG5y6rNnbxW6Z3c?cluster=devnet) |
| 確定状態 | 10:25:34 JST・slot `507194581`、`finalized`・`err: null`。Core `CreateV2` の成功を確認 |
| チェーン上URI | `https://nftlab-sim.haruharuoharu.workers.dev/api/metadata/certificate` |
| 画像 | `https://nftlab-sim.haruharuoharu.workers.dev/nft-card.png`、HTTP 200・image/png・800×800・37,313バイト |
| PC Solflare | 10:30:32 JSTの画面でMain Wallet（74Pd…v2x5）の「未認証」NFT一覧にPNG画像と修了証名を確認 |

既存のlocalhost修了証のURIを更新したという意味ではありません。公開URLから新しく発行したNFTを確認しました。ウォレットの詳細画面の説明表示は未確認です。

## Seekerでの署名不足と修正

2026-10-04 10:43 JSTのSeeker Chrome画面は3教材を完了済みと表示しています。接続口座 `9LPLTvZTEEVyKMYaSeiVkVSfmFYsF4uxDVy8bJ3D9vnK` に対して、修了証発行前のAnchor記録で `Signature verification failed. Missing signature for public key` が発生しました。

Anchorクライアントだけが未署名のlegacy `Transaction` を渡しており、インストール済みMobile Wallet Adapterはウォレットを呼ぶ前に `serialize()` を実行します。同じ条件でエラーを再現しました。クライアントを `TransactionMessage.compileToV0Message()` と `VersionedTransaction` に変更し、署名済みの同じ取引をsigVerify付きsimulation・送信前の保存・送信・確認に使用します。チェーン上の命令・PDA・Program IDの変更はなく、Anchorの再デプロイは不要です。

回帰検証はモバイルと同じ署名前のserializeを実行し、署名の実データ、3命令と口座、保存と送信の順序、未署名返却やsimulation失敗の送信停止、確認中断時の元の署名の保持を確認します。ブラウザE2Eもv0取引を復号し、Ed25519署名と3命令を検査します。公開修正版でのSeeker実機の成功は未確認です。

参考: [Mobile Wallet Adapterの同じlegacy署名エラー報告](https://github.com/solana-mobile/mobile-wallet-adapter/issues/1371)、[Solanaのv0取引構築](https://solana.com/developers/cookbook/transactions/versions)。

## 残る確認

- 修正した公開アプリで、Seekerの既存進捗からAnchor記録と修了証NFT発行を再試行し、署名・確定・画像表示を確認。
- PC SolflareのNFT詳細画面の説明表示。

学習記録と修了証は自己申告の教材用記録です。AnchorはCoreの取引を証明せず、CoreへのCPIも行いません。アプリはAnchor未設定の状態でもCoreのNFT体験を利用できます。再開時は既存のデプロイと検証結果を利用し、変更がない限り再ビルド・再デプロイを繰り返す必要はありません。
