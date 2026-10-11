(()=>{
"use strict";
const params=new URLSearchParams(location.search);
const pt=params.get('lang')==='pt'||(params.get('lang')!=='en'&&(navigator.language||'pt').toLowerCase().startsWith('pt'));
const categories=["obsidian","gesso-ouro","arte-juridica","arte-black"];
let category=categories.includes(params.get("colecao"))?params.get("colecao"):"obsidian";
const select=document.getElementById("buyArtwork");
const cta=document.getElementById("buyContinue");
const availability=document.getElementById("buyAvailability");
const price=document.getElementById("buyPrice");
const buttons=[...document.querySelectorAll("[data-collection]")];
const base="/assets/gallery/artworks.json";
let products=[],available=false;
const classify=sku=>sku.startsWith("art-gesso-")?"gesso-ouro":sku.startsWith("art-justice-")?"arte-juridica":/^art-\d\d-/.test(sku)?"obsidian":null;
const format=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
function clearPurchase(){
 cta.removeAttribute("href");cta.setAttribute("aria-disabled","true");cta.setAttribute("tabindex","-1");cta.textContent=pt?"Selecione uma obra para comprar →":"Select an artwork to buy →";
}
function setCollection(next){
 category=next;buttons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.collection===next)));
 select.replaceChildren();
 const empty=document.createElement("option");empty.value="";empty.textContent=(pt?"Selecione a obra…":"Select an artwork…");select.appendChild(empty);
 const subset=products.filter(p=>p.collection===next);
 subset.forEach(p=>{const option=document.createElement("option");option.value=p.sku;option.textContent=p.name;select.appendChild(option);});
 select.value="";select.disabled=!subset.length;
 clearPurchase();price.textContent=next==="arte-black"?(pt?"Indisponível":"Unavailable"):"R$ 14,90";
 if(!available){availability.textContent=(pt?"Verificando disponibilidade no checkout seguro…":"Checking secure checkout availability…");}
 else if(next==="arte-black"){availability.textContent=(pt?"As obras digitais da Arte Black ainda não estão liberadas para compra. Confira as outras coleções disponíveis.":"Black Art digital editions are not available to purchase yet. Explore the other collections.");}
 else if(!subset.length){availability.textContent=(pt?"Nenhuma obra desta coleção está disponível para compra neste momento.":"No artwork in this collection is available for purchase right now.");}
 else{availability.textContent=subset.length+(pt?" obras digitais disponíveis nesta coleção. Escolha uma para continuar.":" digital artworks available in this collection. Choose one to continue.");}
 const updated=new URL(location.href);updated.searchParams.set("colecao",next);history.replaceState(null,"",updated.pathname+updated.search);
}
function chooseArtwork(){
 const p=products.find(x=>x.sku===select.value&&x.collection===category);
 clearPurchase();
 if(!p)return;
 price.textContent=format(p.price);
 const to=new URL("/checkout-artwork.html",location.origin);
 to.searchParams.set("sku",p.sku);to.searchParams.set("lang",pt?"pt":"en");
 for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){
  const v=params.get(key);if(v&&/^[a-zA-Z0-9_.-]{1,64}$/.test(v))to.searchParams.set(key,v);
 }
 cta.href=to.pathname+to.search;
 cta.removeAttribute("aria-disabled");cta.removeAttribute("tabindex");
 cta.textContent=(pt?"COMPRAR ":"BUY ")+p.name+" · "+format(p.price)+" →";
 availability.textContent=(pt?"Continue para conferir a imagem desta obra e realizar o pagamento seguro.":"Continue to review the exact artwork and pay securely.");
}
buttons.forEach(b=>b.addEventListener("click",()=>setCollection(b.dataset.collection)));
select.addEventListener("change",chooseArtwork);
cta.addEventListener("click",e=>{if(cta.getAttribute("aria-disabled")==="true")e.preventDefault()});
document.querySelectorAll('a[href*="lang=pt"]').forEach(a=>{
 if(!pt)a.href=a.getAttribute("href").replace("lang=pt","lang=en");
});

if(!pt){document.documentElement.lang="en";document.title="Buy digital art — Lumen Arts";document.querySelector(".back").textContent="← Back to gallery";document.querySelector(".buy-intro .eyebrow").textContent="LUMEN ARTS · DIRECT PURCHASE";document.querySelector(".buy-intro h1").textContent="Choose your artwork. Buy in a few clicks.";document.querySelector(".buy-intro .lead").textContent="Choose your digital artwork and continue to secure payment. Your digital file and license become available once payment is approved.";document.querySelector(".top-line span:last-child").textContent="DIGITAL EDITION";document.querySelector("#choose-title").textContent="Which collection?";document.querySelector("label[for=\"buyArtwork\"]").textContent="Choose your artwork";document.querySelector(".buy-price div span").textContent="Digital edition price";document.querySelector(".price-detail").textContent="1 artwork · digital file";document.querySelector(".buy-safety").textContent="You can confirm the exact artwork and its image before starting payment. Room previews are illustrative and may not depict the purchased artwork.";document.querySelector(".buyer-note a").textContent="View all four collections →";document.querySelectorAll(".categories button").forEach(b=>{if(b.dataset.collection==="gesso-ouro")b.textContent="Plaster & Gold";if(b.dataset.collection==="arte-juridica")b.textContent="Legal Art";if(b.dataset.collection==="arte-black")b.textContent="Black Art";});document.querySelector(".buyer-note p").textContent="Important: this is a digital art purchase (file and license), not a framed print. Physical prints are coming soon.";document.querySelector(".buy-footer").firstChild.textContent="Lumen Arts · Secure digital purchase via Mercado Pago ";document.querySelector(".buy-footer a").textContent="Help";}
setCollection(category);
Promise.all([
 fetch(base,{headers:{accept:"application/json"}}).then(r=>{if(!r.ok)throw Error("artworks catalog");return r.json()}),
 fetch("https://lumen-digital-checkout.ccoliveira1.workers.dev/api/config",{headers:{accept:"application/json"}}).then(r=>{if(!r.ok)throw Error("checkout config");return r.json()})
]).then(([list,cfg])=>{
 if(!cfg.individualSalesEnabled)throw Error("digital sales disabled");
 if(!Array.isArray(list))throw Error("invalid catalog");
 products=list.filter(p=>p&&typeof p.sku==="string"&&typeof p.name==="string"&&classify(p.sku)&&/^art-(?:[0-9]{2}|gesso-[0-9]{2}|justice-[0-9]{2})-[a-z0-9-]+$/.test(p.sku)&&Number(cfg.products?.[p.sku]?.price)===14.9).map(p=>({sku:p.sku,name:p.name,collection:classify(p.sku),price:Number(cfg.products[p.sku].price)}));
 if(!products.length)throw Error("no purchasable artworks");
 available=true;setCollection(category);
}).catch(()=>{
 available=false;products=[];setCollection(category);select.disabled=true;
 availability.textContent=(pt?"Não foi possível confirmar a disponibilidade agora. Tente novamente em alguns instantes; nenhum pagamento foi iniciado.":"Unable to verify availability right now. Please try again later; no payment has been started.");
});
})();