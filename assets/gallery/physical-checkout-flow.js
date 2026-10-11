(()=>{"use strict";
// Physical checkout UI is staged only. Production sales are always gated by server readiness.
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
const API=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
const p=new URLSearchParams(location.search),sceneId=p.get("id")||p.get("sceneId")||"",artworkId=p.get("artworkId")||"";
const state={salesOpen:false,offer:null,shipment:null,quotes:[],requestId:null,seq:0,pricingVersion:""};
const unframed=new Set(["Poster","Placa Decorativa"]);
const feedback=(msg)=>{$("feedback").textContent=msg||"";};
const identifier=()=>sceneId?{sceneId}:{artworkId};
function validIdentity(){return (sceneId&&/^(?:obsidian|arte-black|gesso-ouro|arte-juridica)-\d{2}$/.test(sceneId)&&!artworkId)||
 (!sceneId&&/^art-[a-z0-9-]{2,90}$/.test(artworkId));}
const choice=()=>({...identifier(),size:$("size").value,finish:$("finish").value,
 color:unframed.has($("finish").value)?"":$("color").value});
function updateAction(){
 const ready=state.salesOpen&&!!state.offer&&!!state.shipment;
 $("customerDetails").disabled=!ready;
 $("pay").disabled=!ready;
 if(!state.salesOpen)$("availabilityNotice").textContent="Encomendas físicas ainda em preparação. Não há cobranças ativas nesta página.";
 else if(!state.shipment)$("availabilityNotice").textContent="Selecione um frete para conferir o valor antes de pagar.";
 else $("availabilityNotice").textContent="Confira os seus dados e o total. O pagamento será finalizado no Mercado Pago.";
}
function clearShipment(){
 state.shipment=null;state.quotes=[];
 $("shippingPrice").textContent="A calcular";
 $("totalPrice").textContent="—";
 $("shippingMethods").replaceChildren();
 const h=document.createElement("p");h.className="hint";h.textContent="Informe o CEP para consultar frete e prazo da Printile.";
 $("shippingMethods").append(h);
 updateAction();
}
async function updateOffer(){
 const seq=++state.seq;const selected=choice();state.offer=null;clearShipment();feedback("");
 const url=new URL(API+"/api/physical/offer");
 for(const [k,v] of Object.entries(selected))url.searchParams.set(k,v);
 try{
  const r=await fetch(url,{method:"GET",cache:"no-store"});
  const body=await r.json();
  if(seq!==state.seq)return;
  if(!r.ok||!Number.isSafeInteger(body.offer?.artworkPriceCents))throw Error("Oferta temporariamente indisponível");
  state.offer=body.offer;
  $("artworkTitle").textContent=body.offer.title;
  $("productDetails").textContent=[selected.size,selected.finish,selected.color].filter(Boolean).join(" · ");
  $("artworkPrice").textContent=money(body.offer.artworkPriceCents);
  feedback("");
 }catch(e){
  if(seq!==state.seq)return;
  $("artworkPrice").textContent="Indisponível";
  feedback(e?.message||"Não foi possível confirmar o preço da obra.");
 }
 updateAction();
}
async function quote(){
 if(!state.offer){feedback("Escolha uma obra disponível antes de calcular o frete.");return;}
 const cep=$("cep").value.replace(/\D/g,"");
 if(!/^\d{8}$/.test(cep)){feedback("Informe um CEP válido de 8 números.");return;}
 $("calculateShipping").disabled=true;state.shipment=null;clearShipment();feedback("Consultando o frete...");
 const selected=choice();const seq=state.seq;
 try{
  const r=await fetch(API+"/api/physical/shipping/quote",{
   method:"POST",headers:{"content-type":"application/json"},cache:"no-store",
   body:JSON.stringify({...selected,cep})});
  const body=await r.json();
  if(!r.ok||!Array.isArray(body.shipping)||body.shipping.length===0)throw Error("Não foi possível consultar esse CEP.");
  if(seq!==state.seq)return;
  state.quotes=body.shipping.filter(x=>Number.isSafeInteger(x.costCents)&&x.costCents>=0&&Number.isSafeInteger(x.totalCents)&&x.totalCents===state.offer.artworkPriceCents+x.costCents&&typeof x.carrier==="string"&&typeof x.service==="string");
  if(state.quotes.length===0)throw Error("Cotação de frete inválida.");
  $("shippingMethods").replaceChildren();
  const title=document.createElement("p");title.className="hint";title.textContent="Selecione a entrega desejada:";$("shippingMethods").append(title);
  state.quotes.forEach((q,i)=>{
   const label=document.createElement("label");const radio=document.createElement("input");radio.name="shipping";radio.type="radio";radio.value=String(i);
   radio.addEventListener("change",()=>{
    state.shipment=q;
    $("shippingPrice").textContent=money(q.costCents);
    $("totalPrice").textContent=money(q.totalCents);
    updateAction();
   });
   const description=document.createElement("span");description.textContent=[q.carrier,q.service,q.deadlineDays+" dias estimados"].join(" · ");
   const price=document.createElement("strong");price.textContent=money(q.costCents);
   label.append(radio,description,price);$("shippingMethods").append(label);
  });
  feedback(state.salesOpen?"Selecione o frete para continuar.":"Cotação de referência. Pagamentos ainda indisponíveis.");
 }catch(e){if(seq===state.seq)feedback(e?.message||"Não foi possível calcular o frete.")}
 finally{$("calculateShipping").disabled=false;updateAction();}
}
const value=id=>$(id).value.trim();
async function pay(e){
 e.preventDefault();
 if(!state.salesOpen||!state.shipment||!state.offer){feedback("Finalização ainda indisponível.");return;}
 if(!$("checkoutForm").reportValidity())return;
 $("pay").disabled=true;feedback("Conferindo preço, frete e iniciando o pagamento...");
 state.requestId??=crypto.randomUUID();
 const shipping=state.shipment;
 const body={...choice(),cep:value("cep"),shippingCarrier:shipping.carrier,shippingService:shipping.service,expectedTotalCents:shipping.totalCents,
  buyer:{name:value("buyerName"),email:value("buyerEmail"),phone:value("buyerPhone"),document:value("buyerDocument")},
  address:{street:value("street"),number:value("number"),complement:value("complement"),district:value("district"),city:value("city"),state:value("state")}};
 try{
  const res=await fetch(API+"/api/physical/checkout/start",{method:"POST",headers:{"content-type":"application/json","x-idempotency-key":state.requestId},cache:"no-store",body:JSON.stringify(body)});
  const data=await res.json();
  if(res.status===409&&data.error==="TOTAL_CHANGED"){
   state.requestId=null;clearShipment();feedback("O valor do frete mudou. Calcule novamente e confirme o novo total antes de pagar.");return;
  }
  if(!res.ok||!data.checkoutUrl||!Number.isSafeInteger(data.totalCents)||data.totalCents!==shipping.totalCents){
   throw Error("Ainda não foi possível iniciar o pagamento. Seu pedido não foi confirmado.");
  }
  const dest=new URL(data.checkoutUrl);
  if(dest.protocol!=="https:"||!["www.mercadopago.com.br","www.mercadopago.com","mercadopago.com.br","mercadopago.com"].includes(dest.hostname))throw Error("Endereço de pagamento inválido.");
  location.assign(dest.toString());
 }catch(e){feedback(e?.message||"Ocorreu um erro ao preparar o checkout.");}
 finally{updateAction();}
}
async function loadPreview(){
 if(!sceneId)return;
 try{
  const r=await fetch("/assets/gallery/checkout-manifest.json");
  if(!r.ok)return;
  const j=await r.json();
  const o=(j.items||[]).find(v=>v.id===sceneId);
  if(typeof o?.preview==="string"&&/^\/assets\/gallery\/[a-zA-Z0-9_./-]+\.webp$/.test(o.preview)){
   $("preview").src=o.preview;$("preview").classList.remove("hidden");
  }
 }catch{}
}
async function init(){
 if(["A4","A3","A2"].includes(p.get("size")))$("size").value=p.get("size");
 for(const attr of ["finish","color"]){const selected=p.get(attr)||"";if([...$(attr).options].some(opt=>opt.value===selected))$(attr).value=selected;}
 $("colorGroup").classList.toggle("hidden",unframed.has($("finish").value));
 $("finish").addEventListener("change",()=>{$("colorGroup").classList.toggle("hidden",unframed.has($("finish").value));void updateOffer()});
 for(const name of ["size","color"])$(name).addEventListener("change",()=>void updateOffer());
 $("calculateShipping").addEventListener("click",()=>void quote());
 $("checkoutForm").addEventListener("submit",e=>void pay(e));
 updateAction();
 if(!API||!validIdentity()||sceneId==="arte-juridica-01"){
  feedback("A obra selecionada está indisponível para venda física.");return;
 }
 void loadPreview();
 try{
  const r=await fetch(API+"/api/physical/sales-status",{cache:"no-store"});
  if(r.ok){const data=await r.json();state.salesOpen=data.salesOpen===true;}
 }catch{}
 await updateOffer();
 updateAction();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();