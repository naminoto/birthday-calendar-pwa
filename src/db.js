import { DEFAULT_SETTINGS, birthdayOf, normalizePerson } from './model.js';

export const DB_NAME = 'birthday-circle-local';
export const DB_VERSION = 2;
export const STORES = ['people', 'images', 'settings', 'notifications'];

// version 1: 人物・画像・設定。version 2: 既存行を残したまま通知storeを追加。
export function openDatabase(name = DB_NAME, version = DB_VERSION) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion < 1) {
        db.createObjectStore('people', { keyPath: 'id' });
        db.createObjectStore('images', { keyPath: 'personId' });
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (event.oldVersion < 2 && event.newVersion >= 2) {
        db.createObjectStore('notifications', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('別のタブを閉じて、データベース更新を再試行してください。'));
  });
}

function result(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function completed(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('保存を完了できませんでした。'));
    transaction.onerror = () => reject(transaction.error ?? new Error('保存を完了できませんでした。'));
  });
}

export function all(db, store) {
  return result(db.transaction(store).objectStore(store).getAll());
}

export function get(db, store, key) {
  return result(db.transaction(store).objectStore(store).get(key));
}

export async function loadSettings(db) {
  return (await get(db, 'settings', 'notifications'))?.value ?? { ...DEFAULT_SETTINGS };
}

export async function saveSettings(db, settings) {
  const tx = db.transaction('settings', 'readwrite');
  tx.objectStore('settings').put({ key: 'notifications', value: {
    enabled: Boolean(settings.enabled), seven: Boolean(settings.seven),
    three: Boolean(settings.three), one: Boolean(settings.one), today: Boolean(settings.today),
  } });
  await completed(tx);
}

// 人物・画像・関連通知を1トランザクションで更新し、途中失敗時には全て元のまま残します。
export async function savePerson(db, input, { image = null, removeImage = false } = {}) {
  if (image && removeImage) throw new Error('画像の追加と削除は同時に指定できません。');
  const old = input.id ? await get(db, 'people', input.id) : null;
  if (input.id && !old) throw new Error('編集対象の人物が見つかりません。');
  const person = normalizePerson(input, old);
  person.hasImage = image ? true : removeImage ? false : Boolean(old?.hasImage);
  const oldBirthday = old && birthdayOf(old);
  const newBirthday = birthdayOf(person);
  const changedBirthday = JSON.stringify(oldBirthday ?? null) !== JSON.stringify(newBirthday ?? null);
  const existingNotifications = changedBirthday ? await all(db, 'notifications') : [];
  const tx = db.transaction(['people', 'images', 'notifications'], 'readwrite');
  tx.objectStore('people').put(person);
  if (image) tx.objectStore('images').put({ personId: person.id, blob: image, type: image.type || 'image/jpeg' });
  if (removeImage) tx.objectStore('images').delete(person.id);
  if (changedBirthday) {
    for (const notice of existingNotifications) {
      if (notice.personId === person.id) tx.objectStore('notifications').delete(notice.id);
    }
  }
  await completed(tx);
  return person;
}

export async function deletePerson(db, personId) {
  const existing = await get(db, 'people', personId);
  if (!existing) throw new Error('削除対象の人物が見つかりません。');
  const notices = await all(db, 'notifications');
  const tx = db.transaction(['people', 'images', 'notifications'], 'readwrite');
  tx.objectStore('people').delete(personId);
  tx.objectStore('images').delete(personId);
  for (const notice of notices) {
    if (notice.personId === personId) tx.objectStore('notifications').delete(notice.id);
  }
  await completed(tx);
}

export async function replaceNotifications(db, notices) {
  const tx = db.transaction('notifications', 'readwrite');
  const store = tx.objectStore('notifications');
  store.clear();
  for (const notice of notices) store.put(notice);
  await completed(tx);
}

export async function markNotificationRead(db, id, now = new Date().toISOString()) {
  const notice = await get(db, 'notifications', id);
  if (!notice) throw new Error('通知が見つかりません。');
  const tx = db.transaction('notifications', 'readwrite');
  tx.objectStore('notifications').put({ ...notice, readAt: notice.readAt ?? now });
  await completed(tx);
}

export async function markAllRead(db, now = new Date().toISOString()) {
  const notices = await all(db, 'notifications');
  const tx = db.transaction('notifications', 'readwrite');
  const store = tx.objectStore('notifications');
  for (const notice of notices) if (!notice.readAt) store.put({ ...notice, readAt: now });
  await completed(tx);
}

// 復元時も4 storeを単一transactionに入れ、途中で失敗した場合は旧データへロールバック。
export async function replaceAllData(db, snapshot) {
  const tx = db.transaction(STORES, 'readwrite');
  for (const name of STORES) tx.objectStore(name).clear();
  for (const person of snapshot.people) tx.objectStore('people').put(person);
  for (const image of snapshot.images) tx.objectStore('images').put(image);
  tx.objectStore('settings').put({ key: 'notifications', value: snapshot.settings });
  for (const notice of snapshot.notifications) tx.objectStore('notifications').put(notice);
  await completed(tx);
}

export async function storageSummary(db) {
  const [people, images] = await Promise.all([all(db, 'people'), all(db, 'images')]);
  const referenced = new Set(people.filter((person) => person.hasImage).map((person) => person.id));
  const imageIds = new Set(images.map((image) => image.personId));
  return {
    people: people.length, images: images.length,
    imageBytes: images.reduce((sum, image) => sum + image.blob.size, 0),
    missing: [...referenced].filter((id) => !imageIds.has(id)),
    orphan: [...imageIds].filter((id) => !referenced.has(id)),
  };
}
