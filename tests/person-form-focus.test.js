import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('人物の新規・編集フォームは入力欄を自動フォーカスせず見出しへ初期フォーカスする',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(html,/\bautofocus\b/i);
  assert.doesNotMatch(app,/\$\('person-name'\)\.focus/);
  assert.match(app,/\$\('person-dialog-title'\)\.tabIndex\s*=\s*-1/);
  assert.match(app,/\$\('person-dialog-title'\)\.focus\(\{\s*preventScroll:true\s*\}\)/);
  assert.match(app,/\$\('person-form'\)\.scrollTop\s*=\s*0/);
});
