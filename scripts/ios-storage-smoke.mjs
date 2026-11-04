export async function verifyIOSStorageGuidance({evaluate,until,check,command,baseUrl}){
  const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1';
  const edge='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';
  const ready=()=>until(()=>evaluate('Boolean(document.querySelector("#home-today-date")?.dateTime)'),'iOS案内の再読込');
  await evaluate(`localStorage.removeItem('birthday-circle-ios-storage-guide-v1')`);
  await command('Network.setUserAgentOverride',{userAgent:iphone,platform:'iPhone'});
  await command('Page.navigate',{url:baseUrl});await ready();
  await until(()=>evaluate('document.querySelector("#ios-storage-dialog")?.open'),'iPhone Safari初回案内');
  let first=await evaluate(`(()=>({title:document.querySelector('#ios-storage-dialog h2').textContent,
    text:document.querySelector('#ios-storage-dialog').textContent,guide:document.querySelector('#ios-storage-guide').textContent,
    people:document.querySelectorAll('#people-list .person-card').length}))()`);
  check(first.title.includes('登録前')&&first.text.includes('自動的に引き継がれません')&&first.guide.includes('完全置換')&&first.people===0,
    `iPhone初回案内が不正です: ${JSON.stringify(first)}`);
  await evaluate(`document.querySelector('#ios-storage-dialog [data-ios-guidance-role=close]').click()`);
  await command('Page.reload');await ready();
  check(await evaluate('!document.querySelector("#ios-storage-dialog").open'),'初回案内が再表示されました。');

  await evaluate(`(async()=>{localStorage.removeItem('birthday-circle-ios-storage-guide-v1');const db=await new Promise((done,fail)=>{const r=indexedDB.open('birthday-circle-local');r.onsuccess=()=>done(r.result);r.onerror=()=>fail(r.error);});
    const tx=db.transaction('people','readwrite');tx.objectStore('people').put({id:'00000000-0000-4000-8000-000000000001',displayName:'架空のSafari人物',category:'OTHER',anniversaries:[],links:[],hasImage:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    await new Promise((done,fail)=>{tx.oncomplete=done;tx.onerror=()=>fail(tx.error)});db.close();})()`);
  await command('Page.reload');await ready();await until(()=>evaluate('document.querySelector("#ios-storage-dialog")?.open'),'Safari既存データ案内');
  const existing=await evaluate(`document.querySelector('#ios-storage-dialog').textContent`);
  check(existing.includes('Safari側のデータは残っています')&&existing.includes('自動同期ではありません'),'既存Safariデータ向け案内が不正です。');
  await evaluate(`document.querySelector('#ios-storage-dialog [data-ios-guidance-role=close]').click()`);

  const script=await command('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'standalone',{configurable:true,value:true});`});
  await evaluate(`localStorage.removeItem('birthday-circle-ios-storage-guide-v1')`);await command('Page.reload');await ready();
  check(await evaluate('!document.querySelector("#ios-storage-dialog").open && Boolean(document.querySelector("#ios-storage-guide"))'),
    'ホーム画面版で初回ダイアログを抑止できません。');
  await command('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
  await evaluate(`(async()=>{const db=await new Promise(done=>{const r=indexedDB.open('birthday-circle-local');r.onsuccess=()=>done(r.result)}),tx=db.transaction('people','readwrite');tx.objectStore('people').delete('00000000-0000-4000-8000-000000000001');await new Promise(done=>tx.oncomplete=done);db.close();localStorage.removeItem('birthday-circle-ios-storage-guide-v1');})()`);
  await command('Network.setUserAgentOverride',{userAgent:edge,platform:'Win32'});await command('Page.reload');await ready();
  check(await evaluate('!document.querySelector("#ios-storage-dialog")'),'PCでiPhone向け案内が生成されました。');
  return {firstTime:true,existingData:true,standaloneSuppressed:true,desktopSuppressed:true};
}
