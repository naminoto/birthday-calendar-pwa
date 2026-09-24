import { all, loadSettings, replaceNotifications } from './db.js';
import { birthdayRows, TIMINGS, tokyoToday } from './model.js';

function allowed(settings, days) {
  return settings.enabled && ({ 7: settings.seven, 3: settings.three, 1: settings.one, 0: settings.today })[days];
}

export function notificationId(personId, birthdayDate, daysBefore) {
  return `${personId}:${birthdayDate}:${daysBefore}`;
}

// ログインや常駐ジョブは不要。画面を開いた日だけ既存誕生日計算から通知を生成します。
export function reconcileNotifications(people, existing, settings, today = tokyoToday()) {
  if (!settings.enabled) return [];
  const rows = birthdayRows(people, today);
  const valid = new Map(rows.map((row) => [row.person.id, row]));
  const kept = existing.filter((notice) => {
    const row = valid.get(notice.personId);
    return row && row.nextDate === notice.birthdayDate && row.daysUntil <= 7
      && TIMINGS.includes(notice.daysBefore) && allowed(settings, notice.daysBefore)
      && notice.birthdayDate >= today;
  });
  const ids = new Set(kept.map((notice) => notice.id));
  for (const row of rows) {
    if (!TIMINGS.includes(row.daysUntil) || !allowed(settings, row.daysUntil)) continue;
    const id = notificationId(row.person.id, row.nextDate, row.daysUntil);
    if (!ids.has(id)) {
      kept.push({ id, personId: row.person.id, birthdayDate: row.nextDate,
        daysBefore: row.daysUntil, createdAt: new Date().toISOString(), readAt: null });
      ids.add(id);
    }
  }
  return kept.sort((a, b) => a.birthdayDate.localeCompare(b.birthdayDate)
    || a.daysBefore - b.daysBefore || a.id.localeCompare(b.id));
}

export async function synchronizeNotifications(db, today = tokyoToday()) {
  const [people, existing, settings] = await Promise.all([
    all(db, 'people'), all(db, 'notifications'), loadSettings(db),
  ]);
  const reconciled = reconcileNotifications(people, existing, settings, today);
  const order = (a, b) => a.id.localeCompare(b.id);
  if (JSON.stringify([...existing].sort(order)) !== JSON.stringify([...reconciled].sort(order))) {
    await replaceNotifications(db, reconciled);
  }
  return { notifications: reconciled, unread: reconciled.filter((notice) => !notice.readAt).length, settings };
}
