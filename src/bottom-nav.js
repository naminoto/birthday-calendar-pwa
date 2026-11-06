const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function setupBottomNavMotion(nav = document.querySelector('.bottom-nav')) {
  if (!nav) return { update() {}, destroy() {} };
  const buttons = [...nav.querySelectorAll('[data-tab]')];
  const indicator = document.createElement('span');
  indicator.className = 'bottom-nav-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  nav.prepend(indicator);

  const reducedMotion = window.matchMedia(MOTION_QUERY);
  let currentTab = null;
  let ready = false;
  let resizeFrame = 0;

  const placeIndicator = (button, animate) => {
    if (!button) return;
    if (!animate) nav.classList.add('nav-positioning');
    const navBox = nav.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    nav.style.setProperty('--nav-indicator-x', `${buttonBox.left - navBox.left}px`);
    nav.style.setProperty('--nav-indicator-y', `${buttonBox.top - navBox.top}px`);
    nav.style.setProperty('--nav-indicator-width', `${buttonBox.width}px`);
    nav.style.setProperty('--nav-indicator-height', `${buttonBox.height}px`);
    requestAnimationFrame(() => {
      nav.classList.remove('nav-positioning');
      if (!ready) {
        ready = true;
        nav.classList.add('nav-motion-ready');
      }
    });
  };

  const replayIconMotion = (button) => {
    for (const peer of buttons) peer.classList.remove('nav-icon-animate');
    // 同じ要素へ短時間に戻った場合も、前回のkeyframesを確実に終了してから再生する。
    void button.offsetWidth;
    button.classList.add('nav-icon-animate');
    button.addEventListener('animationend', () => button.classList.remove('nav-icon-animate'), { once:true });
  };

  const update = (tab, { animate = true } = {}) => {
    const button = buttons.find(candidate => candidate.dataset.tab === tab);
    if (!button) return;
    const changed = currentTab !== null && currentTab !== tab;
    const shouldAnimate = Boolean(animate && changed && !reducedMotion.matches);
    placeIndicator(button, shouldAnimate);
    if (shouldAnimate) replayIconMotion(button);
    currentTab = tab;
  };

  const reposition = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const active = buttons.find(button => button.dataset.tab === currentTab)
        ?? buttons.find(button => button.classList.contains('active'));
      if (active) placeIndicator(active, false);
    });
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(reposition) : null;
  observer?.observe(nav);
  window.addEventListener('resize', reposition, { passive:true });

  return {
    update,
    destroy() {
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      window.removeEventListener('resize', reposition);
      indicator.remove();
    },
  };
}
