(()=>{
"use strict";
const match=location.pathname.match(/\/artworks\/(gesso-\d{2}-[a-z0-9-]+)\.html$/);
if(!match)return;
const sku="art-"+match[1],info=document.querySelector(".detail-info"),imageRegion=document.querySelector(".detail-img");
const title=info?.querySelector("h1"),originalImage=imageRegion?.querySelector("img");
if(!info||!title||!originalImage)return;
const params=new URLSearchParams(location.search),pt=params.get("lang")==="pt"||(!params.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
const copy=pt?{
  selection:"ESCOLHA COMO QUER SUA OBRA",
  digital:"Arte digital",digitalSub:"Download · R$ 14,90",
  physical:"Quadro físico",physicalSub:"Personalize · em breve",
  lead:"Escolha tamanho e cor da moldura. O passe-partout marfim e o filete dourado estão impressos na arte; a moldura externa é física.",
  size:"Tamanho",color:"Cor da moldura",summarySize:"Medidas",frame:"Moldura",price:"Preço",frameValue:"Tradicional",
  prep:"Encomendas em preparação",notice:"Prévia ilustrativa. Preço e frete serão informados antes de habilitarmos pedidos. Nenhuma cobrança ou encomenda acontece aqui.",
  defaultStatus:"Carregando opções do quadro…"
}:{
  selection:"CHOOSE YOUR ARTWORK FORMAT",
  digital:"Digital artwork",digitalSub:"Download · R$ 14.90",
  physical:"Framed print",physicalSub:"Customize · coming soon",
  lead:"Choose the size and frame color. The ivory mat and gold fillet are printed into the artwork; the outer frame is physical.",
  size:"Size",color:"Frame color",summarySize:"Dimensions",frame:"Frame",price:"Price",frameValue:"Traditional",
  prep:"Framed orders coming soon",notice:"Illustrative preview. Price and shipping will be shown before orders are enabled. No payment or order is made here.",
  defaultStatus:"Loading framed options…"
};
document.body.classList.add("gesso-unified");
const digital=document.createElement("section");digital.id="gessoDigitalContent";digital.className="gesso-digital-details";digital.setAttribute("role","tabpanel");
for(let n=title.nextSibling;n;){const next=n.nextSibling;digital.appendChild(n);n=next;}
info.appendChild(digital);
if(pt){
 const paras=[...digital.querySelectorAll(":scope > p")];
 if(paras[0])paras[0].textContent="Obra da coleção Gesso & Ouro. A imagem exibida é uma prévia ilustrativa. A edição digital inclui um PNG ampliado até 16.000 pixels no lado maior e licença de uso comercial não exclusiva, entregues em ZIP protegido após aprovação do pagamento.";
 if(paras.length>1)paras[paras.length-1].textContent="Licença de uso não exclusiva. A prévia é ilustrativa; a ampliação digital não equivale a uma captura nativa em 16K.";
 const labels=[...digital.querySelectorAll("dl dt")],values=[...digital.querySelectorAll("dl dd")];
 if(labels[0])labels[0].textContent="Coleção";
 if(labels[1])labels[1].textContent="Formato";
 if(labels[2])labels[2].textContent="Preço";
 if(values[1])values[1].textContent="PNG digital + licença, entregue em ZIP";
 const back=digital.querySelector(".actions a.secondary");if(back)back.textContent="Voltar à galeria";
 const links=[...document.querySelectorAll(".head .links a")];
 if(links[1])links[1].textContent="Coleções";if(links[2])links[2].textContent="Suporte";
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
'<button type="button" class="option" data-size="A3" aria-pressed="true">A3</button>',
'<button type="button" class="option" data-size="A2" aria-pressed="false">A2</button></div></div>',
'<div class="physical-field"><h2>2. ',copy.color,'</h2><div class="option-row" role="group" aria-label="',copy.color,'">',
'<button type="button" class="option color-option" data-color="Preta" aria-pressed="false"><span class="swatch black"></span><span>',pt?'Preta':'Black','</span></button>',
'<button type="button" class="option color-option" data-color="Branca" aria-pressed="true"><span class="swatch white"></span><span>',pt?'Branca':'White','</span></button>',
'<button type="button" class="option color-option" data-color="Natural" aria-pressed="false"><span class="swatch natural"></span><span>Natural</span></button>',
'<button type="button" class="option color-option" data-color="Marrom" aria-pressed="false"><span class="swatch brown"></span><span>',pt?'Marrom':'Brown','</span></button></div></div>',
'<div class="physical-summary" aria-live="polite">',
'<div><span>',copy.summarySize,'</span><strong id="summarySize">—</strong></div>',
'<div><span>',copy.frame,'</span><strong id="summaryFrame">',copy.frameValue,'</strong></div>',
'<div><span>',copy.color,'</span><strong id="summaryColor">',pt?'Branca':'White','</strong></div>',
'<div><span>',copy.price,'</span><strong id="summaryPrice">—</strong></div></div>',
'<p id="physicalStatus" class="gesso-availability" role="status">',copy.defaultStatus,'</p>',
'<button id="physicalBuy" type="button" class="physical-buy" disabled>',copy.prep,'</button>',
'<p class="physical-note">',copy.notice,'</p>'
].join('');
info.appendChild(physical);
const originalSrc=originalImage.getAttribute("src"),originalAlt=originalImage.getAttribute("alt");
const stage=document.createElement("div");stage.className="gesso-preview-stage";
const frame=document.createElement("div");frame.id="physicalFrame";frame.className="physical-frame white";
imageRegion.insertBefore(stage,originalImage);stage.appendChild(frame);frame.appendChild(originalImage);
originalImage.id="physicalArtwork";
let mode="digital";
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
  if(framed)u.searchParams.set("formato","quadro");else u.searchParams.delete("formato");
  history.replaceState(null,"",u.pathname+u.search+u.hash);
}
tabDigital.addEventListener("click",()=>choose("digital"));
tabPhysical.addEventListener("click",()=>choose("physical"));
picker.addEventListener("keydown",e=>{
  if(!["ArrowLeft","ArrowRight"].includes(e.key))return;
  e.preventDefault();const other=mode==="digital"?"physical":"digital";
  choose(other);(other==="digital"?tabDigital:tabPhysical).focus();
});
choose(new URLSearchParams(location.search).get("formato")==="quadro"?"physical":"digital");
window.LUMEN_GESSO_UNIFIED={sku,getMode:()=>mode,showDigital:()=>choose("digital"),showPhysical:()=>choose("physical")};
})();