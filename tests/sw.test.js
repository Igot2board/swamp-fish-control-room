import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
function setup(overrides={}){const handlers={},messages=[],deleted=[];let skipped=0;const clients=[{id:'one',url:'https://example.test/swamp/',postMessage:m=>messages.push(['one',m])},{id:'two',url:'https://example.test/swamp/',postMessage:m=>messages.push(['two',m])}];const self={location:{href:'https://example.test/swamp/sw.js'},addEventListener:(k,f)=>handlers[k]=f,clients:{matchAll:async()=>clients,claim:async()=>{}},skipWaiting:async()=>{skipped++;}};const caches={keys:async()=>['other-app','swamp-fish-v1','swamp-muppet-previous'],delete:async key=>{deleted.push(key);},open:async()=>({match:async()=>null})};vm.runInNewContext(source,{self,caches,URL,crypto,Date,Set,Headers,Response,fetch:async()=>{throw Error('offline')},...overrides});return {handlers,messages,deleted,get skipped(){return skipped}};}
async function dispatch(handler,data,source={id:'one'}){let work;handler({data,source,waitUntil:p=>work=p});await work;}
test('update waits for every tab and respects an unfinished test',async()=>{const env=setup();await dispatch(env.handlers.message,{type:'REQUEST_ACTIVATION'});let token=env.messages[0][1].token;await dispatch(env.handlers.message,{type:'ACTIVATION_VOTE',token,safe:true},{id:'one'});assert.equal(env.skipped,0);await dispatch(env.handlers.message,{type:'ACTIVATION_VOTE',token,safe:false},{id:'two'});assert.equal(env.skipped,0);await dispatch(env.handlers.message,{type:'REQUEST_ACTIVATION'});token=env.messages.at(-1)[1].token;for(const id of ['one','two'])await dispatch(env.handlers.message,{type:'ACTIVATION_VOTE',token,safe:true},{id});assert.equal(env.skipped,1);});
test('cache cleanup leaves other apps untouched',async()=>{const env=setup();let work;env.handlers.activate({waitUntil:p=>work=p});await work;assert.deepEqual(env.deleted,['swamp-fish-v1','swamp-muppet-previous']);});
test('offline image miss does not return HTML fallback',async()=>{const env=setup();let response;env.handlers.fetch({request:{url:'https://example.test/swamp/photo.jpg',method:'GET',mode:'cors'},respondWith:p=>response=p});await assert.rejects(response,/offline/);});

test('redirected HTML is normalized before caching and before a navigation replay',async()=>{
 const makePage=()=>{const r=new Response('<h1>Rex</h1>',{headers:{'content-type':'text/html','content-encoding':'gzip'}});Object.defineProperties(r,{redirected:{value:true},url:{value:'https://example.test/swamp/'}});return r;};
 const cached=new Map(),build=source.match(/const BUILD='([^']+)'/)[1];
 const env=setup({fetch:async url=>String(url).endsWith('version.json')?Response.json({build}):makePage(),caches:{open:async()=>({put:async(url,response)=>cached.set(String(url),response),match:async()=>makePage()}),delete:async()=>{}}});
 let installed;env.handlers.install({waitUntil:p=>installed=p});await installed;
 const stored=cached.get('https://example.test/swamp/index.html');assert.equal(stored.redirected,false);assert.equal(stored.headers.get('content-type'),'text/html');assert.equal(stored.headers.get('content-encoding'),null);assert.equal(await stored.text(),'<h1>Rex</h1>');
 let work;env.handlers.fetch({request:{url:'https://example.test/swamp/',method:'GET',mode:'navigate',redirect:'manual'},respondWith:p=>work=p});
 const page=await work;assert.equal(page.redirected,false);assert.equal(await page.text(),'<h1>Rex</h1>');
});
test('cross-origin sign-in redirects are not saved as application HTML',async()=>{
 const page=new Response('Sign in');Object.defineProperties(page,{redirected:{value:true},url:{value:'https://auth.example/login'}});
 const env=setup({caches:{open:async()=>({match:async()=>page})}});let work;
 env.handlers.fetch({request:{url:'https://example.test/swamp/',method:'GET',mode:'navigate'},respondWith:p=>work=p});await assert.rejects(work,/outside this app/);
});
