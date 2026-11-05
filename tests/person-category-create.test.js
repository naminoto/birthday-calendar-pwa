import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const i18n=readFileSync(new URL('../src/i18n.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/yoribi.css',import.meta.url),'utf8');

test('人物フォームに既存フォームを閉じないカテゴリ作成ダイアログがある',()=>{
  assert.match(html,/id="person-category-create"[^>]+aria-controls="person-category-create-dialog"/);
  assert.match(html,/id="person-category-create-dialog"[^>]+aria-labelledby="person-category-create-title"/);
  assert.match(html,/id="person-category-create-name"[^>]+maxlength="40"/);
  assert.match(html,/id="person-category-create-color" type="color"/);
  assert.match(html,/id="person-category-create-confirm" type="submit"/);
  assert.match(html,/id="person-category-create-cancel" type="button"/);
});

test('設定と人物フォームは同じカテゴリ作成処理を使い、作成IDだけを人物フォームへ選択する',()=>{
  assert.match(app,/async function createCategory\(name,color\)[\s\S]*createCustomCategory\(state\.db,name,color\)/);
  assert.match(app,/const created=await createCategory\(\$\('person-category-create-name'\)\.value,\$\('person-category-create-color'\)\.value\)/);
  assert.match(app,/\$\('person-category'\)\.value=created\.id/);
  assert.match(app,/await createCategory\(\$\('category-new-name'\)\.value,\$\('category-new-color'\)\.value\)/);
  assert.doesNotMatch(app,/person-category-create-form[\s\S]{0,600}person-dialog'\)\.close/);
});

test('人物フォーム内カテゴリ作成は日英・小画面・既存テーマ部品に対応する',()=>{
  for(const value of ['新しいカテゴリを作成','作成して選択','Create new category','Create and select'])assert.ok(i18n.includes(value));
  assert.match(css,/\.compact-sheet\s*\{[^}]*width:min\(430px/);
  assert.match(css,/@media \(max-width:600px\)[\s\S]*\.person-category-create\s*\{\s*width:100%/);
});
