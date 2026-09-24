# Birthday Circle Local（完全ローカルPWA）

このフォルダは、親リポジトリのSpring Boot + PostgreSQL版とは独立した、端末内だけで動く誕生日カレンダーです。ログイン・Docker・X API・クラウドDBは使用しません。各端末のデータは互いに同期されません。別端末への移行にはZIPバックアップを使います。

## 起動と確認

Javaは不要です。Node.js 20.19以降を用意し、このフォルダで以下を実行します。

```powershell
npm ci
npm run dev
```

表示された `http://localhost:5173/` を開きます。開発サーバーは実装確認用で、Service Workerは登録しません。配布版を確認するには以下を実行します。

```powershell
npm run build
npm run preview
npm test
node scripts/browser-smoke.mjs
```

`browser-smoke.mjs` はWindows版Microsoft Edgeを使用し、一時ブラウザプロファイルと一時HTTPサーバーで、GitHub Pages相当のサブパス・再読み込み・ドラッグ保存・通知・390px表示・オフライン起動・コンソールを確認します。実際の人物データやSpring Boot版DBは使用しません。

静的配布物は `dist/` です。手元の `file://` 直開きではService WorkerとIndexedDBの動作がブラウザに制限されるため、localhostまたはHTTPSで提供してください。

## 既存版からの対応関係

| 機能 | ローカル版での扱い |
| --- | --- |
| 人物CRUD、カテゴリ、メモ、複数記念日、関連URL、Xリンク | 端末内に実装。Xプロフィールは明示的にリンクを押したときだけ開く |
| ホーム、カレンダー、人物一覧、誕生日一覧、絞り込み・検索 | 端末内データから表示。PCドラッグ＆ドロップ、スマホの人物選択→日付タップに対応 |
| 次回誕生日、年越し、2/29 | Spring版と同じ東京時間・平年2/29→2/28ルール |
| アプリ内通知 | アプリを開いた日の7/3/1/0日前。ON/OFF、個別タイミング、既読・未読。外部Pushではない |
| PostgreSQL/Flyway/認証/Demo共有データ | 端末完結版では不要。Spring版へ影響なし |
| 画像保存 | 端末のファイルから最大長辺512pxへ縮小し、通常WebP・未対応時JPEGで保存。外部画像の自動取得なし |

## データと更新

- `src/db.js` のIndexedDB `birthday-circle-local` は人物・画像・設定・通知を別storeに保存します。v1が人物・画像・設定、v2が通知追加です。以後の変更はDB versionを上げ、`onupgradeneeded` で旧データを保持してください。
- 人物と画像の保存・置換・削除は同一IndexedDBトランザクションです。画像は人物IDをキーに1枚だけ保持し、差し替えで旧画像を上書きします。
- `src/sw-template.js` はアプリシェルのみをキャッシュします。ビルド時にファイル内容からキャッシュ名を作り、更新時に旧アプリキャッシュだけを削除します。IndexedDBには触れません。更新がある場合は画面上に案内を表示し、利用者が更新を選ぶまで強制切替しません。
- 「不要なアプリキャッシュを削除」は旧シェルキャッシュのみ対象で、現在利用中のシェルとIndexedDBを残します。ストレージ欄には人物数・画像数・画像容量・キャッシュ容量・ブラウザ推定総量・画像参照整合性を表示します。
- Webブラウザのサイトデータ削除、プライベートブラウズ、OSによるストレージ退避・削除では利用者データが失われる可能性があります。重要なデータは定期的にZIPへバックアップしてください。

## ZIPバックアップと復元

設定画面でZIPを書き出せます。`manifest.json` に形式Version、アプリVersion、作成日時、件数、ファイル一覧とSHA-256を記録し、`data.json` に人物・全記念日・URL・設定・通知と既読状態、`images/` に管理画像を保存します。現形式はv1です。v0試作形式の `birthday:{month,day}` から `anniversaries[]` への変換基盤があります。

復元はZIP容量・構造・Version・件数・チェックサム・人物/画像/通知の参照を**書き込み前**に確認してプレビューし、さらに確認ダイアログと「復元」の入力を経て実行します。4 storeを単一トランザクションで置き換え、失敗時は旧データを保ちます。復元後には画像の参照切れと孤児を確認します。復元前に現在データのZIPを書き出してください。

ZIPは暗号化されていません。メモや画像が含まれるので、安全な場所へ保管し、公開リポジトリには置かないでください。端末間のリアルタイム同期はありません。スマホ→PCなどの移行は、一方でZIPを書き出してもう一方で復元します。

現在のZIP容量上限は128 MiBです。書き出し時にも上限を確認し、復元できない大きさのZIPを作らないようにしています。大量の画像を扱う場合は容量表示を確認してください。

## 公開前のプライバシー確認

配信対象は**`dist/` の9ファイル**（HTML、JS、CSS、manifest、Service Worker、アイコン）だけです。`npm run build` は許可リスト、秘密情報らしい文字列、絶対パス、manifest・アイコン・キャッシュ設定を監査し、疑わしい配布物があれば失敗します。親のSpring Bootソース、`.env`、DB、アップロード画像、ZIP、テスト成果物、`node_modules/` を配信しません。公開前にもう一度 `npm run build` と `npm run audit:dist` を実行してください。これは公開ファイルの検査であり、Git履歴全体の機密情報検査を保証するものではありません。

人物・誕生日・メモ・URL・画像・設定・通知は、閲覧中のブラウザのIndexedDB内にあります。外部SDK、analytics、CDN、外部フォント、画像自動取得、X API/OAuth通信はありません。配布HTMLには外部通信を制限するCSPがあります。アプリ本体の取得と更新ではPagesへ静的ファイルのリクエストが届き、IPアドレス等の通常のアクセス情報はホスティング側で扱われます。利用者がX・関連URLを明示的に開くと、そのリンク先へ移動します。ZIPを書き出してクラウド保存・共有すれば、その操作でデータは端末外へ出ます。ZIPは暗号化されません。

**GitHub Pagesのサブパスはデータの隔離境界ではありません。** `https://<owner>.github.io/a/` と `.../b/` は同一オリジンで、別アプリから同じIndexedDBを読める可能性があります。人物データを扱う試用では、そのホストに信頼しない別サイトを置かない専用GitHubアカウント、または専用カスタムドメインを推奨します。公開URLのホスト（オリジン）を後から変更するとIndexedDBは自動移行しません。変更前にZIPを保存し、新URLで復元してください。ブラウザのサイトデータ削除でも消えるため、定期バックアップが必要です。

## GitHub Pagesへのテスト公開（手動操作）

親のSpring Bootリポジトリ全体を公開せず、**`local-pwa` の中身だけを新しいPWA専用リポジトリのルート**へコピーする方法を推奨します。`local-pwa/.github/workflows/pages.yml` はこの配置でのみGitHub Actionsに認識されます。`workflow_dispatch` の手動実行だけで、push時には自動公開しません。`npm ci` → `npm test` → `npm run build`（公開物監査を含む）→ `dist/` だけをPagesへ渡します。ソースリポジトリの内容と、実際にWeb配信される`dist/`は別です。ただし公開リポジトリに置いたソースとGit履歴も閲覧可能になるので、**新規の空リポジトリ**を使い、コピー対象とcommit予定ファイルを確認してください。ZIP、実利用者データ、`.env`、`node_modules/`、`dist/`、`test-artifacts/`は入れません。

利用者が行うGitHub操作：

1. 専用の空リポジトリを作る。公開範囲を自分で選ぶ。GitHub FreeのPagesを使う場合は公開リポジトリが必要です。非公開リポジトリからPagesを作れても、Pagesサイト自体は一般公開されるので、テストURLも公開URLとして扱ってください。
2. `local-pwa` 内のソース、`public/`、`scripts/`、`tests/`、`package*.json`、`vite.config.js`、README、`.github/workflows/pages.yml`をリポジトリの**直下**へ置く。親のSpring Boot一式は置かない。`.gitignore`を適用し、アップロード/commit対象を確認する。
3. 自分でpushした後、GitHubの **Settings → Pages → Build and deployment → Source: GitHub Actions** を選ぶ。
4. **Actions → Local PWA Pages preview → Run workflow** を自分で実行する。テストとビルドが成功したら表示されるPages URLを開く。以後の更新もpushだけでは公開されず、同じ手動実行が必要です。

Viteは `base: './'`、manifestの`id/start_url/scope`とService Workerも相対パスです。リポジトリ名が変わってもビルド時の固定パス調整は不要です。ただし、公開URL自体を変更した場合は上記のオリジンとZIP移行に注意してください。HTTPSのPages URLでなければ実機のService Worker/インストールを十分に検証できません。ここまでの作業ではpush・Pages設定変更・外部デプロイはしていません。

## iPhone / Android / PC 実機テスト

実機テストは公開HTTPS URLで行い、**テスト用の架空人物のみ**を登録してください。Safari/Chromeのプライベートモードは使いません。各端末で以下をチェックします。

- [ ] 公開URLを開き、画面・アイコン・CSSが表示され、再読み込みも成功する
- [ ] ホーム画面に追加し、ブラウザのタブではなく独立したアプリとして起動する
- [ ] 人物追加、誕生日登録、カテゴリ・メモ・関連URL編集、カレンダー・絞り込み・通知が動く
- [ ] 端末の写真からプロフィール画像を登録・変更・削除し、容量表示と画像件数が正しい
- [ ] Xプロフィールを押した**ときだけ**外部ページが開く
- [ ] アプリを完全に閉じて再起動しても、人物・誕生日・画像・設定・既読状態が残る
- [ ] 一度オンラインで開いた後、機内モードで起動・再読み込みし、人物を見られる
- [ ] 設定からZIPを書き出し、端末のFiles/ファイル等に保存し、ZIP内のmanifest・画像を確認する
- [ ] ZIP書き出し後にテスト人物を変更し、ZIPを選んで内容プレビュー・確認入力後に復元する。元データへ戻る
- [ ] ZIPをPCへ移し、PC版の設定から復元できる。逆方向も試す。転送先がクラウドなら自分の判断で使う
- [ ] 新ビルド公開後、更新案内から切り替え、人物・画像・設定が残る。旧アプリキャッシュだけ消える

iPhone：Safariの共有ボタン→「ホーム画面に追加」→「Webアプリとして開く」を有効にして追加します。iOSのバージョンで文言やZIP保存先の表示が異なります。ZIPダウンロードはSafari/ホーム画面アプリで保存先を確認し、見つからない場合はSafariで同じURLを開いて再試行してください。写真アクセスとFilesからのZIP選択も実機で確認が必要です。

Android：Chromeのメニュー→「アプリをインストール」または「ホーム画面に追加」。ZIPはダウンロード/Files等で所在を確認してから復元ファイル選択で開きます。PCではChrome/Edge等から同じURLを開いて試します。iPhone・AndroidのインストールUI、OSの容量回収、ZIP保存動作はローカルEdge試験だけでは保証できません。

## ディレクトリ

```text
local-pwa/
  index.html                  5画面と人物・通知ダイアログ
  src/model.js                日付・検証・絞り込み
  src/db.js                   IndexedDBとMigration
  src/notifications.js        端末内通知判定
  src/images.js               画像縮小・圧縮
  src/backup.js               ZIP作成・検証・復元
  src/sw-template.js          オフラインキャッシュ
  src/app.js, src/style.css   UIとレスポンシブ表示
  scripts/generate-sw.mjs     配布ビルドのキャッシュ生成
  scripts/audit-dist.mjs      配信ファイルの許可リスト・設定・機密情報監査
  scripts/browser-smoke.mjs   Windows Edge実ブラウザ確認
  .github/workflows/pages.yml PWA専用リポジトリ用の手動Pages配布
  public/                    manifestと既存版からコピーしたアイコン
  tests/                     自動テスト
```

ルートのSpring Boot版のDocker、Flyway Migration、DB、画像Volume、通知はこのPWAから一切読み書きしません。親リポジトリの `.env`、OAuth情報、サーバーAPIも参照しません。
