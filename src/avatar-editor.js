import { loadAvatarSource, cropAvatar } from './images.js';
import { initialCrop, cropRect, zoomCrop, gestureCrop, cropLayout } from './crop.js';
import { t, errorText } from './i18n.js';
import { setupAvatarPickerDiagnostics } from './avatar-picker-diagnostics-runtime.js';

// file pickerは閉じ方によってchange/cancelのどちらかを返し、古いWebKitでは
// cancelを返さない場合もある。操作ごとの世代で遅延した画像読込を無効化する。
export function createAvatarSelectionGuard() {
  let generation = 0;
  return {
    begin(files) {
      const token = ++generation;
      return { token, file: files?.length === 1 ? files[0] ?? files.item?.(0) ?? null : null };
    },
    invalidate() { return ++generation; },
    isCurrent(token) { return token === generation; },
    current() { return generation; },
  };
}

export function createAvatarCountToast(node, {
  duration = 4200,
  requestFrame = (callback) => requestAnimationFrame(callback),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (timer) => clearTimeout(timer),
} = {}) {
  let sequence = 0, timer = null, message = '';
  const clearScheduled = () => {
    if (timer === null) return;
    clearTimer(timer); timer = null;
  };
  const hide = () => {
    sequence += 1; clearScheduled(); message = '';
    node.hidden = true; node.textContent = '';
  };
  const show = (nextMessage) => {
    const current = ++sequence; clearScheduled(); message = nextMessage;
    // 同じ文言の連続通知でもlive regionが再度読み上げるよう、一度空にして次frameで戻す。
    node.hidden = true; node.textContent = '';
    requestFrame(() => {
      if (current !== sequence) return;
      node.hidden = false; node.textContent = message;
      timer = setTimer(() => {
        if (current !== sequence) return;
        timer = null; node.hidden = true; node.textContent = '';
      }, duration);
    });
  };
  const update = (nextMessage) => {
    message = nextMessage;
    if (!node.hidden) node.textContent = nextMessage;
  };
  return { show, hide, update };
}

// 画像選択から保存前プレビューまでの一時状態。IndexedDBへは確定済みBlobだけを渡す。
export function setupAvatarEditor() {
  const personDialog = document.getElementById('person-dialog');
  const cropDialog = document.getElementById('avatar-crop-dialog');
  const input = document.getElementById('person-image');
  input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif';
  input.closest('label').querySelector('small').textContent = t('avatarHelp');
  const remove = document.getElementById('person-remove-image');
  const error = document.getElementById('person-error');
  const countToast = createAvatarCountToast(document.getElementById('avatar-count-toast'));
  const viewport = document.getElementById('crop-viewport');
  const slider = document.getElementById('crop-zoom');
  const cropError = document.getElementById('crop-error');
  const confirm = document.getElementById('crop-confirm');
  const cancel = document.getElementById('crop-cancel');
  const close = document.getElementById('crop-close');
  const preview = document.createElement('div'); preview.id = 'person-image-preview';
  preview.className = 'image-preview'; preview.hidden = true;
  const previewImage = document.createElement('img'); previewImage.alt = '';
  const previewLabel = document.createElement('span');
  preview.append(previewImage, previewLabel); input.closest('label').after(preview);
  const diagnostics = setupAvatarPickerDiagnostics({ input, personDialog, cropDialog, anchor:preview });

  let source = null, crop = null, pending = null, pendingUrl = null, existingUrl = null;
  const selectionGuard = createAvatarSelectionGuard();
  let saving = false, gestureStart = null, avatarCountError = false;
  const pointers = new Map();

  function clearAvatarCountError() {
    if (!avatarCountError) return;
    avatarCountError = false; error.hidden = true; countToast.hide();
  }

  function showPreview() {
    const url = remove.checked ? null : pendingUrl ?? existingUrl;
    preview.hidden = !url;
    if (url) { previewImage.src = url; previewLabel.textContent = t(pendingUrl ? 'previewNew' : 'previewCurrent'); }
    else previewImage.removeAttribute('src');
  }
  function clearPending() {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    pending = null; pendingUrl = null;
  }
  function releaseSource() {
    source?.image.remove(); source?.release(); source = null; crop = null;
    pointers.clear(); gestureStart = null; input.value = '';
  }
  function cancelSelection() {
    if (saving) return;
    diagnostics.inputState('cancel-handler', 'before-invalidate');
    const generation = selectionGuard.invalidate();
    diagnostics.record('generation-invalidated', { generation, reason:'cancel' });
    releaseSource();
    clearAvatarCountError();
    // ファイルinputの選択表示を含め、未確定状態を確実に消し、最後に確定した状態から戻す。
    showPreview();
    if (cropDialog.open) cropDialog.close();
    diagnostics.inputState('cancel-handler', 'after-release');
  }
  function reset(existing = null) {
    const generation = selectionGuard.invalidate();
    diagnostics.record('generation-invalidated', { generation, reason:'person-form-reset' });
    if (cropDialog.open) cropDialog.close();
    releaseSource(); clearPending(); clearAvatarCountError(); existingUrl = existing; showPreview();
  }
  function renderCrop() {
    if (!source || !crop) return;
    const size = viewport.clientWidth;
    if (!size) return;
    const layout = cropLayout(crop, size);
    Object.assign(source.image.style, {
      width: `${layout.width}px`, height: `${layout.height}px`,
      left: `${layout.left}px`, top: `${layout.top}px`,
    });
    slider.value = String(crop.zoom);
  }
  async function selectImage() {
    const fileCount = Number(input.files?.length ?? -1);
    const { token, file } = selectionGuard.begin(input.files);
    diagnostics.record('change-handler', { files:fileCount, valuePresent:Boolean(input.value),
      token, fileRef:diagnostics.fileRef(file), personOpen:Boolean(personDialog.open), cropOpen:Boolean(cropDialog.open) });
    if (!file) {
      releaseSource(); showPreview();
      if (cropDialog.open) cropDialog.close();
      if (fileCount > 1) {
        const message = t('avatarOneOnly');
        avatarCountError = true; error.textContent = message; error.hidden = false; countToast.show(message);
      } else clearAvatarCountError();
      diagnostics.record('selection-rejected', { token, reason:'file-count-not-one', files:fileCount });
      return;
    }
    clearAvatarCountError();
    try {
      diagnostics.record('image-load-start', { token, fileRef:diagnostics.fileRef(file) });
      const loaded = await loadAvatarSource(file);
      diagnostics.record('image-load-complete', { token, fileRef:diagnostics.fileRef(file),
        current:selectionGuard.isCurrent(token), personOpen:Boolean(personDialog.open) });
      if (!selectionGuard.isCurrent(token) || !personDialog.open) {
        diagnostics.record('image-load-discarded', { token, reason:personDialog.open ? 'superseded' : 'person-dialog-closed' });
        loaded.release(); return;
      }
      releaseSource(); source = loaded;
      source.image.className = 'crop-image'; source.image.alt = '';
      viewport.insertBefore(source.image, viewport.firstChild);
      crop = initialCrop(source.width, source.height);
      cropError.hidden = true;
      diagnostics.record('crop-open', { token, reason:'one-file-loaded', fileRef:diagnostics.fileRef(file) });
      cropDialog.showModal(); renderCrop();
    } catch (failure) {
      diagnostics.record('image-load-error', { token, current:selectionGuard.isCurrent(token), reason:'decode-or-validation-error' });
      if (selectionGuard.isCurrent(token)) { input.value = ''; clearAvatarCountError(); error.textContent = errorText(failure); error.hidden = false; }
    }
  }
  function beginFileSelection() {
    if (saving) return;
    clearAvatarCountError();
    diagnostics.inputState('picker-open', 'before-clear');
    const generation = selectionGuard.invalidate();
    diagnostics.record('generation-invalidated', { generation, reason:'picker-open' });
    // ピッカーを開く前に前回のFileListを消す。古いiOSがcancelを通知しない場合も再利用しない。
    releaseSource(); showPreview();
    diagnostics.inputState('picker-open', 'after-clear');
  }
  function startGesture() {
    if (!crop) return;
    gestureStart = { crop, points: [...pointers.values()].slice(0, 2).map((point) => ({ ...point })) };
  }
  function localPoint(event) {
    const rect = viewport.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  viewport.addEventListener('pointerdown', (event) => {
    if (!crop) return;
    event.preventDefault();
    try { viewport.setPointerCapture(event.pointerId); } catch { /* 古いWebKitでは捕捉不可でも移動は続けられる。 */ }
    pointers.set(event.pointerId, localPoint(event)); startGesture();
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId) || !gestureStart) return;
    event.preventDefault(); pointers.set(event.pointerId, localPoint(event));
    crop = gestureCrop(gestureStart.crop, gestureStart.points,
      [...pointers.values()].slice(0, 2), viewport.clientWidth);
    renderCrop();
  });
  for (const eventName of ['pointerup', 'pointercancel']) viewport.addEventListener(eventName, (event) => {
    pointers.delete(event.pointerId); startGesture();
  });
  viewport.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
    if (!crop || !step) return;
    event.preventDefault();
    crop = gestureCrop(crop, [{ x: 0, y: 0 }], [{ x: step[0], y: step[1] }], viewport.clientWidth);
    renderCrop();
  });
  slider.addEventListener('input', () => { if (crop) { crop = zoomCrop(crop, Number(slider.value)); renderCrop(); } });
  window.addEventListener('resize', renderCrop);
  input.addEventListener('click', beginFileSelection);
  input.addEventListener('change', selectImage);
  input.addEventListener('cancel', cancelSelection);
  remove.addEventListener('change', () => {
    if (remove.checked) { selectionGuard.invalidate(); releaseSource(); clearPending(); }
    showPreview();
  });
  confirm.addEventListener('click', async () => {
    if (!source || !crop || saving) return;
    const current = source;
    saving = true; confirm.disabled = true; cancel.disabled = true; close.disabled = true;
    cropError.hidden = true;
    try {
      const blob = await cropAvatar(current, cropRect(crop));
      if (source !== current) return;
      clearPending(); pending = blob; pendingUrl = URL.createObjectURL(blob);
      remove.checked = false; showPreview(); releaseSource(); cropDialog.close();
    } catch (failure) { cropError.textContent = errorText(failure); cropError.hidden = false; }
    finally { saving = false; confirm.disabled = false; cancel.disabled = false; close.disabled = false; }
  });
  cropDialog.addEventListener('cancel', (event) => { event.preventDefault(); cancelSelection(); });
  cropDialog.addEventListener('close', () => { releaseSource(); showPreview(); });
  cancel.addEventListener('click', cancelSelection);
  close.addEventListener('click', cancelSelection);
  personDialog.addEventListener('close', () => reset());
  return { reset, imageForSave: () => pending, refreshLanguage: () => {
    showPreview(); if (avatarCountError) { const message = t('avatarOneOnly'); error.textContent = message; countToast.update(message); }
  },
    selectionState: () => ({ temporary:Boolean(source), confirmed:Boolean(pending), inputSelected:Boolean(input.files?.length) }) };
}
