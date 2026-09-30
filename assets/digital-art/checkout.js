(()=> {
  "use strict";

  const API_BASE=String(window.LUMEN_CHECKOUT_API||"").replace(/\/$/,"");
  const pageLang=(document.documentElement.lang||"pt-BR").toLowerCase();
  const lang=pageLang.startsWith("en")?"en":pageLang.startsWith("es")?"es":"pt";
  const locale=document.documentElement.dataset.checkoutLocale||(lang==="en"?"en-US":lang==="es"?"es":"pt-BR");
  // Campaign attribution uses only explicit, allowlisted UTM strings: no cookies or personal data.
  const ATTRIBUTION_KEYS=["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  const params=new URLSearchParams(location.search);
  const attribution={};
  for(const key of ATTRIBUTION_KEYS){
    const value=String(params.get(key)||"").trim();
    if(/^[A-Za-z0-9_.-]{1,64}$/.test(value))attribution[key]=value;
  }
  const copy={
    pt:{
      product:"Obsidian Regalia — 30 obras Black & Gold",
      loading:"Carregando checkout seguro…",
      approved:"Pagamento aprovado. Preparando sua página de download…",
      optionError:"Não foi possível carregar uma opção de pagamento. Tente novamente.",
      failed:"Pagamento não concluído: ",
      unavailable:"Checkout temporariamente indisponível. Nenhuma cobrança foi feita.",
      unavailableBtn:"Checkout temporariamente indisponível"
    },
    en:{
      product:"Obsidian Regalia — 30 Black & Gold artworks",
      loading:"Loading secure checkout…",
      approved:"Payment approved. Preparing your download page…",
      optionError:"We couldn't load a payment option. Please try again.",
      failed:"Payment not completed: ",
      unavailable:"Checkout temporarily unavailable. No charge was made.",
      unavailableBtn:"Checkout temporarily unavailable"
    },
    es:{
      product:"Obsidian Regalia — 30 obras Black & Gold",
      loading:"Cargando checkout seguro…",
      approved:"Pago aprobado. Preparando tu página de descarga…",
      optionError:"No pudimos cargar una opción de pago. Inténtalo de nuevo.",
      failed:"Pago no completado: ",
      unavailable:"Checkout temporalmente no disponible. No se realizó ningún cobro.",
      unavailableBtn:"Checkout temporalmente no disponible"
    }
  }[lang];
  const products={
    "obsidian-regalia":{name:copy.product,price:49.90},
    "luxury-wallpapers":{name:"Luxury White & Gold — 55 Wallpapers",price:24.90},
    "professional-office":{name:"Professional Office Symbols — High-Res",price:29.90}
  };

  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const money=n=>Number(n).toLocaleString(lang==="pt"?"pt-BR":lang==="es"?"es-ES":"en-US",{style:"currency",currency:"BRL"});
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
      mp=new MercadoPago(cfg.publicKey,{locale});
      bricks=mp.bricks();
    }
    return cfg;
  }

  function thankYouUrl(paymentId){
    const u=new URL("/digital-art-thank-you.html",location.origin);
    u.searchParams.set("payment_id",paymentId);
    u.searchParams.set("lang",lang);
    return u.href;
  }

  async function pollApproval(paymentId){
    let attempts=0;
    async function tick(){
      attempts++;
      try{
        const r=await fetch(API_BASE+"/api/payments/"+encodeURIComponent(paymentId),{headers:{accept:"application/json"}});
        const data=await r.json().catch(()=>({}));
        if(r.ok&&data.status==="approved"){
          setMessage(copy.approved,"good");
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
    setMessage(copy.loading);

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
            setMessage(copy.optionError,"error");
          },
          onSubmit:({selectedPaymentMethod,formData})=>new Promise((resolve,reject)=>{
            const idem=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(16).slice(2);
            fetch(API_BASE+"/api/payments",{
              method:"POST",
              headers:{"content-type":"application/json","x-idempotency-key":idem},
              body:JSON.stringify({productId,selectedPaymentMethod,formData,locale:lang,attribution})
            }).then(async r=>{
              const data=await r.json().catch(()=>({}));
              if(!r.ok||!data.id)throw new Error(data.message||data.error||"payment_failed");
              resolve();
              await renderStatus(data.id);
            }).catch(err=>{
              setMessage(copy.failed+(err.message||"unexpected_error"),"error");
              reject(err);
            });
          })
        }
      });
    }catch(err){
      console.error(err);
      setMessage(copy.unavailable,"error");
    }
  }

  $$(".buy").forEach(b=>b.addEventListener("click",()=>open(b.dataset.product)));

  loadConfig().catch(()=>{
    $$(".buy").forEach(b=>{b.disabled=true;b.textContent=copy.unavailableBtn;});
  });
})();