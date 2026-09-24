import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';
import { openDatabase, all, savePerson, get, storageSummary } from '../src/db.js';
import { createBackup, inspectBackup, restoreBackup, migrateBackupData } from '../src/backup.js';

const fresh = () => openDatabase(`backup-${crypto.randomUUID()}`);
const fixture = { displayName: '保存さん', category: 'PET', memo: '大切なメモ',
  anniversaries: [{ type: 'BIRTHDAY', month: 2, day: 29, year: null, showAge: false }],
  links: [{ url: 'https://example.com/', label: '公式' }] };

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
