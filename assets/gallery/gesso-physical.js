(()=>{"use strict";
const $=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const sku=params.get("sku")||"";
const pt=params.get("lang")==="pt"||(!params.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
const api=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
const valid=/^art-gesso-[0-9]{2}-[a-z0-9-]+$/.test(sku);
const sizeButtons=[...document.querySelectorAll("[data-size]")],colorButtons=[...document.querySelectorAll("[data-color]")];
const frame=$("#physicalFrame"),img=$("#physicalArtwork"),name=$("#physicalName"),status=$("#physicalStatus"),buy=$("#physicalBuy");
const sizeOut=$("#summarySize"),colorOut=$("#summaryColor"),frameOut=$("#summaryFrame"),priceOut=$("#summaryPrice");
const strings=pt?{
  invalid:"Obra física inválida.",
  loading:"Carregando opções da Printile…",
  unavailable:"A configuração física desta obra ainda não está disponível.",
  ready:"Configuração pronta. A venda física será ativada após definição de preço e liberação do fluxo de pedidos.",
  buy:"Compra física ainda não liberada",
  price:"Em definição",
  frame:"Tradicional",
  physical:"Quadro físico",
  colors:{Preta:"Preta",Branca:"Branca",Natural:"Natural",Marrom:"Marrom"}
}:{
  invalid:"Invalid physical artwork.",
  loading:"Loading Printile options…",
  unavailable:"Physical configuration is not available for this artwork yet.",
  ready:"Configuration ready. Physical sales will be enabled after pricing and order-flow approval.",
  buy:"Physical purchase not enabled yet",
  price:"To be defined",
  frame:"Traditional",
  physical:"Physical framed art",
  colors:{Preta:"Black",Branca:"White",Natural:"Natural",Marrom:"Brown"}
};
document.documentElement.lang=pt?"pt-BR":"en-US";
document.querySelectorAll("[data-pt][data-en]").forEach(el=>{el.textContent=pt?el.dataset.pt:el.dataset.en});
status.textContent=strings.loading;buy.textContent=strings.buy;priceOut.textContent=strings.price;frameOut.textContent=strings.frame;
if(!valid){status.textContent=strings.invalid;return;}
let config=null,art=null,size="A2",color="Preta";
const frameClass={Preta:"",Branca:"white",Natural:"natural",Marrom:"brown"};
function previewPath(){return "/assets/gallery/gesso-physical/"+sku+"_"+size+".webp";}
function render(){
  if(!art)return;
  name.textContent=art.title;
  img.src=previewPath();img.alt=art.title+" — "+size+" — "+strings.physical;
  frame.className="physical-frame "+(frameClass[color]||"");
  sizeButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.size===size)));
  colorButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.color===color)));
  const key=art.orientation+"|"+size;
  sizeOut.textContent=config.dimensions[key]||size;
  colorOut.textContent=strings.colors[color]||color;
}
sizeButtons.forEach(b=>b.addEventListener("click",()=>{size=b.dataset.size;render()}));
colorButtons.forEach(b=>b.addEventListener("click",()=>{color=b.dataset.color;render()}));
if(!api){status.textContent=strings.unavailable;return;}
fetch(api+"/api/physical/gesso/config",{headers:{accept:"application/json"}}).then(r=>r.ok?r.json():null).then(data=>{
  config=data;art=data?.artworks?.[sku]||null;
  if(!art||!Array.isArray(data?.sizes)||!Array.isArray(data?.colors)){status.textContent=strings.unavailable;return;}
  if(!data.sizes.includes(size))size=data.sizes[0];
  if(!data.colors.includes(color))color=data.colors[0];
  render();status.textContent=strings.ready;
}).catch(()=>{status.textContent=strings.unavailable});
})();