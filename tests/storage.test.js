import test from 'node:test';import assert from 'node:assert/strict';import 'fake-indexeddb/auto';import * as db from '../storage.js';
globalThis.localStorage={getItem:()=>null};
test('v1 upgrade keeps original records and photos; seed is idempotent; draft and save atomic',async()=>{
 const photo=new Blob(['old-photo'],{type:'image/jpeg'});
 await new Promise((res,rej)=>{const r=indexedDB.open(db.DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('readings',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>{const c=r.result,t=c.transaction('readings','readwrite');t.objectStore('readings').add({id:1,createdAt:1,ammonia:0,photo});t.oncomplete=()=>{c.close();res();};t.onerror=rej;};});
 await db.initialize();await db.initialize();const rows=await db.all('readings');assert.equal(rows.length,10);const old=rows.find(r=>r.id===1);assert.equal(await old.photo.text(),'old-photo');assert.equal(old.confirmed,undefined);
 await db.put('meta',{id:'draft',value:{note:'unsaved',photo}});await db.saveTest({id:'new',createdAt:2,confirmed:true});assert.equal(await db.get('meta','draft'),undefined);
 await assert.rejects(db.mergeBackup({readings:[{id:'rollback'}],events:[{kind:'no-key'}]}));assert.equal(await db.get('readings','rollback'),undefined);assert.equal((await db.all('readings')).length,11);
 db.closeDB();
});
