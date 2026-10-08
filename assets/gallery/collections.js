(function(){
  'use strict';
  const box=document.getElementById('lang');
  const qs=new URLSearchParams(location.search);
  const lang=['pt','en'].includes(qs.get('lang'))?qs.get('lang'):(navigator.language||'').toLowerCase().startsWith('pt')?'pt':'en';
  const display=(key)=>key==='pt'?'pt':'en';
  document.querySelectorAll('[data-pt][data-en]').forEach(el=>el.textContent=el.dataset[display(lang)]);
  const dialog=document.getElementById('gallery-dialog');
  const preview=document.getElementById('dialog-artwork');
  const title=document.getElementById('dialog-title');
  const collection=document.getElementById('dialog-collection');
  let trigger=null;
  document.querySelectorAll('[data-gallery-open]').forEach(button=>{
    button.addEventListener('click',()=>{
      if(!dialog||!preview||typeof dialog.showModal!=='function')return;
      trigger=button;
      preview.src=button.dataset.view;
      preview.alt=button.dataset.title+' — '+button.dataset.collection;
      title.textContent=button.dataset.title;
      collection.textContent=button.dataset.collection+(lang==='pt'?' · prévia ambientada':' · interior preview');
      dialog.showModal();
      dialog.querySelector('[data-close-gallery]')?.focus();
    });
  });
  const close=()=>dialog?.close();
  dialog?.querySelector('[data-close-gallery]')?.addEventListener('click',close);
  dialog?.addEventListener('click',e=>{if(e.target===dialog)close()});
  dialog?.addEventListener('close',()=>{if(preview)preview.removeAttribute('src');trigger?.focus();});
  document.querySelectorAll('[data-expand-gallery]').forEach(button=>{
    const section=button.closest('.showcase-collection');
    const extras=[...section.querySelectorAll('.showcase-item[data-extra=true]')];
    const label=()=>button.textContent=button.dataset[lang+(button.getAttribute('aria-expanded')==='true'? 'Close':'Open')];
    button.addEventListener('click',()=>{
      const expanded=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(expanded));
      extras.forEach(item=>{item.hidden=!expanded});
      label();
    });
    label();
  });
})();
