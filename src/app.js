import './style.css';
import { openDatabase, all, get, savePerson, deletePerson, loadSettings, saveSettings,
  markNotificationRead, markAllRead, storageSummary } from './db.js';
import { CATEGORIES, ANNIVERSARY_TYPES, birthdayOf, birthdayRows, filterPeople,
  nextOccurrence, daysBetween, tokyoToday } from './model.js';
import { synchronizeNotifications } from './notifications.js';
import { compressAvatar } from './images.js';
import { createBackup, inspectBackup, restoreBackup } from './backup.js';
import { clearOldShellCaches, cacheBytes } from './cache-ops.js';

const $ = (id) => document.getElementById(id);
const state = { db: null, people: [], images: new Map(), notices: [], settings: null,
  today: tokyoToday(), month: null, selectedPersonId: null, detailPersonId: null,
  railFilter: 'all', preparedBackup: null };
const [todayYear, todayMonth] = state.today.split('-').map(Number);
state.month = new Date(Date.UTC(todayYear, todayMonth - 1, 1));

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content != null) node.textContent = String(content);
  return node;
}
function empty(container, message) { container.replaceChildren(el('div', 'empty', message)); }
function toast(message) { const node = $('toast'); node.textContent = message; node.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 4200); }
function avatar(person, large = false) {
  const node = el('span', `avatar${large ? ' large' : ''}`, person.displayName.slice(0, 1));
  const url = state.images.get(person.id);
  if (url) { const img = el('img'); img.src = url; img.alt = ''; node.replaceChildren(img); }
  return node;
}
function categoryLabel(value) { return CATEGORIES[value] ?? 'その他'; }
function birthdayText(person) { const b = birthdayOf(person); return b ? `${b.month}月${b.day}日` : '誕生日未登録'; }
function formatDays(days) { return days === 0 ? '今日' : days === 1 ? '明日' : `あと${days}日`; }
function byId(id) { return state.people.find((person) => person.id === id); }

async function refresh() {
  for (const url of state.images.values()) URL.revokeObjectURL(url);
  const [people, images] = await Promise.all([all(state.db, 'people'), all(state.db, 'images')]);
  state.people = people;
  state.images = new Map(images.map((image) => [image.personId, URL.createObjectURL(image.blob)]));
  const notifications = await synchronizeNotifications(state.db, state.today);
  state.notices = notifications.notifications; state.settings = notifications.settings;
  $('unread-badge').textContent = notifications.unread;
  $('unread-badge').hidden = notifications.unread === 0;
  renderHome(); renderCalendar(); renderPeople(); renderBirthdays(); renderNotifications(); renderSettings();
}

function switchTab(tab) {
  if (!['home', 'calendar', 'people', 'birthdays', 'settings'].includes(tab)) tab = 'home';
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== `view-${tab}`;
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.classList.toggle('active', button.dataset.tab === tab);
    button.setAttribute('aria-current', button.dataset.tab === tab ? 'page' : 'false');
  }
  if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);
  if (tab === 'settings') renderStorageStats();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function makePersonRow(person, subtitle, right = '') {
  const button = el('button', 'item-row'); button.type = 'button';
  button.append(avatar(person));
  const body = el('span', 'item-row-main'); body.append(el('strong', '', person.displayName), el('small', '', subtitle));
  button.append(body);
  if (right) button.append(el('span', 'pill', right));
  button.addEventListener('click', () => openDetail(person.id));
  return button;
}

function renderHome() {
  const rows = birthdayRows(state.people, state.today);
  const thisMonth = Number(state.today.slice(5, 7));
  const counts = [
    ['今日の誕生日', rows.filter((row) => row.daysUntil === 0).length, 'きょう、お祝いの日'],
    ['7日以内', rows.filter((row) => row.daysUntil <= 7).length, 'もうすぐお祝い'],
    ['今月の誕生日', rows.filter((row) => row.birthday.month === thisMonth).length, 'この月の登録数'],
    ['次の誕生日', rows[0] ? rows[0].person.displayName : '—', rows[0] ? formatDays(rows[0].daysUntil) : 'まだ登録がありません'],
  ];
  $('summary-grid').replaceChildren(...counts.map(([label, value, sub]) => {
    const card = el('div', 'summary-card'); card.append(el('span', '', label), el('b', '', value), el('small', '', sub)); return card;
  }));
  const upcoming = rows.filter((row) => row.daysUntil <= 30);
  if (!upcoming.length) empty($('home-upcoming'), '30日以内の誕生日はありません。');
  else $('home-upcoming').replaceChildren(...upcoming.map((row) => makePersonRow(row.person,
    `${row.birthday.month}月${row.birthday.day}日 · ${categoryLabel(row.person.category)}`, formatDays(row.daysUntil))));
  const others = state.people.flatMap((person) => person.anniversaries.filter((ann) => ann.type !== 'BIRTHDAY')
    .map((ann) => { const date = nextOccurrence(ann, state.today); return { person, ann,
      days: daysBetween(state.today, date) }; }))
    .filter((row) => row.days <= 14).sort((a, b) => a.days - b.days);
  if (!others.length) empty($('home-anniversaries'), '14日以内のその他の記念日はありません。');
  else $('home-anniversaries').replaceChildren(...others.map((row) => makePersonRow(row.person,
    `${ANNIVERSARY_TYPES[row.ann.type]} · ${row.ann.month}月${row.ann.day}日`, formatDays(row.days))));
}

function renderCalendar() {
  const year = state.month.getUTCFullYear(), month = state.month.getUTCMonth() + 1;
  $('month-title').textContent = `${year}年${month}月`;
  $('selection-hint').textContent = state.selectedPersonId
    ? `${byId(state.selectedPersonId)?.displayName ?? '人物'}の誕生日にする日付をタップしてください。`
    : '日付をタップすると、その日の人物を確認できます。';
  const railPeople = state.railFilter === 'unregistered'
    ? state.people.filter((person) => !birthdayOf(person)) : state.people;
  $('rail-count').textContent = `${railPeople.length}人`;
  if (!railPeople.length) empty($('person-rail'), '人物がいません。');
  else $('person-rail').replaceChildren(...[...railPeople].sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'))
    .map((person) => {
      const button = el('button', `avatar-person${birthdayOf(person) ? ' registered' : ''}${state.selectedPersonId === person.id ? ' selected' : ''}`);
      button.type = 'button'; button.draggable = true; button.dataset.personId = person.id;
      button.title = `${person.displayName}の詳細を開く。ドラッグで誕生日を登録`;
      button.append(avatar(person), el('small', '', person.displayName));
      let held = false;
      button.addEventListener('click', () => { if (held) { held = false; return; } openDetail(person.id); });
      button.addEventListener('dragstart', (event) => { event.dataTransfer.setData('text/plain', person.id); event.dataTransfer.effectAllowed = 'move'; });
      let hold;
      button.addEventListener('pointerdown', (event) => { held = false; if (event.pointerType !== 'mouse') hold = setTimeout(() => {
        held = true;
        state.selectedPersonId = person.id; renderCalendar(); toast(`${person.displayName}を選択しました。日付をタップしてください。`);
      }, 550); });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(type, () => clearTimeout(hold));
      return button;
    }));
  const grid = $('calendar-grid'); grid.replaceChildren();
  for (const day of ['日', '月', '火', '水', '木', '金', '土']) grid.append(el('div', 'weekday', day));
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  for (let i = 0; i < firstWeekday; i++) grid.append(el('div', 'day-spacer'));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= last; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const people = state.people.filter((person) => { const birthday = birthdayOf(person);
      return birthday && nextOccurrence(birthday, `${year}-01-01`) === date; });
    const cell = el('button', `day-cell${date === state.today ? ' today' : ''}`); cell.type = 'button';
    cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-label', `${month}月${day}日、誕生日${people.length}人`);
    cell.append(el('span', 'day-number', day)); const pics = el('span', 'day-avatars');
    for (const person of people.slice(0, 4)) pics.append(avatar(person));
    if (people.length > 4) pics.append(el('span', 'more', `+${people.length - 4}`));
    cell.append(pics);
    cell.addEventListener('click', () => { if (state.selectedPersonId) assignBirthday(state.selectedPersonId, month, day);
      else if (people.length === 1) openDetail(people[0].id);
      else if (people.length > 1) openDayPeople(people, month, day);
      else toast('人物の詳細から「誕生日の日付を選ぶ」を押してください。'); });
    cell.addEventListener('dragover', (event) => { event.preventDefault(); cell.classList.add('drop-target'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-target'));
    cell.addEventListener('drop', (event) => { event.preventDefault(); cell.classList.remove('drop-target');
      const personId = event.dataTransfer.getData('text/plain'); if (byId(personId)) assignBirthday(personId, month, day); });
    grid.append(cell);
  }
}

function openDayPeople(people, month, day) {
  const body = $('detail-body'); body.replaceChildren(el('p', 'help', `${month}月${day}日が誕生日の人物`));
  body.append(...people.map((person) => makePersonRow(person, categoryLabel(person.category))));
  $('detail-edit').hidden = true; $('detail-choose').hidden = true; $('detail-dialog').showModal();
}

async function assignBirthday(personId, month, day) {
  const person = byId(personId); if (!person) return;
  const anniversaries = person.anniversaries.filter((ann) => ann.type !== 'BIRTHDAY');
  const previous = birthdayOf(person);
  anniversaries.unshift({ type: 'BIRTHDAY', month, day, year: previous?.year ?? null, showAge: previous?.showAge ?? false });
  try { await savePerson(state.db, { ...person, anniversaries }); state.selectedPersonId = null;
    await refresh(); toast(`${person.displayName}の誕生日を${month}月${day}日に保存しました。`); }
  catch (error) { toast(error.message); }
}

function renderPeople() {
  const options = { category: $('people-category').value, month: Number($('people-month').value),
    search: $('people-search').value, birthday: $('people-birthday').value };
  const people = filterPeople(state.people, options);
  const sort = $('people-sort').value;
  if (sort === 'name') people.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'));
  else if (sort === 'recent') people.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  else { const ranks = new Map(birthdayRows(state.people, state.today).map((row) => [row.person.id, row.daysUntil]));
    people.sort((a, b) => (ranks.get(a.id) ?? 999) - (ranks.get(b.id) ?? 999)
      || a.displayName.localeCompare(b.displayName, 'ja')); }
  $('people-count').textContent = `${people.length}人を表示`;
  if (!people.length) empty($('people-list'), '条件に合う人物はいません。');
  else $('people-list').replaceChildren(...people.map((person) => {
    const card = el('button', 'person-card'); card.type = 'button'; card.append(avatar(person));
    const content = el('span', 'person-card-content'); content.append(el('strong', '', person.displayName),
      el('small', '', `${categoryLabel(person.category)} · ${birthdayText(person)}`)); card.append(content);
    card.addEventListener('click', () => openDetail(person.id)); return card;
  }));
}

function renderBirthdays() {
  const month = Number($('birthday-month').value), category = $('birthday-category').value;
  const rows = birthdayRows(state.people, state.today).filter((row) =>
    (!month || row.birthday.month === month) && (category === 'ALL' || row.person.category === category));
  if (!rows.length) empty($('birthday-list'), '該当する誕生日はありません。');
  else $('birthday-list').replaceChildren(...rows.map((row) => makePersonRow(row.person,
    `${row.birthday.month}月${row.birthday.day}日 · ${categoryLabel(row.person.category)}`, formatDays(row.daysUntil))));
}

function detailBlock(title, values) {
  const block = el('div', 'detail-block'); block.append(el('h4', '', title));
  for (const value of values) block.append(el('p', '', value)); return block;
}
function openDetail(id) {
  const person = byId(id); if (!person) return;
  if ($('detail-dialog').open) $('detail-dialog').close();
  state.detailPersonId = id; $('detail-edit').hidden = false; $('detail-choose').hidden = false;
  const body = $('detail-body'); body.replaceChildren();
  const top = el('div', 'detail-top'); top.append(avatar(person, true));
  const text = el('div'); text.append(el('h3', '', person.displayName), el('p', '',
    `${categoryLabel(person.category)}${person.username ? ` · @${person.username}` : ''}`)); top.append(text); body.append(top);
  const birthdays = [birthdayText(person)]; const b = birthdayOf(person);
  if (b?.year) birthdays.push(`誕生年 ${b.year}年${b.showAge ? ` · ${Math.max(0, Number(state.today.slice(0, 4)) - b.year)}歳（概算）` : ''}`);
  body.append(detailBlock('誕生日', birthdays));
  if (person.seriesName) body.append(detailBlock('作品名・所属', [person.seriesName]));
  if (person.memo) body.append(detailBlock('メモ', [person.memo]));
  if (person.anniversaries.some((ann) => ann.type !== 'BIRTHDAY')) body.append(detailBlock('その他の記念日',
    person.anniversaries.filter((ann) => ann.type !== 'BIRTHDAY')
      .map((ann) => `${ANNIVERSARY_TYPES[ann.type]}：${ann.month}月${ann.day}日${ann.year ? `（${ann.year}年）` : ''}`)));
  if (person.xProfileUrl) {
    const block = detailBlock('Xプロフィール', []); const link = el('a', '', 'Xプロフィールを開く ↗');
    link.href = person.xProfileUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; block.append(link); body.append(block);
  }
  if (person.links.length) {
    const block = detailBlock('関連URL', []);
    for (const item of person.links) { const link = el('a', '', item.label || item.url); link.href = item.url;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; block.append(link); }
    body.append(block);
  }
  $('detail-dialog').showModal();
}

function anniversaryRow(value = null) {
  const row = el('div', 'repeat-row');
  const typeLabel = el('label', '', '種類'); const type = el('select'); type.className = 'ann-type';
  for (const [key, label] of Object.entries(ANNIVERSARY_TYPES)) if (key !== 'BIRTHDAY') {
    const option = el('option', '', label); option.value = key; type.append(option); }
  type.value = value?.type ?? 'OSHI_START'; typeLabel.append(type);
  const fields = [['月', 'ann-month', value?.month, 1, 12], ['日', 'ann-day', value?.day, 1, 31],
    ['年', 'ann-year', value?.year, 1900, 2100]];
  row.append(typeLabel);
  for (const [label, cls, current, min, max] of fields) { const wrap = el('label', 'short', label);
    const input = el('input', cls); input.type = 'number'; input.min = min; input.max = max;
    input.value = current ?? ''; if (cls !== 'ann-year') input.required = true;
    wrap.append(input); row.append(wrap); }
  const remove = el('button', '', '×'); remove.type = 'button'; remove.setAttribute('aria-label', '記念日を削除');
  remove.onclick = () => row.remove(); row.append(remove); return row;
}
function linkRow(value = null) {
  const row = el('div', 'repeat-row');
  for (const [label, cls, current] of [['URL', 'link-url', value?.url], ['ラベル', 'link-label', value?.label]]) {
    const wrap = el('label', cls === 'link-label' ? 'short' : '', label); const input = el('input', cls);
    input.value = current ?? ''; if (cls === 'link-url') { input.type = 'url'; input.required = true; }
    wrap.append(input); row.append(wrap);
  }
  const remove = el('button', '', '×'); remove.type = 'button'; remove.setAttribute('aria-label', 'URLを削除');
  remove.onclick = () => row.remove(); row.append(remove); return row;
}

function openForm(id = null) {
  const person = id ? byId(id) : null;
  $('person-form').reset(); $('person-id').value = person?.id ?? '';
  $('person-dialog-title').textContent = person ? '人物を編集' : '人物を追加';
  $('person-name').value = person?.displayName ?? ''; $('person-category').value = person?.category ?? 'OTHER';
  $('person-series').value = person?.seriesName ?? ''; $('person-username').value = person?.username ?? '';
  $('person-x-url').value = person?.xProfileUrl ?? ''; $('person-memo').value = person?.memo ?? '';
  const b = person && birthdayOf(person);
  $('person-birth-month').value = b?.month ?? ''; $('person-birth-day').value = b?.day ?? '';
  $('person-birth-year').value = b?.year ?? ''; $('person-show-age').checked = b?.showAge ?? false;
  $('remove-image-wrap').hidden = !person?.hasImage; $('delete-person').hidden = !person;
  $('anniversary-fields').replaceChildren(...(person?.anniversaries.filter((ann) => ann.type !== 'BIRTHDAY') ?? []).map(anniversaryRow));
  $('link-fields').replaceChildren(...(person?.links ?? []).map(linkRow));
  $('person-error').hidden = true;
  $('person-dialog').showModal(); $('person-name').focus();
}

async function submitPerson(event) {
  event.preventDefault(); const errorNode = $('person-error'); errorNode.hidden = true;
  const id = $('person-id').value; const old = id ? byId(id) : null;
  const month = $('person-birth-month').value, day = $('person-birth-day').value;
  if (Boolean(month) !== Boolean(day)) { errorNode.textContent = '誕生日は月と日の両方を指定してください。'; errorNode.hidden = false; return; }
  const anniversaries = [...document.querySelectorAll('#anniversary-fields .repeat-row')].map((row) => ({
    type: row.querySelector('.ann-type').value, month: row.querySelector('.ann-month').value,
    day: row.querySelector('.ann-day').value, year: row.querySelector('.ann-year').value, showAge: false,
  }));
  if (month) anniversaries.unshift({ type: 'BIRTHDAY', month, day, year: $('person-birth-year').value,
    showAge: $('person-show-age').checked });
  const links = [...document.querySelectorAll('#link-fields .repeat-row')].map((row) => ({
    url: row.querySelector('.link-url').value, label: row.querySelector('.link-label').value,
  }));
  const person = { ...old, displayName: $('person-name').value, category: $('person-category').value,
    seriesName: $('person-series').value, username: $('person-username').value,
    xProfileUrl: $('person-x-url').value, memo: $('person-memo').value, anniversaries, links };
  try {
    const file = $('person-image').files[0]; const image = file ? await compressAvatar(file) : null;
    await savePerson(state.db, person, { image, removeImage: !image && $('person-remove-image').checked });
    $('person-dialog').close(); await refresh(); toast(old ? '人物を更新しました。' : '人物を追加しました。');
  } catch (error) { errorNode.textContent = error.message; errorNode.hidden = false; }
}

function notificationMessage(notice, person) {
  return notice.daysBefore === 0 ? `今日は${person.displayName}の誕生日です`
    : notice.daysBefore === 1 ? `明日は${person.displayName}の誕生日です`
      : `${person.displayName}の誕生日まであと${notice.daysBefore}日です`;
}
function renderNotifications() {
  const list = $('notification-list'); list.replaceChildren();
  if (!state.notices.length) { empty(list, '現在表示する誕生日通知はありません。'); return; }
  for (const notice of state.notices) {
    const person = byId(notice.personId); if (!person) continue;
    const wrap = el('div', `notification-item${notice.readAt ? '' : ' unread'}`);
    const button = makePersonRow(person, notificationMessage(notice, person),
      notice.readAt ? '既読' : '未読');
    button.addEventListener('click', async () => { if (!notice.readAt) await markNotificationRead(state.db, notice.id);
      $('notification-dialog').close(); await refresh(); });
    wrap.append(button); list.append(wrap);
  }
}
function renderSettings() {
  const form = $('notification-settings');
  for (const [key, value] of Object.entries(state.settings ?? {})) if (form.elements[key]) form.elements[key].checked = value;
}
function formatBytes(bytes) { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024
  ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`; }
async function renderStorageStats() {
  const summary = await storageSummary(state.db);
  const estimate = await navigator.storage?.estimate?.();
  const appCache = await cacheBytes();
  const items = [['人物数', `${summary.people}人`], ['画像数', `${summary.images}枚`],
    ['画像の概算', formatBytes(summary.imageBytes)], ['アプリキャッシュ概算', formatBytes(appCache)],
    ['サイト総使用量概算', estimate?.usage ? formatBytes(estimate.usage) : '取得できません'],
    ['画像整合性', summary.missing.length || summary.orphan.length
      ? `参照切れ${summary.missing.length}件・孤児${summary.orphan.length}件` : '問題なし']];
  $('storage-stats').replaceChildren(...items.map(([name, value]) => el('div', 'stat-line', `${name}：${value}`)));
}

async function exportBackup() {
  try { const blob = await createBackup(state.db); const url = URL.createObjectURL(blob);
    const link = el('a'); link.href = url; link.download = `birthday-circle-local-${state.today}.zip`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('ZIPバックアップを書き出しました。安全な場所に保管してください。'); }
  catch (error) { toast(error.message); }
}
async function previewRestore(file) {
  const host = $('restore-preview'); host.hidden = true; state.preparedBackup = null;
  try {
    const prepared = await inspectBackup(file); state.preparedBackup = prepared;
    host.replaceChildren(el('p', '', `作成: ${prepared.manifest.createdAt} / 形式v${prepared.manifest.formatVersion}`),
      el('p', '', `人物${prepared.summary.people}人・画像${prepared.summary.images}枚・通知${prepared.summary.notifications}件`),
      el('p', '', '復元するとこの端末の現在データを置き換えます。必要なら先に現在のZIPを書き出してください。'));
    const confirmButton = el('button', 'primary', '内容を確認して復元'); confirmButton.type = 'button';
    confirmButton.onclick = async () => {
      if (!confirm('現在の端末データをバックアップの内容で置き換えます。先に現在のバックアップを保存しましたか？')) return;
      if (prompt('実行するには「復元」と入力してください。') !== '復元') return;
      try { await restoreBackup(state.db, prepared); state.preparedBackup = null; host.hidden = true;
        await refresh(); await renderStorageStats(); toast('復元と画像整合性確認が完了しました。'); }
      catch (error) { toast(error.message); }
    };
    host.append(confirmButton); host.hidden = false;
  } catch (error) { toast(`復元できません：${error.message}`); }
}

function initOptions() {
  for (const [key, label] of Object.entries(CATEGORIES)) {
    for (const id of ['people-category', 'birthday-category', 'person-category']) {
      const option = el('option', '', label); option.value = key; $(id).append(option);
    }
  }
  for (let month = 1; month <= 12; month++) {
    for (const id of ['people-month', 'birthday-month', 'person-birth-month']) {
      const option = el('option', '', `${month}月`); option.value = month; $(id).append(option);
    }
  }
  for (let day = 1; day <= 31; day++) { const option = el('option', '', `${day}日`);
    option.value = day; $('person-birth-day').append(option); }
}

function bindEvents() {
  for (const button of document.querySelectorAll('[data-tab]')) button.onclick = () => switchTab(button.dataset.tab);
  window.addEventListener('hashchange', () => switchTab(location.hash.slice(1)));
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && state.db) {
      const current = tokyoToday();
      if (current !== state.today) { state.today = current; await refresh(); }
    }
  });
  for (const id of ['home-add', 'people-add']) $(id).onclick = () => openForm();
  $('person-form').addEventListener('submit', submitPerson);
  $('add-anniversary').onclick = () => $('anniversary-fields').append(anniversaryRow());
  $('add-link').onclick = () => $('link-fields').append(linkRow());
  for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => $(button.dataset.close).close();
  for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); });
  $('detail-edit').onclick = () => { $('detail-dialog').close(); openForm(state.detailPersonId); };
  $('detail-choose').onclick = () => { state.selectedPersonId = state.detailPersonId;
    $('detail-dialog').close(); switchTab('calendar'); renderCalendar(); toast('カレンダーの日付をタップしてください。'); };
  $('delete-person').onclick = async () => { const person = byId($('person-id').value);
    if (!person || !confirm(`${person.displayName}を削除しますか？画像・記念日・通知も削除されます。`)) return;
    try { await deletePerson(state.db, person.id); $('person-dialog').close(); await refresh(); toast('人物を削除しました。'); }
    catch (error) { toast(error.message); } };
  $('calendar-today').onclick = () => { state.month = new Date(Date.UTC(todayYear, todayMonth - 1, 1)); renderCalendar(); };
  $('month-prev').onclick = () => { state.month = new Date(Date.UTC(state.month.getUTCFullYear(), state.month.getUTCMonth() - 1, 1)); renderCalendar(); };
  $('month-next').onclick = () => { state.month = new Date(Date.UTC(state.month.getUTCFullYear(), state.month.getUTCMonth() + 1, 1)); renderCalendar(); };
  for (const button of document.querySelectorAll('[data-rail-filter]')) button.onclick = () => {
    state.railFilter = button.dataset.railFilter;
    for (const peer of document.querySelectorAll('[data-rail-filter]')) peer.classList.toggle('active', peer === button);
    renderCalendar(); };
  for (const id of ['people-search', 'people-category', 'people-month', 'people-birthday', 'people-sort'])
    $(id).addEventListener('input', renderPeople);
  for (const id of ['birthday-month', 'birthday-category']) $(id).addEventListener('change', renderBirthdays);
  $('bell').onclick = async () => { await refresh(); $('notification-dialog').showModal(); };
  $('read-all').onclick = async () => { await markAllRead(state.db); await refresh(); };
  $('notification-settings').onsubmit = async (event) => { event.preventDefault(); const fields = event.currentTarget.elements;
    await saveSettings(state.db, Object.fromEntries(['enabled', 'seven', 'three', 'one', 'today']
      .map((key) => [key, fields[key].checked]))); await refresh(); toast('通知設定を保存しました。'); };
  $('export-backup').onclick = exportBackup;
  $('import-backup').onchange = (event) => { const file = event.target.files[0]; if (file) previewRestore(file);
    event.target.value = ''; };
  $('clear-cache').onclick = async () => { const removed = await clearOldShellCaches();
    await renderStorageStats(); toast(`${removed}件の旧アプリキャッシュを削除しました。利用者データは残っています。`); };
}

async function registerWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register(new URL('./sw.js', document.baseURI), {
      scope: new URL('./', document.baseURI).pathname,
    });
    if (registration.waiting && navigator.serviceWorker.controller) $('update-banner').hidden = false;
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) $('update-banner').hidden = false;
      });
    });
    $('update-app').onclick = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  } catch (error) { console.warn('Service Workerを登録できませんでした。', error); }
}

async function boot() {
  try {
    initOptions(); bindEvents(); state.db = await openDatabase(); await refresh();
    switchTab(location.hash.slice(1) || 'home'); await registerWorker();
  } catch (error) {
    document.querySelector('main').replaceChildren(el('div', 'empty',
      `ローカルデータを開けませんでした。ブラウザの保存設定を確認してください。${error.message}`));
    console.error(error);
  }
}
boot();
