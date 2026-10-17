export const GUIDE_CENTERS=[0.12,0.31,0.50,0.69,0.88];

export function mapCoverCrop(sourceWidth,sourceHeight,viewRect,guideRect){
  if(!sourceWidth||!sourceHeight||viewRect.width<=0||viewRect.height<=0)throw Error('Camera frame is not ready.');
  const scale=Math.max(viewRect.width/sourceWidth,viewRect.height/sourceHeight);
  const shownWidth=sourceWidth*scale,shownHeight=sourceHeight*scale;
  const offsetX=(viewRect.width-shownWidth)/2,offsetY=(viewRect.height-shownHeight)/2;
  const x=(guideRect.left-viewRect.left-offsetX)/scale;
  const y=(guideRect.top-viewRect.top-offsetY)/scale;
  const width=guideRect.width/scale,height=guideRect.height/scale;
  return {
    x:Math.max(0,Math.min(sourceWidth-1,x)),
    y:Math.max(0,Math.min(sourceHeight-1,y)),
    width:Math.max(1,Math.min(sourceWidth-x,width)),
    height:Math.max(1,Math.min(sourceHeight-y,height))
  };
}

function shell(){
  const el=document.createElement('div');el.className='camera-stage';
  el.innerHTML=`<video class="camera-video" autoplay muted playsinline></video>
  <div class="camera-shade" aria-hidden="true"></div>
  <div class="camera-guide" aria-hidden="true"><div class="card-outline"></div>${GUIDE_CENTERS.map((x,i)=>`<div class="tube-outline" style="left:${x*100}%"><span>${i+1}</span></div>`).join('')}</div>
  <div class="camera-copy"><strong>Line up the card + 5 tubes</strong><span>Turn the phone sideways. Keep the tubes inside the five outlines.</span></div>
  <div class="camera-controls"><button type="button" class="camera-cancel">Cancel</button><button type="button" class="camera-shutter" aria-label="Take photo"><span></span></button><button type="button" class="camera-gallery">Use gallery</button></div>`;
  return el;
}

export async function captureGuidedPhoto({galleryInput,fallbackCameraInput}={}){
  if(!navigator.mediaDevices?.getUserMedia){fallbackCameraInput?.click();return null;}
  let stream;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
  }catch{
    fallbackCameraInput?.click();return null;
  }
  const stage=shell(),video=stage.querySelector('video'),guide=stage.querySelector('.camera-guide');
  document.body.append(stage);document.body.classList.add('camera-open');video.srcObject=stream;
  try{await video.play();}catch{}
  try{
    const track=stream.getVideoTracks()[0],caps=track.getCapabilities?.();
    if(caps?.torch)await track.applyConstraints({advanced:[{torch:false}]});
  }catch{}
  return await new Promise(resolve=>{
    let done=false;
    const close=value=>{if(done)return;done=true;for(const t of stream.getTracks())t.stop();stage.remove();document.body.classList.remove('camera-open');window.removeEventListener('pagehide',onPageHide);resolve(value);};
    const onPageHide=()=>close(null);window.addEventListener('pagehide',onPageHide,{once:true});
    stage.querySelector('.camera-cancel').addEventListener('click',()=>close(null));
    stage.querySelector('.camera-gallery').addEventListener('click',()=>{close(null);setTimeout(()=>galleryInput?.click(),0);});
    stage.querySelector('.camera-shutter').addEventListener('click',async()=>{
      if(!video.videoWidth||!video.videoHeight)return;
      const crop=mapCoverCrop(video.videoWidth,video.videoHeight,video.getBoundingClientRect(),guide.getBoundingClientRect());
      const maxWidth=1600,scale=Math.min(1,maxWidth/crop.width),canvas=document.createElement('canvas');
      canvas.width=Math.round(crop.width*scale);canvas.height=Math.round(crop.height*scale);
      canvas.getContext('2d').drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
      const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.92));
      if(blob)close({file:new File([blob],`rex-test-${Date.now()}.jpg`,{type:'image/jpeg'}),guided:true});
    });
  });
}
