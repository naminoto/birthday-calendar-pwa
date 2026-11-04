import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptBackup,decryptBackup,isEncryptedBackup,validatePassword,MAX_ENCRYPTED_BYTES,PBKDF2_ITERATIONS} from '../src/encrypted-backup.js';
import {bindPasswordPreview} from '../src/password-dialog.js';
import {readFileSync} from 'node:fs';
import {inspectBackup} from '../src/backup.js';
const password='fictional-test-passphrase-only';
function passwordPreviewHarness(initialValues){
  const doc=new EventTarget(),view=new EventTarget();doc.defaultView=view;doc.visibilityState='visible';
  const records=initialValues.map(initial=>{
    const input=new EventTarget();let value=initial,type='password',valueWrites=0,typeWrites=0;
    Object.assign(input,{ownerDocument:doc,selectionStart:2,selectionEnd:5,selectionDirection:'forward',style:{setProperty(){throw new Error('must not style password input');},removeProperty(){throw new Error('must not style password input');}}});
    Object.defineProperty(input,'value',{get:()=>value,set:next=>{value=next;valueWrites++;}});
    Object.defineProperty(input,'type',{get:()=>type,set:next=>{type=next;typeWrites++;}});
    return{input,setValue(next){value=next;},get valueWrites(){return valueWrites;},get typeWrites(){return typeWrites;}};
  });
  const fields=records.map(record=>({input:record.input,valueNode:{textContent:''}}));
  const attributes=new Map(),toggle=new EventTarget();Object.assign(toggle,{ownerDocument:doc,textContent:'',onclick:null,setAttribute:(name,value)=>attributes.set(name,value),removeAttribute:name=>attributes.delete(name)});
  const preview={hidden:true},status={textContent:''};
  const dictionary={passwordPreviewOpen:'open',passwordPreviewClose:'close',passwordPreviewEmpty:'empty',passwordPreviewVisibleStatus:'visible',passwordPreviewClosedStatus:'closed'};
  const cleanup=bindPasswordPreview(toggle,fields,preview,status,key=>dictionary[key]);
  return{doc,view,records,fields,toggle,preview,status,attributes,cleanup};
}
test('AES256-GCM round trip hides plaintext and nested filenames',async()=>{
  const raw=new Blob(['person-private-dummy images/fictional.png']);const sealed=await encryptBackup(raw,password);
  assert.equal(await isEncryptedBackup(sealed),true);assert.equal(await(await decryptBackup(sealed,password)).text(),await raw.text());
  assert.ok(!new TextDecoder().decode(await sealed.arrayBuffer()).includes('person-private-dummy'));assert.equal(sealed.size,raw.size+80);
});
test('same data and password produce independent random salts and IVs',async()=>{
  const a=new Uint8Array(await(await encryptBackup(new Blob(['same']),password)).arrayBuffer()),b=new Uint8Array(await(await encryptBackup(new Blob(['same']),password)).arrayBuffer());
  assert.notDeepEqual(a.slice(16,32),b.slice(16,32));assert.notDeepEqual(a.slice(32,44),b.slice(32,44));assert.notDeepEqual(a,b);
});
test('wrong password and authenticated-header/ciphertext modifications are rejected',async()=>{
  const b=await encryptBackup(new Blob(['private']),password);await assert.rejects(decryptBackup(b,'wrong-password'),/decryptFailed/);
  for(const offset of [16,32,64,b.size-1]){const bytes=new Uint8Array(await b.arrayBuffer());bytes[offset]^=1;await assert.rejects(decryptBackup(new Blob([bytes]),password),/decryptFailed/);}
});
test('unknown versions, excessive KDF work, truncation, trailers and reserved flags are rejected',async()=>{
  const b=await encryptBackup(new Blob(['zip']),password);
  for(const offset of [8,9,10,11,12,44,48]){const bytes=new Uint8Array(await b.arrayBuffer());bytes[offset]^=127;await assert.rejects(decryptBackup(new Blob([bytes]),password),/encryptedInvalid/);}
  await assert.rejects(decryptBackup(b.slice(0,-1),password),/encryptedInvalid/);await assert.rejects(decryptBackup(new Blob([b,'extra']),password),/encryptedInvalid/);
  assert.equal(PBKDF2_ITERATIONS,600000);
});
test('oversized encrypted input is rejected before any file read',async()=>{
  const huge={size:MAX_ENCRYPTED_BYTES+1,slice(){throw new Error('must not read');},arrayBuffer(){throw new Error('must not read');}};
  await assert.rejects(decryptBackup(huge,password),/encryptedTooLarge/);await assert.rejects(isEncryptedBackup(huge),/encryptedTooLarge/);
});
test('password checks preserve whitespace exactly and reject weak or mismatching values',async()=>{
  for(const p of ['short',' '.repeat(14),'x'.repeat(1025),'a'.repeat(15)+'\n'])assert.throws(()=>validatePassword(p),/passwordWeak/);
  assert.throws(()=>validatePassword(password,password+'!'),/passwordMismatch/);
  const p='  long-unique-password  ',b=await encryptBackup(new Blob(['secret']),p);await assert.rejects(decryptBackup(b,p.trim()),/decryptFailed/);assert.equal(await(await decryptBackup(b,p)).text(),'secret');
});
test('legacy ZIP detection remains non-encrypted and no password/key persistence is introduced',async()=>{
  assert.equal(await isEncryptedBackup(new Blob(['PK\x03\x04legacy'])),false);
  for(const file of ['encrypted-backup.js','password-dialog.js'])assert.doesNotMatch(readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),/localStorage|sessionStorage|indexedDB|console\.|fetch\(/);
  const ui=readFileSync(new URL('../src/password-dialog.js',import.meta.url),'utf8');assert.match(ui,/new-password/);assert.match(ui,/current-password/);assert.match(ui,/input.value=''/);
  assert.doesNotMatch(ui,/input-security|-webkit-text-security|setPasswordVisibility|innerHTML/);
});
test('password preview opens separately and closes without mutating inputs, focus or selection',()=>{
  const h=passwordPreviewHarness(['fictional-password','fictional-confirmation']);h.doc.activeElement=h.records[1].input;
  const pointer=new Event('pointerdown',{cancelable:true});h.toggle.dispatchEvent(pointer);assert.equal(pointer.defaultPrevented,true);
  h.toggle.onclick();assert.equal(h.preview.hidden,false);assert.deepEqual(h.fields.map(field=>field.valueNode.textContent),['fictional-password','fictional-confirmation']);
  assert.equal(h.attributes.get('aria-expanded'),'true');assert.equal(h.status.textContent,'visible');assert.equal(h.doc.activeElement,h.records[1].input);
  for(const record of h.records){assert.equal(record.input.type,'password');assert.equal(record.typeWrites,0);assert.equal(record.valueWrites,0);assert.deepEqual([record.input.selectionStart,record.input.selectionEnd,record.input.selectionDirection],[2,5,'forward']);}
  h.toggle.onclick();assert.equal(h.preview.hidden,true);assert.deepEqual(h.fields.map(field=>field.valueNode.textContent),['','']);assert.equal(h.attributes.get('aria-expanded'),'false');assert.equal(h.status.textContent,'closed');
});
test('explicit preview reads current mixed AutoFill and manual values without relying on events',()=>{
  const h=passwordPreviewHarness(['','']);h.records[0].setValue('autofilled-fictional');h.records[1].setValue('manual-fictional');h.toggle.onclick();
  assert.deepEqual(h.fields.map(field=>field.valueNode.textContent),['autofilled-fictional','manual-fictional']);h.toggle.onclick();
  h.records[0].setValue('manual-after-autofill');h.records[1].setValue('autofilled-after-focus-change');h.toggle.onclick();
  assert.deepEqual(h.fields.map(field=>field.valueNode.textContent),['manual-after-autofill','autofilled-after-focus-change']);
  for(const record of h.records){assert.equal(record.input.type,'password');assert.equal(record.typeWrites,0);assert.equal(record.valueWrites,0);}
});
test('visible preview follows input changes, distinguishes empty values and clears while hidden',()=>{
  const h=passwordPreviewHarness(['','confirmation']);h.toggle.onclick();assert.deepEqual(h.fields.map(field=>field.valueNode.textContent),['empty','confirmation']);
  h.records[0].setValue('typed-fictional');h.records[0].input.dispatchEvent(new Event('input'));assert.equal(h.fields[0].valueNode.textContent,'typed-fictional');
  h.toggle.onclick();h.records[0].setValue('must-not-remain');h.records[0].input.dispatchEvent(new Event('input'));assert.deepEqual(h.fields.map(field=>field.valueNode.textContent),['','']);
});
test('backgrounding and cleanup erase preview plaintext and detach update listeners',()=>{
  const h=passwordPreviewHarness(['fictional-password']);h.toggle.onclick();assert.equal(h.fields[0].valueNode.textContent,'fictional-password');
  h.doc.visibilityState='hidden';h.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(h.preview.hidden,true);assert.equal(h.fields[0].valueNode.textContent,'');
  h.doc.visibilityState='visible';h.toggle.onclick();h.cleanup();assert.equal(h.fields[0].valueNode.textContent,'');assert.equal(h.status.textContent,'');
  h.records[0].setValue('after-cleanup');h.records[0].input.dispatchEvent(new Event('input'));assert.equal(h.fields[0].valueNode.textContent,'');
});
test('password preview implementation never changes input type, style, value, focus or selection',()=>{
  const source=bindPasswordPreview.toString();
  assert.doesNotMatch(source,/\.type\s*=|\.style\.|\.value\s*=|\.focus\(|\.blur\(|setSelectionRange|innerHTML/);
});
test('password preview controls retain Japanese and English safety labels',()=>{
  const source=readFileSync(new URL('../src/i18n.js',import.meta.url),'utf8');
  for(const value of ["passwordPreviewOpen:'入力内容を確認'","passwordPreviewClose:'確認表示を閉じる'","passwordPreviewOpen:'Check entered values'","passwordPreviewClose:'Close password preview'"])assert.ok(source.includes(value));
});
test('successful decryption does not bypass the existing ZIP structural validation',async()=>{
  const file=await encryptBackup(new Blob(['PK fictional invalid ZIP']),password);
  await assert.rejects(inspectBackup(await decryptBackup(file,password)),/ZIP/);
});
