(()=>{"use strict";
 const p=new URLSearchParams(location.search),id=p.get("id")||"",pt=p.get("lang")==="pt"||(!p.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
 document.documentElement.lang=pt?"pt-BR":"en";
 const $=x=>document.getElementById(x);
 const copy=pt?{back:"Voltar às obras",heading:"Sua obra",info:"Esta imagem possui uma página individual de checkout preparada. A edição comercial está sendo concluída.",price:"Preço",pending:"Preço e entrega em validação",disabled:"Pagamento ainda não liberado",disclaimer:"A imagem mostra uma ambientação ilustrativa. A edição exata, o formato, a licença e o preço serão apresentados antes de qualquer pagamento.",missing:"Obra não localizada. Nenhuma cobrança será iniciada.",backWorks:"← Voltar à galeria"}:{back:"Back to artworks",heading:"Your artwork",info:"This image has its individual checkout page prepared. The sellable edition is being finalized.",price:"Price",pending:"Price and delivery pending verification",disabled:"Payment not yet available",disclaimer:"This image illustrates a styled interior. The exact edition, format, license and price will be shown before any payment.",missing:"Artwork not found. No charge will be initiated.",backWorks:"← Back to gallery"};
 $("backLink").textContent=copy.back;$("backWorks").textContent=copy.backWorks;$("orderHeading").textContent=copy.heading;$("orderInfo").textContent=copy.info;$("priceCaption").textContent=copy.price;$("orderStatus").textContent=copy.pending;$("payButton").textContent=copy.disabled;$("orderDisclaimer").textContent=copy.disclaimer;
 if(!/^(obsidian|arte-black|gesso-ouro|arte-juridica)-\d{2}$/.test(id)){$("orderName").textContent=copy.missing;return;}
 fetch("/assets/gallery/checkout-manifest.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("no inventory");return r.json()}).then(data=>{
  const item=Array.isArray(data.items)?data.items.find(x=>x.id===id):null;
  if(!item)throw Error("not found");
  $("orderName").textContent=item.collection+" · "+item.label;
  $("orderCollection").textContent=item.collection;
  $("orderPreview").src=item.preview;
  $("orderPreview").alt=item.collection+" — "+item.label+(pt?" (ambientação ilustrativa)":" (illustrative interior)");
  document.title=item.collection+" · "+item.label+" — Lumen Arts";
 }).catch(()=>{$("orderName").textContent=copy.missing;$("orderStatus").textContent=copy.missing});
})();