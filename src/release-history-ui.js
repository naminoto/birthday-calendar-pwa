import {RELEASE_HISTORY} from './release-history.js';

function localized(node,ja,en){node.dataset.releaseJa=ja;node.dataset.releaseEn=en;node.textContent=document.documentElement.lang==='en'?en:ja;}

export function setupReleaseHistory(t){
  const details=document.createElement('details');details.id='release-history';details.className='release-history';
  const summary=document.createElement('summary'),title=document.createElement('span');title.dataset.releaseKey='releaseHistoryTitle';title.textContent=t('releaseHistoryTitle');summary.append(title);details.append(summary);
  const intro=document.createElement('p');intro.className='help';intro.dataset.releaseKey='releaseHistoryHelp';intro.textContent=t('releaseHistoryHelp');details.append(intro);
  for(const release of RELEASE_HISTORY){
    const article=document.createElement('article');article.className='release-entry';article.dataset.version=release.version;
    const heading=document.createElement('h3');heading.textContent=`Version ${release.version}`;
    const date=document.createElement(release.date?'time':'span');
    if(release.date){date.dateTime=release.date;date.textContent=release.date;}
    else{date.dataset.releaseKey='releaseDatePending';date.textContent=t('releaseDatePending');}
    const head=document.createElement('div');head.className='release-entry-head';head.append(heading,date);article.append(head);
    for(const category of ['new','improvement','fix','security']){
      const changes=release.changes.filter(change=>change.category===category);if(!changes.length)continue;
      const section=document.createElement('section'),label=document.createElement('h4');label.dataset.releaseCategory=category;label.textContent=t(`releaseCategory_${category}`);
      const list=document.createElement('ul');for(const change of changes){const item=document.createElement('li');localized(item,change.ja,change.en);list.append(item);}section.append(label,list);article.append(section);
    }
    details.append(article);
  }
  return details;
}

export function refreshReleaseHistory(t){
  for(const node of document.querySelectorAll('[data-release-key]'))node.textContent=t(node.dataset.releaseKey);
  for(const node of document.querySelectorAll('[data-release-category]'))node.textContent=t(`releaseCategory_${node.dataset.releaseCategory}`);
  const english=document.documentElement.lang==='en';for(const node of document.querySelectorAll('[data-release-ja]'))node.textContent=english?node.dataset.releaseEn:node.dataset.releaseJa;
}
