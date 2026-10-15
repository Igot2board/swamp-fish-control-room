(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const round = (n, d = 1) => Number(n.toFixed(d));

  const palettes = {
    ammonia: [
      {v:0,c:'#f2dc3b',rgb:[242,220,59]},{v:.25,c:'#c8d95a',rgb:[200,217,90]},{v:.5,c:'#9bc65c',rgb:[155,198,92]},
      {v:1,c:'#68ad64',rgb:[104,173,100]},{v:2,c:'#3d8c61',rgb:[61,140,97]},{v:4,c:'#1f6c5d',rgb:[31,108,93]},{v:8,c:'#155047',rgb:[21,80,71]}
    ],
    nitrite: [
      {v:0,c:'#87c8ca',rgb:[135,200,202]},{v:.25,c:'#ad91ca',rgb:[173,145,202]},{v:.5,c:'#9b73b9',rgb:[155,115,185]},
      {v:1,c:'#ad529e',rgb:[173,82,158]},{v:2,c:'#8e3f78',rgb:[142,63,120]},{v:5,c:'#6b315e',rgb:[107,49,94]}
    ],
    nitrate: [
      {v:0,c:'#e6d24b',rgb:[230,210,75]},{v:5,c:'#e4ad45',rgb:[228,173,69]},{v:10,c:'#e07d48',rgb:[224,125,72]},
      {v:20,c:'#dc5d4f',rgb:[220,93,79]},{v:40,c:'#ce3f50',rgb:[206,63,80]},{v:80,c:'#aa3150',rgb:[170,49,80]},{v:160,c:'#7c2943',rgb:[124,41,67]}
    ],
    ph: [
      {v:7.4,c:'#c28a43',rgb:[194,138,67]},{v:7.8,c:'#da7d47',rgb:[218,125,71]},{v:8.0,c:'#c97669',rgb:[201,118,105]},
      {v:8.2,c:'#ae5d72',rgb:[174,93,114]},{v:8.4,c:'#8f4f83',rgb:[143,79,131]},{v:8.8,c:'#6e467d',rgb:[110,70,125]}
    ]
  };

  const defaults = { creatureName:'Swamp Fish Salander', gallons:'', wifeMode:true };
  const state = {
    reading: {ammonia:0,nitrite:0,nitrate:0,ph:8.2,temp:70,challenge:false,note:''},
    photoBlob:null, photoDataUrl:null, photoNatural:{w:0,h:0}, whiteScale:[1,1,1], scan:null,
    readings:[], settings:{...defaults}, challengeStarted:null, deferredInstall:null
  };

  // ---------- IndexedDB ----------
  const DB_NAME='swamp-fish-control-room'; const DB_VER=1; const STORE='readings';
  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VER);
      req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true}); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function dbAll(){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);}); }
  async function dbAdd(obj){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');const r=tx.objectStore(STORE).add(obj);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}); }
  async function dbClear(){ const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');const r=tx.objectStore(STORE).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error);}); }

  function loadLocal(){
    try { state.settings={...defaults,...JSON.parse(localStorage.getItem('sf_settings')||'{}')}; } catch { state.settings={...defaults}; }
    const timer=Number(localStorage.getItem('sf_challenge_started')); state.challengeStarted=Number.isFinite(timer)&&timer>0?timer:null;
  }
  function saveLocal(){ localStorage.setItem('sf_settings',JSON.stringify(state.settings)); if(state.challengeStarted) localStorage.setItem('sf_challenge_started',String(state.challengeStarted)); else localStorage.removeItem('sf_challenge_started'); }

  // ---------- Navigation ----------
  function showPage(name){
    $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
    $$('.page').forEach(p=>p.classList.toggle('active',p.dataset.pagePanel===name));
    if(name==='history') renderHistory();
  }
  $$('.tab').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));

  // ---------- Reading chips ----------
  function buildChips(key, target){
    const wrap=$(target); wrap.innerHTML='';
    palettes[key].forEach(item=>{
      const b=document.createElement('button'); b.type='button'; b.className='reading-chip'; b.dataset.value=String(item.v);
      b.innerHTML=`<span class="chip-dot" style="background:${item.c}"></span>${item.v}${item.v===5&&key==='nitrite'?'+':''}`;
      b.setAttribute('aria-label',`${key} ${item.v} ppm`);
      b.addEventListener('click',()=>{state.reading[key]=item.v; updateChips(); evaluate();});
      wrap.appendChild(b);
    });
  }
  buildChips('ammonia','#ammoniaChoices'); buildChips('nitrite','#nitriteChoices'); buildChips('nitrate','#nitrateChoices');
  function updateChips(){
    [['ammonia','#ammoniaChoices','#ammoniaOut'],['nitrite','#nitriteChoices','#nitriteOut'],['nitrate','#nitrateChoices','#nitrateOut']].forEach(([key,sel,out])=>{
      $$('.reading-chip',$(sel)).forEach(b=>b.classList.toggle('active',Number(b.dataset.value)===state.reading[key]));
      $(out).textContent=`${state.reading[key]} ppm`;
    });
  }

  ['#phInput','#tempInput','#challengeInput','#noteInput'].forEach(sel=>$(sel).addEventListener(sel==='#challengeInput'?'change':'input',()=>{
    state.reading.ph=Number($('#phInput').value); state.reading.temp=clamp(Number($('#tempInput').value)||70,45,90); state.reading.challenge=$('#challengeInput').checked; state.reading.note=$('#noteInput').value.trim(); evaluate();
  }));
  $('#resetReadingBtn').addEventListener('click',()=>{
    state.reading={ammonia:0,nitrite:0,nitrate:0,ph:8.2,temp:70,challenge:false,note:''};
    $('#phInput').value='8.2';$('#tempInput').value='70';$('#challengeInput').checked=false;$('#noteInput').value=''; updateChips();evaluate();
  });

  function verdict(){
    const r=state.reading; const steps=[]; const gates=[];
    const amPass=r.ammonia===0, niPass=r.nitrite===0, nitratePass=r.nitrate<20, tempPass=r.temp<=68, phPass=r.ph>=7.2&&r.ph<=8.4;
    gates.push(['Ammonia',amPass,`${r.ammonia} ppm`, 'Needs 0 ppm']); gates.push(['Nitrite',niPass,`${r.nitrite} ppm`,'Needs 0 ppm']); gates.push(['Nitrate',nitratePass,`${r.nitrate} ppm`,'Prefer <20 ppm before move-in']); gates.push(['Temperature',tempPass,`${r.temp}°F`,'Aim 60–68°F']); gates.push(['pH',phPass,`${r.ph}`,'Stable ~7.2–8.4 is workable']);
    let code='CYCLING', title='HOLD — cycle still in progress', text='', cls='status-hold';
    if(r.challenge && amPass && niPass){ code='CHALLENGE PASS'; title='GO — biofilter challenge passed'; cls='status-ready'; text='The 24-hour challenge cleared to 0 ammonia and 0 nitrite.'; if(!nitratePass) steps.push('Do a water change before move-in to bring nitrate below about 20 ppm.'); if(!tempPass) steps.push('Cool the tank into the 60–68°F range, then verify it stays stable.'); if(!phPass) steps.push('Re-check pH. Avoid rapid pH-up/down swings.'); if(steps.length===0) steps.push('Final husband/wife victory lap: verify temperature, hides, safe substrate, and a normal-looking animal before move-in.'); }
    else if(amPass&&niPass){ code='FINAL TEST'; title='Ready for the 1 ppm challenge'; cls='status-ready'; text='Ammonia and nitrite are both zero. The biofilter is ready for its commissioning test.'; steps.push('Dose the empty tank to about 1 ppm ammonia once.','Wait 24 hours.','Pass = 0 ppm ammonia AND 0 ppm nitrite after 24 hours.'); }
    else { text='The biofilter is working, but measurable ammonia or nitrite means the axolotl stays out for now.'; if(r.ammonia>0) steps.push('Do not add another ammonia dose while ammonia is still measurable.'); if(r.nitrite>0) steps.push('Let the nitrite-processing bacteria work; retest in 24–48 hours.'); if(r.nitrite>=5) steps.push('If nitrite stays pegged for days, a partial water change can bring it back into a readable range.'); }
    if(r.nitrate>40) steps.push('Nitrate is high. Plan a substantial water change before move-in.'); else if(r.nitrate>=20 && !(r.challenge&&amPass&&niPass)) steps.push('Nitrate is accumulating normally; lower it before move-in.');
    if(r.temp>68 && !(r.challenge&&amPass&&niPass)) steps.push('This temperature is fine for cycling, but cool the tank before the axolotl moves in.');
    if(phPass) steps.push('pH is in a workable range; stability beats chasing a “perfect” number with chemicals.');
    const gateCount=[amPass,niPass,nitratePass,tempPass,phPass].filter(Boolean).length;
    return {code,title,text,steps,gates,gateCount,cls};
  }

  function evaluate(){
    const v=verdict();
    $('#statusCode').textContent=v.code; $('#statusTitle').textContent=v.title; $('#statusText').textContent=v.text; $('#cycleScore').textContent=v.gateCount+' / 5'; $('#cycleBar').style.width=(v.gateCount/5*100)+'%';
    const hero=$('#heroStatus'); hero.classList.remove('status-hold','status-ready','status-fail'); hero.classList.add(v.cls);
    $('#verdictTitle').textContent=v.title; $('#verdictText').textContent=v.text;
    $('#nextSteps').innerHTML=v.steps.map((s,i)=>`<div class="step"><span class="step-num">${i+1}</span><span>${escapeHtml(s)}</span></div>`).join('');
    $('#gateList').innerHTML=v.gates.map(([name,pass,val,hint])=>`<div class="gate-row ${pass?'gate-pass':'gate-fail'}"><span class="gate-icon">${pass?'✓':'!'}</span><div><strong>${name}</strong><small>${escapeHtml(hint)}</small></div><span class="gate-state">${escapeHtml(val)}</span></div>`).join('');
    $('#diagA').textContent=state.reading.ammonia.toFixed(2);$('#diagN').textContent=state.reading.nitrite.toFixed(2);$('#diagNa').textContent=state.reading.nitrate;$('#diagPh').textContent=state.reading.ph;$('#diagT').textContent=state.reading.temp;$('#diagState').textContent=v.code==='CHALLENGE PASS'?'GO':'HOLD';
    $('#flowA').textContent=state.reading.ammonia===0?'Stage 1 is clearing ammonia to the API kit’s zero reading.':`Residual ammonia: ${state.reading.ammonia} ppm.`;
    $('#flowN').textContent=state.reading.nitrite===0?'Stage 2 is clearing nitrite to zero.':`Residual nitrite: ${state.reading.nitrite} ppm — this is the current bottleneck.`;
    $('#flowNa').textContent=state.reading.nitrate===0?'No nitrate measured yet / recently diluted.':`Nitrate present at ${state.reading.nitrate} ppm; manage it with water changes before move-in.`;
    $('#terminalText').textContent=[
      `AXO-01 // ${new Date().toLocaleString()}`,
      `NH3=${state.reading.ammonia} ppm | NO2=${state.reading.nitrite} ppm | NO3=${state.reading.nitrate} ppm`,
      `pH=${state.reading.ph} | TEMP=${state.reading.temp}F | CHALLENGE=${state.reading.challenge?'YES':'NO'}`,
      `READINESS_GATES=${v.gateCount}/5 | GATE=${v.code}`, 
      `ACTION=${v.steps[0]||'VERIFY'}`
    ].join('\n');
  }

  function escapeHtml(s){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  // ---------- Save / history ----------
  async function compressPhoto(file){
    if(!file) return null;
    const img=await fileToImage(file); const max=1280; const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement('canvas'); c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return await new Promise(res=>c.toBlob(res,'image/jpeg',.76));
  }
  function fileToImage(file){ return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(u);res(img)};img.onerror=rej;img.src=u;}); }

  $('#saveReadingBtn').addEventListener('click',async()=>{
    const btn=$('#saveReadingBtn'); const old=btn.textContent; btn.disabled=true;btn.textContent='Saving…';
    try{
      const rec={createdAt:Date.now(), ...state.reading, creatureName:state.settings.creatureName||'Swamp Fish Salander', photo:state.photoBlob||null};
      await dbAdd(rec); state.readings=await dbAll(); btn.textContent='Logged ✓'; setTimeout(()=>btn.textContent=old,1300);
    }catch(e){alert('Could not save this reading on the device. '+(e?.message||''));btn.textContent=old;}finally{setTimeout(()=>btn.disabled=false,500)}
  });

  async function renderHistory(){
    try{state.readings=await dbAll();}catch{state.readings=[]}
    const list=$('#historyList'), empty=$('#historyEmpty');
    if(!state.readings.length){list.innerHTML='';empty.classList.remove('hidden');$('#chartWrap').classList.add('hidden');$('#chartEmpty').classList.remove('hidden');return;}
    empty.classList.add('hidden'); $('#chartWrap').classList.remove('hidden');$('#chartEmpty').classList.add('hidden');
    const sorted=[...state.readings].sort((a,b)=>b.createdAt-a.createdAt);
    list.innerHTML='';
    for(const r of sorted){
      const card=document.createElement('div');card.className='history-card';
      const date=new Date(r.createdAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
      card.innerHTML=`<div class="history-top"><div><strong>${escapeHtml(date)}</strong><div class="history-values">NH₃ ${r.ammonia} • NO₂ ${r.nitrite} • NO₃ ${r.nitrate} • pH ${r.ph} • ${r.temp}°F</div>${r.note?`<div class="history-note">${escapeHtml(r.note)}</div>`:''}</div></div>`;
      if(r.photo){const img=document.createElement('img');img.className='history-thumb';img.alt='Saved test photo';img.src=URL.createObjectURL(r.photo);$('.history-top',card).appendChild(img)}
      list.appendChild(card);
    }
    drawChart();
  }
  $('#chartMetric').addEventListener('change',drawChart);
  function drawChart(){
    if(!state.readings.length)return;
    const metric=$('#chartMetric').value; const data=[...state.readings].sort((a,b)=>a.createdAt-b.createdAt).slice(-24);
    const svg=$('#trendChart'); const W=700,H=280,p={l:48,r:20,t:18,b:34}; const vals=data.map(r=>Number(r[metric])); let min=Math.min(...vals),max=Math.max(...vals);
    if(metric==='temp'){min=Math.min(min,60);max=Math.max(max,72)} else if(metric==='ph'){min=Math.min(min,7);max=Math.max(max,8.8)} else {min=0;max=Math.max(max,metric==='nitrate'?20:1)} if(max===min)max=min+1;
    const x=i=>p.l+(data.length===1?(W-p.l-p.r)/2:i*(W-p.l-p.r)/(data.length-1)); const y=v=>p.t+(max-v)*(H-p.t-p.b)/(max-min);
    const grid=[0,.25,.5,.75,1].map(f=>{const yy=p.t+f*(H-p.t-p.b);const val=max-f*(max-min);return `<line class="chart-grid" x1="${p.l}" y1="${yy}" x2="${W-p.r}" y2="${yy}"/><text class="chart-label" x="4" y="${yy+4}">${round(val,metric==='temp'?0:1)}</text>`}).join('');
    const pts=data.map((r,i)=>`${x(i)},${y(Number(r[metric]))}`).join(' '); const dots=data.map((r,i)=>`<circle class="chart-dot" cx="${x(i)}" cy="${y(Number(r[metric]))}" r="5"><title>${new Date(r.createdAt).toLocaleDateString()}: ${r[metric]}</title></circle>`).join('');
    const first=new Date(data[0].createdAt).toLocaleDateString([], {month:'short',day:'numeric'}), last=new Date(data[data.length-1].createdAt).toLocaleDateString([], {month:'short',day:'numeric'});
    svg.innerHTML=`${grid}<polyline class="chart-line" points="${pts}"/>${dots}<text class="chart-label" x="${p.l}" y="${H-8}">${first}</text><text class="chart-label" text-anchor="end" x="${W-p.r}" y="${H-8}">${last}</text>`;
  }

  // ---------- Photo assist ----------
  const canvas=$('#photoCanvas'), ctx=canvas.getContext('2d',{willReadFrequently:true}); let photoImg=null; let whiteMode=false;
  $('#photoInput').addEventListener('change',async e=>{
    const file=e.target.files?.[0]; if(!file||!file.type.startsWith('image/'))return;
    try{
      photoImg=await fileToImage(file); state.photoBlob=await compressPhoto(file); state.photoDataUrl=URL.createObjectURL(file); state.photoNatural={w:photoImg.naturalWidth,h:photoImg.naturalHeight};
      const max=1400, scale=Math.min(1,max/photoImg.naturalWidth);canvas.width=Math.round(photoImg.naturalWidth*scale);canvas.height=Math.round(photoImg.naturalHeight*scale);ctx.drawImage(photoImg,0,0,canvas.width,canvas.height);
      $('#photoStage').classList.remove('hidden');$('#photoEmpty').classList.add('hidden');$('#whiteBalanceBtn').disabled=false;$('#clearPhotoBtn').disabled=false;$('#photoHint').textContent='Tap the center of a tube. Optional: tap “card white” first, then tap a white area of the API card.';
    }catch{alert('Could not load that image.');}
  });
  $('#clearPhotoBtn').addEventListener('click',()=>{photoImg=null;state.photoBlob=null;state.scan=null;state.whiteScale=[1,1,1];$('#photoInput').value='';$('#photoStage').classList.add('hidden');$('#photoEmpty').classList.remove('hidden');$('#applyScanBtn').disabled=true;$('#scanSuggestion').textContent='—';$('#scanConfidence').textContent='Load a photo, then tap the tube.';$('#confidenceBar').style.width='0';$('#sampleSwatch').style.background='#192a33';$('#sampleRgb').textContent='No sample';$('#sampleDetail').textContent='White-balance calibration is optional.';});
  $('#whiteBalanceBtn').addEventListener('click',()=>{whiteMode=true;$('#photoHint').textContent='White balance mode: tap a neutral white area of the API card.';});
  canvas.addEventListener('pointerup',ev=>{
    const rect=canvas.getBoundingClientRect(); const x=(ev.clientX-rect.left)*canvas.width/rect.width; const y=(ev.clientY-rect.top)*canvas.height/rect.height;
    if(x<0||y<0||x>=canvas.width||y>=canvas.height)return;
    showMarker(ev.clientX-rect.left,ev.clientY-rect.top,rect.width,rect.height);
    const rgb=sampleAverage(x,y,Math.max(4,Math.round(canvas.width/180)));
    if(whiteMode){state.whiteScale=[255/Math.max(1,rgb[0]),255/Math.max(1,rgb[1]),255/Math.max(1,rgb[2])].map(v=>clamp(v,.65,1.55));whiteMode=false;$('#photoHint').textContent='White balance calibrated. Now select a test type and tap the center of its tube.';$('#sampleDetail').textContent='Card-white calibration applied.';return;}
    const balanced=rgb.map((v,i)=>clamp(Math.round(v*state.whiteScale[i]),0,255)); analyzeSample(balanced);
  });
  function showMarker(px,py,w,h){const m=$('#tapMarker');m.classList.remove('hidden');m.style.left=(px/w*100)+'%';m.style.top=(py/h*100)+'%';}
  function sampleAverage(cx,cy,r){const d=ctx.getImageData(Math.max(0,cx-r),Math.max(0,cy-r),Math.min(canvas.width,cx+r)-Math.max(0,cx-r),Math.min(canvas.height,cy+r)-Math.max(0,cy-r)).data;const arr=[];for(let i=0;i<d.length;i+=4){const bright=(d[i]+d[i+1]+d[i+2])/3;if(d[i+3]>200&&bright>18&&bright<245)arr.push([d[i],d[i+1],d[i+2]])}if(!arr.length)return[0,0,0];arr.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));const trimmed=arr.slice(Math.floor(arr.length*.12),Math.ceil(arr.length*.88));return[0,1,2].map(k=>Math.round(trimmed.reduce((s,p)=>s+p[k],0)/trimmed.length));}
  function rgbToLab(rgb){
    let [r,g,b]=rgb.map(v=>v/255).map(v=>v>.04045?Math.pow((v+.055)/1.055,2.4):v/12.92); let x=(r*.4124+g*.3576+b*.1805)/.95047,y=(r*.2126+g*.7152+b*.0722),z=(r*.0193+g*.1192+b*.9505)/1.08883; const f=v=>v>.008856?Math.cbrt(v):(7.787*v)+(16/116);x=f(x);y=f(y);z=f(z);return[(116*y)-16,500*(x-y),200*(y-z)];
  }
  function distLab(a,b){return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2)}
  function analyzeSample(rgb){
    const key=$('#scanTestSelect').value, lab=rgbToLab(rgb); const ranked=palettes[key].map(p=>({...p,d:distLab(lab,rgbToLab(p.rgb))})).sort((a,b)=>a.d-b.d); const best=ranked[0], second=ranked[1];
    const margin=Math.max(0,second.d-best.d), confidence=clamp(Math.round((margin/(second.d+1))*120 + (1-Math.min(best.d,70)/70)*35),5,96);
    state.scan={key,value:best.v,confidence,rgb}; $('#scanSuggestion').textContent=`${best.v}${key==='ph'?'':' ppm'}`;$('#scanConfidence').textContent=`${confidence}% confidence • assisted estimate`;$('#confidenceBar').style.width=confidence+'%';$('#sampleSwatch').style.background=`rgb(${rgb.join(',')})`;$('#sampleRgb').textContent=`RGB ${rgb.join(' / ')}`;$('#sampleDetail').textContent=confidence<45?'Low confidence — confirm manually.':confidence<70?'Reasonable match — confirm against the card.':'Strong match — still confirm against the card.';$('#applyScanBtn').disabled=false;
  }
  $('#applyScanBtn').addEventListener('click',()=>{if(!state.scan)return;const {key,value}=state.scan;if(key==='ph'){state.reading.ph=value;$('#phInput').value=String(value)}else{state.reading[key]=value;updateChips()}evaluate();showPage('check');});

  // ---------- Water change ----------
  function calcWater(){
    const g=Number($('#tankGallons').value||state.settings.gallons), current=Math.max(0,Number($('#wcCurrent').value)||0), target=Math.max(0,Number($('#wcTarget').value)||0); if(!g||g<=0){$('#wcPercent').textContent='—';$('#wcGallons').textContent='Enter tank size.';return;} if(current<=0||target>=current){$('#wcPercent').textContent='0%';$('#wcGallons').textContent='No dilution needed for that target.';return;} const pct=clamp((1-target/current)*100,0,100), gal=g*pct/100;$('#wcPercent').textContent=`${Math.ceil(pct)}%`;$('#wcGallons').textContent=`About ${round(gal,1)} gallons of ${round(g,1)} gallons.`;
  }
  ['#tankGallons','#wcCurrent','#wcTarget'].forEach(s=>$(s).addEventListener('input',calcWater));

  // ---------- Timer ----------
  function updateTimer(){
    if(!state.challengeStarted){$('#challengeClock').textContent='Not running';$('#challengeDue').textContent='Start when you dose to ~1 ppm ammonia.';return;}
    const due=state.challengeStarted+24*3600*1000, diff=due-Date.now(); if(diff<=0){$('#challengeClock').textContent='RETEST NOW';$('#challengeDue').textContent=`24-hour mark reached ${new Date(due).toLocaleString()}.`;return;}
    const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);$('#challengeClock').textContent=`${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;$('#challengeDue').textContent=`Retest due ${new Date(due).toLocaleString()}.`;
  }
  $('#startChallengeBtn').addEventListener('click',()=>{state.challengeStarted=Date.now();saveLocal();updateTimer();});
  $('#stopChallengeBtn').addEventListener('click',()=>{state.challengeStarted=null;saveLocal();updateTimer();});
  $('#calendarBtn').addEventListener('click',()=>{const start=state.challengeStarted||Date.now(), due=new Date(start+24*3600*1000);const fmt=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Swamp Fish Control Room//EN\r\nBEGIN:VEVENT\r\nUID:${Date.now()}@swampfish\r\nDTSTAMP:${fmt(new Date())}\r\nDTSTART:${fmt(due)}\r\nDTEND:${fmt(new Date(due.getTime()+15*60000))}\r\nSUMMARY:Retest axolotl tank\r\nDESCRIPTION:24-hour ammonia challenge retest: check ammonia and nitrite.\r\nEND:VEVENT\r\nEND:VCALENDAR`;downloadBlob(new Blob([ics],{type:'text/calendar'}),'swamp-fish-retest.ics');});
  setInterval(updateTimer,1000);

  // ---------- Settings ----------
  function applySettings(){
    $('#creatureNameInput').value=state.settings.creatureName;$('#settingsGallons').value=state.settings.gallons;$('#wifeModeInput').checked=state.settings.wifeMode;$('#creatureLine').textContent=`Keeping ${state.settings.creatureName || 'one suspicious water Muppet'} alive.`; if(state.settings.gallons){$('#tankGallons').value=state.settings.gallons;calcWater();}
  }
  $('#saveSettingsBtn').addEventListener('click',()=>{state.settings.creatureName=$('#creatureNameInput').value.trim()||defaults.creatureName;state.settings.gallons=$('#settingsGallons').value;state.settings.wifeMode=$('#wifeModeInput').checked;saveLocal();applySettings();alert('Saved on this device.');});

  // ---------- Export/import ----------
  function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
  async function exportBackup(){const readings=await dbAll();const safe=readings.map(({photo,...r})=>r);const payload={app:'Swamp Fish Control Room',version:1,exportedAt:new Date().toISOString(),settings:state.settings,challengeStarted:state.challengeStarted,readings:safe};downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`swamp-fish-backup-${new Date().toISOString().slice(0,10)}.json`);}
  $('#exportBtn').addEventListener('click',exportBackup);$('#exportAllBtn').addEventListener('click',exportBackup);
  $('#importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.readings))throw new Error('No readings array');if(!confirm(`Replace this device's saved history with ${data.readings.length} imported readings?`))return;await dbClear();for(const r of data.readings)await dbAdd({...r,photo:null});state.settings={...defaults,...(data.settings||{})};state.challengeStarted=Number(data.challengeStarted)||null;saveLocal();applySettings();state.readings=await dbAll();renderHistory();alert('Backup imported.');}catch(err){alert('Import failed: '+err.message)}});

  // ---------- Install PWA ----------
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;$('#installBtn').classList.remove('hidden')});
  $('#installBtn').addEventListener('click',async()=>{if(!state.deferredInstall)return;state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$('#installBtn').classList.add('hidden')});
  window.addEventListener('appinstalled',()=>$('#installBtn').classList.add('hidden'));
  if('serviceWorker'in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

  // ---------- Startup ----------
  loadLocal(); applySettings(); updateChips(); evaluate(); updateTimer();
  dbAll().then(r=>{state.readings=r}).catch(()=>{});
})();
