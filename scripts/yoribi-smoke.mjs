export async function verifyYoribiUI({evaluate,until,check,command,screenshot=async()=>{}}) {
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const identity=await evaluate(`(()=>({title:document.title,preview:document.querySelector('meta[name="yoribi-preview-version"]')?.content,
    brand:document.querySelector('.brand strong')?.textContent}))()`);
  check((identity.title==='Yoribi（ヨリビ）'||(/^\d+\.\d+\.\d+-candidate$/.test(identity.preview)&&identity.title.includes('Yoribi テスト')))
    &&identity.brand==='Yoribi',`Yoribi表示名: ${JSON.stringify(identity)}`);
  await evaluate(`document.querySelector('[data-tab=settings]').click()`);
  check(await evaluate(`location.hash==='#settings'&&document.querySelectorAll('.setting-section').length===7
    &&[...document.querySelectorAll('.setting-section')].every(s=>!s.open)`),'初期設定は全セクション折りたたみ');
  await screenshot('yoribi-settings-closed-390');
  await evaluate(`document.querySelector('#appearance-section summary').focus()`);
  check(await evaluate('document.activeElement.tagName==="SUMMARY"'),'summaryフォーカス');
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',text:' ',windowsVirtualKeyCode:32});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await until(()=>evaluate('document.querySelector("#appearance-section").open'),'キーボードで設定展開');
  const choose=async theme=>{await evaluate(`(()=>{const s=document.querySelector('#theme-choice');s.value='${theme}';s.dispatchEvent(new Event('change'));})()`);};
  await choose('dark');await until(()=>evaluate('document.documentElement.dataset.theme==="dark"'),'ダーク適用');
  await screenshot('yoribi-settings-dark-390');
  const contrast=await evaluate(`(()=>{const rgb=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
    const luminance=c=>{const p=rgb(c);return .2126*p[0]+.7152*p[1]+.0722*p[2];};
    const form=document.querySelector('#person-name'),style=getComputedStyle(form),a=luminance(style.color),b=luminance(style.backgroundColor);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);})()`);
  check(contrast>=4.5,'ダーク入力欄のコントラスト');
  for(const tab of ['home','calendar','people','birthdays','settings']){
    await evaluate(`document.querySelector('[data-tab=${tab}]').click()`);
    check(await evaluate('document.documentElement.scrollWidth<=390'),'ダーク画面幅 '+tab);
  }
  await command('Page.reload');await until(()=>evaluate('document.querySelector("#app-version")?.textContent&&document.documentElement.dataset.theme==="dark"'),'再起動後テーマ保持');
  check(await evaluate('document.querySelector("#theme-choice").value==="dark"'),'再起動後設定値');
  await evaluate(`document.querySelector('[data-tab=settings]').click();document.querySelector('#appearance-section').open=true;`);
  await choose('system');
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
  await until(()=>evaluate('document.documentElement.dataset.theme==="dark"'),'端末ダーク追従');
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
  await until(()=>evaluate('document.documentElement.dataset.theme==="light"'),'端末ライト追従');
  await choose('light');await until(()=>evaluate('document.querySelector("#theme-choice").value==="light"'),'明示ライト設定');
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
  check(await evaluate('document.documentElement.dataset.theme==="light"'),'明示ライトは端末変更に影響されない');
  await command('Emulation.setEmulatedMedia',{features:[]});
  await evaluate(`document.querySelector('#appearance-section').open=false;document.querySelector('#appearance-section').open=true`);
  check(await evaluate('document.querySelector("#theme-choice").value==="light"'),'折りたたみで設定値保持');
  const icons=await evaluate(`(async()=>{const manifest=await(await fetch(new URL('./manifest.webmanifest',document.baseURI))).json();
    const names=[['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180],['favicon-48.png',48],['icon-maskable-512.png',512]],results=[];
    for(const[name,size]of names){const image=new Image();image.src=new URL('./icons/'+name,document.baseURI);await image.decode();
      const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');g.drawImage(image,0,0);const p=g.getImageData(0,0,size,size).data;
      const corners=[0,(size-1)*4,(size*(size-1))*4,(size*size-1)*4].map(i=>[...p.slice(i,i+4)]);
      results.push({name,size: image.naturalWidth,correct:image.naturalWidth===size&&image.naturalHeight===size,corners});}
    return {name:manifest.name,short:manifest.short_name,id:manifest.id,scope:manifest.scope,apple:document.querySelector('meta[name=apple-mobile-web-app-title]').content,results};})()`);
  const expectedInstallName=identity.preview?'Yoribi テスト':'Yoribi';
  check(icons.name===expectedInstallName&&icons.short===expectedInstallName&&icons.apple===expectedInstallName&&icons.id==='./'&&icons.scope==='./','manifest/iPhone名称と識別子');
  check(icons.results.every(icon=>icon.correct&&icon.corners.every(c=>c[3]===255&&!(c[0]===255&&c[1]===255&&c[2]===255))),'PNG寸法・不透明四隅・白余白なし');
  check(await evaluate(`document.querySelectorAll('.header-actions .outline-icon').length===1&&!document.querySelector('#header-settings')&&document.querySelector('.bottom-nav [data-tab=settings] svg')!==null`),'ヘッダー通知と下部設定アイコン');
  const navigationMotion=await evaluate(`(async()=>{
    const nav=document.querySelector('.bottom-nav'),indicator=nav.querySelector('.bottom-nav-indicator');
    const button=tab=>nav.querySelector('[data-tab='+tab+']'),rect=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
    button('home').click();await new Promise(done=>setTimeout(done,380));
    const initial={indicator:rect(indicator),button:rect(button('home')),animated:nav.classList.contains('nav-motion-ready')};
    const before=getComputedStyle(button('people').querySelector('.nav-icon-person-secondary')).opacity;
    button('people').click();const during=button('people').classList.contains('nav-icon-animate');
    await new Promise(done=>setTimeout(done,680));
    const people=button('people'),primaryShoulder=people.querySelector('.nav-icon-person-primary path'),secondaryShoulder=people.querySelector('.nav-icon-person-secondary path');
    const primaryBox=primaryShoulder.getBoundingClientRect(),secondaryBox=secondaryShoulder.getBoundingClientRect();
    const selected={indicator:rect(indicator),button:rect(people),secondary:getComputedStyle(people.querySelector('.nav-icon-person-secondary')).opacity,separated:primaryBox.right<secondaryBox.left};
    button('people').click();const same=button('people').classList.contains('nav-icon-animate');
    const shapes={};
    for(const [tab,selector]of [['home','.nav-icon-home-detail'],['calendar','.nav-icon-calendar-detail'],['birthdays','.nav-icon-birthday-flame']]){
      button(tab).click();const started=button(tab).classList.contains('nav-icon-animate');await new Promise(done=>setTimeout(done,680));
      const part=button(tab).querySelector(selector);shapes[tab]={started,opacity:getComputedStyle(part).opacity,settled:!button(tab).classList.contains('nav-icon-animate')};
    }
    button('settings').click();const gear=button('settings').querySelector('.nav-icon-gear');await new Promise(done=>setTimeout(done,680));
    const gearTransform=getComputedStyle(gear).transform;await new Promise(done=>setTimeout(done,80));
    const gearBox=gear.getBBox(),settings={settled:!button('settings').classList.contains('nav-icon-animate'),transform:gearTransform,stable:getComputedStyle(gear).transform===gearTransform,
      symmetric:Math.abs(gearBox.x+gearBox.width/2-12)<.01&&Math.abs(gearBox.y+gearBox.height/2-12)<.01&&Math.abs(gearBox.width-gearBox.height)<.01};
    for(const tab of ['settings','calendar','birthdays','people'])button(tab).click();
    await new Promise(done=>setTimeout(done,680));
    const rapid={active:nav.querySelector('button.active').dataset.tab,indicator:rect(indicator),button:rect(button('people'))};
    return{initial,before,during,selected,same,shapes,settings,rapid};
  })()`);
  const aligned=pair=>Math.abs(pair.indicator.x-pair.button.x)<.6&&Math.abs(pair.indicator.width-pair.button.width)<.6;
  check(navigationMotion.initial.animated&&aligned(navigationMotion.initial),'初回ナビ背景位置');
  check(navigationMotion.before==='0'&&navigationMotion.during&&navigationMotion.selected.secondary==='1'&&navigationMotion.selected.separated&&aligned(navigationMotion.selected),'人物アイコン変形・肩線分離と背景移動');
  check(Object.values(navigationMotion.shapes).every(item=>item.started&&item.opacity==='1'&&item.settled),'ホーム・カレンダー・誕生日の内部パーツ変形');
  check(navigationMotion.settings.settled&&navigationMotion.settings.stable&&navigationMotion.settings.symmetric&&navigationMotion.settings.transform!=='none','設定歯車は回転対称で約0.6秒後の静止状態を維持');
  check(!navigationMotion.same&&navigationMotion.rapid.active==='people'&&aligned(navigationMotion.rapid),'同一タブと連続タップ');
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reduced=await evaluate(`(()=>{const nav=document.querySelector('.bottom-nav');nav.querySelector('[data-tab=home]').click();const indicator=nav.querySelector('.bottom-nav-indicator'),style=getComputedStyle(indicator);return{transition:style.transitionDuration,animated:nav.querySelector('[data-tab=home]').classList.contains('nav-icon-animate')};})()`);
  check(reduced.transition.split(',').every(value=>value.trim()==='0s')&&!reduced.animated,'動きを減らす設定');
  const selection=await evaluate(`(()=>{const sample=selector=>getComputedStyle(document.querySelector(selector)).userSelect,temp=document.createElement('a');temp.href='https://example.invalid/';temp.textContent='profile';const block=document.createElement('div');block.className='detail-block';block.append(temp);document.body.append(block);const result={nav:sample('.bottom-nav button'),heading:sample('.page-heading h1'),input:sample('#person-name'),memo:sample('#person-memo'),url:getComputedStyle(temp).userSelect};block.remove();return result;})()`);
  check(selection.nav==='none'&&selection.heading==='none'&&selection.input==='text'&&selection.memo==='text'&&selection.url==='text','UI文字選択を抑制し入力・メモ・URLは維持');
  await command('Emulation.setEmulatedMedia',{features:[]});
  await evaluate(`document.querySelectorAll('.setting-section').forEach(s=>s.open=false);document.querySelector('[data-tab=home]').click()`);
  return {name:'Yoribi',sections:6,keyboard:true,themePersisted:true,systemTheme:true,darkContrast:contrast,icons,navigationMotion};
}
