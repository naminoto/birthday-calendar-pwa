import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../src/version.js';
import {RELEASE_HISTORY} from '../src/release-history.js';

const CONFIRMED_RELEASES = [
  ['1.4.3','2026-11-04'],
  ['1.4.2','2026-10-22'],
  ['1.4.1','2026-10-20'],
  ['1.4.0','2026-10-20'],
  ['1.3.3','2026-10-15'],
  ['1.3.2','2026-10-15'],
  ['1.3.1','2026-10-15'],
  ['1.3.0','2026-10-09'],
  ['1.2.1','2026-09-26'],
  ['1.2.0','2026-09-26'],
];

test('更新履歴は現在版と確認済み正式版を最新順で掲載し現在Versionと一致する',()=>{
  assert.deepEqual(RELEASE_HISTORY.map(({version,date})=>[version,date]),CONFIRMED_RELEASES);
  assert.equal(RELEASE_HISTORY[0].version,APP_VERSION);
  assert.equal(new Set(RELEASE_HISTORY.map(item=>item.version)).size,RELEASE_HISTORY.length);
  assert.equal(RELEASE_HISTORY.every(item=>item.date!==null),true);
  for(let index=1;index<RELEASE_HISTORY.length;index++){
    const previous=RELEASE_HISTORY[index-1].version.split('.').map(Number);
    const current=RELEASE_HISTORY[index].version.split('.').map(Number);
    assert.ok(previous[0]>current[0]||previous[0]===current[0]&&(
      previous[1]>current[1]||previous[1]===current[1]&&previous[2]>current[2]));
  }
});

test('各履歴は分類済みの日英テキストを持つ',()=>{
  const allowed=new Set(['new','improvement','fix','security']);
  for(const release of RELEASE_HISTORY){
    if(release.date!==null)assert.match(release.date,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(release.changes.length>0);
    for(const change of release.changes){
      assert.ok(allowed.has(change.category));
      assert.ok(change.ja.trim().length>0);
      assert.ok(change.en.trim().length>0);
    }
  }
});

test('v1.4.3は実際の正式公開日を記録し、将来の未確定日表示も維持する',()=>{
  assert.equal(RELEASE_HISTORY[0].date,'2026-11-04');
  const ui=readFileSync(new URL('../src/release-history-ui.js',import.meta.url),'utf8');
  const i18n=readFileSync(new URL('../src/i18n.js',import.meta.url),'utf8');
  assert.match(ui,/releaseDatePending/);
  assert.match(i18n,/releaseDatePending:'公開日未定'/);
  assert.match(i18n,/releaseDatePending:'Release date pending'/);
});

test('更新履歴は設定内の同梱UIであり外部取得を必要としない',()=>{
  const settings=readFileSync(new URL('../src/settings-ui.js',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../src/release-history-ui.js',import.meta.url),'utf8');
  assert.match(settings,/setupReleaseHistory\(t\)/);
  assert.match(ui,/document\.createElement\('details'\)/);
  assert.doesNotMatch(ui,/\bfetch\s*\(|github\.com|api\.github/iu);
});
