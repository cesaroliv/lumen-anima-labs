(()=>{"use strict";
const params=new URLSearchParams(location.search),sku=params.get("sku")||"";
const pt=params.get("lang")==="pt"||(!params.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
const $=s=>document.querySelector(s);
const btn=$("#buySelected"),status=$("#availability"),name=$("#artworkName"),picture=$("#artworkPreview");
const phrases=pt?{title:"Sua obra digital",price:"Preço por obra",waiting:"Verificando disponibilidade da edição individual…",notReady:"A compra desta obra ainda não está disponível. Nenhuma cobrança será iniciada.",buy:"Comprar obra · R$ 14,90",features:"PNG individual e licença de uso no arquivo protegido. Download somente após aprovação do pagamento.",back:"Voltar à galeria"}:{title:"Your digital artwork",price:"Price per artwork",waiting:"Checking availability for this individual edition…",notReady:"Individual checkout is not available for this artwork yet. No charge will be initiated.",buy:"Buy artwork · R$ 14.90",features:"Individual PNG and license in a protected download. Released only after payment approval.",back:"Back to gallery"};
document.documentElement.lang=pt?"pt-BR":"en-US";document.documentElement.dataset.checkoutLocale=pt?"pt-BR":"en-US";
$("#pageTitle").textContent=phrases.title;$("#priceLabel").textContent=phrases.price;$("#features").textContent=phrases.features;$("#backLink").textContent=phrases.back;status.textContent=phrases.waiting;
if(!/^art-[0-9]{2}-[a-z0-9-]+$/.test(sku)){status.textContent=phrases.notReady;return;}
let entry=null,serverProduct=null,checkoutReady=Boolean(window.LUMEN_CHECKOUT_READY);
function activate(){if(!entry||!serverProduct||!checkoutReady)return;btn.dataset.product=sku;btn.disabled=false;btn.textContent=phrases.buy;status.textContent=phrases.features;}
window.addEventListener("lumen:checkout-ready",()=>{checkoutReady=true;activate()});
Promise.all([fetch("/assets/gallery/artworks.json").then(r=>r.ok?r.json():[]),fetch(String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"")+"/api/config").then(r=>r.ok?r.json():null)]).then(([items,config])=>{
entry=items.find(x=>x.sku===sku)||null;serverProduct=config?.individualSalesEnabled?config?.products?.[sku]:null;
if(entry){name.textContent=entry.name;picture.src=entry.preview;picture.alt=entry.name+" — Lumen Arts";}
if(!entry||!serverProduct||Number(serverProduct.price)!==14.90){status.textContent=phrases.notReady;return;}
activate();
}).catch(()=>{status.textContent=phrases.notReady});
})();