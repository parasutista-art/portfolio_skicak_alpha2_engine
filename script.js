// Flipbook Lite v6 - minimal, bez <input type="range">
const book = document.getElementById("book");
const slider = document.getElementById("slider");
const track = slider.querySelector(".track");
const thumb = document.getElementById("thumb");

const MAX_SPREAD = 11; // 11 listů (0..11)
const papers = [];
for (let i = 0; i <= 10; i++) {
  const paper = document.getElementById(`p${i}`);
  if (paper) papers.push(paper);
}

let value = 0;    // aktuální pozice (0..11)
let animFrame = null;

// easing
const easeOutCubic = x => 1 - Math.pow(1-x,3);

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function setThumbByValue(v){
  const rect = slider.getBoundingClientRect();
  const ratio = v / MAX_SPREAD;
  const x = ratio * rect.width;
  thumb.style.left = (x - thumb.offsetWidth/2) + "px";
}

function updateBook(v){
  papers.forEach((paper,i)=>{
    let progress=v-i;
    if(progress<=0){
      paper.style.transform='rotateY(0deg)';
      paper.style.zIndex=100+(papers.length-i);
    } else if(progress>=1){
      paper.style.transform='rotateY(-180deg)';
      paper.style.zIndex=100+i;
    } else {
      paper.style.transform=`rotateY(${-180*progress}deg)`;
      paper.style.zIndex=2000; // animovaná strana navrchu
    }
  });
  setThumbByValue(v);
}

function stopAnimation(){ if(animFrame){ cancelAnimationFrame(animFrame); animFrame=null; } }

function animateTo(from, to, duration=800){
  stopAnimation();
  const start = performance.now();
  const target = clamp(to, 0, MAX_SPREAD);
  const diff = target - from;
  function tick(t){
    let u = (t - start) / duration; if(u>1) u=1;
    const val = from + diff * easeOutCubic(u);
    value = val; updateBook(value);
    if(u<1) animFrame=requestAnimationFrame(tick); else animFrame=null;
  }
  animFrame = requestAnimationFrame(tick);
}

// --- Interakce ---

// Klik na track -> animace
track.addEventListener("mousedown", (e)=>{
  const rect = track.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const target = Math.round(ratio * MAX_SPREAD);
  animateTo(value, target, 800);
});

// Drag thumb (globální, pouze vodorovně)
let dragging=false, dragOffsetX=0;
thumb.addEventListener("mousedown", (e)=>{
  dragging = true;
  const rect = thumb.getBoundingClientRect();
  dragOffsetX = e.clientX - (rect.left + rect.width/2);
  e.preventDefault();
});

document.addEventListener("mousemove", (e)=>{
  if(!dragging) return;
  const rect = track.getBoundingClientRect();
  const pos = clamp(e.clientX - dragOffsetX, rect.left, rect.right);
  const ratio = (pos - rect.left) / rect.width;
  value = ratio * MAX_SPREAD;
  updateBook(value);
});

document.addEventListener("mouseup", ()=>{
  if(!dragging) return;
  dragging=false;
  const target = Math.round(value);
  animateTo(value, target, 500);
});

// Kolečko myši -> plynulý posun + dorovnání
let wheelAccum=0, wheelAnimating=false;
function animateWheel(){
  if(Math.abs(wheelAccum) < 0.001){
    wheelAnimating=false;
    const target=Math.round(value);
    animateTo(value,target,500);
    return;
  }
  const step = wheelAccum*0.15;
  wheelAccum -= step;
  value = clamp(value + step, 0, MAX_SPREAD);
  updateBook(value);
  requestAnimationFrame(animateWheel);
}
window.addEventListener("wheel", (e)=>{
  e.preventDefault();
  wheelAccum += e.deltaY * 0.0025;
  if(!wheelAnimating){ wheelAnimating=true; requestAnimationFrame(animateWheel); }
}, {passive:false});

// Init
updateBook(0);
