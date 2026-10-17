import test from 'node:test';import assert from 'node:assert/strict';import {analyzePixels,analyzeGuidedPixels,sampleRegion,researchMatches,NUMERIC_READER_VALIDATED} from '../reader.js';
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

function guidedScene(){
 const w=500,h=300,data=new Uint8ClampedArray(w*h*4),centers=[.12,.31,.50,.69,.88],swx=[.19,.38,.57,.74,.91],rows=[.145,.26,.38,.495,.61,.725,.84],cast=[1.02,1,.9];
 const tubeColors=[[50,131,164],[174,93,114],[242,220,59],[173,170,178],[206,63,80]];
 const swatches=[
  [[235,218,81],[204,217,138],[165,203,157],[125,190,170],[100,178,178],[74,163,174],[50,131,164]],
  [[194,138,67],[218,125,71],[201,118,105],[174,93,114],[143,79,131],[110,70,125]],
  [[242,220,59],[200,217,90],[155,198,92],[104,173,100],[61,140,97],[31,108,93],[21,80,71]],
  [[135,200,202],[173,145,202],[155,115,185],[173,82,158],[142,63,120],[107,49,94]],
  [[230,210,75],[228,173,69],[224,125,72],[220,93,79],[206,63,80],[170,49,80],[124,41,67]]
 ];
 const put=(x,y,rgb)=>data.set([...rgb.map((v,k)=>Math.max(0,Math.min(255,Math.round(v*cast[k])))),255],(y*w+x)*4);
 for(let i=0;i<data.length;i+=4)data.set([220,210,190,255],i);
 swatches.forEach((column,n)=>column.forEach((rgb,row)=>{for(let y=Math.floor(h*(rows[row]-.022));y<Math.ceil(h*(rows[row]+.022));y++)for(let x=Math.floor(w*(swx[n]-.024));x<Math.ceil(w*(swx[n]+.024));x++)put(x,y,rgb);}));
 centers.forEach((cx,n)=>{for(let y=Math.floor(h*.38);y<Math.floor(h*.92);y++)for(let x=Math.floor(w*(cx-.026));x<Math.ceil(w*(cx+.026));x++)put(x,y,tubeColors[n]);});
 return {width:w,height:h,data};
}
test('guided capture keeps pale nitrite visible and reads tubes independently',()=>{
 const a=analyzeGuidedPixels(guidedScene());assert.equal(a.layout,5);assert.equal(a.referenceCardDetected,true);
 assert.deepEqual(a.tubes.filter((_,i)=>i!==3).map(t=>t.research.candidates[0]?.value),[7.6,8.2,0,40]);
 assert.deepEqual(a.tubes[3].research.candidates.map(c=>c.value),[0,.25]);assert.ok(a.tubes[3].sample.chroma<.12);
});
