import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../',import.meta.url)),root=resolve(process.argv[2]||'');
const versionArgument=process.argv.find(value=>value.startsWith('--expected-version='));
if(!root.startsWith(join(source,'test-artifacts')+sep))throw Error('Preview must be inside ignored test-artifacts');
const record=JSON.parse(await readFile(join(root,'PREVIEW.json'),'utf8'));
const expectedVersion=versionArgument?.slice('--expected-version='.length)||record.appVersion;
if(!/^\d+\.\d+\.\d+-candidate$/.test(expectedVersion))throw Error('Expected version must use x.y.z-candidate');
const expectedLabel=`v${expectedVersion.replace('-candidate','')}候補`;
const expected=record.files.map(f=>'site/'+f.path).concat(['PREVIEW.json','.github/workflows/pages.yml','.gitattributes']).sort();
async function walk(dir){const items=[];for(const item of await readdir(dir,{withFileTypes:true})){
  if(dir===root&&item.name==='.git')continue;
  const path=join(dir,item.name);if(item.isDirectory())items.push(...await walk(path));
  else if(item.isFile())items.push(relative(root,path).split(sep).join('/'));else throw Error('Non-regular file');
}return items.sort();}
function check(value,message){if(!value)throw Error(message);}
check(JSON.stringify(await walk(root))===JSON.stringify(expected),'Unexpected repository file');
for(const item of record.files){
  check(!item.path.includes('..')&&!item.path.startsWith('/'),'Invalid asset path');
  const bytes=await readFile(join(root,'site',item.path));
  check(bytes.length===item.bytes&&createHash('sha256').update(bytes).digest('hex')===item.sha256,'Checksum mismatch '+item.path);
  const original=await readFile(join(source,'dist',item.path));
  if(!['index.html','manifest.webmanifest','sw.js'].includes(item.path))check(bytes.equals(original),'Unexpected application change '+item.path);
}
for(const path of expected.filter(p=>!p.endsWith('.ttf')&&!p.endsWith('.png'))){
  const text=await readFile(join(root,path),'utf8');
  check(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|jdbc:postgresql:|[A-Z]:\\(?:Users|プログラミング)\\|__font-lab|Yoribi Font Lab/.test(text),'Forbidden public content '+path);
}
const manifest=JSON.parse(await readFile(join(root,'site/manifest.webmanifest'),'utf8'));
check(manifest.name==='Yoribi テスト'&&manifest.short_name==='Yoribi テスト'&&manifest.scope==='./'&&manifest.start_url==='./'&&manifest.id==='./','Preview manifest');
const html=await readFile(join(root,'site/index.html'),'utf8');
check(html.includes('name="apple-mobile-web-app-title" content="Yoribi テスト"'),'Apple preview name');
check(html.includes(`name="yoribi-preview-version" content="${expectedVersion}"`)
  &&html.includes(`name="yoribi-preview-title" content="Yoribi テスト · ${expectedLabel}"`)
  && html.includes('id="preview-candidate-banner"')&&html.includes(expectedLabel),'Candidate marker');
const sw=await readFile(join(root,'site/sw.js'),'utf8');
check(!sw.includes('indexedDB'),'Worker must not touch user database');
check(sw.includes(`const APP_VERSION = '${expectedVersion}'`),'Candidate worker version');
check(JSON.stringify(JSON.parse(sw.match(/const PRECACHE = (\[[^;]+\]);/)[1]).map(p=>p.slice(2)).sort())===JSON.stringify(record.files.map(f=>f.path).filter(p=>p!=='sw.js').sort()),'Preview cache list');
const workflow=await readFile(join(root,'.github/workflows/pages.yml'),'utf8');
check(workflow.includes('workflow_dispatch:')&&!/^\s*(push|pull_request|schedule):/m.test(workflow)&&workflow.includes("github.repository_owner != 'naminoto'")&&workflow.includes('YORIBI_PREVIEW_OWNER'),'Manual deployment/owner guard');
check((workflow.match(/runs-on: ubuntu-24\.04/g)??[]).length===2&&!workflow.includes('ubuntu-latest')
  &&workflow.includes('actions/checkout@v5')&&workflow.includes('actions/configure-pages@v6')
  &&workflow.includes('actions/upload-pages-artifact@v5')&&workflow.includes('actions/deploy-pages@v5'),
  'Pinned runner and Node 24 Pages actions');
check(record.previewOwner==='yoribi-preview'&&record.previewUrl==='https://yoribi-preview.github.io/yoribi-test/','Unapproved target');
check(record.sourceVersion===expectedVersion.replace('-candidate','')&&record.appVersion===expectedVersion&&record.releaseChannel==='candidate'
  &&record.officialRelease===false&&record.compatibility?.indexedDBVersion===3&&record.compatibility?.zipFormatVersion===2
  &&JSON.stringify(record.compatibility?.restoresZipFormatVersions)==='[0,1,2]','Candidate metadata');
check(typeof record.avatarDiagnostics==='boolean','Diagnostics metadata missing');
check(record.candidateChanges?.includes('Preview-only avatar picker event diagnostics')===record.avatarDiagnostics,'Diagnostics metadata mismatch');
check(record.candidateChanges?.includes('Custom category add, rename, color and transactional reassignment on delete'),'Category metadata');
check(record.candidateChanges?.includes('Create and select custom categories inside the person add and edit form without losing drafts'),'Inline category metadata');
check(record.candidateChanges?.includes('Custom categories keep creation order and Other is always last'),'Category order metadata');
check(record.candidateChanges?.includes('Animated bottom navigation indicator with a one-person to two-person icon transition'),'Navigation motion metadata');
check(record.candidateChanges?.includes('Synchronized month-day and inline birthday calendar editing without leaving the person form'),'Birthday calendar metadata');
check(record.candidateChanges?.includes('Overlay category filters for the calendar and independent person management filtering'),'Filter popover metadata');
check(record.candidateChanges?.includes('Birthday input mode switching preserves values without opening the native month picker'),'Birthday focus metadata');
check(record.candidateChanges?.includes('Person rail controls are ordered as sort, category filter and registration filter without a duplicate sort menu item'),'Rail layout metadata');
check(record.candidateChanges?.includes('Home, calendar, birthday and settings navigation icons use settled internal-part animations'),'Navigation shape metadata');
check(record.candidateChanges?.includes('People silhouettes keep separated shoulder contours and the settings gear is rotationally symmetric'),'Navigation geometry metadata');
check(record.candidateChanges?.includes('Menus and category popovers close on same-trigger retap and are mutually exclusive'),'Popup behavior metadata');
check(record.candidateChanges?.includes('Fixed UI text resists accidental touch selection while inputs, notes and profile links remain selectable'),'Touch selection metadata');
check(record.candidateChanges?.includes('In-app bulk delete confirmation with filtered selection safety'),'Bulk delete metadata');
check(record.candidateChanges?.includes('Removed the duplicate header settings button while preserving bottom navigation'),'Header settings metadata');
const appScript=record.files.find(file=>/^assets\/index-[A-Za-z0-9_-]+\.js$/.test(file.path));
check(appScript,'Application script missing');
const appCode=await readFile(join(root,'site',appScript.path),'utf8');
check(appCode.includes('yoribi-preview-version')&&appCode.includes('プロフィール画像は1枚だけ選択してください。')
  &&appCode.includes('カテゴリ管理')&&appCode.includes('XプロフィールURLを入力してusernameを空欄にすると')
  &&appCode.includes('新しいカテゴリを作成')&&appCode.includes('Create and select')
  &&appCode.includes('bottom-nav-indicator')&&appCode.includes('nav-icon-person-secondary')
  &&appCode.includes('nav-icon-home-detail')&&appCode.includes('nav-icon-calendar-detail')
  &&appCode.includes('nav-icon-birthday-flame')&&appCode.includes('nav-icon-gear')
  &&appCode.includes('birthday-calendar-grid')&&appCode.includes('rail-category-popover')
  &&appCode.includes('bulkDeleteDialogDescription')&&!appCode.includes('header-settings'),'Preview feature missing');
const diagnosticSignals=['avatar-diagnostics','avatar-picker-diagnostic-log','写真選択診断（端末内のみ）','診断ログをコピー'];
check(diagnosticSignals.every(signal=>appCode.includes(signal)===record.avatarDiagnostics),'Diagnostics bundle state mismatch');
check(/version:'1\.4\.3',date:'2026-11-04'/.test(await readFile(join(source,'src/release-history.js'),'utf8')),'Published production release history missing');
console.log(JSON.stringify({audit:'PASS',repositoryFiles:expected.length,siteFiles:record.files.length,previewName:manifest.name,
  sourceVersion:record.sourceVersion,appVersion:record.appVersion,avatarDiagnostics:record.avatarDiagnostics,manualOnly:true,noUserData:true}));
