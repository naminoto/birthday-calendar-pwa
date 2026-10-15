import { dateParts, occurrenceForYear } from './model.js';

export const eventKey = (ann) => ann.type === 'BIRTHDAY' ? 'BIRTHDAY' : ann.id;

// 予定IDと元の表示日を照合。画像・別の記念日・生年は変更しない。
export function movedPerson(person, key, from, to) {
  const source = dateParts(from), target = dateParts(to);
  const ann = person.anniversaries.find((item) => eventKey(item) === key);
  if (!ann || occurrenceForYear(ann, source.year) !== from) throw new Error('moveStale');
  if (from === to) return null;
  return { ...person, anniversaries:person.anniversaries.map((item) => item !== ann ? item : ({
    ...item, month:target.month, day:target.day,
    year:item.type !== 'BIRTHDAY' && item.recurring === false ? target.year : item.year,
  })) };
}
