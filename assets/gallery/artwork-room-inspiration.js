/* Lumen Arts — editorial room inspiration on product pages.
 * Collection-level references only: mockups are NEVER claimed to depict the selected product.
 * No payment or product configurator interaction. */
(() => {
 'use strict';
 const route=location.pathname.split('/').pop()||'';
 const slug=route.startsWith('gesso-')?'gesso-ouro':route.startsWith('black-')?'arte-black':(route.startsWith('juridica-')||route.startsWith('justice-'))?'arte-juridica':/^\d\d-/.test(route)?'obsidian':null;
 if(!slug)return;
 const title=document.querySelector('h1');
 if(!title)return;
 const requested=new URLSearchParams(location.search).get('lang');const pt=requested==='pt'||(requested!=='en'&&(navigator.language||'pt').toLowerCase().startsWith('pt'));
 const labels={obsidian: 'Obsidian Regalia','arte-black':pt?'Arte Black':'Black Art','gesso-ouro':pt?'Gesso & Ouro':'Plaster & Gold','arte-juridica':pt?'Arte Jurídica':'Legal Art'};
 const sectionAnchor='colecao-'+slug;
 const btn=document.createElement('button');btn.type='button';btn.className='room-inspiration-link';
 btn.textContent=pt?'Ver ambientes da coleção ↗':'See room inspirations ↗';
 btn.setAttribute('aria-haspopup','dialog');
 title.insertAdjacentElement('afterend',btn);
 const dialog=document.createElement('dialog');dialog.className='room-inspiration-dialog';
 dialog.setAttribute('aria-label',pt?'Ambientes da coleção':'Collection room inspirations');
 const h=document.createElement('h2');h.textContent=(pt?'Ambientes da coleção · ':'Collection interiors · ')+labels[slug];
 const close=document.createElement('button');close.className='room-inspiration-close';close.type='button';close.textContent='×';close.setAttribute('aria-label',pt?'Fechar':'Close');
 const note=document.createElement('p');note.className='room-inspiration-note';note.textContent=pt?'Referências decorativas da coleção. As fotografias podem mostrar outras obras e não representam necessariamente este quadro.':'Styling references from the collection. Photos may feature other artworks and do not necessarily depict this print.';
 const stage=document.createElement('div');stage.className='room-inspiration-stage';
 const img=document.createElement('img');img.alt='';img.loading='eager';
 const previous=document.createElement('button');previous.type='button';previous.className='room-inspiration-prev';previous.textContent='‹';previous.setAttribute('aria-label',pt?'Anterior':'Previous');
 const next=document.createElement('button');next.type='button';next.className='room-inspiration-next';next.textContent='›';next.setAttribute('aria-label',pt?'Próximo':'Next');
 stage.append(previous,img,next);
 const footer=document.createElement('div');footer.className='room-inspiration-footer';
 const count=document.createElement('span');count.setAttribute('aria-live','polite');
 const gallery=document.createElement('a');gallery.href='/?lang='+(pt?'pt':'en')+'#'+sectionAnchor;gallery.textContent=pt?'Explorar toda a coleção →':'Explore the full collection →';footer.append(count,gallery);
 const rail=document.createElement('div');rail.className='room-inspiration-rail';rail.setAttribute('role','group');rail.setAttribute('aria-label',pt?'Miniaturas':'Thumbnails');
 dialog.append(close,h,note,stage,footer,rail);document.body.append(dialog);
 let items=[],index=0,loading=false,returnFocus=null,initialX=null;
 const render=()=>{
  if(!items.length)return;index=(index+items.length)%items.length;
  img.src=items[index].image;img.alt=(pt?'Ambientação editorial ':'Editorial room inspiration ')+(index+1)+' — '+labels[slug];
  count.textContent=String(index+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');
  [...rail.children].forEach((b,i)=>{b.setAttribute('aria-current',String(i===index));if(i===index)b.scrollIntoView({block:'nearest',inline:'nearest'});});
 };
 const jump=delta=>{if(dialog.open){index+=delta;render()}};
 btn.addEventListener('click',async ()=>{
  if(loading)return;loading=true;returnFocus=btn;
  try{
   if(!items.length){
    const response=await fetch('/assets/gallery/collections/collections-manifest.json',{cache:'force-cache'});
    if(!response.ok)throw Error('manifest unavailable');
    const data=await response.json();
    items=(data.collections||[]).find(c=>c.slug===slug)?.items||[];
    if(!items.length)throw Error('No collection previews');
    const fragment=document.createDocumentFragment();
    items.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className='room-inspiration-thumb';b.setAttribute('aria-label',(pt?'Ver ambiente ':'View interior ')+(i+1));const im=document.createElement('img');im.src=item.thumbnail;im.alt='';im.loading='lazy';b.append(im);b.addEventListener('click',()=>{index=i;render()});fragment.append(b)});
    rail.append(fragment);
   }
   index=0;dialog.showModal();render();close.focus();
  }catch(e){gallery.click();}
  finally{loading=false;}
 });
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();jump(event.key==='ArrowLeft'?-1:1)}});
 previous.addEventListener('click',()=>jump(-1));next.addEventListener('click',()=>jump(1));
 stage.addEventListener('touchstart',event=>{initialX=event.touches[0]?.clientX??null},{passive:true});
 stage.addEventListener('touchend',event=>{const x=event.changedTouches[0]?.clientX;if(initialX!==null&&x!==undefined&&Math.abs(x-initialX)>45)jump(x<initialX?1:-1);initialX=null},{passive:true});
 gallery.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>returnFocus?.focus());
})();
