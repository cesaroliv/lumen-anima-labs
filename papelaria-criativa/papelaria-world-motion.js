/* Scroll choreography for the four real-product occasions. No paid templates or remote dependencies. */
(()=>{"use strict";
const section=document.getElementById("colecciones");
if(!section||!section.classList.contains("pc-world-film"))return;
const runway=section.querySelector(".pc-wf-runway");
const stage=section.querySelector(".pc-wf-sticky");
const num=document.getElementById("pc-wf-num");
const title=document.getElementById("pc-wf-category");
const info=document.getElementById("pc-wf-description");
const list=[...section.querySelectorAll(".pc-wf-chapter-list span")];
const current=section.querySelector(".pc-wf-current");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
const chapters=[
 {name:"Cumpleaños.",caption:"Cajitas y pequeños detalles para sorprender."},
 {name:"Bodas.",caption:"Recuerdos personalizados para momentos únicos."},
 {name:"Baby shower.",caption:"Celebra una nueva historia con detalles especiales."},
 {name:"Escolares.",caption:"Etiquetas y recuerdos para cada nuevo comienzo."}
];
let pending=false,active=0,swapTimer=null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(t)=>{t=clamp(t,0,1);return t*t*(3-2*t)};
function select(index){
 if(index===active)return;
 active=index;
 current.classList.add("is-switching");
 if(swapTimer!==null)clearTimeout(swapTimer);
 swapTimer=setTimeout(()=>{
   title.textContent=chapters[index].name;
   info.textContent=chapters[index].caption;
   num.textContent=String(index+1).padStart(2,"0");
   list.forEach((el,i)=>el.classList.toggle("is-active",i===index));
   current.classList.remove("is-switching");
 },120);
}
function render(){
 pending=false;
 if(reduced.matches){
   section.style.setProperty("--wf-p","0");
   section.style.setProperty("--wf-a","1");
   section.style.setProperty("--wf-b","0");
   section.style.setProperty("--wf-scale","1");
   section.style.setProperty("--wf-shift","0px");
   return;
 }
 const rect=runway.getBoundingClientRect();
 const scrollTotal=Math.max(1,rect.height-stage.clientHeight);
 const progress=clamp(-rect.top/scrollTotal,0,1);
 const exitA=smooth((progress-.31)/.14);
 const enterB=smooth((progress-.50)/.15);
 const scale=.93+.16*smooth(progress);
 const shift=-18+36*progress;
 section.style.setProperty("--wf-p",progress.toFixed(4));
 section.style.setProperty("--wf-a",(1-exitA).toFixed(4));
 section.style.setProperty("--wf-b",enterB.toFixed(4));
 section.style.setProperty("--wf-scale",scale.toFixed(4));
 section.style.setProperty("--wf-shift",shift.toFixed(2)+"px");
 select(Math.min(3,Math.floor(clamp(progress,0,.99999)*4)));
}
function schedule(){
 if(pending)return;
 pending=true;requestAnimationFrame(render);
}
if("IntersectionObserver" in window){
 const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)section.classList.add("is-entered")})},{threshold:.13});
 io.observe(stage);
}else section.classList.add("is-entered");
list[0]?.classList.add("is-active");
window.addEventListener("scroll",schedule,{passive:true});
window.addEventListener("resize",schedule,{passive:true});
if(reduced.addEventListener)reduced.addEventListener("change",schedule);
render();
})();