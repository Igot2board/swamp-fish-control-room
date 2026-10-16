import {SEEDS} from './model.js';
export const DB_NAME='swamp-fish-control-room';
export const DB_VERSION=2;
let connection;
export function openDB(){
  if(connection)return Promise.resolve(connection);
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('readings'))db.createObjectStore('readings',{keyPath:'id',autoIncrement:true});for(const name of ['meta','events'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});};
    req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Close other Swamp Muppet tabs, then reopen this app.'));
    req.onsuccess=()=>{connection=req.result;connection.onversionchange=()=>{connection.close();connection=null;};resolve(connection);};
  });
}
export async function transact(stores,mode,work){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result;tx.oncomplete=()=>resolve(result&&typeof result==='object'&&'result' in result?result.result:result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Storage could not finish.'));try{result=work(tx);}catch(e){tx.abort();reject(e);}});}
export const all=store=>transact([store],'readonly',tx=>tx.objectStore(store).getAll());
export const put=(store,value)=>transact([store],'readwrite',tx=>tx.objectStore(store).put(value));
export const get=(store,id)=>transact([store],'readonly',tx=>tx.objectStore(store).get(id));
export const remove=(store,id)=>transact([store],'readwrite',tx=>tx.objectStore(store).delete(id));
export async function initialize(){
  let settings=(await get('meta','settings'))?.value;
  if(!settings){let legacy={};try{legacy=JSON.parse(localStorage.getItem('sf_settings')||'{}');}catch{}settings={gallons:legacy.gallons||'',creatureName:'Rex',movedInAt:null,challenge:null};await put('meta',{id:'settings',value:settings});}
  await transact(['readings','meta'],'readwrite',tx=>{const meta=tx.objectStore('meta');const request=meta.get('seed-v1');request.onsuccess=()=>{if(request.result)return;for(const seed of SEEDS)tx.objectStore('readings').put(seed);meta.put({id:'seed-v1',value:true});};});
  return settings;
}
export async function saveTest(record){return transact(['readings','meta'],'readwrite',tx=>{const r=tx.objectStore('readings').add(record);tx.objectStore('meta').delete('draft');return r;});}
// Full merge is atomic. Nothing clears the existing database on restore.
export async function mergeBackup(data){return transact(['readings','events','meta'],'readwrite',tx=>{
  for(const r of data.readings)tx.objectStore('readings').put(r);
  for(const e of data.events)tx.objectStore('events').put(e);
  if(data.settings)tx.objectStore('meta').put({id:'settings',value:data.settings});
});}
export function closeDB(){connection?.close();connection=null;}
