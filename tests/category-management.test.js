import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {all,createCustomCategory,deleteCustomCategory,ensureCategoryConfig,loadCategoryConfig,openDatabase,renameCategory,
  savePerson,updateCategoryColor,updateCategoryVisibility} from '../src/db.js';
import {categoryDefinitions,visibleCategoryIds} from '../src/categories.js';
import {createBackup,inspectBackup,restoreBackup,BACKUP_FORMAT_VERSION} from '../src/backup.js';
import {decryptBackup,encryptBackup} from '../src/encrypted-backup.js';

async function fixture(){return openDatabase(`category-${crypto.randomUUID()}`);}

test('旧DBへ既定カテゴリ設定をDB v3のまま一度だけ保存する',async()=>{
  const db=await fixture();try{
    assert.equal((await all(db,'settings')).filter(row=>row.key==='categories').length,0);
    const first=await ensureCategoryConfig(db),second=await ensureCategoryConfig(db);
    assert.deepEqual(second,first);assert.equal((await all(db,'settings')).filter(row=>row.key==='categories').length,1);
    assert.equal(categoryDefinitions(first).length,8);assert.equal(db.version,3);
  }finally{db.close();}
});

test('DB v3のsettings storeでカスタムカテゴリ・色・表示設定を永続化する',async()=>{
  const db=await fixture();try{
    let config=await loadCategoryConfig(db);assert.equal(categoryDefinitions(config).length,8);
    config=await createCustomCategory(db,'推し','#123456');const id=config.custom[0].id;
    await savePerson(db,{displayName:'架空の人物',category:id,anniversaries:[],links:[]});
    config=await renameCategory(db,id,'創作仲間');config=await updateCategoryColor(db,id,'#abcdef');
    config=await updateCategoryVisibility(db,id,true);
    const custom=categoryDefinitions(config).find((entry)=>entry.id===id);
    assert.equal((await all(db,'people'))[0].category,id);assert.equal(custom.name,'創作仲間');
    assert.equal(custom.color,'#abcdef');assert(!visibleCategoryIds(config).includes(id));assert.equal(db.version,3);
  }finally{db.close();}
});

test('使用中カテゴリは移動先なしで削除できず、指定時は人物移動と削除を原子的に行う',async()=>{
  const db=await fixture();try{
    const config=await createCustomCategory(db,'学校関係','#445566'),id=config.custom[0].id;
    const person=await savePerson(db,{displayName:'架空の学生',category:id,anniversaries:[],links:[]});
    await assert.rejects(deleteCustomCategory(db,id));
    assert.equal((await all(db,'people'))[0].category,id);assert.equal((await loadCategoryConfig(db)).custom.length,1);
    const result=await deleteCustomCategory(db,id,'REAL_FRIEND');assert.equal(result.moved,1);
    assert.equal((await all(db,'people')).find((entry)=>entry.id===person.id).category,'REAL_FRIEND');
    assert.equal((await loadCategoryConfig(db)).custom.length,0);
  }finally{db.close();}
});

test('固定カテゴリは削除できず人物と設定を保持する',async()=>{
  const db=await fixture();try{
    await savePerson(db,{displayName:'架空の家族',category:'FAMILY_RELATIVE',anniversaries:[],links:[]});
    await assert.rejects(deleteCustomCategory(db,'FAMILY_RELATIVE','OTHER'));
    assert.equal((await all(db,'people'))[0].category,'FAMILY_RELATIVE');assert.equal(categoryDefinitions(await loadCategoryConfig(db)).length,8);
  }finally{db.close();}
});

test('人物編集中のカテゴリ作成だけでは人物を更新せず、明示保存時だけカテゴリを変更する',async()=>{
  const db=await fixture();try{
    const person=await savePerson(db,{displayName:'編集中の架空人物',category:'OTHER',memo:'未保存の内容',anniversaries:[],links:[]});
    const config=await createCustomCategory(db,'フォーム内作成','#7c3aed'),id=config.custom[0].id;
    const before=(await all(db,'people')).find((entry)=>entry.id===person.id);
    assert.equal(before.category,'OTHER');assert.equal(before.memo,'未保存の内容');
    await savePerson(db,{...before,category:id,memo:'保存後の内容'});
    const after=(await all(db,'people')).find((entry)=>entry.id===person.id);
    assert.equal(after.category,id);assert.equal(after.memo,'保存後の内容');
  }finally{db.close();}
});

test('カスタムカテゴリ・色・人物関連はZIP v2と暗号化yoribiで完全復元する',async()=>{
  const source=await fixture(),target=await fixture();try{
    let config=await createCustomCategory(source,'ゲーム仲間','#0f766e'),id=config.custom[0].id;
    config=await updateCategoryVisibility(source,id,true);
    await savePerson(source,{displayName:'架空のフレンド',category:id,anniversaries:[],links:[]});
    const zip=await createBackup(source),prepared=await inspectBackup(zip);assert.equal(BACKUP_FORMAT_VERSION,2);
    assert.equal(prepared.snapshot.categories.custom[0].name,'ゲーム仲間');
    const encrypted=await encryptBackup(zip,'category test password 123'),decrypted=await decryptBackup(encrypted,'category test password 123');
    await restoreBackup(target,await inspectBackup(decrypted));
    assert.equal((await all(target,'people'))[0].category,id);
    const restored=await loadCategoryConfig(target);
    assert.equal(categoryDefinitions(restored).find((entry)=>entry.id===id).color,'#0f766e');assert(!visibleCategoryIds(restored).includes(id));
  }finally{source.close();target.close();}
});
