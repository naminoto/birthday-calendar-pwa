import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {iosStorageContext,IOS_GUIDANCE_KEY} from '../src/ios-storage-guidance.js';
import {setLanguage,t} from '../src/i18n.js';

const safari='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1';

test('iPhoneブラウザ・ホーム画面・LINEとAndroid/PCを区別する',()=>{
  assert.deepEqual(iosStorageContext({userAgent:safari,standalone:false,displayStandalone:false}),{ios:true,mode:'browser'});
  assert.deepEqual(iosStorageContext({userAgent:safari,standalone:true,displayStandalone:false}),{ios:true,mode:'standalone'});
  assert.deepEqual(iosStorageContext({userAgent:`${safari} Line/15.0`,standalone:false,displayStandalone:false}),{ios:true,mode:'in-app'});
  assert.deepEqual(iosStorageContext({userAgent:'Mozilla/5.0 (Linux; Android 15) Chrome/140 Mobile Safari/537.36'}),{ios:false,mode:'other'});
  assert.deepEqual(iosStorageContext({userAgent:'Mozilla/5.0 (Windows NT 10.0) Chrome/140 Safari/537.36'}),{ios:false,mode:'other'});
  assert.deepEqual(iosStorageContext({userAgent:'Mozilla/5.0 (Macintosh) Safari/605',platform:'MacIntel',maxTouchPoints:5,displayStandalone:false}),{ios:true,mode:'browser'});
});

test('案内は日英で自動同期なし・完全置換・現行と旧形式を正確に説明する',()=>{
  const previous=globalThis.document;globalThis.document={documentElement:{}};
  try{
    setLanguage('ja');assert.match(t('iosStorageGuideIntro'),/保存領域が別/);assert.match(t('iosStorageReplaceWarning'),/完全置換/);assert.match(t('iosStorageFormat'),/\.yoribi/);assert.match(t('iosStorageFormat'),/v1\.4\.2のZIP/);
    setLanguage('en');assert.match(t('iosStorageGuideIntro'),/separate storage/);assert.match(t('iosStorageReplaceWarning'),/complete replacement/);assert.match(t('iosStorageExistingText'),/not automatic sync/);
  }finally{setLanguage('ja');globalThis.document=previous;}
});

test('manifest・Service Worker・IndexedDBの互換境界を変えず、案内は別領域アクセスを試みない',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url)));
  assert.deepEqual({start_url:manifest.start_url,scope:manifest.scope,display:manifest.display},{start_url:'./',scope:'./',display:'standalone'});
  const db=readFileSync(new URL('../src/db.js',import.meta.url),'utf8');assert.match(db,/DB_NAME\s*=\s*'birthday-circle-local'/);assert.match(db,/DB_VERSION\s*=\s*3/);
  const worker=readFileSync(new URL('../src/sw-template.js',import.meta.url),'utf8');assert.doesNotMatch(worker,/indexedDB|deleteDatabase/);
  const guide=readFileSync(new URL('../src/ios-storage-guidance.js',import.meta.url),'utf8');assert.doesNotMatch(guide,/indexedDB|fetch\(|XMLHttpRequest/);assert.match(IOS_GUIDANCE_KEY,/birthday-circle/);
});
