import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../',import.meta.url)),root=resolve(process.argv[2]||'');
if(!root.startsWith(join(source,'test-artifacts')+sep))throw Error('Preview must be inside ignored test-artifacts');
const record=JSON.parse(await readFile(join(root,'PREVIEW.json'),'utf8'));
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
check(html.includes('name="yoribi-preview-version" content="1.4.3-candidate"')
  &&html.includes('name="yoribi-preview-title" content="Yoribi テスト · v1.4.3候補"')
  && html.includes('id="preview-candidate-banner"')&&html.includes('v1.4.3候補'),'Candidate marker');
const sw=await readFile(join(root,'site/sw.js'),'utf8');
check(!sw.includes('indexedDB'),'Worker must not touch user database');
check(sw.includes("const APP_VERSION = '1.4.3-candidate'"),'Candidate worker version');
check(JSON.stringify(JSON.parse(sw.match(/const PRECACHE = (\[[^;]+\]);/)[1]).map(p=>p.slice(2)).sort())===JSON.stringify(record.files.map(f=>f.path).filter(p=>p!=='sw.js').sort()),'Preview cache list');
const workflow=await readFile(join(root,'.github/workflows/pages.yml'),'utf8');
check(workflow.includes('workflow_dispatch:')&&!/^\s*(push|pull_request|schedule):/m.test(workflow)&&workflow.includes("github.repository_owner != 'naminoto'")&&workflow.includes('YORIBI_PREVIEW_OWNER'),'Manual deployment/owner guard');
check(record.previewOwner==='yoribi-preview'&&record.previewUrl==='https://yoribi-preview.github.io/yoribi-test/','Unapproved target');
check(record.sourceVersion==='1.4.3'&&record.appVersion==='1.4.3-candidate'&&record.releaseChannel==='candidate'
  &&record.officialRelease===false&&record.compatibility?.indexedDBVersion===3&&record.compatibility?.zipFormatVersion===1,'Candidate metadata');
check(typeof record.avatarDiagnostics==='boolean','Diagnostics metadata missing');
check(record.candidateChanges?.includes('Preview-only avatar picker event diagnostics')===record.avatarDiagnostics,'Diagnostics metadata mismatch');
check(record.candidateChanges?.includes('iPhone multiple photo picker with exactly-one selection safeguard'),'Picker safeguard metadata');
const appScript=record.files.find(file=>/^assets\/index-[A-Za-z0-9_-]+\.js$/.test(file.path));
check(appScript,'Application script missing');
const appCode=await readFile(join(root,'site',appScript.path),'utf8');
check(appCode.includes('yoribi-preview-version')&&appCode.includes('プロフィール画像は1枚だけ選択してください。'),'Preview marker or picker safeguard missing');
const diagnosticSignals=['avatar-diagnostics','avatar-picker-diagnostic-log','写真選択診断（端末内のみ）','診断ログをコピー'];
check(diagnosticSignals.every(signal=>appCode.includes(signal)===record.avatarDiagnostics),'Diagnostics bundle state mismatch');
check(/version:'1\.4\.3',date:null/.test(await readFile(join(source,'src/release-history.js'),'utf8')),'Pending production release history missing');
console.log(JSON.stringify({audit:'PASS',repositoryFiles:expected.length,siteFiles:record.files.length,previewName:manifest.name,
  sourceVersion:record.sourceVersion,appVersion:record.appVersion,avatarDiagnostics:record.avatarDiagnostics,manualOnly:true,noUserData:true}));
