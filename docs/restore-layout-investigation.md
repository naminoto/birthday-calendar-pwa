# ZIP復元プレビューのスクロール調査（2026-10-22）

追記：ユーザーより、その後のiPhone実機で正式版v1.4.1のZIPをテスト版へ復元し、人物・画像・設定・テーマと再起動後の保持を確認できたとの報告あり。v1.4.2公開前チェックでも既存の再現試験は成功。ただし一時的な表示事象の原因が分かったわけではなく、既知事象・原因未特定の扱いを維持します。

## 結論と作業範囲

**報告されたiPhoneの一時的なレイアウト崩れは、ローカルのEdgeでは未再現。原因未特定です。** iPhoneでの2回目は正常だったとの追加報告に従い、アプリのCSS・viewport・z-index・復元処理・ZIP形式・DBを推測で変更していません。追加したのは開発用再現試験と本記録／READMEだけです。commit・push・deploy、正式版・テスト版・親Spring Boot版への変更はありません。現在の公開アプリとビルドのアプリバイト一致も既存の配布物監査で確認しました。

利用者からの環境報告：**iPhone 16 Pro、iOS 26.6.2、ホーム画面の「Yoribi テスト」、縦向きのまま。キーボードは開いていなかったと思われる。** 初回はZIP選択後のスクロールで発生し、同じ操作の2回目は正常でした。実機への接続・実データZIPの取得はしていません。

## 現在の実装から確認できたこと

- `src/app.js`の`previewRestore`は検証済み日時／件数／完全置換説明／警告の4段落と2ボタンを生成します。人物名・ZIP内全ファイルの一覧は生成せず、選択したファイル名も表示しません。登録件数に比例した長大な人物一覧にはなりません。
- プレビューは設定の`details.setting-section`内の通常フローです。プレビュー自体に固定高・`fixed`・`sticky`・独立した縦スクロール指定はありません。セクションは角丸のため`overflow:hidden`ですが、高さは内容に応じて拡張します。
- 下部ナビは`position:fixed; bottom:0; z-index:5`。ZIP選択時にその位置・z-index・viewport metaを書き換える処理はありません。祖先に固定位置の基準を変えるtransform等も見当たりません。スクロール中にページ内容が固定ナビの背後へ流れること自体は、この既存構造による通常の重なりです。「ナビがviewportの途中へ浮いた」「最後までスクロールしても操作できない」とは分けて確認します。
- `viewport-fit=cover`、ナビの`env(safe-area-inset-bottom)`、bodyの`min-height:100dvh`、モバイルのapp-shell下余白95pxとview下余白20pxを確認しました。余白がiPhone実機の状態変化に対して常に十分かは、Edgeのsafe-area=0の測定では断定できません。
- ファイル選択／`inspectBackup`／プレビュー生成はDBの内容を置換しません。既存の確認ダイアログと確認文字入力を完了して初めて`restoreBackup`へ進みます。キャンセル・transaction失敗時の保護は既存仕様のままです。

## 再現試験

`scripts/restore-layout-smoke.mjs`を既存の全ブラウザスモークへ追加しました。空のEdge一時プロファイルにだけ架空の人物・画像・誕生日・記念日を作り、実データには触れません。

- 320／390／430px × 日本語／英語 × ライト／ダーク＝12条件。
- 通常の書き出しZIPを各3回選択、合計36回。長いファイル名でも通常プレビューは同じサイズ計算で表示。
- 選択前後のdocument／プレビュー寸法、scrollY、ナビの矩形・position、innerHeight、VisualViewportの高さ・offsetTop・scaleを記録。
- 選択後に先頭・途中・最下部・戻りの216回の位置測定、36回のCDPタッチスクロール、500／667／844pxへの36回のviewportサイズ変更。
- ナビがviewport下端から移動しないこと、通常プレビューの横はみ出しがないこと、復元ボタンをナビ上までスクロールしてヒットテスト／クリックできることを確認。
- プレビュー・スクロール・確認キャンセル・確認文字入力のキャンセル、強制した復元transaction失敗で全4storeと画像バイトを照合し、不変を確認。失敗後もボタンへ到達。壊れたZIPも拒否しデータ保持。
- 既存131件・production build・16ファイル公開物監査・全ブラウザ回帰が成功。consoleエラー0・意図しない外部通信0。

**限界**：これはChromium/Edgeの再現試験で、iOS Safari/WebKitやホーム画面PWAではありません。viewport縮小はソフトウェアキーボード／Filesピッカー／iOSの慣性・ラバーバンドスクロール・セーフエリア更新を再現しません。実機のキーボードなし条件も直接確認したことにはなりません。

### 別事象：人工的に長い日時

独立したストレス試験として、manifestの日時に200桁の小数秒を持つ人工ZIPを使用すると、全条件で日時文字列の横はみ出し／親によるクリップを検出しました。通常の`createBackup`はこの日時を生成しません。ナビ位置ずれは再現せず、今回の初回iPhone報告の原因と同一とは判断していません。データは変更されません。将来、外部生成ZIPへの表示耐性を高める場合は、まずこの小さな再現条件で日時の折返し・表示長制限を検討します。今回は通常ケースの再現がないためCSSや入力検証を変更していません。

## 記録と再実行

```powershell
npm test
npm run build
node scripts/browser-smoke.mjs > test-artifacts/restore-investigation-browser.log
```

調査値はログ内`restoreLayout`、集計は`test-artifacts/restore-investigation-summary.json`。選択前は`restore-layout-before-ja-light-390.png`、選択後は`restore-layout-ja-light-390.png`（日英・両テーマあり）。画像とログはGit除外・配布対象外です。実利用者のZIPをこの試験へ読み込ませないでください。

## iPhoneで再発した際に残したい情報

1. まず削除・復元確定せず、スクリーンショットまたは短い画面録画を保存。人物名など個人情報は共有前に隠します。実データZIPの送付は不要です。
2. 選択直後か、指でスクロール中か、指を離した後も継続したか、最下部へ到達できたか、復元ボタンが操作できたかを分けて記録。
3. ファイル選択シートから戻る前後、初回／2回目、アプリを開き直すと直るか、表示倍率・文字サイズ、キーボード／向きの変更の有無を記録。
4. 可能なら実機Web InspectorでinnerHeight／visualViewport.height・offsetTop・scale、scrollY、nav矩形、document.scrollHeightを取得。端末に触れる準備や公開版への診断コード追加は今回は行っていません。
5. 正式／テストPWAを削除したりSafariのサイトデータを消したりしないこと。原因特定までは既存のZIPバックアップとデータ保護を維持します。

## 一次情報（2026-10-22確認）

- [WebKit: Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)：viewport-fitとsafe-areaの基本。safe-areaだけを今回の原因と断定する根拠ではありません。
- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)：layout viewportとvisual viewportの区別、測定API。
- [WebKit Bug 254868](https://bugs.webkit.org/show_bug.cgi?id=254868)：インストール済みWebアプリのviewport-fit／高さに関する報告例。過去の別バージョン・別条件の報告であり、利用者のiOS 26.6.2の原因や回避策としてそのまま採用していません。
