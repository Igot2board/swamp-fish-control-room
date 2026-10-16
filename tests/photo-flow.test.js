import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import 'fake-indexeddb/auto';
import * as db from '../storage.js';
import {blankReading} from '../model.js';
const wait=()=>new Promise(r=>setTimeout(r,25));

test('keeper reviews one editable report, resolves only the zero boundary, then saves once',async()=>{
 const {window}=parseHTML(await readFile(new URL('../index.html',import.meta.url),'utf8'));
 globalThis.window=window;globalThis.document=window.document;
 Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 globalThis.localStorage={getItem:()=>null};globalThis.confirm=()=>true;
 await db.initialize();
 const tubes=[['lowPh',[7.6,7.2]],['ph',[8.2,8]],['ammonia',[0,.25]],['nitrite',[.25,.5]],['nitrate',[20,40]]].map(([possibleKey,values])=>({possibleKey,research:{candidates:values.map(value=>({value}))}}));
 await db.put('meta',{id:'draft',value:{...blankReading(),id:'photo-test',createdAt:Date.now(),photo:new Blob(['test'],{type:'image/jpeg'}),analysis:{layout:5,tubes}}});
 await import('../app.js');await wait();await wait();
 const $=s=>document.querySelector(s),click=s=>$(s).dispatchEvent(new window.Event('click',{bubbles:true}));
 click('[data-go="review"]');
 assert.match($('#main').textContent,/Rex’s water report/);
 assert.equal($('[data-value="nitrite"]').value,'0.25');assert.equal($('[data-value="nitrate"]').value,'20');
 assert.equal($('#main input[type="checkbox"]'),null);assert.equal($('[data-accept]'),null);
 assert.equal($('#save-test').disabled,true);assert.equal(document.querySelectorAll('[data-match]').length,2);
 assert.ok($('[data-value="lowPh"]').closest('details'));assert.match($('#main').textContent,/using the high-range result/);
 // Separate retry controls open the intended picker; cancellation leaves the report intact.
 let camera=0,gallery=0;$('#camera').click=()=>camera++;$('#gallery').click=()=>gallery++;
 click('[data-retry="camera"]');await wait();click('[data-retry="gallery"]');await wait();
 assert.equal(camera,1);assert.equal(gallery,1);assert.equal($('[data-value="nitrite"]').value,'0.25');
 click('[data-match="ammonia"][data-number="0"]');await wait();
 assert.equal($('#save-test').disabled,false);
 const select=$('[data-value="nitrate"]');for(const o of select.options)o.removeAttribute('selected');select.querySelector('[value="40"]').selected=true;
 select.dispatchEvent(new window.Event('change',{bubbles:true}));await wait();
 assert.equal($('[data-value="nitrate"]').value,'40');assert.equal($('#save-test').disabled,false);
 click('#save-test');await wait();await wait();
 assert.equal($('#error').hidden,true,$('#error').textContent);
 const saved=(await db.all('readings')).find(r=>r.id==='photo-test');
 assert.equal(saved.ammonia,0);assert.equal(saved.nitrite,.25);assert.equal(saved.nitrate,40);
 assert.equal(saved.ph,8.2);assert.equal(saved.lowPh,null);assert.equal(saved.confirmed,true);
 assert.equal(saved.source,'photo_manual_override');assert.equal(saved.decisions.nitrite,'accepted');
 assert.ok(saved.photo instanceof Blob);assert.equal(await db.get('meta','draft'),undefined);
 click('[data-go="progress"]');assert.ok($('.rail .done'));assert.match($('.rail .done').textContent,/Cycling/);
 // An unparseable replacement still offers both retry paths and manual entry.
 globalThis.Image=class{naturalWidth=80;naturalHeight=80;set src(v){queueMicrotask(()=>this.onload());}};
 const create=document.createElement.bind(document);
 document.createElement=(tag)=>{
  const element=create(tag);if(tag==='canvas'){
   element.getContext=()=>({drawImage(){},getImageData(){return {width:80,height:80,data:new Uint8ClampedArray(80*80*4).fill(255)};}});
   element.toBlob=callback=>callback(new Blob(['unreadable'],{type:'image/jpeg'}));
  }return element;
 };
 $('#gallery').files=[new Blob(['photo'],{type:'image/jpeg'})];
 $('#gallery').dispatchEvent(new window.Event('change'));await wait();await wait();
 assert.match($('#main').textContent,/hide-and-seek/);assert.equal($('[data-value="ammonia"]').value,'');
 assert.ok($('[data-retry="camera"]'));assert.ok($('[data-retry="gallery"]'));
 assert.equal((await db.all('readings')).filter(r=>r.confirmed).length,1);
 db.closeDB();
});
