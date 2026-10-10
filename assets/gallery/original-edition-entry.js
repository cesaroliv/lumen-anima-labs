(()=>{
"use strict";
const match=location.pathname.match(/\/artworks\/((?:black|juridica)-[0-9]{2}-[a-z0-9-]+)\.html$/);
if(!match)return;
const sku="art-"+match[1],info=document.querySelector(".detail-info"),imageRegion=document.querySelector(".detail-img");
const title=info?.querySelector("h1"),originalImage=imageRegion?.querySelector("img");
if(!info||!title||!originalImage)return;
const params=new URLSearchParams(location.search),pt=params.get("lang")==="pt"||(!params.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
const copy=pt?{
  selection:"ESCOLHA COMO QUER SUA OBRA",
  digital:"Arte digital",digitalSub:"Edição em preparação",
  physical:"Arte impressa",physicalSub:"Quadros, placas e pôsteres",
  lead:"Personalize tamanho, acabamento e cor quando houver moldura. Prévia da obra original em tamanhos e acabamentos, sem alterações no arquivo de origem.",
  size:"Tamanho",finish:"Acabamento",color:"Cor da moldura",summarySize:"Medidas",frame:"Acabamento",price:"Preço",frameValue:"Tradicional",
  prep:"Encomendas em preparação",notice:"Prévia da obra original, diferente das ambientações editoriais. Edições digitais e físicas dependem da liberação comercial. Nenhuma cobrança acontece aqui.",
  defaultStatus:"Carregando opções do quadro…"
}:{
  selection:"CHOOSE YOUR ARTWORK FORMAT",
  digital:"Digital artwork",digitalSub:"Edition coming soon",
  physical:"Printed artwork",physicalSub:"Frames, panels and posters",
  lead:"Choose size, finish and frame color when applicable. Original artwork preview in multiple sizes and finishes without altering the source artwork.",
  size:"Size",finish:"Finish",color:"Frame color",summarySize:"Dimensions",frame:"Finish",price:"Price",frameValue:"Traditional",
  prep:"Framed orders coming soon",notice:"Original artwork preview, separate from editorial interior mockups. Digital and physical editions await release. No payment is collected here.",
  defaultStatus:"Loading framed options…"
};
document.body.classList.add("gesso-unified","original-edition-unified");
document.body.classList.add(sku.startsWith("art-black-")?"black-edition":"juridica-edition");
const digital=document.createElement("section");digital.id="gessoDigitalContent";digital.className="gesso-digital-details";digital.setAttribute("role","tabpanel");
for(let n=title.nextSibling;n;){const next=n.nextSibling;digital.appendChild(n);n=next;}
info.appendChild(digital);
if(pt){
 const links=[...document.querySelectorAll('.head .links a')];
 if(links[0])links[0].textContent='Obras';
 if(links[1])links[1].textContent='Coleções';
 const dt=[...digital.querySelectorAll('dl dt')];
 if(dt[0])dt[0].textContent='Coleção';
 if(dt[1])dt[1].textContent='Edição';
 if(dt[2])dt[2].textContent='Disponibilidade';
}
const eyebrow=info.querySelector(".eyebrow");if(eyebrow)eyebrow.textContent=copy.selection;
const picker=document.createElement("div");picker.className="gesso-format-tabs";picker.setAttribute("role","tablist");picker.setAttribute("aria-label",copy.selection);
picker.innerHTML='<button type="button" class="gesso-format-tab" id="gessoTabDigital" role="tab" aria-controls="gessoDigitalContent" aria-selected="true"><strong>'+copy.digital+'</strong><small>'+copy.digitalSub+'</small></button><button type="button" class="gesso-format-tab" id="gessoTabPhysical" role="tab" aria-controls="gessoPhysicalContent" aria-selected="false"><strong>'+copy.physical+'</strong><small>'+copy.physicalSub+'</small></button>';
info.insertBefore(picker,digital);
const physical=document.createElement("section");physical.id="gessoPhysicalContent";physical.className="gesso-physical-details";physical.hidden=true;physical.setAttribute("role","tabpanel");
physical.innerHTML=[
'<p class="gesso-physical-lead">',copy.lead,'</p>',
'<div class="physical-field"><h2>1. ',copy.size,'</h2><div class="option-row" role="group" aria-label="',copy.size,'">',
'<button type="button" class="option" data-size="A4" aria-pressed="false">A4</button>',
'<button type="button" class="option" data-size="A3" aria-pressed="false">A3</button>',
'<button type="button" class="option" data-size="A2" aria-pressed="true">A2</button></div></div>',
'<div class="physical-field"><h2>2. ',copy.finish,'</h2>',
'<label class="visually-hidden" for="physicalFinish">',copy.finish,'</label>',
'<select id="physicalFinish" class="physical-finish-select" aria-label="',copy.finish,'">',
'<option value="Tradicional" selected>',pt?'Tradicional':'Traditional','</option>',
'<option value="Tradicional com vidro acrílico">',pt?'Tradicional com vidro acrílico':'Traditional with acrylic glazing','</option>',
'<option value="Caixa">',pt?'Caixa':'Box frame','</option>',
'<option value="Caixa com vidro acrílico">',pt?'Caixa com vidro acrílico':'Box frame with acrylic glazing','</option>',
'<option value="Filete">',pt?'Filete':'Slim frame','</option>',
'<option value="Filete com vidro acrílico">',pt?'Filete com vidro acrílico':'Slim frame with acrylic glazing','</option>',
'<option value="Placa Decorativa">',pt?'Placa Decorativa':'Decorative panel','</option>',
'<option value="Poster">',pt?'Pôster':'Poster','</option></select>',
'<p id="physicalFinishHelp" class="physical-finish-help"></p></div>',
'<div class="physical-field" id="physicalColorField"><h2>3. ',copy.color,'</h2><div class="option-row" role="group" aria-label="',copy.color,'">',
'<button type="button" class="option color-option" data-color="Preta" aria-pressed="false"><span class="swatch black"></span><span>',pt?'Preta':'Black','</span></button>',
'<button type="button" class="option color-option" data-color="Branca" aria-pressed="true"><span class="swatch white"></span><span>',pt?'Branca':'White','</span></button>',
'<button type="button" class="option color-option" data-color="Natural" aria-pressed="false"><span class="swatch natural"></span><span>Natural</span></button>',
'<button type="button" class="option color-option" data-color="Marrom" aria-pressed="false"><span class="swatch brown"></span><span>',pt?'Marrom':'Brown','</span></button></div></div>',
'<div class="physical-summary" aria-live="polite">',
'<div><span>',copy.summarySize,'</span><strong id="summarySize">—</strong></div>',
'<div><span>',copy.frame,'</span><strong id="summaryFrame">Tradicional</strong></div>',
'<div><span>',copy.color,'</span><strong id="summaryColor">',pt?'Branca':'White','</strong></div>',
'<div><span>',copy.price,'</span><strong id="summaryPrice">—</strong></div></div>',
'<p id="physicalStatus" class="gesso-availability" role="status">',copy.defaultStatus,'</p>',
'<button id="physicalBuy" type="button" class="physical-buy" disabled>',copy.prep,'</button>',
'<p class="physical-note">',copy.notice,'</p>'
].join('');
info.appendChild(physical);
const originalSrc=originalImage.getAttribute("src"),originalAlt=originalImage.getAttribute("alt");
const stage=document.createElement("div");stage.className="gesso-preview-stage";
const frame=document.createElement("div");frame.id="physicalFrame";frame.className="physical-frame";
imageRegion.insertBefore(stage,originalImage);stage.appendChild(frame);const artSurface=document.createElement("div");artSurface.className="physical-art-surface";frame.appendChild(artSurface);artSurface.appendChild(originalImage);
originalImage.id="physicalArtwork";
let mode="physical";
const tabDigital=picker.querySelector("#gessoTabDigital"),tabPhysical=picker.querySelector("#gessoTabPhysical");
function choose(next){
  mode=next;const framed=next==="physical";
  tabDigital.setAttribute("aria-selected",String(!framed));tabPhysical.setAttribute("aria-selected",String(framed));
  digital.hidden=framed;physical.hidden=!framed;
  imageRegion.classList.toggle("is-physical",framed);stage.classList.toggle("digital-mode",!framed);
  if(framed){window.LUMEN_GESSO_PHYSICAL?.render();}else{
    originalImage.src=originalSrc;originalImage.alt=originalAlt;
  }
  const u=new URL(location.href);
  if(framed)u.searchParams.set("formato","quadro");else u.searchParams.set("formato","digital");
  history.replaceState(null,"",u.pathname+u.search+u.hash);
}
tabDigital.addEventListener("click",()=>choose("digital"));
tabPhysical.addEventListener("click",()=>choose("physical"));
picker.addEventListener("keydown",e=>{
  if(!["ArrowLeft","ArrowRight"].includes(e.key))return;
  e.preventDefault();const other=mode==="digital"?"physical":"digital";
  choose(other);(other==="digital"?tabDigital:tabPhysical).focus();
});
choose(new URLSearchParams(location.search).get("formato")==="digital"?"digital":"physical");
window.LUMEN_GESSO_UNIFIED={sku,getMode:()=>mode,showDigital:()=>choose("digital"),showPhysical:()=>choose("physical")};
})();