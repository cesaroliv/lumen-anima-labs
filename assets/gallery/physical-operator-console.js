(()=>{"use strict";
const api="https://lumen-digital-checkout.ccoliveira1.workers.dev";
const byId=id=>document.getElementById(id),element=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);return e};
let token="";
const money=c=>(c/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function err(message){byId("error").textContent=message||""}
async function request(path,options={}){
 if(!token)throw Error("Informe sua chave de acesso.");
 const res=await fetch(api+path,{...options,cache:"no-store",headers:{"x-lumen-physical-operator":token,...options.headers}});
 let body={};try{body=await res.json()}catch{}
 if(!res.ok)throw Error(res.status===401?"Chave incorreta.":res.status===503?"A operação interna ainda não está habilitada.":"Não foi possível consultar os pedidos.");
 return body;
}
function detail(parent,name,value){
 const p=element("p");const b=element("b",name+": ");p.append(b,document.createTextNode(String(value??"—")));parent.append(p);
}
async function markNote(id,textarea,review){
 const note=textarea.value.trim();
 if(note.length<3){err("Escreva uma observação com pelo menos 3 caracteres.");return;}
 try{
  await request("/api/physical/operator/orders/"+encodeURIComponent(id)+"/"+(review?"review":"note"),
  {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({note})});
  err("");await refresh();
 }catch(e){err(e.message)}
}
function orderCard(o){
 const section=element("article");section.className="order";
 const top=element("div");top.className="toolbar";
 const title=element("h3",o.artwork_title||"Obra");top.append(title);
 const badge=element("strong",money(o.total_price_cents));badge.style.marginLeft="auto";top.append(badge);section.append(top);
 const meta=element("div");meta.className="meta";
 for(const [name,value] of [["Pedido",o.id],["Status",o.order_state],["Formato",o.size_code],["Acabamento",o.finish_name],
 ["Moldura",o.frame_color],["SKU Printile",o.supplier_sku],["Cliente",o.customer_name],
 ["E-mail",o.customer_email],["Telefone",o.customer_phone],["CEP",o.postal_code],
 ["Confirmação MP",o.mp_payment_verified_at_ms?new Date(o.mp_payment_verified_at_ms).toLocaleString("pt-BR"):"Não confirmada"]]){
 const div=element("div");div.append(element("span",name),element("p",value||"—"));meta.append(div);
 }
 section.append(meta);
 if(o.address){const address=[o.address.street,o.address.number,o.address.complement,o.address.district,o.address.city,o.address.state].filter(Boolean).join(", ");
 detail(section,"Endereço de entrega",address);}
 const action=element("div");action.className="action";
 const label=element("label","Registro interno do pedido (não inicia produção)");const box=element("textarea");box.placeholder="Ex.: Arquivo conferido, atendimento realizado, pendente de aprovação...";
 const row=element("div");row.className="toolbar";row.style.marginTop="9px";
 const record=element("button","Salvar observação");record.type="button";record.addEventListener("click",()=>void markNote(o.id,box,false));row.append(record);
 if(o.order_state==="paid_awaiting_fulfillment"){
  const flag=element("button","Marcar para revisão manual");flag.className="secondary";flag.type="button";flag.addEventListener("click",()=>void markNote(o.id,box,true));row.append(flag);
 }
 action.append(label,box,row);section.append(action);return section;
}
async function refresh(){
 const list=byId("orders");list.replaceChildren();
 try{
  const filter=byId("state").value;
  const [orders,summary]=await Promise.all([
   request("/api/physical/operator/orders?state="+encodeURIComponent(filter)),
   request("/api/physical/operator/summary")]);
  const count=summary.states.reduce((n,x)=>n+x.count,0),waiting=summary.states.find(x=>x.order_state==="paid_awaiting_fulfillment")?.count||0;
  byId("summary").textContent=count+" pedidos cadastrados · "+waiting+" pagos aguardando produção";
  if(!orders.orders.length)list.append(element("p","Não há pedidos nessa situação."));
  else for(const o of orders.orders)list.append(orderCard(o));
 }catch(e){err(e.message);if(e.message.includes("Chave incorreta"))byId("workspace").classList.add("hidden");}
}
byId("connect").addEventListener("click",()=>{token=byId("operatorToken").value.trim();byId("operatorToken").value="";byId("workspace").classList.remove("hidden");err("");void refresh()});
byId("forget").addEventListener("click",()=>{token="";byId("operatorToken").value="";byId("workspace").classList.add("hidden");byId("orders").replaceChildren();err("");});
byId("refresh").addEventListener("click",()=>void refresh());
byId("state").addEventListener("change",()=>void refresh());
})();