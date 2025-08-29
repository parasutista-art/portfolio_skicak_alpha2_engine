// ====== Core book engine (v14 base) ======
const book = document.getElementById('book');
const slider = document.getElementById('pageSlider');
const papers = [];
for (let i = 0; i <= 11; i++) {
  const p = document.getElementById(`p${i}`);
  if (p) papers.push(p);
}
const MAX_SPREAD = parseFloat(slider.max);
let currentSpread = 0;
function easeOutCubic(x){return 1-Math.pow(1-x,3);}
function updateBook(v){
  papers.forEach((paper,i)=>{
    const progress=v-i;
    if(progress<=0){paper.style.transform='rotateY(0deg)';paper.style.zIndex=100+(papers.length-i);}
    else if(progress>=1){paper.style.transform='rotateY(-180deg)';paper.style.zIndex=100+i;}
    else{paper.style.transform=`rotateY(${-180*progress}deg)`;paper.style.zIndex=2000;}
  });
}
let animFrame=null,isAnimating=false;
function stopAnimation(){if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}}
function animateTo(from,to,dur=800){
  if(isAnimating) return; isAnimating=true; stopAnimation();
  const target=Math.max(0,Math.min(MAX_SPREAD,to)); const diff=target-from; const start=performance.now();
  function tick(t){let u=(t-start)/dur; if(u>1) u=1; const eased=easeOutCubic(u);
    const val=from+diff*eased; slider.value=val; updateBook(val);
    if(u<1){animFrame=requestAnimationFrame(tick);} else {currentSpread=target; slider.value=currentSpread; updateBook(currentSpread); animFrame=null; isAnimating=false;}
  }
  animFrame=requestAnimationFrame(tick);
}
function goTo(sp){ if(sp!==currentSpread) animateTo(currentSpread,sp,800); }
function next(){ goTo(currentSpread+1); }
function prev(){ goTo(currentSpread-1); }
slider.addEventListener('input',e=>{ if(!isAnimating) updateBook(parseFloat(slider.value)); });
slider.addEventListener('change',e=>{ if(!isAnimating){ const target=Math.round(parseFloat(slider.value)); animateTo(parseFloat(slider.value),target,500);} });
function handleSliderTap(clientX){ const rect=slider.getBoundingClientRect(); const x=clientX-rect.left; const pct=x/rect.width; const target=Math.round(pct*MAX_SPREAD); goTo(target); }
slider.addEventListener('mousedown',e=>{ if(e.target===slider) handleSliderTap(e.clientX); });
slider.addEventListener('touchstart',e=>{ if(e.target===slider&&e.touches.length===1){ handleSliderTap(e.touches[0].clientX); e.preventDefault(); } }, {passive:false});
// wheel -> scrub spreads (disabled when lightbox open)
let wheelAccum=0,wheelAnimating=false;
function animateWheel(){ if(Math.abs(wheelAccum)<0.001){ wheelAnimating=false; const target=Math.round(parseFloat(slider.value)); animateTo(parseFloat(slider.value),target,500); return; }
  const current=parseFloat(slider.value); const step=wheelAccum*0.15; wheelAccum-=step;
  const nextVal=Math.max(0,Math.min(MAX_SPREAD,current+step)); slider.value=nextVal; updateBook(nextVal); requestAnimationFrame(animateWheel);
}
window.addEventListener('wheel',e=>{ if(lightbox.classList.contains('show')) return; e.preventDefault(); wheelAccum+=e.deltaY*0.0025; if(!wheelAnimating){ wheelAnimating=true; requestAnimationFrame(animateWheel);} }, {passive:false});
// simple swipe on book
let tSX=null,tSY=null;
book.addEventListener('touchstart',e=>{ if(e.touches.length===1){ tSX=e.touches[0].clientX; tSY=e.touches[0].clientY; } });
book.addEventListener('touchend',e=>{ if(tSX===null) return; const dx=e.changedTouches[0].clientX - tSX; const dy=e.changedTouches[0].clientY - tSY; if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)){ if(dx<0) next(); else prev(); } tSX=null; tSY=null; });

// ====== Lightbox with media (images, gifs, mp4/webm, youtube/vimeo) ======
const lightbox = document.getElementById('lightbox');
const stage = document.getElementById('lightbox-stage');
const lbPlay = document.getElementById('lb-play');
const arrowLeft = document.getElementById('arrowLeft');
const arrowRight = document.getElementById('arrowRight');

let mediaItems = [
  {src:'media/medium1_spread3.jpg'},
  {src:'media/medium2_spread3.gif'},
  {src:'media/medium3_spread4.gif'},
  {src:'media/medium4_spread5.youtube'}
];
let currentMediaIndex = 0;

// helpers
function parseSpreadFromFilename(filename){ const m = filename.match(/_spread(\d+)/); if(m) return parseInt(m[1]); }
function ext(path){ const m=path.match(/\.([a-z0-9]+)$/i); return m?m[1].toLowerCase():''; }
function youtubeEmbed(url){
  try{
    // youtu.be/ID or watch?v=ID
    let id=null;
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) { id = u.pathname.replace('/',''); }
    if (!id && u.searchParams.get('v')) id = u.searchParams.get('v');
    if (!id) { // last fallback try split
      const m = url.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
      if (m) id = m[1];
    }
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&modestbranding=1&rel=0`;
  }catch(e){ return null; }
}
function vimeoEmbed(url){
  const m = url.trim().match(/vimeo\.com\/(\d+)/);
  if(!m) return null;
  const id = m[1];
  return `https://player.vimeo.com/video/${id}?autoplay=1&title=0&byline=0`;
}

function parseYoutubeIdFromFilename(filename){
  const m = filename.match(/_([A-Za-z0-9_-]{6,})\.youtube$/);
  return m ? m[1] : null;
}
function parseVimeoIdFromFilename(filename){
  const m = filename.match(/_(\d+)\.vimeo$/);
  return m ? m[1] : null;
}



// open/close
function openLightbox(src){
  // ensure item present
  let idx = mediaItems.findIndex(m=>m.src===src);
  if(idx===-1){ mediaItems.push({src}); idx=mediaItems.length-1; }
  currentMediaIndex = idx;
  showMedia(idx);
  lightbox.classList.add('show');
  lightbox.setAttribute('aria-hidden','false');
  // hide book arrows
  arrowLeft.style.display='none'; arrowRight.style.display='none';
}
function closeLightbox(){
  lightbox.classList.remove('show');
  lightbox.setAttribute('aria-hidden','true');
  stage.innerHTML='';
  lbPlay.classList.remove('show');
  arrowLeft.style.display='block'; arrowRight.style.display='block';
}
lightbox.addEventListener('click',e=>{
  if(e.target===lightbox) closeLightbox();
});
window.addEventListener('keydown',e=>{
  if(!lightbox.classList.contains('show')) return;
  if(e.key==='Escape') closeLightbox();
  if(e.key==='ArrowRight') lightboxNext();
  if(e.key==='ArrowLeft') lightboxPrev();
});

function showMedia(index){
  if(index<0 || index>=mediaItems.length) return;
  currentMediaIndex = index;
  const item = mediaItems[index];
  const source = item.src;
  stage.innerHTML = ''; // clear

  // sync spread
  const spread = parseSpreadFromFilename(source);
  if(spread!==undefined && spread!==currentSpread) goTo(spread);

  const e = ext(source);
  if(['jpg','jpeg','png','gif','webp','avif'].includes(e)){
    const img = document.createElement('img');
    img.src = source;
    stage.appendChild(img);
    lbPlay.classList.remove('show'); // no overlay for images
  } else if(['mp4','webm','ogg'].includes(e)){
    const video = document.createElement('video');
    video.src = source;
    video.controls = true;    // includes fullscreen, volume, mute, seekbar
    video.playsInline = true;
    video.autoplay = false;   // start paused until user clicks play overlay
    stage.appendChild(video);
    // show custom play overlay
    lbPlay.classList.add('show');
    lbPlay.onclick = ()=>{ lbPlay.classList.remove('show'); video.play(); };
  
} else if(['youtube','vimeo'].includes(e)){
    // prefer ID-in-filename: mediumX_spreadY_<ID>.youtube/.vimeo
    const ytId = e==='youtube' ? parseYoutubeIdFromFilename(source) : null;
    const vmId = e==='vimeo' ? parseVimeoIdFromFilename(source) : null;
    if (ytId || vmId) {
      const iframe = document.createElement('iframe');
      iframe.src = ytId
        ? `https://www.youtube.com/embed/${ytId}?autoplay=1&controls=1&modestbranding=1&rel=0`
        : `https://player.vimeo.com/video/${vmId}?autoplay=1&title=0&byline=0`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
      iframe.allowFullscreen = true;
      iframe.width = '960';
      iframe.height = '540';
      stage.appendChild(iframe);
      lbPlay.classList.remove('show');
    } else {
      // fallback: old workflow uses file content with URL (works on http(s), not file://)
      fetch(source).then(r=>r.text()).then(url=>{
        const trimmed = url.trim();
        let embed = e==='youtube' ? youtubeEmbed(trimmed) : vimeoEmbed(trimmed);
        if(!embed){ embed = trimmed; }
        const iframe = document.createElement('iframe');
        iframe.src = embed;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
        iframe.allowFullscreen = true;
        iframe.width = '960';
        iframe.height = '540';
        stage.appendChild(iframe);
        lbPlay.classList.remove('show');
      }).catch(()=>{
        const msg = document.createElement('div');
        msg.style.color='white';
        msg.style.maxWidth='520px';
        msg.style.textAlign='center';
        msg.innerHTML = 'Nelze načíst URL z .youtube/.vimeo mimo http(s). Přejmenuj soubor na <code>mediumX_spreadY_<strong>ID</strong>.youtube</code>/<code>.vimeo</code>.';
        stage.appendChild(msg);
        lbPlay.classList.remove('show');
      });
    }
  } else {

    const div=document.createElement('div');
    div.style.color='white';
    div.textContent = 'Unsupported media: ' + source;
    stage.appendChild(div);
    lbPlay.classList.remove('show');
  }
}

function lightboxNext(){ if(currentMediaIndex < mediaItems.length-1){ showMedia(currentMediaIndex+1); } }
function lightboxPrev(){ if(currentMediaIndex > 0){ showMedia(currentMediaIndex-1); } }
// Scroll to switch media when lightbox open
lightbox.addEventListener('wheel',e=>{
  if(!lightbox.classList.contains('show')) return;
  e.preventDefault();
  if(e.deltaY>0) lightboxNext(); else lightboxPrev();
},{passive:false});

// init
slider.value=0; updateBook(0);
