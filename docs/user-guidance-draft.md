# 利用者向け案内（v1.4.3候補・ローカル実装）

追記：新しい書き出しは暗号化`.yoribi`になりました。内部ZIP v1と旧ZIPの読み込みは維持します。以下の「ZIPは未暗号化」は旧ZIPについての説明です。暗号化ファイルも公開・不用意な共有を避け、パスワードを別途安全に保管してください。忘れたパスワードの復旧はできません。端末内データ削除・利用終了の対象と制約は[暗号化・利用終了仕様](encrypted-backup-and-exit.md)を優先してください。

設定画面の「データとプライバシー」へ要点を日英で実装しました。当面は友達・知り合いへの案内とし、問題は紹介者へ直接連絡する運用です。問い合わせフォーム・専用メール・外部問い合わせリンク・送信機能は設けません。この文書は説明の参考資料で、法律上の適用判断・完全なプライバシーポリシーの法務確認の代替ではありません。

## 日本語案

### データの保存と通信

Yoribiはログイン不要のローカルPWAです。登録した人物名、誕生日、記念日、メモ、カテゴリ、URL、プロフィール画像、通知・既読・設定は、お使いの端末のブラウザ内に保存します。運営者が人物データを収集するサーバー、analytics、広告、X API、外部画像処理サービスは使いません。

アプリ本体と更新ファイルはGitHub Pagesから取得するため、GitHub側では通常のアクセス情報（IPアドレスなど）を取り扱います。Xプロフィールや関連URLを自分で開いた場合は、そのリンク先へ移動します。バックアップをクラウドへ保存・共有した場合は、自分の操作によりそのサービスへデータが渡ります。「端末内保存」は、通信が一切ないという意味ではありません。

### データを失わないために

iPhone／Android／PC、別のブラウザ、別の公開URLのホストでは、保存領域が異なります。自動同期はありません。アプリ削除、サイトデータ削除、プライベートブラウズ、ブラウザ／OSの保存領域整理、端末の故障・紛失によってデータを失うことがあります。永続保存や回復は保証できません。大切な変更後はZIPバックアップを作成し、安全な別の保管先にも保存してください。

通常の更新ではIndexedDBを初期化しません。更新のためにアプリやサイトデータを削除する必要はありません。機種変更前もZIPを書き出し、新端末で検証・確認してから復元してください。

### ZIPバックアップと復元

ZIPは**暗号化されておらず**、人物情報・メモ・画像を含みます。公開リポジトリ、SNS、誰でも開ける共有リンクへ置かないでください。第三者から届いたファイルではなく、自分で書き出した信頼できるバックアップを使用してください。SHA-256は破損の検知用で、送信者を認証する署名ではありません。

復元は完全置換です。今の端末だけにある人物も置き換わり、ファイルにない人物は残りません。内容確認前に現在データをバックアップしてください。ファイルの選択・検証だけでは保存データを変更しません。形式・容量・参照・画像を検証し、明示的な確認後にだけ復元します。不正なZIPは受け付けません。

### プライバシーと共有端末

共有端末では、他の利用者がブラウザやアプリを開けることに注意してください。アプリ独自のパスワードや暗号化保管機能はありません。第三者の情報は必要最小限にし、機微な情報をメモへ保存しないことを推奨します。人物の削除は画像・記念日・関連通知も対象になりますが、過去に書き出したZIPや端末の外へ共有したコピーまでは消せません。

### 問題があったときは

紹介してくれた人へ直接お知らせください。問い合わせフォーム・専用メール・外部問い合わせリンクは設けません。Git履歴の作者メールを問い合わせ先として流用しません。

連絡時はアプリVersion、OS／ブラウザ、再現手順、架空データをお知らせください。**実データZIP・人物の写真・メモ・個人情報を送らないでください。** スクリーンショットは名前などを隠してください。

## English draft

Yoribi stores your people, birthdays, anniversaries, notes, URLs, images, reminders and settings in this browser on this device. It does not provide login, cloud sync, analytics, advertising or X API integration. App files and updates are fetched from GitHub Pages, whose hosting service handles access information such as IP addresses. Opening an external link or sharing a backup sends information to the destination you choose.

Local storage is not guaranteed permanent. Removing the app, clearing website data, private browsing, storage cleanup, device loss or damage may erase it. Different devices, browsers and website origins have separate data. Make regular backups and keep a safe copy elsewhere. Do not delete the existing app or site data to install an update.

Backup ZIPs are not encrypted and include personal information and images. Do not upload them publicly or send them to support. Use trusted backups you created. Checksums detect corruption; they do not authenticate the sender. Restore completely replaces the current local dataset, rather than merging it. Back up the destination before confirming. Selecting or validating a file does not replace current data.

Use minimal third-party information and avoid sensitive notes. Other people using a shared device may be able to access the app. Deleting a person cannot erase previously exported or shared copies. For now, contact the person who introduced you to Yoribi directly. No contact form, dedicated email or external contact link is provided. Describe the version, environment and reproduction steps with fictional data, never real backups or photos. Hide personal information in screenshots.
