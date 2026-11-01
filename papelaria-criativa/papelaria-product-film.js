(()=>{"use strict";
const film=document.getElementById("pc-product-film-video");
if(!film)return;
const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
const stop=()=>{if(!film.paused)film.pause()};
const play=()=>{if(motion.matches)return stop();const p=film.play();if(p&&typeof p.catch==="function")p.catch(()=>{});};
if(motion.matches)stop();
if("IntersectionObserver" in window){
 const watch=new IntersectionObserver(entries=>{
   if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.15)&&!document.hidden)play();
   else stop();
 },{threshold:[0,.15,.35]});
 watch.observe(film);
}else if(!motion.matches){play()}
const changes=()=>{
 if(motion.matches||document.hidden)return stop();
 const rect=film.getBoundingClientRect();
 if(rect.bottom>0&&rect.top<innerHeight)play();
 else stop();
};
if(motion.addEventListener)motion.addEventListener("change",changes);
document.addEventListener("visibilitychange",changes);
})();