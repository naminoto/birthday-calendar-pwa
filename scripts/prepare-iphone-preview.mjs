// ローカル準備のみ。Git/GitHub API/ネットワークは呼ばず、監査済みdistだけをまとめる。
import {execFileSync} from 'node:child_process';
import {readFile,readdir,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=join(root,'dist');
execFileSync(process.execPath,[join(root,'scripts/audit-dist.mjs')],{cwd:root,stdio:'inherit'});
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
await writeFile(htmlPath,html.replace('name="apple-mobile-web-app-title" content="Yoribi"','name="apple-mobile-web-app-title" content="Yoribi テスト"').replace('<title>Yoribi</title>','<title>Yoribi テスト</title>'));
const version=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
// 同じSWテンプレートで、テスト版のHTML/manifestを含む内容ハッシュを作る。
const assets=(await walk(site)).filter(path=>relative(site,path)!=='sw.js');
const hash=createHash('sha256');
for(const file of assets){hash.update(relative(site,file));hash.update(await readFile(file));}
const worker=(await readFile(join(root,'src','sw-template.js'),'utf8'))
  .replace('__CACHE_VERSION__',hash.digest('hex').slice(0,16)).replace('__APP_VERSION__',version)
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
  purpose:'Isolated iPhone preview; NOT published',createdAt:new Date().toISOString(),appVersion:version,
  productionOrigin:'https://naminoto.github.io',previewOwner:'yoribi-preview',previewUrl:'https://yoribi-preview.github.io/yoribi-test/',
  requiresApproval:true,files,
},null,2)+'\n');
console.log(JSON.stringify({preparedOnly:true,published:false,output:target,appVersion:version,
  siteFiles:files.length,siteBytes:files.reduce((sum,file)=>sum+file.bytes,0),next:'Read docs/iphone-preflight.md; approval required before GitHub actions'},null,2));
