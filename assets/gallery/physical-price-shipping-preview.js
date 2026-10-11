(()=>{"use strict";
// Lumen Arts physical checkout price+freight PREVIEW ONLY. Never creates payments or supplier orders.
// The backend is OFF by default. If preview is disabled this script leaves the original checkout untouched.
const api=String(window.LUMEN_CHECKOUT_API||"https://lumen-digital-checkout.ccoliveira1.workers.dev").replace(/\/$/,"");
const params=new URLSearchParams(location.search);
const pt=params.get("lang")==="pt"||(!params.has("lang")&&(navigator.language||"").toLowerCase().startsWith("pt"));
const unframed=new Set(["Poster","Placa Decorativa"]);
const $=s=>document.querySelector(s);
const fmt=cents=>new Intl.NumberFormat(pt?"pt-BR":"en-US",{style:"currency",currency:"BRL"}).format(cents/100);
const label=pt?{
 cep:"CEP de entrega",enter:"00000-000",quote:"Calcular frete",progress:"Consultando o frete...",
 unavailable:"Frete indisponível para este CEP. Verifique o endereço e tente novamente.",
 quoteHint:"Estimativa da Printile. Pagamento ainda não liberado.",
 total:"Total estimado",expires:"Cotação válida até",pending:"Compra física ainda em preparação",
 invalid:"Digite um CEP de 8 números.",noOffer:"Preço em preparação"
}:{cep:"Delivery postal code",enter:"00000-000",quote:"Check shipping",progress:"Checking shipping...",
 unavailable:"Shipping is unavailable for this postal code. Please check it and retry.",
 quoteHint:"Printile estimate. Checkout payments not yet enabled.",
 total:"Estimated total",expires:"Quote valid until",pending:"Physical checkout is still being prepared",
 invalid:"Enter an eight-digit Brazilian postal code.",noOffer:"Pricing in preparation"};
const state={sceneId:null,ready:false,salesOpen:false,selectionKey:"",pendingKey:"",offer:null,box:null,amount:null,output:null,cep:null,calc:null,seq:0};
const current=()=>{
 const size=$('[data-size][aria-pressed="true"]')?.dataset.size||"";
 const finish=$("#physicalFinish")?.value||"";
 const color=unframed.has(finish)?"":$('[data-color][aria-pressed="true"]')?.dataset.color||"";
 if(!["A4","A3","A2"].includes(size)||!finish||(!color&&!unframed.has(finish)))return null;
 return {sceneId:state.sceneId,size,finish,color};
};
const key=x=>x?[x.sceneId,x.size,x.finish,x.color].join("|"):"";
function refreshBuyState(){
 const buy=$("#physicalBuy"),selection=current();
 const allowed=!!(buy&&selection&&state.salesOpen&&state.offer&&state.selectionKey===key(selection)&&state.sceneId!=="arte-juridica-01");
 if(!buy)return;
 buy.disabled=!allowed;buy.onclick=null;
 if(allowed){
  buy.textContent=pt?"Comprar quadro":"Buy printed artwork";
  buy.onclick=()=>{
   const now=current();
   if(!state.salesOpen||!now||state.selectionKey!==key(now))return;
   const link=new URL("/checkout-fisico.html",location.origin);
   for(const [k,v] of Object.entries({...now,id:now.sceneId})){
    if(k!=="sceneId")link.searchParams.set(k,v);
   }
   location.assign(link.toString());
  };
 }
}
async function refreshSalesStatus(){
 try{
  const response=await fetch(api+"/api/physical/sales-status",{cache:"no-store"});
  if(response.ok)state.salesOpen=(await response.json())?.salesOpen===true;
 }catch{state.salesOpen=false;}
 refreshBuyState();
}
function makeBox(){
 if(state.box)return;
 const parent=$("#physicalBuy")?.parentElement;
 if(!parent||!$("#summaryPrice"))return;
 const style=document.createElement("style");
 style.textContent=".lumen-physical-quote{margin:18px 0 12px;padding:17px;border:1px solid #d6d1c8;border-radius:12px;background:rgba(255,255,255,.65)}.lumen-physical-quote label{display:block;font-weight:600;font-size:13px;margin-bottom:8px}.lumen-shipping-controls{display:flex;gap:8px}.lumen-shipping-controls input{font:inherit;border:1px solid #bdb7ae;padding:10px 12px;min-width:0;flex:1;border-radius:7px;background:#fff;color:#211f1b}.lumen-shipping-controls button{font:inherit;cursor:pointer;background:#25221d;color:white;border:0;padding:10px 13px;border-radius:7px}.lumen-shipping-controls button:disabled{opacity:.55;cursor:progress}.lumen-shipping-results{margin:10px 0 0;font-size:13px;line-height:1.55}.lumen-shipping-results p{margin:6px 0}.lumen-shipping-results ul{padding-left:18px;margin:7px 0}.lumen-shipping-results strong{font-weight:700}";
 document.head.append(style);
 const box=document.createElement("section");box.className="lumen-physical-quote";box.setAttribute("aria-label",pt?"Cotação de frete":"Shipping quote");
 const lbl=document.createElement("label");lbl.htmlFor="lumen-postcode";lbl.textContent=label.cep;
 const controls=document.createElement("div");controls.className="lumen-shipping-controls";
 const field=document.createElement("input");field.id="lumen-postcode";field.type="text";field.inputMode="numeric";field.autocomplete="postal-code";field.placeholder=label.enter;field.maxLength=9;
 const btn=document.createElement("button");btn.type="button";btn.textContent=label.quote;
 const output=document.createElement("div");output.className="lumen-shipping-results";output.setAttribute("role","status");output.setAttribute("aria-live","polite");
 controls.append(field,btn);box.append(lbl,controls,output);
 parent.insertBefore(box,$("#physicalBuy"));
 state.box=box;state.cep=field;state.calc=btn;state.output=output;
 btn.addEventListener("click",()=>void estimate());
 field.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();void estimate();}});
}
async function updatePrice(){
 const choice=current();if(!choice)return;
 const signature=key(choice);
 if(signature===state.pendingKey||signature===state.selectionKey)return;
 state.seq++;const seq=state.seq;state.pendingKey=signature;state.offer=null;refreshBuyState();
 const url=new URL(api+"/api/physical/offer");
 for(const [k,v] of Object.entries(choice))url.searchParams.set(k,v);
 try{
  const r=await fetch(url,{method:"GET",headers:{accept:"application/json"},cache:"no-store"});
  if(seq!==state.seq)return;
  if(!r.ok){state.pendingKey="";return;}
  const json=await r.json();if(!Number.isInteger(json?.offer?.artworkPriceCents)||json.offer.sceneId!==choice.sceneId)return;
  state.offer=json.offer;state.selectionKey=signature;state.pendingKey="";
  $("#summaryPrice").textContent=fmt(json.offer.artworkPriceCents);
  makeBox();if(state.output)state.output.replaceChildren();
  refreshBuyState();
 }catch{if(seq===state.seq)state.pendingKey="";}
}
async function estimate(){
 const selection=current();
 if(!selection||!state.offer||key(selection)!==state.selectionKey){state.output.textContent=label.noOffer;return;}
 const cep=String(state.cep.value||"").replace(/\D/g,"");
 if(cep.length!==8){state.output.textContent=label.invalid;return;}
 state.calc.disabled=true;state.output.textContent=label.progress;
 const previousKey=state.selectionKey;
 try{
  const r=await fetch(api+"/api/physical/shipping/quote",{
   method:"POST",headers:{"content-type":"application/json",accept:"application/json"},
   cache:"no-store",body:JSON.stringify({...selection,cep})});
  if(!r.ok)throw Error("quote not available");
  const obj=await r.json();
  if(previousKey!==state.selectionKey)return;
  if(!Array.isArray(obj?.shipping)||obj.shipping.length===0||obj.offer?.artworkPriceCents!==state.offer.artworkPriceCents)throw Error("invalid quote");
  state.output.replaceChildren();
  const list=document.createElement("ul");
  for(const q of obj.shipping){
   const li=document.createElement("li");
   li.textContent=[q.carrier,q.service,fmt(q.costCents),"-",label.total+":",fmt(q.totalCents)].join(" ");
   list.append(li);
  }
  const foot=document.createElement("p");foot.textContent=label.quoteHint;
  state.output.append(list,foot);
  if(obj.expiresAt){const expiry=document.createElement("p");expiry.textContent=label.expires+": "+new Date(obj.expiresAt).toLocaleTimeString(pt?"pt-BR":"en-US",{hour:"2-digit",minute:"2-digit"});state.output.append(expiry);}
 }catch{if(previousKey===state.selectionKey)state.output.textContent=label.unavailable;}
 finally{state.calc.disabled=false;}
}
async function boot(){
 const p=new URLSearchParams(location.search),id=p.get("id")||"";
 if(id==="arte-juridica-01")return; // explicit permanent buy-button blocker
 if(/^(obsidian|arte-black|gesso-ouro|arte-juridica)-\d{2}$/.test(id))state.sceneId=id;
 else {
  const artworkPath=location.pathname.match(/^\/artworks\/([a-z0-9-]+)\.html$/);
  if(!artworkPath)return;
  try{
   const response=await fetch("/assets/gallery/checkout-manifest.json",{cache:"no-store"});
   if(!response.ok)return;
   const data=await response.json();
   const sku="art-"+artworkPath[1];
   const matches=(data.items||[]).filter(x=>x.sku===sku);
   if(matches.length!==1)return;state.sceneId=matches[0].id;
  }catch{return;}
 }
 const price=$("#summaryPrice"),buy=$("#physicalBuy"),finish=$("#physicalFinish");
 if(!state.sceneId||!price||!buy||!finish)return;
 // Backend readiness gate keeps purchases OFF until commercial, fiscal and fulfillment checks pass.
 buy.disabled=true;state.ready=true;
 void refreshSalesStatus();
 let scheduled=false;
 const schedule=()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;void updatePrice()},35)};
 for(const btn of document.querySelectorAll("[data-size],[data-color]")){
  new MutationObserver(schedule).observe(btn,{attributes:true,attributeFilter:["aria-pressed"]});
  btn.addEventListener("click",schedule);
 }
 new MutationObserver(schedule).observe(finish,{childList:true,attributes:true,attributeFilter:["disabled"]});
 finish.addEventListener("change",schedule);
 schedule();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void boot(),{once:true});
else void boot();
})();