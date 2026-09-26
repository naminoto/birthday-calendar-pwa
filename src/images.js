const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_SIDE = 512;
const MAX_PIXELS = 16_777_216;
const MAX_SAVED_BYTES = 2 * 1024 * 1024;
const INPUT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

function validateFile(file) {
  if (!file || file.size > MAX_INPUT_BYTES) throw new Error('画像は20 MiB以内を選択してください。');
  const type = file.type.toLowerCase();
  const knownExtension = /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name ?? '');
  if (!INPUT_TYPES.includes(type) && !(['', 'application/octet-stream'].includes(type) && knownExtension)) {
    throw new Error('JPEG・PNG・WebP・GIF・HEIC画像を選択してください。');
  }
}

function validateDimensions(width, height) {
  if (!width || !height || width * height > MAX_PIXELS) {
    throw new Error('画像の画素数が上限を超えています。');
  }
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
  validateFile(file);
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve; image.onerror = reject; image.src = url;
    });
    if (typeof image.decode === 'function') await image.decode().catch(() => {});
    validateDimensions(image.naturalWidth, image.naturalHeight);
    let released = false;
    return { file, url, image, width: image.naturalWidth, height: image.naturalHeight,
      release() { if (released) return; released = true; image.removeAttribute('src'); URL.revokeObjectURL(url); } };
  } catch (error) {
    URL.revokeObjectURL(url);
    const message = String(error?.message ?? '');
    throw new Error(message.startsWith('画像の画素数') ? message
      : '画像を読み込めませんでした。HEICが開けない場合はJPEGへ変換してください。');
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
    if (typeof createImageBitmap === 'function') {
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
  validateFile(file);
  const bitmap = await decodeImage(file);
  try {
    validateDimensions(bitmap.width, bitmap.height);
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
