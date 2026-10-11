(()=>{
'use strict';
const qs=new URLSearchParams(location.search);
const lang=(qs.get('lang')==='en'||qs.get('lang')==='pt')?qs.get('lang'):'pt';
const select=document.getElementById('catalog-lang');
select.value=lang;
const applyLanguage=()=>{
 document.documentElement.lang=select.value==='en'?'en':'pt-BR';
 document.querySelectorAll('[data-pt][data-en]').forEach(el=>el.textContent=el.dataset[select.value]);
 document.getElementById('catalog-search').placeholder=select.value==='en'?'Search by artwork name...':'Buscar pelo nome...';
 document.querySelectorAll('a[href*="lang="]').forEach(a=>{if(!a.dataset.baseHref)a.dataset.baseHref=a.getAttribute('href');a.setAttribute('href',a.dataset.baseHref.replace('lang=pt','lang='+select.value));});
};
select.addEventListener('change',()=>{qs.set('lang',select.value);history.replaceState(null,'',location.pathname+'?'+qs.toString()+location.hash);applyLanguage();});
const inp=document.getElementById('catalog-search');
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
inp.addEventListener('input',()=>{
 const needle=normalize(inp.value.trim());
 let total=0;
 document.querySelectorAll('.catalog-section').forEach(section=>{
  let visible=0;
  section.querySelectorAll('.catalog-art').forEach(item=>{
   const found=normalize(item.querySelector('.catalog-art-title').textContent).includes(needle);
   item.hidden=!found;if(found)visible++;
  });
  section.hidden=visible===0;total+=visible;
 });
 document.getElementById('catalog-empty').hidden=total>0;
});
applyLanguage();
})();