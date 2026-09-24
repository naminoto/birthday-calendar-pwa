import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

const prefix = '/birthday-circle/', root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let serveUpdatedWorker = false;
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (!path.startsWith(prefix) || path.includes('..')) return response.writeHead(404).end();
  const relative = path.slice(prefix.length) || 'index.html';
  const file = resolve(root, relative);
  if (!file.startsWith(root + '\\')) return response.writeHead(404).end();
  try { response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    const bytes = readFileSync(file);
    response.end(serveUpdatedWorker && relative === 'sw.js'
      ? Buffer.from(bytes.toString().replace(/CACHE_NAME = CACHE_PREFIX \+ '[a-f0-9]{16}'/,
        "CACHE_NAME = CACHE_PREFIX + 'ffffffffffffffff'")) : bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const baseUrl = `http://127.0.0.1:${server.address().port}${prefix}`;
const profile = mkdtempSync(join(tmpdir(), 'birthday-local-smoke-'));
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const errors = [], requests = [], pending = new Map(); let sequence = 0, socket, child;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(check, label) { for (let i = 0; i < 100; i++) { try { if (await check()) return; } catch {}
  await sleep(150); } throw new Error(`${label}を待機できませんでした。`); }
async function command(method, params = {}) { const id = ++sequence;
  return new Promise((done, fail) => { pending.set(id, { done, fail }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const response = await command('Runtime.evaluate', {
  expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value; }
function check(value, message) { if (!value) throw new Error(message); }
try {
  check(existsSync(edge), 'Microsoft Edgeが見つかりません。');
  child = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
  await until(() => existsSync(join(profile, 'DevToolsActivePort')), 'Edge DevTools');
  const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find((target) => target.type === 'page'); check(page, 'Page targetがありません。');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true }); });
  socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id);
      if (message.error) task.fail(new Error(message.error.message)); else task.done(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  });
  for (const method of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await command(method);
  await command('Page.navigate', { url: baseUrl });
  await until(() => evaluate('document.querySelector("#summary-grid")?.children.length === 4'), '初期ホーム');
  const distribution = await evaluate(`(async()=>{
    const manifestUrl=document.querySelector('link[rel=manifest]').href;
    const manifestResponse=await fetch(manifestUrl);
    const manifest=await manifestResponse.json();
    const resources=[...document.querySelectorAll('script[src],link[rel=stylesheet],link[rel=apple-touch-icon]')]
      .map(node=>node.src||node.href);
    resources.push(...manifest.icons.map(icon=>new URL(icon.src,manifestUrl).href));
    const statuses=await Promise.all(resources.map(async url=>(await fetch(url)).status));
    return {manifestStatus:manifestResponse.status,manifest,resources:resources.length,statuses};
  })()`);
  check(distribution.manifestStatus === 200 && distribution.manifest.start_url === './'
    && distribution.manifest.scope === './' && distribution.manifest.display === 'standalone'
    && distribution.statuses.every(status => status === 200), 'manifestまたは配布アセット取得に失敗しました。');
  await evaluate(`(async () => { document.querySelector('#home-add').click();
    document.querySelector('#person-name').value='ブラウザ検証';
    const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=768;
    canvas.getContext('2d').fillRect(0,0,1024,768);
    const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));
    const transfer=new DataTransfer(); transfer.items.add(new File([blob],'test.png',{type:'image/png'}));
    document.querySelector('#person-image').files=transfer.files;
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).split('-');
    document.querySelector('#person-birth-month').value=Number(parts[1]);
    document.querySelector('#person-birth-day').value=Number(parts[2]);
    document.querySelector('#person-form').requestSubmit(); })()`);
  await until(() => evaluate('document.querySelector("#summary-grid")?.children[0]?.querySelector("b")?.textContent === "1"'), '人物登録');
  await until(() => evaluate('document.querySelector("#unread-badge")?.textContent === "1"'), '当日通知');
  await evaluate('document.querySelector("#bell").click()');
  await until(() => evaluate('document.querySelector("#notification-dialog").open'), '通知ダイアログ');
  check(await evaluate('document.querySelector("#notification-list").textContent.includes("ブラウザ検証")'), '通知に人物名がありません。');
  await evaluate('document.querySelector("#notification-dialog [data-close]").click()');
  await evaluate('document.querySelector("[data-tab=calendar]").click()');
  await until(() => evaluate('document.querySelector("#person-rail .avatar-person") !== null'), '人物レール');
  await evaluate(`(() => { const card=document.querySelector('#person-rail .avatar-person');
    const target=[...document.querySelectorAll('.day-cell')].find(x=>x.querySelector('.day-number').textContent==='15');
    const transfer=new DataTransfer(); card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
    target.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer})); })()`);
  await until(() => evaluate('document.querySelector("#toast").textContent.includes("15日")'), 'ドラッグ保存');
  await command('Page.reload');
  await until(() => evaluate('document.querySelector("#person-rail .avatar-person") !== null'), '再読み込み');
  const persisted = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('people').objectStore('people').getAll();
      q.onsuccess=()=>resolve(q.result.map(p=>({name:p.displayName,birthday:p.anniversaries[0]})));};r.onerror=()=>reject(r.error);})`);
  check(persisted.length === 1 && persisted[0].birthday.day === 15, '再読み込み後に誕生日が残りません。');
  const image = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').getAll();
      q.onsuccess=async()=>{const bitmap=await createImageBitmap(q.result[0].blob);
        resolve({count:q.result.length,width:bitmap.width,height:bitmap.height,bytes:q.result[0].blob.size});};};
    r.onerror=()=>reject(r.error);})`);
  check(image.count === 1 && image.width <= 512 && image.height <= 512, '画像が縮小・保存されていません。');
  await evaluate(`(async()=>{document.querySelector('#person-rail .avatar-person').click();
    document.querySelector('#detail-edit').click();
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=400;
    canvas.getContext('2d').fillStyle='blue';canvas.getContext('2d').fillRect(0,0,800,400);
    const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));
    const transfer=new DataTransfer();transfer.items.add(new File([blob],'new.png',{type:'image/png'}));
    document.querySelector('#person-image').files=transfer.files;
    document.querySelector('#person-form').requestSubmit();})()`);
  await until(() => evaluate('document.querySelector("#toast").textContent.includes("更新しました")'), '画像差し替え');
  const replacement = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').getAll();
      q.onsuccess=async()=>{const bitmap=await createImageBitmap(q.result[0].blob);
        resolve({count:q.result.length,width:bitmap.width,height:bitmap.height});};};})`);
  check(replacement.count === 1 && replacement.width === 512 && replacement.height === 256,
    '画像差し替えで旧画像が残ったか、新画像の縮小に失敗しました。');
  await evaluate(`(()=>{document.querySelector('#person-rail .avatar-person').click();
    document.querySelector('#detail-edit').click();document.querySelector('#person-remove-image').checked=true;
    document.querySelector('#person-form').requestSubmit();})()`);
  await until(() => evaluate('document.querySelector("#toast").textContent.includes("更新しました")'), '画像削除');
  const imagesAfterDelete = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').getAll();
      q.onsuccess=()=>resolve(q.result.length);};})`);
  check(imagesAfterDelete === 0, '画像削除後に孤児画像が残っています。');
  await evaluate(`(()=>{document.querySelector('[data-tab=settings]').click();
    const original=URL.createObjectURL;
    URL.createObjectURL=function(blob){if(blob.type==='application/zip')window.__backup=blob;
      return original.call(URL,blob);};
    document.querySelector('#export-backup').click();})()`);
  await until(() => evaluate('window.__backup?.size > 0'), 'ZIP書き出し');
  await evaluate(`(()=>{document.querySelector('[data-tab=people]').click();
    document.querySelector('.person-card').click();document.querySelector('#detail-edit').click();
    document.querySelector('#person-name').value='変更された名前';
    document.querySelector('#person-form').requestSubmit();})()`);
  await until(() => evaluate('document.querySelector(".person-card")?.textContent.includes("変更された名前")'), '復元前変更');
  await evaluate(`(()=>{document.querySelector('[data-tab=settings]').click();
    const input=document.querySelector('#import-backup');const transfer=new DataTransfer();
    transfer.items.add(new File([window.__backup],'backup.zip',{type:'application/zip'}));
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(() => evaluate('!document.querySelector("#restore-preview").hidden'), 'ZIP内容プレビュー');
  await evaluate(`(()=>{window.confirm=()=>true;window.prompt=()=> '復元';
    document.querySelector('#restore-preview button').click();})()`);
  await until(() => evaluate('document.querySelector("#toast").textContent.includes("復元と画像整合性")'), 'ZIP復元');
  const restoredName = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('people').objectStore('people').getAll();
      q.onsuccess=()=>resolve(q.result[0].displayName);};})`);
  check(restoredName === 'ブラウザ検証', 'ZIP復元で元の人物名に戻りません。');
  await evaluate('document.querySelector("[data-tab=calendar]").click()');
  await until(() => evaluate('Boolean(navigator.serviceWorker.controller)'), 'Service Worker制御');
  const pc = await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,sw:!!navigator.serviceWorker.controller})');
  mkdirSync('test-artifacts', { recursive: true });
  writeFileSync('test-artifacts/pc.png', Buffer.from((await command('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(350);
  const mobile = await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,nav:!!document.querySelector(".bottom-nav").getClientRects().length})');
  writeFileSync('test-artifacts/mobile-390.png', Buffer.from((await command('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const mobileViews = await evaluate(`(() => ['home','calendar','people','birthdays','settings'].map(tab=>{
    document.querySelector('[data-tab='+tab+']').click();
    return {tab,scroll:document.documentElement.scrollWidth};}))()`);
  writeFileSync('test-artifacts/settings-390.png', Buffer.from((await command('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  check(pc.scroll <= pc.width && mobile.scroll <= mobile.width && mobile.nav
    && mobileViews.every(view => view.scroll <= 390), '横スクロールまたはモバイルナビ問題');
  serveUpdatedWorker = true;
  await evaluate(`(async()=>{const registration=await navigator.serviceWorker.getRegistration();
    await registration.update();})()`);
  await until(() => evaluate('!document.querySelector("#update-banner").hidden'), '更新案内');
  await evaluate('document.querySelector("#update-app").click()');
  await until(() => evaluate('Boolean(navigator.serviceWorker.controller) && document.querySelector("#person-rail .avatar-person") !== null'), '更新後再起動');
  const scopeCachePrefix = 'birthday-circle-shell-%2Fbirthday-circle%2F-';
  await until(async () => (await evaluate('caches.keys()'))
    .filter(name => name.startsWith(scopeCachePrefix)).length === 1, '旧キャッシュ削除');
  const cachesAfterUpdate = await evaluate('caches.keys()');
  check(cachesAfterUpdate.filter(name => name.startsWith(scopeCachePrefix)).length === 1
    && cachesAfterUpdate.includes(`${scopeCachePrefix}ffffffffffffffff`),
    `更新後の旧キャッシュ清掃に失敗しました: ${JSON.stringify(cachesAfterUpdate)}`);
  const peopleAfterUpdate = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('people').objectStore('people').count();
      q.onsuccess=()=>resolve(q.result);};})`);
  check(peopleAfterUpdate === 1, 'Service Worker更新で人物データが失われました。');
  await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await command('Page.reload');
  await until(() => evaluate('document.querySelector("#person-rail .avatar-person") !== null'), 'オフライン起動');
  check(errors.length === 0, `ブラウザエラー: ${errors.join(' | ')}`);
  const externalRequests = requests.filter(url => !url.startsWith(baseUrl)
    && !url.startsWith('blob:') && !url.startsWith('data:'));
  check(externalRequests.length === 0, `外部通信がありました: ${JSON.stringify(externalRequests)}`);
  console.log(JSON.stringify({ baseUrl, people: persisted.length, birthdayDay: persisted[0].birthday.day,
    notifications: 1, image, replacement, imagesAfterDelete, restoredName, offline: true, pc, mobile,
    mobileViews, distribution, peopleAfterUpdate, cachesAfterUpdate,
    consoleErrors: errors.length, externalRequests: externalRequests.length }));
} finally {
  socket?.close(); child?.kill(); server.close();
  if (profile.startsWith(resolve(tmpdir()) + '\\') && profile.includes('birthday-local-smoke-')) {
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
