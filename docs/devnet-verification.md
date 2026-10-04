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

この取引の命令はAnchorの学習記録3件のみで、Core NFTの新規発行命令はありません。CLI検証6件に実Solflareの1件を加え、Anchor記録取引は計7件を照合済みです。ブラウザの再読み込み後の表示保持は、別途実機で確認します。

## 残る確認

- 公開アプリとHTTPSメタデータの外部表示。今回のCore NFTのURIはlocalhostのため、外部ウォレットから取得できません。
- Android/Seeker実機のウォレット署名フロー。
- Anchor追加後の再読み込み・再接続による学習記録と修了証の表示保持。自動E2Eでは成功しており、PC実機の追加確認が残っています。

学習記録と修了証は自己申告の教材用記録です。AnchorはCoreの取引を証明せず、CoreへのCPIも行いません。アプリはAnchor未設定の状態でもCoreのNFT体験を利用できます。再開時は既存のデプロイと検証結果を利用し、変更がない限り再ビルド・再デプロイを繰り返す必要はありません。
