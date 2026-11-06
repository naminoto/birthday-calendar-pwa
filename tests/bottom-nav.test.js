import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('下部ナビは装飾インジケーターをtransformで移動する', async () => {
  const [js,css]=await Promise.all([source('src/bottom-nav.js'),source('src/bottom-nav.css')]);
  assert.match(js,/bottom-nav-indicator/);
  assert.match(js,/getBoundingClientRect/);
  assert.match(css,/translate3d\(var\(--nav-indicator-x/);
  assert.match(css,/340ms cubic-bezier\(\.22,1,\.36,1\)/);
  assert.match(css,/pointer-events:none/);
});

test('人物アイコンは主人物と追加人物を分離し弾性変化する', async () => {
  const [icons,css]=await Promise.all([source('src/settings-ui.js'),source('src/bottom-nav.css')]);
  assert.match(icons,/nav-icon-person-primary/);
  assert.match(icons,/nav-icon-person-secondary/);
  assert.match(css,/@keyframes nav-person-secondary/);
  assert.match(css,/600ms both/);
  assert.match(icons,/M6 21v-1\.5a6 6 0 0 1 12 0V21/);
  assert.match(icons,/M16\.6 15\.5a5\.2 5\.2 0 0 1 5\.4 5\.2V21/);
});

test('ホーム・カレンダー・誕生日は選択時に内部パーツが現れる',async()=>{
  const [icons,css]=await Promise.all([source('src/settings-ui.js'),source('src/bottom-nav.css')]);
  for(const marker of ['nav-icon-home-detail','nav-icon-calendar-detail','nav-icon-birthday-flame']){
    assert.match(icons,new RegExp(marker));assert.match(css,new RegExp(marker));
  }
  assert.match(css,/@keyframes nav-home-detail/);assert.match(css,/@keyframes nav-calendar-detail/);
  assert.match(css,/@keyframes nav-birthday-flame/);
});

test('設定歯車は選択時とkeyframes終了時が同じ18度で跳ね戻らない',async()=>{
  const [icons,css]=await Promise.all([source('src/settings-ui.js'),source('src/bottom-nav.css')]);
  assert.match(icons,/nav-icon-gear/);
  assert.match(icons,/M12 2\.5v3M12 18\.5v3M2\.5 12h3M18\.5 12h3/);
  assert.match(css,/transform-box:view-box; transform-origin:12px 12px/);
  assert.match(css,/button\.active\[data-tab=settings\] \.nav-icon-gear \{ transform:rotate\(18deg\); \}/);
  assert.match(css,/@keyframes nav-gear-settle[\s\S]*100% \{ transform:rotate\(18deg\); \}/);
  assert.doesNotMatch(css,/\[data-tab=settings\] \.outline-icon\s*\{\s*animation/);
});

test('初回・同一タブ・reduced motionでは不要な再生をしない', async () => {
  const [js,css]=await Promise.all([source('src/bottom-nav.js'),source('src/bottom-nav.css')]);
  assert.match(js,/currentTab !== null && currentTab !== tab/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/animation:none!important/);
});

test('独立テスト候補はソースVersionからcandidate表記を生成する', async () => {
  const [prepare,audit]=await Promise.all([source('scripts/prepare-iphone-preview.mjs'),source('scripts/audit-iphone-preview.mjs')]);
  assert.match(prepare,/`\$\{sourceVersion\}-candidate`/);
  assert.match(prepare,/Animated bottom navigation indicator/);
  assert.match(audit,/record\.sourceVersion===expectedVersion\.replace\('-candidate',''\)/);
});
