# Zen Maru Gothic正式採用（未公開・Version 1.4.1）

## 原本・権利確認

2026-10-21確認。公式配布元は[google/fonts固定commit](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/zenmarugothic)、上流は[googlefonts/zen-marugothic](https://github.com/googlefonts/zen-marugothic)。既存比較環境の5ファイルを公式URLから再取得し、全バイト・SHA-256・容量が一致した。制作はYoshimichi Ohira。OFL 1.1原文を読み、追加のReserved Font Name指定がないことを確認した。無改変TTFを使用し、形式変換・サブセット化・内部名変更・字形変更はしない。

商用利用・Web組込・ソフトウェア同梱再配布・セルフホストをOFL条件に従って行う。[OFL公式の利用説明](https://openfontlicense.org/how-to-use-ofl-fonts/)も再確認した。フォント単体販売は禁止、フォントはOFLのまま、各コピーへ著作権と原ライセンスを同梱する。制作者の推奨を示唆しない。アプリ本体のライセンス変更や常時クレジットUIは不要で、追加しない。

- OFL原文：`public/fonts/zen-maru-gothic/OFL.txt`（Copyright 2021 The Zen Maru Gothic Project Authors）
- 原メタデータ：同フォルダ`METADATA.pb`（Copyright 2021 The Zen Maru Gothic Authors）。内部TTFの著作権表示もそのまま。
- 取得URL・日時・固定commit・内部Version・SHA-256・無改変の記録：同フォルダ`SOURCE.json`
- 本番配布：すべて`dist/fonts/zen-maru-gothic/`にコピー。法的文書のURLは参照情報であり、アプリが自動通信する送信先ではない。

| 原ファイル | ウェイト | bytes | 内部Version |
| --- | --- | ---: | --- |
| ZenMaruGothic-Regular.ttf | 400 | 3,832,756 | 1.002 |
| ZenMaruGothic-Medium.ttf | 500 | 3,810,988 | 1.001 |
| ZenMaruGothic-Bold.ttf | 700 | 3,779,008 | 1.001 |

合計11,422,752 bytes（11.42MB／約10.89MiB）。権利文書・取得記録を別途同梱。原本コピーは`node scripts/install-zen-maru.mjs`で再現できる（明示的な開発用操作、ネットワーク処理なし）。その後の通常ビルドは比較フォルダを読まないため、将来比較環境を整理しても配布に影響しない。

## 適用・配布・保護

`src/fonts.css`で3つの`@font-face`と共通familyを定義する。本文・設定・日付400、見出し・人物名・ボタン500、ブランド・強調700。フォームは継承し、独自system-uiだった通知バッジも統一した。絵文字・未収録漢字は端末のフォールバックを使い、全Unicode収録を保証しない。ホームの600指定は500へ変更するが、サイズ・配色・余白・44px画像・構成は変えない。比較モード以外の設定やクレジット画面は追加しない。

Viteが`base:'./'`に合わせCSSのフォントURLを`../fonts/...`へ出力する。外部フォント・CDN通信はゼロ。通常の本番成果物16ファイルだけを許可し、原本・SHA-256・相対URL・3Face・SW全ファイルキャッシュを監査する。他5書体・比較UI・比較コードは拒否する。

既存Service Workerは内容ハッシュで更新し、3TTF・権利文書もシェルと同時にプリキャッシュする。全取得が終わるまで新SWはインストール完了しない。待機・利用者操作・1回reload・旧シェルのみ清掃する既存方式は変更しない。フォント取得が失敗しても`font-display:swap`により本文は端末書体で表示する。新SWの取得失敗時は現行activeを残す。

初回／更新時に約11.42MBの通信・保存容量が追加される。速度は通信環境依存で秒数は断定しない。更新待機中は旧／新キャッシュが共存し、今後同程度の書体を含む版同士ならフォント分だけ約22.85MBになる。適用後はこのscopeの最新1シェルを残す。HTTPキャッシュ・デコードメモリは別管理で、実使用量をファイル容量だけから推測しない。初回全取得完了・ブラウザの保存領域維持がオフライン起動の前提。

IndexedDB v3、人物／画像／記念日／通知／言語／テーマ、ZIP v1、URL、scope、Version管理元を変更しない。通常更新でZIP復元やDB初期化は実行しない。

## 再検証

2026-10-21のローカル検証結果：自動82件成功（既存78＋採用4）、production build／公開物監査成功。本番16ファイル・12,224,922 bytes。Edge既存操作回帰では人物CRUD、画像トリミング・差替え、日付登録、PC／タッチドラッグ・同日並替え、ZIP復元、テーマ／言語、更新・キャッシュ整理を確認し、コンソールエラー0・外部通信0。採用書体検証は100表示と20フォーム、3ウェイトの実読込／日本語・英数字グリフ、TTF3本の意図的遮断後の端末書体表示、オフライン読込、4store・画像SHA不変に成功。意図した遮断はFontFaceのerror状態3件で確認し、当該Edgeではコンソールエラーは発生しなかった。

旧公開v1.4.1配布物から現在のローカルv1.4.1成果物へ内容ハッシュによる実SW更新も成功：人物・画像・記念日・設定・通知を含む全4storeと画像SHA一致、reload1回、clear/deleteDatabase呼出し0回、更新後オフライン起動成功。Version据置きのため、公開用次Version更新は別作業。比較環境も7候補・140ホーム表示／全5タブ・日英／オフライン全書体切替と標準復帰を再確認し、全データ不変・コンソールエラー0・外部通信0。iPhone／Android実機は未確認。

```powershell
npm test
npm run build
node scripts/browser-smoke.mjs
# Pages相当サブパスを使用。一時Edgeプロファイルと架空データだけで検証
node scripts/release-smoke.mjs --serve-dist=dist --check-standard-font=true
node scripts/release-smoke.mjs --previous-dist=<旧配布物フォルダ>
```

全5タブ・入力フォーム・日英・ライト／ダーク・320/390/430/768/1280px、3ウェイトの実読込とCDP実描画グリフ、オフライン再起動、4store・画像SHA不変を検証する。追加実験ではTTFだけを意図的に遮断し、SW／HTTPキャッシュを迂回して日本語の端末書体へのフォールバックを確認する。意図したローカルTTF遮断エラーは別件数で報告し、アプリ例外やその他通信エラーは許容しない。通常操作のブラウザ回帰ではコンソールエラー0を要求する。

390pxスクリーンショットと検証レポートはGit除外の`test-artifacts/zen-maru/`。ホーム回帰画像は`test-artifacts/home-ja-light-390.png`・`home-ja-dark-390.png`にも保存する。iPhoneでは実機の日本語・英数字・絵文字・珍しい漢字、全5タブ・入力時ズーム、3テーマ、オフライン再起動、既存人物／画像／記念日／通知の保持、ZIP保存・復元を別途確認する。既存PWAの削除・再追加・サイトデータ削除は不要。今回はcommit・push・公開をしない。
