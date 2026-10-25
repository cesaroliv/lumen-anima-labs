/* Lumen Attribution v1: session-to-checkout correlation, independent of Meta Pixel.
   Consent-based, proprietary implementation. No purchase event, cookies or PII. */
(function(){
  'use strict';
  const CONSENT='papeleria_meta_consent_v1';
  const SESSION='papeleria_lumen_visit_v1';
  const ENDPOINT='https://papeleria-attribution.ccoliveira1.workers.dev/api/visit';
  const allowed=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','campaign_id','adset_id','ad_id'];
  const pattern=/^la1_[a-f0-9]{32}$/;
  const normalize=v=>typeof v==='string'?v.replace(/[^a-zA-Z0-9_.\-]/g,'').slice(0,100):'';
  function consented(){try{return localStorage.getItem(CONSENT)==='granted'}catch{return false}}
  function stored(){try{let x=JSON.parse(sessionStorage.getItem(SESSION)||'null');return x&&pattern.test(x.id)?x:null}catch{return null}}
  function readParams(){
    const u=new URLSearchParams(location.search),p={};
    for(const k of allowed)p[k]=normalize(u.get(k)||'');
    // Dynamic Meta macro alternatives, only when existing URL contains them.
    for(const [key,names] of Object.entries({campaign_id:['campaign_id','campaignid'],adset_id:['adset_id','adsetid'],ad_id:['ad_id','adid']})){
      for(const n of names){if(!p[key])p[key]=normalize(u.get(n)||'')}
    }
    return p;
  }
  function current(){
    if(!consented()||!window.crypto?.randomUUID)return null;
    let v=stored();
    if(!v){
      v={id:'la1_'+crypto.randomUUID().replace(/-/g,''),created:Date.now(),params:readParams()};
      try{sessionStorage.setItem(SESSION,JSON.stringify(v))}catch{}
    }
    return v;
  }
  function send(v){
    if(!consented()||!v)return;
    try{
      const body=JSON.stringify({id:v.id,consent:'granted',page:'/papelaria-criativa/',...v.params});
      fetch(ENDPOINT,{method:'POST',mode:'cors',keepalive:true,headers:{'Content-Type':'application/json'},body}).catch(()=>{});
    }catch{}
  }
  function append(link,v){
    if(!v||!/^https:\/\/pay\.hotmart\.com\/I108140299Q(?:\?|$)/.test(link.href))return;
    const url=new URL(link.href);
    url.searchParams.set('xcod',v.id);
    // Respect existing Hotmart checkoutMode, utms, fbclid and sck.
    link.href=url.href;
  }
  function refresh(){
    const v=current();
    if(!v)return;
    document.querySelectorAll('a.grid-button').forEach(a=>append(a,v));
    send(v);
  }
  document.addEventListener('papeleria:measurement-consent',function(e){
    if(e.detail?.granted)window.setTimeout(refresh,0); // After legacy consent handler rewrites checkout links.
    else{try{sessionStorage.removeItem(SESSION)}catch{}}
  });
  // Native capture click listener runs after meta-track.js; it appends only xcod.
  document.addEventListener('click',function(e){
    const a=e.target?.closest?.('a.grid-button');
    if(!a||!consented())return;
    const v=current(); if(!v)return;
    append(a,v);send(v);
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})();
