import test from 'node:test';
import assert from 'node:assert/strict';
import { compressAvatar, loadAvatarSource, cropAvatar, inspectImageBytes } from '../src/images.js';

function pngBlob(width=1024,height=768,{size=24}={}){
  const bytes=new Uint8Array(Math.max(size,24));bytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  new DataView(bytes.buffer).setUint32(16,width);new DataView(bytes.buffer).setUint32(20,height);
  return new Blob([bytes],{type:'image/png'});
}
function heicBlob(){const bytes=new Uint8Array(32);new DataView(bytes.buffer).setUint32(0,24);bytes.set([...'ftypheicmif1heic'.padEnd(28,'\0')].map(c=>c.charCodeAt(0)),4);return new Blob([bytes],{type:'image/heic'});}

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
    const result = await compressAvatar(pngBlob());
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
    await assert.rejects(compressAvatar(pngBlob(512,512)), /2 MiB/);
    assert.equal(closed, true);
  } finally {
    globalThis.createImageBitmap = originals.createImageBitmap;
    globalThis.document = originals.document;
  }
});

test('iPhone由来HEICはブラウザで読める場合だけ受け付け、一時URLを1回だけ解放する', async () => {
  const originals = { Image: globalThis.Image, createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL };
  const revoked = [];
  try {
    URL.createObjectURL = () => 'blob:heic-test';
    URL.revokeObjectURL = (url) => revoked.push(url);
    globalThis.Image = class {
      naturalWidth = 900;
      naturalHeight = 1200;
      set src(_value) { queueMicrotask(() => this.onload()); }
      decode() { return Promise.resolve(); }
      removeAttribute() {}
    };
    const file = heicBlob();
    const source = await loadAvatarSource(file);
    assert.equal(source.width, 900);
    assert.equal(source.height, 1200);
    source.release(); source.release();
    assert.deepEqual(revoked, ['blob:heic-test']);
  } finally {
    globalThis.Image = originals.Image;
    URL.createObjectURL = originals.createObjectURL;
    URL.revokeObjectURL = originals.revokeObjectURL;
  }
});

test('未対応HEICは既存画像を触らずエラーにし、選択中URLを解放する', async () => {
  const originals = { Image: globalThis.Image, createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL };
  const revoked = [];
  try {
    URL.createObjectURL = () => 'blob:unsupported-heic';
    URL.revokeObjectURL = (url) => revoked.push(url);
    globalThis.Image = class { set src(_value) { queueMicrotask(() => this.onerror(new Event('error'))); } };
    await assert.rejects(loadAvatarSource(heicBlob()), /JPEGへ変換/);
    assert.deepEqual(revoked, ['blob:unsupported-heic']);
  } finally {
    globalThis.Image = originals.Image;
    URL.createObjectURL = originals.createObjectURL;
    URL.revokeObjectURL = originals.revokeObjectURL;
  }
});

test('実バイトから形式・寸法を判定し、拡張子や申告MIMEだけの偽装を拒否する', async()=>{
  assert.deepEqual(inspectImageBytes(new Uint8Array(await pngBlob(8064,6048).arrayBuffer())),
    {type:'image/png',width:8064,height:6048,orientation:1});
  await assert.rejects(loadAvatarSource(new Blob(['not an image'],{type:'image/png'})),/実際に読み込める/);
});

test('48MP級はトリミング用表示へ進めるが64MP超と50MiB超はデコード前に拒否する',async()=>{
  const originals={Image:globalThis.Image,createObjectURL:URL.createObjectURL,revokeObjectURL:URL.revokeObjectURL};let created=0;
  try{
    URL.createObjectURL=()=>{created++;return 'blob:large';};URL.revokeObjectURL=()=>{};
    globalThis.Image=class{naturalWidth=8064;naturalHeight=6048;set src(_v){queueMicrotask(()=>this.onload());}removeAttribute(){}};
    const source=await loadAvatarSource(pngBlob(8064,6048));assert.equal(source.width*source.height,48_771_072);source.release();
    await assert.rejects(loadAvatarSource(pngBlob(12000,6000)),/64メガピクセル/);
    await assert.rejects(loadAvatarSource({size:50*1024*1024+1}),/50 MiB/);
    assert.equal(created,1,'上限違反はObject URL作成・画像デコード前に拒否');
  }finally{globalThis.Image=originals.Image;URL.createObjectURL=originals.createObjectURL;URL.revokeObjectURL=originals.revokeObjectURL;}
});

test('高画素画像の切り抜きは原寸ImageBitmapを作らず512pxへ直接描画する',async()=>{
  const originals={createImageBitmap:globalThis.createImageBitmap,document:globalThis.document};let bitmapCalls=0;const drawn=[];
  try{
    globalThis.createImageBitmap=async()=>{bitmapCalls++;throw new Error('must not decode full bitmap');};
    globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage:(...args)=>drawn.push(args)}),toBlob:done=>done(new Blob(['small'],{type:'image/webp'}))})};
    const image={};const result=await cropAvatar({width:8064,height:6048,file:pngBlob(8064,6048),image},{x:1008,y:0,size:6048});
    assert.equal(bitmapCalls,0);assert.equal(drawn[0][0],image);assert.deepEqual(drawn[0].slice(1),[1008,0,6048,6048,0,0,512,512]);assert.equal(result.size,5);
  }finally{globalThis.createImageBitmap=originals.createImageBitmap;globalThis.document=originals.document;}
});

test('トリミングは正方形512pxに出力し、向きに配慮したbitmapを解放する', async () => {
  const originals = { createImageBitmap: globalThis.createImageBitmap, document: globalThis.document };
  const drawn = []; let closed = false; let orientation;
  try {
    const bitmap = { width: 800, height: 400, close: () => { closed = true; } };
    globalThis.createImageBitmap = async (_file, options) => { orientation = options.imageOrientation; return bitmap; };
    const canvas = { width: 0, height: 0, getContext: () => ({
      drawImage: (...args) => drawn.push(args),
    }), toBlob: (done) => done(new Blob(['cropped'], { type: 'image/webp' })) };
    globalThis.document = { createElement: () => canvas };
    const result = await cropAvatar({ width: 800, height: 400, file: new Blob(['source']), image: {} },
      { x: 200, y: 0, size: 400 });
    assert.equal(result.type, 'image/webp');
    assert.equal(canvas.width, 512);
    assert.equal(canvas.height, 512);
    assert.deepEqual(drawn[0].slice(1), [200, 0, 400, 400, 0, 0, 512, 512]);
    assert.equal(orientation, 'from-image');
    assert.equal(closed, true);
  } finally {
    globalThis.createImageBitmap = originals.createImageBitmap;
    globalThis.document = originals.document;
  }
});
