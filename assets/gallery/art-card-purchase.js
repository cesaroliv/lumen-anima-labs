(() => {
  'use strict';
  // Direct edition purchase belongs to the exact visual artwork, never the collection.
  const qs = new URLSearchParams(location.search);
  const lang = ['pt','en'].includes(qs.get('lang')) ? qs.get('lang') : (navigator.language||'pt').toLowerCase().startsWith('pt')?'pt':'en';
  const pt = lang==='pt';
  const buttons = [...document.querySelectorAll('[data-gallery-open]')];
  const anchor = document.getElementById('gallery-explore');
  const note = document.querySelector('.gallery-buy-note');
  const skuMap = {
  "obsidian-01": "art-32-obsidian-horse",
  "obsidian-03": "art-30-gothic-angel",
  "obsidian-04": "art-31-dark-goddess",
  "obsidian-05": "art-28-skull-and-black-roses",
  "obsidian-06": "art-25-panther-eclipse",
  "obsidian-07": "art-26-imperial-lion",
  "obsidian-08": "art-27-serpent-nocturne",
  "gesso-ouro-01": "art-gesso-06-coliseu-eterno",
  "gesso-ouro-02": "art-gesso-05-big-ben-em-relevo",
  "gesso-ouro-03": "art-gesso-02-liberdade-esculpida",
  "gesso-ouro-04": "art-gesso-07-clave-de-sol",
  "gesso-ouro-05": "art-gesso-08-catedral-dourada",
  "gesso-ouro-06": "art-gesso-01-lotus-de-ouro",
  "gesso-ouro-07": "art-gesso-03-esquadro-e-compasso",
  "arte-juridica-02": "art-justice-01-dama-em-relevo",
  "arte-juridica-03": "art-justice-03-guardia-da-lei",
  "arte-juridica-04": "art-justice-04-justica-soberana"
};
  const money = n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
  const isSku = x=>/^art-(?:[0-9]{2}|gesso-[0-9]{2}|justice-[0-9]{2})-[a-z0-9-]+$/.test(x);
  const idFor=(button)=>{
    const sib=[...button.closest('.showcase-grid').querySelectorAll('[data-gallery-open]')];
    return button.dataset.gallerySlug+'-'+String(sib.indexOf(button)+1).padStart(2,'0');
  };
  const states = new Map();
  function paintModal(button){
    if(!anchor||!button)return;
    const item=states.get(button);if(!item)return;
    const ready=item.state==='ready';
    anchor.hidden=!ready;
    if(ready){
      anchor.href=item.href;
      anchor.textContent=pt?'COMPRAR '+item.name+' · '+money(item.price)+' →':'BUY '+item.name+' · '+money(item.price)+' →';
    }else{anchor.removeAttribute('href');}
    if(note)note.textContent=ready
       ?(pt?'Compra digital desta arte. Confira a obra antes do pagamento; quadro impresso ainda não disponível.':'Digital edition of this artwork. Review it before payment; framed prints are not available yet.')
       :item.state==='verifying'
        ?(pt?'Verificando o checkout desta obra…':'Checking this artwork checkout…')
        :(pt?'Esta imagem ainda não possui edição à venda. A compra do quadro impresso está em preparação.':'This image has no purchasable edition yet. Framed prints are coming soon.');
  }
  function setState(button,state,details={}){
    states.set(button,{state,...details});
    const slot=button.closest('.showcase-item')?.querySelector('.art-card-purchase');
    if(slot){
      slot.replaceChildren();
      if(state==='ready'){
        const label=button.querySelector('.showcase-name');
        if(label){label.textContent=details.name;label.dataset.pt=details.name;label.dataset.en=details.name;}
        button.dataset.title=details.name;button.dataset.titlePt=details.name;button.dataset.titleEn=details.name;
        button.setAttribute('aria-label',(pt?'Ampliar ambiente de ':'Expand room view of ')+details.name);
        const link=document.createElement('a');
        link.className='art-card-direct-buy';
        link.href=details.href;
        link.textContent=pt?'COMPRAR DIGITAL · '+money(details.price)+' →':'BUY DIGITAL · '+money(details.price)+' →';
        link.setAttribute('aria-label',(pt?'Comprar edição digital de ':'Buy digital edition of ')+details.name+' — '+money(details.price));
        slot.append(link);
        const caption=document.createElement('span');
        caption.className='art-card-edition-caption';
        caption.textContent=details.name+(pt?' · arquivo digital, sem moldura':' · digital file, unframed');
        slot.append(caption);
      }else if(state==='verifying'){
        const span=document.createElement('span');span.className='art-card-status';
        span.textContent=pt?'Verificando compra…':'Checking purchase…';slot.append(span);
      }else{
        const span=document.createElement('span');span.className='art-card-status art-card-unavailable';
        span.textContent=pt?'EDIÇÃO EM PREPARAÇÃO':'EDITION COMING SOON';slot.append(span);
      }
    }
    const dialog=document.getElementById('gallery-dialog');
    if(dialog?.open&&document.getElementById('dialog-artwork')?.getAttribute('src')===button.dataset.view)paintModal(button);
  }
  for(const button of buttons){
    const item=document.createElement('div');item.className='art-card-purchase';
    button.insertAdjacentElement('afterend',item);
    setState(button,Object.hasOwn(skuMap,idFor(button))?'verifying':'pending');
  }
  document.addEventListener('lumen:gallery-item-changed',e=>paintModal(e.detail?.button));
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),9000);
  Promise.all([
    fetch('/assets/gallery/artworks.json',{signal:controller.signal,cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('catalog unavailable');return r.json()}),
    fetch('https://lumen-digital-checkout.ccoliveira1.workers.dev/api/config',{signal:controller.signal,headers:{accept:'application/json'}}).then(r=>{if(!r.ok)throw Error('checkout unavailable');return r.json()})
  ]).then(([items,config])=>{
    if(!Array.isArray(items)||config?.individualSalesEnabled!==true)throw Error('Sales disabled');
    const registry=new Map(items.map(item=>[item.sku,item]));
    for(const button of buttons){
      const sku=skuMap[idFor(button)];
      if(!sku)continue;
      const item=registry.get(sku),price=Number(config.products?.[sku]?.price);
      if(!isSku(sku)||!item||!Number.isFinite(price)||price!==14.9){setState(button,'pending');continue;}
      const url=new URL('/checkout-artwork.html',location.origin);
      url.searchParams.set('sku',sku);url.searchParams.set('lang',lang);
      for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){
        const v=qs.get(k);if(v&&/^[a-zA-Z0-9_.-]{1,64}$/.test(v))url.searchParams.set(k,v);
      }
      setState(button,'ready',{sku,name:item.name,price,href:url.pathname+url.search});
    }
  }).catch(()=>{for(const button of buttons)if(states.get(button)?.state==='verifying')setState(button,'pending');})
    .finally(()=>clearTimeout(timeout));
})();