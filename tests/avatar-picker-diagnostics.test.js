import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {avatarPickerDiagnosticsEnabled,avatarPickerMode,createAvatarPickerDiagnosticLog} from '../src/avatar-picker-diagnostics.js';
import {setupAvatarPickerDiagnostics as setupProductionDiagnostics} from '../src/avatar-picker-diagnostics-runtime.js';

test('写真選択診断は候補版markerと明示queryの両方がある場合だけ有効になる',()=>{
  const candidate={querySelector:()=>({content:'1.4.3-candidate'})};
  const official={querySelector:()=>null};
  assert.equal(avatarPickerDiagnosticsEnabled({search:'?avatar-diagnostics=1'},candidate),true);
  assert.equal(avatarPickerDiagnosticsEnabled({search:'?avatar-diagnostics=0'},candidate),false);
  assert.equal(avatarPickerDiagnosticsEnabled({search:''},candidate),false);
  assert.equal(avatarPickerDiagnosticsEnabled({search:'?avatar-diagnostics=1'},official),false);
});

test('診断はURLパラメータで変更せず実際のfile input方式を記録する',()=>{
  assert.equal(avatarPickerMode({multiple:true}),'multiple');
  assert.equal(avatarPickerMode({multiple:false}),'single');
  assert.equal(avatarPickerMode(null),'single');
});

test('診断ログは許可した制御情報だけを残し写真情報を捨てる',()=>{
  let time=100;
  const log=createAvatarPickerDiagnosticLog({now:()=>time,limit:10});time=143;
  log.record('change',{operation:2,files:1,valuePresent:true,fileRef:4,pickerMode:'multiple',multiple:true,
    filename:'secret.jpg',size:12345,image:'bytes'});
  assert.deepEqual(log.entries(),[{ms:43,event:'change',operation:2,files:1,valuePresent:true,fileRef:4,
    pickerMode:'multiple',multiple:true}]);
  assert.equal(log.text().includes('secret'),false);
  assert.equal(log.text().includes('12345'),false);
});

test('診断ログは上限を超えた古い行を保持しない',()=>{
  let time=0;const log=createAvatarPickerDiagnosticLog({now:()=>time,limit:2});
  log.record('first');time++;log.record('second');time++;log.record('third');
  assert.deepEqual(log.entries().map(entry=>entry.event),['second','third']);
  log.clear();assert.equal(log.text(),'');
});

test('正式runtimeはURLに関係なく診断を起動しないno-opである',()=>{
  const diagnostics=setupProductionDiagnostics({input:{multiple:true}});
  assert.equal(diagnostics.enabled,false);assert.equal(diagnostics.pickerMode,'multiple');
  assert.equal(diagnostics.nextOperation(),0);assert.equal(diagnostics.fileRef({}),0);
  assert.doesNotThrow(()=>{diagnostics.record('change');diagnostics.inputState('change');});
});

test('写真編集は正式runtimeを参照し診断実装は明示buildだけで差し替える',()=>{
  const editor=readFileSync(new URL('../src/avatar-editor.js',import.meta.url),'utf8');
  const config=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
  const prepare=readFileSync(new URL('../scripts/prepare-iphone-preview.mjs',import.meta.url),'utf8');
  const audit=readFileSync(new URL('../scripts/audit-iphone-preview.mjs',import.meta.url),'utf8');
  assert.match(editor,/avatar-picker-diagnostics-runtime\.js/);
  assert.doesNotMatch(editor,/from ['"]\.\/avatar-picker-diagnostics\.js/);
  assert.match(config,/mode === 'avatar-diagnostics'/);
  assert.match(config,/name:'yoribi-avatar-picker-diagnostics'/);
  assert.match(config,/resolveId\(source, importer\)/);
  assert.match(config,/avatar-picker-diagnostics\.js/);
  assert.match(prepare,/process\.argv\.includes\('--avatar-diagnostics'\)/);
  assert.match(prepare,/avatarDiagnostics,/);
  assert.match(audit,/diagnosticSignals\.every/);
});
