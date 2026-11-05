export const CATEGORY_CONFIG_VERSION = 1;
export const CATEGORY_NAME_MAX = 40;

export const FIXED_CATEGORIES = Object.freeze([
  { id:'X_FRIEND', ja:'SNSの友だち', en:'SNS Friends', color:'#1d9bf0' },
  { id:'REAL_FRIEND', ja:'友だち・知り合い', en:'Friends & Acquaintances', color:'#4f7cac' },
  { id:'FAMILY_RELATIVE', ja:'家族・親族', en:'Family & Relatives', color:'#d65a8b' },
  { id:'STREAMER_VTUBER', ja:'配信者・VTuber', en:'Streamers & VTubers', color:'#8b5cf6' },
  { id:'CELEBRITY', ja:'芸能人・著名人', en:'Celebrities & Public Figures', color:'#f59e0b' },
  { id:'CHARACTER', ja:'キャラクター', en:'Fictional Characters', color:'#ef4444' },
  { id:'PET', ja:'ペット', en:'Pets', color:'#10b981' },
  { id:'OTHER', ja:'その他', en:'Other', color:'#6b7280' },
]);

const CUSTOM_ID = /^CUSTOM_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLOR = /^#[0-9a-f]{6}$/i;
const fixedById = new Map(FIXED_CATEGORIES.map((entry) => [entry.id, entry]));

export const DEFAULT_CATEGORY_CONFIG = Object.freeze({
  version:CATEGORY_CONFIG_VERSION, custom:Object.freeze([]), colors:Object.freeze({}), hiddenCategoryIds:Object.freeze([]),
});

function textName(value) {
  if (typeof value !== 'string') throw new Error('カテゴリ名が正しくありません。');
  const name=value.trim().normalize('NFC');
  if (!name || name.length > CATEGORY_NAME_MAX || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error(`カテゴリ名は1〜${CATEGORY_NAME_MAX}文字で入力してください。`);
  }
  return name;
}

function normalizedKey(value) { return value.normalize('NFKC').toLocaleLowerCase(); }
function validColor(value, fallback) { return typeof value === 'string' && COLOR.test(value) ? value.toLowerCase() : fallback; }

export function isCustomCategoryId(id) { return typeof id === 'string' && CUSTOM_ID.test(id); }
export function isWellFormedCategoryId(id) { return fixedById.has(id) || isCustomCategoryId(id); }

export function normalizeCategoryConfig(value) {
  const source=value && typeof value==='object' && !Array.isArray(value) ? value : {};
  if (source.version != null && source.version !== CATEGORY_CONFIG_VERSION) throw new Error('カテゴリ設定の形式が正しくありません。');
  const custom=[],ids=new Set(),names=new Set(FIXED_CATEGORIES.flatMap((entry)=>[entry.ja,entry.en]).map(normalizedKey));
  if (source.custom != null && !Array.isArray(source.custom)) throw new Error('カテゴリ設定の形式が正しくありません。');
  for (const entry of source.custom ?? []) {
    if (!entry || typeof entry!=='object' || !isCustomCategoryId(entry.id) || ids.has(entry.id)) throw new Error('カテゴリIDが正しくありません。');
    const name=textName(entry.name),key=normalizedKey(name);
    if(names.has(key))throw new Error('同じ名前のカテゴリは作成できません。');
    names.add(key);ids.add(entry.id);custom.push({id:entry.id,name});
  }
  const known=new Set([...fixedById.keys(),...custom.map((entry)=>entry.id)]),colors={};
  if(source.colors!=null&&(typeof source.colors!=='object'||Array.isArray(source.colors)))throw new Error('カテゴリ色の設定が正しくありません。');
  for(const [id,value] of Object.entries(source.colors??{})){
    if(!known.has(id)||!COLOR.test(String(value)))throw new Error('カテゴリ色の設定が正しくありません。');
    colors[id]=String(value).toLowerCase();
  }
  if(source.hiddenCategoryIds!=null&&!Array.isArray(source.hiddenCategoryIds))throw new Error('カテゴリ表示設定が正しくありません。');
  const hiddenCategoryIds=[...new Set(source.hiddenCategoryIds??[])];
  if(hiddenCategoryIds.some((id)=>!known.has(id)))throw new Error('カテゴリ表示設定が正しくありません。');
  return {version:CATEGORY_CONFIG_VERSION,custom,colors,hiddenCategoryIds};
}

export function categoryDefinitions(config=DEFAULT_CATEGORY_CONFIG, language='ja') {
  const value=normalizeCategoryConfig(config);
  const fixed=FIXED_CATEGORIES.map((entry)=>({id:entry.id,name:language==='en'?entry.en:entry.ja,
    color:value.colors[entry.id]??entry.color,fixed:true}));
  const other=fixed.find((entry)=>entry.id==='OTHER');
  return [
    ...fixed.filter((entry)=>entry.id!=='OTHER'),
    ...value.custom.map((entry)=>({id:entry.id,name:entry.name,color:value.colors[entry.id]??'#64748b',fixed:false})),
    other,
  ];
}

export function categoryName(id,config,language='ja') {
  return categoryDefinitions(config,language).find((entry)=>entry.id===id)?.name
    ?? (language==='en'?'Other':'その他');
}

export function categoryColor(id,config) {
  return categoryDefinitions(config).find((entry)=>entry.id===id)?.color ?? '#6b7280';
}

export function categoryExists(id,config) {
  return categoryDefinitions(config).some((entry)=>entry.id===id);
}

function assertUniqueName(name,config,exceptId=null) {
  const key=normalizedKey(name);
  const duplicate=categoryDefinitions(config,'ja').some((entry)=>entry.id!==exceptId&&(
    normalizedKey(entry.name)===key || fixedById.has(entry.id)&&normalizedKey(fixedById.get(entry.id).en)===key));
  if(duplicate)throw new Error('同じ名前のカテゴリは作成できません。');
}

export function addCustomCategory(config,name,color='#64748b',id=`CUSTOM_${crypto.randomUUID()}`) {
  const value=normalizeCategoryConfig(config),normalized=textName(name);
  assertUniqueName(normalized,value);
  if(!isCustomCategoryId(id))throw new Error('カテゴリIDが正しくありません。');
  if(!COLOR.test(color))throw new Error('カテゴリ色の設定が正しくありません。');
  return normalizeCategoryConfig({...value,custom:[...value.custom,{id,name:normalized}],colors:{...value.colors,[id]:color}});
}

export function renameCustomCategory(config,id,name) {
  const value=normalizeCategoryConfig(config);
  if(!isCustomCategoryId(id)||!value.custom.some((entry)=>entry.id===id))throw new Error('変更できるカテゴリが見つかりません。');
  const normalized=textName(name);assertUniqueName(normalized,value,id);
  return normalizeCategoryConfig({...value,custom:value.custom.map((entry)=>entry.id===id?{...entry,name:normalized}:entry)});
}

export function setCategoryColor(config,id,color) {
  const value=normalizeCategoryConfig(config);
  if(!categoryExists(id,value)||!COLOR.test(color))throw new Error('カテゴリ色の設定が正しくありません。');
  return normalizeCategoryConfig({...value,colors:{...value.colors,[id]:color.toLowerCase()}});
}

export function setCategoryHidden(config,id,hidden) {
  const value=normalizeCategoryConfig(config);
  if(!categoryExists(id,value))throw new Error('カテゴリ表示設定が正しくありません。');
  const ids=new Set(value.hiddenCategoryIds);if(hidden)ids.add(id);else ids.delete(id);
  return normalizeCategoryConfig({...value,hiddenCategoryIds:[...ids]});
}

export function setAllCategoriesVisible(config,visible) {
  const value=normalizeCategoryConfig(config);
  return normalizeCategoryConfig({...value,hiddenCategoryIds:visible?[]:categoryDefinitions(value).map((entry)=>entry.id)});
}

export function visibleCategoryIds(config) {
  const value=normalizeCategoryConfig(config),hidden=new Set(value.hiddenCategoryIds);
  return categoryDefinitions(value).filter((entry)=>!hidden.has(entry.id)).map((entry)=>entry.id);
}

export function removeCustomCategory(config,id) {
  const value=normalizeCategoryConfig(config);
  if(!isCustomCategoryId(id)||!value.custom.some((entry)=>entry.id===id))throw new Error('削除できるカテゴリが見つかりません。');
  const colors={...value.colors};delete colors[id];
  return normalizeCategoryConfig({...value,custom:value.custom.filter((entry)=>entry.id!==id),colors,
    hiddenCategoryIds:value.hiddenCategoryIds.filter((entry)=>entry!==id)});
}
