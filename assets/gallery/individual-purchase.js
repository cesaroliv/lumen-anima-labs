(()=>{"use strict";
const path=location.pathname.match(/\/artworks\/([a-z0-9-]+)\.html$/);if(!path)return;
const sku="art-"+path[1],notice=document.querySelector(".detail-info .notice");if(!notice)return;
const pt=(navigator.language||"").toLowerCase().startsWith("pt")||new URLSearchParams(location.search).get("lang")==="pt";
const api=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
notice.textContent=pt?"Verificando preço e disponibilidade do download protegido…":"Checking secure price and protected download availability…";
if(!api)return;
fetch(api+"/api/config",{headers:{accept:"application/json"}}).then(r=>r.ok?r.json():null).then(data=>{
if(!data?.individualSalesEnabled || !Number.isFinite(Number(data.products?.[sku]?.price))||Number(data.products?.[sku]?.price)<=0)return;
const link=document.createElement("a");link.className="btn";link.id="singleArtworkBuy";
const to=new URL("/checkout-artwork.html",location.origin);to.searchParams.set("sku",sku);to.searchParams.set("lang",pt?"pt":"en");
for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){const v=new URLSearchParams(location.search).get(key);if(v&&/^[a-zA-Z0-9_.-]{1,64}$/.test(v))to.searchParams.set(key,v)}
link.href=to.pathname+to.search;link.textContent=(pt?"Comprar esta obra · ":"Buy this artwork · ")+Number(data.products[sku].price).toLocaleString(pt?"pt-BR":"en-US",{style:"currency",currency:"BRL"});
const priceElement=document.querySelector(".detail-info dl dd:last-child");if(priceElement&&priceElement.textContent.includes("R$"))priceElement.textContent=Number(data.products[sku].price).toLocaleString(pt?"pt-BR":"en-US",{style:"currency",currency:"BRL"});notice.replaceWith(link);
}).catch(()=>{});
})();