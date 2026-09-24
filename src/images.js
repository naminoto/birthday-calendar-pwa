const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_SIDE = 512;
const MAX_PIXELS = 16_777_216;
const MAX_SAVED_BYTES = 2 * 1024 * 1024;

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
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
  if (!file || file.size > MAX_INPUT_BYTES) throw new Error('画像は20 MiB以内を選択してください。');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    throw new Error('JPEG・PNG・WebP・GIF画像を選択してください。');
  }
  const bitmap = await decodeImage(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_PIXELS) {
      throw new Error('画像の画素数が上限を超えています。');
    }
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('画像を処理できませんでした。');
    context.drawImage(bitmap.source, 0, 0, width, height);
    const encode = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.82));
    let blob = await encode('image/webp');
    if (!blob || blob.type !== 'image/webp') {
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
      blob = await encode('image/jpeg');
    }
    if (!blob || blob.size > MAX_SAVED_BYTES) throw new Error('画像を2 MiB以内に圧縮できませんでした。');
    return blob;
  } finally { bitmap.close(); }
}
