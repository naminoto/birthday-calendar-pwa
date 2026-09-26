const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const CHECK_KEY = 'birthday-circle-last-update-check';

// 新SWは待機させ、利用者が選ぶまで現在の画面とIndexedDBに触れない。
export async function setupUpdates({ t, errorText = (error) => error.message, confirmUpdate = () => true } = {}) {
  if (!('serviceWorker' in navigator)) return null;
  const banner = document.getElementById('update-banner');
  const message = document.getElementById('update-message');
  const updateButton = document.getElementById('update-app');
  const laterButton = document.getElementById('update-later');
  let registration, dismissed = null, updating = false, reloaded = false, changedElsewhere = false, timer;
  let wasBackgrounded = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  const hasPriorVersion = () => Boolean(navigator.serviceWorker.controller || registration?.active);
  const show = () => {
    if (updating) return;
    const waiting = registration?.waiting;
    if ((!waiting || !hasPriorVersion() || waiting === dismissed) && !changedElsewhere) {
      banner.hidden = true; return;
    }
    message.textContent = t('updateAvailable');
    updateButton.textContent = t('updateNow'); laterButton.textContent = t('updateLater');
    updateButton.disabled = false; laterButton.hidden = false; banner.hidden = false;
  };
  const refreshLanguage = () => { if (updating) message.textContent = t('updating'); else show(); };
  try {
    registration = await navigator.serviceWorker.register(new URL('./sw.js', document.baseURI), {
      scope: new URL('./', document.baseURI).pathname,
    });
    // 起動時点ですでにwaitingの場合、updatefoundは再発火しないため必ず確認する。
    show();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && hasPriorVersion()) {
          dismissed = null; show();
        }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      const alreadyControlled = hadController;
      hadController = true;
      if (updating) {
        reloaded = true; clearTimeout(timer); location.reload();
      } else if (alreadyControlled && navigator.serviceWorker.controller) {
        // 別タブが更新した場合も、今の画面をいきなり破棄しない。
        changedElsewhere = true; dismissed = null; show();
      }
    });
    laterButton.onclick = () => { dismissed = registration.waiting; changedElsewhere = false; banner.hidden = true; };
    updateButton.onclick = () => {
      if (updating || !confirmUpdate()) return;
      const waiting = registration.waiting;
      if (!waiting && !changedElsewhere) { show(); return; }
      updating = true; message.textContent = t('updating'); updateButton.disabled = true; laterButton.hidden = true;
      if (changedElsewhere && !waiting) { reloaded = true; location.reload(); return; }
      try { waiting.postMessage({ type: 'SKIP_WAITING' }); }
      catch (error) {
        updating = false; message.textContent = `${t('updateWait')} ${errorText(error)}`;
        updateButton.disabled = false; laterButton.hidden = false; return;
      }
      timer = setTimeout(() => {
        if (reloaded) return;
        updating = false; message.textContent = t('updateWait');
        updateButton.disabled = false; laterButton.hidden = false;
      }, 15000);
    };
    const check = async () => {
      if (navigator.onLine === false || updating) return;
      let last = 0;
      try { last = Number(localStorage.getItem(CHECK_KEY)) || 0; } catch { /* 保存禁止環境でも更新可能 */ }
      if (Date.now() - last < CHECK_INTERVAL_MS) return;
      try {
        await registration.update();
        try { localStorage.setItem(CHECK_KEY, String(Date.now())); } catch { /* 保存禁止環境でも更新可能 */ }
      } catch { /* オフライン・一時エラーでも現在のアプリを維持 */ }
    };
    const resume = () => {
      if (wasBackgrounded) {
        wasBackgrounded = false;
        // iOSのホーム画面PWAは同じdocumentを再利用することがある。
        // 「あとで」は前面にいる間だけ有効にし、復帰時にwaitingを再提示する。
        dismissed = null;
        show();
      }
      void check();
    };
    // register自体にも更新確認はある。明示チェックは最大6時間に1回。
    void check();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') wasBackgrounded = true;
      else if (document.visibilityState === 'visible') resume();
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => { wasBackgrounded = true; });
      window.addEventListener('pageshow', resume);
    }
    return { refreshLanguage, check, show };
  } catch { return null; }
}
