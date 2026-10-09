import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { APP_VERSION } from '../src/version.js';

// 公開版の確認、または旧配布物→現在のdistの更新確認。実データには触れない。
const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const previousDist = option('previous-dist'), publicUrl = option('url');
if (!previousDist && !publicUrl) throw new Error('Use --previous-dist=PATH or --url=HTTPS_URL');
const currentRoot = resolve('dist'); let servingRoot = previousDist && resolve(previousDist);
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const server = publicUrl ? null : createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const prefix = '/birthday-calendar-pwa/';
  if (!pathname.startsWith(prefix)) return res.writeHead(404).end();
  const path = resolve(servingRoot, decodeURIComponent(pathname.slice(prefix.length)) || 'index.html');
  if (!path.startsWith(servingRoot + sep)) return res.writeHead(404).end();
  try { res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store'); res.end(readFileSync(path)); }
  catch { res.writeHead(404).end(); }
});
if (server) await new Promise((done) => server.listen(0, '127.0.0.1', done));
const baseUrl = publicUrl || `http://127.0.0.1:${server.address().port}/birthday-calendar-pwa/`;
const profile = mkdtempSync(join(tmpdir(), 'birthday-release-smoke-'));
let child, socket, sequence = 0, navigations = 0;
const pending = new Map(), errors = [], requests = [];
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const check = (value, message) => { if (!value) throw new Error(message); };
async function until(predicate, message) {
  for (let i = 0; i < 150; i++) { if (await predicate()) return; await pause(200); }
  throw new Error(message);
}
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((done, fail) => { pending.set(id, { done, fail }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise:true, returnByValue:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
const snapshotExpression = `(async()=>{const db=await new Promise((done,fail)=>{const r=indexedDB.open('birthday-circle-local');r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});
  const names=['people','images','settings','notifications'];const tx=db.transaction(names);
  const records=await Promise.all(names.map(name=>new Promise((done,fail)=>{const r=tx.objectStore(name).getAll();r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);})));
  records[1]=await Promise.all(records[1].map(async image=>({personId:image.personId,type:image.type,size:image.blob.size,
    sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await image.blob.arrayBuffer()))].map(byte=>byte.toString(16).padStart(2,'0')).join('')})));
  db.close();return {version:db.version,records};})()`;
try {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  check(existsSync(edge), 'Edge not found');
  child = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide:true, stdio:'ignore' });
  await until(async () => existsSync(join(profile, 'DevToolsActivePort')), 'Edge startup timeout');
  const port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.addEventListener('open', done, { once:true }); socket.addEventListener('error', fail, { once:true }); });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id);
      if (message.error) item.fail(new Error(message.error.message)); else item.done(message.result); }
    if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) navigations++;
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  });
  for (const name of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await command(name);
  await command('Page.addScriptToEvaluateOnNewDocument', { source:`window.__dataResetCalls=[];
    const clear=IDBObjectStore.prototype.clear;IDBObjectStore.prototype.clear=function(){window.__dataResetCalls.push(this.name);return clear.call(this);};
    const remove=indexedDB.deleteDatabase.bind(indexedDB);indexedDB.deleteDatabase=function(name){window.__dataResetCalls.push('delete:'+name);return remove(name);};` });
  await command('Page.navigate', { url:baseUrl });
  await until(() => evaluate('Boolean(document.querySelector("#app-version")?.textContent && navigator.serviceWorker.controller)'), 'App startup timeout');
  let upgrade = null;
  if (previousDist) {
    const previousVersion = await evaluate('document.querySelector("#app-version").textContent');
    check(previousVersion === '1.2.1', `Unexpected prior version: ${previousVersion}`);
    await evaluate(`(async()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const field=key=>parts.find(part=>part.type===key).value;const today=field('year')+'-'+field('month')+'-'+field('day');
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d').fillRect(0,0,512,512);
      const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));const id=crypto.randomUUID();const time=new Date().toISOString();
      const db=await new Promise(done=>{const r=indexedDB.open('birthday-circle-local');r.onsuccess=()=>done(r.result);});
      const tx=db.transaction(['people','images','settings','notifications'],'readwrite');
      tx.objectStore('people').put({id,displayName:'Release test person',category:'PET',seriesName:'',memo:'Release test note',username:null,xProfileUrl:null,
        links:[{url:'https://example.com/',label:'Test link'}],hasImage:true,createdAt:time,updatedAt:time,
        anniversaries:[{type:'BIRTHDAY',month:Number(field('month')),day:Number(field('day')),year:null,showAge:false},
          {id:crypto.randomUUID(),type:'CUSTOM',title:'Test anniversary',month:5,day:10,year:2024,recurring:true,showAnniversary:true,notify:false}]});
      tx.objectStore('images').put({personId:id,type:blob.type,blob});
      tx.objectStore('settings').put({key:'language',value:'en'});
      tx.objectStore('settings').put({key:'notifications',value:{enabled:true,seven:false,three:true,one:false,today:true}});
      tx.objectStore('notifications').put({id:id+':'+today+':0',personId:id,birthdayDate:today,daysBefore:0,createdAt:time,readAt:time});
      await new Promise((done,fail)=>{tx.oncomplete=done;tx.onabort=()=>fail(tx.error);});db.close();})()`);
    await command('Page.reload');
    await until(() => evaluate('document.documentElement.lang === "en" && document.querySelector("#person-rail .avatar-person") !== null'), 'Old data rendering timeout');
    const before = await evaluate(snapshotExpression);
    servingRoot = currentRoot;
    await evaluate('(async()=>{await (await navigator.serviceWorker.getRegistration()).update();})()');
    await until(() => evaluate('!document.querySelector("#update-banner").hidden'), 'Old app update detection timeout');
    await evaluate('document.querySelector("#update-later").click()');
    check(await evaluate('document.querySelector("#update-banner").hidden'), 'Later did not close banner');
    await evaluate('window.dispatchEvent(new Event("pagehide"));window.dispatchEvent(new Event("pageshow"));');
    await until(() => evaluate('!document.querySelector("#update-banner").hidden'), 'Update reminder did not return');
    const beforeNavigations = navigations;
    await evaluate('document.querySelector("#update-app").click()');
    await until(() => evaluate(`document.querySelector('#app-version')?.textContent === '${APP_VERSION}' && document.querySelector('#person-rail .avatar-person') !== null`), 'Upgrade timeout');
    await pause(500);
    const after = await evaluate(snapshotExpression);
    check(JSON.stringify(before) === JSON.stringify(after), 'Data changed during version upgrade');
    check(navigations - beforeNavigations === 1, 'Upgrade did not reload exactly once');
    check((await evaluate('window.__dataResetCalls')).length === 0, 'Upgrade called data clear/delete');
    upgrade = { from:previousVersion, to:APP_VERSION, databaseVersion:after.version, people:after.records[0].length,
      images:after.records[1].length, notices:after.records[3].length, allDataUnchanged:true, reloads:1, dataResetCalls:0 };
  }
  const published = await evaluate(`(async()=>{document.querySelector('[data-tab=settings]').click();
    const urls=[...document.querySelectorAll('script[src],link[rel=stylesheet],link[rel=manifest],link[rel=apple-touch-icon]')].map(node=>node.src||node.href);
    const manifest=await (await fetch(new URL('./manifest.webmanifest',document.baseURI))).json();
    urls.push(...manifest.icons.map(icon=>new URL(icon.src,document.baseURI).href));
    const statuses=await Promise.all(urls.map(async url=>(await fetch(url)).status));
    const sw=await (await fetch(new URL('./sw.js',document.baseURI),{cache:'no-store'})).text();
    const info=await new Promise(done=>{const channel=new MessageChannel();channel.port1.onmessage=event=>{channel.port1.close();done(event.data);};
      navigator.serviceWorker.controller.postMessage({type:'CACHE_NAME'},[channel.port2]);});
    return {version:document.querySelector('#app-version').textContent,worker:info.appVersion,workerSource:sw.match(/const APP_VERSION = '([^']+)'/)?.[1],
      updateControls:!!document.querySelector('#settings-check-update'),transferGuide:!!document.querySelector('#transfer-title'),statuses};})()`);
  check(published.version === APP_VERSION && published.worker === APP_VERSION && published.workerSource === APP_VERSION,
    `Version mismatch: ${JSON.stringify(published)}`);
  check(published.updateControls && published.transferGuide && published.statuses.every((status) => status === 200), 'Published UI or assets missing');
  if (previousDist) {
    await command('Network.emulateNetworkConditions', { offline:true, latency:0, downloadThroughput:0, uploadThroughput:0 });
    await command('Page.reload');
    await until(() => evaluate(`document.querySelector('#app-version')?.textContent === '${APP_VERSION}' && document.querySelector('#person-rail .avatar-person') !== null`), 'Offline upgrade startup failed');
  }
  const externalRequests = requests.filter((url) => !url.startsWith(baseUrl) && !url.startsWith('blob:') && !url.startsWith('data:'));
  check(externalRequests.length === 0, `Unexpected requests: ${JSON.stringify(externalRequests)}`);
  check(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`);
  console.log(JSON.stringify({ baseUrl, upgrade, published, offlineAfterUpgrade:!!previousDist, consoleErrors:errors.length, externalRequests:externalRequests.length }));
} finally {
  socket?.close(); child?.kill(); server?.close();
  if (profile.startsWith(resolve(tmpdir()) + sep) && profile.includes('birthday-release-smoke-')) {
    try { rmSync(profile, { recursive:true, force:true }); } catch { /* Edge解放直後は一時プロファイルが残る場合がある */ }
  }
}
