import test from 'node:test';
import assert from 'node:assert/strict';
import { compressAvatar } from '../src/images.js';

test('画像デコードのSafari向け代替経路でも512pxへ縮小し、一時URLを解放する', async () => {
  const originals = {
    createImageBitmap: globalThis.createImageBitmap, Image: globalThis.Image,
    document: globalThis.document, createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
  };
  const revoked = [];
  try {
    globalThis.createImageBitmap = async () => { throw new Error('unsupported'); };
    URL.createObjectURL = () => 'blob:test-image';
    URL.revokeObjectURL = (url) => revoked.push(url);
    globalThis.Image = class {
      naturalWidth = 1024;
      naturalHeight = 768;
      set src(_value) { queueMicrotask(() => this.onload()); }
    };
    const canvas = { width: 0, height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (done) => done(new Blob(['small'], { type: 'image/webp' })),
    };
    globalThis.document = { createElement: (tag) => tag === 'canvas' ? canvas : null };
    const result = await compressAvatar(new Blob(['image'], { type: 'image/png' }));
    assert.equal(result.type, 'image/webp');
    assert.equal(canvas.width, 512);
    assert.equal(canvas.height, 384);
    assert.deepEqual(revoked, ['blob:test-image']);
  } finally {
    globalThis.createImageBitmap = originals.createImageBitmap;
    globalThis.Image = originals.Image;
    globalThis.document = originals.document;
    URL.createObjectURL = originals.createObjectURL;
    URL.revokeObjectURL = originals.revokeObjectURL;
  }
});

test('保存上限を超える画像はIndexedDB登録前に拒否する', async () => {
  const originals = { createImageBitmap: globalThis.createImageBitmap, document: globalThis.document };
  let closed = false;
  try {
    globalThis.createImageBitmap = async () => ({ width: 512, height: 512, close: () => { closed = true; } });
    globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage: () => {} }),
      toBlob: (done) => done(new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: 'image/webp' })) }) };
    await assert.rejects(compressAvatar(new Blob(['image'], { type: 'image/png' })), /2 MiB/);
    assert.equal(closed, true);
  } finally {
    globalThis.createImageBitmap = originals.createImageBitmap;
    globalThis.document = originals.document;
  }
});
