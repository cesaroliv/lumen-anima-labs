(()=> {
  "use strict";

  const API_BASE=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
  const products={
    "obsidian-regalia":{name:"Obsidian Regalia — 22 PNGs Black & Gold",price:49.90},
    "luxury-wallpapers":{name:"Luxury White & Gold — 55 Wallpapers",price:24.90},
    "professional-office":{name:"Professional Office Symbols — High-Res",price:29.90}
  };

  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const money=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const backdrop=$("#checkoutBackdrop");
  const closeBtn=$("#checkoutClose");
  const notice=$("#checkoutActivationNotice");
  const message=$("#checkoutMessage");
  const statusArea=$("#statusArea");
  const deliveryArea=$("#deliveryArea");
  const deliveryLinks=$("#deliveryLinks");
  let cfg=null,mp=null,bricks=null,paymentController=null,statusController=null,current=null;

  function setMessage(text,type=""){
    message.textContent=text||"";
    message.className="status-box"+(type?" "+type:"")+(text?"":" hidden");
  }
  async function unmount(){
    try{if(paymentController)await paymentController.unmount();}catch{}
    try{if(statusController)await statusController.unmount();}catch{}
    paymentController=null;statusController=null;
    $("#paymentBrick_container").innerHTML="";
    $("#statusScreenBrick_container").innerHTML="";
  }
  async function close(){
    await unmount();
    backdrop.classList.remove("open");
    document.body.style.overflow="";
    current=null;
  }
  closeBtn.addEventListener("click",close);
  backdrop.addEventListener("click",e=>{if(e.target===backdrop)close();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&backdrop.classList.contains("open"))close();});

  async function loadConfig(){
    if(!API_BASE)throw new Error("checkout_not_configured");
    const r=await fetch(API_BASE+"/api/config",{headers:{accept:"application/json"}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.publicKey)throw new Error(data.error||"checkout_config_error");
    cfg=data;
    if(!mp){
      mp=new MercadoPago(cfg.publicKey,{locale:"pt-BR"});
      bricks=mp.bricks();
    }
    return cfg;
  }

  async function renderStatus(paymentId){
    statusArea.classList.remove("hidden");
    $("#paymentBrick_container").classList.add("hidden");
    statusController=await bricks.create("statusScreen","statusScreenBrick_container",{
      initialization:{paymentId:String(paymentId)},
      customization:{
        backUrls:{return:location.href,error:location.href},
        visual:{showExternalReference:true}
      },
      callbacks:{
        onReady:()=>pollDelivery(paymentId),
        onError:error=>console.error("Mercado Pago Status Screen",error)
      }
    });
  }

  async function pollDelivery(paymentId){
    let attempts=0;
    async function tick(){
      attempts++;
      try{
        const r=await fetch(API_BASE+"/api/payments/"+encodeURIComponent(paymentId),{headers:{accept:"application/json"}});
        const data=await r.json().catch(()=>({}));
        if(r.ok&&data.status==="approved"){
          if(Array.isArray(data.downloads)&&data.downloads.length){
            deliveryLinks.innerHTML=data.downloads.map(x=>'<a href="'+String(x.url).replace(/"/g,"&quot;")+'" rel="nofollow">'+String(x.label||"Baixar arquivo")+' ↓</a>').join("");
            deliveryArea.classList.remove("hidden");
          } else {
            setMessage("Pagamento aprovado. A entrega automática ainda está sendo conectada; guarde o ID "+paymentId+" para suporte.","good");
          }
          return;
        }
        if(["rejected","cancelled","refunded","charged_back"].includes(data.status))return;
      }catch{}
      if(attempts<60)setTimeout(tick,5000);
    }
    tick();
  }

  async function open(productId){
    current=products[productId];
    if(!current)return;
    backdrop.classList.add("open");
    document.body.style.overflow="hidden";
    $("#checkoutProductName").textContent=current.name;
    $("#checkoutProductPrice").textContent=money(current.price);
    statusArea.classList.add("hidden");deliveryArea.classList.add("hidden");
    $("#paymentBrick_container").classList.remove("hidden");
    setMessage("Carregando checkout seguro…");

    try{
      await loadConfig();
      setMessage("");
      await unmount();
      $("#paymentBrick_container").classList.remove("hidden");
      paymentController=await bricks.create("payment","paymentBrick_container",{
        initialization:{amount:current.price},
        customization:{
          paymentMethods:{
            bankTransfer:"all",
            creditCard:"all",
            debitCard:"all",
            ticket:"all",
            mercadoPago:"all"
          },
          visual:{style:{theme:"default"}}
        },
        callbacks:{
          onReady:()=>setMessage(""),
          onError:error=>{
            console.error("Mercado Pago Payment Brick",error);
            setMessage("Não foi possível carregar uma opção de pagamento. Tente novamente.","error");
          },
          onSubmit:({selectedPaymentMethod,formData})=>new Promise((resolve,reject)=>{
            const idem=(crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(16).slice(2);
            fetch(API_BASE+"/api/payments",{
              method:"POST",
              headers:{"content-type":"application/json","x-idempotency-key":idem},
              body:JSON.stringify({productId,selectedPaymentMethod,formData})
            }).then(async r=>{
              const data=await r.json().catch(()=>({}));
              if(!r.ok||!data.id)throw new Error(data.message||data.error||"payment_failed");
              resolve();
              await renderStatus(data.id);
            }).catch(err=>{
              setMessage("Pagamento não concluído: "+(err.message||"erro inesperado"),"error");
              reject(err);
            });
          })
        }
      });
    }catch(err){
      console.error(err);
      setMessage("O checkout ainda não está ativado nesta página. Nenhuma cobrança foi feita.","error");
    }
  }

  $$(".buy").forEach(b=>b.addEventListener("click",()=>open(b.dataset.product)));

  if(!API_BASE){
    notice.classList.remove("hidden");
    $$(".buy").forEach(b=>{b.disabled=true;b.textContent="Checkout em ativação";});
  } else {
    loadConfig().catch(()=>{
      notice.classList.remove("hidden");
      $$(".buy").forEach(b=>{b.disabled=true;b.textContent="Checkout temporariamente indisponível";});
    });
  }
})();