// 人物フォームを閉じずにカテゴリを作成し、入力と保存境界を使い捨てDBで確認する。
export async function verifyPersonCategoryCreate({evaluate,until,check,command}){
  const store=name=>evaluate(`new Promise((done,fail)=>{const r=indexedDB.open('birthday-circle-local');r.onerror=()=>fail(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction(${JSON.stringify(name)}).objectStore(${JSON.stringify(name)}).getAll();q.onerror=()=>fail(q.error);q.onsuccess=()=>{db.close();done(q.result);};};})`);
  check((await store('people')).length===0,'人物フォーム内カテゴリ検証は空の一時DBでのみ実行します。');
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`(()=>{document.querySelector('[data-tab=people]').click();document.querySelector('#people-add').click();
    document.querySelector('#person-name').value='フォーム途中入力';document.querySelector('#person-series').value='架空の所属';
    document.querySelector('#person-username').value='inline_category';document.querySelector('#person-x-url').value='https://x.com/inline_category';
    document.querySelector('#person-birth-month').value='6';document.querySelector('#person-birth-month').dispatchEvent(new Event('change'));
    document.querySelector('#person-birth-day').value='15';document.querySelector('#person-memo').value='作成ダイアログ前のメモ';
    document.querySelector('#add-anniversary').click();const ann=document.querySelector('#anniversary-fields .repeat-row');
    ann.querySelector('.ann-title').value='架空の記念日';ann.querySelector('.ann-month').value='7';ann.querySelector('.ann-month').dispatchEvent(new Event('change'));ann.querySelector('.ann-day').value='20';
    document.querySelector('#add-link').click();const link=document.querySelector('#link-fields .repeat-row');link.querySelector('.link-url').value='https://example.com/profile';link.querySelector('.link-label').value='例';
    const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array([1,2,3])],'pending.png',{type:'image/png'}));document.querySelector('#person-image').files=transfer.files;
    document.querySelector('#person-form').scrollTop=180;})()`);
  const formSnapshot=`(()=>({name:document.querySelector('#person-name').value,series:document.querySelector('#person-series').value,
    username:document.querySelector('#person-username').value,xUrl:document.querySelector('#person-x-url').value,
    month:document.querySelector('#person-birth-month').value,day:document.querySelector('#person-birth-day').value,memo:document.querySelector('#person-memo').value,
    anniversaries:document.querySelectorAll('#anniversary-fields .repeat-row').length,links:document.querySelectorAll('#link-fields .repeat-row').length,
    files:document.querySelector('#person-image').files.length,scroll:document.querySelector('#person-form').scrollTop,category:document.querySelector('#person-category').value}))()`;
  const before=await evaluate(formSnapshot);
  await evaluate(`document.querySelector('#person-category-create').click()`);
  check(await evaluate(`document.querySelector('#person-dialog').open&&document.querySelector('#person-category-create-dialog').open&&document.querySelectorAll('dialog[open]').length===2`),'人物フォーム上にカテゴリ作成ダイアログが開きません。');
  await evaluate(`document.querySelector('#person-category-create-cancel').click()`);
  await until(()=>evaluate(`!document.querySelector('#person-category-create-dialog').open`),'カテゴリ作成キャンセル');
  check(JSON.stringify(await evaluate(formSnapshot))===JSON.stringify(before),'カテゴリ作成キャンセルで人物入力が変化しました。');
  check((await store('settings')).find((row)=>row.key==='categories')?.value.custom.length===0,'キャンセルでカテゴリが作成されました。');

  await evaluate(`document.querySelector('#person-category-create').click();document.querySelector('#person-category-create-form').requestSubmit()`);
  await until(()=>evaluate(`!document.querySelector('#person-category-create-error').hidden`),'空カテゴリ名の拒否');
  await evaluate(`document.querySelector('#person-category-create-name').value='その他';document.querySelector('#person-category-create-form').requestSubmit()`);
  await until(()=>evaluate(`document.querySelector('#person-category-create-error').textContent.includes('同じ名前')`),'固定カテゴリ重複の拒否');
  await evaluate(`document.querySelector('#person-category-create-name').value='<b>フォーム作成</b>';document.querySelector('#person-category-create-color').value='#7c3aed';document.querySelector('#person-category-create-form').requestSubmit()`);
  await until(()=>evaluate(`!document.querySelector('#person-category-create-dialog').open`),'人物フォーム内カテゴリ作成');
  const first=await evaluate(`(()=>{const option=document.querySelector('#person-category option:checked');return{id:option.value,text:option.textContent,html:option.querySelector('b')!==null,color:[...document.querySelectorAll('#category-list .category-row')].find(row=>row.querySelector('.category-row-name')?.textContent==='<b>フォーム作成</b>')?.querySelector('input[type=color]').value};})()`);
  check(/^CUSTOM_[0-9a-f-]+$/i.test(first.id)&&first.text==='<b>フォーム作成</b>'&&!first.html&&first.color==='#7c3aed',`作成カテゴリの選択・安全表示が不正です: ${JSON.stringify(first)}`);
  const afterCreate=await evaluate(formSnapshot);
  check(Object.entries(before).filter(([key])=>key!=='category').every(([key,value])=>afterCreate[key]===value),'カテゴリ作成で人物入力・画像・スクロールが変化しました。');
  await evaluate(`document.querySelector('#person-form').requestSubmit()`);
  await until(()=>evaluate(`!document.querySelector('#person-dialog').open`),'作成カテゴリで人物保存');
  const saved=(await store('people')).find((person)=>person.displayName==='フォーム途中入力');
  check(saved?.category===first.id&&saved.seriesName==='架空の所属'&&saved.memo==='作成ダイアログ前のメモ'&&saved.anniversaries.length===2&&saved.links.length===1,'作成カテゴリまたは人物入力が保存されません。');

  await evaluate(`document.querySelector('[data-tab=people]').click();document.querySelector('.person-card').click()`);
  await until(()=>evaluate(`document.querySelector('#detail-dialog').open`),'人物詳細表示');
  await evaluate(`document.querySelector('#detail-edit').click();document.querySelector('#person-memo').value='保存前だけの編集';document.querySelector('#person-category-create').click();
    document.querySelector('#person-category-create-name').value='編集画面で作成';document.querySelector('#person-category-create-color').value='#0f766e';document.querySelector('#person-category-create-form').requestSubmit()`);
  await until(()=>evaluate(`!document.querySelector('#person-category-create-dialog').open`),'編集画面内カテゴリ作成');
  const second=await evaluate(`(()=>({id:document.querySelector('#person-category').value,name:document.querySelector('#person-name').value,memo:document.querySelector('#person-memo').value,dialog:document.querySelector('#person-dialog').open}))()`);
  const beforeEditSave=(await store('people')).find((person)=>person.id===saved.id);
  check(/^CUSTOM_[0-9a-f-]+$/i.test(second.id)&&second.id!==first.id&&second.name==='フォーム途中入力'&&second.memo==='保存前だけの編集'&&second.dialog,'編集フォームのカテゴリ作成後に入力が保持されません。');
  check(beforeEditSave.category===first.id&&beforeEditSave.memo==='作成ダイアログ前のメモ','人物保存前に既存人物が更新されました。');
  await evaluate(`document.querySelector('#person-dialog [data-close]').click();document.querySelector('[data-tab=settings]').click()`);
  check(await evaluate(`(()=>{const rows=[...document.querySelectorAll('#category-list .category-row')];return rows.some(row=>row.querySelector('.category-row-name')?.textContent==='<b>フォーム作成</b>'&&row.querySelector('.category-row-meta').textContent.includes('1'))&&rows.some(row=>row.querySelector('.category-row-name')?.textContent==='編集画面で作成'&&row.querySelector('.category-row-meta').textContent.includes('0'));})()`),'人物フォームで作ったカテゴリが設定一覧へ反映されません。');

  await evaluate(`(()=>{const language=document.querySelector('#language-choice');language.value='en';language.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-tab=people]').click();document.querySelector('#people-add').click();document.querySelector('#person-category-create').click();})()`);
  check(await evaluate(`document.querySelector('#person-category-create').textContent.includes('Create new category')&&document.querySelector('#person-category-create-title').textContent==='Create new category'&&document.querySelector('#person-category-create-confirm').textContent==='Create and select'&&document.querySelector('#person-category-create-color-label').textContent==='Category color'`),'英語の人物フォーム内カテゴリ作成表示がありません。');
  await evaluate(`document.querySelector('#person-category-create-cancel').click();document.querySelector('#person-dialog [data-close]').click();document.querySelector('[data-tab=settings]').click();(()=>{const language=document.querySelector('#language-choice');language.value='ja';language.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(()=>evaluate(`document.documentElement.lang==='ja'`),'人物フォーム内カテゴリ検証の日本語復帰');

  // 未使用の2件目、使用中の1件目の順に既存の安全な削除経路で後片付けする。
  await evaluate(`(()=>{const row=[...document.querySelectorAll('#category-list .category-row')].find(node=>node.querySelector('.category-row-name')?.textContent==='編集画面で作成');row.querySelector('button.danger-link').click();})()`);
  await evaluate(`document.querySelector('#category-delete-confirm').click()`);
  await until(()=>evaluate(`!document.querySelector('#category-delete-dialog').open`),'未使用カテゴリの削除');
  await evaluate(`(()=>{const row=[...document.querySelectorAll('#category-list .category-row')].find(node=>node.querySelector('.category-row-name')?.textContent==='<b>フォーム作成</b>');row.querySelector('button.danger-link').click();document.querySelector('#category-move-target').value='OTHER';document.querySelector('#category-delete-confirm').click();})()`);
  await until(()=>evaluate(`!document.querySelector('#category-delete-dialog').open`),'使用中カテゴリの移動削除');
  check((await store('people')).find((person)=>person.id===saved.id)?.category==='OTHER','使用中カテゴリ削除後の人物移動が不正です。');
  await evaluate(`new Promise((done,fail)=>{const r=indexedDB.open('birthday-circle-local');r.onerror=()=>fail(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['people','notifications'],'readwrite');tx.objectStore('people').delete(${JSON.stringify(saved.id)});tx.oncomplete=()=>{db.close();done();};tx.onabort=()=>fail(tx.error);};})`);
  await command('Page.reload');await until(()=>evaluate(`Boolean(document.querySelector('#home-today-date')?.dateTime)`),'人物フォーム内カテゴリ検証後再起動');
  check((await store('people')).length===0&&((await store('settings')).find((row)=>row.key==='categories')?.value.custom.length??0)===0,'人物フォーム内カテゴリ検証の後片付けに失敗しました。');
  return{addCreated:true,cancelPreserved:true,editCreated:true,editNotAutoSaved:true,settingsLinked:true,english:true,mobileWidth:390};
}
