export function setupPopover({ trigger, panel, document:doc=document }) {
  const close = ({ restore=false }={}) => {
    if (panel.hidden) return;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restore) trigger.focus({ preventScroll:true });
  };
  const open = () => {
    doc.dispatchEvent(new doc.defaultView.CustomEvent('yoribi:popup-open',{detail:{owner:panel}}));
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  };
  const toggle = () => panel.hidden ? open() : close();
  const outside = (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !trigger.contains(event.target)) close();
  };
  const keys = (event) => {
    if (!panel.hidden && event.key === 'Escape') {
      event.preventDefault();
      close({ restore:true });
    }
  };
  const otherPopup = event => { if(event.detail?.owner!==panel)close(); };
  trigger.addEventListener('click', toggle);
  doc.addEventListener('pointerdown', outside, true);
  doc.addEventListener('keydown', keys, true);
  doc.addEventListener('yoribi:popup-open',otherPopup);
  return { open, close, toggle, destroy() {
    close();
    trigger.removeEventListener('click', toggle);
    doc.removeEventListener('pointerdown', outside, true);
    doc.removeEventListener('keydown', keys, true);
    doc.removeEventListener('yoribi:popup-open',otherPopup);
  } };
}
