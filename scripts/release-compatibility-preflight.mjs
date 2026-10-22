import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as currentDB from '../src/db.js';
import * as currentBackup from '../src/backup.js';

// git archiveで取り出した正式版ソースとの往復試験。利用者のDB・ZIPは読みません。
const oldRoot=process.argv[2];
if(!oldRoot)throw new Error('Usage: node scripts/release-compatibility-preflight.mjs ARCHIVED_SOURCE');
const oldDB=await import(pathToFileURL(resolve(oldRoot,'src/db.js')));
const oldBackup=await import(pathToFileURL(resolve(oldRoot,'src/backup.js')));
const handles=[];
async function fresh(api){const db=await api.openDatabase('release-preflight-'+crypto.randomUUID());handles.push(db);return db;}
async function snapshot(db){
  const records=await Promise.all(currentDB.STORES.map(name=>currentDB.all(db,name)));
  records[1]=await Promise.all(records[1].map(async({personId,type,blob})=>({personId,type,
    bytes:blob.size,sha256:createHash('sha256').update(new Uint8Array(await blob.arrayBuffer())).digest('hex')})));
  return {version:db.version,records};
}
try{
  assert.equal(oldDB.DB_VERSION,3);assert.equal(currentDB.DB_VERSION,3);
  assert.equal(oldBackup.BACKUP_FORMAT_VERSION,1);assert.equal(currentBackup.BACKUP_FORMAT_VERSION,1);
  const source=await fresh(oldDB),target=await fresh(currentDB),oldTarget=await fresh(oldDB);
  const image=new Blob([readFileSync('public/icons/favicon-48.png')],{type:'image/png'});
  const person=await oldDB.savePerson(source,{displayName:'架空の互換性テスト',category:'REAL_FRIEND',memo:'架空メモ',
    links:[{url:'https://example.com/',label:'架空リンク'}],
    anniversaries:[{type:'BIRTHDAY',month:2,day:29,year:2000,showAge:true,calendarOrder:2},
      {type:'CUSTOM',title:'架空の記念日',month:2,day:29,year:2024,recurring:true,showAnniversary:true,notify:true,calendarOrder:1},
      {type:'CUSTOM',title:'架空の単発予定',month:12,day:31,year:2028,recurring:false,notify:false}]},{image});
  await oldDB.savePerson(source,{displayName:'架空の誕生日未登録',category:'OTHER',anniversaries:[]});
  await oldDB.saveLanguage(source,'en');await oldDB.saveAppearance(source,{theme:'dark'});
  await oldDB.saveSettings(source,{enabled:true,seven:true,three:false,one:true,today:true});
  const oldNotices=await import(pathToFileURL(resolve(oldRoot,'src/notifications.js')));
  await oldNotices.synchronizeNotifications(source,'2028-02-22');
  await oldDB.markAllRead(source,'2028-02-22T00:00:00.000Z');
  const initial=await snapshot(source);
  assert.ok(initial.records[3].length>0);
  const oldZIP=await oldBackup.createBackup(source);
  const preview=await currentBackup.inspectBackup(oldZIP);
  assert.equal(preview.manifest.appVersion,oldBackup.APP_VERSION);
  assert.deepEqual(await snapshot(source),initial,'Inspection must not mutate source');
  await currentDB.savePerson(target,{displayName:'移行先だけの架空人物',category:'OTHER',anniversaries:[]});
  await currentBackup.restoreBackup(target,preview);
  assert.deepEqual(await snapshot(target),initial,'Official ZIP to current must retain all four stores and image bytes');
  assert.equal((await currentDB.get(target,'people',person.id)).category,'REAL_FRIEND');
  const currentZIP=await currentBackup.createBackup(target);
  assert.equal((await currentBackup.inspectBackup(currentZIP)).manifest.appVersion,currentBackup.APP_VERSION);
  await oldBackup.restoreBackup(oldTarget,await oldBackup.inspectBackup(currentZIP));
  assert.deepEqual(await snapshot(oldTarget),initial,'Common-range current ZIP to official must retain data');
  const reverseLimits=[];
  for(const year of [100,9999]){
    await currentDB.savePerson(target,{...await currentDB.get(target,'people',person.id),anniversaries:[
      {type:'BIRTHDAY',month:2,day:28,year,showAge:true}]});
    const backup=await currentBackup.createBackup(target);
    await currentBackup.inspectBackup(backup);
    const before=await snapshot(oldTarget);
    await assert.rejects(oldBackup.inspectBackup(backup));
    assert.deepEqual(await snapshot(oldTarget),before,'Unsupported ZIP must not mutate old target');
    reverseLimits.push({year,currentAccepts:true,officialRejects:true,oldDataPreserved:true});
  }
  console.log(JSON.stringify({officialToCurrent:true,currentToOfficialWithinOldYearRange:true,
    fromAppVersion:oldBackup.APP_VERSION,toAppVersion:currentBackup.APP_VERSION,
    databaseVersion:3,backupFormatVersion:1,people:initial.records[0].length,images:initial.records[1].length,
    notifications:initial.records[3].length,theme:'dark',language:'en',categoryUnchanged:true,
    anniversariesAndOrder:true,imageSHA256Unchanged:true,fullyReplacedDestination:true,reverseLimits}));
}finally{for(const db of handles)db.close();}
