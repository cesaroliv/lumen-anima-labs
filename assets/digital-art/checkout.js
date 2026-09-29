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
  const message=$("#checkoutMessage");
  const statusArea=$("#statusArea");
  let cfg=null,mp=null,bricks=null,paymentController=null,statusController=null,current=null,currentId="";

  function setMessage(text,type=""){
    if(!message)return;
    message.textContent=text||"";
    message.className="status-box"+(type?" "+type:"")+(text?"":" hidden");
  }
  async function unmount(){
    try{if(paymentController)await paymentController.unmount();}catch{}
    try{if(statusController)await statusController.unmount();}catch{}
    paymentController=null;statusController=null;
    const p=$("#paymentBrick_container"),s=$("#statusScreenBrick_container");
    if(p)p.innerHTML=""; if(s)s.innerHTML="";
  }
  async function close(){
    await unmount();
    backdrop?.classList.remove("open");
    document.body.style.overflow="";
    current=null;currentId="";
  }
  closeBtn?.addEventListener("click",close);
  backdrop?.addEventListener("click",e=>{if(e.target===backdrop)close();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&backdrop?.classList.contains("open"))close();});

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

  function thankYouUrl(paymentId){
    return "/digital-art-thank-you.html?payment_id="+encodeURIComponent(paymentId);
  }

  async function pollApproval(paymentId){
    let attempts=0;
    async function tick(){
      attempts++;
      try{
        const r=await fetch(API_BASE+"/api/payments/"+encodeURIComponent(paymentId),{headers:{accept:"application/json"}});
        const data=await r.json().catch(()=>({}));
        if(r.ok&&data.status==="approved"){
          setMessage("Pagamento aprovado. Preparando sua página de download…","good");
          setTimeout(()=>location.assign(thankYouUrl(paymentId)),700);
          return;
        }
        if(["rejected","cancelled","refunded","charged_back"].includes(data.status))return;
      }catch{}
      if(attempts<90)setTimeout(tick,3000);
    }
    tick();
  }

  async function renderStatus(paymentId){
    currentId=String(paymentId);
    statusArea?.classList.remove("hidden");
    $("#paymentBrick_container")?.classList.add("hidden");
    statusController=await bricks.create("statusScreen","statusScreenBrick_container",{
      initialization:{paymentId:String(paymentId)},
      customization:{
        backUrls:{return:thankYouUrl(paymentId),error:location.href},
        visual:{showExternalReference:true}
      },
      callbacks:{
        onReady:()=>pollApproval(paymentId),
        onError:error=>console.error("Mercado Pago Status Screen",error)
      }
    });
  }

  async function open(productId){
    current=products[productId];
    if(!current)return;
    backdrop?.classList.add("open");
    document.body.style.overflow="hidden";
    $("#checkoutProductName").textContent=current.name;
    $("#checkoutProductPrice").textContent=money(current.price);
    statusArea?.classList.add("hidden");
    $("#paymentBrick_container")?.classList.remove("hidden");
    setMessage("Carregando checkout seguro…");

    try{
      await loadConfig();
      setMessage("");
      await unmount();
      $("#paymentBrick_container")?.classList.remove("hidden");
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
            const idem=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(16).slice(2);
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
      setMessage("Checkout temporariamente indisponível. Nenhuma cobrança foi feita.","error");
    }
  }

  $$(".buy").forEach(b=>b.addEventListener("click",()=>open(b.dataset.product)));

  loadConfig().catch(()=>{
    $$(".buy").forEach(b=>{b.disabled=true;b.textContent="Checkout temporariamente indisponível";});
  });
})();