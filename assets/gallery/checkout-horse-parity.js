(()=>{"use strict";
const query=new URLSearchParams(location.search);
const id=query.get("id")||"";
const pt=query.get("lang")==="pt"||(!query.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
const $=selector=>document.querySelector(selector);
const text=(selector,value)=>{const el=$(selector);if(el)el.textContent=value;};
document.documentElement.lang=pt?"pt-BR":"en";
const allowed=/^(obsidian|arte-black|gesso-ouro|arte-juridica)-\d{2}$/;
const status=$("#physicalStatus"),frame=$("#physicalFrame"),img=$("#physicalArtwork");
const finishSelect=$("#physicalFinish"),help=$("#physicalFinishHelp"),colorField=$("#physicalColorField");
const sizeButtons=[...document.querySelectorAll("[data-size]")];
const colorButtons=[...document.querySelectorAll("[data-color]")];
const labels=pt?{
 invalid:"Esta obra não foi localizada. Não é possível encomendar.",loading:"Carregando opções de acabamento…",
 unavailable:"Não foi possível validar a obra e os acabamentos. Nenhum pagamento será iniciado.",
 ready:"Prévia da obra para personalização. Produção e frete ainda não aprovados; encomenda indisponível.",
 physical:"Arte impressa",digital:"Arte digital",pending:"Indisponível nesta edição",color:"Cor da moldura",
 dimension:"Medidas",noColor:"Não se aplica",notMaster:"A arte exibida é um estudo recortado da ambientação, NÃO é arquivo aprovado para impressão. Nenhuma encomenda é permitida.",
 normal:"Visualização da obra sem ambiente, com acabamento ilustrativo Printile. Produção, preço e frete ainda não aprovados. Nenhum pagamento será realizado.",
 colors:{Preta:"Preta",Branca:"Branca",Natural:"Natural",Marrom:"Marrom"},
 help:{
 "Tradicional":"Moldura tradicional de perfil largo, sem vidro.",
 "Tradicional com vidro acrílico":"Moldura tradicional com proteção de vidro acrílico (simulada).",
 "Caixa":"Moldura tipo caixa, perfil intermediário, sem vidro.",
 "Caixa com vidro acrílico":"Moldura tipo caixa com vidro acrílico (simulado).",
 "Filete":"Moldura física de perfil fino, sem linha gráfica interna.",
 "Filete com vidro acrílico":"Moldura fina com vidro acrílico (simulado).",
 "Placa Decorativa":"Placa decorativa sem moldura externa.",
 "Poster":"Pôster sem moldura externa."
 }
}:{
 invalid:"Artwork not found. No order can be made.",loading:"Loading framing options…",
 unavailable:"Artwork and framing options could not be verified. No payment will be started.",
 ready:"Customizable preview. Print production and shipping are not approved; orders unavailable.",
 physical:"Printed artwork",digital:"Digital artwork",pending:"Unavailable for this edition",color:"Frame color",
 dimension:"Dimensions",noColor:"Not applicable",notMaster:"Preview cropped from the styled interior; NOT approved for printing. No order can be placed.",
 normal:"Artwork without room decor, with an illustrative Printile frame. Print production, pricing and shipping are pending approval. No payment will be taken.",
 colors:{Preta:"Black",Branca:"White",Natural:"Natural",Marrom:"Brown"},
 help:{
 "Tradicional":"Wide traditional frame without glazing.",
 "Tradicional com vidro acrílico":"Wide frame with simulated acrylic glazing.",
 "Caixa":"Box frame, medium profile, without glazing.",
 "Caixa com vidro acrílico":"Box frame with simulated acrylic glazing.",
 "Filete":"Slim frame without a decorative inner border.",
 "Filete com vidro acrílico":"Slim frame with simulated acrylic glazing.",
 "Placa Decorativa":"Decorative panel, no frame.",
 "Poster":"Unframed poster."
 }
};
if(!pt){
 text("#detailEyebrow","CHOOSE YOUR ARTWORK FORMAT");
 text("#collectionBack","View the collection rooms ↗");
 text("#gessoTabDigital strong",labels.digital);
 text("#gessoTabDigital small",labels.pending);
 text("#gessoTabPhysical strong",labels.physical);
 text("#gessoTabPhysical small","Frames, panels and posters");
 text("#physicalLead","Choose size, finish and frame color for your artwork. The preview uses the isolated art and Printile framing.");
 text("#sizeLabel","1. SIZE");text("#finishLabel","2. FINISH");text("#colorLabel","3. FRAME COLOR");
 text("#summarySize", "—");
 for(const el of colorButtons)el.querySelector("span:last-child").textContent=labels.colors[el.dataset.color];
 text("#physicalBuy","Orders in preparation");text("#summaryPrice","To be confirmed");
 text("#backWorks","Back to artworks");
 text("#physicalNote",labels.normal);
}
status.textContent=labels.loading;
const printileTextures=Object.freeze({
 Preta:"https://printile.me/assets/preta-oLfoE6I6.jpg",
 Branca:"https://printile.me/assets/branca-DariJVCM.jpg",
 Natural:"https://printile.me/assets/natural-D8CTLK3U.jpg",
 Marrom:"https://printile.me/assets/marrom-CNKlrD7h.jpg"
});
const colorClasses={Preta:"",Branca:"white",Natural:"natural",Marrom:"brown"};
const unframed=new Set(["Poster","Placa Decorativa"]);
const glazings=new Set(["Tradicional com vidro acrílico","Caixa com vidro acrílico","Filete com vidro acrílico"]);
function cmWidth(type){return type.startsWith("Tradicional")?2:type.startsWith("Caixa")?1.5:type.startsWith("Filete")?.5:0}
const dimensions={
 "horizontal|A4":"30 × 20 cm","horizontal|A3":"40 × 30 cm","horizontal|A2":"60 × 40 cm",
 "vertical|A4":"20 × 30 cm","vertical|A3":"30 × 40 cm","vertical|A2":"40 × 60 cm"
};
let art=null,offers=null,size=["A4","A3","A2"].includes(query.get("size"))?query.get("size"):"A2";
let finish="Caixa",color="Preta";
function availableFor(sizeValue,finishValue){const v=offers?.byOrientation?.[art?.orientation]?.[sizeValue]?.[finishValue];return Array.isArray(v)?v:[]}
function supplierFrameScale(){
 if(!art)return;
 const stage=frame.closest(".gesso-preview-stage");
 const usable=Math.max(160,(stage?.clientWidth||640)-34);
 const inner=art.orientation==="vertical"?Math.min(420,usable):Math.min(680,usable);
 const rim=Math.max(4,Math.min(42,inner*cmWidth(finish)/42));
 frame.style.setProperty("--supplier-rim",rim.toFixed(2)+"px");
 frame.dataset.orientation=art.orientation;
}
function render(){
 if(!art||!offers)return;
 const validFinishes=offers.styles||[];
 if(!availableFor(size,finish).length)finish=validFinishes.find(v=>availableFor(size,v).length)||"";
 if(!finish){status.textContent=labels.unavailable;return}
 const choices=availableFor(size,finish),noFrame=unframed.has(finish);
 if(!noFrame&&!choices.includes(color))color=choices[0]||"Preta";
 for(const opt of finishSelect.options)opt.disabled=!availableFor(size,opt.value).length;
 finishSelect.value=finish;
 for(const btn of sizeButtons){btn.disabled=!availableFor(btn.dataset.size,finish).length;btn.setAttribute("aria-pressed",String(btn.dataset.size===size))}
 colorField.hidden=noFrame;
 for(const btn of colorButtons){const enabled=!noFrame&&choices.includes(btn.dataset.color);btn.disabled=!enabled;btn.setAttribute("aria-pressed",String(enabled&&btn.dataset.color===color))}
 help.textContent=labels.help[finish]||"";
 const preview=art.previews?.[size];
 if(!preview||!/^\/assets\/[a-zA-Z0-9/_-]+\.webp$/.test(preview)){status.textContent=labels.unavailable;return}
 if(img.getAttribute("src")!==preview)img.src=preview;
 img.alt=art.title+" — "+size+" — "+labels.physical;
 frame.className="physical-frame "+(noFrame?(finish==="Poster"?"printile-unframed printile-poster":"printile-unframed printile-panel"):
 "supplier-native-frame "+colorClasses[color]+(glazings.has(finish)?" has-acrylic-glass":""));
 if(noFrame)frame.style.removeProperty("--supplier-texture");
 else frame.style.setProperty("--supplier-texture","url("+JSON.stringify(printileTextures[color])+")");
 supplierFrameScale();
 text("#summarySize",dimensions[art.orientation+"|"+size]||size);
 text("#summaryFrame",finishSelect.selectedOptions[0]?.textContent||finish);
 text("#summaryColor",noFrame?labels.noColor:labels.colors[color]);
 text("#summaryPrice",pt?"Em definição":"To be confirmed");
 const url=new URL(location.href);
 url.searchParams.set("size",size);url.searchParams.set("finish",finish);
 if(noFrame)url.searchParams.delete("color");else url.searchParams.set("color",color);
 history.replaceState(null,"",url.pathname+url.search+url.hash);
}
sizeButtons.forEach(btn=>btn.addEventListener("click",()=>{if(btn.disabled)return;size=btn.dataset.size;render()}));
colorButtons.forEach(btn=>btn.addEventListener("click",()=>{if(btn.disabled)return;color=btn.dataset.color;render()}));
finishSelect.addEventListener("change",()=>{finish=finishSelect.value;render()});
window.addEventListener("resize",()=>{if(art)supplierFrameScale()},{passive:true});
img.addEventListener("error",()=>{status.textContent=labels.unavailable;});
if(!allowed.test(id)){text("#detailTitle",labels.invalid);status.textContent=labels.invalid;return}
Promise.all([
 fetch("/assets/gallery/checkout-manifest.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("checkout inventory");return r.json()}),
 fetch("/assets/gallery/checkout-art-isolated.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("art mapping");return r.json()}),
 fetch("/assets/gallery/gesso-physical-offers.json",{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("Printile options");return r.json()})
]).then(([inventory,map,snapshot])=>{
 const item=inventory?.items?.find(v=>v.id===id),record=map?.items?.[id];
 if(!item||!record||record.id!==id||!["horizontal","vertical"].includes(record.orientation)||record.saleApproved!==false||record.manufacturingApproved!==false)throw Error("unapproved artwork");
 if(!Array.isArray(snapshot?.styles)||snapshot.styles.length!==8||!snapshot.byOrientation?.[record.orientation])throw Error("invalid Printile snapshot");
 for(const sz of ["A4","A3","A2"])if(!record.previews?.[sz])throw Error("missing artwork preview");
 art=record;offers=snapshot;
 text("#detailTitle",record.title);
 text("#collectionBack",(pt?"Ver ambientes — ":"View rooms — ")+item.collection+" ↗");
 document.title=record.title+" — Lumen Arts";
 text("#physicalNote",record.previewKind==="extracted_from_editorial_photo_NOT_PRINT_MASTER"?labels.notMaster:labels.normal);
 finishSelect.replaceChildren();
 for(const value of offers.styles){const opt=document.createElement("option");opt.value=value;opt.textContent=value;finishSelect.append(opt)}
 finish=offers.styles.includes(query.get("finish"))?query.get("finish"):"Caixa";
 color=offers.colors?.includes(query.get("color"))?query.get("color"):"Preta";
 finishSelect.disabled=false;
 render();
 status.textContent=labels.ready;
}).catch(()=>{status.textContent=labels.unavailable;text("#detailTitle",labels.invalid);finishSelect.disabled=true});
})();