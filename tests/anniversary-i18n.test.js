import test from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage, t, anniversaryLabel } from '../src/i18n.js';

test('記念日UIと通知は日本語・英語を切替でき、入力した名称は翻訳しない', () => {
  const previous = globalThis.document;
  globalThis.document = { documentElement: { lang: 'ja' } };
  try {
    setLanguage('ja');
    assert.equal(t('addAnniversary'), '＋ 記念日を追加');
    assert.equal(t('anniversaryYears', { years: 3 }), '3周年');
    assert.equal(t('annNoticeToday', { name: '太郎', title: '出会った日' }),
      '今日は太郎の「出会った日」です');
    setLanguage('en');
    assert.equal(globalThis.document.documentElement.lang, 'en');
    assert.equal(t('addAnniversary'), '+ Add anniversary');
    assert.equal(t('anniversaryYears', { years: 3 }), '3 years');
    assert.equal(anniversaryLabel('FRIEND_SINCE'), 'Became friends');
    assert.match(t('annNoticeToday', { name: 'Taro', title: '出会った日' }), /出会った日/);
  } finally {
    globalThis.document = previous;
    if (previous) setLanguage('ja');
  }
});
