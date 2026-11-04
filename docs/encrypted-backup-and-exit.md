# 暗号化バックアップ・管理データ削除（ローカル候補）

Version 1.4.3で正式公開。IndexedDB v3、内部ZIP v1を維持し、従来のセキュリティ修正と案内を引き継ぐ。

## 選択した互換方針

新規書き出しは暗号化した`.yoribi`のみ。旧ZIPの読み込みを恒久的な互換経路として残す。一時的な移行期限を設けると、後から見つかった正常バックアップが読めなくなるため採用しない。内部の`createBackup`は互換テスト用も兼ねてZIP v1を生成するが、通常のUIから平文ZIPは書き出さない。

暗号化形式は普通のZIP解凍アプリや旧Yoribi v1.4.2では開けない。旧ZIPを候補版で検証・完全復元してから新形式へ書き出せる。通常更新時にこの処理は自動実行されない。旧ZIPは未暗号化のままなので適切に保管し、不要なら利用者がFiles等から削除する。

## エンベロープv1

Web CryptoのAES-256-GCM（認証タグ128bit）。PBKDF2-HMAC-SHA-256・600,000回で非抽出鍵を導出。毎回、`crypto.getRandomValues`で16byte saltと12byte IVを独立生成する。ヘッダー全体をadditionalDataに含め、内部ZIPのファイル名・人物名・画像・manifestをまとめて暗号化する。形式・長さ・KDFパラメータは公開情報で、ファイルサイズは隠さない。

| byte offset | 内容 |
|---|---|
| 0–7 | ASCII `YORIBI\r\n` |
| 8 | エンベロープVersion=1 |
| 9 | KDF ID=1（PBKDF2-SHA-256） |
| 10 | cipher ID=1（AES-256-GCM） |
| 11 | flags=0 |
| 12–15 | iterations=600000、uint32 big-endian |
| 16–31 | salt |
| 32–43 | IV |
| 44–47 | 元ZIPのbyte数、uint32 big-endian |
| 48–63 | reserved=0 |
| 64以降 | ZIP全体の暗号文＋末尾16byte tag |

ZIP本体128 MiB以下、ファイル全体128 MiB＋80byte以下。全体読込・KDF前に固定64byteヘッダーを検査し、未知Version／方式／反復回数／フラグ／余剰byte／切断を拒否する。反復回数は入力値を無制限に採用しない。復号後も既存ZIP検証（実展開量・構造・CRC・SHA・参照・完全画像デコード・寸法）を必ず通す。全部成功するまで書き込みなし。復元は従来の4ストアatomic完全置換。

暗号処理は一括バッファを必要とするため、上限内でも大きなファイルはスマホのメモリを圧迫し得る。ZIP爆弾への既存制限は維持するが、無制限メモリ不要を保証するものではない。バックアップ元は全4ストアを1つのreadonly transactionで読み、別タブの編集によるスナップショット不整合を減らす。

## パスワード

12 Unicode code point以上、UTF-8で1024byte以下、制御文字と空白だけの文字列を拒否。確認入力は完全一致。強度の保証や辞書攻撃耐性の判定器ではないため、長く推測されにくいパスフレーズを推奨。Unicode正規化や前後空白の除去はしない。

作成は`autocomplete=new-password`、復元は`current-password`、一定のname、常時password型、16px以上の入力欄。入力欄自体の表示状態は変更せず、明示操作中だけ別の編集不可領域へ現在値を`textContent`で表示する。確認表示を閉じた時、ページを背景へ移した時、ダイアログ終了時には表示用DOMの平文を消す。アプリ独自の記憶機能はない。送信・ログ・URL・永続ストレージにパスワードや鍵を置かない。処理終了時には入力DOMを消し、byteバッファを可能な範囲で0クリアする。ただしJavaScriptの文字列・GC・ブラウザ内部コピーの完全な消去までは保証できない。

パスワードマネージャーへの保存／自動入力は端末依存で保証しない。忘れたファイルは復旧できず、裏口や固定キーもない。元端末にデータが残っていれば新しいパスワードで新規作成できる。過去のファイルのパスワードは自動変更されない。

## 管理データの削除

設定「データとプライバシー」の危険操作。バックアップへの導線、バックアップ保存済み／不要の確認、他のYoribi画面を全部閉じる確認、確認文字列（日本語「削除」／英語「DELETE」）を経る。キャンセルでは保存データを変更しない。

新版の各画面はDB名に対応するWeb Locksのshared lockを保持。削除はexclusive・ifAvailableで他の新版タブがいれば拒否する。さらに自分のSWに同じscopeの別window（旧版を含む）がないか問い合わせる。Web Locks・対応SW・停止フラグの保存を確認できなければ削除を開始しない。旧版の協調機能に依存せず、旧版も閉じておくことが前提。別パスで同じDB名を意図的に共有する旧コード、外部開発ツール、同一オリジンの悪意あるコードまで完全に制御する仕組みではない。

開始時にUI・ジェスチャー・更新処理を停止し、アプリDB接続をcloseする。既に走っている処理の後続書き込みを抑え、専用接続から人物／画像／通知／設定を単一transactionでclearし、commit前に全ストア0件を確認する。誕生日・記念日・メモ・カテゴリ・URLは人物レコード内なので一緒に消える。失敗なら全ストアrollbackし、SW等の掃除へは進まない。

`deleteDatabase`は使わない。blocked後も要求をキャンセルできず、後からDB全体が消える挙動を避けるため、空のv3スキーマを残す。自動初期化防止にlocalStorageの`birthday-circle-local-retired`という個人情報を含まない停止フラグだけを残す（pending／partial／done）。再起動はこのフラグをDB openより前に確認し、通常アプリを起動しない。利用終了用の停止状態で、再インストールだけで再開できることは保証しない。

自分の**正確なscopeとsw.js URL**に一致するSWへ停止要求を送り、専用登録だけをunregister。キャッシュは`birthday-circle-shell-<encoded own pathname>-<16 hex>`に一致するものだけを削除・再確認する。登録が使われている他画面を勝手に止めたり、別の登録やキャッシュをorigin全体で消したりしない。

既知の更新確認キー`birthday-circle-last-update-check`だけをlocalStorage／sessionStorageから除去。現在のコードに他の専用sessionStorageデータはない。`clear()`、`Clear-Site-Data`、origin全体の消去、他DBの削除は行わない。4項目（保存データ・Cache Storage・SW登録・既知キー）の結果を個別表示し、どれか未完了なら完了と表示せず、停止を維持して明示的再試行を案内する。

書出し済みファイル、パスワードマネージャー、OS／ブラウザ内部の一部キャッシュ、別アプリのデータは対象外。バックアップ先や物理ディスクからの完全消去を保証しない。

## 利用終了と実機確認

暗号化バックアップ → 管理データ削除 → 結果確認 → 必要ならOS側でアイコン／アプリを削除。iPhone／Android／PCを利用者が選ぶ。長押しやブラウザのアプリ管理などの候補を案内するが、OS版・追加方法ごとに異なるため断定せず、自動アンインストールはしない。問い合わせフォーム・メール・外部問い合わせリンクなし。

実機では**実データを使わず独立テスト版の架空データだけ**で以下を確認する。

1. Safari／Chrome・standalone、ライト／ダーク、日英、小画面で表示・フォーカス・キーボード時のスクロール。
2. パスワードの別領域確認表示、iPhone「パスワード」／Googleパスワードマネージャーの保存と自動入力（できない環境もある）。
3. 暗号化完了後にFiles等へ保存でき、再選択と正しいパスワードで検証・復元できる。
4. 誤パスワード・破損・キャンセルでは人物・画像・設定が変わらない。
5. 旧ZIPの検証・復元、旧ZIP→新暗号化ファイルへの移行。新形式を旧正式版へ入れない。
6. オフライン書き出し／復元、通常SW更新後の既存データ保持。
7. 他のYoribi画面があると削除が拒否され、閉じた後に確認して削除できること。部分失敗は未完了と分かること。
8. 削除後の再起動で旧データが復活しないこと、別アプリへ影響しないこと。端末のバックアップファイルとマネージャーのパスワードは別途残っていること。

## 実装・検証の参照

検証結果：既存162＋追加20＝**182件すべて成功**。production build・16ファイル公開物監査成功。Edge全体回帰（画像・トリミング・人物操作・ドラッグ・並び替え・旧ZIP安全性・日英／テーマ・オフライン）も成功。新しいパスワードUIは日英×両テーマ×320/390/430/768/1280pxの20条件で16px以上・横はみ出しなしを確認。

重点ブラウザ試験では、暗号化往復・誤パスワード・改ざん拒否・プレビュー／キャンセル不変・オフライン暗号化／復元・実2タブでの削除拒否・4ストアclear途中失敗のrollback・キャッシュ削除だけの部分失敗と再試行・別アプリのDB／キャッシュ／localStorage／sessionStorage保持・削除後の再起動で0件維持を確認。consoleエラー0・意図しない外部通信0。

旧正式版v1.4.2の配布物→候補版のSW切り替えで人物・画像SHA・記念日・設定・通知を含む全4ストアが一致し、DB初期化0・reload1・更新後オフライン成功。旧アプリ自身が架空データから作ったZIPを新UIで検証でき、ソース間のZIP互換試験も成功。アプリVersionはまだ同じなので、1.4.3番号付きの公開実機更新を検証したという意味ではない。

ログはGit除外の`test-artifacts/encrypted-lifecycle-tests.log`、`encrypted-lifecycle-browser.log`、`encrypted-lifecycle-focused.log`、`encrypted-lifecycle-update.json`、`encrypted-lifecycle-compatibility.json`。画像は`encrypted-password-{ja,en}-{light,dark}-390.png`。途中の回帰1回はdist再ビルドと重なり固定日付のオフライン再読込で停止したため、成果物を固定して全体を再実行し成功した。**ブラウザ回帰中にdistを再生成しないこと**。

iPhone／Android実機・OSキーボード・パスワードマネージャー・実際のFiles保存は未検証。独立したテスト版で架空データを使って確認後、改めて公開承認とVersion更新が必要。実ユーザーのデータやバックアップは今回の検証に使っていない。

主な実装は`src/encrypted-backup.js`、`password-dialog.js`、`data-lifecycle.js`、`exit-ui.js`、`lifecycle-messages.js`と既存app／backup／update／SW／翻訳／CSS。検証は`tests/encrypted-backup.test.js`、`tests/data-lifecycle.test.js`、`scripts/lifecycle-smoke.mjs`と既存全体回帰。破壊的なブラウザ試験はlocalhost・使い捨てプロファイルでのみ実行する。

確認日2026-10-22。設計参考の一次情報：[Web Crypto](https://www.w3.org/TR/webcrypto/)、[Web Locks](https://www.w3.org/TR/web-locks/)、[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)、[Appleの削除操作案内](https://support.apple.com/en-au/guide/iphone/iph248b543ca/ios)、[Chrome Web Apps](https://support.google.com/chrome/answer/9658361)。独自実装の形式を標準ZIP暗号化やFIPS認証済みと称するものではない。外部リンクはこの開発資料の参考文献で、アプリ内の問い合わせリンクは追加しない。
