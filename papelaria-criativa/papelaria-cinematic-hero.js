"use strict";
(()=>{
const video=document.getElementById("pc-film-video");if(!video)return;
const ids=id=>document.getElementById(id);
const sceneNumber=ids("pc-scene-number"),sceneLabel=ids("pc-scene-label"),progress=ids("pc-film-progress"),bar=document.querySelector(".pc-cine-progress"),clock=ids("pc-film-clock");
const pause=ids("pc-film-pause"),sound=ids("pc-film-sound"),full=ids("pc-film-full"),watch=ids("pc-film-watch");
const scenes=[{at:0,name:"Imagina"},{at:2.3,name:"Diseña"},{at:5.1,name:"Transforma"},{at:7.6,name:"Celebra"}];
const fmt=n=>"00:"+String(Math.max(0,Math.floor(n||0))).padStart(2,"0");
function update(){const t=video.currentTime||0,d=Number.isFinite(video.duration)&&video.duration>0?video.duration:10;const ix=scenes.reduce((a,s,i)=>t>=s.at?i:a,0);const pct=Math.max(0,Math.min(100,100*t/d));sceneNumber.textContent=String(ix+1).padStart(2,"0");sceneLabel.textContent=scenes[ix].name;progress.style.width=pct+"%";bar.setAttribute("aria-valuenow",String(Math.round(pct)));clock.textContent=fmt(t)+" / "+fmt(d);}
function updatePause(){pause.textContent=video.paused?"▶":"Ⅱ";pause.setAttribute("aria-label",video.paused?"Reproducir video":"Pausar video");}
function updateSound(){sound.textContent=video.muted?"♪̸":"♪";sound.setAttribute("aria-label",video.muted?"Activar sonido":"Silenciar sonido");}
async function play(){try{await video.play()}catch(e){console.info("Video waiting for user interaction");}}
pause.addEventListener("click",()=>video.paused?play():video.pause());
sound.addEventListener("click",()=>{video.muted=!video.muted;updateSound();});
watch.addEventListener("click",()=>{video.currentTime=0;video.muted=false;updateSound();play();});
full.addEventListener("click",async()=>{try{if(!document.fullscreenElement&&ids("pc-film").requestFullscreen)await ids("pc-film").requestFullscreen();else if(document.exitFullscreen)await document.exitFullscreen();}catch(e){}});
video.addEventListener("play",updatePause);video.addEventListener("pause",updatePause);
video.addEventListener("timeupdate",update);video.addEventListener("loadedmetadata",update);video.addEventListener("ended",update);
video.addEventListener("error",()=>{sceneLabel.textContent="Vídeo no disponible";});
const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
if(motion.matches){video.pause();}else{play();}
if("IntersectionObserver" in window){const ob=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&!video.paused)video.pause();else if(entries[0].isIntersecting&&!motion.matches&&video.paused)play();},{threshold:.05});ob.observe(ids("inicio"));}
update();updatePause();updateSound();
})();