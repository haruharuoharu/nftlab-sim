# 学習ファネル・紹介元計測

## 計測仕様

- 任意参加、初期値オフ。D1未設定時は送信も同意UIも無効。
- 同意後、新しい学習の最初のクイズ回答（不正解を含む）を開始とする。
- 単位は**練習回**。個人・ウォレット・ユニーク利用者数ではない。モードごとにランダムUUIDをブラウザ保存し、サーバーはSHA-256化したキーだけを保存する。
- 同意前・導入前に進んだ学習は遡及集計しない。途中で同意した場合は次のリセット後から対象。リセットすると新しい練習回になる。
- demoとdevnetは別集計。シミュレーションのウォレット接続数は常に0（不要）。
- mint/transfer/redeemは操作の**成功後**に記録。Devnetは既存処理の確認成功後と保存済み取引の復旧成功後が対象。署名要求・送信開始だけでは到達としない。
- 各操作は「3教材のどれかで1回以上成功」と「教材別」を集計。`lessonsCompleted`は3教材すべてredeem、`certificate`は修了証作成成功。
- `lessonCompletionRate = lessonsCompleted / started`、`certificateRate = certificate / started`。ウォレット接続済みの人が後で学習を開始しても接続到達を含むため、厳密な時系列の直列ファネルではない。
- 期間はUTCの**最初にサーバーが受理した日**による開始コホート。後日完走もそのコホートへ加算。受信できなかったオフライン開始は実際の開始日とずれる。直近コホートはまだ学習中の人を含む。
- 紹介元は開始時のURL `?ref=note` 等を固定し、途中で別リンクを開いても既存練習回の紹介元を変えない。開始前にURLを失った場合は引き継がない。
- 登録コードは `lib/analytics.ts` の `REFERRALS`。現状 direct / colosseum / note / community-test。実際の提携・導入を意味しない。未知・個人名・メール等の入力はdirectへ落とす。コミュニティ追加はこのリストを更新してデプロイする。
- 送信するのはversion/id/mode/ref/maskのみ。ウォレット、NFTアドレス、署名、回答、氏名、メール、フルURLは送信・保存しない。通信にIP等は伴うため「個人情報を一切処理しない」「完全匿名」とは表現しない。
- 同意撤回は以後の送信を停止し端末上の計測IDを削除。送信中の通信や既存の集計は取り消さない。D1に広告用IDや認証情報を保存しない。
- 送信失敗でも学習は続行。累積状態をブラウザに保持し次の操作、再表示、online復帰時に再送。DBのビットOR更新で重複を数えない。複数タブでの同時操作、ブラウザ消去、通信拒否による欠測はありうる。
- データはクライアントの自己申告。Origin・スキーマ検査はあるが、偽装クライアントによる水増し防止・受講証明・特典配布判定には使えない。公開時にはCloudflare側のレート制限も設定する。

## 公開設定（管理者が一度だけ実施）

既存のDATABASE_URLとは独立したCloudflare D1を使う。既存の進捗DBやチェーンの記録は変更しない。

1. `npx wrangler login`
2. `npx wrangler d1 create nftlab-analytics`
3. 出力のdatabase_idを使い、wrangler.jsonのトップレベルへ次を追加（既存キーを保持）。

```json
"d1_databases": [{
  "binding": "ANALYTICS_DB",
  "database_name": "nftlab-analytics",
  "database_id": "実際に作成されたID",
  "migrations_dir": "migrations"
}]
```

4. `npx wrangler d1 migrations apply nftlab-analytics --remote`
5. `npx wrangler secret put ANALYTICS_REPORT_TOKEN` を実行し、パスワードマネージャー等で生成した十分長いランダムな管理用トークンを入力。ブラウザコードやNEXT_PUBLIC環境変数には入れない。
6. `npm run deploy:cloudflare`
7. `/api/analytics` が `{"enabled":true}` を返すことを確認。新しいブラウザで同意して練習開始・完走し、次のレポートで確認。D1障害時の計測失敗は学習画面に影響させない。

ローカルでは同じbinding設定後 `npx wrangler d1 migrations apply nftlab-analytics --local` を実行し、Workersプレビューを使用。`next dev`単体ではD1がないため無効。

## 紹介用リンク

- https://nftlab-sim.haruharuoharu.workers.dev/?ref=note
- https://nftlab-sim.haruharuoharu.workers.dev/?ref=colosseum&lang=en
- https://nftlab-sim.haruharuoharu.workers.dev/?ref=community-test

## 集計を見る

管理端末からGET `/api/analytics/report?from=2026-11-11&to=2026-11-30` に `Authorization: Bearer <管理用トークン>` を付ける。トークンはURLに入れない。指定可能な期間は90日以内。省略すると直近30日の開始コホート。JSONで紹介元・モード別の到達数、教材別の到達数、2種類の完走率を返す。一般公開用のダッシュボードは作らず、少人数コミュニティの結果を無断公開しない。

サーバーのレポートはno-store。未認証は401。紹介元コードだけで他コミュニティのレポートへアクセスできない。

保存期限は運用として90日とし、月次レポート保存後に次の管理コマンドを実行する（自動スケジュールは未設定）。D1バックアップの保持はCloudflare設定に従う。

```bash
npx wrangler d1 execute nftlab-analytics --remote --command "DELETE FROM analytics_journeys WHERE started_day < date('now','-90 days')"
```

## 判断時の注意

これは同意した練習回の完走率で、全訪問者の完走率ではない。テスト中・運営の確認作業は本番とは別のD1/プレビューで行う。小さいサンプルは分子/分母も併記し、短期間でコミュニティを順位付けしない。紹介が1件発生しても「導入コミュニティ」とは数えず、主催者との合意・実際の企画利用を別台帳で確認する。

修了証の保有はExplorerで確認できるが、教材の理解・本人性・不正のない受講を証明するものではない。
