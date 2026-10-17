import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parseHTML} from 'linkedom';import 'fake-indexeddb/auto';
const wait=()=>new Promise(r=>setTimeout(r,25));
test('app starts unknown, manually saves confirmed test, restores history, and shows Eric controls',async()=>{
 const {window}=parseHTML(await readFile(new URL('../index.html',import.meta.url),'utf8'));
 globalThis.window=window;globalThis.document=window.document;
 Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 globalThis.localStorage={getItem:()=>null};globalThis.confirm=()=>true;
 await import('../app.js');await wait();await wait();
 const $=s=>document.querySelector(s);assert.match($('#main').textContent,/Save a fresh water test/);assert.match($('#main').textContent,/MOVE-IN PROGRESS/);assert.match($('#main').textContent,/Almost ready/);
 const click=s=>$(s).dispatchEvent(new window.Event('click',{bubbles:true}));
 click('[data-go="challenge"]');assert.equal($('[data-action="start-challenge"]').disabled,true);click('[data-go="home"]');
 click('[data-action="manual"]');await wait();assert.ok($('#save-test'));assert.equal($('#save-test').disabled,true);
 function change(selector,value){const el=$(selector);if(el.tagName==='SELECT'){for(const o of el.options)o.removeAttribute('selected');el.querySelector(`[value="${value}"]`).selected=true;}else el.value=value;el.dispatchEvent(new window.Event('change',{bubbles:true}));}
 change('[data-value="ammonia"]','0');change('[data-value="nitrite"]','0.25');change('[data-value="nitrate"]','40');
 assert.equal($('#save-test').disabled,false);click('#save-test');await wait();await wait();assert.equal($('#error').hidden,true,$('#error').textContent);assert.match($('#main').textContent,/Confirm a zero nitrite reading/);assert.match($('#notice').textContent,/Test saved/);
 click('[data-go="progress"]');assert.match($('#main').textContent,/Confirmed/);assert.match($('#main').textContent,/WHAT THE HISTORY SAYS/);assert.match($('#main').textContent,/Strict checks stay strict/);assert.ok($('#trend svg'));
 click('#eric-button');assert.match($('#main').textContent,/Back up everything/);
 const {all,closeDB}=await import('../storage.js');assert.equal((await all('readings')).filter(r=>r.confirmed).length,1);closeDB();
});
