const viewport = document.getElementById("viewport");
const book = document.getElementById("book");
const slider = document.getElementById("pageSlider");
const papers = [];
for (let i = 0; i <= 10; i++) {
  const paper = document.getElementById(`p${i}`);
  if (paper) papers.push(paper);
}

const MAX_SPREAD = parseFloat(slider.max);
let currentSpread = 0;

// easing
function easeOutCubic(x){ return 1 - Math.pow(1-x,3); }

function updateBook(value){
  papers.forEach((paper,i)=>{
    let progress=value-i;
    if(progress<=0){
      paper.style.transform='rotateY(0deg)';
      paper.style.zIndex=100+(papers.length-i);
    } else if(progress>=1){
      paper.style.transform='rotateY(-180deg)';
      paper.style.zIndex=100+i;
    } else {
      paper.style.transform=`rotateY(${-180*progress}deg)`;
      paper.style.zIndex=2000;
    }
  });
}

let animFrame=null;
let isAnimating=false;
function stopAnimation(){ if(animFrame){ cancelAnimationFrame(animFrame); animFrame=null; }}

function animateTo(valueFrom,valueTo,duration=800){
  if(isAnimating) return;
  isAnimating=true;
  stopAnimation();
  const target = Math.max(0,Math.min(MAX_SPREAD,valueTo));
  const diff = target - valueFrom;
  const startTime=performance.now();

  function tick(t){
    let u=(t-startTime)/duration; if(u>1)u=1;
    let eased=easeOutCubic(u);
    const val=valueFrom+diff*eased;
    slider.value=val; updateBook(val);
    if(u<1){ animFrame=requestAnimationFrame(tick);} else {
      currentSpread=target; slider.value=currentSpread; updateBook(currentSpread); animFrame=null; isAnimating=false;
    }
  }
  animFrame=requestAnimationFrame(tick);
}

// API
function goTo(spread){ animateTo(currentSpread, spread, 800); }
function next(){ goTo(currentSpread+1); }
function prev(){ goTo(currentSpread-1); }

// Expose for sidebar buttons
window.goTo = goTo;
window.next = next;
window.prev = prev;

// slider drag
slider.addEventListener("input", e=>{
  if(!isAnimating){ updateBook(parseFloat(slider.value)); }
});
slider.addEventListener("change", e=>{
  if(!isAnimating){ 
    const target=Math.round(parseFloat(slider.value));
    animateTo(parseFloat(slider.value), target, 500);
  }
});

// Tap na slider track -> animovaný skok (desktop + touch)
function handleSliderTapX(clientX){
  const rect = slider.getBoundingClientRect();
  const x = clientX - rect.left;
  const percent = Math.max(0, Math.min(1, x/rect.width));
  const target = Math.round(percent * MAX_SPREAD);
  // reset vizuální pozici slideru zpět na current, ať je vidět animace
  slider.value = currentSpread;
  goTo(target);
}

// Desktop
slider.addEventListener("mousedown", e => {
  // pokud klik pouze na track (ne drag), vyřešíme v mouseup s tolerancí
  const startX = e.clientX;
  const startTime = performance.now();
  function onUp(ev){
    document.removeEventListener('mouseup', onUp);
    const moved = Math.abs(ev.clientX - startX);
    const dt = performance.now() - startTime;
    if (moved < 5 && dt < 300) {
      handleSliderTapX(ev.clientX);
    }
  }
  document.addEventListener('mouseup', onUp);
});

// Touch (tap na track s tolerancí, bez blokace nativního dragu)
slider.addEventListener("touchstart", e => {
  if (e.touches.length !== 1) return;
  const t0 = e.touches[0];
  const startX = t0.clientX;
  const startY = t0.clientY;
  const startTime = performance.now();
  let movedFar = false;
  function onMove(ev){
    const t = ev.touches[0];
    if (Math.hypot(t.clientX-startX, t.clientY-startY) > 10) movedFar = True;
  }
  function onEnd(ev){
    slider.removeEventListener('touchmove', onMove);
    slider.removeEventListener('touchend', onEnd);
    slider.removeEventListener('touchcancel', onEnd);
    const dt = performance.now() - startTime;
    if (!movedFar && dt < 300) {
      const touch = (ev.changedTouches && ev.changedTouches[0]) ? ev.changedTouches[0] : t0;
      handleSliderTapX(touch.clientX);
    }
  }
  slider.addEventListener('touchmove', onMove, {passive:true});
  slider.addEventListener('touchend', onEnd);
  slider.addEventListener('touchcancel', onEnd);
}, {passive:true});

// kolečko myši -> listování (desktop)
let wheelAccum=0, wheelAnimating=false;
function animateWheel(){
  if(Math.abs(wheelAccum)<0.001){
    wheelAnimating=false;
    const target=Math.round(parseFloat(slider.value));
    animateTo(parseFloat(slider.value),target,500);
    return;
  }
  const current=parseFloat(slider.value);
  const step=wheelAccum*0.15;
  wheelAccum-=step;
  const nextVal=Math.max(0,Math.min(MAX_SPREAD,current+step));
  slider.value=nextVal; updateBook(nextVal);
  requestAnimationFrame(animateWheel);
}
window.addEventListener("wheel", e=>{
  e.preventDefault();
  const factor=0.0025;
  wheelAccum+=e.deltaY*factor;
  if(!wheelAnimating){ wheelAnimating=true; requestAnimationFrame(animateWheel); }
},{passive:false});

// Swipe po knize (touch)
let touchStartX=0, touchStartY=0, touchActive=false, swipeFired=false;
viewport.addEventListener('touchstart', (e)=>{
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchActive = true;
  swipeFired = false;
}, {passive:true});

viewport.addEventListener('touchmove', (e)=>{
  if(!touchActive || e.touches.length !== 1) return;
  const t = e.touches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  // horizontální převaha a slušný práh
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)*1.5 && !swipeFired && !isAnimating){
    e.preventDefault(); // zabraň svislému posunu během swipu
    swipeFired = true;
    if (dx < 0) next(); else prev();
  }
}, {passive:false});

viewport.addEventListener('touchend', ()=>{
  touchActive = false;
  swipeFired = false;
}, {passive:true});

// init
slider.value=0; updateBook(0);
