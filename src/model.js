export const CATEGORIES = Object.freeze({
  X_FRIEND: 'Xの友だち', REAL_FRIEND: 'リアルの友だち',
  CHARACTER: 'キャラクター', PET: 'ペット', OTHER: 'その他',
});
export const ANNIVERSARY_TYPES = Object.freeze({
  BIRTHDAY: '誕生日', OSHI_START: '推し始めた日', FRIEND_SINCE: '友だちになった日',
  WORK_RELEASE: '作品公開日', WEDDING_ANNIVERSARY: '結婚記念日',
});
export const TIMINGS = [7, 3, 1, 0];
export const DEFAULT_SETTINGS = Object.freeze({ enabled: true, seven: true, three: true, one: true, today: true });
const DAY_MS = 86400000;

export function tokyoToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const field = (name) => parts.find((part) => part.type === name).value;
  return `${field('year')}-${field('month')}-${field('day')}`;
}

export function dateParts(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日付の形式が正しくありません。');
  const [year, month, day] = date.split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== date) {
    throw new Error('日付が正しくありません。');
  }
  return { year, month, day };
}

export function validMonthDay(month, day) {
  return Number.isInteger(month) && Number.isInteger(day) && month >= 1 && month <= 12
    && day >= 1 && day <= new Date(Date.UTC(2000, month, 0)).getUTCDate();
}

function occurrenceInYear(anniversary, year) {
  const day = anniversary.month === 2 && anniversary.day === 29
    && new Date(Date.UTC(year, 1, 29)).getUTCMonth() !== 1 ? 28 : anniversary.day;
  return `${year}-${String(anniversary.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Spring版と同じく「基準日以降の次回」とし、平年の2/29は2/28とします。
export function nextOccurrence(anniversary, today) {
  if (!validMonthDay(anniversary.month, anniversary.day)) throw new Error('記念日の日付が正しくありません。');
  const { year } = dateParts(today);
  const thisYear = occurrenceInYear(anniversary, year);
  return thisYear >= today ? thisYear : occurrenceInYear(anniversary, year + 1);
}

export function daysBetween(from, to) {
  const a = dateParts(from); const b = dateParts(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS);
}

export function birthdayOf(person) {
  return person.anniversaries?.find((item) => item.type === 'BIRTHDAY') ?? null;
}

export function birthdayRows(people, today) {
  return people.flatMap((person) => {
    const birthday = birthdayOf(person);
    if (!birthday) return [];
    const nextDate = nextOccurrence(birthday, today);
    return [{ person, birthday, nextDate, daysUntil: daysBetween(today, nextDate) }];
  }).sort((a, b) => a.daysUntil - b.daysUntil
    || a.person.displayName.localeCompare(b.person.displayName, 'ja')
    || a.person.id.localeCompare(b.person.id));
}

export function filterPeople(people, { category = 'ALL', month = 0, search = '', birthday = 'all' } = {}) {
  const term = search.trim().toLocaleLowerCase();
  return people.filter((person) => {
    if (category !== 'ALL' && person.category !== category) return false;
    if (birthday === 'unregistered' && birthdayOf(person)) return false;
    if (birthday === 'registered' && !birthdayOf(person)) return false;
    if (month && !person.anniversaries.some((anniversary) => anniversary.month === Number(month))) return false;
    return !term || [person.displayName, person.username, person.seriesName, person.memo]
      .some((value) => value?.toLocaleLowerCase().includes(term));
  });
}

export function normalizePerson(input, existing = null, now = new Date().toISOString()) {
  const displayName = String(input.displayName ?? '').trim();
  if (!displayName || displayName.length > 100) throw new Error('表示名は1〜100文字で入力してください。');
  const category = input.category ?? 'OTHER';
  if (!(category in CATEGORIES)) throw new Error('カテゴリが正しくありません。');
  const username = String(input.username ?? '').trim().replace(/^@/, '') || null;
  if (username && !/^[A-Za-z0-9_]{1,50}$/.test(username)) throw new Error('X usernameの形式が正しくありません。');
  let xProfileUrl = String(input.xProfileUrl ?? '').trim() || null;
  if (xProfileUrl) {
    let url;
    try { url = new URL(xProfileUrl); } catch { throw new Error('XプロフィールURLの形式が正しくありません。'); }
    const segments = url.pathname.split('/').filter(Boolean);
    if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname.toLowerCase())
      || !['http:', 'https:'].includes(url.protocol) || segments.length !== 1
      || !/^[A-Za-z0-9_]{1,50}$/.test(segments[0]) || url.username || url.password
      || (username && segments[0].toLowerCase() !== username.toLowerCase())) {
      throw new Error('XプロフィールURLにはusernameと一致するプロフィールURLを指定してください。');
    }
    xProfileUrl = `https://x.com/${segments[0]}`;
  }
  const resolvedUsername = username ?? (xProfileUrl ? xProfileUrl.split('/').at(-1) : null);
  const anniversaries = (input.anniversaries ?? []).map((item) => {
    const month = Number(item.month); const day = Number(item.day);
    const year = item.year === '' || item.year == null ? null : Number(item.year);
    if (!(item.type in ANNIVERSARY_TYPES) || !validMonthDay(month, day)
      || (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100))
      || (year !== null && new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day)) {
      throw new Error('記念日の種類または日付が正しくありません。');
    }
    return { type: item.type, month, day, year, showAge: Boolean(item.showAge) };
  });
  if (anniversaries.filter((item) => item.type === 'BIRTHDAY').length > 1) {
    throw new Error('誕生日は1人につき1件までです。');
  }
  const links = (input.links ?? []).map((item) => {
    const url = String(item.url ?? '').trim(); const label = String(item.label ?? '').trim();
    if (!url || url.length > 2048 || label.length > 50) throw new Error('関連URLまたはラベルが長すぎます。');
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('関連URLの形式が正しくありません。'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      throw new Error('関連URLはhttp/httpsのURLを入力してください。');
    }
    return { url: parsed.href, label };
  });
  const seriesName = String(input.seriesName ?? '').trim();
  const memo = String(input.memo ?? '').trim();
  if (seriesName.length > 200 || memo.length > 5000) throw new Error('作品名またはメモが長すぎます。');
  return {
    id: existing?.id ?? crypto.randomUUID(), displayName, category, username: resolvedUsername,
    xProfileUrl: xProfileUrl ?? (resolvedUsername ? `https://x.com/${resolvedUsername}` : null),
    seriesName, memo, anniversaries, links,
    hasImage: existing?.hasImage ?? false, createdAt: existing?.createdAt ?? now, updatedAt: now,
  };
}
