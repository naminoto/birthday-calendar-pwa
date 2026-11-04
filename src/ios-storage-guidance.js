export const IOS_GUIDANCE_KEY = 'birthday-circle-ios-storage-guide-v1';

export function iosStorageContext(environment = {}) {
  const navigatorValue = environment.navigator ?? globalThis.navigator ?? {};
  const userAgent = environment.userAgent ?? navigatorValue.userAgent ?? '';
  const platform = environment.platform ?? navigatorValue.platform ?? '';
  const touchPoints = environment.maxTouchPoints ?? navigatorValue.maxTouchPoints ?? 0;
  const standalone = environment.standalone ?? navigatorValue.standalone === true;
  const displayStandalone = environment.displayStandalone
    ?? globalThis.matchMedia?.('(display-mode: standalone)').matches === true;
  const ios = /iPhone|iPad|iPod/i.test(userAgent)
    || platform === 'MacIntel' && touchPoints > 1;
  if (!ios) return { ios:false, mode:'other' };
  if (standalone || displayStandalone) return { ios:true, mode:'standalone' };
  const embedded = /(?:Line\/|FBAN|FBAV|Instagram|MicroMessenger|Twitter|GSA\/)/i.test(userAgent)
    || /AppleWebKit/i.test(userAgent)
      && !/(?:Safari|CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent);
  return { ios:true, mode:embedded ? 'in-app' : 'browser' };
}

const addText = (parent, tag, key, t) => {
  const node = document.createElement(tag);
  node.dataset.iosGuidanceKey = key;
  node.textContent = t(key);
  parent.append(node);
  return node;
};

export function setupIOSStorageGuidance({ t, openSettings, environment = {}, storage = globalThis.localStorage } = {}) {
  const context = iosStorageContext(environment);
  if (!context.ios) return { context, maybeShow() {}, refreshLanguage() {} };

  const host = document.getElementById('backup-settings');
  const guide = document.createElement('section');
  guide.id = 'ios-storage-guide'; guide.className = 'ios-storage-guide';
  addText(guide, 'h3', 'iosStorageGuideTitle', t);
  addText(guide, 'p', 'iosStorageGuideIntro', t);
  const steps = document.createElement('ol');
  for (let index = 1; index <= 5; index++) addText(steps, 'li', `iosStorageStep${index}`, t);
  guide.append(steps);
  const warning = addText(guide, 'p', 'iosStorageReplaceWarning', t);
  warning.className = 'transfer-warning';
  const format = addText(guide, 'p', 'iosStorageFormat', t);
  format.className = 'help';
  host?.append(guide);

  const dialog = document.createElement('dialog');
  dialog.id = 'ios-storage-dialog'; dialog.className = 'sheet ios-storage-dialog';
  const head = document.createElement('div'); head.className = 'dialog-head';
  const title = document.createElement('h2'); title.dataset.iosGuidanceRole = 'title';
  const close = document.createElement('button'); close.type = 'button'; close.className = 'icon-button';
  close.textContent = '×'; close.dataset.iosGuidanceRole = 'close';
  head.append(title, close);
  const body = document.createElement('p'); body.dataset.iosGuidanceRole = 'body';
  const inApp = document.createElement('p'); inApp.className = 'transfer-warning';
  inApp.dataset.iosGuidanceKey = 'iosStorageInApp'; inApp.textContent = t('iosStorageInApp');
  inApp.hidden = context.mode !== 'in-app';
  const actions = document.createElement('div'); actions.className = 'dialog-actions';
  const later = document.createElement('button'); later.type = 'button'; later.className = 'quiet';
  later.dataset.iosGuidanceKey = 'iosStorageLater'; later.textContent = t('iosStorageLater');
  const details = document.createElement('button'); details.type = 'button'; details.className = 'primary';
  details.dataset.iosGuidanceKey = 'iosStorageSeeSteps'; details.textContent = t('iosStorageSeeSteps');
  actions.append(later, details); dialog.append(head, body, inApp, actions); document.body.append(dialog);

  let hasData = false;
  const dismissed = () => { try { return storage?.getItem(IOS_GUIDANCE_KEY) === '1'; } catch { return false; } };
  const remember = () => { try { storage?.setItem(IOS_GUIDANCE_KEY, '1'); } catch { /* private/limited storage */ } };
  function render() {
    title.textContent = t(hasData ? 'iosStorageExistingTitle' : 'iosStorageFirstTitle');
    body.textContent = t(hasData ? 'iosStorageExistingText' : 'iosStorageFirstText');
    close.setAttribute('aria-label', t('close'));
    for (const node of dialog.querySelectorAll('[data-ios-guidance-key], #ios-storage-guide [data-ios-guidance-key]')) {
      node.textContent = t(node.dataset.iosGuidanceKey);
    }
    for (const node of guide.querySelectorAll('[data-ios-guidance-key]')) node.textContent = t(node.dataset.iosGuidanceKey);
  }
  function dismiss() { remember(); if (dialog.open) dialog.close(); }
  close.addEventListener('click', dismiss); later.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); dismiss(); });
  details.addEventListener('click', () => {
    dismiss(); openSettings?.();
    const section = document.getElementById('backup-section'); if (section) section.open = true;
    guide.scrollIntoView?.({ block:'center' });
  });
  render();
  return {
    context,
    maybeShow(value = {}) {
      hasData = Boolean(value.hasData); render();
      if (context.mode !== 'standalone' && !dismissed() && !dialog.open) dialog.showModal();
    },
    refreshLanguage: render,
  };
}
