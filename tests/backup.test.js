import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';
import { openDatabase, all, savePerson, get, storageSummary, saveLanguage, loadLanguage } from '../src/db.js';
import { createBackup, inspectBackup, restoreBackup, migrateBackupData } from '../src/backup.js';

const fresh = () => openDatabase(`backup-${crypto.randomUUID()}`);
const fixture = { displayName: '保存さん', category: 'PET', memo: '大切なメモ',
  anniversaries: [{ type: 'BIRTHDAY', month: 2, day: 29, year: null, showAge: false }],
  links: [{ url: 'https://example.com/', label: '公式' }] };

async function repackData(files, data) {
  files['data.json'] = strToU8(JSON.stringify(data));
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  const hash = await crypto.subtle.digest('SHA-256', files['data.json']);
  manifest.entries['data.json'] = { bytes:files['data.json'].length,
    sha256:[...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('') };
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  return new Blob([zipSync(files)]);
}

test('ZIPへ画像と人物を保存し、変更後の復元で元の内容へ戻る', async () => {
  const db = await fresh();
  const saved = await savePerson(db, fixture, { image: new Blob(['image-data'], { type: 'image/webp' }) });
  const backup = await createBackup(db); const prepared = await inspectBackup(backup);
  assert.equal(prepared.summary.people, 1); assert.equal(prepared.summary.images, 1);
  assert.equal(prepared.manifest.formatVersion, 1);
  await savePerson(db, { ...saved, displayName: '変更後' });
  assert.equal((await get(db, 'people', saved.id)).displayName, '変更後');
  await restoreBackup(db, prepared);
  assert.equal((await get(db, 'people', saved.id)).displayName, '保存さん');
  assert.equal((await get(db, 'people', saved.id)).memo, '大切なメモ');
  assert.equal((await get(db, 'images', saved.id)).blob.size, 10);
  assert.deepEqual((await storageSummary(db)).orphan, []);
  db.close();
});

test('破損ZIP・不正内容・未来形式を復元前に拒否し現データを保持', async () => {
  const db = await fresh(); await savePerson(db, fixture);
  await assert.rejects(inspectBackup(new Blob(['not a zip'])));
  const zip = await createBackup(db); const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  manifest.formatVersion = 99;
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  await assert.rejects(inspectBackup(new Blob([zipSync(files)])), /対応していません/);
  const original = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  original['data.json'] = strToU8('{bad json');
  await assert.rejects(inspectBackup(new Blob([zipSync(original)])));
  assert.equal((await all(db, 'people')).length, 1); db.close();
});

test('旧format v0のbirthdayをanniversariesへ移行', () => {
  const data = migrateBackupData(0, { people: [{ id: crypto.randomUUID(), displayName: '旧',
    birthday: { month: 8, day: 27 } }] });
  assert.deepEqual(data.people[0].anniversaries[0],
    { type: 'BIRTHDAY', month: 8, day: 27, year: null, showAge: false });
  assert.equal(data.settings.enabled, true);
});

test('旧v0 ZIPを検証してから人物・誕生日を復元できる', async () => {
  const db = await fresh(); await savePerson(db, fixture);
  const files = unzipSync(new Uint8Array(await (await createBackup(db)).arrayBuffer()));
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  const data = JSON.parse(strFromU8(files['data.json']));
  const birthday = data.people[0].anniversaries.find((item) => item.type === 'BIRTHDAY');
  data.people[0].birthday = { month: birthday.month, day: birthday.day };
  delete data.people[0].anniversaries;
  files['data.json'] = strToU8(JSON.stringify(data));
  const hash = await crypto.subtle.digest('SHA-256', files['data.json']);
  manifest.formatVersion = 0;
  manifest.entries['data.json'] = { bytes: files['data.json'].length,
    sha256: [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('') };
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  const prepared = await inspectBackup(new Blob([zipSync(files)]));
  assert.equal(prepared.snapshot.people[0].anniversaries[0].day, 29);
  await restoreBackup(db, prepared);
  assert.equal((await all(db, 'people'))[0].anniversaries[0].month, 2);
  db.close();
});

test('新ZIPは言語を保持し、旧v1 ZIPに言語がなくても日本語で復元する', async () => {
  const db = await fresh(); await savePerson(db, fixture); await saveLanguage(db, 'en');
  const zip = await createBackup(db); const current = await inspectBackup(zip);
  assert.equal(current.snapshot.language, 'en');
  await saveLanguage(db, 'ja'); await restoreBackup(db, current);
  assert.equal(await loadLanguage(db), 'en');
  const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  const data = JSON.parse(strFromU8(files['data.json'])); delete data.language;
  files['data.json'] = strToU8(JSON.stringify(data));
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  const hash = await crypto.subtle.digest('SHA-256', files['data.json']);
  manifest.entries['data.json'] = { bytes:files['data.json'].length,
    sha256:[...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('') };
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  const oldV1 = await inspectBackup(new Blob([zipSync(files)]));
  assert.equal(oldV1.snapshot.language, 'ja');
  await restoreBackup(db, oldV1); assert.equal(await loadLanguage(db), 'ja');
  db.close();
});

test('新ZIP v1は複数の記念日・通知・画像を完全復元する', async () => {
  const db = await fresh();
  const person = await savePerson(db, { ...fixture, anniversaries:[...fixture.anniversaries,
    { type:'CUSTOM', title:'出会った日', month:5, day:10, year:2024,
      recurring:true, showAnniversary:true, notify:true },
    { type:'CUSTOM', title:'年なし', month:8, day:15, notify:false },
  ] }, { image:new Blob(['avatar'], { type:'image/webp' }) });
  const { synchronizeNotifications } = await import('../src/notifications.js');
  await synchronizeNotifications(db, '2027-05-03');
  const prepared = await inspectBackup(await createBackup(db));
  assert.equal(prepared.manifest.formatVersion, 1);
  assert.equal(prepared.snapshot.people[0].anniversaries.length, 3);
  assert.equal(prepared.snapshot.notifications.length, 1);
  await savePerson(db, { ...person, anniversaries:fixture.anniversaries });
  await restoreBackup(db, prepared);
  assert.equal((await get(db, 'people', person.id)).anniversaries[1].title, '出会った日');
  assert.equal((await all(db, 'notifications')).length, 1);
  assert.equal((await get(db, 'images', person.id)).blob.size, 6);
  db.close();
});

test('旧ZIP v1の固定記念日はIDを補い、不正な新記念日は書込み前に拒否する', async () => {
  const db = await fresh(); const person = await savePerson(db, fixture);
  const files = unzipSync(new Uint8Array(await (await createBackup(db)).arrayBuffer()));
  const data = JSON.parse(strFromU8(files['data.json']));
  data.people[0].anniversaries.push({ type:'FRIEND_SINCE', month:5, day:10, year:2024, showAge:false });
  const old = await inspectBackup(await repackData(files, data));
  assert.match(old.snapshot.people[0].anniversaries[1].id, /^[0-9a-f-]{36}$/i);
  assert.equal(old.snapshot.people[0].anniversaries[1].notify, false);
  await restoreBackup(db, old);
  assert.equal((await get(db, 'people', person.id)).anniversaries.length, 2);
  data.people[0].anniversaries[1] = { type:'CUSTOM', title:'', month:5, day:10 };
  await assert.rejects(inspectBackup(await repackData(files, data)), /名称/);
  assert.equal((await get(db, 'people', person.id)).anniversaries[1].type, 'FRIEND_SINCE');
  db.close();
});

test('旧ZIPに記念日配列がない人物は0件として復元する', async () => {
  const db = await fresh(); const saved = await savePerson(db, { displayName:'記念日なし', anniversaries:[] });
  const files = unzipSync(new Uint8Array(await (await createBackup(db)).arrayBuffer()));
  const data = JSON.parse(strFromU8(files['data.json']));
  delete data.people[0].anniversaries;
  const prepared = await inspectBackup(await repackData(files, data));
  assert.deepEqual(prepared.snapshot.people[0].anniversaries, []);
  await restoreBackup(db, prepared);
  assert.deepEqual((await get(db, 'people', saved.id)).anniversaries, []);
  db.close();
});
