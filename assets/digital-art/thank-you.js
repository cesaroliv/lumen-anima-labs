(()=> {
  "use strict";
  const API=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  const paymentId=params.get("payment_id")||"";
  const hashParams=new URLSearchParams((location.hash||"").replace(/^#/,""));
  let orderAccess=String(hashParams.get("order_access")||"");
  if(!/^[a-f0-9]{64}$/.test(orderAccess)){try{orderAccess=sessionStorage.getItem("lumen-order-access:"+paymentId)||"";}catch{}}
  if(!/^[a-f0-9]{64}$/.test(orderAccess))orderAccess="";
  if(location.hash.includes("order_access="))history.replaceState(null,"",location.pathname+location.search);
  const lang=["en","es"].includes(params.get("lang"))?params.get("lang"):"pt";
  const locale=lang==="en"?"en-US":lang==="es"?"es-ES":"pt-BR";
  document.documentElement.lang=lang==="pt"?"pt-BR":lang;

  const T={
    pt:{
      title:"Seu pedido Obsidian Regalia — Lumen Arts",store:"Loja",support:"Suporte",
      confirmed:"Pagamento confirmado",thanks:"Obrigado pela sua compra.",
      success:"Seu pedido foi aprovado e seus arquivos já estão prontos. Organizamos a entrega em pacotes para você baixar sem aquela lista interminável de arquivos soltos.",
      loading:"Preparando seu pedido…",loadingP:"Estamos confirmando o pagamento com o Mercado Pago e gerando seus links protegidos.",
      order:"Seu pedido",meta:["Produto","Valor","Pedido","Pagamento"],released:"Download liberado.",releasedP:"Os links abaixo são validados pelo pagamento aprovado.",
      downloads:"Baixe seus arquivos",downloadNote:"Pacotes grandes podem levar alguns minutos para começar ou concluir o download, dependendo da sua conexão. Não feche a aba até o navegador iniciar o arquivo.",
      pending:"Pagamento em processamento",pendingP:"O Mercado Pago ainda não marcou esta compra como aprovada. Esta página verifica novamente de forma automática.",
      error:"Não conseguimos liberar o download",errorDefault:"Verifique o pedido ou fale com o suporte.",openSupport:"Abrir suporte",
      keep:"Guarde esta página",helpHead:"Se precisar de ajuda, o pedido identifica sua compra.",
      help1:"Problema no download?",help1p:"Abra o suporte e informe o número do pagamento ou do pedido exibido acima.",help1a:"Ir para suporte →",
      help2:"Licença dentro do pacote",help2p:"O ZIP inclui README e licença. Consulte antes de usar a arte comercialmente.",help2a:"Entender a coleção →",
      footer:"Arte digital Black & Gold — by Lumen Anima.",privacy:"Privacidade",terms:"Termos",
      missing:"Identificador de pagamento ausente ou inválido.",temp:"A entrega está temporariamente indisponível.",queryFail:"Não foi possível consultar este pagamento.",
      digital:"Obsidian Regalia — 30 obras Black & Gold",approvedNoBundle:"Pagamento aprovado, mas o pacote ainda não foi montado. Informe o pagamento ",notApproved:'O pagamento está com status “{status}”. O download só é liberado após aprovação.',loadFail:"Falha ao consultar o pedido. Tente recarregar a página ou use o suporte.",
      package:"Pacote",protected:"ZIP protegido"
    },
    en:{
      title:"Your Obsidian Regalia order — Lumen Arts",store:"Store",support:"Support",
      confirmed:"Payment confirmed",thanks:"Thank you for your purchase.",
      success:"Your order has been approved and your files are ready. We organized the delivery into packages so you can download them without dealing with an endless list of loose files.",
      loading:"Preparing your order…",loadingP:"We are confirming the payment with Mercado Pago and generating your protected download links.",
      order:"Your order",meta:["Product","Amount","Order","Payment"],released:"Download unlocked.",releasedP:"The links below are validated against the approved payment.",
      downloads:"Download your files",downloadNote:"Large packages may take a few minutes to start or finish downloading depending on your connection. Keep this tab open until your browser starts the file.",
      pending:"Payment processing",pendingP:"Mercado Pago has not marked this purchase as approved yet. This page checks again automatically.",
      error:"We couldn't unlock the download",errorDefault:"Check the order or contact support.",openSupport:"Open support",
      keep:"Keep this page",helpHead:"If you need help, the order identifies your purchase.",
      help1:"Download problem?",help1p:"Open support and include the payment or order number shown above.",help1a:"Go to support →",
      help2:"License inside the package",help2p:"The ZIP includes the README and license. Review them before using the artwork commercially.",help2a:"Understand the collection →",
      footer:"Black & Gold digital art — by Lumen Anima.",privacy:"Privacy",terms:"Terms",
      missing:"Missing or invalid payment identifier.",temp:"Delivery is temporarily unavailable.",queryFail:"We couldn't retrieve this payment.",
      digital:"Obsidian Regalia — 30 Black & Gold artworks",approvedNoBundle:"Payment approved, but the package is not ready yet. Send payment ",notApproved:'The payment status is “{status}”. Downloads are released only after approval.',loadFail:"We couldn't retrieve the order. Reload this page or contact support.",
      package:"Package",protected:"Protected ZIP"
    },
    es:{
      title:"Tu pedido Obsidian Regalia — Lumen Arts",store:"Tienda",support:"Soporte",
      confirmed:"Pago confirmado",thanks:"Gracias por tu compra.",
      success:"Tu pedido fue aprobado y tus archivos ya están listos. Organizamos la entrega en paquetes para que puedas descargarlos sin enfrentarte a una lista interminable de archivos sueltos.",
      loading:"Preparando tu pedido…",loadingP:"Estamos confirmando el pago con Mercado Pago y generando tus enlaces de descarga protegidos.",
      order:"Tu pedido",meta:["Producto","Valor","Pedido","Pago"],released:"Descarga liberada.",releasedP:"Los enlaces de abajo están validados por el pago aprobado.",
      downloads:"Descarga tus archivos",downloadNote:"Los paquetes grandes pueden tardar unos minutos en empezar o terminar la descarga según tu conexión. Mantén esta pestaña abierta hasta que el navegador inicie el archivo.",
      pending:"Pago en proceso",pendingP:"Mercado Pago todavía no marcó esta compra como aprobada. Esta página vuelve a comprobarlo automáticamente.",
      error:"No pudimos liberar la descarga",errorDefault:"Verifica el pedido o contacta con soporte.",openSupport:"Abrir soporte",
      keep:"Guarda esta página",helpHead:"Si necesitas ayuda, el pedido identifica tu compra.",
      help1:"¿Problema con la descarga?",help1p:"Abre soporte e informa el número de pago o pedido mostrado arriba.",help1a:"Ir a soporte →",
      help2:"Licencia dentro del paquete",help2p:"El ZIP incluye README y licencia. Revísalos antes de usar el arte comercialmente.",help2a:"Entender la colección →",
      footer:"Arte digital Black & Gold — by Lumen Anima.",privacy:"Privacidad",terms:"Términos",
      missing:"Identificador de pago ausente o inválido.",temp:"La entrega está temporalmente no disponible.",queryFail:"No pudimos consultar este pago.",
      digital:"Obsidian Regalia — 30 obras Black & Gold",approvedNoBundle:"Pago aprobado, pero el paquete todavía no está listo. Informa el pago ",notApproved:'El pago tiene estado “{status}”. La descarga solo se libera después de la aprobación.',loadFail:"No pudimos consultar el pedido. Recarga la página o utiliza soporte.",
      package:"Paquete",protected:"ZIP protegido"
    }
  }[lang];

  document.title=T.title;
  const nav=[...document.querySelectorAll(".site-header nav a")];if(nav[0])nav[0].textContent=T.store;if(nav[1])nav[1].textContent=T.support;
  const success=document.querySelector(".success");
  if(success){
    const ey=success.querySelector(".eyebrow"),h=success.querySelector("h1"),p=success.querySelector("h1+p");
    if(ey)ey.textContent=T.confirmed;if(h)h.textContent=T.thanks;if(p)p.textContent=T.success;
  }
  const loading=$("#loadingCard");if(loading){loading.querySelector("strong").textContent=T.loading;loading.querySelector("p").textContent=T.loadingP}
  const order=$("#orderCard");if(order){
    order.querySelector("h2").textContent=T.order;
    [...order.querySelectorAll(".meta span")].forEach((e,i)=>e.textContent=T.meta[i]||e.textContent);
    const note=$("#approvedNote");if(note)note.innerHTML="<strong>"+T.released+"</strong> "+T.releasedP;
    const hs=order.querySelectorAll("h2");if(hs[1])hs[1].textContent=T.downloads;
    const sm=order.querySelector("p.small");if(sm)sm.textContent=T.downloadNote;
  }
  const pending=$("#pendingCard");if(pending){pending.querySelector("h2").textContent=T.pending;pending.querySelector(".notice").textContent=T.pendingP}
  const err=$("#errorCard");if(err){err.querySelector("h2").textContent=T.error;$("#errorText").textContent=T.errorDefault;err.querySelector(".btn").textContent=T.openSupport}
  const help=document.querySelector(".help")?.parentElement;
  if(help){
    const eye=help.querySelector(".eyebrow"),head=help.querySelector("h2"),arts=help.querySelectorAll(".help article");
    if(eye)eye.textContent=T.keep;if(head)head.textContent=T.helpHead;
    if(arts[0]){arts[0].querySelector("h3").textContent=T.help1;arts[0].querySelector("p").textContent=T.help1p;arts[0].querySelector("a").textContent=T.help1a}
    if(arts[1]){arts[1].querySelector("h3").textContent=T.help2;arts[1].querySelector("p").textContent=T.help2p;arts[1].querySelector("a").textContent=T.help2a}
  }
  const footer=document.querySelector(".footer-main p");if(footer)footer.textContent=T.footer;
  const fnav=[...document.querySelectorAll(".footer-bottom nav a")];if(fnav[0])fnav[0].textContent=T.support;if(fnav[1])fnav[1].textContent=T.privacy;if(fnav[2])fnav[2].textContent=T.terms;
  const storePath=lang==="en"?"/en/digital-art.html":lang==="es"?"/es/digital-art.html":"/digital-art.html";
  if(nav[0])nav[0].href=storePath;
  const helpLink=document.querySelector(".help article:nth-child(2) a");if(helpLink)helpLink.href=storePath+"#oferta";

  const money=n=>Number(n).toLocaleString(locale,{style:"currency",currency:"BRL"});
  const visuals={
    "obsidian-regalia":"/assets/digital-art/v5/artworks/imperial-lion.webp",
    "luxury-wallpapers":"/assets/digital-art/v2/mockup-wallpapers-grid.webp",
    "professional-office":"/assets/digital-art/v2/mockup-professional-law.webp"
  };

  function show(id){$(id)?.classList.remove("hidden")}
  function hide(id){$(id)?.classList.add("hidden")}
  function sizeLabel(bytes){
    const mb=Number(bytes||0)/1048576;
    return mb>=1?mb.toFixed(mb>=100?0:1)+" MB":Math.max(1,Math.round(Number(bytes||0)/1024))+" KB";
  }
  function renderCross(){ hide("#crossSell"); }
  async function load(){
    if(!paymentId||!/^\d+$/.test(paymentId)){hide("#loadingCard");show("#errorCard");$("#errorText").textContent=T.missing;return;}
    if(!API){hide("#loadingCard");show("#errorCard");$("#errorText").textContent=T.temp;return;}
    try{
      const headers={accept:"application/json"};if(orderAccess)headers["x-order-access"]=orderAccess;
      const r=await fetch(API+"/api/payments/"+encodeURIComponent(paymentId),{headers});
      const data=await r.json().catch(()=>({}));
      hide("#loadingCard");
      if(!r.ok){show("#errorCard");$("#errorText").textContent=T.queryFail;return;}
      if(data.status==="approved"&&data.product){
        $("#productName").textContent=data.product.id==="obsidian-regalia"?T.digital:(data.product.name||"Digital product");
        $("#amount").textContent=money(data.amount||data.product.price||0);
        $("#orderId").textContent=data.order_id||"—";
        $("#paymentId").textContent=String(data.id||paymentId);
        $("#productVisual").src=visuals[data.product.id]||visuals["obsidian-regalia"];
        const bundles=Array.isArray(data.bundles)?data.bundles:[];
        if(!bundles.length){show("#errorCard");$("#errorText").textContent=T.approvedNoBundle+paymentId+(lang==="en"?" to support.":lang==="es"?" a soporte.":" ao suporte.");return;}
        $("#downloadButtons").innerHTML=bundles.map((b,i)=>'<a class="download" href="'+String(b.url).replace(/"/g,"&quot;")+'" rel="nofollow"><div><b>'+T.package+" "+(i+1)+'</b><span>'+sizeLabel(b.size)+" · "+T.protected+'</span></div><span class="arrow">↓</span></a>').join("");
        show("#successHero");show("#orderCard");renderCross(data.product.id);return;
      }
      if(["pending","in_process","authorized"].includes(data.status)){
        show("#pendingCard");setTimeout(load,3500);return;
      }
      show("#errorCard");$("#errorText").textContent=T.notApproved.replace("{status}",String(data.status||"not approved"));
    }catch(e){
      hide("#loadingCard");show("#errorCard");$("#errorText").textContent=T.loadFail;
    }
  }
  load();
})();