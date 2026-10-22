# Yoribi 継続テスト環境

## 現在の公開先

- Organization：`yoribi-preview`（GitHub Free、naminotoがowner）
- 公開repo：[yoribi-preview/yoribi-test](https://github.com/yoribi-preview/yoribi-test)
- テストURL：**https://yoribi-preview.github.io/yoribi-test/**
- 正式版：`https://naminoto.github.io/birthday-calendar-pwa/`。今回の操作対象外。
- テストVersion：1.4.1。ホーム再構成・Zen Maru Gothicを含む。正式リリース番号は変更していない。
- 初回commit：`5d956afba03eb6ae26a5b3d7b8f9d7d45f8b0b08`（Publish isolated Yoribi preview v1.4.1）
- [初回の手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39461113708)：upload/deploy成功。

## 配置修正のテスト版更新（2026-10-22）

### カレンダータップ統一・人物管理

commit `91a851c17b9fe977860c27b5d32d1d77ac7801d7`（Update Yoribi preview: calendar taps and people management）。[手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39740360825)のupload／deployともsuccess。日付セルの⋯削除、全タップの日付一覧化、空日付追加、月／スクロール保持、人物欄管理・原子的複数削除・表示専用5ソートを配信しました。人物欄／人物タブのメニュー、既存ドラッグ・ホーム・暗色カード・80%中央48pxボタンを維持します。

131/131テスト・production build・16ファイル公開物監査・19ファイルrepo監査成功。公開16ファイル12,243,586 bytesは全HTTP 200・SHA-256一致。フォント／OFL・固定画像・manifest・Workflowは不変で、実データ・秘密情報・不要な開発ファイルはありません。公開URLの一時Edgeでタップ10通り・一覧から詳細・月／位置保持、管理・5ソート・一括削除の確認キャンセル／失敗時データ保持／関連画像・通知整理、マウス／タッチドラッグ・日英／テーマ／5幅・オフライン・フォント回帰が成功。consoleエラー0・意図しない外部通信0です。

旧配信物から公開SHAと一致する新ビルドへのSW更新は公開前後とも成功し、全4store・画像SHA一致・初期化0・reload1・更新後オフライン成功。Version1.4.1・DB v3・ZIP v1・URL／scopeを維持しました。正式mainは前後とも`95258045928695c894ddf3405aa3a344b229f7bc`で未変更、テストrepoはclean、ソースの未commit変更は保持しています。

公開検証の再現：`node scripts/release-smoke.mjs --url=https://yoribi-preview.github.io/yoribi-test/ --check-calendar-taps=true --check-rail-management=true --check-person-actions=true --check-registration=true --check-interactions=true --check-day-list=true --check-home=true --check-birthday-ui=true --check-standard-font=true`。一時プロファイルの架空データだけで検証し、実機データには接続しません。

iPhoneはテスト側ZIPを保存後、既存テストPWAを削除せず設定から更新。日付背景・数字・人物アイコンで同じ一覧が開くこと、空日付追加、閉じた後の月／位置、管理メニュー・選択／キャンセル、5ソート、既存ドラッグ、再起動・オフラインと既存データ保持を確認してください。Versionは同じなので管理ボタンと一覧導線で更新を識別します。実機での確認はユーザー確認待ち、正式版への反映は別途承認後だけです。

### 人物操作メニュー・人物欄ドラッグ・ダークカード

commit `cb190a052b521bc64bdce810fade1a1fa30ea6cf`（Update Yoribi preview: person actions, rail drag and dark cards）。[手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39640457896)はupload／deployともsuccess。公開先・Version1.4.1・IndexedDB v3・ZIP v1・scopeを維持。正式mainは前後とも`95258045928695c894ddf3405aa3a344b229f7bc`で、正式repo／Pages・親Spring Boot版は変更していない。ソースの未commit変更を保持し、生成物だけのテストrepoはclean。

116/116テスト・production build・公開物監査・19ファイルrepo監査成功。公開16ファイル12,235,396 bytesは全HTTP 200・SHA-256一致。固定画像・3ウェイト／OFL・manifestは不変で、実人物・実画像・ZIP・秘密情報・開発ソースを含めない。公開URLの分離Edgeでメニュー・実Pointer EventsのPC／タッチドラッグ・編集・削除確認／キャンセル・無効ドロップ／保存失敗・生年／記念日ID保持、日英×テーマ×5幅、暗色カード／文字アバター／写真無補正、既存ホーム・80%中央48pxボタン・並替え・オフライン・フォント回帰が成功。consoleエラー0・意図しない外部通信0。

旧配信物から公開SHA一致の新配信物への更新を公開前後に検証し、全4store・画像SHA一致、初期化0・reload1・更新後オフライン成功。一時プロファイルの架空データのみを使い、実機データへ接続していない。再現：`node scripts/release-smoke.mjs --url=https://yoribi-preview.github.io/yoribi-test/ --check-person-actions=true --check-registration=true --check-interactions=true --check-day-list=true --check-home=true --check-birthday-ui=true --check-standard-font=true`。

iPhoneはテスト側ZIPを保存し、既存テストPWAを削除せず設定から更新。人物タブ長押し／⋯・カレンダー⋯、人物欄長押し→日付ドロップ→確認／キャンセル、編集・削除確認、ダーク配色／選択、再起動後の人物・画像・記念日・設定保持とオフラインを確認する。Versionは同じなので新しい⋯メニューで更新を見分ける。正式版への反映は別途承認後のみ。

### ホームの当日誕生日重複表示の修正

commit `5909b38a907c2f96183c0b3c79d84c81d4a11716`（Update Yoribi preview: avoid duplicate birthdays today on Home）。[手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39636373347)。当日は今日の予定だけ、次回・近日は明日以降。当日のみなら空表示とし翌年分として再表示しない。同日全員・手動順・年越し・うるう日・既存80%中央48pxボタンを維持する。

106/106テスト・production build・16ファイル公開物監査・19ファイルrepo監査・ブラウザ回帰成功。配信16ファイルは12,228,465 bytes、実データ・秘密情報・不要な開発ファイルなし。旧テスト配布物から新配布物へのSW更新は全4store・画像SHA一致、初期化0・reload1回、更新後オフライン成功。Version1.4.1・DB v3・ZIP v1・既存公開URL／scopeはそのままで、正式版・親Spring Boot版は変更しない。

iPhoneではテスト側ZIPを保存し既存テストPWAを削除せず更新。当日1人／複数を今日だけへ表示、明日以降同日全員、当日だけの空表示、再起動・既存人物／画像／記念日／設定保持・オフライン、80%中央48pxボタンを確認する。正式ZIPをテスト版へ移さない。Versionは同じなので表示仕様で更新を識別する。

公開後結果：Actionsのupload／deployともsuccess。公開16アセットはHTTP 200・SHA一致。公開URLの一時Edgeで当日除外・明日同日全員・順序・空表示用データ・既存80%中央48pxボタン・日英／テーマ／5幅・既存操作・オフライン成功、consoleエラー0・意図しない外部通信0。公開後にも旧ビルド→配信バイトと同一の新ビルドのSW更新を再実行し、全4storeと画像保持・初期化0・reload1回・オフライン成功。正式mainは作業前後で`95258045928695c894ddf3405aa3a344b229f7bc`のまま。テストrepoはclean、ソース未commit変更を保持。iPhone実機はユーザー確認待ち。

### 幅80%・中央配置・48pxのデザイン更新

commit `f8f405a648061a5e3ae9698f2eb85a96f21105bc`（Update Yoribi preview: centered 80-percent Add person button）。[手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39628012178)。ボタンと文字を中央に揃え、幅80%・高さ48px・日英1行表示にする。最終週→追加→人物欄の順序、5項目ナビ、ホームに追加なし、既存フォームを維持。Version1.4.1・DB v3・ZIP v1はそのままで正式版を変更しない。

100/100テスト・production build・公開物監査・19ファイル監査・ブラウザ回帰成功。配信16ファイルは12,228,436 bytes。実データ・秘密情報・不要な開発ファイルは含めない。現在のテスト配布物から新配布物へのSW更新は全4store・画像SHA一致、初期化0・reload1回、更新後オフライン成功。

iPhoneではテスト側ZIPを保存後、既存PWAを削除せず更新し、中央配置・文字折返しなし・追加／保存／キャンセル・既存データ保持・再起動／オフラインを確認する。Versionは変わらないため新しいボタン形状で更新を確認。正式版へテストZIPを持ち込まない。

公開後：Actionsのupload／deployともsuccess。公開16アセットはHTTP 200・SHA一致。公開URLの一時Edgeで80%・中央位置・48px・文字折返しなしを実測し、配置順・5項目ナビ・ホームに追加なし・保存／キャンセル・既存画像／ZIP／ドラッグ／並替え・オフライン・日英／テーマ／5幅も成功。consoleエラー0・意図しない外部通信0。正式mainは作業前後とも`95258045928695c894ddf3405aa3a344b229f7bc`。テストrepoはclean、ソース未commit変更を保持。iPhone実機はユーザー確認待ち。

### 最終週と人物欄の間への最終配置

commit：`4895d5c9c3fe37b0fbe787b1690afa0447d272f3`（Update Yoribi preview: add person between calendar and people）。[手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39626348025)。DOM・全幅の視覚順は「月間カレンダー本体→追加→人物見出し／人数→全員／未登録→一覧」。上部見出し直下のボタン・ホームのボタンはなく、下部ナビ5項目を維持する。保存／キャンセルはカレンダーへ戻る。正式版は変更しない。

99/99テスト・production build・公開物監査・repo19ファイル監査・Edge回帰成功。アプリ配信は16ファイル・12,228,324 bytesで、実データ・秘密情報・不要な開発ファイルなし。旧テスト配布物→新配布物のSW更新で全4store／画像SHA一致、reload1回・初期化0回・更新後オフライン成功。Version1.4.1・DB v3・ZIP v1・既存URL／scopeはそのまま。

iPhoneではテスト側ZIPを保存後、既存PWAを削除せず更新する。同じVersionなのでボタンの新位置で更新を識別する。人物・画像・記念日・設定の保持、カレンダー最終週の下／人物見出しの上、追加・保存・キャンセル、再起動・オフラインを確認する。正式ZIPをテスト版へ移さない。

公開後：手動Actionsのupload／deployともsuccess。全16アセットはHTTP 200・SHA一致、公開URLの一時Edge検証で最終週下／人物見出し上の座標・5項目ナビ・上部とホームに追加なし・保存／キャンセル復帰・既存操作・日英／テーマ／5幅・オフラインが成功。consoleエラー0・意図しない外部通信0。正式mainは作業前後とも`95258045928695c894ddf3405aa3a344b229f7bc`、テストrepoはclean、ソースの未commit変更は維持。iPhone実機はユーザー確認待ち。

### 前回：ページ見出し直下（履歴）


テストrepoだけのcommit：`a02dfa978759e567880c15a3e547bc5e87891c94`（Update Yoribi preview: place Add person below calendar heading）。[手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39623447648)。下部ナビをホーム／カレンダー／人物／誕生日／設定の5項目に戻し、人物追加をカレンダー見出し直下へ配置。ホームに追加ボタンはなく、保存・キャンセル後もカレンダーを維持する。

98/98テスト・production build・公開物監査・repo19ファイル監査・Edge回帰成功。アプリ配信は16ファイル・12,228,103 bytesで、実データ・秘密情報・不要な開発ファイルを含めない。旧テスト配布物から新配布物へのSW更新で全4store／画像SHA一致、reload1回・初期化0回・更新後オフライン成功。Version1.4.1・DB v3・ZIP v1・固定アイコン・scope・公開URLを維持。正式版は変更しない。

iPhoneではテスト側ZIPを保存してから、既存の「Yoribi テスト」を削除せず更新。5項目ナビ、見出し直下の追加、ホームのボタンなし、追加・保存・キャンセルの復帰、既存人物／画像／記念日／設定、再起動・オフラインを確認する。Versionは同じなので新しい配置で更新を見分ける。正式データや正式ZIPをテスト版へ移さない。

公開後結果：手動Actionsのupload／deployともcompleted/success。全16アセットがHTTP 200・SHA-256一致。公開URLで5項目ナビ・見出し直下・ホームに追加ボタンなし・登録保存／キャンセル復帰・日英／ライトダーク／5幅・画像／ZIP／ドラッグ／並替え／オフライン・標準フォントを一時Edgeで確認し、consoleエラー0・意図しない外部通信0。Versionと配信SWは1.4.1。正式mainは`95258045928695c894ddf3405aa3a344b229f7bc`のまま、テストrepoはclean、ソース未commit変更は保持。iPhone内の実データは未確認。

## カテゴリ名称・追加導線のテスト版更新（2026-10-21）

Version1.4.1・DB v3・ZIP v1を維持。表示名を「現実の知り合い / In-person acquaintances」に変更し、内部キーREAL_FRIENDは不変。追加ボタンは共通ナビのカレンダーと人物の間へ移動し、ホームから削除。既存フォームを再利用する。

テストrepoだけのcommitは`ec5eefac3e3b2216c8df0d6fc8213ae5dbb6cd7d`（Update Yoribi preview: acquaintance label and navigation add action）。[今回の手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39617269558)を参照。新配布物は16ファイル・12,228,229 bytes、repo全体は引き続き19ファイル。実データ・秘密情報・開発ファイルを含めない。前回の更新履歴・拡張誕生年の旧ZIPリーダー互換性注意もPREVIEW.jsonに保持する。

公開後：Actions run全体はcompleted/success、uploadもsuccess。公開URLの全16アセットはHTTP 200・SHA一致し、Edgeの新名称・6項目ナビ／追加・編集・キャンセル・各幅・日英・テーマ・既存操作・オフライン検証が成功（console／外部通信0）。ただし最終API確認時点で個別deploy jobはqueuedと返り、run成功との表示不整合が残った。公開反映は配信バイトで確認しており、強制再実行や設定変更は行っていない。iPhone実機データは未確認。正式mainは作業前後で同じSHA、テストrepoはclean、ソース側は未commit変更を保持した。

公開前に98/98テスト・production build・公開物監査・19ファイル監査・Edge回帰が成功。現在配信中のテスト版から新配布物へのSW更新試験は全4store・画像ハッシュ一致、reload1回・初期化0回・更新後オフライン成功。正式repoは変更しない。iPhoneではテスト側ZIPを先に保存し、既存テストPWAを削除せず更新する。既存人物のカテゴリが新名称で表示されること、全タブから新規追加・保存・キャンセル、日英・ライト／ダーク、終了→再起動・オフラインで既存データが残ることを確認する。Versionは同じなので、新しいナビ配置で更新を見分ける。

## 更新履歴：同日誕生日・日付入力（2026-10-21、Version 1.4.1のまま）


- 同じ「次の誕生日」の日付に該当する人物を全員表示。記念日は月・日を選択、誕生年は選択／自由入力（100〜9999年）に対応。
- テストrepoのcommit：`9470bb5c637e0f017cab039374f0e95af0b427b5`。[手動Actions](https://github.com/yoribi-preview/yoribi-test/actions/runs/39467431347)。正式repoへはcommit・pushしていない。
- 配信する16ファイルは12,228,352 bytes、管理用3ファイルを含む公開repoは19ファイルのまま。OFL・3ウェイト・固定アイコン・manifest/scopeを維持する。
- **新ZIPに1900〜2100年の範囲外の誕生年がある場合、旧正式版・旧テスト版では復元できない。** ZIP形式v1は変わらないが旧版の入力検証で拒否される。更新後のテスト版または互換版だけで復元し、正式版へテストZIPを移さない。旧ZIPは新テスト版で読める。[公開repoの更新履歴](https://github.com/yoribi-preview/yoribi-test/blob/main/PREVIEW.json)にも同じ注意を記録した。
- 94/94テスト・production build・公開物監査・19ファイル監査・一時Edgeの回帰検証成功。旧テスト配布物→新配布物のSW更新で全4store／画像SHA一致、reload1、初期化0、更新後オフライン成功。iPhoneの既存データは実機確認待ち。
- 手動Actionsのupload／deployとも成功。公開URLの全16ファイルはHTTP 200・SHA一致。公開版の一時Edgeで同日3人全員表示、記念日選択、誕生年121候補・自由入力・未設定・再編集、日英／ライトダーク／5幅、ドラッグ／並替え、オフラインを確認。consoleエラー0・意図しない外部通信0。更新確認は`node scripts/release-smoke.mjs --url=https://yoribi-preview.github.io/yoribi-test/ --check-registration=true --check-interactions=true --check-day-list=true --check-home=true --check-birthday-ui=true --check-standard-font=true`で再現できる。

### 今回のiPhone再確認

既存の「Yoribi テスト」からテスト側ZIPを保存し、設定の「更新を確認」→待機中なら「アップデートする」を実行する。削除・再追加やSafariサイトデータ消去はしない。Versionは1.4.1のままなので、新しい年入力の切替UIで更新を見分ける。架空人物3人を同じ次回誕生日にして全員表示、各詳細、記念日2/29・月末、年の選択／自由入力／未設定／再編集、終了・再起動後の画像・記念日・設定・通知、機内モード、テストZIP復元を確認する。最後に正式PWAの既存データが変わっていないことも確認する。

## 分離・配布方針（共通）

異なるHTTPS originなのでIndexedDB・localStorage・SW・Cache Storageは正式版と共有しない。DB名自体は互換性のため変えずv3、ZIP v1を維持する。`base:'./'`、manifestのid/start_url/scopeは相対`./`のまま、SWはテストrepoのパスだけを担当する。正式データは移さず、初回は空から架空データを登録する。

同じ正式ownerの別パスに移さない。テストoriginには他の信頼しないアプリを置かない。Safariとホーム画面PWA間の保存領域共有は保証しない。今回テスト版だけのmanifest name/short_name・Apple Touchのアプリ名を「Yoribi テスト」とした。正式版のHTML・manifest・画像は変更していない。絵柄は正式アイコンと同じなので、追加時の名前も「Yoribi テスト」と確認する。

配信するのは`site/`の16ファイル（12,225,034 bytes）：HTML、JS、CSS、manifest、SW、固定PNG5枚、無改変Zen Maru Gothic TTF3本＋OFL原文・METADATA・SOURCE。フォント3本は11,422,752 bytes。公開repoには管理用のWorkflow、PREVIEW.json、改行変換防止の.gitattributesを加え、全19ファイルのみ。実人物・実画像・ZIP・秘密情報・親Spring・比較UI・他5書体・開発ソースは含めない。公開サイト／repoは誰でも閲覧可能。個人データをテストrepoへ置かない。

## 更新は必ず手動

運用：**開発 → ローカル検証 → テスト配信 → iPhone確認 → 承認後に正式版へ反映**。テストで問題があれば正式版の公開を見送る。

1. ソースrepoの未commit変更を保持し、`npm test` → `npm run build`で本番監査まで成功させる。
2. `node scripts/prepare-iphone-preview.mjs`でGit除外の新しい準備フォルダを生成する。この処理自体はネットワーク・Git操作をしない。
3. `node scripts/audit-iphone-preview.mjs <生成されたフォルダ>`で公開予定repoの全ファイルを検証する。正式版distからの相違はテスト用HTML／manifest／再生成SWのみに限定する。SHA-256、原本・権利文書、ファイル許可リスト、owner・手動公開ガードを確認する。
4. テスト用の既存作業repoを使う。現在の作業repoは`test-artifacts/iphone-preview-0bab6acf-5912-449d-958d-d8725e93265e/`。Git除外のため、なくなった場合は**テストrepoだけ**を別の承認済み作業場所へcloneできる。正式ソースrepoのoriginは付け替えない。
5. 書込み前に、その作業repoのGitルートとoriginが`https://github.com/yoribi-preview/yoribi-test.git`であることを確認。新しい準備一式で`site/`とPREVIEW.jsonを更新し、旧ハッシュ名のJS/CSS等を残さない。`.git`を上書きせず、.gitattributesと手動Workflowを維持する。更新後の監査を再実行してからテストrepo内だけで必要ファイルをcommit/pushする。正式repo・親フォルダで`git add .`しない。
6. **pushでは公開されない。** テストrepoのActions → Yoribi isolated iPhone preview → Run workflow → mainで手動公開する。`YORIBI_PREVIEW_OWNER=yoribi-preview`のrepo variableとowner拒否条件を維持する。正式repoのWorkflowは実行しない。Pagesの方式はworkflow、HTTPS強制ON。有料プラン・ドメイン・runnerは使わない。
7. upload/deploy成功後、URL、Version、SW、全アセット・ライセンス・SHAを確認し、一時ブラウザで公開版を検証する。例：`node scripts/release-smoke.mjs --url=https://yoribi-preview.github.io/yoribi-test/ --check-standard-font=true --check-registration=true --check-interactions=true --check-day-list=true --check-home=true`。実利用者と分離したEdge一時プロファイルを使う。
8. テストPWAの更新・オフライン・データ保持をiPhoneで確認する。再追加・サイトデータ削除で更新試験を代用しない。PREVIEW.jsonは生成時の取得記録で、実際の公開成功はActions結果で確認する。

Git改行変換によるOFL原文・SHAの不一致を避けるため、テストrepoの`* -text`を削除しない。生成物だけのrepoなのでNodeの依存導入やアプリの再ビルドはActions内で行わず、ローカルで監査したものをそのまま配信する。別アプリにも「別origin・実データなし・公開対象限定・手動配信・本番への昇格ゲート」を適用できるが、今回別アプリの設定は変更しない。

## iPhoneで最初に行うこと

1. **正式版**を既存アイコンから開き、設定からZIPを保存。Filesで存在・日時・容量を確認する。正式PWAやサイトデータは削除しない。
2. 通常Safariで **https://yoribi-preview.github.io/yoribi-test/** を開く。ホストを確認し、初回に正式人物が表示されないことを確認する。表示されたら操作を止め、削除・復元せず報告する。
3. Safariの共有 → ホーム画面に追加。名前を **Yoribi テスト** として追加する。以後はこのテストアイコンから起動する。
4. 架空の人物を追加し、端末のテスト画像・誕生日・複数記念日を登録する。正式版のバックアップを読み込まない。
5. ホームの4セクション、全5タブのフォント・長い名前・絵文字・日付、入力欄のズーム、ライト／ダーク／端末追従、日英を確認する。
6. 人物編集、画像の選択／トリミング／差替え、カレンダー日付登録・フィルター・ドラッグ移動・確認／キャンセル、日付一覧の上下並替えを確認する。
7. テストPWAを終了して再起動し、人物・画像・記念日・並び順・通知設定・テーマ・言語が残ることを確認する。
8. 初回の取得完了後、機内モードでテストPWAを再起動し、画像とフォントも含めて表示されることを確認する。書体を含む初回通信は約12.22MBで、通信環境により時間が掛かる。
9. テスト側のZIPを保存し、テスト人物を変更→ZIP検証・確認→復元して元に戻ることを確認する。キャンセルでもデータが変わらないことを確認する。
10. 正式版を元のアイコンから開き、従来の人物・画像が維持されていることを確認する。実機の結果（iOS・機種・Safari/standalone・OK/NG）を報告する。

詳細項目とSW更新の2段階試験は[実機チェックリスト](iphone-preflight.md)を参照。初回公開だけではiPhone上のSW更新を検証したことにならない。次回テスト配信時に、同じテストURLを維持して「あとで」「更新する」・1回reload・データ保持を確認する。

## 検証結果と正式版への反映

2026-10-21：82テスト・production build・本番監査・19ファイルのrepo監査が成功。HTTPS公開の全16ファイルが200でSHA一致。公開版のEdge検証で日付登録・境界日付・保存失敗・PC/タッチ移動・並替え・新ホーム・日英・5幅・ライトダーク・3ウェイト読込・オフライン・4store／画像保持が成功。コンソールエラー0、外部通信0。ローカル全回帰ではZIP完全復元・画像操作も成功。iPhone実機はユーザー確認待ち。

正式repoのmainは作業前後とも`95258045928695c894ddf3405aa3a344b229f7bc`。正式版へのpush・Pages設定変更・データ移行は行っていない。Version1.4.1・IndexedDB v3・ZIP v1を維持。実機確認後、別途承認を得てv1.4.2へ更新・再検証して正式版だけをリリースする。今回は正式版へ反映しない。
