import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePerson} from '../src/model.js';
import {setLanguage,t} from '../src/i18n.js';

test('XプロフィールURLは保存時にusername空欄だけを補完し手入力不一致を拒否する',()=>{
  const automatic=normalizePerson({displayName:'架空',category:'OTHER',username:'',xProfileUrl:'https://twitter.com/example_user',anniversaries:[],links:[]});
  assert.equal(automatic.username,'example_user');assert.equal(automatic.xProfileUrl,'https://x.com/example_user');
  const matching=normalizePerson({displayName:'架空',category:'OTHER',username:'Example_User',xProfileUrl:'http://www.x.com/example_user',anniversaries:[],links:[]});
  assert.equal(matching.username,'Example_User');assert.equal(matching.xProfileUrl,'https://x.com/example_user');
  assert.throws(()=>normalizePerson({displayName:'架空',category:'OTHER',username:'manual',xProfileUrl:'https://x.com/different',anniversaries:[],links:[]}));
  assert.throws(()=>normalizePerson({displayName:'架空',category:'OTHER',xProfileUrl:'https://x.com/example/status/1',anniversaries:[],links:[]}));
});

test('XプロフィールURLの保存時補完案内は登録・編集共通フォームで日英表示する',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="person-x-url"[^]*?id="person-x-url-help"/);assert.equal((html.match(/id="person-x-url-help"/g)||[]).length,1);
  const old=globalThis.document;globalThis.document={documentElement:{lang:'ja'}};
  try{setLanguage('ja');assert.match(t('xProfileAutoFillHelp'),/保存時.*自動補完/);
    setLanguage('en');assert.match(t('xProfileAutoFillHelp'),/automatically when you save/);}
  finally{setLanguage('ja');globalThis.document=old;}
});

test('カテゴリ名とX案内はtextContentで描画しinnerHTMLを使用しない',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/innerHTML/);assert.match(app,/el\('span','category-row-name',entry\.name\)/);
});
