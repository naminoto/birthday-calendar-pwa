import { validMonthDay } from './model.js';

export const BIRTHDAY_CALENDAR_YEAR = 2000;

export function birthdayCalendarDays(month) {
  const value = Number(month);
  if (!Number.isInteger(value) || value < 1 || value > 12) return [];
  const first = new Date(Date.UTC(BIRTHDAY_CALENDAR_YEAR, value - 1, 1)).getUTCDay();
  const last = new Date(Date.UTC(BIRTHDAY_CALENDAR_YEAR, value, 0)).getUTCDate();
  return [...Array(first).fill(null), ...Array.from({ length:last }, (_, index) => index + 1)];
}

export function setupBirthdayPicker({ month, day, modeButtons, monthDayPanel, calendarPanel,
  title, grid, previous, next, todayButton, today, t, monthLabel, onSelect }) {
  const todayMonth = Number(today.slice(5, 7));
  let displayMonth = Number(month.value) || todayMonth;
  let mode = 'fields';

  const setMode = (nextMode) => {
    mode = nextMode === 'calendar' ? 'calendar' : 'fields';
    for (const button of modeButtons) {
      const active = button.dataset.birthMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    monthDayPanel.hidden = mode !== 'fields';
    calendarPanel.hidden = mode !== 'calendar';
    if (mode === 'calendar') render();
  };
  const render = () => {
    const selectedMonth = Number(month.value), selectedDay = Number(day.value);
    title.textContent = monthLabel(displayMonth);
    grid.replaceChildren();
    for (let weekday = 0; weekday < 7; weekday++) {
      const label = document.createElement('span');
      label.className = 'birthday-calendar-weekday';
      label.textContent = t(`day${weekday}`);
      grid.append(label);
    }
    for (const value of birthdayCalendarDays(displayMonth)) {
      if (value === null) {
        const spacer = document.createElement('span');
        spacer.className = 'birthday-calendar-spacer';
        grid.append(spacer);
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(value);
      button.dataset.day = String(value);
      const selected = selectedMonth === displayMonth && selectedDay === value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', t('dateDay', { month:displayMonth, day:value }));
      button.onclick = () => {
        if (!validMonthDay(displayMonth, value)) return;
        onSelect(displayMonth, value);
        render();
      };
      grid.append(button);
    }
  };
  const move = (offset) => {
    displayMonth = ((displayMonth - 1 + offset + 12) % 12) + 1;
    render();
  };
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  todayButton.onclick = () => { displayMonth = todayMonth; render(); };
  // iOS Safariはselectへのプログラムフォーカスをネイティブ選択UIとして扱う。
  // 切替ボタン自身のフォーカスを維持し、月・日は利用者が明示的に操作した時だけ開く。
  for (const button of modeButtons) button.onclick = () => setMode(button.dataset.birthMode);
  month.addEventListener('change', () => { if (month.value) displayMonth = Number(month.value); if (mode === 'calendar') render(); });
  day.addEventListener('change', () => { if (mode === 'calendar') render(); });

  return {
    reset(selectedMonth='', selectedDay='') {
      displayMonth = Number(selectedMonth) || todayMonth;
      setMode('fields');
      if (selectedMonth && selectedDay) render();
    },
    sync() {
      if (month.value) displayMonth = Number(month.value);
      if (mode === 'calendar') render();
    },
    refreshLanguage() {
      for (const button of modeButtons) button.textContent = t(button.dataset.birthMode === 'calendar' ? 'birthModeCalendar' : 'birthModeFields');
      todayButton.textContent = t('birthCalendarToday');
      previous.setAttribute('aria-label', t('prevMonth'));
      next.setAttribute('aria-label', t('nextMonth'));
      if (mode === 'calendar') render();
    },
    get mode() { return mode; },
  };
}
