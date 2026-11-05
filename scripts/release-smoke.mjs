import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { APP_VERSION } from '../src/version.js';
import { verifyCalendarRegistration } from './calendar-registration-smoke.mjs';
import { verifyCalendarInteractions } from './calendar-interaction-smoke.mjs';
import { verifyYoribiUI } from './yoribi-smoke.mjs';
import { verifyDayListGestures } from './day-list-smoke.mjs';
import { verifyHome } from './home-smoke.mjs';
import { verifyFontLab } from './font-lab-smoke.mjs';
import { verifyStandardFont } from './standard-font-smoke.mjs';
import { verifyBirthdayUI } from './birthday-ui-smoke.mjs';
import {verifyPersonActions} from './person-actions-smoke.mjs';
import {verifyRailManagement} from './rail-management-smoke.mjs';
import {verifyCalendarTaps} from './calendar-tap-smoke.mjs';
import {verifyBackupSecurity} from './backup-security-smoke.mjs';
import {verifyLifecycle} from './lifecycle-smoke.mjs';

// 公開版の確認、または旧配布物→現在のdistの更新確認。実データには触れない。
const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const previousDist = option('previous-dist'), publicUrl = option('url'), localDist=option('serve-dist');
const expectedAppVersion=option('expected-version')||APP_VERSION;
const expectedAvatarDiagnostics=option('expect-avatar-diagnostics');
const expectedAvatarPickerMode=option('expect-avatar-picker-mode');
if (!previousDist && !publicUrl && !localDist) throw new Error('Use --previous-dist=PATH, --serve-dist=PATH or --url=HTTPS_URL');
const runUI=Boolean(publicUrl||localDist);
const currentRoot = resolve(option('current-dist') || localDist || 'dist'); let servingRoot = previousDist ? resolve(previousDist) : currentRoot;
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
const navigation=new URL(baseUrl);
if(expectedAvatarDiagnostics==='true')navigation.searchParams.set('avatar-diagnostics','1');
const navigationUrl=navigation.href;
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
  await command('Page.navigate', { url:navigationUrl });
  await until(() => evaluate('Boolean(document.querySelector("#app-version")?.textContent && navigator.serviceWorker.controller)'), 'App startup timeout');
  let avatarDiagnostics=null,avatarPickerExperiment=null;
  if(expectedAvatarDiagnostics!==undefined){
    const expectedEnabled=expectedAvatarDiagnostics==='true';
    check(expectedEnabled||expectedAvatarDiagnostics==='false','expect-avatar-diagnostics must be true or false');
    const present=await evaluate('Boolean(document.querySelector("#avatar-picker-diagnostics"))');
    check(present===expectedEnabled,`Avatar diagnostics gate mismatch: expected ${expectedEnabled}, got ${present}`);
    if(expectedEnabled){
      if(expectedAvatarPickerMode!==undefined)check(['single','multiple'].includes(expectedAvatarPickerMode),'Invalid avatar picker mode');
      const pickerState=await evaluate(`(()=>{const input=document.querySelector('#person-image');return{
        mode:document.querySelector('#avatar-picker-diagnostics summary').textContent.split('·').at(-1).trim(),multiple:input.multiple};})()`);
      if(expectedAvatarPickerMode!==undefined)check(pickerState.mode===expectedAvatarPickerMode
        &&pickerState.multiple===(expectedAvatarPickerMode==='multiple'),`Avatar picker mode mismatch: ${JSON.stringify(pickerState)}`);
      await evaluate(`(()=>{document.querySelector('#people-add').click();const input=document.querySelector('#person-image');
        input.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
        input.files=new DataTransfer().files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await pause(650);
      avatarDiagnostics=await evaluate(`(()=>{const text=document.querySelector('#avatar-picker-diagnostic-log').textContent;
        const entries=text.trim().split('\\n').filter(Boolean).map(line=>JSON.parse(line));
        return{enabled:true,pickerMode:entries.at(-1)?.pickerMode,multiple:entries.at(-1)?.multiple,
          lines:entries.length,events:[...new Set(entries.map(entry=>entry.event))],
          emptyObserved:entries.some(entry=>entry.files===0),forbiddenKeys:entries.flatMap(entry=>Object.keys(entry))
            .filter(key=>['filename','name','size','type','image','password','person'].includes(key))};})()`);
      check(avatarDiagnostics.lines>0&&avatarDiagnostics.events.includes('operation-start')
        &&avatarDiagnostics.events.includes('change-handler')&&avatarDiagnostics.events.includes('selection-rejected')
        &&avatarDiagnostics.emptyObserved&&avatarDiagnostics.forbiddenKeys.length===0,
        `Avatar diagnostics smoke failed: ${JSON.stringify(avatarDiagnostics)}`);
      if(expectedAvatarPickerMode==='multiple'){
        await evaluate(`(()=>{const input=document.querySelector('#person-image'),transfer=new DataTransfer();
          transfer.items.add(new File(['not decoded'],'one.png',{type:'image/png'}));
          transfer.items.add(new File(['not decoded'],'two.png',{type:'image/png'}));
          input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await pause(50);
        const multipleRejected=await evaluate(`(()=>{const input=document.querySelector('#person-image'),text=document.querySelector('#avatar-picker-diagnostic-log').textContent;
          return{files:input.files.length,cropOpen:document.querySelector('#avatar-crop-dialog').open,
            message:document.querySelector('#person-error').textContent,errorHidden:document.querySelector('#person-error').hidden,
            rejected:text.split('\\n').filter(Boolean).map(line=>JSON.parse(line)).some(entry=>entry.event==='selection-rejected'&&entry.files===2)};})()`);
        check(multipleRejected.files===0&&!multipleRejected.cropOpen&&multipleRejected.rejected&&!multipleRejected.errorHidden
          &&multipleRejected.message==='プロフィール画像は1枚だけ選択してください。',
          `Multiple selection was not rejected: ${JSON.stringify(multipleRejected)}`);
        await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;
          canvas.getContext('2d').fillRect(0,0,8,8);const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));
          const transfer=new DataTransfer();transfer.items.add(new File([blob],'one.png',{type:'image/png'}));
          const input=document.querySelector('#person-image');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await until(()=>evaluate('document.querySelector("#avatar-crop-dialog").open'),'Multiple mode one-photo crop');
        const oneAccepted=await evaluate(`(()=>({multiple:document.querySelector('#person-image').multiple,
          cropOpen:document.querySelector('#avatar-crop-dialog').open,errorHidden:document.querySelector('#person-error').hidden}))()`);
        check(oneAccepted.multiple&&oneAccepted.cropOpen&&oneAccepted.errorHidden,
          `One-photo retry did not recover: ${JSON.stringify(oneAccepted)}`);
        await evaluate('document.querySelector("#crop-cancel").click()');
        await until(()=>evaluate('!document.querySelector("#avatar-crop-dialog").open'),'Multiple mode crop cancel');
        const afterCancel=await evaluate(`(()=>({files:document.querySelector('#person-image').files.length,
          cropOpen:document.querySelector('#avatar-crop-dialog').open}))()`);
        avatarPickerExperiment={mode:'multiple',multipleRejected,oneAccepted,afterCancel};
      }
      await evaluate('document.querySelector("#person-dialog").close()');
    }else{
      const inputMultiple=await evaluate('document.querySelector("#person-image").multiple');
      if(expectedAvatarPickerMode!==undefined)check(inputMultiple===(expectedAvatarPickerMode==='multiple'),
        `Avatar picker mode mismatch outside diagnostics: expected ${expectedAvatarPickerMode}, got ${inputMultiple}`);
      avatarDiagnostics={enabled:false,inputMultiple};
    }
  }
  let yoribiFlow = null;
  if (publicUrl && option('check-yoribi') === 'true') {
    yoribiFlow = await verifyYoribiUI({ evaluate, until, check, command });
  }
  let registrationFlow = null;
  // 明示指定時だけ、公開版の一時プロファイルに架空データを登録して操作検証する。
  if (publicUrl && option('check-registration') === 'true') {
    await command('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:true });
    registrationFlow = await verifyCalendarRegistration({ evaluate, until, check });
  }
  let upgrade = null;
  if(runUI&&option('check-backup-security')==='true')await verifyBackupSecurity({evaluate,until,check,command});
  let calendarTapsFlow=null,railManagementFlow=null;
  if(runUI&&option('check-calendar-taps')==='true')calendarTapsFlow=await verifyCalendarTaps({evaluate,until,check,command,sleep:pause});
  if(runUI&&option('check-rail-management')==='true')railManagementFlow=await verifyRailManagement({evaluate,until,check,command,sleep:pause});
  let personActionsFlow=null;
  if(runUI&&option('check-person-actions')==='true')personActionsFlow=await verifyPersonActions({evaluate,until,check,command,sleep:pause});
  let interactionFlow = null;
  if (publicUrl && option('check-interactions') === 'true') {
    await command('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:true });
    interactionFlow = await verifyCalendarInteractions({ evaluate, until, check, command, sleep:pause });
  }
  let dayListFlow = null;
  if (publicUrl && option('check-day-list') === 'true') {
    dayListFlow = await verifyDayListGestures({ evaluate, until, check, command, sleep:pause });
  }
  let homeFlow = null;
  if (publicUrl && option('check-home') === 'true') {
    homeFlow = await verifyHome({ evaluate, until, check, command });
  }
  let fontLabFlow = null;
  if (publicUrl && option('check-font-lab') === 'true') {
    fontLabFlow = await verifyFontLab({ evaluate, until, check, command });
  }
  let birthdayUIFlow=null;
  if(runUI&&option('check-birthday-ui')==='true')birthdayUIFlow=await verifyBirthdayUI({evaluate,until,check,command});
  let standardFontFlow=null;
  if(runUI&&option('check-standard-font')==='true')standardFontFlow=await verifyStandardFont({evaluate,until,check,command,errors});
  if (previousDist) {
    const previousVersion = await evaluate('document.querySelector("#app-version").textContent');
    const expectedPrevious = readFileSync(join(previousDist, 'sw.js'), 'utf8').match(/const APP_VERSION = '([^']+)'/)?.[1];
    const expectedCache = readFileSync(join(currentRoot, 'sw.js'), 'utf8').match(/CACHE_NAME = CACHE_PREFIX \+ '([^']+)'/)?.[1];
    const previousCache = readFileSync(join(previousDist, 'sw.js'), 'utf8').match(/CACHE_NAME = CACHE_PREFIX \+ '([^']+)'/)?.[1];
    check(previousVersion === expectedPrevious && expectedCache && expectedCache !== previousCache, `Unexpected prior build: ${previousVersion}`);
    await evaluate(`(async()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const field=key=>parts.find(part=>part.type===key).value;const today=field('year')+'-'+field('month')+'-'+field('day');
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d').fillRect(0,0,512,512);
      const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));const id=crypto.randomUUID();const time=new Date().toISOString();
      const db=await new Promise(done=>{const r=indexedDB.open('birthday-circle-local');r.onsuccess=()=>done(r.result);});
      const tx=db.transaction(['people','images','settings','notifications'],'readwrite');
      tx.objectStore('people').put({id,displayName:'Release test person',category:'PET',seriesName:'',memo:'Release test note',username:null,xProfileUrl:null,
        links:[{url:'https://example.com/',label:'Test link'}],hasImage:true,createdAt:time,updatedAt:time,
        anniversaries:[{type:'BIRTHDAY',month:Number(field('month')),day:Number(field('day')),year:null,showAge:false},
          {id:crypto.randomUUID(),type:'CUSTOM',title:'Test anniversary',month:Number(field('month')),day:Number(field('day')),year:2024,recurring:true,showAnniversary:true,notify:false}]});
      tx.objectStore('images').put({personId:id,type:blob.type,blob});
      tx.objectStore('settings').put({key:'language',value:'en'});
      tx.objectStore('settings').put({key:'appearance',value:{theme:'dark'}});
      tx.objectStore('settings').put({key:'notifications',value:{enabled:true,seven:false,three:true,one:false,today:true}});
      tx.objectStore('notifications').put({id:id+':'+today+':0',personId:id,birthdayDate:today,daysBefore:0,createdAt:time,readAt:time});
      await new Promise((done,fail)=>{tx.oncomplete=done;tx.onabort=()=>fail(tx.error);});db.close();})()`);
    await command('Page.reload');
    await until(() => evaluate('document.documentElement.lang === "en" && document.querySelector("#person-rail .avatar-person") !== null'), 'Old data rendering timeout');
    const before = await evaluate(snapshotExpression);
    // 旧アプリ自身の書き出し処理を使用。v1.4.2以前のZIPと
    // v1.4.3以降の暗号化.yoribiのどちらでも、新UIで実物を検証する。
    await evaluate(`(()=>{window.__oldExportURL=URL.createObjectURL;window.__oldExportClick=HTMLAnchorElement.prototype.click;
      URL.createObjectURL=function(blob){if(['application/zip','application/octet-stream'].includes(blob.type))window.__oldExportBlob=blob;return window.__oldExportURL(blob);};
      HTMLAnchorElement.prototype.click=function(){};document.querySelector('[data-tab=settings]').click();document.querySelector('#export-backup').click();})()`);
    if(await evaluate('Boolean(document.querySelector("#backup-password-dialog")?.open)')){
      await evaluate(`(()=>{document.querySelector('#backup-password').value='release-upgrade-test-password';const confirm=document.querySelector('#backup-password-confirm');if(confirm)confirm.value='release-upgrade-test-password';document.querySelector('#backup-password-dialog form').requestSubmit();})()`);
    }
    await until(()=>evaluate('Boolean(window.__oldExportBlob)'), 'Old backup export failed');
    const oldBackup=await evaluate(`(async()=>{const blob=window.__oldExportBlob,bytes=new Uint8Array(await blob.arrayBuffer());let text='';for(const byte of bytes)text+=String.fromCharCode(byte);
      URL.createObjectURL=window.__oldExportURL;HTMLAnchorElement.prototype.click=window.__oldExportClick;return {base64:btoa(text),type:blob.type,encrypted:blob.type==='application/octet-stream'};})()`);
    servingRoot = currentRoot;
    await evaluate('(async()=>{await (await navigator.serviceWorker.getRegistration()).update();})()');
    await until(() => evaluate('!document.querySelector("#update-banner").hidden'), 'Old app update detection timeout');
    await evaluate('document.querySelector("#update-later").click()');
    check(await evaluate('document.querySelector("#update-banner").hidden'), 'Later did not close banner');
    await evaluate('window.dispatchEvent(new Event("pagehide"));window.dispatchEvent(new Event("pageshow"));');
    await until(() => evaluate('!document.querySelector("#update-banner").hidden'), 'Update reminder did not return');
    const beforeNavigations = navigations;
    await evaluate('document.querySelector("#update-app").click()');
    // 旧workerへ繰り返しメッセージを送らず、まずcontrollerchange由来のnavigationを待つ。
    try { await until(() => navigations > beforeNavigations && evaluate(`(async()=>{if(!document.querySelector('#person-rail .avatar-person'))return false;
      const info=await new Promise(done=>{const c=new MessageChannel();c.port1.onmessage=e=>{c.port1.close();done(e.data);};navigator.serviceWorker.controller.postMessage({type:'CACHE_NAME'},[c.port2]);});
      return info.cacheName.endsWith('${expectedCache}')&&document.querySelector('#app-version')?.textContent==='${expectedAppVersion}';})()`), 'Upgrade timeout'); }
    catch(error) { throw new Error(JSON.stringify({message:error.message,expectedCache,errors,navigations,beforeNavigations,state:await evaluate(`(async()=>{const r=await navigator.serviceWorker.getRegistration();const info=await new Promise(done=>{const c=new MessageChannel();c.port1.onmessage=e=>done(e.data);navigator.serviceWorker.controller.postMessage({type:'CACHE_NAME'},[c.port2]);});return {title:document.title,brand:document.querySelector('.brand strong').textContent,info,waiting:r.waiting?.state,active:r.active?.state,disabled:document.querySelector('#update-app').disabled,hidden:document.querySelector('#update-banner').hidden,message:document.querySelector('#update-message').textContent};})()`)})); }
    await pause(500);
    const after = await evaluate(snapshotExpression);
    check(before.version===after.version&&JSON.stringify(before.records[0])===JSON.stringify(after.records[0])
      &&JSON.stringify(before.records[1])===JSON.stringify(after.records[1])
      &&JSON.stringify(before.records[3])===JSON.stringify(after.records[3]),'User data changed during version upgrade');
    const beforeSettings=new Map(before.records[2].map(record=>[record.key,record]));
    const afterSettings=new Map(after.records[2].map(record=>[record.key,record]));
    check([...beforeSettings].every(([key,record])=>JSON.stringify(afterSettings.get(key))===JSON.stringify(record)),
      'Existing settings changed during version upgrade');
    const addedSettings=[...afterSettings.keys()].filter(key=>!beforeSettings.has(key));
    check(addedSettings.length===1&&addedSettings[0]==='categories','Unexpected settings added during version upgrade');
    check(navigations - beforeNavigations === 1, 'Upgrade did not reload exactly once');
    check((await evaluate('window.__dataResetCalls')).length === 0, 'Upgrade called data clear/delete');
    await evaluate(`(()=>{document.querySelector('[data-tab=settings]').click();const input=document.querySelector('#import-backup'),transfer=new DataTransfer();
      const backup=${JSON.stringify(oldBackup)};transfer.items.add(new File([Uint8Array.from(atob(backup.base64),c=>c.charCodeAt(0))],backup.encrypted?'old-official.yoribi':'old-official.zip',{type:backup.type}));input.files=transfer.files;input.dispatchEvent(new Event('change'));})()`);
    if(oldBackup.encrypted){
      await until(()=>evaluate('Boolean(document.querySelector("#backup-password-dialog")?.open)'),'Encrypted old backup password dialog');
      await evaluate(`(()=>{document.querySelector('#backup-password').value='release-upgrade-test-password';document.querySelector('#backup-password-dialog form').requestSubmit();})()`);
    }
    await until(()=>evaluate('!document.querySelector("#restore-preview").hidden'),'New version rejected actual old backup');
    check(JSON.stringify(await evaluate(snapshotExpression))===JSON.stringify(after),'Old backup inspection changed data');
    upgrade = { from:previousVersion, to:expectedAppVersion, databaseVersion:after.version, people:after.records[0].length,
      images:after.records[1].length, notices:after.records[3].length, allExistingDataUnchanged:true,addedSettings,reloads:1,dataResetCalls:0,
      oldBackupType:oldBackup.encrypted?'yoribi':'zip',oldBackupValidatedInNewUI:true };
  }
  const published = await evaluate(`(async()=>{document.querySelector('[data-tab=settings]').click();
    const urls=[...document.querySelectorAll('script[src],link[rel=stylesheet],link[rel=manifest],link[rel=apple-touch-icon]')].map(node=>node.src||node.href);
    const manifest=await (await fetch(new URL('./manifest.webmanifest',document.baseURI))).json();
    urls.push(...manifest.icons.map(icon=>new URL(icon.src,document.baseURI).href));
    const statuses=await Promise.all(urls.map(async url=>(await fetch(url)).status));
    const sw=await (await fetch(new URL('./sw.js',document.baseURI),{cache:'no-store'})).text();
    const info=await new Promise(done=>{const channel=new MessageChannel();channel.port1.onmessage=event=>{channel.port1.close();done(event.data);};
      navigator.serviceWorker.controller.postMessage({type:'CACHE_NAME'},[channel.port2]);});
    const calendarImages=[...document.querySelectorAll('.calendar-event img')];await Promise.all(calendarImages.map(img=>img.decode()));
    return {version:document.querySelector('#app-version').textContent,worker:info.appVersion,workerSource:sw.match(/const APP_VERSION = '([^']+)'/)?.[1],
      calendarImages:calendarImages.length,calendarMarks:[...document.querySelectorAll('.calendar-event .event-mark')].map(node=>node.textContent),
      updateControls:!!document.querySelector('#settings-check-update'),transferGuide:!!document.querySelector('#transfer-title'),statuses};})()`);
  check(published.version === expectedAppVersion && published.worker === expectedAppVersion && published.workerSource === expectedAppVersion,
    `Version mismatch: ${JSON.stringify(published)}`);
  const previewRelease=expectedAppVersion.replace('-candidate',''),previewLabel=`v${previewRelease}候補`;
  const preview=option('check-preview')==='true'?await evaluate(`(()=>{const banner=document.querySelector('#preview-candidate-banner');
    const versions=[...document.querySelectorAll('#release-history .release-entry')].map(node=>node.dataset.version);
    return {banner:banner?.textContent.trim(),meta:document.querySelector('meta[name="yoribi-preview-version"]')?.content,
      title:document.title,officialHistoryHasCurrent:versions.includes(${JSON.stringify(APP_VERSION)}),
      officialHistoryHasUnreleasedCandidate:versions.includes(${JSON.stringify(previewRelease)})&&${JSON.stringify(previewRelease)}!==${JSON.stringify(APP_VERSION)},
      firstDate:document.querySelector('#release-history .release-entry time')?.dateTime,
      pending:document.querySelector('#release-history [data-release-key=releaseDatePending]')?.textContent.trim()};})()`):null;
  if(preview)check(preview.banner?.includes(previewLabel)&&preview.meta===expectedAppVersion
    &&preview.title.includes(previewLabel)&&preview.officialHistoryHasCurrent&&!preview.officialHistoryHasUnreleasedCandidate
    &&preview.firstDate==='2026-11-04'&&preview.pending===undefined,`Preview marker mismatch: ${JSON.stringify(preview)}`);
  check(published.updateControls && published.transferGuide && published.statuses.every((status) => status === 200), 'Published UI or assets missing');
  if (previousDist) {
    check(published.calendarImages === 1 && published.calendarMarks.includes('🎂'), 'Calendar icons missing after upgrade');
    await command('Network.emulateNetworkConditions', { offline:true, latency:0, downloadThroughput:0, uploadThroughput:0 });
    await command('Page.reload');
    await until(() => evaluate(`document.querySelector('#app-version')?.textContent === '${expectedAppVersion}' && document.querySelector('#person-rail .avatar-person') !== null`), 'Offline upgrade startup failed');
  }
  const lifecycleFlow=option('check-lifecycle')==='true'?await verifyLifecycle({evaluate,until,check,command,baseUrl}):null;
  const externalRequests = requests.filter((url) => !url.startsWith(baseUrl) && !url.startsWith('blob:') && !url.startsWith('data:'));
  check(externalRequests.length === 0, `Unexpected requests: ${JSON.stringify(externalRequests)}`);
  check(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`);
  console.log(JSON.stringify({ baseUrl, upgrade, published, preview,avatarDiagnostics,avatarPickerExperiment, yoribiFlow, registrationFlow, calendarTapsFlow, railManagementFlow, personActionsFlow, interactionFlow, dayListFlow, homeFlow, fontLabFlow, birthdayUIFlow, standardFontFlow,lifecycleFlow, offlineAfterUpgrade:!!previousDist, consoleErrors:errors.length, externalRequests:externalRequests.length }));
} finally {
  socket?.close(); child?.kill(); server?.close();
  if (profile.startsWith(resolve(tmpdir()) + sep) && profile.includes('birthday-release-smoke-')) {
    try { rmSync(profile, { recursive:true, force:true }); } catch { /* Edge解放直後は一時プロファイルが残る場合がある */ }
  }
}
