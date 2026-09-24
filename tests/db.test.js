import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, all, get, savePerson, deletePerson, storageSummary, saveSettings,
  loadSettings, markAllRead, markNotificationRead } from '../src/db.js';
import { reconcileNotifications } from '../src/notifications.js';

const fresh = () => openDatabase(`test-${crypto.randomUUID()}`);
const person = (name, month = 8, day = 27) => ({ displayName: name, category: 'X_FRIEND',
  anniversaries: [{ type: 'BIRTHDAY', month, day, year: null, showAge: false }], links: [] });

test('人物CRUDと画像の置換・削除が孤児を残さない', async () => {
  const db = await fresh();
  const one = await savePerson(db, person('山田'), { image: new Blob(['first'], { type: 'image/jpeg' }) });
  assert.equal((await storageSummary(db)).images, 1);
  assert.equal((await get(db, 'images', one.id)).blob.size, 5);
  await savePerson(db, { ...one, displayName: '山田さん' },
    { image: new Blob(['new'], { type: 'image/webp' }) });
  assert.equal((await get(db, 'images', one.id)).blob.size, 3);
  assert.equal((await all(db, 'people'))[0].displayName, '山田さん');
  assert.deepEqual((await storageSummary(db)).orphan, []);
  await savePerson(db, { ...(await get(db, 'people', one.id)) }, { removeImage: true });
  assert.equal((await storageSummary(db)).images, 0);
  await deletePerson(db, one.id);
  assert.equal((await storageSummary(db)).people, 0);
  db.close();
});

test('IndexedDB v1からv2へ人物を保ったまま通知storeを追加', async () => {
  const name = `migration-${crypto.randomUUID()}`;
  const v1 = await openDatabase(name, 1);
  const old = await savePersonV1(v1, { id: crypto.randomUUID(), displayName: '移行対象' });
  v1.close();
  const v2 = await openDatabase(name, 2);
  assert.equal((await get(v2, 'people', old.id)).displayName, '移行対象');
  assert.deepEqual(await all(v2, 'notifications'), []);
  v2.close();
});
async function savePersonV1(db, value) {
  await new Promise((resolve, reject) => { const tx = db.transaction('people', 'readwrite');
    tx.objectStore('people').put(value); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  return value;
}

test('通知は7/3/1/0日前に1件ずつ、重複せず、既読を保持', async () => {
  const db = await fresh();
  const item = await savePerson(db, person('通知さん', 1, 1));
  const settings = await loadSettings(db);
  let notices = reconcileNotifications([item], [], settings, '2026-12-25');
  assert.equal(notices.length, 1);
  assert.equal(reconcileNotifications([item], notices, settings, '2026-12-25').length, 1);
  for (const [date, count] of [['2026-12-29', 2], ['2026-12-31', 3], ['2027-01-01', 4]]) {
    notices = reconcileNotifications([item], notices, settings, date); assert.equal(notices.length, count);
  }
  assert.equal(reconcileNotifications([item], [], settings, '2026-12-26').length, 0);
  await saveSettings(db, { ...settings, enabled: false });
  assert.equal(reconcileNotifications([item], notices, await loadSettings(db), '2027-01-01').length, 0);
  assert.equal(reconcileNotifications([item], [], { ...settings, seven: false }, '2026-12-25').length, 0);
  db.close();
});

test('通知の既読・全既読、誕生日変更・人物削除で古い通知を除去', async () => {
  const db = await fresh();
  const item = await savePerson(db, person('通知さん', 8, 27));
  const { synchronizeNotifications } = await import('../src/notifications.js');
  let state = await synchronizeNotifications(db, '2026-08-20'); assert.equal(state.unread, 1);
  await markNotificationRead(db, state.notifications[0].id); state = await synchronizeNotifications(db, '2026-08-20');
  assert.equal(state.unread, 0);
  await markAllRead(db); assert.equal((await all(db, 'notifications'))[0].readAt != null, true);
  const changed = { ...item, anniversaries: [{ ...item.anniversaries[0], day: 29 }] };
  await savePerson(db, changed); assert.equal((await all(db, 'notifications')).length, 0);
  await synchronizeNotifications(db, '2026-08-22'); assert.equal((await all(db, 'notifications')).length, 1);
  await deletePerson(db, item.id); assert.equal((await all(db, 'notifications')).length, 0);
  db.close();
});

test('キャッシュ操作とIndexedDBは別物', async () => {
  const db = await fresh(); await savePerson(db, person('残る人'));
  const { obsoleteCacheNames } = await import('../src/cache-ops.js');
  const old = 'birthday-circle-shell-%2Frepo%2F-aaaaaaaaaaaaaaaa';
  const current = 'birthday-circle-shell-%2Frepo%2F-bbbbbbbbbbbbbbbb';
  const sibling = 'birthday-circle-shell-%2Fother%2F-cccccccccccccccc';
  assert.deepEqual(obsoleteCacheNames([old, current, sibling, 'other-app'], current), [old]);
  assert.equal((await all(db, 'people')).length, 1); db.close();
});
