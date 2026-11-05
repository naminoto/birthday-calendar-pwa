// 呼び出し元の使い捨てブラウザだけで、架空のカテゴリと人物を作成して後片付けする。
export async function verifyCategoryManagement({evaluate,until,check,command}){
  const people=()=>evaluate(`new Promise((done,fail)=>{const r=indexedDB.open('birthday-circle-local');r.onerror=()=>fail(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('people').objectStore('people').getAll();q.onerror=()=>fail(q.error);q.onsuccess=()=>{db.close();done(q.result);};};})`);
  check((await people()).length===0,'カテゴリ管理検証は空の一時DBでのみ実行します。');
  await evaluate(`document.querySelector('[data-tab=settings]').click()`);
  check(await evaluate(`document.querySelectorAll('#category-list .category-row').length===8`),'初期8カテゴリがありません。');
  const widths=[];
  for(const theme of ['light','dark'])for(const width of [390,1280]){
    await evaluate(`(()=>{const theme=document.querySelector('#theme-choice');theme.value=${JSON.stringify(theme)};theme.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});
    widths.push(await evaluate(`({theme:document.documentElement.dataset.theme,width:document.documentElement.scrollWidth,viewport:innerWidth})`));
  }
  check(widths.every(item=>item.width<=item.viewport),'カテゴリ管理が画面幅からはみ出します。');
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`(()=>{const theme=document.querySelector('#theme-choice');theme.value='light';theme.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#category-new-name').value='<script>推し';document.querySelector('#category-new-color').value='#7c3aed';document.querySelector('#category-add-form').requestSubmit();})()`);
  await until(()=>evaluate(`document.querySelectorAll('#category-list .category-row').length===9`),'カスタムカテゴリ追加');
  const expectedOrder=['X_FRIEND','REAL_FRIEND','FAMILY_RELATIVE','STREAMER_VTUBER','CELEBRITY','CHARACTER','PET'];
  const custom=await evaluate(`(()=>{const option=[...document.querySelectorAll('#person-category option')].find(node=>node.textContent==='<script>推し');
    const row=[...document.querySelectorAll('#category-list .category-row')].find(node=>node.querySelector('.category-row-name')?.textContent==='<script>推し');
    return {id:option?.value,text:row?.querySelector('.category-row-name')?.textContent,script:row?.querySelector('script')!==null,color:row?.querySelector('input[type=color]')?.value};})()`);
  check(/^CUSTOM_[0-9a-f-]+$/i.test(custom.id)&&custom.text==='<script>推し'&&!custom.script&&custom.color==='#7c3aed',`カスタムカテゴリの安全な表示が不正です: ${JSON.stringify(custom)}`);
  const ordered=await evaluate(`(()=>({person:[...document.querySelectorAll('#person-category option')].map(node=>node.value),
    people:[...document.querySelectorAll('#people-category option')].map(node=>node.value).filter(value=>value!=='ALL'),
    birthday:[...document.querySelectorAll('#birthday-category option')].map(node=>node.value).filter(value=>value!=='ALL'),
    manager:[...document.querySelectorAll('#category-list .category-row')].map(row=>row.querySelector('.category-row-name')?.textContent),
    calendar:[...document.querySelectorAll('#calendar-category-options input')].map(node=>node.dataset.categoryId)}))()`);
  const ids=[...expectedOrder,custom.id,'OTHER'];
  check(JSON.stringify(ordered.person)===JSON.stringify(ids)&&JSON.stringify(ordered.people)===JSON.stringify(ids)
    &&JSON.stringify(ordered.birthday)===JSON.stringify(ids)&&JSON.stringify(ordered.calendar)===JSON.stringify(ids),
    `カテゴリ表示順が画面間で一致しません: ${JSON.stringify(ordered)}`);
  check(ordered.manager.at(-2)==='<script>推し'&&ordered.manager.at(-1)==='その他','カテゴリ管理でその他が最後ではありません。');
  await evaluate(`(()=>{document.querySelector('[data-tab=people]').click();document.querySelector('#people-add').click();
    document.querySelector('#person-name').value='カテゴリ動作確認';document.querySelector('#person-category').value=${JSON.stringify(custom.id)};
    document.querySelector('#person-birth-month').value='5';document.querySelector('#person-birth-month').dispatchEvent(new Event('change'));
    document.querySelector('#person-birth-day').value='10';document.querySelector('#person-x-url').value='https://x.com/yoribi_test';
    document.querySelector('#person-form').requestSubmit();})()`);
  await until(()=>evaluate(`!document.querySelector('#person-dialog').open`),'カスタムカテゴリ人物保存');
  const saved=(await people()).find(person=>person.displayName==='カテゴリ動作確認');
  check(saved?.category===custom.id&&saved.username==='yoribi_test'&&saved.xProfileUrl==='https://x.com/yoribi_test','カテゴリ保存またはX URL補完が不正です。');
  await evaluate(`document.querySelector('[data-tab=settings]').click()`);
  const customRow=`[...document.querySelectorAll('#category-list .category-row')].find(node=>node.querySelector('.category-row-name')?.textContent==='<script>推し')`;
  await evaluate(`(()=>{const row=${customRow},input=row.querySelector('input[type=text]');input.value='推し・仕事';row.querySelector('button.quiet').click();})()`);
  await until(()=>evaluate(`[...document.querySelectorAll('#category-list .category-row')].some(node=>node.querySelector('.category-row-name')?.textContent==='推し・仕事')`),'カスタムカテゴリ改名');
  check(await evaluate(`document.querySelector('#people-category option[value=${JSON.stringify(custom.id)}]')?.textContent==='推し・仕事'
    &&[...document.querySelectorAll('#category-list .category-row')].find(node=>node.querySelector('.category-row-name')?.textContent==='推し・仕事')?.querySelector('.category-row-meta').textContent.includes('1')`),'改名後の関連または件数が不正です。');
  await evaluate(`document.querySelector('[data-tab=calendar]').click();document.querySelector('#calendar-categories-none').click()`);
  await until(()=>evaluate(`[...document.querySelectorAll('#calendar-category-options input')].every(node=>!node.checked)`),'カテゴリ全非表示');
  await evaluate(`document.querySelector('#calendar-category-options input[data-category-id=${JSON.stringify(custom.id)}]').click();document.querySelector('#calendar-category-options input[data-category-id=PET]').click()`);
  await until(()=>evaluate(`document.querySelector('#calendar-category-summary').textContent.includes('2')`),'複数カテゴリ表示');
  check(await evaluate(`document.querySelector('#calendar-category-options input[data-category-id=${JSON.stringify(custom.id)}]').checked
    &&document.querySelector('#calendar-category-options input[data-category-id=PET]').checked`),'複数カテゴリを同時選択できません。');
  await evaluate(`document.querySelector('[data-tab=settings]').click();(()=>{const row=[...document.querySelectorAll('#category-list .category-row')].find(node=>node.querySelector('.category-row-name')?.textContent==='推し・仕事');row.querySelector('button.danger-link').click();})()`);
  check(await evaluate(`document.querySelector('#category-delete-dialog').open&&document.querySelector('#category-delete-description').textContent.includes('1')`),'使用中カテゴリ削除の確認がありません。');
  await evaluate(`document.querySelector('#category-move-target').value='FAMILY_RELATIVE';document.querySelector('#category-delete-confirm').click()`);
  await until(()=>evaluate(`!document.querySelector('#category-delete-dialog').open&&document.querySelectorAll('#category-list .category-row').length===8`),'人物移動とカテゴリ削除');
  check((await people()).find(person=>person.id===saved.id)?.category==='FAMILY_RELATIVE','削除したカテゴリの人物が移動されていません。');
  await evaluate(`(()=>{const language=document.querySelector('#language-choice');language.value='en';language.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-tab=people]').click();document.querySelector('#people-add').click();})()`);
  check(await evaluate(`document.querySelector('#person-x-url-help').textContent.includes('username is empty')`),'英語のX自動補完案内がありません。');
  await evaluate(`document.querySelector('#person-dialog [data-close]').click();document.querySelector('[data-tab=settings]').click();(()=>{const language=document.querySelector('#language-choice');language.value='ja';language.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(()=>evaluate(`document.documentElement.lang==='ja'`),'カテゴリ検証の日本語復帰');
  await evaluate(`document.querySelector('[data-tab=calendar]').click();document.querySelector('#calendar-categories-all').click()`);
  await until(()=>evaluate(`[...document.querySelectorAll('#calendar-category-options input')].every(node=>node.checked)`),'カテゴリ表示設定復帰');
  await evaluate(`new Promise((done,fail)=>{const r=indexedDB.open('birthday-circle-local');r.onerror=()=>fail(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['people','notifications'],'readwrite');tx.objectStore('people').delete(${JSON.stringify(saved.id)});tx.oncomplete=()=>{db.close();done();};tx.onabort=()=>fail(tx.error);};})`);
  await command('Page.reload');await until(()=>evaluate(`Boolean(document.querySelector('#home-today-date')?.dateTime)`),'カテゴリ検証後再起動');
  check((await people()).length===0,'カテゴリ検証の架空人物が残りました。');
  return {fixed:8,customCreated:true,otherAlwaysLast:true,renamed:true,reassigned:true,multiVisibility:true,xGuidance:true,widths};
}
