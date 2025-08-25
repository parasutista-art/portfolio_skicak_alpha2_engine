const book = document.getElementById('book');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const slider = document.getElementById('pageSlider');

const MAX_SPREAD = parseFloat(slider.max);

const papers = [];
for (let i = 0; i <= 10; i++) {
  const paper = document.getElementById(`p${i}`);
  if (paper) papers.push(paper);
}

let currentSpread = 0;

const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

function easeOutCubic(x){ return 1 - Math.pow(1-x,3); }
function easeInOutCubic(x){ return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2; }
function easeOutBackSoft(x){
  const c1 = 0.6, c3 = c1+1;
  return 1 + c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);
}

function updateBook(value){
  papers.forEach((paper,i)=>{
    let progress=value-i;
    if(progress>0&&progress<1){ paper.style.zIndex=1000; }
    else if(progress>=1){ paper.style.zIndex=100+i; }
    else{ paper.style.zIndex=500-i; }
    if(progress<=0){ paper.style.transform='rotateY(0deg)'; }
    else if(progress>=1){ paper.style.transform='rotateY(-180deg)'; }
    else{ paper.style.transform=`rotateY(${-180*progress}deg)`; }
  });
}

let animFrame=null;
function stopAnimation(){ if(animFrame){ cancelAnimationFrame(animFrame); animFrame=null; }}

function animateTo(valueFrom,valueTo,type='snap',velocity=0){
  stopAnimation();
  const target = clamp(valueTo, 0, MAX_SPREAD);
  const diff = target - valueFrom;
  let duration;
  if(type==='snap'){
    duration=1000;
  } else if(type==='inertia'){
    duration=2000;
  } else {
    duration=2400;
  }
  const startTime=performance.now();
  function tick(t){
    let u=(t-startTime)/duration; if(u>1)u=1;
    let eased;
    if(type==='inertia'){
      if(Math.abs(velocity)>3 || Math.abs(diff)>1){ eased=easeOutBackSoft(u);} else { eased=easeOutCubic(u);} 
    } else if(type==='snap'){
      eased=easeOutCubic(u);
    } else {
      eased=easeInOutCubic(u);
    }
    const val=valueFrom+diff*eased;
    slider.value=val; updateBook(val);
    if(u<1){ animFrame=requestAnimationFrame(tick);} else {
      currentSpread=target; slider.value=currentSpread; updateBook(currentSpread); animFrame=null;
    }
  }
  animFrame=requestAnimationFrame(tick);
}

function snapToNearest(value){
  const target=Math.round(clamp(value,0,MAX_SPREAD));
  animateTo(parseFloat(slider.value),target,'snap');
}

prevBtn.addEventListener('click',()=>{
  const target=clamp(currentSpread-1,0,MAX_SPREAD);
  animateTo(parseFloat(slider.value),target,'snap');
});
nextBtn.addEventListener('click',()=>{
  const target=clamp(currentSpread+1,0,MAX_SPREAD);
  animateTo(parseFloat(slider.value),target,'snap');
});

let pointerDown=false,lastX=0,lastT=0,vel=0,wasDragging=false;
let dragStartX=0, dragStartTime=0;
const MOVE_THRESHOLD=8; // px
const CLICK_TIME=200;   // ms

slider.addEventListener('pointerdown',(e)=>{
  e.preventDefault();
  slider.setPointerCapture(e.pointerId);
  pointerDown=true; wasDragging=false;
  stopAnimation();
  lastX=e.clientX; lastT=performance.now();
  dragStartX=e.clientX; dragStartTime=lastT;
});

slider.addEventListener('pointermove',(e)=>{
  if(!pointerDown)return;
  const dx=e.clientX-dragStartX;
  if(Math.abs(dx)>MOVE_THRESHOLD){
    wasDragging=true;
  }
  if(wasDragging){
    const rect=slider.getBoundingClientRect();
    const ratio=(e.clientX-rect.left)/rect.width;
    const raw=ratio*MAX_SPREAD;
    const current=parseFloat(slider.value);
    const val=clamp(current*0.7 + raw*0.3,0,MAX_SPREAD);
    slider.value=val; updateBook(val);
    const now=performance.now();
    const dt=Math.max(1,now-lastT);
    const vx=(e.clientX-lastX)/dt;
    const spreadsPerPx=MAX_SPREAD/rect.width;
    vel=vx*spreadsPerPx*1000;
    lastX=e.clientX; lastT=now;
  }
});

slider.addEventListener('pointerup',(e)=>{
  if(!pointerDown)return;
  pointerDown=false; slider.releasePointerCapture(e.pointerId);
  const dt=performance.now()-dragStartTime;

  if(!wasDragging && dt<CLICK_TIME){
    const rect=slider.getBoundingClientRect();
    const ratio=(e.clientX-rect.left)/rect.width;
    const target=Math.round(clamp(ratio*MAX_SPREAD,0,MAX_SPREAD));
    animateTo(parseFloat(slider.value),target,'snap');
    return;
  }

  const current=parseFloat(slider.value);
  const V_THRESH=2.0;
  if(Math.abs(vel)>V_THRESH){
    const travel=vel*0.2;
    let target=clamp(current+travel,0,MAX_SPREAD);
    target=Math.round(target);
    animateTo(current,target,'inertia',vel);
  } else {
    snapToNearest(current);
  }
});

// Vyhlazený scroll kolečkem myši
let wheelAccumulated=0;
let wheelAnimating=false;

function animateWheel(){
  if(Math.abs(wheelAccumulated)<0.001){
    wheelAnimating=false;
    snapToNearest(parseFloat(slider.value));
    return;
  }
  const current=parseFloat(slider.value);
  const step=wheelAccumulated*0.15; // vyhlazení
  wheelAccumulated-=step;
  const nextVal=clamp(current+step,0,MAX_SPREAD);
  slider.value=nextVal;
  updateBook(nextVal);
  requestAnimationFrame(animateWheel);
}

window.addEventListener('wheel',(e)=>{
  e.preventDefault();
  const factor=0.0025; // citlivost kolečka
  wheelAccumulated+=e.deltaY*factor;
  if(!wheelAnimating){
    wheelAnimating=true;
    requestAnimationFrame(animateWheel);
  }
},{passive:false});

slider.value=0; updateBook(0);





// === alpha2.13: cover click fix ===
window.addEventListener("DOMContentLoaded", () => {
  const first = document.querySelector(".paper:first-child");
  const last  = document.querySelector(".paper:last-child");
  if(first){
    first.addEventListener("click", e => {
      if(e.target.closest(".prev-btn,.next-btn")) return;
      if(typeof nextPage === "function") nextPage();
    });
  }
  if(last){
    last.addEventListener("click", e => {
      if(e.target.closest(".prev-btn,.next-btn")) return;
      if(typeof prevPage === "function") prevPage();
    });
  }
});


// === alpha2.13a: cover overlay click ===
(function(){
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(()=>{
    const left = document.getElementById('cover-left-overlay');
    const right = document.getElementById('cover-right-overlay');
    if(left){
      left.addEventListener('click', ()=>{
        const prevBtn = document.getElementById('prev-btn');
        if(prevBtn) prevBtn.click();
      });
    }
    if(right){
      right.addEventListener('click', ()=>{
        const nextBtn = document.getElementById('next-btn');
        if(nextBtn) nextBtn.click();
      });
    }
  });
})();







// === alpha3.2: improved mobile swipe support ===
(function(){
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(()=>{
    const container = document.getElementById('book') || document.querySelector('.book');
    if(!container) return;
    let startX=0, startY=0, startT=0, isMoving=false;

    function getTouch(e){
      return e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : null);
    }

    container.addEventListener('touchstart', e=>{
      const t=getTouch(e); if(!t) return;
      if (e.target.closest('#pageSlider,#prev-btn,#next-btn')) return;
      startX=t.clientX; startY=t.clientY; startT=Date.now(); isMoving=true;
    }, {passive:true});

    container.addEventListener('touchmove', e=>{
      if(!isMoving) return;
      const t=getTouch(e); if(!t) return;
      const dx=t.clientX-startX, dy=t.clientY-startY;
      if(Math.abs(dx)>Math.abs(dy)*1.2){
        // swipe intent: disable vertical page scroll
        e.preventDefault();
      }
    }, {passive:false});

    container.addEventListener('touchend', e=>{
      if(!isMoving) return; isMoving=false;
      const t=getTouch(e); if(!t) return;
      const dx=t.clientX-startX, dy=t.clientY-startY, dt=Date.now()-startT;
      const horiz=Math.abs(dx)>Math.abs(dy)*1.2;
      const SWIPE_DIST = 30; // lowered threshold
      const TAP_DIST = 10;
      const TAP_TIME = 300;

      if(horiz && Math.abs(dx)>=SWIPE_DIST){
        const dir=dx<0?'next':'prev';
        const btn=document.getElementById(dir==='next'?'next-btn':'prev-btn');
        if(btn) btn.click();
      } else if(Math.abs(dx)<=TAP_DIST && Math.abs(dy)<=TAP_DIST && dt<=TAP_TIME){
        // let native click pass (tap)
      }
    }, {passive:true});

    container.addEventListener('touchcancel', ()=>{isMoving=false;}, {passive:true});
  });
})();



// === alpha3.3: restrict overlay click to covers only ===
(function(){
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(()=>{
    const left = document.getElementById('cover-left-overlay');
    const right = document.getElementById('cover-right-overlay');
    if(left){
      left.addEventListener('click', ()=>{
        const prevBtn = document.getElementById('prev-btn');
        // only if we're on first page (left cover visible)
        if(document.body.classList.contains('at-beginning') && prevBtn){ prevBtn.click(); }
      });
    }
    if(right){
      right.addEventListener('click', ()=>{
        const nextBtn = document.getElementById('next-btn');
        // only if we're on last page (right cover visible)
        if(document.body.classList.contains('at-end') && nextBtn){ nextBtn.click(); }
      });
    }
  });
})();



// === alpha3.4: cover overlays only on first/last page ===
(function(){
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(()=>{
    const left = document.querySelector('.cover-overlay.left');
    const right = document.querySelector('.cover-overlay.right');
    if(left){
      left.addEventListener('click', ()=>{
        const prevBtn = document.getElementById('prev-btn');
        if(prevBtn) prevBtn.click();
      });
    }
    if(right){
      right.addEventListener('click', ()=>{
        const nextBtn = document.getElementById('next-btn');
        if(nextBtn) nextBtn.click();
      });
    }
  });
})();
