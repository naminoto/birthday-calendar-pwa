// ローカル準備のみ。Git/GitHub API/ネットワークは呼ばず、監査済みdistだけをまとめる。
import {execFileSync} from 'node:child_process';
import {readFile,readdir,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=join(root,'dist');
const sourceVersion=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const versionArgument=process.argv.find(value=>value.startsWith('--preview-version='));
const candidateVersion=versionArgument?.slice('--preview-version='.length)||`${sourceVersion}-candidate`;
if(!/^\d+\.\d+\.\d+-candidate$/.test(candidateVersion))throw Error('Preview version must use x.y.z-candidate');
const candidateRelease=candidateVersion.replace('-candidate',''),candidateLabel=`v${candidateRelease}候補`;
const avatarDiagnostics=process.argv.includes('--avatar-diagnostics');
// 既定は診断なしの正式候補build。明示フラグ時だけ診断buildを許可する。
execFileSync(process.execPath,[join(root,'scripts/audit-dist.mjs'),...(avatarDiagnostics?['--allow-avatar-diagnostics']:[])],{cwd:root,stdio:'inherit'});
async function walk(dir){
  const files=[];
  for(const item of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,item.name);
    if(item.isDirectory())files.push(...await walk(path));
    else if(item.isFile())files.push(path);
    else throw Error('Only regular audited files are allowed');
  }return files.sort();
}
const target=join(root,'test-artifacts',`iphone-preview-${randomUUID()}`);
await mkdir(join(target,'site'),{recursive:true});
for(const file of await walk(dist)){
  const name=relative(dist,file),bytes=await readFile(file),dest=join(target,'site',name);
  await mkdir(dirname(dest),{recursive:true});await copyFile(file,dest);
  if(!(await readFile(dest)).equals(bytes))throw Error('Preview copy mismatch');
}
// 正式版distは変更せず、コピーしたテスト版だけをホーム画面で区別する。
const site=join(target,'site');
const manifestPath=join(site,'manifest.webmanifest');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
manifest.name='Yoribi テスト';manifest.short_name='Yoribi テスト';
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const htmlPath=join(site,'index.html');
const html=await readFile(htmlPath,'utf8');
if(!html.includes('name="apple-mobile-web-app-title" content="Yoribi"'))throw Error('Unexpected Apple title');
const previewBanner=`<div class="update-banner" id="preview-candidate-banner" role="status"><span><strong>テスト版 / Test build</strong> · ${candidateLabel}</span></div>`;
await writeFile(htmlPath,html
  .replace('<meta name="referrer" content="no-referrer">',`<meta name="referrer" content="no-referrer">\n  <meta name="yoribi-preview-version" content="${candidateVersion}">`)
  .replace(`<meta name="yoribi-preview-version" content="${candidateVersion}">`,`<meta name="yoribi-preview-version" content="${candidateVersion}">\n  <meta name="yoribi-preview-title" content="Yoribi テスト · ${candidateLabel}">`)
  .replace('name="apple-mobile-web-app-title" content="Yoribi"','name="apple-mobile-web-app-title" content="Yoribi テスト"')
  .replace('<title>Yoribi</title>',`<title>Yoribi テスト · ${candidateLabel}</title>`)
  .replace('<div class="app-shell">',`<div class="app-shell">\n    ${previewBanner}`));
// 同じSWテンプレートで、テスト版のHTML/manifestを含む内容ハッシュを作る。
const assets=(await walk(site)).filter(path=>relative(site,path)!=='sw.js');
const hash=createHash('sha256');
for(const file of assets){hash.update(relative(site,file));hash.update(await readFile(file));}
const worker=(await readFile(join(root,'src','sw-template.js'),'utf8'))
  .replace('__CACHE_VERSION__',hash.digest('hex').slice(0,16)).replace('__APP_VERSION__',candidateVersion)
  .replace('__PRECACHE_JSON__',JSON.stringify(assets.map(file=>'./'+relative(site,file).replaceAll('\\','/'))));
await writeFile(join(site,'sw.js'),worker);
const files=[];
for(const file of await walk(site)){
  const bytes=await readFile(file);files.push({path:relative(site,file).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const workflow=join(target,'.github','workflows','pages.yml');await mkdir(dirname(workflow),{recursive:true});
await copyFile(join(root,'docs','preview-pages.workflow.yml'),workflow);
// 配布物・OFL原文・SHA-256を、別OSのGit checkoutでも改行変換から保護する。
await writeFile(join(target,'.gitattributes'),'* -text\n');
await writeFile(join(target,'PREVIEW.json'),JSON.stringify({
  purpose:'Isolated iPhone preview; NOT published',createdAt:new Date().toISOString(),sourceVersion,
  appVersion:candidateVersion,releaseChannel:'candidate',officialRelease:false,
  avatarDiagnostics,
  productionOrigin:'https://naminoto.github.io',previewOwner:'yoribi-preview',previewUrl:'https://yoribi-preview.github.io/yoribi-test/',
  requiresApproval:true,
  candidateChanges:['Eight built-in categories with stable identifiers','Custom category add, rename, color and transactional reassignment on delete',
    'Create and select custom categories inside the person add and edit form without losing drafts',
    'Custom categories keep creation order and Other is always last',
    'Animated bottom navigation indicator with a one-person to two-person icon transition',
    'Synchronized month-day and inline birthday calendar editing without leaving the person form',
    'Overlay category filters for the calendar and independent person management filtering',
    'Birthday input mode switching preserves values without opening the native month picker',
    'Person rail controls are ordered as sort, category filter and registration filter without a duplicate sort menu item',
    'Home, calendar, birthday and settings navigation icons use settled internal-part animations',
    'People silhouettes keep separated shoulder contours and the settings gear is rotationally symmetric',
    'Menus and category popovers close on same-trigger retap and are mutually exclusive',
    'Fixed UI text resists accidental touch selection while inputs, notes and profile links remain selectable',
    'In-app bulk delete confirmation with filtered selection safety',
    'Removed the duplicate header settings button while preserving bottom navigation',
    'Multi-category calendar visibility controls','Category backup format v2 with v0/v1 restore compatibility',
    'X profile URL username auto-fill guidance',
    ...(avatarDiagnostics?['Preview-only avatar picker event diagnostics']:[]),
    'Existing v1.4.3 encrypted backup, photo picker and Password AutoFill-safe password preview features'],
  compatibility:{indexedDBVersion:3,zipFormatVersion:2,restoresZipFormatVersions:[0,1,2],productionUnchanged:true},files,
},null,2)+'\n');
console.log(JSON.stringify({preparedOnly:true,published:false,output:target,sourceVersion,appVersion:candidateVersion,
  avatarDiagnostics,siteFiles:files.length,siteBytes:files.reduce((sum,file)=>sum+file.bytes,0),next:'Read docs/iphone-preflight.md; approval required before GitHub actions'},null,2));
