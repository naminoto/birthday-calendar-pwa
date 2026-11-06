import {birthdayRows} from './model.js';

export const RAIL_SORTS=['nameAsc','nameDesc','birthday','newest','oldest'];
export function filteredRailPeople(people,{birthday='all',hiddenCategoryIds=new Set()}={}){
  const hidden=hiddenCategoryIds instanceof Set?hiddenCategoryIds:new Set(hiddenCategoryIds);
  return people.filter(person=>(birthday!=='unregistered'||!person.anniversaries?.some(item=>item.type==='BIRTHDAY'))
    &&!hidden.has(person.category));
}
// 保存値を触らず、次回誕生日は既存の年越し・うるう日計算を使う。
export function sortedRailPeople(people,sort,today,language='ja'){
  const byName=(a,b)=>a.displayName.localeCompare(b.displayName,language)||a.id.localeCompare(b.id);
  const ranks=sort==='birthday'?new Map(birthdayRows(people,today).map(row=>[row.person.id,row.daysUntil])):null;
  return [...people].sort((a,b)=>{
    if(sort==='nameDesc')return -byName(a,b);
    if(sort==='birthday')return (ranks.get(a.id)??Infinity)-(ranks.get(b.id)??Infinity)||byName(a,b);
    if(sort==='newest'||sort==='oldest')return (sort==='newest'?-1:1)*(a.createdAt??'').localeCompare(b.createdAt??'')||byName(a,b);
    return byName(a,b);
  });
}
