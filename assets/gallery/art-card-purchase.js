(() => {
 "use strict";
 const params=new URLSearchParams(location.search);
 const lang=["pt","en"].includes(params.get("lang"))?params.get("lang"):((navigator.language||"").toLowerCase().startsWith("pt")?"pt":"en");
 const pt=lang==="pt";
 const all=[...document.querySelectorAll("[data-gallery-open]")];
 const states=new Map(),modal=document.getElementById("gallery-explore"),note=document.querySelector(".gallery-buy-note");
 const physicalModal=document.createElement("a");physicalModal.id="gallery-printile";physicalModal.className="gallery-printile-link";physicalModal.hidden=true;physicalModal.textContent=pt?"PERSONALIZAR QUADRO →":"CUSTOMIZE FRAME →";document.querySelector(".gallery-dialog .dialog-actions")?.append(physicalModal);
 const money=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
 const keyOf=button=>{
   const grid=button.closest(".showcase-grid");
   if(!grid)return "";
   const index=[...grid.querySelectorAll("[data-gallery-open]")].indexOf(button);
   return button.dataset.gallerySlug+"-"+String(index+1).padStart(2,"0");
 };
 const fallback=id=>"/checkout-ambiente.html?id="+encodeURIComponent(id)+"&lang="+lang;
 const transferParams=url=>{
   for(const k of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){
     const value=params.get(k);if(value&&/^[a-zA-Z0-9_.-]{1,64}$/.test(value))url.searchParams.set(k,value);
   }
   return url.pathname+url.search;
 };
 function refreshDialog(button){
   if(!modal)return;
   const s=states.get(button);if(!s)return;
   modal.hidden=false;modal.href=s.url;
   physicalModal.hidden=!s.physicalUrl;physicalModal.href=s.physicalUrl||"/#colecoes";
   modal.textContent=s.available?(pt?"COMPRAR EDIÇÃO DIGITAL · "+money(14.9)+" →":"BUY DIGITAL ART · "+money(14.9)+" →"):(pt?"VER CHECKOUT DESTA ARTE →":"VIEW ARTWORK CHECKOUT →");
   if(note)note.textContent=s.available?(pt?"Edição digital individual, sem moldura. Confira a obra exata antes de pagar.":"Individual digital edition, unframed. Review the exact file before paying."):(pt?"Esta ambientação ainda não tem produto liberado para pagamento. O checkout individual está preparado; nenhuma cobrança será realizada.":"This styled image is not yet cleared for payment. Its individual checkout is prepared; no charge will be made.");
 }
 for(const button of all){
   const id=keyOf(button),card=button.closest(".showcase-item");
   if(!card||!/^(obsidian|arte-black|gesso-ouro|arte-juridica)-\d{2}$/.test(id))continue;
   const img=button.querySelector("img"),caption=button.querySelector(".showcase-name");
   if(!img)continue;
   const stage=document.createElement("div");stage.className="showcase-photo";
   button.before(stage);stage.append(button);
   if(caption){card.insertBefore(caption,stage.nextSibling);caption.classList.add("showcase-name-outside");}
   const link=document.createElement("a");link.className="showcase-buy-overlay";link.href=fallback(id);
   link.textContent=pt?"PERSONALIZAR QUADRO →":"CUSTOMIZE FRAME →";
   link.setAttribute("aria-label",(pt?"Ver checkout desta obra: ":"View checkout for artwork: ")+id);
   stage.append(link);
   const captionInfo=document.createElement("span");captionInfo.className="showcase-purchase-caption";
   captionInfo.textContent=pt?"Checkout individual da obra":"Individual artwork checkout";
   card.insertBefore(captionInfo,caption?.nextSibling||stage.nextSibling);
   states.set(button,{id,url:link.getAttribute("href"),physicalUrl:fallback(id),available:false,link,captionInfo});
 }
 document.addEventListener("lumen:gallery-item-changed",e=>refreshDialog(e.detail?.button));
 fetch("/assets/gallery/checkout-manifest.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(m=>{if(!Array.isArray(m?.items))return;const byId=new Map(m.items.map(x=>[x.id,x]));for(const [button,st] of states){const sku=byId.get(st.id)?.sku;if(!/^art-(?:[0-9]{2}|gesso-[0-9]{2}|justice-[0-9]{2})-[a-z0-9-]+$/.test(sku||""))continue;const url="/artworks/"+sku.slice(4)+".html?lang="+lang+"&formato=quadro";st.physicalUrl=url;if(!st.link.parentElement.querySelector(".showcase-frame-overlay")){const a=document.createElement("a");a.className="showcase-frame-overlay";a.href=url;a.textContent=pt?"PERSONALIZAR QUADRO →":"CUSTOMIZE FRAME →";a.setAttribute("aria-label",(pt?"Personalizar quadro ":"Customize frame ")+st.id);st.link.parentElement.append(a);}}}).catch(()=>{});
 const aborter=new AbortController(),timeout=setTimeout(()=>aborter.abort(),8500);
 Promise.all([
  fetch("/assets/gallery/checkout-manifest.json",{signal:aborter.signal,cache:"no-store"}).then(r=>{if(!r.ok)throw Error("manifest unavailable");return r.json()}),
  fetch("/assets/gallery/artworks.json",{signal:aborter.signal}).then(r=>{if(!r.ok)throw Error("catalog unavailable");return r.json()}),
  fetch("https://lumen-digital-checkout.ccoliveira1.workers.dev/api/config",{signal:aborter.signal,headers:{accept:"application/json"}}).then(r=>{if(!r.ok)throw Error("checkout unavailable");return r.json()})
 ]).then(([manifest,artworks,config])=>{
   if(!Array.isArray(manifest?.items)||!Array.isArray(artworks)||config?.individualSalesEnabled!==true)return;
   const inventory=new Map(manifest.items.map(x=>[x.id,x]));
   const registry=new Map(artworks.map(x=>[x.sku,x]));
   for(const [button,s] of states){
     const sku=inventory.get(s.id)?.sku,entry=registry.get(sku),product=config.products?.[sku];
     if(!sku||!entry||!product||Number(product.price)!==14.9)continue;
     const u=new URL("/checkout-artwork.html",location.origin);u.searchParams.set("sku",sku);u.searchParams.set("lang",lang);u.searchParams.set("auto","1");
     const href=transferParams(u);
     const frame="/artworks/"+sku.slice(4)+".html?lang="+lang+"&formato=quadro";
     const frameLink=document.createElement("a");frameLink.className="showcase-frame-overlay";frameLink.href=frame;
     frameLink.textContent=pt?"PERSONALIZAR QUADRO →":"CUSTOMIZE FRAME →";
     frameLink.setAttribute("aria-label",(pt?"Personalizar quadro impresso ":"Customize printed artwork ")+entry.name);
     if(!s.link.parentElement.querySelector(".showcase-frame-overlay"))s.link.parentElement.append(frameLink);
     s.physicalUrl=frame;
     s.link.href=href;s.link.textContent=pt?"COMPRAR DIGITAL · "+money(14.9)+" →":"BUY DIGITAL · "+money(14.9)+" →";
     s.link.setAttribute("aria-label",(pt?"Comprar arte digital ":"Buy digital artwork ")+entry.name+" · "+money(14.9));
     s.captionInfo.textContent=entry.name+(pt?" · edição digital, sem moldura":" · digital, unframed");
     s.url=href;s.available=true;
     const current=document.getElementById("dialog-artwork");
     if(document.getElementById("gallery-dialog")?.open&&current?.getAttribute("src")===button.dataset.view)refreshDialog(button);
   }
 }).catch(()=>{}).finally(()=>clearTimeout(timeout));
})();
