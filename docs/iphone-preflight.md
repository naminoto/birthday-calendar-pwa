# iPhone実機確認・正式公開前の準備

ローカル版1.4.1／ホーム再構成＋Zen Maru Gothic。**この文書と準備スクリプトは公開を実行しない。** 既存iPhone PWAの削除・Safariサイトデータ削除・DB初期化は禁止。既存の未commit変更と本番origin／URL／SW scopeを維持する。

## 現在の実施状況

**構築完了：** `yoribi-preview`のFree・owner権限確認後、`yoribi-test`を作成し、https://yoribi-preview.github.io/yoribi-test/ へ手動公開済み。Actions成功と全16配布ファイルのSHA一致・公開版ブラウザ操作を確認した。テスト版のHTML／manifest／内容ハッシュSWだけを別コピーで調整し、正式版は変更していない。[現在の運用・iPhone手順](preview-operations.md)を優先する。以下は準備段階の記録を含む。

2026-10-21、ユーザーから`yoribi-preview` Organization／公開repo `yoribi-test`／無料範囲のテストPages作成・公開の承認を取得済み。正式版への変更は禁止のまま。公開APIでOrganizationは404（未作成）を確認した。まずGitHub画面でユーザーがFree Organizationを作成する必要がある。名前が取れない・有料条件が必要なら停止し、別名や有料設定へ勝手に切り替えない。Organization作成後にowner権限を再確認し、テストrepo作成・配布物監査・手動公開へ進む。テストURLはまだ未公開で、正式版のpush／公開操作はしていない。以下の「承認後」はこの承認の範囲内で行う手順を指す。

## 推奨：専用GitHub Organizationの別originでPages配信

既存の個人アカウントで管理する**テスト専用GitHub Free Organization**を作り、そのOrganization所有の新しい公開リポジトリで静的プレビューを配信する方式を推奨する。Organization名・リポジトリ名は未決定で、まだ作成していない。

| 項目 | 正式版 | 承認後のテスト版（仮表記） |
| --- | --- | --- |
| origin | `https://naminoto.github.io` | `https://<専用Organization>.github.io` |
| URL | `https://naminoto.github.io/birthday-calendar-pwa/` | `https://<専用Organization>.github.io/<テストrepo>/` |
| IndexedDB | 既存の人物・画像等 | 別originの空のDBから開始 |
| SW／Cache Storage | 正式版origin・既存scope | テストorigin・テストrepoのscope |

**同じ`naminoto`所有の別repo／別パスでは不可。** IndexedDBはパスでなくoriginに紐付く。同じDB名なら同じ保存領域へアクセスし得る。SWのscopeを分けるだけでもDBの隔離にはならない。専用originには他の信頼しないサイトを置かない。アプリ名・manifest idが同じでも、別originなので正式版の保存領域を共有しない。ただしSafariと追加後PWAの間で保存領域が同じとは保証しない。

比較した他方式：PCのLAN上HTTPはiPhoneでSW検証に不足。ローカルHTTPSは証明書発行・iPhoneへの信頼ルート導入・PC常時起動が必要。トンネル／別ホスティングは新サービス・公開URLや運用の追加になるため、今回は採用しない。既存のGitHub運用に揃えた別ownerのPagesが最も手順を再利用しやすいと判断した。

### 費用と公開範囲

- GitHub Free Organization＋公開repoのPagesを利用し、有料プラン・独自ドメイン・有料runner・新しい配信サービスは追加しない。無料枠・使用制限内で行い、課金設定は変更しない。実施時に条件を再確認する。
- プレビューURLは**インターネット上で誰でも閲覧可能**で、非公開・認証付き検証ではない。未発表UI・JavaScript・正式フォントと権利文書が見える。GitHubは通常のアクセス情報（IP等）を扱う。
- 配布するのは監査済み`site/`の16ファイルだけ。公開repoにはそのほか手動Workflowとチェックサム記録を置く。Spring版、.env、バックアップZIP、人物DB、実画像、node_modules、テスト画像、比較環境・不採用5書体、Git履歴はコピーしない。
- 入力した架空人物・画像・通知等はテストoriginの端末内DBへ保存する。クラウド同期しない。ZIPも自動送信しない。X等の外部リンクだけは利用者操作時に外部へ移動する。
- **テストには架空データを使う。** 正式版の実データ入りZIPをテストrepoへアップロードしない。別originのテスト結果だけでは、正式origin上の実データでの更新を実証したことにはならない。

## ローカル準備（実行してよい範囲）

```powershell
npm test
npm run build
node scripts/prepare-iphone-preview.mjs
```

スクリプトは公開物監査を再実行し、Git除外の`test-artifacts/iphone-preview-<UUID>/`へ以下を新規生成する。既存フォルダを削除・上書きしない。Git操作、リモート作成、push、通信、deployは実行しない。

- `site/`：現distをそのままコピーした16ファイル。全バイト一致を検証する。
- `.github/workflows/pages.yml`：`docs/preview-pages.workflow.yml`からコピーした手動専用テンプレート。
- `PREVIEW.json`：Version、日時、各配布ファイルのサイズとSHA-256。公開先は未指定、要承認を記録。秘密情報・絶対パス・利用者データを含めない。

準備フォルダは独立Git repoではない。親repoや現在のoriginを付け替えず、その場で`git add .`しない。既存`.github/workflows/pages.yml`は**正式版用**なので今回は実行・変更しない。プレビュー用テンプレートは現repoの`docs/`にあり、ここではWorkflowとして実行されない。Version管理元、IndexedDB v3、ZIP v1、アプリソース、SW方式、正式版の公開URLを変える必要はない。

## ここから先は事前承認が必要

まずユーザーへ「専用Organization名・repo名」「公開URL」「公開する16ファイルとソースが閲覧可能になること」「無料枠」「正式データを移さないこと」を示し、**Organization／repo作成・テストrepoへのcommit/push・Pages設定／手動deploy**の許可を得る。今回は実施しない。

承認後の担当者向け手順：

1. 専用Organizationと空の公開repoを作る。ownerが`naminoto`でないことを確認。OrganizationをFreeとし、テスト専用のownerが正式originと異なることを確認する。
2. 既存repoは触らず、承認済みの新規作業場所に準備フォルダの内容だけを配置する。Gitルート・remoteを確認し、正式repoでないことと許可したファイルだけを再監査してから初回commit/pushする。現在のソースrepoや親Spring repo全体をコピーしない。
3. **テストrepoだけ**のSettings → Actions → Variablesへ`YORIBI_PREVIEW_OWNER`を承認済みOrganization名として設定。テンプレートは値が空／owner不一致／ownerがnaminotoならdeploy前に停止する。これは補助ガードであり、操作先確認の代わりではない。
4. テストrepoだけのSettings → PagesをGitHub Actionsへ設定し、手動Workflowを実行する。正式repoのWorkflow・公開URL・カスタムドメインは変更しない。
5. deploy成功後、最終的なURLとリダイレクト先が正式版と別originであることを確認する。HTTPS、Version1.4.1、JS/CSS/manifest/アイコン/3TTF/OFLの200応答を確認。証明書警告があるURLはiPhoneへ渡さない。
6. テストURLに架空データを入れる前に、最初の画面が空であることを確認する。正式人物が見えたら即停止し、削除や復元をせずURLを再調査する。

## iPhoneのチェックリスト

### 開始前：正式版をそのまま保護

- [ ] 正式PWAを既存アイコンから開き、人物・画像が見えることとVersion1.4.1を確認する。
- [ ] 既存のZIP書き出しでバックアップし、Filesでファイルの存在・日時・容量を確認。可能ならPCへコピーして**検証プレビューまで**行いキャンセルする。正式版へ復元して確認する必要はない。
- [ ] 正式PWA・正式URL・保存データは変更・削除しない。バックアップ確認前に移行しない。今回のテストには原則、実データを移さない。

### 別originのSafari／PWA

- [ ] 承認後に届く**テストURL**を通常Safariで開く。プライベートモードは使わない。アドレスのホストを確認し、正式版とは別originで空であることを確かめる。
- [ ] 共有 → ホーム画面に追加。追加時のラベルを「Yoribi テスト」にして正式アイコンと区別する。これは端末上のラベルで、アプリの名称・manifestを変更する処理ではない。追加時のUIはiOS版で異なり得る。
- [ ] テストアイコンからstandalone起動し、データが空でも正式版から自動移行しない。テスト用の架空人物と画像を新規登録する。Safariで作ったテストデータが見えない場合は、テスト側だけでZIP保存を確認してから復元するか、架空データを改めて登録する。

### 表示・操作

- [ ] ホーム4セクション＋人物追加ボタン、44px画像、罫線・生成り背景、下部5タブ・セーフエリアを確認。
- [ ] ホーム／カレンダー／人物／誕生日／設定、追加／編集／詳細／記念日／通知／確認ダイアログで丸ゴシックを確認。必要ならPC画像と比較する。外見だけで実フォントを断定せず、未対応漢字・絵文字は端末フォールバックでよい。
- [ ] 日本語／English、ライト／ダーク／端末追従、長い人物名・日付・残り日数・記念日名、数字・記号・絵文字の文字切れ・重なり・横スクロールを確認。
- [ ] 人物追加・編集、誕生日・複数記念日・メモ・関連URL、写真選択・トリミング・表示・差替え、入力フォーカス時の不要ズームがないことを確認。通常ピンチズームは維持。
- [ ] 検索・カテゴリ／予定種別フィルター、日付一覧・詳細ダイアログの開閉、直接ドラッグと一覧の約0.55秒長押し→上へ抜ける日付移動→確認／キャンセル、上下並替えと代表アイコンへの反映を確認。

### 保存・ZIP・オフライン

- [ ] テスト用人物・画像・複数記念日・通知設定・既読・言語・テーマを登録し、テストPWA終了→再起動で保持。
- [ ] テストデータのZIPをFilesへ保存し存在を確認。**テストPWA側だけで**架空人物を変更→同ZIP検証→置換確認→復元し、元へ戻ることを確認。不正ZIP拒否と復元キャンセルでも保持。
- [ ] 一度オンラインで起動し、初回フォント・シェルの取得が終わってから機内モードで再起動。全5タブと入力・Zen Maru表示・画像を確認。初回取得中は回線次第で時間が掛かる。
- [ ] ストレージ画面で利用可能な概算のみ記録。フォント3本は11.42MB、シェル全体は約12.22MBで、ブラウザ実使用量・展開メモリとは異なる。不要キャッシュ整理後も人物・画像を保持。
- [ ] 正式PWAを元のアイコンから開き、開始前と同じ人物・画像が残ることを確認。テスト側ZIPを正式版へ復元しない。

### Service Worker更新（初回インストールとは別の試験）

初回配布1回だけでは更新試験にならない。現時点ではPCの一時プロファイルで旧版→新成果物の更新を検証済み。iPhoneでも行う場合は、**別途承認された2回のテストoriginへの配信**が必要。

1. 第一配布をテストPWAへインストールし、架空人物・画像・設定・通知を作り、テスト用ZIPの存在を確認。
2. 次の検証用ビルドを同じテストURL／scopeへ配信する。正式originへは配信しない。必要なVersion／内容ハッシュの変更は別途許可を得る。更新試験のための本体変更は今回は行わない。
3. 「更新があります」→あとで→再度前面での案内、設定から更新確認・更新適用を試す。ブラウザが全クライアント終了後に自動有効化する場合もあるので、待機案内の非表示だけで故障と判断しない。
4. 一度だけ再読み込みし、人物・画像・記念日・通知・設定・並び順が残ることと、更新後オフライン再起動を確認。再インストールやサイトデータ削除で試験を代用しない。

結果はiOSバージョン／機種／Safariとstandaloneの区別／URL／実行日時／項目別OK・NG・未確認を記録する。OSによるストレージ回収やSafari/PWA間共有を保証しない。問題発生時は**正式版・テスト版ともデータ削除せず**、スクリーンショットと再現手順を報告する。

## v1.4.2正式公開の推奨ゲート

今回はVersion1.4.1のまま。iPhoneで上記確認→問題修正→再確認→ユーザー承認後に**v1.4.2**を候補とする。package.jsonを単一情報源として更新し、全テスト・build・監査・旧配布物からのSW更新／4store・画像保持を再実行。正式PWAのZIPの存在を確認し、必要なファイルだけ正式repoへcommit/push→既存手動Workflow→正式URLのVersion／SW／アセット／データ保持を確認する。IndexedDB v3、ZIP v1、正式URL、scopeは維持。切戻しでもDB削除・履歴書換え・旧ZIPの無確認復元はしない。

## 今回のローカル確認結果（2026-10-21）

- 自動テスト82件すべて成功。production build・公開物監査成功。不採用5書体／比較UIなし。OFL原文・著作権メタデータ・原本SHA一致。16ファイル・12,224,922 bytes。
- Edgeの一時プロファイルで既存の画像・CRUD・ZIP復元・PC／タッチドラッグ／並替え・テーマ・更新・オフライン操作が成功。正式書体は日英×ライト／ダーク×5幅×5タブの100表示、3ウェイトのオフライン読込と取得失敗時フォールバック、4store／画像SHA不変を再確認。通常操作のコンソールエラー0、外部通信0。
- 旧公開v1.4.1の保存済み配布物→現在のローカル成果物へ実SW更新成功。人物・画像・記念日・設定・通知の全4storeと画像SHA一致、reload1回、初期化呼出し0、更新後オフライン起動成功。iPhone実機の保存データへはアクセスしていない。
- `test-artifacts/iphone-preview-acdd35d9-aab8-4067-aa09-065f9e8a0766/`へローカル準備一式を生成。site16ファイルのSHA・全バイトがdistと一致、TTFは3本のみ、公開先未設定、要承認と正式owner拒否ガードを確認。Git除外済み。WorkflowのGitHub上での実行は未確認。
- 今回変更したのは本手順書・README・準備スクリプト・docs内Workflowテンプレートのみ。既存の未commitホーム／フォント／比較環境を保持。アプリコード・Version・DB／ZIP・既存Workflow・SWを変更していない。commit・push・外部deploy・Organization／repo作成・Pages設定変更は0件。
- 残るゲート：公開方法と公開範囲へのユーザー承認、専用owner／repo名決定、承認後のHTTPSテスト配信、iPhone Safari／standalone実機検証。既存公開版は上書きしない。

## 根拠となる一次情報（2026-10-21確認）

- [GitHub Pagesのowner別URL・Free公開repo・アクセス情報](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub PagesのHTTPSと公開範囲](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [IndexedDBの同一origin原則](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [Secure ContextsとService Worker](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)
- [iPhoneでWebサイトをアプリ化する手順](https://support.apple.com/guide/iphone/turn-a-website-into-an-app-iph42ab2f3a7/ios)
