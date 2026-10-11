/* Lumen Arts collection gallery, 10 Oct 2026. Progressive, lightweight, accessible.
 * Each image is a collection-level editorial mockup; never linked to a specific purchasable SKU.
 * HorizonX-inspired navigation, implemented independently without third-party proprietary code. */
(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const lang=['pt','en'].includes(params.get('lang'))?params.get('lang'):((navigator.language||'').toLowerCase().startsWith('pt')?'pt':'en');
  const isPt=lang==='pt';
  document.querySelectorAll('[data-pt][data-en]').forEach(el=>{el.textContent=el.dataset[lang]});
  const dialog=document.getElementById('gallery-dialog');
  const preview=document.getElementById('dialog-artwork');
  const name=document.getElementById('dialog-title');
  const collection=document.getElementById('dialog-collection');
  const counter=document.getElementById('gallery-counter');
  const rail=document.getElementById('gallery-thumbnails');
  const explore=document.getElementById('gallery-explore');
  const all=[...document.querySelectorAll('[data-gallery-open]')];
  let trigger=null,active=[],at=0,startX=null;
  const title=button=>button.dataset['title'+(isPt?'Pt':'En')]||button.dataset.title||'';
  const sectionLabel=button=>button.dataset.collection||'';
  const slugToAnchor={'obsidian':'obsidian-originais','arte-black':'black-originais','gesso-ouro':'gesso-originais','arte-juridica':'juridica-originais'};
  document.querySelectorAll('.showcase-open').forEach(button=>{
    button.setAttribute('aria-label',(isPt?'Ampliar ambientação: ':'Expand interior preview: ')+title(button));
    const img=button.querySelector('img');
    if(img)img.alt=title(button)+(isPt?' — ambientação editorial de ':' — styled interior from ')+sectionLabel(button);
  });
  function render(){
    if(!active.length)return;
    at=(at+active.length)%active.length;
    const selected=active[at];
    preview.src=selected.dataset.view;
    preview.alt=title(selected)+(isPt?' — ambientação da coleção ':' — interior from ')+sectionLabel(selected);
    name.textContent=title(selected);
    collection.textContent=sectionLabel(selected)+(isPt?' · simulação de ambiente':' · room styling preview');
    counter.textContent=String(at+1).padStart(2,'0')+' / '+String(active.length).padStart(2,'0');
    rail.querySelectorAll('button').forEach((button,i)=>{
      const current=i===at;
      button.setAttribute('aria-current',String(current));
      button.setAttribute('aria-pressed',String(current));
      if(current)button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
    });
  }
  function step(dir){if(dialog?.open){at+=dir;render();}}
  const close=()=>dialog?.close();
  function open(button){
    if(!dialog||!preview||typeof dialog.showModal!=='function')return;
    trigger=button;
    const slug=button.dataset.gallerySlug;
    active=all.filter(el=>el.dataset.gallerySlug===slug);
    if(!active.length)return;
    at=active.indexOf(button);
    rail.replaceChildren();
    const fragment=document.createDocumentFragment();
    active.forEach((b,i)=>{
      const thumb=document.createElement('button');thumb.type='button';thumb.className='gallery-thumb';
      thumb.setAttribute('aria-label',(isPt?'Ver ':'View ')+title(b));
      const img=document.createElement('img');img.src=b.querySelector('img')?.getAttribute('src')||'';img.alt='';
      img.loading='lazy';img.decoding='async';thumb.appendChild(img);
      thumb.addEventListener('click',()=>{at=i;render()});
      fragment.appendChild(thumb);
    });
    rail.appendChild(fragment);
    const anchor=slugToAnchor[slug];
    explore.href=anchor?'#'+anchor:'#colecoes';
    explore.textContent=isPt?'Explorar obras originais →':'Explore original art →';
    dialog.showModal();render();
    dialog.querySelector('[data-close-gallery]')?.focus();
  }
  all.forEach(button=>button.addEventListener('click',()=>open(button)));
  dialog?.querySelector('[data-close-gallery]')?.addEventListener('click',close);
  dialog?.querySelector('[data-gallery-prev]')?.addEventListener('click',()=>step(-1));
  dialog?.querySelector('[data-gallery-next]')?.addEventListener('click',()=>step(1));
  dialog?.addEventListener('click',e=>{if(e.target===dialog)close()});
  dialog?.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();step(e.key==='ArrowLeft'?-1:1);}
  });
  const stage=dialog?.querySelector('.dialog-stage');
  stage?.addEventListener('touchstart',e=>{startX=e.touches?.[0]?.clientX??null},{passive:true});
  stage?.addEventListener('touchend',e=>{
    if(startX===null)return;const x=e.changedTouches?.[0]?.clientX??startX;
    if(Math.abs(x-startX)>52)step(x<startX?1:-1);startX=null;
  },{passive:true});
  explore?.addEventListener('click',()=>close());
  dialog?.addEventListener('close',()=>{preview?.removeAttribute('src');rail?.replaceChildren();active=[];trigger?.focus();});
  document.querySelectorAll('[data-expand-gallery]').forEach(button=>{
    const parent=button.closest('.showcase-collection');
    const extras=[...parent.querySelectorAll('.showcase-item[data-extra="true"]')];
    const update=()=>{const expanded=button.getAttribute('aria-expanded')==='true';
      button.textContent=button.dataset[lang+(expanded?'Close':'Open')];
    };
    button.addEventListener('click',()=>{
      const expanded=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(expanded));
      extras.forEach(item=>{item.hidden=!expanded;});
      update();
    });
    update();
  });
})();
