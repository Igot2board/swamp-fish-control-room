import test from 'node:test';import assert from 'node:assert/strict';import {analyzePixels,sampleRegion,researchMatches,NUMERIC_READER_VALIDATED} from '../reader.js';
function image(rgb){const data=new Uint8ClampedArray(80*80*4);for(let i=0;i<data.length;i+=4)data.set([...rgb,255],i);return {width:80,height:80,data};}
test('blank, clipped, dark, neutral samples abstain instead of guessing',()=>{for(const rgb of [[255,255,255],[0,0,0],[128,128,128]]){const im=image(rgb);assert.equal(sampleRegion(im,{x:1,y:1,width:70,height:70}).ok,false);assert.equal(analyzePixels(im).layout,null);assert.equal(researchMatches('ammonia',sampleRegion(im,{x:1,y:1,width:70,height:70})).candidates.length,0);}});
test('numeric estimates remain unvalidated and cannot be a probability',()=>{assert.equal(NUMERIC_READER_VALIDATED,false);const m=researchMatches('ammonia',{ok:true,rgb:[230,212,68]});assert.equal(m.validated,false);assert.equal(m.confidence,undefined);assert.equal(m.status,'experimental');});
test('invalid images fail explicitly',()=>assert.throws(()=>analyzePixels({width:10,height:10,data:[]})));

function tubeScene(colors){
 const w=300,h=200,data=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<data.length;i+=4)data.set([225,225,225,255],i);
 colors.forEach(([x,rgb])=>{for(let y=45;y<175;y++)for(let col=x;col<x+14;col++)data.set([...rgb,255],(y*w+col)*4);});
 return {width:w,height:h,data};
}
test('a genuine three-tube row works, but extra unresolved pH tubes prohibit three-tube fallback',()=>{
 const chemistry=[[130,[200,210,60]],[175,[170,80,160]],[220,[220,65,70]]];
 const genuine=analyzePixels(tubeScene(chemistry));assert.equal(genuine.layout,3);
 assert.deepEqual(genuine.tubes.map(t=>t.possibleKey),['ammonia','nitrite','nitrate']);
 // The left pH tubes are still there, but the high-range color defeats five-tube identification.
 const incompleteFive=analyzePixels(tubeScene([[40,[50,130,200]],[85,[220,170,60]],...chemistry]));
 assert.equal(incompleteFive.layout,null);assert.equal(incompleteFive.tubes.length,0);
 const five=analyzePixels(tubeScene([[40,[50,130,200]],[85,[200,90,130]],...chemistry]));
 assert.equal(five.layout,5);assert.equal(five.tubes[2].possibleKey,'ammonia');
});
