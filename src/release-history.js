// 現在の正式版と公開済み正式版を、新しい順に記録する。
// 未公開候補の公開日はnullのまま捏造せず、正式公開時に実日付へ置き換える。
// 公開済みの日付と内容は正式repoのRelease commit・README・公開前/最終検証資料で確認する。
export const RELEASE_HISTORY = [
  {version:'1.6.0',date:'2026-11-06',changes:[
    {category:'new',ja:'人物の誕生日を月・日またはインラインカレンダーで選べるようにし、入力方式を切り替えても日付とフォーム内容を保持するようにしました。',en:'Added month/day and inline-calendar birthday entry while preserving the selected date and form contents when switching modes.'},
    {category:'improvement',ja:'閲覧カレンダーと人物一覧のカテゴリ絞り込みを独立したオーバーレイへ整理し、人物管理の並び順・登録状態・安全な一括削除を使いやすくしました。',en:'Refined independent overlay category filters for the calendar and people list, together with sorting, registration filters, and safer bulk deletion.'},
    {category:'improvement',ja:'下部ナビゲーションに選択背景のスライドと各アイコンの形状変化を追加し、動きを減らす設定にも対応しました。',en:'Added a sliding selection background and shape transitions to bottom navigation icons, with reduced-motion support.'},
    {category:'fix',ja:'人物アイコンの輪郭交差と歯車アニメーションの跳ね戻りを修正し、同じメニューの再タップ・外側タップ・Escapeで閉じられるようにしました。',en:'Fixed overlapping people-icon contours and gear animation snap-back, and made menus close on trigger retap, outside tap, or Escape.'},
    {category:'improvement',ja:'iPhoneで固定UI文字の不要な長押し選択を抑えつつ、入力欄・メモ・プロフィールURLと既存の長押し操作を維持しました。',en:'Reduced accidental long-press selection of fixed UI text on iPhone while preserving selectable inputs, notes, profile URLs, and existing long-press actions.'},
  ]},
  {version:'1.5.0',date:'2026-11-05',changes:[
    {category:'new',ja:'8種類の既定カテゴリと自由に追加できるカスタムカテゴリを導入し、名前・色・使用人数を設定から管理できるようにしました。',en:'Added eight built-in categories and custom categories with name, color, and usage management in Settings.'},
    {category:'new',ja:'人物の追加・編集中に、入力内容や画像を保持したまま新しいカテゴリを作成してその場で選択できるようにしました。',en:'Added in-form category creation while preserving person details and images, with the new category selected immediately.'},
    {category:'improvement',ja:'カテゴリの表示順を「既定7種、カスタム作成順、その他」に統一し、カレンダーでは複数カテゴリを同時に絞り込めるようにしました。',en:'Unified category order as seven built-ins, custom creation order, then Other, and added multi-category calendar filtering.'},
    {category:'improvement',ja:'バックアップ内部形式v2にカテゴリ設定を含め、従来のv0／v1 ZIPと暗号化.yoribiの復元互換性を維持しました。',en:'Included category settings in backup format v2 while retaining restore compatibility with v0/v1 ZIP and encrypted .yoribi backups.'},
    {category:'improvement',ja:'XプロフィールURLからusernameを補完する条件を人物フォームに日英で案内するようにしました。',en:'Added bilingual guidance describing when username is completed from an X profile URL.'},
  ]},
  {version:'1.4.3',date:'2026-11-04',changes:[
    {category:'new',ja:'パスワード付きの暗号化バックアップ（.yoribi）を追加し、従来のZIPバックアップも引き続き読み込めるようにしました。',en:'Added password-protected encrypted .yoribi backups while retaining import compatibility with legacy ZIP backups.'},
    {category:'security',ja:'AES-256-GCM暗号化、ZIP・画像の厳密な検証、復元失敗時のロールバックにより、バックアップと復元の安全性を高めました。',en:'Improved backup and restore safety with AES-256-GCM encryption, strict ZIP and image validation, and rollback on restore failure.'},
    {category:'new',ja:'端末内データの管理、暗号化バックアップ、データ削除、利用終了に関する「データとプライバシー」の案内を追加しました。',en:'Added Data and privacy guidance for on-device storage, encrypted backups, data deletion, and stopping use of Yoribi.'},
    {category:'improvement',ja:'高解像度写真、HEIC／HEIF、トリミング、キャンセル時の一時画像破棄など、プロフィール画像処理を改善しました。',en:'Improved profile-image handling for high-resolution photos, HEIC/HEIF, cropping, and disposal of temporary images after cancellation.'},
    {category:'fix',ja:'iPhoneの写真ピッカーで0枚確定時に直前の写真が表示される問題を、1枚だけを採用する複数選択方式で修正しました。',en:'Fixed an iPhone photo-picker issue where the last photo could reappear after confirming zero selections, using a multiple picker that accepts exactly one image.'},
    {category:'improvement',ja:'Safariとホーム画面PWAの保存領域、端末移行、バックアップ手順を分かりやすく案内するようにしました。',en:'Clarified storage separation, device transfer, and backup steps for Safari and Home Screen PWAs.'},
    {category:'security',ja:'Service Workerのscope・キャッシュ管理、更新確認、CSPを強化し、利用者データを更新処理から分離しました。',en:'Strengthened Service Worker scope and cache handling, update checks, and CSP while keeping user data separate from app updates.'},
  ]},
  {version:'1.4.2',date:'2026-10-22',changes:[
    {category:'new',ja:'ホームを「今日の予定」「次の誕生日」「近日の誕生日・記念日」に整理し、日付セルのどこからでも全予定を開けるようにしました。',en:'Reorganized Home into today, next birthday, upcoming birthdays, and anniversaries, and made every part of a calendar date open its full event list.'},
    {category:'new',ja:'人物管理に5種類の並び替えと、人物・画像・通知をまとめて安全に削除する複数選択を追加しました。',en:'Added five people-list sort options and multi-select deletion that safely removes people, images, and reminders together.'},
    {category:'improvement',ja:'Zen Maru Gothic、人物操作メニュー、暗色カード、空日付からの登録、誕生年100〜9999年の入力を追加・改善しました。',en:'Added or improved Zen Maru Gothic, person action menus, dark cards, registration from empty dates, and birth years from 100 to 9999.'},
    {category:'fix',ja:'当日の誕生日が「次」「近日」に重複する表示を解消し、閉じた後の月・スクロール位置を保つようにしました。',en:'Removed duplicate appearances of today’s birthdays from next/upcoming lists and preserved the month and scroll position after closing a day.'},
  ]},
  {version:'1.4.1',date:'2026-10-20',changes:[
    {category:'new',ja:'日付別一覧で、PCのドラッグ、スマホの長押し、Alt＋↑/↓による同日予定の並び替えを追加しました。',en:'Added same-day event ordering from the day list by mouse drag, touch long-press, or Alt+Arrow keys.'},
    {category:'improvement',ja:'一覧からカレンダーへ予定を移動でき、キャンセルや無効な移動では保存しないようにしました。',en:'Allowed events to be moved from the day list onto the calendar while keeping cancel and invalid moves non-destructive.'},
  ]},
  {version:'1.4.0',date:'2026-10-20',changes:[
    {category:'new',ja:'表示名をYoribiへ変更し、正式PNGアイコンを採用しました。公開URL・DB名・保存データは維持しています。',en:'Renamed the app to Yoribi and adopted the official PNG icon while retaining the public URL, database name, and saved data.'},
    {category:'new',ja:'ライト・ダーク・端末追従テーマと、折りたたみ式の設定画面を追加しました。',en:'Added light, dark, and system themes plus collapsible settings sections.'},
    {category:'improvement',ja:'カレンダーを7列の正方形セルへ整理し、ローカルSVG線画アイコンへ統一しました。',en:'Refined the calendar into seven-column square cells and standardized navigation on local SVG outline icons.'},
  ]},
  {version:'1.3.3',date:'2026-10-15',changes:[
    {category:'improvement',ja:'カレンダーセルの高さと表示予定数を端末幅に合わせ、ドラッグ・長押し移動と人物選択案内を改善しました。',en:'Adjusted calendar cell height and visible event count by screen size, and improved drag, long-press movement, and person-selection guidance.'},
  ]},
  {version:'1.3.2',date:'2026-10-15',changes:[
    {category:'new',ja:'予定のない日付から人物を追加し、既存人物へ誕生日を割り当てられるようにしました。',en:'Added person creation from an empty calendar date and birthday assignment to an existing person.'},
    {category:'improvement',ja:'保存失敗時は入力を保持し、キャンセル時は保存せず、保存後は対象月へ戻るようにしました。',en:'Kept form input after save failures, avoided writes on cancel, and returned to the target month after saving.'},
  ]},
  {version:'1.3.1',date:'2026-10-15',changes:[
    {category:'new',ja:'カレンダーに人物画像・文字アバターと、誕生日／記念日の種別表示を追加しました。',en:'Added profile images or letter avatars to the calendar, with distinct birthday and anniversary markers.'},
    {category:'fix',ja:'再描画後に古い画像URLを解放し、画像読み込み失敗時は文字アバターへ戻すようにしました。',en:'Released stale image URLs after rendering and fell back to letter avatars when an image failed to load.'},
  ]},
  {version:'1.3.0',date:'2026-10-09',changes:[
    {category:'new',ja:'設定からVersion・更新状態を確認し、更新確認や待機中アップデートを適用できるようにしました。',en:'Added version and update status in Settings, including manual checks and applying a waiting update.'},
    {category:'new',ja:'ZIPによる端末間移行手順と、復元が完全置換であることの案内を追加しました。',en:'Added ZIP-based device transfer steps and clear guidance that restore completely replaces destination data.'},
  ]},
  {version:'1.2.1',date:'2026-09-26',changes:[
    {category:'fix',ja:'「あとで」にしたPWA更新を、同じ前面セッションでは繰り返さず、再表示・次回起動時に再案内するよう修正しました。',en:'Fixed deferred PWA updates so they stay dismissed in the current foreground session and reappear after returning or on the next launch.'},
  ]},
  {version:'1.2.0',date:'2026-09-26',changes:[
    {category:'new',ja:'画像のトリミング、自由名称の複数記念日、日英切替、アプリシェル更新案内を追加しました。',en:'Added profile-image cropping, multiple custom anniversaries, Japanese/English switching, and app-shell update prompts.'},
    {category:'improvement',ja:'IndexedDB v3への前方移行とZIP v1互換を保ち、画像・人物・通知を端末内で安全に扱うようにしました。',en:'Kept forward migration to IndexedDB v3 and ZIP v1 compatibility while handling images, people, and reminders locally.'},
  ]},
];
