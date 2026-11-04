import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('正式版はpackage Version、独立テスト版だけは限定metaの候補Versionを使う',async()=>{
  const original=globalThis.document;
  try{
    delete globalThis.document;
    assert.equal((await import('../src/version.js?production')).APP_VERSION,'1.4.3');
    globalThis.document={querySelector:selector=>selector==='meta[name="yoribi-preview-version"]'
      ?{content:'1.4.3-candidate'}:null};
    assert.equal((await import('../src/version.js?candidate')).APP_VERSION,'1.4.3-candidate');
    globalThis.document={querySelector:()=>({content:'1.4.3'})};
    assert.equal((await import('../src/version.js?invalid')).APP_VERSION,'1.4.3');
  }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test('候補タイトルmetaは言語切替後も維持し正式版は従来タイトルへ戻る',()=>{
  const source=readFileSync(new URL('../src/i18n.js',import.meta.url),'utf8');
  assert.match(source,/meta\[name="yoribi-preview-title"\].*\|\|t\('appTitle'\)/);
});
