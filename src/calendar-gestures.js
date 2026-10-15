// 委譲登録し、ジェスチャー終了時に一時リスナーとghostを回収する。
// 長押し成立後だけtouchmoveを抑止。長押し前のスワイプはスクロールへ渡す。
export function setupCalendarGestures({ grid, roots, onMove, onSelect, document:doc = document, window:win = window }) {
  let gesture = null, suppressed = null;
  const clean = () => {
    if (!gesture) return;
    clearTimeout(gesture.timer); gesture.abort.abort();
    gesture.ghost?.remove(); gesture.target?.classList.remove('drop-target');
    gesture.item.classList.remove('dragging');
    try { gesture.item.releasePointerCapture(gesture.pointerId); } catch { /* capture未成立 */ }
    gesture = null;
  };
  const cancel = () => { if (gesture?.active) suppressed = { item:gesture.item, until:Date.now()+800 }; clean(); };
  const start = (event) => {
    if (gesture) { if (event.pointerId !== gesture.pointerId) cancel(); return; }
    if (event.button !== 0 || event.isPrimary === false) return;
    const item = event.target.closest('.calendar-event, .avatar-person, .person-card');
    if (!item) return;
    const calendar = grid.contains(item), touch = event.pointerType !== 'mouse';
    if (!calendar && !touch) return;
    const abort = new AbortController();
    const current = gesture = { item, calendar, touch, pointerId:event.pointerId, x:event.clientX, y:event.clientY, abort, active:false };
    const updateTarget = (x, y) => {
      if (!current.ghost) return;
      current.ghost.style.left = `${x+12}px`; current.ghost.style.top = `${y-25}px`;
      const cell = doc.elementFromPoint(x, y)?.closest('.day-cell');
      const target = cell && grid.contains(cell) ? cell : null;
      current.target?.classList.remove('drop-target'); current.target = target;
      target?.classList.add('drop-target');
    };
    const arm = () => {
      if (gesture !== current) return;
      current.active = true;
      if (!calendar) { onSelect(item.dataset.personId); return; }
      item.classList.add('dragging');
      const ghost = item.cloneNode(true); ghost.classList.add('drag-ghost');
      ghost.setAttribute('aria-hidden', 'true'); ghost.removeAttribute('aria-label'); ghost.tabIndex = -1;
      current.ghost = ghost; doc.body.append(ghost);
      try { item.setPointerCapture(event.pointerId); } catch { /* documentでも追跡 */ }
      updateTarget(current.x, current.y);
    };
    const options = { signal:abort.signal };
    doc.addEventListener('pointermove', (move) => {
      if (move.pointerId !== current.pointerId) return;
      const distance = Math.hypot(move.clientX-current.x, move.clientY-current.y);
      if (!current.active && distance > 9) { if (touch) { clean(); return; } arm(); }
      if (current.active && calendar) { move.preventDefault(); updateTarget(move.clientX, move.clientY); }
    }, options);
    doc.addEventListener('touchmove', (move) => { if (current.active) move.preventDefault(); }, { ...options, passive:false });
    doc.addEventListener('pointerup', (up) => {
      if (up.pointerId !== current.pointerId) return;
      if (current.active) {
        suppressed = { item, until:Date.now()+800 };
        if (calendar) {
          updateTarget(up.clientX, up.clientY);
          const to = current.target?.dataset.date;
          const payload = { personId:item.dataset.personId, key:item.dataset.eventKey, from:item.closest('.day-cell').dataset.date, to };
          clean(); if (to && to !== payload.from) onMove(payload); return;
        }
      }
      clean();
    }, options);
    doc.addEventListener('pointercancel', cancel, options);
    doc.addEventListener('keydown', (key) => { if (key.key === 'Escape') cancel(); }, options);
    if (touch) current.timer = setTimeout(arm, 550);
  };
  const click = (event) => {
    if (event.detail > 0 && suppressed && Date.now() < suppressed.until) {
      event.preventDefault(); event.stopImmediatePropagation(); suppressed = null;
    }
  };
  const menu = (event) => { if (event.target.closest('.calendar-event, .avatar-person, .person-card')) event.preventDefault(); };
  const key = (event) => {
    const item = event.target.closest('.avatar-person, .person-card');
    if (item && event.shiftKey && event.key === 'Enter') { event.preventDefault(); onSelect(item.dataset.personId); }
  };
  for (const root of roots) {
    root.addEventListener('pointerdown', start);
    root.addEventListener('contextmenu', menu); root.addEventListener('keydown', key);
  }
  win.addEventListener('pagehide', cancel); win.addEventListener('blur', cancel);
  // 長押し後にレイアウトが変わりclickの対象が変わっても二重操作しない。
  // 次の独立したタップはpointerdownで解除し、操作を待たせない。
  const newPointer = (event) => { suppressed = null; if (gesture && event.pointerId !== gesture.pointerId) cancel(); };
  doc.addEventListener('pointerdown', newPointer, true); doc.addEventListener('click', click, true);
  const hidden = () => { if (doc.visibilityState === 'hidden') cancel(); };
  doc.addEventListener('visibilitychange', hidden);
  return { cancel, destroy() { cancel(); for (const root of roots) {
    root.removeEventListener('pointerdown', start);
    root.removeEventListener('contextmenu', menu); root.removeEventListener('keydown', key);
  } win.removeEventListener('pagehide', cancel); win.removeEventListener('blur', cancel); doc.removeEventListener('visibilitychange', hidden);
    doc.removeEventListener('pointerdown', newPointer, true); doc.removeEventListener('click', click, true); } };
}
