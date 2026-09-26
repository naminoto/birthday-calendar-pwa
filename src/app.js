import './style.css';
import './crop.css';
import { openDatabase, all, get, savePerson, deletePerson, loadSettings, saveSettings,
  markNotificationRead, markAllRead, storageSummary, loadLanguage, saveLanguage } from './db.js';
import { CATEGORIES, birthdayOf, birthdayRows, anniversaryRows, anniversaryYears,
  occurrenceForYear, calendarEvents, filterPeople, tokyoToday } from './model.js';
import { synchronizeNotifications } from './notifications.js';
import { setupAvatarEditor } from './avatar-editor.js';
import { createBackup, inspectBackup, restoreBackup } from './backup.js';
import { clearOldShellCaches, cacheBytes } from './cache-ops.js';
import { t, setLanguage, currentLanguage, applyStaticTranslations, categoryLabel,
  anniversaryLabel, monthLabel, dayLabel, errorText } from './i18n.js';
import { setupUpdates } from './update.js';
import { APP_VERSION } from './version.js';

const $ = (id) => document.getElementById(id);
let avatarEditor, updates;
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
function birthdayText(person) { const b = birthdayOf(person); return b ? t('dateDay', { month:b.month, day:b.day }) : t('birthdayUnregistered'); }
function formatDays(days) { return days === 0 ? t('daysToday') : days === 1 ? t('daysTomorrow') : t('daysUntil', { days }); }
function byId(id) { return state.people.find((person) => person.id === id); }
function eventTitle(ann) { return ann.title || anniversaryLabel(ann.type); }
function anniversaryText(ann, date) { const years = anniversaryYears(ann, date);
  return `${eventTitle(ann)}${years ? ` · ${t('anniversaryYears', { years })}` : ''}`; }

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
    [t('todayBirthdays'), rows.filter((row) => row.daysUntil === 0).length, t('todaySub')],
    [t('within7'), rows.filter((row) => row.daysUntil <= 7).length, t('sevenSub')],
    [t('monthBirthdays'), rows.filter((row) => row.birthday.month === thisMonth).length, t('monthSub')],
    [t('nextBirthday'), rows[0] ? rows[0].person.displayName : '—', rows[0] ? formatDays(rows[0].daysUntil) : t('noNext')],
  ];
  $('summary-grid').replaceChildren(...counts.map(([label, value, sub]) => {
    const card = el('div', 'summary-card'); card.append(el('span', '', label), el('b', '', value), el('small', '', sub)); return card;
  }));
  const upcoming = rows.filter((row) => row.daysUntil <= 30);
  if (!upcoming.length) empty($('home-upcoming'), t('noUpcoming'));
  else $('home-upcoming').replaceChildren(...upcoming.map((row) => makePersonRow(row.person,
    `${t('dateDay', { month:row.birthday.month, day:row.birthday.day })} · ${categoryLabel(row.person.category)}`, formatDays(row.daysUntil))));
  const others = anniversaryRows(state.people, state.today).filter((row) => row.daysUntil <= 14);
  if (!others.length) empty($('home-anniversaries'), t('noOtherUpcoming'));
  else $('home-anniversaries').replaceChildren(...others.map((row) => makePersonRow(row.person,
    `${t('dateDay', { month:Number(row.nextDate.slice(5, 7)), day:Number(row.nextDate.slice(8, 10)) })}`
      + ` · ${anniversaryText(row.ann, row.nextDate)}`,
    formatDays(row.daysUntil))));
}

function renderCalendar() {
  const year = state.month.getUTCFullYear(), month = state.month.getUTCMonth() + 1;
  $('month-title').textContent = t('dateMonth', { year, month });
  $('selection-hint').textContent = state.selectedPersonId
    ? t('selectedHint', { name:byId(state.selectedPersonId)?.displayName ?? t('persons') })
    : t('dayHint');
  const railPeople = state.railFilter === 'unregistered'
    ? state.people.filter((person) => !birthdayOf(person)) : state.people;
  $('rail-count').textContent = t('peopleCount', { count:railPeople.length });
  if (!railPeople.length) empty($('person-rail'), t('noPeople'));
  else $('person-rail').replaceChildren(...[...railPeople].sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'))
    .map((person) => {
      const button = el('button', `avatar-person${birthdayOf(person) ? ' registered' : ''}${state.selectedPersonId === person.id ? ' selected' : ''}`);
      button.type = 'button'; button.draggable = true; button.dataset.personId = person.id;
      button.title = t('railTitle', { name:person.displayName });
      button.append(avatar(person), el('small', '', person.displayName));
      let held = false;
      button.addEventListener('click', () => { if (held) { held = false; return; } openDetail(person.id); });
      button.addEventListener('dragstart', (event) => { event.dataTransfer.setData('text/plain', person.id); event.dataTransfer.effectAllowed = 'move'; });
      let hold;
      button.addEventListener('pointerdown', (event) => { held = false; if (event.pointerType !== 'mouse') hold = setTimeout(() => {
        held = true;
        state.selectedPersonId = person.id; renderCalendar(); toast(t('personSelected', { name:person.displayName }));
      }, 550); });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(type, () => clearTimeout(hold));
      return button;
    }));
  const grid = $('calendar-grid'); grid.replaceChildren();
  for (let day = 0; day < 7; day++) grid.append(el('div', 'weekday', t(`day${day}`)));
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  for (let i = 0; i < firstWeekday; i++) grid.append(el('div', 'day-spacer'));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // 人物を月ごとに一度だけ集計し、31日×人数の繰り返し走査を避ける。
  const byDay = calendarEvents(state.people, year, month,
    $('calendar-category').value, $('calendar-event-type').value);
  for (let day = 1; day <= last; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = byDay.get(date) ?? [];
    const cell = el('button', `day-cell${date === state.today ? ' today' : ''}`); cell.type = 'button';
    cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-label', t('dayAria', { month, day, count:events.length }));
    cell.append(el('span', 'day-number', day)); const pics = el('span', 'day-avatars');
    for (const entry of events.slice(0, 3)) {
      const item = el('span', `calendar-event ${entry.ann.type === 'BIRTHDAY' ? 'birthday-event' : 'anniversary-event'}`);
      item.append(el('span', 'event-mark', entry.ann.type === 'BIRTHDAY' ? '🎂' : '◇'),
        el('span', 'event-name', entry.ann.type === 'BIRTHDAY' ? entry.person.displayName
          : `${entry.person.displayName} · ${anniversaryText(entry.ann, date)}`));
      pics.append(item);
    }
    if (events.length > 3) pics.append(el('span', 'more', `+${events.length - 3}`));
    cell.append(pics);
    cell.addEventListener('click', () => { if (state.selectedPersonId) assignBirthday(state.selectedPersonId, month, day);
      else if (events.length === 1) openDetail(events[0].person.id);
      else if (events.length > 1) openDayPeople(events, month, day);
      else toast(t('emptyDay')); });
    cell.addEventListener('dragover', (event) => { event.preventDefault(); cell.classList.add('drop-target'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-target'));
    cell.addEventListener('drop', (event) => { event.preventDefault(); cell.classList.remove('drop-target');
      const personId = event.dataTransfer.getData('text/plain'); if (byId(personId)) assignBirthday(personId, month, day); });
    grid.append(cell);
  }
}

function openDayPeople(events, month, day) {
  const body = $('detail-body'); body.replaceChildren(el('p', 'help', t('dayPeople', { month, day })));
  body.append(...events.map((entry) => makePersonRow(entry.person, entry.ann.type === 'BIRTHDAY'
    ? t('birthday') : anniversaryText(entry.ann, entry.date))));
  $('detail-edit').hidden = true; $('detail-choose').hidden = true; $('detail-dialog').showModal();
}

async function assignBirthday(personId, month, day) {
  const person = byId(personId); if (!person) return;
  const anniversaries = person.anniversaries.filter((ann) => ann.type !== 'BIRTHDAY');
  const previous = birthdayOf(person);
  anniversaries.unshift({ type: 'BIRTHDAY', month, day, year: previous?.year ?? null, showAge: previous?.showAge ?? false });
  try { await savePerson(state.db, { ...person, anniversaries }); state.selectedPersonId = null;
    await refresh(); toast(t('birthdaySaved', { name:person.displayName, date:t('dateDay', { month, day }) })); }
  catch (error) { toast(errorText(error)); }
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
  $('people-count').textContent = t('peopleShown', { count:people.length });
  if (!people.length) empty($('people-list'), t('noMatches'));
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
  if (!rows.length) empty($('birthday-list'), t('noBirthdays'));
  else $('birthday-list').replaceChildren(...rows.map((row) => makePersonRow(row.person,
    `${t('dateDay', { month:row.birthday.month, day:row.birthday.day })} · ${categoryLabel(row.person.category)}`, formatDays(row.daysUntil))));
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
  if (b?.year) birthdays.push(`${t('yearLabel')} ${t('dateYear', { year:b.year })}${b.showAge ? ` · ${t('ageApprox', { age:Math.max(0, Number(state.today.slice(0, 4)) - b.year) })}` : ''}`);
  body.append(detailBlock(t('birthday'), birthdays));
  if (person.seriesName) body.append(detailBlock(t('series'), [person.seriesName]));
  if (person.memo) body.append(detailBlock(t('memo'), [person.memo]));
  if (person.anniversaries.some((ann) => ann.type !== 'BIRTHDAY')) body.append(detailBlock(t('otherAnniversaries'),
    person.anniversaries.filter((ann) => ann.type !== 'BIRTHDAY')
      .map((ann) => {
        const date = occurrenceForYear(ann, Number(state.today.slice(0, 4)));
        return `${anniversaryText(ann, date)}: ${ann.year ? `${ann.year}/` : ''}${ann.month}/${ann.day}`
          + ` · ${t(ann.recurring === false ? 'onceOnly' : 'repeatYearly')}`
          + ` · ${t(ann.notify ? 'notifyOn' : 'notifyOff')}`;
      })));
  if (person.xProfileUrl) {
    const block = detailBlock(t('xProfile'), []); const link = el('a', '', t('openX'));
    link.href = person.xProfileUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; block.append(link); body.append(block);
  }
  if (person.links.length) {
    const block = detailBlock(t('relatedUrls'), []);
    for (const item of person.links) { const link = el('a', '', item.label || item.url); link.href = item.url;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; block.append(link); }
    body.append(block);
  }
  $('detail-dialog').showModal();
}

function anniversaryRow(value = null) {
  const row = el('div', 'repeat-row anniversary-edit'); row.dataset.annId = value?.id ?? '';
  const titleLabel = el('label', '', t('anniversaryName')); const title = el('input', 'ann-title');
  title.maxLength = 100; title.required = true; title.placeholder = t('anniversaryExample');
  title.value = value ? eventTitle(value) : ''; titleLabel.append(title);
  const fields = [[t('month'), 'ann-month', value?.month, 1, 12], [t('day'), 'ann-day', value?.day, 1, 31],
    [t('optionalYear'), 'ann-year', value?.year, 1900, 2100]];
  row.append(titleLabel);
  for (const [label, cls, current, min, max] of fields) { const wrap = el('label', 'short', label);
    const input = el('input', cls); input.type = 'number'; input.min = min; input.max = max;
    input.value = current ?? ''; if (cls !== 'ann-year') input.required = true;
    wrap.append(input); row.append(wrap); }
  for (const [key, label, checked] of [
    ['recurring', t('repeatYearly'), value?.recurring !== false],
    ['showAnniversary', t('showAnniversary'), value?.showAnniversary === true],
    ['notify', t('notifyAnniversary'), value?.notify === true],
  ]) { const wrap = el('label', 'check', label); const input = el('input', `ann-${key}`);
    input.type = 'checkbox'; input.checked = checked; wrap.prepend(input); row.append(wrap); }
  const remove = el('button', '', '×'); remove.type = 'button'; remove.setAttribute('aria-label', t('removeAnn'));
  remove.onclick = () => row.remove(); row.append(remove);
  row.append(el('small', 'anniversary-hint', t('onceNeedsYear'))); return row;
}
function linkRow(value = null) {
  const row = el('div', 'repeat-row');
  for (const [label, cls, current] of [[t('url'), 'link-url', value?.url], [t('label'), 'link-label', value?.label]]) {
    const wrap = el('label', cls === 'link-label' ? 'short' : '', label); const input = el('input', cls);
    input.value = current ?? ''; if (cls === 'link-url') { input.type = 'url'; input.required = true; }
    wrap.append(input); row.append(wrap);
  }
  const remove = el('button', '', '×'); remove.type = 'button'; remove.setAttribute('aria-label', t('removeUrl'));
  remove.onclick = () => row.remove(); row.append(remove); return row;
}

function openForm(id = null) {
  const person = id ? byId(id) : null;
  $('person-form').reset(); $('person-id').value = person?.id ?? '';
  $('person-dialog-title').textContent = person ? t('personEdit') : t('personAdd');
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
  avatarEditor.reset(person ? state.images.get(person.id) : null);
  $('person-dialog').showModal();
}

async function submitPerson(event) {
  event.preventDefault(); const errorNode = $('person-error'); errorNode.hidden = true;
  if ($('avatar-crop-dialog').open) return;
  const id = $('person-id').value; const old = id ? byId(id) : null;
  const month = $('person-birth-month').value, day = $('person-birth-day').value;
  if (Boolean(month) !== Boolean(day)) { errorNode.textContent = t('bothMonthDay'); errorNode.hidden = false; return; }
  const anniversaries = [...document.querySelectorAll('#anniversary-fields .repeat-row')].map((row) => ({
    id: row.dataset.annId || undefined, type: 'CUSTOM', title: row.querySelector('.ann-title').value,
    month: row.querySelector('.ann-month').value, day: row.querySelector('.ann-day').value,
    year: row.querySelector('.ann-year').value,
    recurring: row.querySelector('.ann-recurring').checked,
    showAnniversary: row.querySelector('.ann-showAnniversary').checked,
    notify: row.querySelector('.ann-notify').checked,
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
    const image = avatarEditor.imageForSave();
    await savePerson(state.db, person, { image, removeImage: !image && $('person-remove-image').checked });
    $('person-dialog').close(); await refresh(); toast(t(old ? 'personUpdated' : 'personAdded'));
  } catch (error) { errorNode.textContent = errorText(error); errorNode.hidden = false; }
}

function notificationMessage(notice, person) {
  if (notice.anniversaryId) {
    const ann = person.anniversaries.find((item) => item.id === notice.anniversaryId);
    if (!ann) return '';
    return t(notice.daysBefore === 0 ? 'annNoticeToday' : notice.daysBefore === 1
      ? 'annNoticeTomorrow' : 'annNoticeFuture', { name:person.displayName,
      title:anniversaryText(ann, notice.birthdayDate), days:notice.daysBefore });
  }
  return notice.daysBefore === 0 ? t('noticeToday', { name:person.displayName })
    : notice.daysBefore === 1 ? t('noticeTomorrow', { name:person.displayName })
      : t('noticeFuture', { name:person.displayName, days:notice.daysBefore });
}
function renderNotifications() {
  const list = $('notification-list'); list.replaceChildren();
  if (!state.notices.length) { empty(list, t('noNotices')); return; }
  for (const notice of state.notices) {
    const person = byId(notice.personId); if (!person) continue;
    const wrap = el('div', `notification-item${notice.readAt ? '' : ' unread'}`);
    const button = makePersonRow(person, notificationMessage(notice, person),
      notice.readAt ? t('read') : t('unread'));
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
  let estimate, appCache;
  try { estimate = await navigator.storage?.estimate?.(); } catch { /* Safari等では取得不可 */ }
  try { appCache = await cacheBytes(); } catch { /* Cache Storage取得不可 */ }
  const items = [[t('storagePeople'), t('peopleCount', { count:summary.people })],
    [t('storageImages'), t('imageUnit', { count:summary.images })],
    [t('storageImageBytes'), formatBytes(summary.imageBytes)],
    [t('storageCacheBytes'), appCache == null ? t('unavailable') : formatBytes(appCache)],
    [t('storageTotal'), Number.isFinite(estimate?.usage) ? formatBytes(estimate.usage) : t('unavailable')],
    [t('storageIntegrity'), summary.missing.length || summary.orphan.length
      ? t('integrityBad', { missing:summary.missing.length, orphan:summary.orphan.length }) : t('integrityOk')]];
  $('storage-stats').replaceChildren(...items.map(([name, value]) => el('div', 'stat-line', `${name}：${value}`)));
}

async function exportBackup() {
  try { const blob = await createBackup(state.db); const url = URL.createObjectURL(blob);
    const link = el('a'); link.href = url; link.download = `birthday-circle-local-${state.today}.zip`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast(t('backupDone')); }
  catch (error) { toast(errorText(error)); }
}
async function previewRestore(file) {
  const host = $('restore-preview'); host.hidden = true; state.preparedBackup = null;
  try {
    const prepared = await inspectBackup(file); state.preparedBackup = prepared;
    host.replaceChildren(el('p', '', t('backupDate', { date:prepared.manifest.createdAt, version:prepared.manifest.formatVersion })),
      el('p', '', t('backupCounts', { people:prepared.summary.people, images:prepared.summary.images, notices:prepared.summary.notifications })),
      el('p', '', t('restoreWarning')));
    const confirmButton = el('button', 'primary', t('restoreButton')); confirmButton.type = 'button';
    confirmButton.onclick = async () => {
      if (!confirm(t('restoreConfirm'))) return;
      if (prompt(t('restorePrompt')) !== t('restoreWord')) return;
      try { await restoreBackup(state.db, prepared); state.preparedBackup = null; host.hidden = true;
        setLanguage(await loadLanguage(state.db)); $('language-choice').value = currentLanguage();
        applyStaticTranslations(); avatarEditor.refreshLanguage(); await refresh();
        await renderStorageStats(); updates?.refreshLanguage(); toast(t('restoreDone')); }
      catch (error) { toast(errorText(error)); }
    };
    host.append(confirmButton); host.hidden = false;
  } catch (error) { toast(t('restoreFailed', { message:errorText(error) })); }
}

function initOptions() {
  for (const key of Object.keys(CATEGORIES)) {
    for (const id of ['people-category', 'birthday-category', 'person-category', 'calendar-category']) {
      const option = el('option', '', categoryLabel(key)); option.value = key; $(id).append(option);
    }
  }
  for (let month = 1; month <= 12; month++) {
    for (const id of ['people-month', 'birthday-month', 'person-birth-month']) {
      const option = el('option', '', monthLabel(month)); option.value = month; $(id).append(option);
    }
  }
  for (let day = 1; day <= 31; day++) { const option = el('option', '', dayLabel(day));
    option.value = day; $('person-birth-day').append(option); }
}

function bindEvents() {
  avatarEditor = setupAvatarEditor();
  for (const button of document.querySelectorAll('[data-tab]')) button.onclick = () => switchTab(button.dataset.tab);
  $('language-choice').onchange = async (event) => {
    try {
      await saveLanguage(state.db, event.target.value);
      setLanguage(event.target.value); applyStaticTranslations(); avatarEditor.refreshLanguage();
      renderHome(); renderCalendar(); renderPeople(); renderBirthdays(); renderNotifications(); renderSettings();
      if ($('detail-dialog').open && state.detailPersonId) openDetail(state.detailPersonId);
      state.preparedBackup = null; $('restore-preview').hidden = true;
      updates?.refreshLanguage(); await renderStorageStats();
    } catch (error) { toast(errorText(error)); }
  };
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
    $('detail-dialog').close(); switchTab('calendar'); renderCalendar(); toast(t('selectCalendarDay')); };
  $('delete-person').onclick = async () => { const person = byId($('person-id').value);
    if (!person || !confirm(t('deleteQuestion', { name:person.displayName }))) return;
    try { await deletePerson(state.db, person.id); $('person-dialog').close(); await refresh(); toast(t('personDeleted')); }
    catch (error) { toast(errorText(error)); } };
  $('calendar-today').onclick = () => { state.month = new Date(Date.UTC(todayYear, todayMonth - 1, 1)); renderCalendar(); };
  $('month-prev').onclick = () => { state.month = new Date(Date.UTC(state.month.getUTCFullYear(), state.month.getUTCMonth() - 1, 1)); renderCalendar(); };
  $('month-next').onclick = () => { state.month = new Date(Date.UTC(state.month.getUTCFullYear(), state.month.getUTCMonth() + 1, 1)); renderCalendar(); };
  for (const button of document.querySelectorAll('[data-rail-filter]')) button.onclick = () => {
    state.railFilter = button.dataset.railFilter;
    for (const peer of document.querySelectorAll('[data-rail-filter]')) peer.classList.toggle('active', peer === button);
    renderCalendar(); };
  $('calendar-category').onchange = renderCalendar;
  $('calendar-event-type').onchange = renderCalendar;
  for (const id of ['people-search', 'people-category', 'people-month', 'people-birthday', 'people-sort'])
    $(id).addEventListener('input', renderPeople);
  for (const id of ['birthday-month', 'birthday-category']) $(id).addEventListener('change', renderBirthdays);
  $('bell').onclick = async () => { await refresh(); $('notification-dialog').showModal(); };
  $('read-all').onclick = async () => { await markAllRead(state.db); await refresh(); };
  $('notification-settings').onsubmit = async (event) => { event.preventDefault(); const fields = event.currentTarget.elements;
    await saveSettings(state.db, Object.fromEntries(['enabled', 'seven', 'three', 'one', 'today']
      .map((key) => [key, fields[key].checked]))); await refresh(); toast(t('settingsSaved')); };
  $('export-backup').onclick = exportBackup;
  $('import-backup').onchange = (event) => { const file = event.target.files[0]; if (file) previewRestore(file);
    event.target.value = ''; };
  $('clear-cache').onclick = async () => { try { const removed = await clearOldShellCaches();
    await renderStorageStats(); toast(t('cacheCleared', { count:removed })); }
    catch (error) { toast(errorText(error)); } };
}

async function boot() {
  try {
    initOptions(); bindEvents(); state.db = await openDatabase();
    setLanguage(await loadLanguage(state.db)); $('language-choice').value = currentLanguage();
    $('app-version').textContent = APP_VERSION; applyStaticTranslations(); await refresh();
    switchTab(location.hash.slice(1) || 'home');
    if (import.meta.env.PROD) updates = await setupUpdates({ t, errorText,
      confirmUpdate: () => !document.querySelector('dialog[open]') || confirm(t('updateUnsaved')) });
  } catch (error) {
    document.querySelector('main').replaceChildren(el('div', 'empty',
      t('dbFailed', { message:errorText(error) })));
    console.error(error);
  }
}
boot();
