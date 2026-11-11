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
- 登録コードはD1のcommunities。初期値は colosseum / note / community-test（すべて紹介リンクのみ）。directは直接アクセス。追加・更新は /admin で行い、再デプロイ不要。公開設定APIはコードだけを返し、名前・採用状態は公開しない。ブラウザは登録済みコードだけを送信し、サーバーでも照合する。個人名・メール等をコードに登録しない。未知のコードはdirect。
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


## 感想・月次レポート・コミュニティ管理（追加機能）

既存D1にも `npx wrangler d1 migrations apply nftlab-analytics --remote` を実行し、0002を適用する。migration未適用時は計測設定APIが無効を返す。公開前に2件とも適用済みか確認。

- 感想：アプリ下部の「ひとこと感想」。計測の同意なしでも、本人が送信ボタンを押したときだけ送信。用語・接続・資金・承認・確認・譲渡・Explorer・困らなかった・その他の選択式。自由記述はなく、個人情報を入力する欄もない。現在の学習段階/言語/モード/登録済み紹介コード/別系統のランダム回答IDを含む。学習計測IDと結合しない。
- 各タブ・モードにつき1回答。回答IDをsessionStorageへ保存し、再送しても1件。ブラウザ保存が使えない場合はその画面のメモリだけを使う。保存消去・別タブでは別回答になるため、人数ではない。失敗時の再試行は同じ内容・ID、ページ再読込後の別回答ではDBの最初の回答を保持。
- 管理画面：`https://nftlab-sim.haruharuoharu.workers.dev/admin`。ANALYTICS_REPORT_TOKENを入力し読み込む。トークンはメモリだけ、APIはBearer認証・no-store。URL/localStorage/cookieにトークンを保存しない。コード・団体名・導入状態・採用日を登録/編集できる。このトークンには管理記録の書き込み権限もあるので主催者に渡さない。
- 状態：link_only（紹介リンクのみ）/ contacted（相談中）/ pilot（試験利用）/ adopted（正式採用）/ paused（休止）。正式採用は有効な採用日必須。利用数から自動昇格しない。現在の自己管理記録であり、第三者の認証ではない。過去月時点の状態履歴ではない。コード変更は新規登録になるので、既存コードは変えず同じコードで編集する。削除機能はない。
- 月次：対象月と紹介元を選択して再読込。UTC開始月の開始数・3教材完了数/率・修了証数/率・感想件数、困った理由の内訳を表示。ゼロ件の紹介元も表示し、分母0は割合なし。感想は受信月なので開始コホートと一致しない。`/api/admin/monthly?month=2026-11&ref=community-test` がJSON、`&format=csv`でCSV。管理画面からも表示中の紹介元だけCSV保存できる。
- レポートは閲覧・CSVダウンロードまで。相手に共有する前に紹介元と内容を確認し、利用者の少ない集計を無断公開しない。メール・Discord等への自動送信は実装していない。
- 採用数は現在status=adoptedの登録件数。試験利用からの継続や企画の実態は管理者が確認する。個人名・連絡先を保存しない。紹介リンクだけ使われたコミュニティを導入実績としない。
- フィードバックも90日を目安に月次整理後に削除：`npx wrangler d1 execute nftlab-analytics --remote --command "DELETE FROM learning_feedback WHERE submitted_day < date('now','-90 days')"`。自動削除スケジュールは未設定。communitiesは導入管理のため継続保存。
