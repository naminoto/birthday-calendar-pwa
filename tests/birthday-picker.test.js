import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BIRTHDAY_CALENDAR_YEAR,birthdayCalendarDays} from '../src/birthday-picker.js';

test('誕生日カレンダーは閏年基準で2月29日を選べる',()=>{
  assert.equal(BIRTHDAY_CALENDAR_YEAR,2000);
  const days=birthdayCalendarDays(2).filter(Number.isInteger);
  assert.equal(days[0],1);assert.equal(days.at(-1),29);assert.equal(days.length,29);
});
test('誕生日カレンダーは各月の日数と先頭曜日用空白を返す',()=>{
  for(const [month,last] of [[1,31],[4,30],[12,31]]){
    const values=birthdayCalendarDays(month),days=values.filter(Number.isInteger);
    assert.equal(days.length,last);assert.equal(days.at(-1),last);assert.ok(values.length>=last);
  }
  assert.deepEqual(birthdayCalendarDays(0),[]);assert.deepEqual(birthdayCalendarDays(13),[]);
});
test('入力方式の切替はネイティブ月selectへプログラムフォーカスしない',async()=>{
  const source=await readFile(new URL('../src/birthday-picker.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bmonth\)\.focus|:\s*month\)\.focus|month\.focus/);
  assert.match(source,/button\.onclick = \(\) => setMode\(button\.dataset\.birthMode\)/);
});
