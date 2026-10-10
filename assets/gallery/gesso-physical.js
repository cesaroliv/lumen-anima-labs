(()=>{"use strict";
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
const sku=params.get("sku")||window.LUMEN_GESSO_UNIFIED?.sku||"";
const pt=params.get("lang")==="pt"||(!params.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
const api=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
const valid=/^art-gesso-[0-9]{2}-[a-z0-9-]+$/.test(sku);
const sizeButtons=[...document.querySelectorAll("[data-size]")],colorButtons=[...document.querySelectorAll("[data-color]")];
const frame=$("#physicalFrame"),img=$("#physicalArtwork"),name=$("#physicalName"),status=$("#physicalStatus"),buy=$("#physicalBuy");
const sizeOut=$("#summarySize"),colorOut=$("#summaryColor"),frameOut=$("#summaryFrame"),priceOut=$("#summaryPrice");
if(!frame||!img||!status||!buy||!sizeOut||!colorOut||!frameOut||!priceOut)return;
const embedded=!!window.LUMEN_GESSO_UNIFIED;
const strings=pt?{
invalid:"Obra física inválida.",loading:"Carregando opções da Printile…",unavailable:"Não foi possível carregar as opções do quadro. Tente novamente mais tarde.",
ready:"Personalização disponível para prévia. Pedidos físicos serão liberados após a definição de preços e frete.",
buy:"Encomendas em preparação",price:"Em definição",frame:"Tradicional",physical:"Quadro físico",colors:{Preta:"Preta",Branca:"Branca",Natural:"Natural",Marrom:"Marrom"}
}:{
invalid:"Invalid framed artwork.",loading:"Loading Printile options…",unavailable:"Frame options are temporarily unavailable. Please try again later.",
ready:"Preview customization is available. Framed orders will open after pricing and shipping are finalized.",
buy:"Framed orders coming soon",price:"To be confirmed",frame:"Traditional",physical:"Framed artwork",colors:{Preta:"Black",Branca:"White",Natural:"Natural",Marrom:"Brown"}
};
if(!embedded){document.documentElement.lang=pt?"pt-BR":"en-US";document.querySelectorAll("[data-pt][data-en]").forEach(el=>{el.textContent=pt?el.dataset.pt:el.dataset.en});}
status.textContent=strings.loading;buy.textContent=strings.buy;priceOut.textContent=strings.price;frameOut.textContent=strings.frame;
if(!valid){status.textContent=strings.invalid;return;}
let config=null,art=null,size=embedded?"A3":"A2",color=embedded?"Branca":"Preta";
const frameClass={Preta:"",Branca:"white",Natural:"natural",Marrom:"brown"};
/* Supplier public frame textures. Direct preview reference, no local asset copy.
   Source URLs can change: this is not an official mockup API. */
const printileTextures=Object.freeze({
 Preta:"https://printile.me/assets/preta-oLfoE6I6.jpg",
 Branca:"https://printile.me/assets/branca-DariJVCM.jpg",
 Natural:"https://printile.me/assets/natural-D8CTLK3U.jpg",
 Marrom:"https://printile.me/assets/marrom-CNKlrD7h.jpg"
});
function supplierFrameScale(){
 if(!art||!embedded)return;
 const stage=frame.closest(".gesso-preview-stage");if(!stage)return;
 const width=Math.max(160,stage.clientWidth-34);
 const inner=art.orientation==="vertical"?Math.min(420,width):Math.min(680,width);
 const rim=Math.max(9,Math.min(42,inner*2/42));
 frame.style.setProperty("--supplier-rim",rim.toFixed(2)+"px");
 frame.dataset.orientation=art.orientation;
}

function render(){
  if(!art)return;
  if(name)name.textContent=art.title;
  if(!embedded||window.LUMEN_GESSO_UNIFIED.getMode()==="physical"){
    img.src="/assets/gallery/gesso-physical/"+sku+"_"+size+".webp";
    img.alt=art.title+" — "+size+" — "+strings.physical;
  }
  frame.className="physical-frame supplier-native-frame "+(frameClass[color]||"");
  frame.style.setProperty("--supplier-texture","url("+JSON.stringify(printileTextures[color])+")");
  supplierFrameScale();
  sizeButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.size===size)));
  colorButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.color===color)));
  const key=art.orientation+"|"+size;
  sizeOut.textContent=config.dimensions[key]||size;
  colorOut.textContent=strings.colors[color]||color;
}
window.addEventListener("resize",()=>{if(art)supplierFrameScale()},{passive:true});
window.LUMEN_GESSO_PHYSICAL={render,getSelection:()=>({sku,size,color})};
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