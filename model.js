export const BUILD = '2.0.0-rex.2';
export const HOUR = 3600000;
export const FIELDS = {
  ammonia:{label:'Ammonia',unit:'ppm',values:[0,.25,.5,1,2,4,8]},
  nitrite:{label:'Nitrite',unit:'ppm',values:[0,.25,.5,1,2,5]},
  nitrate:{label:'Nitrate',unit:'ppm',values:[0,5,10,20,40,80,160]},
  ph:{label:'High-range pH',unit:'',values:[7.4,7.8,8,8.2,8.4,8.8]},
  lowPh:{label:'Low-range pH',unit:'',values:[6,6.4,6.6,6.8,7,7.2,7.6]}
};
export const blankReading = () => ({ammonia:null,nitrite:null,nitrate:null,ph:null,lowPh:null,temp:null,note:'',confirmed:false});
export function validNumber(v){return typeof v==='number'&&Number.isFinite(v);}
export function validateReading(r){
  if(!validNumber(r.createdAt)||r.createdAt<=0||r.createdAt>Date.now()+60000)throw Error('Choose a valid test date and time.');
  for(const [k,f] of Object.entries(FIELDS))if(r[k]!=null&&!f.values.includes(r[k]))throw Error(`Choose a listed ${f.label.toLowerCase()} value.`);
  if(r.temp!=null&&(!validNumber(r.temp)||r.temp<32||r.temp>100))throw Error('Check the temperature in °F.');
  if(!Object.keys(FIELDS).some(k=>r[k]!=null)&&r.temp==null)throw Error('Enter at least one reading.');
  if(r.confirmed!==true)throw Error('Check your entered readings before saving.');
  if(typeof r.note!=='string'||r.note.length>1000)throw Error('Keep the note under 1,000 characters.');
  return r;
}
export function eligible(r){return r?.confirmed===true&&['manual','photo_manual_confirmed','photo_suggested_confirmed','photo_manual_override'].includes(r.source);}
export function fresh(r,now=Date.now()){return eligible(r)&&now>=r.createdAt&&now-r.createdAt<=24*HOUR;}
export function latestConfirmed(readings){return readings.filter(eligible).sort((a,b)=>b.createdAt-a.createdAt)[0]||null;}
export function latestValues(readings){const result={};for(const r of [...readings].filter(eligible).sort((a,b)=>b.createdAt-a.createdAt))for(const k of [...Object.keys(FIELDS),'temp'])if(result[k]===undefined&&r[k]!=null)result[k]={value:r[k],createdAt:r.createdAt};return result;}
export function challengeResult(challenge,readings,events,now=Date.now()){
  if(!challenge)return {state:'none'};
  const start=readings.find(r=>r.id===challenge.readingId);
  if(!eligible(start)||!challenge.emptyTank||start.ammonia<2||start.nitrite!==0||start.temp<60||start.temp>65||start.temp==null)return {state:'invalid'};
  const after=readings.filter(r=>eligible(r)&&r.createdAt>start.createdAt&&r.createdAt<=now).sort((a,b)=>a.createdAt-b.createdAt);
  // Any intervening water change, filter replacement, or dose invalidates evidence of processing.
  const within=after.filter(r=>r.createdAt-start.createdAt<=24*HOUR&&r.ammonia===0&&r.nitrite===0&&r.temp>=60&&r.temp<=65);
  const end=within[0]?.createdAt||now;
  const disrupted=events.some(e=>['water_change','dose','filter_reset'].includes(e.kind)&&e.createdAt>start.createdAt&&e.createdAt<=end);
  if(disrupted)return {state:'interrupted'};
  if(within.length)return {state:'passed',reading:within[0],start};
  const elapsed=now-start.createdAt;
  if(elapsed>24*HOUR)return {state:'unproven',start};
  return {state:'running',due:start.createdAt+24*HOUR,start};
}
export function status(readings,settings,events,now=Date.now()){
  const latest=latestConfirmed(readings), values=latestValues(readings);
  const get=k=>values[k]&&now>=values[k].createdAt&&now-values[k].createdAt<=24*HOUR?values[k].value:null;
  const a=get('ammonia'),n=get('nitrite'),na=get('nitrate'),t=get('temp'),p=get('ph');
  const challenge=challengeResult(settings.challenge,readings,events,now);
  const gates=[{label:'Ammonia at zero',pass:a===0},{label:'Nitrite at zero',pass:n===0},{label:'Final challenge recorded',pass:challenge.state==='passed'&&now-challenge.reading.createdAt<=7*24*HOUR},{label:'Nitrate below 20 ppm',pass:na!==null&&na<20},{label:'Cool water checked',pass:t!==null&&t>=60&&t<=65},{label:'Final home checks',pass:!!settings.homeChecks&&now-settings.homeChecks<24*HOUR&&p!==null&&p>=7.2&&p<=8.4}];
  const result={latest,values,challenge,gates,ready:false,stage:'Cycling',title:'Small tests. Big progress.',next:'Save a fresh water test.',detail:'Your saved readings will guide the next step.'};
  if(settings.movedInAt){
    result.stage='Home';result.title='Home sweet swamp.';
    if(a>0||n>0){result.next='Ammonia or nitrite needs attention.';result.detail='Recheck promptly with the kit. Use temperature-matched, dechlorinated water for a partial water change and retest. If Rex looks unwell, contact an aquatic/exotics vet.';}
    else if(t!==null&&(t<60||t>65)){result.next='Check the tank temperature.';result.detail='Aim for cool, stable water around 60–65°F. Avoid sudden temperature changes.';}
    else if(na!==null&&na>=20){result.next='Plan a water change, then retest.';result.detail='Use dechlorinated, temperature-matched replacement water. Aim for nitrate below 20 ppm.';}
    else if(a===0&&n===0&&na!==null&&t!==null){result.next='Keep up the good care.';result.detail='These recent readings are on track. Check the temperature and remove visible waste today.';}
    else {result.next='Time for a fresh water check.';result.detail='Missing or older readings stay unknown until you test again.';}
    if(p!==null&&(p<7.2||p>8.4)){result.next='Recheck the pH with the kit.';result.detail='Avoid rapid pH changes. Review the result and water chemistry before adding products.';}
    return result;
  }
  if(gates.every(g=>g.pass)){result.ready=true;result.stage='Move-in';result.title="Rex's new home is nearly his.";result.next='Final checks complete. Record move-in when it happens.';result.detail='Only mark Rex home after you actually move him.';}
  else if(challenge.state==='running'){result.stage='Final challenge';result.next='Retest by the 24-hour mark.';result.detail='Record ammonia, nitrite, and temperature. Log any water change, extra dose, or filter replacement.';}
  else if(challenge.state==='passed'){result.stage='Final challenge';result.next='Finish the water and home checks.';result.detail='Check nitrate, temperature, and pH; confirm hides, gentle flow, and a suitable floor.';}
  else if(a===0&&n===0){result.stage='Final challenge';result.next='Prepare the empty-tank final challenge.';result.detail='The challenge screen explains what evidence to record. Rex must still be outside this tank.';}
  else if(a===0&&n!==null){result.stage='Almost ready';result.title='One step closer to swamp sweet swamp.';result.next='Confirm a zero nitrite reading.';result.detail='Nitrite is still measurable. Save the next test when you have it.';}
  else if(a!==null&&a>0){result.next='Let the current ammonia dose process.';result.detail='Avoid adding another dose while ammonia remains measurable; follow your cycling plan and retest.';}
  return result;
}
export const SEEDS = [
 ['2026-09-12',4,2,40,8.2,'Early cycle; ammonia 4–8, nitrite 2–5, nitrate 40–80 ppm.'],
 ['2026-09-16',2,2,40,8.2,'Approximate: ammonia 2–4, nitrite 2–5, nitrate 40–80 ppm.'],
 ['2026-10-01',.5,2,10,8.2,'After a partial water change; ammonia 0.25–0.5, nitrite 2–5, nitrate 5–10 ppm.'],
 ['2026-10-05',.5,2,10,8.2,'1 ppm progress trial had not cleared after about 24 hours.'],
 ['2026-10-07',.25,1,20,8.2,'Nitrite 1–2, nitrate 20–40 ppm.'],
 ['2026-10-09',0,1,20,8.2,'First noted ammonia zero; nitrite 1–2, nitrate 20–40 ppm.'],
 ['2026-10-11',0,1,20,null,'Nitrite about 1; nitrate 20–40 ppm.'],
 ['2026-10-13',null,.5,null,null,'Nitrite about 0.5–1 ppm.'],
 ['2026-10-15',0,.25,40,8,'Nitrite about 0.25–0.5 ppm; photo interpretation, not a verified measurement.']
].map(([date,ammonia,nitrite,nitrate,ph,note])=>({id:'seed-'+date,createdAt:Date.parse(date+'T12:00:00-05:00'),ammonia,nitrite,nitrate,ph,temp:null,lowPh:null,note,confirmed:false,source:'chat_seeded',approximate:true}));

export function acceptSuggestion(draft,key){
  if(!draft.layoutConfirmed)throw Error('Check the tube order first.');
  const suggestion=draft.analysis?.tubes?.find(t=>t.possibleKey===key)?.research;
  const value=suggestion?.candidates?.[0]?.value;
  if(!FIELDS[key]?.values.includes(value))throw Error('No readable estimate for this test. Choose a value from the card.');
  draft[key]=value;draft.decisions??={};draft.decisions[key]='accepted';draft.confirmed=false;
  return value;
}
export function declineSuggestion(draft,key){
  if(!FIELDS[key])throw Error('Unknown test.');
  draft[key]=null;draft.decisions??={};draft.decisions[key]='declined';draft.confirmed=false;
}
