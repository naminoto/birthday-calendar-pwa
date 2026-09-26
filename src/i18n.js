import { CATEGORIES, ANNIVERSARY_TYPES } from './model.js';

const messages = {
  ja: {
    skip:'本文へ移動', tagline:'端末内だけの誕生日ノート', bell:'通知を開く', navigation:'画面切り替え',
    updateAvailable:'アップデートがあります。データは端末に残ります。', updateNow:'更新する', updateLater:'あとで',
    updating:'更新中です…', updateWait:'更新の準備ができませんでした。後ほど再試行してください。',
    updateUnsaved:'編集中の内容は未保存です。更新しますか？',
    home:'ホーム', calendar:'カレンダー', people:'人物', birthdays:'誕生日', settings:'設定',
    heroTitle:'大切な日の、すぐそばに。', heroText:'あなたの人物と記念日は、この端末の中だけに保存されます。',
    addPerson:'＋ 人物を追加', addShort:'＋ 追加', upcoming:'もうすぐ誕生日', within7:'7日以内', within30:'30日以内',
    otherUpcoming:'その他の近日記念日', within14:'14日以内', calendarTitle:'誕生日・記念日カレンダー', thisMonth:'今月へ',
    eventType:'予定種類', anniversary:'記念日', anniversaryName:'記念日の名称', anniversaryExample:'例：出会った日',
    repeatYearly:'毎年繰り返す', onceOnly:'一度きり', showAnniversary:'周年を表示', notifyAnniversary:'通知する',
    optionalYear:'年（任意）', onceNeedsYear:'毎年繰り返さない場合は年が必要です。',
    notifyOn:'通知ON', notifyOff:'通知OFF', anniversaryYears:'{years}周年',
    annNoticeToday:'今日は{name}の「{title}」です', annNoticeTomorrow:'明日は{name}の「{title}」です',
    annNoticeFuture:'{name}の「{title}」まであと{days}日です',
    persons:'人物', allPeople:'全員', unregistered:'未登録', railHelp:'PCはアイコンをドラッグ。スマホは人物を選んで日付をタップできます。',
    dayHint:'日付をタップすると、その日の人物を確認できます。', personList:'人物一覧',
    search:'検索', searchPlaceholder:'名前・ユーザー名・メモ', category:'カテゴリ', month:'月', all:'すべて',
    birthday:'誕生日', registered:'登録済み', sort:'並び順', sortName:'名前順', sortNext:'次回誕生日順', sortRecent:'最近編集した順',
    birthdayList:'誕生日一覧', birthdayHelp:'今日から次に迎える誕生日が近い順です。',
    settingsTitle:'設定とデータ', language:'表示言語', languageHelp:'言語はこの端末に保存されます。',
    noticeTitle:'大切な日のお知らせ', noticeHelp:'誕生日と通知ONの記念日をアプリを開いた日に表示します。外部Pushではありません。',
    noticeEnabled:'通知をONにする', seven:'7日前', three:'3日前', one:'前日', today:'当日', saveSettings:'設定を保存',
    backupTitle:'バックアップと復元', backupHelp:'人物・画像・通知設定を1つのZIPに保存できます。端末の故障・ブラウザデータ削除に備えて定期的に書き出してください。ZIPは暗号化されません。',
    exportZip:'ZIPを書き出す', importZip:'ZIPから復元', storageTitle:'ストレージ管理',
    storageHelp:'アプリ自身の古いキャッシュだけを清掃できます。人物・画像・設定は消しません。',
    clearCache:'不要なアプリキャッシュを削除', version:'アプリバージョン',
    privacy:'このアプリはログイン・クラウド同期・X APIを使用しません。別端末へ移すときはZIPを使ってください。ブラウザの「サイトデータ削除」ではデータが失われます。',
    personAdd:'人物を追加', personEdit:'人物を編集', required:'必須', displayName:'表示名', series:'作品名・所属',
    birthMonth:'誕生月', birthDay:'誕生日', birthYear:'誕生年（任意）', birthYearPlaceholder:'例: 1998',
    showAge:'年齢を表示', username:'X username（任意）', xUrl:'XプロフィールURL（任意）', avatar:'プロフィール画像',
    avatarHelp:'選択後に位置を調整し、512pxの正方形に圧縮します。', removeAvatar:'現在の画像を削除', memo:'メモ',
    otherAnniversaries:'その他の記念日', relatedUrls:'関連URL', add:'＋ 追加', addAnniversary:'＋ 記念日を追加', deletePerson:'人物を削除', save:'保存する',
    detail:'人物の詳細', edit:'編集する', chooseDay:'誕生日の日付を選ぶ', close:'閉じる',
    noticeDialogHelp:'アプリを開いた日の通知です。Push通知ではありません。', readAll:'すべて既読',
    cropTitle:'画像の位置を調整', cropClose:'トリミングをキャンセル',
    cropHelp:'指やマウスで移動、2本指または下のスライダーで拡大・縮小できます。円の内側がプロフィール画像に表示されます。',
    cropArea:'画像を移動する領域。矢印キーでも調整できます', zoom:'拡大・縮小', cancel:'キャンセル', confirm:'決定',
    previewNew:'切り抜き後のプレビュー', previewCurrent:'現在の画像',
    prevMonth:'前月', nextMonth:'次月', grid:'月間カレンダー',
    day0:'日', day1:'月', day2:'火', day3:'水', day4:'木', day5:'金', day6:'土',
    cat_X_FRIEND:'Xの友だち', cat_REAL_FRIEND:'リアルの友だち', cat_CHARACTER:'キャラクター', cat_PET:'ペット', cat_OTHER:'その他',
    ann_BIRTHDAY:'誕生日', ann_OSHI_START:'推し始めた日', ann_FRIEND_SINCE:'友だちになった日', ann_WORK_RELEASE:'作品公開日', ann_WEDDING_ANNIVERSARY:'結婚記念日', ann_CUSTOM:'記念日',
    todayBirthdays:'今日の誕生日', todaySub:'きょう、お祝いの日', sevenSub:'もうすぐお祝い', monthBirthdays:'今月の誕生日', monthSub:'この月の登録数', nextBirthday:'次の誕生日', noNext:'まだ登録がありません',
    daysToday:'今日', daysTomorrow:'明日', daysUntil:'あと{days}日',
    noUpcoming:'30日以内の誕生日はありません。', noOtherUpcoming:'14日以内のその他の記念日はありません。',
    noPeople:'人物がいません。', selectedHint:'{name}の誕生日にする日付をタップしてください。',
    personSelected:'{name}を選択しました。日付をタップしてください。', railTitle:'{name}の詳細を開く。ドラッグで誕生日を登録',
    peopleCount:'{count}人', peopleShown:'{count}人を表示', noMatches:'条件に合う人物はいません。',
    noBirthdays:'該当する誕生日はありません。', birthdayUnregistered:'誕生日未登録',
    dateMonth:'{year}年{month}月', dateDay:'{month}月{day}日', dateYear:'{year}年', ageApprox:'{age}歳（概算）',
    dayAria:'{month}月{day}日、予定{count}件', dayPeople:'{month}月{day}日の予定',
    emptyDay:'人物の詳細から「誕生日の日付を選ぶ」を押してください。', selectCalendarDay:'カレンダーの日付をタップしてください。',
    birthdaySaved:'{name}の誕生日を{date}に保存しました。',
    yearLabel:'誕生年', xProfile:'Xプロフィール', openX:'Xプロフィールを開く ↗',
    type:'種類', day:'日', year:'年', url:'URL', label:'ラベル', removeAnn:'記念日を削除', removeUrl:'URLを削除',
    bothMonthDay:'誕生日は月と日の両方を指定してください。', personUpdated:'人物を更新しました。', personAdded:'人物を追加しました。',
    noticeToday:'今日は{name}の誕生日です', noticeTomorrow:'明日は{name}の誕生日です', noticeFuture:'{name}の誕生日まであと{days}日です',
    read:'既読', unread:'未読', noNotices:'現在表示する通知はありません。', settingsSaved:'通知設定を保存しました。',
    deleteQuestion:'{name}を削除しますか？画像・記念日・通知も削除されます。', personDeleted:'人物を削除しました。',
    storagePeople:'人物数', storageImages:'画像数', storageImageBytes:'画像の概算', storageCacheBytes:'アプリキャッシュ概算',
    storageTotal:'サイト総使用量（ブラウザ推定）', storageIntegrity:'画像整合性', unavailable:'取得できません',
    integrityOk:'問題なし', integrityBad:'参照切れ{missing}件・孤児{orphan}件',
    imageUnit:'{count}枚', cacheCleared:'{count}件の旧アプリキャッシュを削除しました。利用者データは残っています。',
    backupDone:'ZIPバックアップを書き出しました。安全な場所に保管してください。',
    backupDate:'作成: {date} / 形式v{version}', backupCounts:'人物{people}人・画像{images}枚・通知{notices}件',
    restoreWarning:'復元するとこの端末の現在データを置き換えます。必要なら先に現在のZIPを書き出してください。',
    restoreButton:'内容を確認して復元', restoreConfirm:'現在の端末データをバックアップの内容で置き換えます。先に現在のバックアップを保存しましたか？',
    restorePrompt:'実行するには「復元」と入力してください。', restoreWord:'復元', restoreDone:'復元と画像整合性確認が完了しました。',
    restoreFailed:'復元できません：{message}', dbFailed:'ローカルデータを開けませんでした。ブラウザの保存設定を確認してください。{message}',
    workerFailed:'Service Workerを登録できませんでした。',
  },
  en: {
    skip:'Skip to content', tagline:'A birthday notebook stored on this device', bell:'Open notifications', navigation:'Navigation',
    updateAvailable:'An update is available. Your data will stay on this device.', updateNow:'Update', updateLater:'Later',
    updating:'Updating…', updateWait:'The update is not ready. Please try again later.',
    updateUnsaved:'Your edits are not saved. Update anyway?',
    home:'Home', calendar:'Calendar', people:'People', birthdays:'Birthdays', settings:'Settings',
    heroTitle:'Keep meaningful days close.', heroText:'Your people and anniversaries stay on this device.',
    addPerson:'+ Add person', addShort:'+ Add', upcoming:'Upcoming birthdays', within7:'Within 7 days', within30:'Within 30 days',
    otherUpcoming:'Other upcoming anniversaries', within14:'Within 14 days', calendarTitle:'Birthday & anniversary calendar', thisMonth:'This month',
    eventType:'Event type', anniversary:'Anniversary', anniversaryName:'Anniversary name', anniversaryExample:'e.g. Day we met',
    repeatYearly:'Repeat yearly', onceOnly:'One-time', showAnniversary:'Show years', notifyAnniversary:'Remind me',
    optionalYear:'Year (optional)', onceNeedsYear:'A one-time anniversary needs a year.',
    notifyOn:'Reminders on', notifyOff:'Reminders off', anniversaryYears:'{years} years',
    annNoticeToday:'Today is {name}’s “{title}”', annNoticeTomorrow:'Tomorrow is {name}’s “{title}”',
    annNoticeFuture:'{name}’s “{title}” is in {days} days',
    persons:'People', allPeople:'Everyone', unregistered:'Not set', railHelp:'Drag an avatar on a computer, or select a person and tap a date on your phone.',
    dayHint:'Tap a date to see the people celebrating.', personList:'People',
    search:'Search', searchPlaceholder:'Name, username or note', category:'Category', month:'Month', all:'All',
    birthday:'Birthday', registered:'Registered', sort:'Sort by', sortName:'Name', sortNext:'Next birthday', sortRecent:'Recently edited',
    birthdayList:'Birthdays', birthdayHelp:'Sorted by the next birthday from today.',
    settingsTitle:'Settings & data', language:'Language', languageHelp:'Your choice is saved on this device.',
    noticeTitle:'Important day reminders', noticeHelp:'Birthdays and enabled anniversaries appear when you open the app. These are not push notifications.',
    noticeEnabled:'Enable reminders', seven:'7 days before', three:'3 days before', one:'1 day before', today:'On the day', saveSettings:'Save settings',
    backupTitle:'Backup & restore', backupHelp:'Export people, images and reminder settings as one ZIP. Back up regularly in case your device or browser data is lost. ZIP files are not encrypted.',
    exportZip:'Export ZIP', importZip:'Restore from ZIP', storageTitle:'Storage management',
    storageHelp:'Only old app caches can be removed here. People, images and settings are never deleted.',
    clearCache:'Remove old app caches', version:'App version',
    privacy:'No login, cloud sync or X API is used. Use a ZIP to move data to another device. Clearing browser site data will erase local data.',
    personAdd:'Add person', personEdit:'Edit person', required:'Required', displayName:'Display name', series:'Series / group',
    birthMonth:'Birth month', birthDay:'Birth day', birthYear:'Birth year (optional)', birthYearPlaceholder:'e.g. 1998',
    showAge:'Show age', username:'X username (optional)', xUrl:'X profile URL (optional)', avatar:'Profile image',
    avatarHelp:'Adjust the image before saving a compressed 512px square.', removeAvatar:'Remove current image', memo:'Notes',
    otherAnniversaries:'Other anniversaries', relatedUrls:'Related URLs', add:'+ Add', addAnniversary:'+ Add anniversary', deletePerson:'Delete person', save:'Save',
    detail:'Person details', edit:'Edit', chooseDay:'Choose birthday date', close:'Close',
    noticeDialogHelp:'Reminders shown when you open the app. Not push notifications.', readAll:'Mark all as read',
    cropTitle:'Adjust image', cropClose:'Cancel cropping',
    cropHelp:'Move with a finger or mouse. Pinch with two fingers or use the slider to zoom. The circle shows the profile view.',
    cropArea:'Move image here. Arrow keys also work', zoom:'Zoom', cancel:'Cancel', confirm:'Done',
    previewNew:'Cropped preview', previewCurrent:'Current image',
    prevMonth:'Previous month', nextMonth:'Next month', grid:'Monthly calendar',
    day0:'Sun', day1:'Mon', day2:'Tue', day3:'Wed', day4:'Thu', day5:'Fri', day6:'Sat',
    cat_X_FRIEND:'X friend', cat_REAL_FRIEND:'Real-life friend', cat_CHARACTER:'Character', cat_PET:'Pet', cat_OTHER:'Other',
    ann_BIRTHDAY:'Birthday', ann_OSHI_START:'Started following', ann_FRIEND_SINCE:'Became friends', ann_WORK_RELEASE:'Work release', ann_WEDDING_ANNIVERSARY:'Wedding anniversary', ann_CUSTOM:'Anniversary',
    todayBirthdays:"Today's birthdays", todaySub:'Celebrate today', sevenSub:'Coming soon', monthBirthdays:'Birthdays this month', monthSub:'Registered this month', nextBirthday:'Next birthday', noNext:'None registered yet',
    daysToday:'Today', daysTomorrow:'Tomorrow', daysUntil:'In {days} days',
    noUpcoming:'No birthdays in the next 30 days.', noOtherUpcoming:'No other anniversaries in the next 14 days.',
    noPeople:'No people yet.', selectedHint:'Tap a date for {name}’s birthday.',
    personSelected:'Selected {name}. Tap a date.', railTitle:'Open {name}’s details. Drag to set a birthday',
    peopleCount:'{count} people', peopleShown:'Showing {count} people', noMatches:'No people match these filters.',
    noBirthdays:'No matching birthdays.', birthdayUnregistered:'Birthday not set',
    dateMonth:'{month}/{year}', dateDay:'{month}/{day}', dateYear:'{year}', ageApprox:'About {age} years old',
    dayAria:'{month}/{day}, {count} events', dayPeople:'Events on {month}/{day}',
    emptyDay:'Use “Choose birthday date” in a person’s details.', selectCalendarDay:'Tap a date on the calendar.',
    birthdaySaved:'Saved {name}’s birthday as {date}.',
    yearLabel:'Birth year', xProfile:'X profile', openX:'Open X profile ↗',
    type:'Type', day:'Day', year:'Year', url:'URL', label:'Label', removeAnn:'Remove anniversary', removeUrl:'Remove URL',
    bothMonthDay:'Enter both birth month and day.', personUpdated:'Person updated.', personAdded:'Person added.',
    noticeToday:"Today is {name}’s birthday", noticeTomorrow:"Tomorrow is {name}’s birthday", noticeFuture:"{name}’s birthday is in {days} days",
    read:'Read', unread:'Unread', noNotices:'No reminders right now.', settingsSaved:'Reminder settings saved.',
    deleteQuestion:'Delete {name}? Their image, anniversaries and reminders will also be removed.', personDeleted:'Person deleted.',
    storagePeople:'People', storageImages:'Images', storageImageBytes:'Approx. image size', storageCacheBytes:'Approx. app cache',
    storageTotal:'Total site usage (browser estimate)', storageIntegrity:'Image integrity', unavailable:'Unavailable',
    integrityOk:'No issues', integrityBad:'{missing} missing · {orphan} orphaned',
    imageUnit:'{count} images', cacheCleared:'Removed {count} old app caches. Your data remains.',
    backupDone:'ZIP backup exported. Store it somewhere safe.',
    backupDate:'Created: {date} / format v{version}', backupCounts:'{people} people · {images} images · {notices} reminders',
    restoreWarning:'Restoring will replace the current data on this device. Export a ZIP first if needed.',
    restoreButton:'Review and restore', restoreConfirm:'Replace this device’s data with the backup? Have you saved a current backup?',
    restorePrompt:'Type RESTORE to continue.', restoreWord:'RESTORE', restoreDone:'Restore and image integrity check complete.',
    restoreFailed:'Cannot restore: {message}', dbFailed:'Could not open local data. Check browser storage settings. {message}',
    workerFailed:'Could not register the Service Worker.',
  },
};

let language = 'ja';
export function currentLanguage() { return language; }
export function setLanguage(value) { language = value === 'en' ? 'en' : 'ja'; document.documentElement.lang = language; }
export function t(key, fields = {}) {
  const template = messages[language][key] ?? messages.ja[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(fields[name] ?? ''));
}
export function categoryLabel(key) { return t(`cat_${key}` in messages.ja ? `cat_${key}` : 'cat_OTHER'); }
export function anniversaryLabel(key) { return t(`ann_${key}` in messages.ja ? `ann_${key}` : 'ann_BIRTHDAY'); }
export function monthLabel(month) { return language === 'ja' ? `${month}月` : new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, month - 1, 1))); }
export function dayLabel(day) { return language === 'ja' ? `${day}日` : String(day); }

// 旧データと例外型はそのまま保つ。英語画面で既存の検証エラーだけ翻訳する。
const errorEnglish = {
  '表示名は1〜100文字で入力してください。':'Enter a display name of 1–100 characters.',
  'カテゴリが正しくありません。':'Invalid category.',
  'X usernameの形式が正しくありません。':'Invalid X username.',
  'XプロフィールURLの形式が正しくありません。':'Invalid X profile URL.',
  'XプロフィールURLにはusernameと一致するプロフィールURLを指定してください。':'The X profile URL must match the username.',
  '記念日の種類または日付が正しくありません。':'Invalid anniversary type or date.',
  '記念日のデータが正しくありません。':'Invalid anniversary data.',
  '記念日の名称は1〜100文字で入力してください。':'Enter an anniversary name of 1–100 characters.',
  '繰り返さない記念日には年を入力してください。':'Enter a year for a one-time anniversary.',
  '記念日IDが正しくありません。':'Invalid anniversary ID.',
  '記念日IDが重複しています。':'Duplicate anniversary ID.',
  '記念日の設定が正しくありません。':'Invalid anniversary settings.',
  '通知の記念日参照が正しくありません。':'Invalid anniversary reminder reference.',
  '誕生日は1人につき1件までです。':'Only one birthday is allowed per person.',
  '関連URLまたはラベルが長すぎます。':'Related URL or label is too long.',
  '関連URLの形式が正しくありません。':'Invalid related URL.',
  '関連URLはhttp/httpsのURLを入力してください。':'Use an HTTP or HTTPS related URL.',
  '作品名またはメモが長すぎます。':'Series or notes are too long.',
  '画像は20 MiB以内を選択してください。':'Choose an image under 20 MiB.',
  'JPEG・PNG・WebP・GIF・HEIC画像を選択してください。':'Choose a JPEG, PNG, WebP, GIF or HEIC image.',
  '画像の画素数が上限を超えています。':'Image dimensions exceed the limit.',
  '画像を読み込めませんでした。HEICが開けない場合はJPEGへ変換してください。':'Could not open the image. Convert unsupported HEIC images to JPEG.',
  '画像を2 MiB以内に圧縮できませんでした。':'Could not compress the image below 2 MiB.',
  '画像を処理できませんでした。':'Could not process the image.',
  'トリミング範囲が正しくありません。':'Invalid crop area.',
  '画像の寸法が正しくありません。':'Invalid image dimensions.',
  '画像を読み込めませんでした。':'Could not open the image.',
  '日付の形式が正しくありません。':'Invalid date format.',
  '日付が正しくありません。':'Invalid date.',
  '記念日の日付が正しくありません。':'Invalid anniversary date.',
  '画像の追加と削除は同時に指定できません。':'Cannot add and remove an image at the same time.',
  '編集対象の人物が見つかりません。':'The person could not be found.',
  '削除対象の人物が見つかりません。':'The person could not be found.',
  '通知が見つかりません。':'The reminder could not be found.',
  '保存を完了できませんでした。':'Could not save data.',
  '対応していない言語です。':'Unsupported language.',
  'バックアップの言語設定が正しくありません。':'Invalid backup language setting.',
  '画像の参照不整合があります。バックアップ前に状態を確認してください。':'Image references are inconsistent. Check your data before backing up.',
  'バックアップの容量が上限を超えています。画像を整理してから再試行してください。':'Backup size exceeds the limit. Review your images and try again.',
  'バックアップZIPが上限を超えています。':'Backup ZIP exceeds the size limit.',
  'このバックアップ形式には対応していません。':'This backup format is not supported.',
  'バックアップのデータ構造が正しくありません。':'Invalid backup data structure.',
  '人物IDの形式が正しくありません。':'Invalid person ID in backup.',
  '人物IDが重複しています。':'Duplicate person ID in backup.',
  '画像の参照または形式が正しくありません。':'Invalid image reference or format in backup.',
  '画像ファイル一覧がデータと一致しません。':'Backup image files do not match the data.',
  '画像と人物の参照が一致しません。':'Image and person references do not match.',
  '通知の人物参照が正しくありません。':'Invalid reminder person reference.',
  '通知IDが重複しています。':'Duplicate reminder ID.',
  'バックアップファイルが大きすぎます。':'Backup file is too large.',
  'ZIPファイルを読み込めませんでした。':'Could not read the ZIP file.',
  'ZIPの内容が大きすぎます。':'ZIP contents are too large.',
  'manifestまたはデータがありません。':'Backup manifest or data is missing.',
  'manifestまたはデータJSONが壊れています。':'Backup manifest or data JSON is damaged.',
  '新しい形式または不明な形式のバックアップには対応していません。':'This backup version is not supported.',
  'ZIP内のファイル一覧がmanifestと一致しません。':'ZIP contents do not match the manifest.',
  'ZIPに予期しないファイルがあります。':'Unexpected file in ZIP.',
  'manifestのファイル情報が正しくありません。':'Invalid manifest file metadata.',
  'バックアップファイルのチェックサムが一致しません。':'Backup file checksum does not match.',
  'manifestの件数がデータと一致しません。':'Manifest counts do not match the data.',
  '復元後の整合性確認に失敗しました。':'Data integrity check failed after restore.',
  '別のタブを閉じて、データベース更新を再試行してください。':'Close other tabs and retry the database update.',
};
export function errorText(error) {
  const message = String(error?.message ?? error ?? '');
  return language === 'en' ? errorEnglish[message] ?? message : message;
}

// HTMLの既存構造を変えずに、見出し・ラベル・説明・ariaを同じ辞書から更新する。
const staticText = [
  ['.skip','skip'],['.brand small','tagline'],['.hero h1','heroTitle'],['.hero > p:not(.eyebrow)','heroText'],
  ['#update-message','updateAvailable'],['#update-later','updateLater'],['#update-app','updateNow'],
  ['#home-add','addPerson'],
  ['#view-calendar .page-heading h1','calendarTitle'],['#calendar-today','thisMonth'],
  ['.people-rail h2','persons'],['[data-rail-filter="all"]','allPeople'],['[data-rail-filter="unregistered"]','unregistered'],
  ['.people-rail .help','railHelp'],['#calendar-category-label','category'],
  ['#calendar-event-type-label','eventType'],
  ['#view-people .page-heading h1','personList'],['#people-add','addShort'],
  ['#view-birthdays .page-heading h1','birthdayList'],['#view-birthdays > .help','birthdayHelp'],
  ['#view-settings .page-heading h1','settingsTitle'],
  ['#view-settings .setting-card:nth-child(2) h2','language'],
  ['#view-settings .setting-card:nth-child(2) .help','languageHelp'],
  ['#view-settings .setting-card:nth-child(3) h2','noticeTitle'],
  ['#view-settings .setting-card:nth-child(3) .help','noticeHelp'],
  ['#view-settings .setting-card:nth-child(4) h2','backupTitle'],
  ['#view-settings .setting-card:nth-child(4) .help','backupHelp'],
  ['#view-settings .setting-card:nth-child(5) h2','storageTitle'],
  ['#view-settings .setting-card:nth-child(5) .help','storageHelp'],
  ['#export-backup','exportZip'],['#clear-cache','clearCache'],['.privacy-note','privacy'],
  ['#person-dialog-title','personAdd'],['#person-dialog .required','required'],
  ['#person-form > label:nth-of-type(1)','displayName'],['#person-form > label:nth-of-type(2)','category'],
  ['#person-form > label:nth-of-type(3)','series'],['#person-form .form-row:nth-of-type(1) label:nth-child(1)','birthMonth'],
  ['#person-form .form-row:nth-of-type(1) label:nth-child(2)','birthDay'],
  ['#person-form .form-row:nth-of-type(2) label:nth-child(1)','birthYear'],
  ['#person-form .form-row:nth-of-type(2) label:nth-child(2)','showAge'],
  ['#person-form > label:nth-of-type(4)','username'],['#person-form > label:nth-of-type(5)','xUrl'],
  ['#person-form > label:nth-of-type(6)','avatar'],['#person-image + small','avatarHelp'],
  ['#remove-image-wrap','removeAvatar'],['#person-form > label:nth-of-type(8)','memo'],
  ['#add-anniversary','addAnniversary'],['#add-link','add'],['#delete-person','deletePerson'],
  ['#person-form button[type=submit]','save'],['#detail-dialog h2','detail'],['#detail-edit','edit'],
  ['#detail-choose','chooseDay'],['#notification-dialog h2','noticeTitle'],
  ['#notification-dialog .help','noticeDialogHelp'],['#read-all','readAll'],
  ['#crop-title','cropTitle'],['#avatar-crop-dialog .help','cropHelp'],['.crop-zoom','zoom'],
  ['#crop-cancel','cancel'],['#crop-confirm','confirm'],
];
const staticAttributes = [
  ['#bell','aria-label','bell'],['#month-prev','aria-label','prevMonth'],['#month-next','aria-label','nextMonth'],
  ['#calendar-grid','aria-label','grid'],['.bottom-nav','aria-label','navigation'],
  ['#language-choice','aria-label','language'],
  ['#people-search','placeholder','searchPlaceholder'],['#person-birth-year','placeholder','birthYearPlaceholder'],
  ['#crop-close','aria-label','cropClose'],['#crop-viewport','aria-label','cropArea'],
];

export function applyStaticTranslations() {
  for (const [selector, key] of staticText) {
    const node = document.querySelector(selector); if (!node) continue;
    if (node.children.length) {
      const ownText = [...node.childNodes].find((child) => child.nodeType === 3 && child.textContent.trim());
      if (ownText) ownText.textContent = `${t(key)} `;
    } else node.textContent = t(key);
  }
  const homeHeadings = document.querySelectorAll('#view-home .section-heading');
  homeHeadings[0].querySelector('h2').textContent = t('upcoming');
  homeHeadings[0].querySelector('span').textContent = t('within30');
  homeHeadings[1].querySelector('h2').textContent = t('otherUpcoming');
  homeHeadings[1].querySelector('span').textContent = t('within14');
  const formHeadings = document.querySelectorAll('#person-form .section-heading h3');
  formHeadings[0].textContent = t('otherAnniversaries');
  formHeadings[1].textContent = t('relatedUrls');
  for (const [selector, attribute, key] of staticAttributes) {
    document.querySelector(selector)?.setAttribute(attribute, t(key));
  }
  for (const [selector, key] of [
    ['#view-people .filters label:nth-child(1)','search'],['#view-people .filters label:nth-child(2)','category'],
    ['#view-people .filters label:nth-child(3)','month'],['#view-people .filters label:nth-child(4)','birthday'],
    ['#view-people .filters label:nth-child(5)','sort'],
    ['#view-birthdays .filters label:nth-child(1)','month'],['#view-birthdays .filters label:nth-child(2)','category'],
  ]) {
    const node = document.querySelector(selector)?.firstChild;
    if (node?.nodeType === 3) node.textContent = t(key);
  }
  for (const [selector, key] of [
    ['#notification-settings label:nth-of-type(1)','noticeEnabled'],
    ['#notification-settings .check-grid label:nth-child(1)','seven'],
    ['#notification-settings .check-grid label:nth-child(2)','three'],
    ['#notification-settings .check-grid label:nth-child(3)','one'],
    ['#notification-settings .check-grid label:nth-child(4)','today'],
    ['.file-button','importZip'],
  ]) {
    const node = document.querySelector(selector); const textNode = [...(node?.childNodes ?? [])].find((child) => child.nodeType === 3 && child.textContent.trim());
    if (textNode) textNode.textContent = t(key);
  }
  document.querySelector('#notification-settings button[type=submit]').textContent = t('saveSettings');
  for (const [selector, entries] of [
    ['#people-category, #birthday-category, #calendar-category', [['ALL','all']]],
    ['#calendar-event-type', [['ALL','all'],['BIRTHDAY','birthday'],['ANNIVERSARY','anniversary']]],
    ['#people-month, #birthday-month', [['0','all']]],
    ['#people-birthday', [['all','allPeople'],['unregistered','unregistered'],['registered','registered']]],
    ['#people-sort', [['name','sortName'],['next','sortNext'],['recent','sortRecent']]],
    ['#person-birth-month, #person-birth-day', [['','unregistered']]],
  ]) for (const element of document.querySelectorAll(selector)) for (const [value,key] of entries) {
    const option = [...element.options].find((item) => item.value === value); if (option) option.textContent = t(key);
  }
  for (const [index, key] of ['home','calendar','people','birthdays','settings'].entries()) {
    const button = document.querySelectorAll('[data-tab]')[index];
    const label = [...button.childNodes].find((child) => child.nodeType === 3 && child.textContent.trim());
    if (label) label.textContent = t(key);
  }
  document.querySelectorAll('[data-close]').forEach((button) => button.setAttribute('aria-label', t('close')));
  document.querySelector('#view-settings #app-version-label').textContent = t('version');
  for (const [key] of Object.entries(CATEGORIES)) document.querySelectorAll(`option[value="${key}"]`).forEach((option) => { option.textContent = categoryLabel(key); });
  for (const [key] of Object.entries(ANNIVERSARY_TYPES)) document.querySelectorAll(`.ann-type option[value="${key}"]`).forEach((option) => { option.textContent = anniversaryLabel(key); });
  document.querySelectorAll('#people-month option, #birthday-month option, #person-birth-month option')
    .forEach((option) => { if (Number(option.value)) option.textContent = monthLabel(Number(option.value)); });
  document.querySelectorAll('#person-birth-day option').forEach((option) => { if (Number(option.value)) option.textContent = dayLabel(Number(option.value)); });
}
