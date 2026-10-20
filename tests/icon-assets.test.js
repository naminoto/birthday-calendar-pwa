import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('正式アイコンは元PNGを保持し各サイズもPNGで配布する',()=>{
  for(const [path,size]of [['yoribi-icon.png',1254],['public/icons/icon-192.png',192],['public/icons/icon-512.png',512],['public/icons/apple-touch-icon.png',180],['public/icons/icon-maskable-512.png',512],['public/icons/favicon-48.png',48]]){
    const png=readFileSync(new URL('../'+path,import.meta.url));
    assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
    assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
  }
  assert.notDeepEqual(readFileSync(new URL('../public/icons/icon-512.png',import.meta.url)),readFileSync(new URL('../public/icons/icon-maskable-512.png',import.meta.url)));
});
test('リブランドでもmanifestのscope/id/start_urlを維持する',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.name,'Yoribi');assert.equal(manifest.short_name,'Yoribi');
  for(const key of ['id','scope','start_url'])assert.equal(manifest[key],'./');
});
