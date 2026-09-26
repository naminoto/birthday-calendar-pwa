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
const errors = [], requests = [], pending = new Map(); let sequence = 0, socket, child, navigations = 0;
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
    if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) navigations++;
    if (message.id && pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id);
      if (message.error) task.fail(new Error(message.error.message)); else task.done(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  });
  for (const method of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await command(method);
  await command('Page.navigate', { url: baseUrl });
  await until(() => evaluate('document.querySelector("#summary-grid")?.children.length === 4'), '初期ホーム');
  await until(() => evaluate('Boolean(navigator.serviceWorker.controller)'), '初回Service Worker制御');
  check(await evaluate('document.querySelector("#update-banner").hidden'),
    '初回インストールを更新と誤認しました。');
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
  const orientation = await evaluate(`(async()=>{
    const canvas=document.createElement('canvas');canvas.width=80;canvas.height=40;
    const context=canvas.getContext('2d');context.fillStyle='red';context.fillRect(0,0,40,40);
    context.fillStyle='blue';context.fillRect(40,0,40,40);
    const jpeg=new Uint8Array(await (await new Promise(done=>canvas.toBlob(done,'image/jpeg'))).arrayBuffer());
    const exif=new Uint8Array([255,225,0,34,69,120,105,102,0,0,77,77,0,42,0,0,0,8,
      0,1,1,18,0,3,0,0,0,1,0,6,0,0,0,0,0,0]);
    const file=new Blob([jpeg.slice(0,2),exif,jpeg.slice(2)],{type:'image/jpeg'});
    const url=URL.createObjectURL(file),image=new Image();image.src=url;await image.decode();
    const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    const result={image:[image.naturalWidth,image.naturalHeight],bitmap:[bitmap.width,bitmap.height]};
    bitmap.close();URL.revokeObjectURL(url);return result;
  })()`);
  check(orientation.image[0] === 40 && orientation.image[1] === 80
    && JSON.stringify(orientation.image) === JSON.stringify(orientation.bitmap),
    'EXIF Orientationのプレビュー/Canvas向きが一致しません。');
  await evaluate(`(()=>{document.querySelector('[data-tab=settings]').click();
    const input=document.querySelector('#language-choice');input.value='en';
    input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(() => evaluate('document.documentElement.lang === "en" && document.querySelector("#view-settings h1").textContent === "Settings & data"'), '英語切替');
  const english = await evaluate(`(() => ({lang:document.documentElement.lang,
    hero:document.querySelector('.hero h1').textContent,
    calendar:document.querySelector('#view-calendar h1').textContent,
    settings:document.querySelector('#view-settings h1').textContent,
    backup:document.querySelectorAll('#view-settings .setting-card')[2].querySelector('h2').textContent,
    form:document.querySelector('#person-form > label:nth-of-type(1)').textContent.trim(),
    crop:document.querySelector('#crop-title').textContent,
    version:document.querySelector('#app-version').textContent,
    category:document.querySelector('#calendar-category option[value=PET]').textContent,
    nav:[...document.querySelectorAll('[data-tab]')].map(node=>node.textContent.trim()),
    residual:[...document.querySelectorAll('body *')].filter(node=>node.children.length===0 && /[\u3040-\u30ff\u3400-\u9fff]/.test(node.textContent))
      .map(node=>[node.tagName,node.id||node.className,node.textContent.trim()]).slice(0,80),
    residualText:(()=>{const found=[],walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      while(walk.nextNode()){const node=walk.currentNode;
        if(node.parentElement?.closest('#language-choice'))continue;
        if(/[\u3040-\u30ff\u3400-\u9fff]/.test(node.textContent))
          found.push([node.parentElement?.tagName,node.parentElement?.id||node.parentElement?.className,node.textContent.trim()]);}
      return found.slice(0,80);})(),
  }))()`);
  check(english.hero === 'Keep meaningful days close.' && english.calendar === 'Birthday & anniversary calendar'
    && english.backup === 'Backup & restore' && english.form.startsWith('Display name')
    && english.crop === 'Adjust image' && english.version === '1.2.0' && english.category === 'Pet'
    && english.residualText.length === 0,
    `英語画面の翻訳が不足しています: ${JSON.stringify(english)}`);
  await evaluate(`(()=>{document.querySelector('#people-add').click();
    document.querySelector('#add-anniversary').click();document.querySelector('#add-link').click();
    document.querySelector('#person-name').value='Validation';
    document.querySelector('#person-username').value='invalid!';
    const ann=document.querySelector('#anniversary-fields .repeat-row');
    const link=document.querySelector('#link-fields .repeat-row');
    window.__englishRepeat={ann:ann.textContent,link:link.textContent};
    ann.querySelector('button').click();link.querySelector('button').click();
    document.querySelector('#person-form').requestSubmit();})()`);
  check(await evaluate('window.__englishRepeat.ann.includes("Anniversary name") && window.__englishRepeat.link.includes("Label")'),
    '追加した記念日・関連URLの入力欄が英語になりません。');
  await until(() => evaluate('!document.querySelector("#person-error").hidden'), '英語バリデーション');
  check(await evaluate('document.querySelector("#person-error").textContent === "Invalid X username."'),
    '英語バリデーションエラーが表示されません。');
  await evaluate('document.querySelector("#person-dialog [data-close]").click()');
  await command('Page.reload');
  await until(() => evaluate('document.documentElement.lang === "en" && document.querySelector("#summary-grid")?.children.length === 4'), '英語設定保持');
  await evaluate(`(()=>{document.querySelector('[data-tab=settings]').click();const input=document.querySelector('#language-choice');
    input.value='ja';input.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-tab=home]').click();})()`);
  await until(() => evaluate('document.documentElement.lang === "ja"'), '日本語へ戻す');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(200);
  await evaluate('document.querySelector("#home-add").click()');
  const formSizes = await evaluate(`(() => ({
    minimum: Math.min(...[...document.querySelectorAll('input:not([type=checkbox]):not([type=hidden]),select,textarea')]
      .map(node=>parseFloat(getComputedStyle(node).fontSize))),
    viewport: document.querySelector('meta[name=viewport]').content,
    width: document.documentElement.scrollWidth,
  }))()`);
  check(formSizes.minimum >= 16 && formSizes.width <= 390
    && !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(formSizes.viewport),
    'モバイルの入力文字サイズかピンチズーム設定が不適切です。');
  await evaluate(`(async () => { document.querySelector('#person-name').value='ブラウザ検証';
    const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=768;
    const context=canvas.getContext('2d');context.fillStyle='#d53b68';context.fillRect(0,0,1024,768);
    context.fillStyle='#35bf6f';context.fillRect(362,234,300,300);
    const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));
    const transfer=new DataTransfer(); transfer.items.add(new File([blob],'test.png',{type:'image/png'}));
    document.querySelector('#person-image').files=transfer.files;
    document.querySelector('#person-image').dispatchEvent(new Event('change',{bubbles:true}));
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).split('-');
    document.querySelector('#person-birth-month').value=Number(parts[1]);
    document.querySelector('#person-birth-day').value=Number(parts[2]); })()`);
  await until(() => evaluate('document.querySelector("#avatar-crop-dialog").open'), '画像トリミング画面');
  const cropMobile = await evaluate(`(() => {const dialog=document.querySelector('#avatar-crop-dialog');
    const rect=dialog.getBoundingClientRect();return {width:rect.width,left:rect.left,right:rect.right,
      viewport:document.querySelector('#crop-viewport').clientWidth,
      scroll:document.documentElement.scrollWidth};})()`);
  check(cropMobile.left >= 0 && cropMobile.right <= 390 && cropMobile.viewport > 200
    && cropMobile.scroll <= 390, '390pxでトリミング画面がはみ出しています。');
  mkdirSync('test-artifacts', { recursive: true });
  writeFileSync('test-artifacts/crop-390.png', Buffer.from((await command('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const cropPreview = await evaluate(`(() => {const img=document.querySelector('#crop-viewport .crop-image');
    const sample=document.createElement('canvas');sample.width=1;sample.height=1;
    sample.getContext('2d').drawImage(img,img.naturalWidth/2,img.naturalHeight/2,1,1,0,0,1,1);
    return {complete:img.complete,width:img.naturalWidth,height:img.naturalHeight,
      pixel:[...sample.getContext('2d').getImageData(0,0,1,1).data],blob:img.src.startsWith('blob:')};})()`);
  check(cropPreview.complete && cropPreview.blob && cropPreview.width === 1024
    && cropPreview.height === 768 && cropPreview.pixel[1] > cropPreview.pixel[0],
    '選択直後の画像プレビューが表示されていません。');
  const cropGesture = await evaluate(`(() => {const view=document.querySelector('#crop-viewport');
    const slider=document.querySelector('#crop-zoom');slider.value='2';slider.dispatchEvent(new Event('input',{bubbles:true}));
    const img=view.querySelector('img'),before=parseFloat(img.style.left),box=view.getBoundingClientRect();
    const point={bubbles:true,pointerId:7,clientX:box.left+box.width/2,clientY:box.top+box.height/2};
    view.dispatchEvent(new PointerEvent('pointerdown',point));
    view.dispatchEvent(new PointerEvent('pointermove',{...point,clientX:point.clientX+30}));
    view.dispatchEvent(new PointerEvent('pointerup',{...point,clientX:point.clientX+30}));
    const move=parseFloat(img.style.left)-before,first={...point,pointerId:8,clientX:point.clientX-50};
    const second={...point,pointerId:9,clientX:point.clientX+50};
    view.dispatchEvent(new PointerEvent('pointerdown',first));
    view.dispatchEvent(new PointerEvent('pointerdown',second));
    view.dispatchEvent(new PointerEvent('pointermove',{...first,clientX:first.clientX-20}));
    view.dispatchEvent(new PointerEvent('pointermove',{...second,clientX:second.clientX+20}));
    const pinchZoom=Number(slider.value);
    view.dispatchEvent(new PointerEvent('pointerup',first));view.dispatchEvent(new PointerEvent('pointerup',second));
    return {zoom:2,move,pinchZoom};})()`);
  check(Number(cropGesture.zoom) === 2 && cropGesture.move > 20 && cropGesture.pinchZoom > 2.5,
    'トリミングの移動・スライダー・ピンチ拡大ができません。');
  await evaluate('document.querySelector("#crop-confirm").click()');
  await until(() => evaluate('!document.querySelector("#avatar-crop-dialog").open'), 'トリミング確定');
  check(await evaluate('document.querySelector("#person-image-preview img").src.startsWith("blob:")'),
    '確定後の丸型プレビューがありません。');
  await evaluate(`(()=>{document.querySelector('#add-anniversary').click();
    const row=document.querySelector('#anniversary-fields .repeat-row');
    row.querySelector('.ann-title').value='出会った日';
    row.querySelector('.ann-month').value=document.querySelector('#person-birth-month').value;
    row.querySelector('.ann-day').value='15';row.querySelector('.ann-year').value='2024';
    row.querySelector('.ann-showAnniversary').checked=true;})()`);
  await evaluate('document.querySelector("#person-form").requestSubmit()');
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
      q.onsuccess=()=>resolve(q.result.map(p=>({name:p.displayName,birthday:p.anniversaries[0],anns:p.anniversaries})));};r.onerror=()=>reject(r.error);})`);
  check(persisted.length === 1 && persisted[0].birthday.day === 15
    && persisted[0].anns.length === 2 && persisted[0].anns[1].title === '出会った日',
  '再読み込み後に誕生日または記念日が残りません。');
  const image = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').getAll();
      q.onsuccess=async()=>{const bitmap=await createImageBitmap(q.result[0].blob);
        resolve({count:q.result.length,width:bitmap.width,height:bitmap.height,bytes:q.result[0].blob.size});};};
    r.onerror=()=>reject(r.error);})`);
  check(image.count === 1 && image.width === 512 && image.height === 512 && image.bytes <= 2 * 1024 * 1024,
    'トリミング画像が512px正方形で保存されていません。');
  await evaluate(`(()=>{document.querySelector('[data-tab=people]').click();document.querySelector('#people-add').click();
    document.querySelector('#person-name').value='別カテゴリ';document.querySelector('#person-category').value='PET';
    document.querySelector('#person-birth-month').value='${persisted[0].birthday.month}';
    document.querySelector('#person-birth-day').value='15';document.querySelector('#person-form').requestSubmit();})()`);
  await until(() => evaluate('document.querySelectorAll("#people-list .person-card").length === 2'), '同日2人の登録');
  const calendarFilter = await evaluate(`(()=>{document.querySelector('[data-tab=calendar]').click();
    const selector=document.querySelector('#calendar-category');
    const count=()=>[...document.querySelectorAll('.day-cell')].find(x=>x.querySelector('.day-number').textContent==='15')
      .querySelectorAll('.day-avatars .calendar-event').length;
    const all=count();selector.value='PET';selector.dispatchEvent(new Event('change',{bubbles:true}));const pet=count();
    selector.value='OTHER';selector.dispatchEvent(new Event('change',{bubbles:true}));const other=count();
    const type=document.querySelector('#calendar-event-type');type.value='ANNIVERSARY';
    type.dispatchEvent(new Event('change',{bubbles:true}));const otherAnn=count();
    type.value='BIRTHDAY';type.dispatchEvent(new Event('change',{bubbles:true}));const otherBirthday=count();
    type.value='ALL';type.dispatchEvent(new Event('change',{bubbles:true}));
    selector.value='ALL';selector.dispatchEvent(new Event('change',{bubbles:true}));
    return {all,pet,other,otherAnn,otherBirthday,reset:count(),scroll:document.documentElement.scrollWidth};})()`);
  check(calendarFilter.all === 3 && calendarFilter.pet === 1 && calendarFilter.other === 2
    && calendarFilter.otherAnn === 1 && calendarFilter.otherBirthday === 1
    && calendarFilter.reset === 3 && calendarFilter.scroll <= 390,
    `カレンダーカテゴリ絞り込みか同日複数人表示に失敗: ${JSON.stringify(calendarFilter)}`);
  await evaluate(`(()=>{window.confirm=()=>true;document.querySelector('[data-tab=people]').click();
    [...document.querySelectorAll('#people-list .person-card')].find(x=>x.textContent.includes('別カテゴリ')).click();
    document.querySelector('#detail-edit').click();document.querySelector('#delete-person').click();})()`);
  await until(() => evaluate('document.querySelectorAll("#people-list .person-card").length === 1'), 'カテゴリ検証人物の削除');
  await evaluate('document.querySelector("[data-tab=calendar]").click()');
  await evaluate(`(async()=>{document.querySelector('#person-rail .avatar-person').click();
    document.querySelector('#detail-edit').click();
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=400;
    canvas.getContext('2d').fillStyle='blue';canvas.getContext('2d').fillRect(0,0,800,400);
    const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));
    const transfer=new DataTransfer();transfer.items.add(new File([blob],'new.png',{type:'image/png'}));
    document.querySelector('#person-image').files=transfer.files;
    document.querySelector('#person-image').dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(() => evaluate('document.querySelector("#avatar-crop-dialog").open'), '画像差し替えの調整画面');
  await evaluate('document.querySelector("#crop-cancel").click()');
  await until(() => evaluate('!document.querySelector("#avatar-crop-dialog").open'), '画像調整キャンセル');
  check(await evaluate('document.querySelector("#person-image-preview").textContent.includes("現在の画像")'),
    'キャンセル後に既存画像が残りません。');
  await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=800;canvas.height=400;
    const context=canvas.getContext('2d');context.fillStyle='blue';context.fillRect(0,0,800,400);
    const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));
    const transfer=new DataTransfer();transfer.items.add(new File([blob],'new.png',{type:'image/png'}));
    const input=document.querySelector('#person-image');input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(() => evaluate('document.querySelector("#avatar-crop-dialog").open'), '画像再選択');
  await evaluate('document.querySelector("#crop-confirm").click()');
  await until(() => evaluate('!document.querySelector("#avatar-crop-dialog").open'), '画像差し替え確定');
  await evaluate('document.querySelector("#person-form").requestSubmit()');
  await until(() => evaluate('document.querySelector("#toast").textContent.includes("更新しました")'), '画像差し替え');
  const replacement = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').getAll();
      q.onsuccess=async()=>{const bitmap=await createImageBitmap(q.result[0].blob);
        resolve({count:q.result.length,width:bitmap.width,height:bitmap.height});};};})`);
  check(replacement.count === 1 && replacement.width === 512 && replacement.height === 512,
    '画像差し替えで旧画像が残ったか、新画像の縮小に失敗しました。');
  await evaluate(`(()=>{document.querySelector('[data-tab=settings]').click();
    const original=URL.createObjectURL;
    URL.createObjectURL=function(blob){if(blob.type==='application/zip')window.__backup=blob;
      return original.call(URL,blob);};
    document.querySelector('#export-backup').click();})()`);
  await until(() => evaluate('window.__backup?.size > 0'), '画像を含むZIP書き出し');
  await evaluate(`(()=>{document.querySelector('[data-tab=calendar]').click();
    document.querySelector('#person-rail .avatar-person').click();
    document.querySelector('#detail-edit').click();document.querySelector('#person-remove-image').checked=true;
    document.querySelector('#person-form').requestSubmit();})()`);
  await until(() => evaluate('document.querySelector("#toast").textContent.includes("更新しました")'), '画像削除');
  const imagesAfterDelete = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').getAll();
      q.onsuccess=()=>resolve(q.result.length);};})`);
  check(imagesAfterDelete === 0, '画像削除後に孤児画像が残っています。');
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
  const restoredImages = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').count();
      q.onsuccess=()=>resolve(q.result);};})`);
  check(restoredImages === 1, 'ZIP復元でトリミング画像が戻りません。');
  await evaluate('document.querySelector("[data-tab=calendar]").click()');
  await until(() => evaluate('Boolean(navigator.serviceWorker.controller)'), 'Service Worker制御');
  await command('Emulation.clearDeviceMetricsOverride');
  await sleep(200);
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
  await evaluate(`(()=>{document.querySelector('[data-tab=settings]').click();
    document.querySelector('#notification-settings [name=seven]').checked=false;
    document.querySelector('#notification-settings').requestSubmit();
    const input=document.querySelector('#language-choice');input.value='en';
    input.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('[data-tab=calendar]').click();})()`);
  await until(() => evaluate('document.documentElement.lang === "en"'), '更新前の英語設定');
  serveUpdatedWorker = true;
  await evaluate(`(async()=>{const registration=await navigator.serviceWorker.getRegistration();
    await registration.update();})()`);
  await until(() => evaluate('!document.querySelector("#update-banner").hidden'), '更新案内');
  check(await evaluate('document.querySelector("#update-message").textContent.includes("update")'),
    '更新案内が英語表示ではありません。');
  await evaluate('document.querySelector("#update-later").click()');
  check(await evaluate('document.querySelector("#update-banner").hidden && !!document.querySelector("#person-rail .avatar-person")'),
    'あとでを選択した後に通常利用できません。');
  const waitingCache = await evaluate('caches.keys()');
  check(waitingCache.filter(name => name.startsWith('birthday-circle-shell-%2Fbirthday-circle%2F-')).length === 2,
    '新旧キャッシュが更新待ち中に揃っていません。');
  await evaluate(`(()=>{document.querySelector('[data-tab=settings]').click();
    document.querySelector('#clear-cache').click();})()`);
  await sleep(200);
  check((await evaluate('caches.keys()')).includes('birthday-circle-shell-%2Fbirthday-circle%2F-ffffffffffffffff'),
    'キャッシュ整理で更新待ちの新キャッシュが消えました。');
  await command('Page.reload');
  await until(() => evaluate('!document.querySelector("#update-banner").hidden && document.documentElement.lang === "en"'), '更新案内の再表示');
  const beforeUpdateNavigations = navigations;
  const updatingLabel = await evaluate(`(()=>{document.querySelector('#update-app').click();
    return document.querySelector('#update-message').textContent;})()`);
  check(updatingLabel.includes('Updating'), '更新中の表示がありません。');
  await until(() => navigations > beforeUpdateNavigations, '更新後reload');
  await until(() => evaluate('Boolean(navigator.serviceWorker.controller) && document.querySelector("#person-rail .avatar-person") !== null'), '更新後再起動');
  await sleep(500);
  check(navigations - beforeUpdateNavigations === 1,
    `更新後reload回数が不正です: ${navigations-beforeUpdateNavigations} (before ${beforeUpdateNavigations}, after ${navigations})`);
  const updateReloads = navigations - beforeUpdateNavigations;
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
  const imagesAfterUpdate = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').count();
      q.onsuccess=()=>resolve(q.result);};})`);
  check(imagesAfterUpdate === 1, 'Service Worker更新でプロフィール画像が失われました。');
  const settingsAfterUpdate = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('birthday-circle-local');
    r.onsuccess=()=>{const tx=r.result.transaction('settings');const notices=tx.objectStore('settings').get('notifications');
      const language=tx.objectStore('settings').get('language');tx.oncomplete=()=>resolve({seven:notices.result.value.seven,
        language:language.result.value,htmlLang:document.documentElement.lang});};})`);
  check(settingsAfterUpdate.seven === false && settingsAfterUpdate.language === 'en' && settingsAfterUpdate.htmlLang === 'en',
    'Service Worker更新後に通知設定か言語設定が失われました。');
  await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await command('Page.reload');
  await until(() => evaluate('document.querySelector("#person-rail .avatar-person") !== null'), 'オフライン起動');
  check(errors.length === 0, `ブラウザエラー: ${errors.join(' | ')}`);
  const externalRequests = requests.filter(url => !url.startsWith(baseUrl)
    && !url.startsWith('blob:') && !url.startsWith('data:'));
  check(externalRequests.length === 0, `外部通信がありました: ${JSON.stringify(externalRequests)}`);
  console.log(JSON.stringify({ baseUrl, people: persisted.length, birthdayDay: persisted[0].birthday.day,
    notifications: 1, formSizes, cropMobile, cropPreview, cropGesture, image, replacement, imagesAfterDelete,
    restoredName, restoredImages, offline: true, pc, mobile, calendarFilter,
    mobileViews, distribution, orientation, english, peopleAfterUpdate, imagesAfterUpdate, cachesAfterUpdate,
    waitingCache, settingsAfterUpdate, updateReloads,
    consoleErrors: errors.length, externalRequests: externalRequests.length }));
} finally {
  socket?.close(); child?.kill(); server.close();
  if (profile.startsWith(resolve(tmpdir()) + '\\') && profile.includes('birthday-local-smoke-')) {
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
