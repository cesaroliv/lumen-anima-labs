(()=> {
  "use strict";
  const API=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
  const $=s=>document.querySelector(s);
  const paymentId=new URLSearchParams(location.search).get("payment_id")||"";
  const money=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const visuals={
    "obsidian-regalia":"/assets/digital-art/v2/bundle-obsidian.webp",
    "luxury-wallpapers":"/assets/digital-art/v2/mockup-wallpapers-grid.webp",
    "professional-office":"/assets/digital-art/v2/mockup-professional-law.webp"
  };
  const allProducts=[
    {id:"obsidian-regalia",name:"Obsidian Regalia",desc:"22 PNGs preto e dourado",img:"/assets/digital-art/v2/mockup-obsidian-shirt.webp"},
    {id:"luxury-wallpapers",name:"Luxury White & Gold",desc:"55 wallpapers",img:"/assets/digital-art/v2/mockup-wallpapers-desk.webp"},
    {id:"professional-office",name:"Professional Office Symbols",desc:"Justiça & Medicina",img:"/assets/digital-art/v2/mockup-professional-medical.webp"}
  ];

  function show(id){$(id)?.classList.remove("hidden")}
  function hide(id){$(id)?.classList.add("hidden")}
  function sizeLabel(bytes){
    const mb=Number(bytes||0)/1048576;
    return mb>=1?mb.toFixed(mb>=100?0:1)+" MB":Math.max(1,Math.round(Number(bytes||0)/1024))+" KB";
  }
  function renderCross(productId){
    const rows=allProducts.filter(p=>p.id!==productId);
    $("#crossSellGrid").innerHTML=rows.map(p=>'<a href="/digital-art.html#colecoes"><img src="'+p.img+'" alt=""><div><strong>'+p.name+'</strong><p>'+p.desc+'</p><span>Ver coleção →</span></div></a>').join("");
    show("#crossSell");
  }
  async function load(){
    if(!paymentId||!/^\d+$/.test(paymentId)){hide("#loadingCard");show("#errorCard");$("#errorText").textContent="Identificador de pagamento ausente ou inválido.";return;}
    if(!API){hide("#loadingCard");show("#errorCard");$("#errorText").textContent="A entrega está temporariamente indisponível.";return;}
    try{
      const r=await fetch(API+"/api/payments/"+encodeURIComponent(paymentId),{headers:{accept:"application/json"}});
      const data=await r.json().catch(()=>({}));
      hide("#loadingCard");
      if(!r.ok){show("#errorCard");$("#errorText").textContent="Não foi possível consultar este pagamento.";return;}
      if(data.status==="approved"&&data.product){
        $("#productName").textContent=data.product.name||"Produto digital";
        $("#amount").textContent=money(data.amount||data.product.price||0);
        $("#orderId").textContent=data.order_id||"—";
        $("#paymentId").textContent=String(data.id||paymentId);
        $("#productVisual").src=visuals[data.product.id]||visuals["obsidian-regalia"];
        const bundles=Array.isArray(data.bundles)?data.bundles:[];
        if(!bundles.length){show("#errorCard");$("#errorText").textContent="Pagamento aprovado, mas o pacote ainda não foi montado. Informe o pagamento "+paymentId+" ao suporte.";return;}
        $("#downloadButtons").innerHTML=bundles.map((b,i)=>'<a class="download" href="'+String(b.url).replace(/"/g,"&quot;")+'" rel="nofollow"><div><b>'+(b.label||("Pacote "+(i+1)))+'</b><span>'+sizeLabel(b.size)+' · ZIP protegido</span></div><span class="arrow">↓</span></a>').join("");
        show("#orderCard");renderCross(data.product.id);return;
      }
      if(["pending","in_process","authorized"].includes(data.status)){
        show("#pendingCard");setTimeout(load,3500);return;
      }
      show("#errorCard");$("#errorText").textContent="O pagamento está com status “"+String(data.status||"não aprovado")+"”. O download só é liberado após aprovação.";
    }catch(e){
      hide("#loadingCard");show("#errorCard");$("#errorText").textContent="Falha ao consultar o pedido. Tente recarregar a página ou use o suporte.";
    }
  }
  load();
})();