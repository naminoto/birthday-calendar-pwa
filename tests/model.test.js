import test from 'node:test';
import assert from 'node:assert/strict';
import { nextOccurrence, daysBetween, birthdayRows, filterPeople, normalizePerson,
  tokyoToday } from '../src/model.js';

const birthday = (month, day) => ({ type: 'BIRTHDAY', month, day, year: null, showAge: false });
const person = (name, month = null, day = null, category = 'OTHER') => normalizePerson({
  displayName: name, category, anniversaries: month ? [birthday(month, day)] : [], links: [],
});

test('年跨ぎと2月29日はSpring版と同じ日付ルール', () => {
  assert.equal(nextOccurrence(birthday(1, 2), '2026-12-31'), '2027-01-02');
  assert.equal(daysBetween('2026-12-31', '2027-01-02'), 2);
  assert.equal(nextOccurrence(birthday(2, 29), '2027-02-27'), '2027-02-28');
  assert.equal(nextOccurrence(birthday(2, 29), '2028-02-27'), '2028-02-29');
  assert.equal(tokyoToday(new Date('2026-12-31T15:30:00Z')), '2027-01-01');
});

test('誕生日一覧は次回日付順で未登録を除外', () => {
  const people = [person('未登録'), person('元日', 1, 1), person('大晦日', 12, 31)];
  const rows = birthdayRows(people, '2026-12-30');
  assert.deepEqual(rows.map((row) => [row.person.displayName, row.daysUntil]), [['大晦日', 1], ['元日', 2]]);
});

test('カテゴリ・月・検索・未登録フィルターを組み合わせる', () => {
  const people = [person('山田さん', 8, 27, 'X_FRIEND'), person('佐藤さん', null, null, 'X_FRIEND'),
    person('ミク', 8, 31, 'CHARACTER')];
  assert.deepEqual(filterPeople(people, { category: 'X_FRIEND', birthday: 'unregistered' })
    .map((p) => p.displayName), ['佐藤さん']);
  assert.deepEqual(filterPeople(people, { category: 'CHARACTER', month: 8, search: 'ミク' })
    .map((p) => p.displayName), ['ミク']);
});

test('不正なX URL・危険なURL・不正日付は拒否', () => {
  assert.throws(() => normalizePerson({ displayName: 'A', xProfileUrl: 'https://evil.example/me' }));
  assert.throws(() => normalizePerson({ displayName: 'A', username: 'one', xProfileUrl: 'https://x.com/two' }));
  assert.throws(() => normalizePerson({ displayName: 'A', links: [{ url: 'javascript:alert(1)' }] }));
  assert.throws(() => normalizePerson({ displayName: 'A', anniversaries: [birthday(4, 31)] }));
  assert.equal(normalizePerson({ displayName: 'A', username: '@neko' }).xProfileUrl, 'https://x.com/neko');
});
