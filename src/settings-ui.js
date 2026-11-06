import {setupReleaseHistory} from './release-history-ui.js';

// 既存フォームとIDをそのまま移動。開閉で設定値やイベントを作り直さない。
export function setupSettingsSections(t) {
  const view = document.getElementById('view-settings');
  const cards = [...view.querySelectorAll('.setting-card')];
  for (const [index, id] of ['language-settings','notice-settings','category-settings','backup-settings','storage-settings'].entries()) cards[index].id = id;
  const section = (id, key, nodes) => {
    const details = document.createElement('details'); details.className = 'setting-section'; details.id = id;
    const summary = document.createElement('summary'), label = document.createElement('span');
    label.dataset.sectionKey = key; label.textContent = t(key); summary.append(label);
    summary.setAttribute('aria-expanded', 'false');
    details.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(details.open)));
    details.append(summary, ...nodes); return details;
  };
  const appearance = document.createElement('div'); appearance.className = 'panel setting-card';
  const label = document.createElement('label'); label.className = 'language-picker';
  const title = document.createElement('span'); title.id = 'theme-label'; title.textContent = t('theme');
  const select = document.createElement('select'); select.id = 'theme-choice'; select.setAttribute('aria-labelledby','theme-label');
  for (const value of ['light','dark','system']) { const option=document.createElement('option');option.value=value;option.textContent=t(`theme_${value}`);select.append(option); }
  label.append(title, select); appearance.append(label);
  const update = view.querySelector('.settings-update');
  const appName = document.createElement('h2'); appName.textContent = 'Yoribi';
  const info = document.createElement('div');info.className='panel setting-card';
  info.append(appName,update,setupReleaseHistory(t));
  const privacy = view.querySelector('.privacy-note');
  const guidance = document.createElement('div'); guidance.className = 'data-privacy-guide';
  for (const topic of ['local','backup','zip','restore','help']) {
    for (const [tag, suffix] of [['h3','Title'],['p','Text']]) {
      const node = document.createElement(tag), key = `dataPrivacy_${topic}${suffix}`;
      node.dataset.guidanceKey = key; node.textContent = t(key); guidance.append(node);
    }
  }
  view.append(section('appearance-section','appearanceTitle',[cards[0],appearance]),
    section('notice-section','noticeTitle',[cards[1]]),section('category-section','categoryManageTitle',[cards[2]]),
    section('backup-section','backupTitle',[cards[3]]),
    section('data-privacy-section','dataPrivacyTitle',[guidance]),
    section('storage-section','storageTitle',[cards[4]]),section('info-section','appInfo',[info,privacy]));
}

export function setupOutlineIcons() {
  const paths = {
    bell:['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9','M10 21h4'],
    settings:['M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z'],
    home:['M3 11 12 3l9 8','M5 10v11h5v-7h4v7h5V10'],
    calendar:['M5 5h14v16H5Z','M8 3v4m8-4v4M5 10h14'],
    people:['M8 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8','M2 21v-2a6 6 0 0 1 12 0v2M16 5a4 4 0 0 1 0 8m1 3a5 5 0 0 1 5 5'],
    birthdays:['M12 3v3M5 11h14v10H5ZM5 15h14','M12 6c3 2 2 4 0 4s-3-2 0-4'],
  };
  const appendPath = (parent, d) => { const path=document.createElementNS(parent.namespaceURI,'path');path.setAttribute('d',d);parent.append(path); };
  const appendGroup = (parent, className, definitions) => {
    const group=document.createElementNS(parent.namespaceURI,'g');group.classList.add(className);
    for(const d of definitions)appendPath(group,d);parent.append(group);return group;
  };
  const icon = key => {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('outline-icon');
    if(key==='people'){
      svg.classList.add('nav-icon--people');
      const primary=document.createElementNS(svg.namespaceURI,'g');primary.classList.add('nav-icon-person-primary');
      const head=document.createElementNS(svg.namespaceURI,'circle');head.setAttribute('cx','12');head.setAttribute('cy','8.5');head.setAttribute('r','3.5');primary.append(head);
      // Keep the two shoulder contours separated after the primary figure moves left.
      appendPath(primary,'M6 21v-1.5a6 6 0 0 1 12 0V21');
      const secondary=document.createElementNS(svg.namespaceURI,'g');secondary.classList.add('nav-icon-person-secondary');
      const secondHead=document.createElementNS(svg.namespaceURI,'circle');secondHead.setAttribute('cx','17.3');secondHead.setAttribute('cy','9');secondHead.setAttribute('r','2.5');secondary.append(secondHead);
      appendPath(secondary,'M16.6 15.5a5.2 5.2 0 0 1 5.4 5.2V21');
      svg.append(primary,secondary);
    }else if(key==='home'){
      for(const d of paths.home)appendPath(svg,d);
      appendGroup(svg,'nav-icon-home-detail',['M8.5 11.5h7v5h-7Z','M12 11.5v5']);
    }else if(key==='calendar'){
      for(const d of paths.calendar)appendPath(svg,d);
      appendGroup(svg,'nav-icon-calendar-detail',['M9 15l2 2 4-5']);
    }else if(key==='birthdays'){
      appendPath(svg,paths.birthdays[0]);
      appendGroup(svg,'nav-icon-birthday-flame',[paths.birthdays[1]]);
    }else if(key==='settings'){
      const gear=document.createElementNS(svg.namespaceURI,'g');gear.classList.add('nav-icon-gear');
      for(const radius of ['6.5','2.5']){const circle=document.createElementNS(svg.namespaceURI,'circle');circle.setAttribute('cx','12');circle.setAttribute('cy','12');circle.setAttribute('r',radius);gear.append(circle);}
      appendPath(gear,'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.28 5.28 7.4 7.4M16.6 16.6l2.12 2.12M18.72 5.28 16.6 7.4M7.4 16.6l-2.12 2.12');
      svg.append(gear);
    }else for(const d of paths[key])appendPath(svg,d);
    return svg;
  };
  const bell=document.getElementById('bell');
  [...bell.childNodes].filter(node=>node.nodeType===3).forEach(node=>node.remove());bell.prepend(icon('bell'));
  const actions=document.createElement('div');actions.className='header-actions';bell.before(actions);actions.append(bell);
  for(const button of document.querySelectorAll('.bottom-nav [data-tab]'))button.querySelector('span').replaceChildren(icon(button.dataset.tab));
}
