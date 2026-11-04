import {validatePassword} from './encrypted-backup.js';

export function bindPasswordPreview(toggle,fields,preview,status,t){
  const inputs=fields.map(field=>field.input),doc=toggle.ownerDocument,view=doc?.defaultView;
  let visible=false;
  const clear=()=>{for(const field of fields)field.valueNode.textContent='';};
  const refresh=()=>{
    if(!visible)return;
    // Read current values only when the user explicitly opens the preview or
    // while it is already visible. textContent prevents markup interpretation.
    for(const field of fields)field.valueNode.textContent=field.input.value||t('passwordPreviewEmpty');
  };
  const setVisible=next=>{
    visible=next;
    if(visible){refresh();preview.hidden=false;}
    else{preview.hidden=true;clear();}
    toggle.textContent=t(visible?'passwordPreviewClose':'passwordPreviewOpen');
    toggle.setAttribute('aria-expanded',String(visible));
    status.textContent=t(visible?'passwordPreviewVisibleStatus':'passwordPreviewClosedStatus');
  };
  const pointerdown=event=>{
    // Keep the active password editor and iOS keyboard. Keyboard and assistive
    // technology activation has no pointerdown and retains normal semantics.
    if(inputs.includes(doc?.activeElement))event.preventDefault();
  };
  const togglePreview=()=>setVisible(!visible);
  const hideWhenBackgrounded=()=>{if(doc?.visibilityState==='hidden')setVisible(false);};
  const hideOnPageExit=()=>setVisible(false);
  const refreshers=new Map();
  toggle.addEventListener('pointerdown',pointerdown);toggle.onclick=togglePreview;
  for(const input of inputs){
    const listener=()=>refresh();refreshers.set(input,listener);
    input.addEventListener('input',listener);input.addEventListener('change',listener);
  }
  doc?.addEventListener('visibilitychange',hideWhenBackgrounded);
  view?.addEventListener?.('pagehide',hideOnPageExit);
  setVisible(false);
  return ()=>{
    setVisible(false);
    toggle.removeEventListener('pointerdown',pointerdown);
    if(toggle.onclick===togglePreview)toggle.onclick=null;
    for(const [input,listener] of refreshers){input.removeEventListener('input',listener);input.removeEventListener('change',listener);}
    doc?.removeEventListener('visibilitychange',hideWhenBackgrounded);
    view?.removeEventListener?.('pagehide',hideOnPageExit);
    status.textContent='';
  };
}

// Passwords exist only in this short-lived dialog and the caller's current operation.
export function askBackupPassword(t,creating){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.id='backup-password-dialog';dialog.className='sheet password-dialog';
    const form=document.createElement('form');form.method='dialog';
    const heading=document.createElement('h2');heading.id='backup-password-title';heading.textContent=t(creating?'encryptedCreate':'encryptedOpen');dialog.setAttribute('aria-labelledby',heading.id);
    const hint=document.createElement('p');hint.className='help';hint.id='backup-password-hint';hint.textContent=t('passwordHelp');
    const fields=[];
    for(const [name,key] of creating?[['backup-password','passwordLabel'],['backup-password-confirm','passwordConfirm']]:[['backup-password','passwordLabel']]){
      const label=document.createElement('label');label.textContent=t(key);const input=document.createElement('input');input.id=name;input.name=name;input.type='password';input.required=true;input.maxLength=1024;input.autocomplete=creating?'new-password':'current-password';input.autocapitalize='none';input.spellcheck=false;input.setAttribute('aria-describedby',hint.id);if(creating)input.minLength=12;label.append(input);fields.push({label,input});
    }
    const preview=document.createElement('section');preview.id='backup-password-preview';preview.className='password-preview';preview.hidden=true;preview.setAttribute('aria-hidden','true');
    const previewWarning=document.createElement('p');previewWarning.className='password-preview-warning';previewWarning.textContent=t('passwordPreviewWarning');preview.append(previewWarning);
    const previewFields=[];
    for(const field of fields){
      const row=document.createElement('div');row.className='password-preview-row';
      const label=document.createElement('span');label.className='password-preview-label';label.textContent=field.label.firstChild.textContent;
      const valueNode=document.createElement('span');valueNode.className='password-preview-value';valueNode.dir='auto';row.append(label,valueNode);preview.append(row);previewFields.push({input:field.input,valueNode});
    }
    const previewStatus=document.createElement('p');previewStatus.id='backup-password-preview-status';previewStatus.className='visually-hidden';previewStatus.setAttribute('role','status');previewStatus.setAttribute('aria-live','polite');
    const toggle=document.createElement('button');toggle.type='button';toggle.className='quiet password-preview-toggle';toggle.textContent=t('passwordPreviewOpen');toggle.setAttribute('aria-controls',preview.id);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-describedby',previewStatus.id);
    const cleanupPreview=bindPasswordPreview(toggle,previewFields,preview,previewStatus,t);
    const error=document.createElement('p');error.className='error';error.setAttribute('role','alert');error.hidden=true;
    const actions=document.createElement('div');actions.className='actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='quiet';cancel.textContent=t('cancel');cancel.onclick=()=>finish(null);
    const submit=document.createElement('button');submit.type='submit';submit.className='primary';submit.textContent=t(creating?'encryptedCreate':'encryptedOpen');actions.append(cancel,submit);
    form.append(heading,hint,...fields.map(f=>f.label),toggle,preview,previewStatus,error,actions);dialog.append(form);document.body.append(dialog);
    let done=false;
    function finish(value){if(done)return;done=true;cleanupPreview();for(const f of fields)f.input.value='';dialog.close();dialog.remove();resolve(value);}
    form.onsubmit=event=>{event.preventDefault();try{const p=fields[0].input.value;if(creating)validatePassword(p,fields[1].input.value);finish(p);}catch(e){error.textContent=t(e.message);error.hidden=false;}};
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});dialog.showModal();fields[0].input.focus();
  });
}
