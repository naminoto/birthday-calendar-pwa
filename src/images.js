import {crc32} from './zip-reader.js';
const MAX_INPUT_BYTES = 50 * 1024 * 1024;
const MAX_SIDE = 512;
const MAX_SOURCE_PIXELS = 64_000_000;
const MAX_FULL_BITMAP_PIXELS = 16_777_216;
const MAX_SOURCE_SIDE = 12_000;
const MAX_BACKUP_PIXELS = 16_777_216;
const MAX_SAVED_BYTES = 2 * 1024 * 1024;
const HEADER_BYTES = 2 * 1024 * 1024;

const ascii = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
const dimensions = (width, height) => Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
  ? { width, height } : {};

function jpegMetadata(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height, orientation = 1, position = 2;
  while (position + 4 <= bytes.length) {
    if (bytes[position++] !== 0xff) break;
    while (bytes[position] === 0xff) position++;
    const marker = bytes[position++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
    if (position + 2 > bytes.length) break;
    const length = view.getUint16(position); if (length < 2 || position + length > bytes.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 8) {
      height = view.getUint16(position + 3); width = view.getUint16(position + 5);
    }
    if (marker === 0xe1 && length >= 16 && ascii(bytes, position + 2, 6) === 'Exif\0\0') {
      const tiff = position + 8, little = ascii(bytes, tiff, 2) === 'II';
      if (little || ascii(bytes, tiff, 2) === 'MM') {
        const u16 = offset => view.getUint16(offset, little), u32 = offset => view.getUint32(offset, little);
        const ifd = tiff + u32(tiff + 4);
        if (ifd + 2 <= position + length) {
          const count = u16(ifd);
          for (let index = 0; index < count && ifd + 2 + index * 12 + 12 <= position + length; index++) {
            const entry = ifd + 2 + index * 12;
            if (u16(entry) === 0x0112 && u16(entry + 2) === 3 && u32(entry + 4) === 1) {
              const value = u16(entry + 8); if (value >= 1 && value <= 8) orientation = value; break;
            }
          }
        }
      }
    }
    position += length;
  }
  return { type:'image/jpeg', ...dimensions(width, height), orientation };
}

export function inspectImageBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jpeg = jpegMetadata(bytes); if (jpeg) return jpeg;
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)
    && ascii(bytes,12,4)==='IHDR') return { type:'image/png', ...dimensions(view.getUint32(16), view.getUint32(20)), orientation:1 };
  if (bytes.length >= 10 && ['GIF87a','GIF89a'].includes(ascii(bytes,0,6))) {
    return { type:'image/gif', ...dimensions(view.getUint16(6,true), view.getUint16(8,true)), orientation:1 };
  }
  if (bytes.length >= 30 && ascii(bytes,0,4)==='RIFF' && ascii(bytes,8,4)==='WEBP') {
    const chunk=ascii(bytes,12,4);let width,height;
    if(chunk==='VP8 '&&ascii(bytes,23,3)==='\u009d\u0001\u002a'){width=view.getUint16(26,true)&0x3fff;height=view.getUint16(28,true)&0x3fff;}
    else if(chunk==='VP8L'&&bytes[20]===0x2f){const bits=view.getUint32(21,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
    else if(chunk==='VP8X'){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}
    return { type:'image/webp', ...dimensions(width,height), orientation:1 };
  }
  if (bytes.length >= 16 && ascii(bytes,4,4)==='ftyp') {
    const brands=[]; for(let position=8;position+4<=Math.min(bytes.length,64);position+=4)brands.push(ascii(bytes,position,4));
    if(brands.some(brand=>['heic','heix','hevc','hevx','heim','heis','mif1','msf1'].includes(brand))){
      let width,height;
      for(let position=4;position+16<=bytes.length;position++)if(bytes[position]===0x69&&bytes[position+1]===0x73&&bytes[position+2]===0x70&&bytes[position+3]===0x65){
        width=view.getUint32(position+8);height=view.getUint32(position+12);if(width&&height)break;
      }
      return {type:'image/heic',...dimensions(width,height),orientation:1};
    }
  }
  return null;
}

function validateSourceDimensions(width, height) {
  if (!width || !height) throw new Error('画像の寸法を確認できませんでした。');
  if (width > MAX_SOURCE_SIDE || height > MAX_SOURCE_SIDE || width * height > MAX_SOURCE_PIXELS) {
    throw new Error('画像の画素数が安全に処理できる上限（64メガピクセル）を超えています。');
  }
}

function validateBackupDimensions(width, height) {
  if (!width || !height || width * height > MAX_BACKUP_PIXELS) throw new Error('画像の画素数が上限を超えています。');
}

async function inspectInputFile(file) {
  if (!file) throw new Error('画像を選択してください。');
  if (file.size > MAX_INPUT_BYTES) throw new Error('元画像のファイル容量は50 MiB以内にしてください。');
  const bytes = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  const metadata = inspectImageBytes(bytes);
  if (!metadata) throw new Error('実際に読み込めるJPEG・PNG・WebP・GIF・HEIC/HEIF画像を選択してください。');
  if (metadata.width && metadata.height) validateSourceDimensions(metadata.width, metadata.height);
  return metadata;
}

// MIMEに頼らず、デコード前にも宣言寸法を検査して巨大画像を拒否する。
export function backupImageHeader(bytes,type){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const text=(p,n)=>String.fromCharCode(...bytes.subarray(p,p+n));let width,height;
  if(type==='image/png'&&bytes.length>=45&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)
    &&v.getUint32(8)===13&&text(12,4)==='IHDR'&&text(bytes.length-8,4)==='IEND'){
    width=v.getUint32(16);height=v.getUint32(20);
    let p=8,idat=false,ended=false;
    while(p+12<=bytes.length){const size=v.getUint32(p),kind=text(p+4,4);
      if(size>bytes.length-p-12||crc32(bytes.subarray(p+4,p+8+size))!==v.getUint32(p+8+size))throw new Error('バックアップ画像の実形式が正しくありません。');
      if(kind==='IDAT')idat=true;if(kind==='IEND'){ended=size===0&&p+12===bytes.length;break;}
      if(kind==='IHDR'&&p!==8||['acTL','fcTL','fdAT'].includes(kind))throw new Error('バックアップ画像の実形式が正しくありません。');p+=size+12;
    }
    if(!idat||!ended)throw new Error('バックアップ画像の実形式が正しくありません。');
  }else if(type==='image/jpeg'&&bytes.length>=12&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){
    let p=2;while(p+4<bytes.length){if(bytes[p++]!==255)break;while(bytes[p]===255)p++;const marker=bytes[p++];
      if(marker===0xda||marker===0xd9)break;if(marker===1||marker>=0xd0&&marker<=0xd7)continue;
      const n=v.getUint16(p);if(n<2||p+n>bytes.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&n>=8){height=v.getUint16(p+3);width=v.getUint16(p+5);break;}p+=n;
    }
  }else if(type==='image/webp'&&bytes.length>=30&&text(0,4)==='RIFF'&&text(8,4)==='WEBP'&&v.getUint32(4,true)+8===bytes.length){
    const chunk=text(12,4);
    if(chunk==='VP8 '&&text(23,3)==='\u009d\u0001\u002a'){width=v.getUint16(26,true)&0x3fff;height=v.getUint16(28,true)&0x3fff;}
    else if(chunk==='VP8L'&&bytes[20]===0x2f){const bits=v.getUint32(21,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
    else if(chunk==='VP8X'&&!(bytes[20]&2)){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}
  }
  if(!width||!height)throw new Error('バックアップ画像の実形式が正しくありません。');
  validateBackupDimensions(width,height);
  if(width>4096||height>4096)throw new Error('画像の寸法が上限を超えています。');
  return {width,height};
}

export async function validateBackupImage(blob){
  if(!blob||!['image/png','image/jpeg','image/webp'].includes(blob.type)||blob.size>MAX_SAVED_BYTES)throw new Error('バックアップ画像の形式・容量が正しくありません。');
  const header=backupImageHeader(new Uint8Array(await blob.arrayBuffer()),blob.type);
  let decoded;
  try{decoded=await decodeImage(blob);validateBackupDimensions(decoded.width,decoded.height);
    if(!([header.width,header.height].sort((a,b)=>a-b).every((n,i)=>n===[decoded.width,decoded.height].sort((a,b)=>a-b)[i])))throw new Error('画像の寸法が一致しません。');
  }catch{throw new Error('バックアップ画像を完全に読み込めませんでした。');}finally{decoded?.close();}
}

async function encodeCanvas(canvas, context) {
  const encode = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.82));
  let blob = await encode('image/webp');
  if (!blob || blob.type !== 'image/webp') {
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    blob = await encode('image/jpeg');
  }
  if (!blob || blob.size > MAX_SAVED_BYTES) throw new Error('画像を2 MiB以内に圧縮できませんでした。');
  return blob;
}

// トリミング画面ではCanvasの未描画状態を見せず、読み込み済みのimgを直接表示する。
export async function loadAvatarSource(file) {
  const metadata = await inspectInputFile(file);
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve; image.onerror = reject; image.src = url;
    });
    // WebKitは表示先が小さいimgをsub-samplingできます。decode()を明示すると原寸復号になり、
    // 48MP級の写真でメモリを急増させるため、onload後はトリミング領域へ直接表示します。
    validateSourceDimensions(image.naturalWidth, image.naturalHeight);
    let released = false;
    return { file, url, image, metadata, width: image.naturalWidth, height: image.naturalHeight,
      release() { if (released) return; released = true; image.removeAttribute('src'); URL.revokeObjectURL(url); } };
  } catch (error) {
    URL.revokeObjectURL(url);
    const message = String(error?.message ?? '');
    if (message.startsWith('画像の') || message.startsWith('元画像')) throw new Error(message);
    throw new Error(metadata.type === 'image/heic'
      ? 'この環境ではHEIC/HEIF画像を読み込めませんでした。iPhoneの共有または写真設定でJPEGへ変換してから選択してください。'
      : '画像を読み込めませんでした。ファイルが破損していないか確認してください。');
  }
}

// 確定後のみ512px四方へ切り出す。Exifの向きはブラウザ標準のfrom-imageに任せる。
export async function cropAvatar(source, crop) {
  const { x, y, size } = crop;
  if (!Number.isFinite(size) || size <= 0 || x < -0.01 || y < -0.01
    || x + size > source.width + 0.01 || y + size > source.height + 0.01) {
    throw new Error('トリミング範囲が正しくありません。');
  }
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像を処理できませんでした。');
  context.imageSmoothingQuality = 'high';
  let bitmap;
  try {
    // 大きな写真ではImageBitmapの原寸復号を避ける。表示中のimgから512pxへ直接描画すると、
    // WebKitは出力寸法に合わせたsub-samplingを利用でき、EXIFの表示方向も維持される。
    if (source.width * source.height <= MAX_FULL_BITMAP_PIXELS && typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(source.file, { imageOrientation: 'from-image' });
        if (bitmap.width !== source.width || bitmap.height !== source.height) {
          bitmap.close(); bitmap = null;
        }
      } catch { bitmap = null; }
    }
    context.drawImage(bitmap ?? source.image, x, y, size, size, 0, 0, 512, 512);
    return await encodeCanvas(canvas, context);
  } finally { bitmap?.close(); }
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height,
        close: () => bitmap.close() };
    } catch { /* 一部Safariの画像デコード差異ではimg要素も試す。 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve; image.onerror = reject; image.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('画像を読み込めませんでした。');
  }
}

// MIME申告を信用せずブラウザで画像としてデコードし、長辺512pxへ縮小して保存します。
export async function compressAvatar(file) {
  await inspectInputFile(file);
  const bitmap = await decodeImage(file);
  try {
    validateSourceDimensions(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('画像を処理できませんでした。');
    context.drawImage(bitmap.source, 0, 0, width, height);
    return await encodeCanvas(canvas, context);
  } finally { bitmap.close(); }
}
