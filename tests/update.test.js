import test from 'node:test';
import assert from 'node:assert/strict';
import { setupUpdates } from '../src/update.js';

test('更新待ちを延期し、利用者操作で1回だけ切替・再読込する。オフライン確認は通信しない', async () => {
  const names = ['navigator', 'document', 'location', 'localStorage'];
  const originals = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const node = () => ({ hidden:true, disabled:false, textContent:'', onclick:null });
  const elements = new Map(['update-banner','update-message','update-app','update-later']
    .map((name) => [name, node()]));
  const doc = new EventTarget(); doc.baseURI = 'https://example.com/repo/';
  doc.visibilityState = 'visible'; doc.getElementById = (name) => elements.get(name);
  const worker = new EventTarget(); worker.state = 'installed';
  const posts = []; worker.postMessage = (value) => posts.push(value);
  const registration = new EventTarget(); registration.waiting = worker;
  let checks = 0, reloads = 0;
  registration.update = async () => { checks++; };
  const serviceWorker = new EventTarget(); serviceWorker.controller = {};
  serviceWorker.register = async () => registration;
  const local = new Map();
  for (const [name, value] of Object.entries({
    navigator:{ serviceWorker, onLine:true }, document:doc,
    location:{ reload:() => { reloads++; } },
    localStorage:{ getItem:(key) => local.get(key), setItem:(key, value) => local.set(key, value) },
  })) Object.defineProperty(globalThis, name, { configurable:true, value });
  try {
    const manager = await setupUpdates({ t:(key) => key });
    assert.equal(elements.get('update-banner').hidden, false);
    await new Promise(setImmediate);
    assert.equal(checks, 1);
    await manager.check(); assert.equal(checks, 1);
    elements.get('update-later').onclick();
    assert.equal(elements.get('update-banner').hidden, true);
    manager.show(); assert.equal(elements.get('update-banner').hidden, true);
    navigator.onLine = false; await manager.check(); assert.equal(checks, 1);
    const replacement = new EventTarget(); replacement.state = 'installed';
    replacement.postMessage = (value) => posts.push(value);
    registration.waiting = replacement; registration.installing = replacement;
    registration.dispatchEvent(new Event('updatefound'));
    replacement.dispatchEvent(new Event('statechange'));
    assert.equal(elements.get('update-banner').hidden, false);
    elements.get('update-app').onclick();
    assert.equal(elements.get('update-message').textContent, 'updating');
    assert.deepEqual(posts, [{ type:'SKIP_WAITING' }]);
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    assert.equal(reloads, 1);
  } finally {
    for (const name of names) {
      const descriptor = originals.get(name);
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
