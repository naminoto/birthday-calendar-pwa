import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { all, loadSettings, replaceAllData, storageSummary } from './db.js';
import { loadLanguage } from './db.js';
import { DEFAULT_SETTINGS, birthdayOf, dateParts, normalizePerson, TIMINGS,
  occurrenceForYear } from './model.js';
import { anniversaryNotificationId, notificationId } from './notifications.js';
import { APP_VERSION } from './version.js';

export const BACKUP_FORMAT_VERSION = 1;
export { APP_VERSION };
const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 160 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sha256(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createBackup(db) {
  const [people, images, notifications, settings, language] = await Promise.all([
    all(db, 'people'), all(db, 'images'), all(db, 'notifications'), loadSettings(db), loadLanguage(db),
  ]);
  const integrity = await storageSummary(db);
  if (integrity.missing.length || integrity.orphan.length) {
    throw new Error('画像の参照不整合があります。バックアップ前に状態を確認してください。');
  }
  const files = {};
  const imageRecords = [];
  for (const image of images) {
    const path = `images/${image.personId}.bin`;
    files[path] = new Uint8Array(await image.blob.arrayBuffer());
    imageRecords.push({ personId: image.personId, path, type: image.type });
  }
  files['data.json'] = strToU8(JSON.stringify({ people, notifications, settings, language, images: imageRecords }));
  if (Object.values(files).reduce((sum, bytes) => sum + bytes.length, 0) > MAX_ARCHIVE_BYTES - 1024 * 1024) {
    throw new Error('バックアップの容量が上限を超えています。画像を整理してから再試行してください。');
  }
  const entries = {};
  for (const [path, bytes] of Object.entries(files)) {
    entries[path] = { bytes: bytes.length, sha256: await sha256(bytes) };
  }
  const manifest = {
    formatVersion: BACKUP_FORMAT_VERSION, appVersion: APP_VERSION,
    createdAt: new Date().toISOString(), counts: { people: people.length, images: images.length,
      notifications: notifications.length }, entries,
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  const zipped = zipSync(files, { level: 0 });
  if (zipped.length > MAX_ARCHIVE_BYTES) throw new Error('バックアップZIPが上限を超えています。');
  return new Blob([zipped], { type: 'application/zip' });
}

// v0は初期ローカル試作形式: birthday:{month,day} を anniversaries[]へ移す。
export function migrateBackupData(version, data) {
  if (version === 1) return data;
  if (version === 0) {
    return {
      ...data,
      people: data.people.map((person) => ({ ...person,
        anniversaries: person.anniversaries ?? (person.birthday
          ? [{ type: 'BIRTHDAY', ...person.birthday, year: null, showAge: false }] : []),
        links: person.links ?? [], hasImage: Boolean(person.hasImage),
      })),
      settings: data.settings ?? { ...DEFAULT_SETTINGS },
      notifications: data.notifications ?? [], images: data.images ?? [],
    };
  }
  throw new Error('このバックアップ形式には対応していません。');
}

function validateData(data, files) {
  if (!Array.isArray(data.people) || !Array.isArray(data.images)
    || !Array.isArray(data.notifications) || !data.settings || typeof data.settings !== 'object') {
    throw new Error('バックアップのデータ構造が正しくありません。');
  }
  const people = data.people.map((record) => {
    if (!UUID.test(record.id)) throw new Error('人物IDの形式が正しくありません。');
    return normalizePerson(record, record, record.updatedAt);
  });
  const personIds = new Set(people.map((person) => person.id));
  if (personIds.size !== people.length) throw new Error('人物IDが重複しています。');
  const images = data.images.map((record) => {
    if (!personIds.has(record.personId) || record.path !== `images/${record.personId}.bin`
      || !['image/jpeg', 'image/webp', 'image/png'].includes(record.type)
      || !files[record.path] || files[record.path].length > 2 * 1024 * 1024) {
      throw new Error('画像の参照または形式が正しくありません。');
    }
    return { personId: record.personId, type: record.type,
      blob: new Blob([files[record.path]], { type: record.type }) };
  });
  const imageIds = new Set(images.map((image) => image.personId));
  const fileImagePaths = Object.keys(files).filter((name) => name.startsWith('images/'));
  if (fileImagePaths.length !== images.length
    || fileImagePaths.some((path) => !data.images.some((image) => image.path === path))) {
    throw new Error('画像ファイル一覧がデータと一致しません。');
  }
  if (imageIds.size !== images.length || people.some((person) => person.hasImage !== imageIds.has(person.id))) {
    throw new Error('画像と人物の参照が一致しません。');
  }
  const personById = new Map(people.map((person) => [person.id, person]));
  const notifications = data.notifications.map((notice) => {
    const person = personById.get(notice.personId);
    const ann = notice.anniversaryId && person?.anniversaries.find((item) => item.id === notice.anniversaryId);
    const expectedId = notice.anniversaryId
      ? anniversaryNotificationId(notice.personId, notice.anniversaryId, notice.birthdayDate, notice.daysBefore)
      : notificationId(notice.personId, notice.birthdayDate, notice.daysBefore);
    if (!person || !TIMINGS.includes(notice.daysBefore) || notice.id !== expectedId
      || (notice.anniversaryId ? !ann || !ann.notify : !birthdayOf(person))) {
      throw new Error('通知の人物参照が正しくありません。');
    }
    const { year } = dateParts(notice.birthdayDate);
    if (notice.anniversaryId && occurrenceForYear(ann, year) !== notice.birthdayDate) {
      throw new Error('通知の記念日参照が正しくありません。');
    }
    return notice;
  });
  if (new Set(notifications.map((notice) => notice.id)).size !== notifications.length) {
    throw new Error('通知IDが重複しています。');
  }
  const settings = Object.fromEntries(Object.keys(DEFAULT_SETTINGS)
    .map((key) => [key, Boolean(data.settings[key])]));
  if (data.language != null && !['ja', 'en'].includes(data.language)) {
    throw new Error('バックアップの言語設定が正しくありません。');
  }
  return { people, images, notifications, settings, language: data.language ?? 'ja' };
}

// 書き込み前にZIP構造・各ハッシュ・参照整合性・形式Versionを全件確認します。
export async function inspectBackup(file) {
  if (!file || file.size > MAX_ARCHIVE_BYTES) throw new Error('バックアップファイルが大きすぎます。');
  let unpackedBytes = 0; let entryCount = 0; let files;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter(info) {
        entryCount += 1;
        unpackedBytes += info.originalSize;
        return entryCount <= 2000 && unpackedBytes <= MAX_UNPACKED_BYTES
          && info.originalSize <= (info.name.startsWith('images/') ? 2 * 1024 * 1024 : 8 * 1024 * 1024);
      },
    });
  } catch { throw new Error('ZIPファイルを読み込めませんでした。'); }
  if (entryCount > 2000 || unpackedBytes > MAX_UNPACKED_BYTES) throw new Error('ZIPの内容が大きすぎます。');
  if (!files['manifest.json'] || !files['data.json']) throw new Error('manifestまたはデータがありません。');
  let manifest; let rawData;
  try {
    manifest = JSON.parse(strFromU8(files['manifest.json']));
    rawData = JSON.parse(strFromU8(files['data.json']));
  } catch { throw new Error('manifestまたはデータJSONが壊れています。'); }
  if (!Number.isInteger(manifest.formatVersion) || manifest.formatVersion < 0
    || manifest.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error('新しい形式または不明な形式のバックアップには対応していません。');
  }
  const expected = Object.keys(manifest.entries ?? {}).sort();
  const actual = Object.keys(files).filter((name) => name !== 'manifest.json').sort();
  if (expected.length !== actual.length || expected.some((name, index) => name !== actual[index])) {
    throw new Error('ZIP内のファイル一覧がmanifestと一致しません。');
  }
  for (const name of expected) {
    if (name !== 'data.json' && !/^images\/[0-9a-f-]{36}\.bin$/i.test(name)) {
      throw new Error('ZIPに予期しないファイルがあります。');
    }
    const info = manifest.entries[name];
    if (!info || !Number.isSafeInteger(info.bytes) || !/^[0-9a-f]{64}$/.test(info.sha256)) {
      throw new Error('manifestのファイル情報が正しくありません。');
    }
    if (files[name].length !== info.bytes || await sha256(files[name]) !== info.sha256) {
      throw new Error('バックアップファイルのチェックサムが一致しません。');
    }
  }
  const snapshot = validateData(migrateBackupData(manifest.formatVersion, rawData), files);
  if (manifest.counts?.people !== snapshot.people.length || manifest.counts?.images !== snapshot.images.length) {
    throw new Error('manifestの件数がデータと一致しません。');
  }
  return { manifest, snapshot, summary: {
    people: snapshot.people.length, images: snapshot.images.length,
    notifications: snapshot.notifications.length,
  } };
}

export async function restoreBackup(db, prepared) {
  await replaceAllData(db, prepared.snapshot);
  const result = await storageSummary(db);
  if (result.missing.length || result.orphan.length
    || result.people !== prepared.summary.people || result.images !== prepared.summary.images) {
    throw new Error('復元後の整合性確認に失敗しました。');
  }
  return result;
}
