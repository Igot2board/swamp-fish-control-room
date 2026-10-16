// Local-only research reader. Geometry is heuristic; numeric estimates are never confirmed data.
export const READER_VERSION='rex-local-0.3';
export const NUMERIC_READER_VALIDATED=false;
const palettes={lowPh:[[6,[235,218,81]],[6.4,[204,217,138]],[6.6,[165,203,157]],[6.8,[125,190,170]],[7,[100,178,178]],[7.2,[74,163,174]],[7.6,[50,131,164]]],ammonia:[[0,[242,220,59]],[.25,[200,217,90]],[.5,[155,198,92]],[1,[104,173,100]],[2,[61,140,97]],[4,[31,108,93]],[8,[21,80,71]]],nitrite:[[0,[135,200,202]],[.25,[173,145,202]],[.5,[155,115,185]],[1,[173,82,158]],[2,[142,63,120]],[5,[107,49,94]]],nitrate:[[0,[230,210,75]],[5,[228,173,69]],[10,[224,125,72]],[20,[220,93,79]],[40,[206,63,80]],[80,[170,49,80]],[160,[124,41,67]]],ph:[[7.4,[194,138,67]],[7.8,[218,125,71]],[8,[201,118,105]],[8.2,[174,93,114]],[8.4,[143,79,131]],[8.8,[110,70,125]]]};
function lab(rgb){let [r,g,b]=rgb.map(v=>v/255).map(v=>v>.04045?((v+.055)/1.055)**2.4:v/12.92);const f=v=>v>.008856?Math.cbrt(v):7.787*v+16/116;const x=f((r*.4124+g*.3576+b*.1805)/.95047),y=f(r*.2126+g*.7152+b*.0722),z=f((r*.0193+g*.1192+b*.9505)/1.08883);return [116*y-16,500*(x-y),200*(y-z)];}
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
export function sampleRegion(image,box){
 const {width:w,height:h,data}=image;let pixels=[],clipped=0,total=0;
 const x0=Math.max(0,Math.floor(box.x)),y0=Math.max(0,Math.floor(box.y)),x1=Math.min(w,Math.ceil(box.x+box.width)),y1=Math.min(h,Math.ceil(box.y+box.height));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*w+x)*4;if(data[i+3]<200)continue;total++;const rgb=[data[i],data[i+1],data[i+2]],mx=Math.max(...rgb),mn=Math.min(...rgb);if(mn>=240||mx<30){clipped++;continue;}if(mx-mn<12)continue;pixels.push(rgb);}
 if(total<25||pixels.length<25||pixels.length/total<.25)return {ok:false,reason:'No reliable liquid color in this area.',coverage:total?pixels.length/total:0};
 const rgb=[0,1,2].map(i=>median(pixels.map(p=>p[i]))),l=lab(rgb),spread=median(pixels.map(p=>distance(l,lab(p))));
 return {ok:spread<22&&clipped/total<.45,rgb,spread,clipped:clipped/total,coverage:pixels.length/total,reason:spread>=22?'Reflections or mixed colors.':clipped/total>=.45?'Too much glare or shadow.':null};
}
export function researchMatches(key,sample){
 if(!sample.ok||!palettes[key])return {status:'unreadable',candidates:[],validated:false};
 const normalize=rgb=>rgb.map(v=>v*220/Math.max(...rgb));
 const ranked=palettes[key].map(([value,rgb])=>({value,distance:(key==='ammonia'?.3:.85)*distance(lab(normalize(sample.rgb)),lab(normalize(rgb)))+(key==='ammonia'?.7:.15)*distance(lab(sample.rgb),lab(rgb))})).sort((a,b)=>a.distance-b.distance);
 return {status:'experimental',candidates:ranked.slice(0,2),validated:false,decisionBoundary:ranked.slice(0,2).some(p=>p.value===0)};
}
function category(r,g,b){const max=Math.max(r,g,b),min=Math.min(r,g,b);if(max<40||max-min<20||(max-min)/max<.20)return 0;
 // Broad hue groups avoid most brown furniture but are not semantic test identification.
 if(b>r*1.08&&b>g*.85)return 1;
 if(r>g*1.18&&b>g*1.12)return 2;
 if(r>g*1.7&&r>b*1.5)return 3;
 if(g>b*1.4&&r>b*1.4&&g>r*.72)return 4;
 if(g>r*1.08&&g>b*1.12)return 4;
 return 0;
}
export function analyzePixels(image){
 const {width:w,height:h,data}=image;if(!w||!h||data.length!==w*h*4)throw Error('Invalid image pixels.');
 const labels=new Uint8Array(w*h),seen=new Uint8Array(w*h);let luminous=0,bright=0,dark=0,gradient=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2],v=(r+g+b)/3;luminous+=v;if(v>246)bright++;if(v<20)dark++;labels[y*w+x]=category(r,g,b);if(x>0)gradient+=Math.abs(v-(data[i-4]+data[i-3]+data[i-2])/3);}
 const quality={mean:luminous/(w*h),bright:bright/(w*h),dark:dark/(w*h),edge:gradient/(w*h)};
 if(quality.mean<25||quality.mean>245||quality.edge<.6)return {version:READER_VERSION,quality,tubes:[],layout:null,message:'This photo is too dark, washed out, or lacks enough detail. Try another photo or enter your readings.'};
 // Trace vertical hue runs before grouping columns. This avoids joining tube bottoms
 // to colored furniture or to adjacent printed chart swatches.
 const columns=[];
 for(let x=1;x<w-1;x++){
  let best=null;
  for(let y=Math.floor(h*.12);y<h*.91;){
   const cat=labels[y*w+x];if(!cat){y++;continue;}
   const start=y;let matches=0,gap=0;
   while(y<h*.91){if(labels[y*w+x]===cat){matches++;gap=0;}else if(++gap>3)break;y++;}
   const end=y-gap,length=end-start;
   if(length>h*.22&&matches/Math.max(1,length)>.72&&(!best||length>best.height))best={x,y:start,width:1,height:length,cat};
   if(y===start)y++;
  }
  if(best)columns.push(best);
 }
 let boxes=[];
 for(const c of columns){const prev=boxes.at(-1);if(prev&&c.x<=prev.x+prev.width+2&&c.cat===prev.cat&&Math.abs(c.y-prev.y)<h*.10&&Math.abs(c.y+c.height-prev.y-prev.height)<h*.10){const end=Math.max(prev.y+prev.height,c.y+c.height);prev.width=c.x-prev.x+1;prev.y=Math.min(c.y,prev.y);prev.height=end-prev.y;}else boxes.push({...c});}
 boxes=boxes.filter(b=>b.width>w*.009&&b.width<w*.13&&b.height/b.width>2&&b.x>w*.03&&b.x+b.width<w*.97);
 // Do not infer test identities from count alone. A candidate row must also have
 // the expected hue order, near-even spacing, and a shared liquid base.
 let group=[],bestScore=Infinity;const triples=[],evidence=[...boxes];
 function choose(n,start=0,chosen=[]){if(chosen.length===n){
  const cats=chosen.map(b=>b.cat),expected=n===5?[[1],[2,3],[4],[1,2],[3]]:[[4],[1,2],[3]];
  if(cats.some((c,i)=>!expected[i].includes(c)))return;
  const centers=chosen.map(b=>b.x+b.width/2),gaps=centers.slice(1).map((x,i)=>x-centers[i]),mean=gaps.reduce((s,v)=>s+v,0)/gaps.length;
  if(Math.min(...gaps)<w*.035||Math.max(...gaps)/Math.min(...gaps)>1.8)return;
  const ends=chosen.map(b=>b.y+b.height);if(Math.max(...ends)-Math.min(...ends)>h*.16)return;
  const score=gaps.reduce((s,g)=>s+Math.abs(g-mean)/mean,0);
  if(n===3)triples.push({chosen,score});
  else if(score<bestScore){bestScore=score;group=chosen;}return;
 }for(let i=start;i<boxes.length;i++)choose(n,i+1,[...chosen,boxes[i]]);}
 if(boxes.length<=30){choose(5);choose(3);}
 // A second pass tolerates narrow flash stripes splitting otherwise usable tubes.
 // It searches shared liquid bands, not hardcoded image coordinates or file names.
 if(group.length<5){
  const original=boxes;
  for(const startFraction of [.35,.40,.45,.50])for(const lengthFraction of [.25,.32,.40]){
   const y0=Math.floor(h*startFraction),bh=Math.floor(h*lengthFraction);if(y0+bh>h*.91)continue;
   const bands=[];
   for(let x=1;x<w-1;x++){const counts=[0,0,0,0,0];for(let y=y0;y<y0+bh;y++)counts[labels[y*w+x]]++;
    let cat=0;for(let k=1;k<5;k++)if(counts[k]>counts[cat]||cat===0)cat=k;
    if(counts[cat]/bh<.66)continue;
    const prev=bands.at(-1);if(prev&&prev.cat===cat&&x<=prev.x+prev.width+2)prev.width=x-prev.x+1;else bands.push({x,y:y0,width:1,height:bh,cat});
   }
   boxes=bands.filter(b=>b.width>w*.012&&b.width<w*.10&&b.x>w*.04&&b.x+b.width<w*.96&&b.height/b.width>1.5);
   evidence.push(...boxes);
   if(boxes.length<=25){choose(5);choose(3);}
  }
  boxes=original;
 }

 // A partial five-tube row must never become a chemistry-only row just because
 // the three rightmost tubes were easier to find. Check all passes for extra
 // tube-shaped color in the same liquid band before accepting any triple.
 if(!group.length){
  for(const {chosen} of triples.sort((a,b)=>a.score-b.score)){
   const centers=chosen.map(b=>b.x+b.width/2),gap=(centers[2]-centers[0])/2;
   const base=median(chosen.map(b=>b.y+b.height)),height=median(chosen.map(b=>b.height));
   const extra=evidence.some(b=>{
    const center=b.x+b.width/2;
    if(centers.some(x=>Math.abs(x-center)<gap*.40))return false;
    const overlap=Math.max(0,Math.min(base,b.y+b.height)-Math.max(base-height,b.y));
    return overlap>=height*.55&&Math.abs(b.y+b.height-base)<h*.18;
   });
   if(!extra){group=chosen;break;}
  }
 }

 const tubes=group.map(b=>({...b,sample:sampleRegion(image,{x:b.x+b.width*.25,y:b.y+b.height*.22,width:b.width*.5,height:b.height*.52})}));
 const layout=[3,5].includes(tubes.length)?tubes.length:null;
 const keys=layout===5?['lowPh','ph','ammonia','nitrite','nitrate']:layout===3?['ammonia','nitrite','nitrate']:[];
 for(let i=0;i<tubes.length;i++){tubes[i].possibleKey=keys[i]||null;tubes[i].research=researchMatches(keys[i],tubes[i].sample);}
 return {version:READER_VERSION,quality,tubes,layout,message:layout?`Found ${layout} possible tubes. Check their order below.`:'I could not reliably separate all the tubes. You can still enter your card readings.',numericValidated:false,referenceCardDetected:false};
}
export async function readPhoto(file){
 if(!file||!file.type.startsWith('image/'))throw Error('Choose a JPG, PNG, or another supported photo.');
 if(file.size>25*1024*1024)throw Error('That photo is too large. Choose one under 25 MB.');
 const url=URL.createObjectURL(file);const img=new Image();
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('This photo could not be opened. Try a JPG or PNG.'));img.src=url;});
 if(img.naturalWidth*img.naturalHeight>50000000)throw Error('Try a smaller photo under 50 megapixels.');
 const canvas=document.createElement('canvas'),scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));if(!blob)throw Error('Could not prepare this photo. Try another.');
 const small=document.createElement('canvas'),s=Math.min(1,480/Math.max(canvas.width,canvas.height));small.width=Math.round(canvas.width*s);small.height=Math.round(canvas.height*s);const ctx=small.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,small.width,small.height);
 const analysis=analyzePixels(ctx.getImageData(0,0,small.width,small.height));return {blob,analysis,width:small.width,height:small.height};
 }finally{URL.revokeObjectURL(url);}
}
