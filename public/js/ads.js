/* MoviMoon v30 ad loader - third-party ad code loaded externally; CSP-compatible host configuration. */
(function(){
  'use strict';
  var DESKTOP={key:'96d2a0e12b32b033ad053b50f71c7fb2',width:728,height:90};
  var MOBILE={key:'cf8e21a2432417e5aab645a08f77365a',width:468,height:60};
  var chain=Promise.resolve();
  var vignetteLoaded=false;

  function loadVignette(){
    if(vignetteLoaded || document.querySelector('script[data-movimoon-vignette="11960580"]')){ vignetteLoaded=true; return; }
    var s=document.createElement('script');
    s.dataset.zone='11960580';
    s.dataset.movimoonVignette='11960580';
    s.src='https://n6wxm.com/vignette.min.js';
    s.async=true;
    document.head.appendChild(s);
    vignetteLoaded=true;
  }

  function loadBanner(slot){
    if(!slot || slot.dataset.loaded==='1' || slot.dataset.loading==='1') return Promise.resolve();
    slot.dataset.loading='1';
    var mobile=window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    var zone=mobile?MOBILE:DESKTOP;
    var host=slot.querySelector('.mm-ad-code') || slot;
    host.innerHTML='';
    return new Promise(function(resolve){
      window.atOptions={key:zone.key,format:'iframe',height:zone.height,width:zone.width,params:{}};
      var s=document.createElement('script');
      s.src='https://www.highrevenueformat.com/'+zone.key+'/invoke.js';
      s.async=false;
      s.onload=function(){ slot.dataset.loaded='1'; delete slot.dataset.loading; resolve(); };
      s.onerror=function(){ delete slot.dataset.loading; console.warn('[MoviMoon Ads] Adsterra banner failed to load:',zone.key); resolve(); };
      host.appendChild(s);
    });
  }

  function initPage(pageId){
    loadVignette();
    var ids=[];
    if(pageId==='page-home') ids=['ad-home-trending','ad-home-top10'];
    else if(pageId==='page-browse') ids=['ad-browse-filter'];
    else if(pageId==='page-livetv') ids=['ad-live-tv'];
    ids.forEach(function(id){
      var slot=document.getElementById(id);
      if(slot) chain=chain.then(function(){return loadBanner(slot);});
    });
  }

  window.MoviMoonAds={initPage:initPage,refreshCurrent:function(){
    var page=(window.App&&App.activePage)||'page-home';
    initPage(page);
  }};

  document.addEventListener('DOMContentLoaded',function(){
    setTimeout(function(){ initPage((window.App&&App.activePage)||'page-home'); },0);
  });
})();
