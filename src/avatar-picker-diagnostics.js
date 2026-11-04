const ALLOWED_FIELDS = new Set([
  'operation', 'domEvent', 'files', 'valuePresent', 'generation', 'token', 'current',
  'personOpen', 'cropOpen', 'phase', 'reason', 'standalone', 'visibility', 'fileRef',
  'pickerMode', 'multiple',
]);

export function avatarPickerDiagnosticsEnabled(location = globalThis.location, document = globalThis.document) {
  try {
    const candidate = document?.querySelector?.('meta[name="yoribi-preview-version"]')?.content;
    return candidate === '1.4.3-candidate'
      && new URLSearchParams(location?.search ?? '').get('avatar-diagnostics') === '1';
  }
  catch { return false; }
}

export function avatarPickerMode(input) { return input?.multiple ? 'multiple' : 'single'; }

// 写真名・容量・MIME・画像内容は受け付けず、ピッカーとアプリの制御状態だけを記録する。
export function createAvatarPickerDiagnosticLog({ now = () => performance.now(), limit = 240 } = {}) {
  const started = now();
  let entries = [];
  return {
    record(event, fields = {}) {
      const entry = { ms:Math.max(0, Math.round(now() - started)), event:String(event) };
      for (const [key, value] of Object.entries(fields)) {
        if (!ALLOWED_FIELDS.has(key) || !['string', 'number', 'boolean'].includes(typeof value)) continue;
        entry[key] = value;
      }
      entries.push(entry);
      if (entries.length > limit) entries = entries.slice(-limit);
      return entry;
    },
    clear() { entries = []; },
    entries() { return entries.map(entry => ({ ...entry })); },
    text() { return entries.map(entry => JSON.stringify(entry)).join('\n'); },
  };
}

const noop = () => {};

export function setupAvatarPickerDiagnostics({ input, personDialog, cropDialog, anchor }) {
  const pickerMode = avatarPickerMode(input);
  if (!avatarPickerDiagnosticsEnabled()) {
    return { enabled:false, pickerMode, nextOperation:() => 0, fileRef:() => 0, record:noop, inputState:noop };
  }

  const log = createAvatarPickerDiagnosticLog();
  const fileRefs = new WeakMap();
  let operation = 0, nextFileRef = 1;
  const panel = document.createElement('details');
  panel.id = 'avatar-picker-diagnostics';
  panel.className = 'panel';
  const summary = document.createElement('summary');
  summary.textContent = `写真選択診断（端末内のみ） · ${pickerMode}`;
  const notice = document.createElement('p');
  notice.className = 'help';
  notice.textContent = `選択UI: ${pickerMode === 'multiple' ? 'multiple方式' : '単一選択'}。写真名・画像内容・容量は記録せず、イベント順序と件数だけを表示します。外部送信しません。`;
  const output = document.createElement('pre');
  output.id = 'avatar-picker-diagnostic-log';
  output.style.whiteSpace = 'pre-wrap';
  output.style.overflowWrap = 'anywhere';
  output.style.maxHeight = '16rem';
  output.style.overflow = 'auto';
  const actions = document.createElement('div');
  actions.className = 'actions';
  const copy = document.createElement('button');
  copy.type = 'button'; copy.className = 'quiet'; copy.textContent = '診断ログをコピー';
  const clear = document.createElement('button');
  clear.type = 'button'; clear.className = 'quiet'; clear.textContent = '診断ログを消去';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  actions.append(copy, clear, status); panel.append(summary, notice, output, actions); anchor.after(panel);

  function render() { output.textContent = log.text(); output.scrollTop = output.scrollHeight; }
  function record(event, fields = {}) { log.record(event, { pickerMode, multiple:Boolean(input.multiple), ...fields }); render(); }
  function fileRef(file) {
    if (!file || typeof file !== 'object') return 0;
    if (!fileRefs.has(file)) fileRefs.set(file, nextFileRef++);
    return fileRefs.get(file);
  }
  function inputState(event, phase = 'raw') {
    const file = input.files?.length === 1 ? input.files.item?.(0) ?? input.files[0] : null;
    record('input-state', { operation, domEvent:event, phase, files:Number(input.files?.length ?? -1),
      valuePresent:Boolean(input.value), fileRef:fileRef(file), personOpen:Boolean(personDialog.open),
      cropOpen:Boolean(cropDialog.open) });
  }
  function delayedStates(event) {
    queueMicrotask(() => inputState(event, 'microtask'));
    requestAnimationFrame(() => inputState(event, 'animation-frame'));
    setTimeout(() => inputState(event, '100ms'), 100);
    setTimeout(() => inputState(event, '500ms'), 500);
  }
  for (const event of ['click', 'input', 'change', 'cancel']) input.addEventListener(event, () => {
    if (event === 'click') {
      operation++;
      record('operation-start', { operation });
    }
    inputState(event, 'capture');
    // iOSがchange/cancelをどちらも通知しなくても、click後に復帰した時点のFileListを観測する。
    delayedStates(event);
  }, true);
  for (const event of ['focus', 'blur', 'pageshow', 'pagehide']) window.addEventListener(event, () => {
    record(`window-${event}`, { operation, visibility:document.visibilityState,
      personOpen:Boolean(personDialog.open), cropOpen:Boolean(cropDialog.open) });
    inputState(event, 'window');
    if (event === 'focus' || event === 'pageshow') delayedStates(event);
  });
  document.addEventListener('visibilitychange', () => {
    record('visibilitychange', { operation, visibility:document.visibilityState,
      personOpen:Boolean(personDialog.open), cropOpen:Boolean(cropDialog.open) });
    inputState('visibilitychange', 'document');
    if (document.visibilityState === 'visible') delayedStates('visibilitychange');
  });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(log.text()); status.textContent = 'コピーしました。'; }
    catch { status.textContent = 'コピーできませんでした。長押しでログを選択してください。'; }
  });
  clear.addEventListener('click', () => { log.clear(); status.textContent = ''; render(); });
  record('diagnostics-start', { standalone:Boolean(navigator.standalone || matchMedia('(display-mode: standalone)').matches),
    visibility:document.visibilityState });
  return {
    enabled:true, pickerMode,
    nextOperation() { operation++; record('operation-start', { operation }); return operation; },
    fileRef,
    record: (event, fields = {}) => record(event, { operation, ...fields }),
    inputState,
  };
}
