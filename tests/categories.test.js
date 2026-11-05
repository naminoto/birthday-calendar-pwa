import test from 'node:test';
import assert from 'node:assert/strict';
import {addCustomCategory,categoryDefinitions,normalizeCategoryConfig,removeCustomCategory,
  renameCustomCategory,setCategoryColor,setCategoryHidden,visibleCategoryIds} from '../src/categories.js';
import {calendarEvents} from '../src/model.js';

const id='CUSTOM_00000000-0000-4000-8000-000000000001';

test('初期8カテゴリは固定IDと日英表示を持つ',()=>{
  const ja=categoryDefinitions({},'ja'),en=categoryDefinitions({},'en');
  assert.equal(ja.length,8);assert.deepEqual(ja.map((entry)=>entry.name),[
    'SNSの友だち','友だち・知り合い','家族・親族','配信者・VTuber','芸能人・著名人','キャラクター','ペット','その他']);
  assert.deepEqual(en.map((entry)=>entry.name),[
    'SNS Friends','Friends & Acquaintances','Family & Relatives','Streamers & VTubers',
    'Celebrities & Public Figures','Fictional Characters','Pets','Other']);
  assert.deepEqual(ja.map((entry)=>entry.id).slice(0,2),['X_FRIEND','REAL_FRIEND']);
});

test('カスタムカテゴリを追加・改名・色変更・削除できる',()=>{
  let config=addCustomCategory({},'  推し  ','#123456',id);
  assert.deepEqual(config.custom,[{id,name:'推し'}]);
  config=renameCustomCategory(config,id,'仕事関係');
  config=setCategoryColor(config,id,'#AABBCC');
  const custom=categoryDefinitions(config).find((entry)=>entry.id===id);
  assert.equal(custom.name,'仕事関係');
  assert.equal(custom.color,'#aabbcc');
  assert.equal(removeCustomCategory(config,id).custom.length,0);
});

test('カスタムカテゴリは作成順で並び、その他は日英とも常に最後になる',()=>{
  const second='CUSTOM_00000000-0000-4000-8000-000000000002';
  let config=addCustomCategory({},'最初','#123456',id);
  config=addCustomCategory(config,'次','#654321',second);
  for(const language of ['ja','en']){
    const definitions=categoryDefinitions(config,language);
    assert.deepEqual(definitions.slice(-3).map((entry)=>entry.id),[id,second,'OTHER']);
    assert.equal(definitions.at(-1).name,language==='en'?'Other':'その他');
  }
});

test('カテゴリ名の空欄・長さ・固定名またはカスタム名との重複を拒否する',()=>{
  assert.throws(()=>addCustomCategory({},' ',undefined,id));
  assert.throws(()=>addCustomCategory({},'a'.repeat(41),undefined,id));
  assert.throws(()=>addCustomCategory({},'SNS Friends',undefined,id));
  const config=addCustomCategory({},'推し',undefined,id);
  assert.throws(()=>addCustomCategory(config,' 推し ',undefined,'CUSTOM_00000000-0000-4000-8000-000000000002'));
  assert.equal(normalizeCategoryConfig({custom:[{id,name:'<script>alert(1)</script>'}],colors:{},hiddenCategoryIds:[]}).custom[0].name,
    '<script>alert(1)</script>');
});

test('カテゴリ表示設定は複数カテゴリを独立して切り替える',()=>{
  let config=setCategoryHidden({},'PET',true);
  config=setCategoryHidden(config,'CHARACTER',true);
  assert(!visibleCategoryIds(config).includes('PET'));assert(!visibleCategoryIds(config).includes('CHARACTER'));
  config=setCategoryHidden(config,'PET',false);assert(visibleCategoryIds(config).includes('PET'));
});

test('カレンダーは複数カテゴリを同時に表示できる',()=>{
  const people=['X_FRIEND','FAMILY_RELATIVE','PET'].map((category,index)=>({id:String(index),displayName:category,category,
    anniversaries:[{type:'BIRTHDAY',month:5,day:10,year:null}]}));
  const events=calendarEvents(people,2028,5,['X_FRIEND','PET']).get('2028-05-10');
  assert.deepEqual(events.map((entry)=>entry.person.category),['X_FRIEND','PET']);
});
