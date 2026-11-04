// 正式版はpackage.jsonだけを人が更新する。独立テスト版は、監査済みdistのコピーへ
// prepare-iphone-preview.mjsが限定metaを追加し、正式版を変更せず候補番号を表示する。
// Nodeの単体テストはpackage.jsonを直接読み、Vite buildはVersion値だけをdefineで埋め込む。
const embeddedVersion=typeof __YORIBI_PACKAGE_VERSION__==='string'?__YORIBI_PACKAGE_VERSION__:null;
const packageVersion=embeddedVersion??(await import('../package.json',{with:{type:'json'}})).default.version;
const previewVersion = globalThis.document?.querySelector?.('meta[name="yoribi-preview-version"]')?.content ?? '';
export const APP_VERSION = /^\d+\.\d+\.\d+-candidate$/.test(previewVersion)
  ? previewVersion : packageVersion;
