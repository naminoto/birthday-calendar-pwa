import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAvatarCountToast, createAvatarSelectionGuard } from '../src/avatar-editor.js';
import { setLanguage, t } from '../src/i18n.js';

const files = (...items) => Object.assign([...items], { item: (index) => items[index] ?? null });

test('写真選択から0枚へ戻すと古い読込世代を無効化する', () => {
  const guard = createAvatarSelectionGuard();
  const old = guard.begin(files({ name: 'old.jpg' }));
  const empty = guard.begin(files());
  assert.equal(empty.file, null);
  assert.equal(guard.isCurrent(old.token), false);
  assert.equal(guard.isCurrent(empty.token), true);
});

test('写真ピッカーのcancelは進行中の非同期読込を無効化する', () => {
  const guard = createAvatarSelectionGuard();
  const loading = guard.begin(files({ name: 'loading.jpg' }));
  guard.invalidate();
  assert.equal(guard.isCurrent(loading.token), false);
});

test('別の写真を選ぶと新しいFileだけが現在の選択になる', () => {
  const guard = createAvatarSelectionGuard();
  const first = guard.begin(files({ name: 'first.jpg' }));
  const secondFile = { name: 'second.jpg' };
  const second = guard.begin(files(secondFile));
  assert.equal(guard.isCurrent(first.token), false);
  assert.equal(guard.isCurrent(second.token), true);
  assert.equal(second.file, secondFile);
});

test('写真を1枚選択した場合だけトリミング対象として受け付ける', () => {
  const guard = createAvatarSelectionGuard();
  const selectedFile = { name: 'selected.jpg' };
  assert.equal(guard.begin(files(selectedFile)).file, selectedFile);
  assert.equal(guard.begin(files()).file, null);
  assert.equal(guard.begin(files({ name: 'one.jpg' }, { name: 'two.jpg' })).file, null);
});

test('multiple入力でも2枚以上は1枚も採用しない', () => {
  const guard = createAvatarSelectionGuard();
  const first = { name: 'first.jpg' };
  assert.equal(guard.begin(files(first)).file, first);
  assert.equal(guard.begin(files(first, { name: 'second.jpg' })).file, null);
  assert.equal(guard.begin(files(first, { name: 'second.jpg' }, { name: 'third.jpg' })).file, null);
});

test('FileListのitem経由でも1枚だけを取得する', () => {
  const guard = createAvatarSelectionGuard();
  const selectedFile = { name: 'iphone.heic' };
  const fileList = { length: 1, item: () => selectedFile };
  assert.equal(guard.begin(fileList).file, selectedFile);
});

test('複数枚拒否の案内を日本語と英語で表示できる', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { documentElement:{} };
  try {
    setLanguage('ja'); assert.equal(t('avatarOneOnly'), 'プロフィール画像は1枚だけ選択してください。');
    setLanguage('en'); assert.equal(t('avatarOneOnly'), 'Please select only one profile image.');
  } finally {
    setLanguage('ja'); globalThis.document = originalDocument;
  }
});

test('複数枚拒否トーストは連続表示でタイマーを更新し自動消去する', () => {
  const node = { hidden:true, textContent:'' }, frames = [], timers = new Map();
  let nextTimer = 0;
  const toast = createAvatarCountToast(node, {
    duration:4200,
    requestFrame:(callback) => frames.push(callback),
    setTimer:(callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimer:(id) => timers.delete(id),
  });
  toast.show('プロフィール画像は1枚だけ選択してください。');
  assert.equal(node.hidden, true); frames.shift()();
  assert.deepEqual(node, { hidden:false, textContent:'プロフィール画像は1枚だけ選択してください。' });
  const firstTimer = timers.get(1); assert.equal(firstTimer.delay, 4200);

  toast.show('プロフィール画像は1枚だけ選択してください。');
  assert.equal(timers.has(1), false); assert.equal(node.hidden, true); frames.shift()();
  firstTimer.callback();
  assert.equal(node.hidden, false, '古いタイマーで再表示した通知を消さない');
  timers.get(2).callback();
  assert.deepEqual(node, { hidden:true, textContent:'' });
});

test('複数枚拒否トーストは上部固定・セーフエリア・支援技術に対応する', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(html, /id="avatar-count-toast"[^>]*role="alert"[^>]*aria-live="assertive"[^>]*aria-atomic="true"[^>]*hidden/);
  assert.match(html, /id="person-error" role="alert" hidden/, '既存の画面内エラーを残す');
  assert.match(css, /#person-dialog\{overflow:visible\}/, 'WebKitで固定トーストをクリップするdialog側のscroll layerを作らない');
  assert.match(css, /\.form-body\{[^}]*overflow-y:auto/, 'フォーム本体だけをスクロール領域として維持する');
  assert.match(css, /\.avatar-count-toast\{[^}]*top:calc\(env\(safe-area-inset-top\) \+ 12px\)[^}]*bottom:auto/);
  assert.match(css, /\.avatar-count-toast\{[^}]*safe-area-inset-left[^}]*safe-area-inset-right[^}]*pointer-events:none/);
});
