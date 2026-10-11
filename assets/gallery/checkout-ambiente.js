(()=>{"use strict";
 const p=new URLSearchParams(location.search),id=p.get("id")||"",pt=p.get("lang")==="pt"||(!p.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
 document.documentElement.lang=pt?"pt-BR":"en";
 const $=x=>document.getElementById(x);
 const copy=pt?{back:"Voltar às obras",heading:"Seu quadro",info:"Personalize o acabamento da Printile. A compra será habilitada somente depois de confirmar a obra exata, o preço e o frete.",price:"Preço",pending:"Pagamento físico aguardando validação da obra, preço e entrega.",disabled:"Pagamento ainda não liberado",disclaimer:"A foto mostra uma ambientação ilustrativa, não a arte isolada pronta para impressão. Suas escolhas não geram pedido nem cobrança.",missing:"Obra não localizada. Nenhuma cobrança será iniciada.",backWorks:"← Voltar à galeria",config:"Configurações Printile",intro:"Escolha tamanho, acabamento e cor. As configurações são uma prévia de preferência até a edição impressa ficar pronta.",notice:"Configuração ilustrativa. A correspondência da arte final e os valores deverão ser verificados antes da compra.",unavailable:"Opções da Printile indisponíveis; tente atualizar a página.",colors:"Não se aplica"}:{back:"Back to artworks",heading:"Your print",info:"Configure Printile finishes. Purchases will be enabled only after the exact artwork, price, and shipping are verified.",price:"Price",pending:"Physical payment pending artwork, pricing and shipping verification.",disabled:"Payment not yet available",disclaimer:"The photograph is an illustrative room scene, not a print-ready artwork. No purchase or charge will be created.",missing:"Artwork not found. No charge will be initiated.",backWorks:"← Back to gallery",config:"Printile options",intro:"Choose size, finish and frame color. These are preliminary preferences until the printed edition is ready.",notice:"Illustrative configuration. Final artwork identity and costs must be confirmed before purchase.",unavailable:"Printile options unavailable; refresh the page.",colors:"Not applicable"};
 $("backLink").textContent=copy.back;$("backWorks").textContent=copy.backWorks;$("orderHeading").textContent=copy.heading;$("orderInfo").textContent=copy.info;$("priceCaption").textContent=copy.price;$("orderStatus").textContent=copy.pending;$("payButton").textContent=copy.disabled;$("orderDisclaimer").textContent=copy.disclaimer;$("printileTitle").textContent=copy.config;$("printileConfigIntro").textContent=copy.intro;$("printileNotice").textContent=copy.notice;
 if(!/^(obsidian|arte-black|gesso-ouro|arte-juridica)-\d{2}$/.test(id)){$("orderName").textContent=copy.missing;return;}
 fetch("/assets/gallery/checkout-manifest.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("no inventory");return r.json()}).then(data=>{
  const item=Array.isArray(data.items)?data.items.find(x=>x.id===id):null;
  if(!item)throw Error("not found");
  $("orderName").textContent=item.collection+" · "+item.label;$("orderCollection").textContent=item.collection;
  $("orderPreview").src=item.preview;$("orderPreview").alt=item.collection+" — "+item.label+(pt?" (ambientação ilustrativa)":" (illustrative interior)");
  document.title=item.collection+" · "+item.label+" — Lumen Arts";
 }).catch(()=>{$("orderName").textContent=copy.missing;$("orderStatus").textContent=copy.missing});
 const sizes=$("printileSizes"),finish=$("printileFinish"),colors=$("printileColors"),area=$("printileColorArea"),summary=$("printileSummary");
 let size=["A4","A3","A2"].includes(p.get("size"))?p.get("size"):"A2",style="Filete",color="Preta",styles=[],palette=[],orientations={};
 const withoutFrame=s=>s==="Poster"||s==="Placa Decorativa";
 function update(){
  for(const b of sizes.querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.dataset.printileSize===size));
  if(finish.options.length>0&&styles.length){finish.value=style;}
  area.hidden=withoutFrame(style);
  const allowed=(orientations?.horizontal?.[size]?.[style]||[]);
  if(!withoutFrame(style)&&palette.length){
    let valid=palette.filter(x=>allowed.includes(x));if(!valid.length)valid=palette;
    if(!valid.includes(color))color=valid[0];
    colors.replaceChildren();
    for(const shade of valid){
      const b=document.createElement("button");b.type="button";b.textContent=shade;b.dataset.printileColor=shade;
      b.setAttribute("aria-pressed",String(shade===color));b.addEventListener("click",()=>{color=shade;update();});colors.append(b);
    }
  }
  summary.textContent=size+" · "+style+" · "+(withoutFrame(style)?copy.colors:color);
  const u=new URL(location.href);u.searchParams.set("size",size);u.searchParams.set("finish",style);
  if(withoutFrame(style))u.searchParams.delete("color");else u.searchParams.set("color",color);
  history.replaceState(null,"",u.pathname+u.search+u.hash);
 }
 sizes.addEventListener("click",e=>{const value=e.target.closest("button")?.dataset.printileSize;if(["A4","A3","A2"].includes(value)){size=value;update();}});
 finish.addEventListener("change",()=>{if(styles.includes(finish.value)){style=finish.value;update();}});
 fetch("/assets/gallery/gesso-physical-offers.json",{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("catalog");return r.json()}).then(data=>{
  if(!Array.isArray(data.styles)||data.styles.length!==8||!Array.isArray(data.colors)||!data.byOrientation)throw Error("catalog schema");
  styles=data.styles;palette=data.colors;orientations=data.byOrientation;
  finish.replaceChildren();for(const item of styles){const o=document.createElement("option");o.value=item;o.textContent=item;finish.append(o);}
  finish.disabled=false;style=styles.includes(p.get("finish"))?p.get("finish"):"Filete";
  color=palette.includes(p.get("color"))?p.get("color"):"Preta";
  update();
 }).catch(()=>{finish.disabled=true;$("printileNotice").textContent=copy.unavailable;});
})();