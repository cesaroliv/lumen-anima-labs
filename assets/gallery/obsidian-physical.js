(()=>{"use strict";
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
const sku=params.get("sku")||window.LUMEN_GESSO_UNIFIED?.sku||"";
const pt=params.get("lang")==="pt"||(!params.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
const api=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
const valid=/^art-[0-9]{2}-[a-z0-9-]+$/.test(sku);
const sizeButtons=[...document.querySelectorAll("[data-size]")],colorButtons=[...document.querySelectorAll("[data-color]")];
const frame=$("#physicalFrame"),img=$("#physicalArtwork"),name=$("#physicalName"),status=$("#physicalStatus"),buy=$("#physicalBuy");
const sizeOut=$("#summarySize"),colorOut=$("#summaryColor"),frameOut=$("#summaryFrame"),priceOut=$("#summaryPrice");
const finishSelect=$("#physicalFinish"),finishHelp=$("#physicalFinishHelp"),colorField=$("#physicalColorField");
if(!frame||!img||!status||!buy||!sizeOut||!colorOut||!frameOut||!priceOut)return;
const embedded=!!window.LUMEN_GESSO_UNIFIED;
const labels=pt?{
invalid:"Obra física inválida.",loading:"Carregando acabamentos da Printile…",
unavailable:"As opções de produção não puderam ser verificadas. Tente novamente mais tarde.",
ready:"Prévia visual. Impressão sujeita à validação do master e prova física; pagamento indisponível.",
buy:"Encomendas em preparação",price:"Em definição",na:"Não se aplica",physical:"Arte impressa",
colors:{Preta:"Preta",Branca:"Branca",Natural:"Natural",Marrom:"Marrom"},
help:{
"Tradicional":"Moldura tradicional de perfil largo, sem vidro.",
"Tradicional com vidro acrílico":"Moldura tradicional com proteção em vidro acrílico (prévia simulada).",
"Caixa":"Moldura tipo caixa, com perfil intermediário, sem vidro.",
"Caixa com vidro acrílico":"Moldura tipo caixa com vidro acrílico (prévia simulada).",
"Filete":"Moldura de perfil fino. Sem filete gráfico interno nesta coleção.",
"Filete com vidro acrílico":"Moldura física de perfil fino com vidro acrílico (prévia simulada).",
"Placa Decorativa":"Placa decorativa sem moldura externa. Sem passe-partout ou bordas gráficas internas.",
"Poster":"Pôster sem moldura externa. Sem passe-partout ou bordas gráficas internas."
}
}:{
invalid:"Invalid printed artwork.",loading:"Loading Printile finishes…",
unavailable:"Production options could not be verified. Please try again later.",
ready:"Visual preview only. Print master and proof pending approval; payments disabled.",
buy:"Physical orders coming soon",price:"To be confirmed",na:"Not applicable",physical:"Printed artwork",
colors:{Preta:"Black",Branca:"White",Natural:"Natural",Marrom:"Brown"},
help:{
"Tradicional":"Wide-profile traditional frame, without glazing.",
"Tradicional com vidro acrílico":"Traditional frame with acrylic glazing (simulated preview).",
"Caixa":"Box frame, medium profile, without glazing.",
"Caixa com vidro acrílico":"Box frame with acrylic glazing (simulated preview).",
"Filete":"Slim physical frame. No inner gold line in this series.",
"Filete com vidro acrílico":"Slim physical frame with acrylic glazing (simulated preview).",
"Placa Decorativa":"Decorative panel, without an outer frame. No digital mat or gold line is added.",
"Poster":"Poster without an outer frame. No digital mat or gold line is added."
}
};
if(!embedded){document.documentElement.lang=pt?"pt-BR":"en-US";document.querySelectorAll("[data-pt][data-en]").forEach(el=>{el.textContent=pt?el.dataset.pt:el.dataset.en});}
status.textContent=labels.loading;buy.textContent=labels.buy;priceOut.textContent=labels.price;
if(!valid){status.textContent=labels.invalid;return;}
const printileTextures=Object.freeze({
Preta:"https://printile.me/assets/preta-oLfoE6I6.jpg",
Branca:"https://printile.me/assets/branca-DariJVCM.jpg",
Natural:"https://printile.me/assets/natural-D8CTLK3U.jpg",
Marrom:"https://printile.me/assets/marrom-CNKlrD7h.jpg"
});
const frameClass={Preta:"",Branca:"white",Natural:"natural",Marrom:"brown"};
const unframed=new Set(["Poster","Placa Decorativa"]);
const stylesWithGlass=new Set(["Tradicional com vidro acrílico","Caixa com vidro acrílico","Filete com vidro acrílico"]);
function cmWidth(type){if(type.startsWith("Tradicional"))return 2;if(type.startsWith("Caixa"))return 1.5;if(type.startsWith("Filete"))return .5;return 0;}
let config=null,art=null,offers=null,size="A2",color="Branca",finish="Tradicional";
if(!frame.querySelector(".physical-art-surface")){
 const surf=document.createElement("div");surf.className="physical-art-surface";
 frame.insertBefore(surf,img);surf.appendChild(img);
}
function availableFor(sizeValue,finishValue){
 const list=offers?.byOrientation?.[art?.orientation]?.[sizeValue]?.[finishValue];
 return Array.isArray(list)?list:[];
}
function supplierFrameScale(){
 if(!art)return;
 const stage=frame.closest(".gesso-preview-stage")||frame.parentElement;
 const width=Math.max(160,(stage?.clientWidth||640)-34);
 const inner=art.orientation==="vertical"?Math.min(420,width):Math.min(680,width);
 const rim=Math.max(4,Math.min(42,inner*cmWidth(finish)/42));
 frame.style.setProperty("--supplier-rim",rim.toFixed(2)+"px");
 frame.dataset.orientation=art.orientation;
}
function render(){
 if(!art||!config||!offers)return;
 const styles=offers.styles||[];
 if(!availableFor(size,finish).length){
  finish=styles.find(f=>availableFor(size,f).length)||"Tradicional";
 }
 const choices=availableFor(size,finish),noFrame=unframed.has(finish);
 if(!noFrame&&!choices.includes(color))color=choices[0]||"Preta";
 if(finishSelect){
  for(const option of finishSelect.options)option.disabled=!availableFor(size,option.value).length;
  finishSelect.value=finish;
 }
 sizeButtons.forEach(b=>{const ok=availableFor(b.dataset.size,finish).length>0;b.disabled=!ok;b.setAttribute("aria-pressed",String(b.dataset.size===size));});
 if(colorField)colorField.hidden=noFrame;
 colorButtons.forEach(b=>{const ok=!noFrame&&choices.includes(b.dataset.color);b.disabled=!ok;b.setAttribute("aria-pressed",String(ok&&b.dataset.color===color));});
 if(finishHelp)finishHelp.textContent=labels.help[finish]||"";
 if(name)name.textContent=art.title;
 if(!embedded||window.LUMEN_GESSO_UNIFIED.getMode()==="physical"){
  img.src="/assets/gallery/obsidian-v2/"+sku+"_"+size+".webp";
  img.alt=art.title+" — "+size+" — "+labels.physical;
 }
 frame.className="physical-frame "+(noFrame?(finish==="Poster"?"printile-unframed printile-poster":"printile-unframed printile-panel"):
  "supplier-native-frame "+(frameClass[color]||"")+(stylesWithGlass.has(finish)?" has-acrylic-glass":""));
 if(noFrame)frame.style.removeProperty("--supplier-texture");
 else frame.style.setProperty("--supplier-texture","url("+JSON.stringify(printileTextures[color])+")");
 supplierFrameScale();
 const key=art.orientation+"|"+size;
 sizeOut.textContent=config.dimensions[key]||size;
 frameOut.textContent=finishSelect?.selectedOptions?.[0]?.textContent||finish;
 colorOut.textContent=noFrame?labels.na:(labels.colors[color]||color);
}
window.addEventListener("resize",()=>{if(art)supplierFrameScale()},{passive:true});
window.LUMEN_GESSO_PHYSICAL={render,getSelection:()=>({sku,size,finish,color:unframed.has(finish)?null:color}),getAvailability:()=>offers};
sizeButtons.forEach(b=>b.addEventListener("click",()=>{if(b.disabled)return;size=b.dataset.size;render()}));
colorButtons.forEach(b=>b.addEventListener("click",()=>{if(b.disabled)return;color=b.dataset.color;render()}));
if(finishSelect)finishSelect.addEventListener("change",()=>{finish=finishSelect.value;render()});
/* No supplier ordering API is contacted by this preview. */
Promise.all([
 fetch('/assets/gallery/obsidian-v2/catalog.json',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():null),
 fetch('/assets/gallery/gesso-physical-offers.json?v=20ad1d60d13f',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():null)
]).then(([data,manifest])=>{
 const a=data?.artworks?.[sku];
 if(!a||!['horizontal','vertical'].includes(a.orientation)||!manifest?.byOrientation?.[a.orientation]||!Array.isArray(manifest.styles)){status.textContent=labels.unavailable;return;}
 config={sizes:['A4','A3','A2'],dimensions:{'horizontal|A4':'30 × 20 cm','horizontal|A3':'40 × 30 cm','horizontal|A2':'60 × 40 cm','vertical|A4':'20 × 30 cm','vertical|A3':'30 × 40 cm','vertical|A2':'40 × 60 cm'}};
 art=a;offers=manifest;render();status.textContent=labels.ready;
}).catch(()=>{status.textContent=labels.unavailable});
})();