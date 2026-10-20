# ローカルPWA版の開発ルール

- 表示名はYoribi（ヨリビ）。互換性のためbirthday-circle系のDB名・保存キー・SW scope・公開URLはリブランドを理由に変更しません。
- 正式アイコンは`yoribi-icon.png`由来の固定PNGです。別デザインへの再描画やカラー変更設定は追加しません。`scripts/generate-icons.mjs`で背景余白・maskable安全領域・元絵柄保持を検証して再生成します。
- テーマは既存settings storeのappearanceキーへ保存し、ZIP v1の任意項目として検証・復元します。旧ZIPはライトへフォールバックし、DB v3は変更しません。

親のSpring Bootリポジトリ内で作業するときは、親ルートの `AGENTS.md` を先に読み、そのルールと矛盾しない範囲で以下を守ります。PWA専用リポジトリとしてこのフォルダだけを切り出した場合は、このファイルがルートの開発ルールです。

- IndexedDBの人物・画像・設定・通知は利用者データです。アプリ更新やService Worker更新で削除しません。
- IndexedDBの構造変更は `src/db.js` のDB versionを上げ、`onupgradeneeded` に旧データを保つMigrationを追加します。既存storeを安易に作り直しません。
- Service Workerは `birthday-circle-shell-` 接頭辞の自分のキャッシュだけを清掃します。IndexedDBとCache Storageを混同しません。
- 画像は登録前に縮小・圧縮し、人物IDをキーとして同一トランザクションで置換・削除します。孤児が出ないかテストします。
- ZIPバックアップはmanifestのformatVersionを持ちます。旧形式の読み込みを壊す変更をする場合はMigrationと互換テストを追加します。
- X API/OAuthや秘密情報をフロントエンドへ入れません。常時サーバー、ログイン、クラウドDBへの依存を加えません。
- 新しい外部URLへの自動画像取得は行いません。Xへのリンクは利用者操作でのみ開きます。
- アプリキャッシュ清掃と利用者データ削除を同じ操作にしません。
- GitHub Pagesへは `dist/` の監査済みアプリシェルだけを渡します。親のSpring Bootリポジトリ、実データ、バックアップZIP、秘密情報を公開物へ混ぜません。
- GitHub Pagesの同一ホスト上の別サブパスはIndexedDBの隔離境界ではありません。新しい外部通信やホスティング先の変更にはプライバシー影響を確認します。
