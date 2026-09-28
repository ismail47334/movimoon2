
//<![CDATA[
/* ================================================================
   CINEVAULT — POPUP & AD BLOCKER v2 (Mobile + Desktop)
   Anti-PopAds | Sandbox-free | 8-Layer Protection
================================================================ */
(function(){
  var LOG = function(msg){ console.warn('[MoviMoon Blocker]', msg); };

  var ALLOWED = ['youtube.com','youtu.be','themoviedb.org',
    'vidapi.xyz','vidsrc.to','vidsrc.xyz','2embed.cc',
    'fonts.googleapis.com','fonts.gstatic.com',
    'cdnjs.cloudflare.com','image.tmdb.org',
    'profitableratecpm.com','profitableratecpmnetwork.com','highperformancegate.com','highperformanceformat.com','monetag.com','5gvci.com','highrevenueformat.com'];

  var AD_PATTERNS = ['popads','popcash','adnxs','doubleclick',
    'googlesyndication','adservice','pagead2','propellerads',
    'adsterra','hilltopads','trafficjunky','exoclick','juicyads',
    'adcash','revcontent','mgid','taboola','outbrain','popunder',
    'clickadu','adfly','adf.ly','shorte.st','ouo.io','bc.vc',
    'linkvertise','admaven','admavenads','popcornads','popnads'];

  var OWN_IDS  = ['cv','modal','fv-','qv-','player','sidebar',
    'toast','search','nav','overlay','header','spotlight','server-notice','server-notice-close'];
  var OWN_CLS  = ['cv-','fv-','qv-','modal','player','sidebar',
    'toast','search','nav','overlay','header','spotlight',
    'poster-card','server-tab','genre-chip','hscroll','browse','server-notice','server-notice-close'];

  function isOwnElement(node){
    var id  = (node.id  || '').toLowerCase();
    var cls = (node.className && typeof node.className === 'string'
               ? node.className : '').toLowerCase();
    return OWN_IDS.some(function(k){ return id.indexOf(k)  !== -1; }) ||
           OWN_CLS.some(function(k){ return cls.indexOf(k) !== -1; });
  }

  function isAllowedUrl(url){
    if(!url) return true;
    return ALLOWED.some(function(d){ return url.indexOf(d) !== -1; });
  }

  function isAdUrl(url){
    if(!url) return false;
    var u = url.toLowerCase();
    return AD_PATTERNS.some(function(p){ return u.indexOf(p) !== -1; });
  }

  /* ── LAYER 1: window.open block (PC + Mobile) ── */
  var _origOpen = window.open;
  window.open = function(url, name, specs){
    if(!isAllowedUrl(url)){ LOG('window.open blocked: ' + url); return null; }
    return _origOpen.call(window, url, name, specs);
  };

  /* ── LAYER 2: Block <a target=_blank> ad links — click (PC) ── */
  function blockAdLink(e){
    var el = e.target;
    /* Walk up DOM — ad overlays wrap in <a> or <div> */
    while(el && el !== document.body){
      if(el.tagName === 'A'){
        var href = el.getAttribute('href') || '';
        if(el.getAttribute('target') === '_blank' && !isAllowedUrl(href) &&
          href.indexOf('#') !== 0 && href !== '' && href.indexOf('/') !== 0){
          e.preventDefault(); e.stopPropagation();
          LOG('Ad link blocked (click): ' + href);
          return;
        }
      }
      el = el.parentElement;
    }
  }
  document.addEventListener('click',      blockAdLink, true);

  /* ── LAYER 3: touchstart / touchend block (Mobile) ── */
  var _touchTarget = null;
  document.addEventListener('touchstart', function(e){
    _touchTarget = e.target;
  }, true);

  document.addEventListener('touchend', function(e){
    var el = _touchTarget || e.target;
    /* Walk up DOM */
    while(el && el !== document.body){
      if(el.tagName === 'A'){
        var href = el.getAttribute('href') || '';
        if(el.getAttribute('target') === '_blank' && !isAllowedUrl(href) &&
          href.indexOf('#') !== 0 && href !== '' && href.indexOf('/') !== 0){
          e.preventDefault(); e.stopPropagation();
          LOG('Ad link blocked (touch): ' + href);
          return;
        }
      }
      el = el.parentElement;
    }
    _touchTarget = null;
  }, true);

  /* ── LAYER 4: visibilitychange — mobile background-tab redirect block ── */
  /* Mobile popads often trigger when page becomes hidden then visible */
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'hidden'){
      /* Override window.open for 2s after tab hides — peak attack window */
      window.open = function(){ LOG('window.open blocked (visibilitychange)'); return null; };
      setTimeout(function(){
        window.open = function(url, name, specs){
          if(!isAllowedUrl(url)){ LOG('window.open blocked: ' + url); return null; }
          return _origOpen.call(window, url, name, specs);
        };
      }, 2000);
    }
  });

  /* ── LAYER 5: blur — tab-switch popads trick (PC + Android Chrome) ── */
  window.addEventListener('blur', function(){
    window.open = function(){ LOG('window.open blocked (blur)'); return null; };
    setTimeout(function(){
      window.open = function(url, name, specs){
        if(!isAllowedUrl(url)){ LOG('window.open blocked: ' + url); return null; }
        return _origOpen.call(window, url, name, specs);
      };
    }, 2000);
  });

  /* ── LAYER 6: MutationObserver — remove injected ad nodes ── */
  var observer = new MutationObserver(function(mutations){
    mutations.forEach(function(mutation){
      mutation.addedNodes.forEach(function(node){
        if(!node || !node.tagName) return;
        var tag = node.tagName.toLowerCase();
        var src = (node.src || (node.getAttribute && node.getAttribute('src')) || '').toLowerCase();
        var href= (node.href|| (node.getAttribute && node.getAttribute('href'))|| '').toLowerCase();

        /* Remove ad iframes & scripts by src URL */
        if((tag === 'iframe' || tag === 'script') && (isAdUrl(src) || isAdUrl(href))){
          node.parentNode && node.parentNode.removeChild(node);
          LOG('Ad node removed: ' + (src || href)); return;
        }

        /* Remove full-screen ad overlay divs / anchors */
        if(tag === 'div' || tag === 'a' || tag === 'ins'){
          try{
            var st  = window.getComputedStyle(node);
            var zi  = parseInt(st.zIndex, 10);
            var pos = st.position;
            var w   = parseInt(st.width,  10);
            var h   = parseInt(st.height, 10);
            var vw  = window.innerWidth;
            var vh  = window.innerHeight;
            /* Full-screen fixed/absolute with huge z-index that isn't our own UI */
            var isFullscreen = (pos === 'fixed' || pos === 'absolute') &&
              zi > 9999 && w >= vw * 0.8 && h >= vh * 0.8;
            var isHighZ = zi > 999999;
            if((isFullscreen || isHighZ) && !isOwnElement(node)){
              node.parentNode && node.parentNode.removeChild(node);
              LOG('Ad overlay removed: z=' + zi + ' ' + (node.id||node.className||tag));
            }
          }catch(err){}
        }
      });
    });
  });

  /* ── LAYER 7: Periodic DOM sweep — catches delayed-inject ads ── */
  /* Some mobile popads inject 2-5s after page load */
  function sweepAds(){
    /* Remove any <iframe> with ad src that slipped through */
    var iframes = document.querySelectorAll('iframe');
    for(var i=0;i<iframes.length;i++){
      var src = (iframes[i].src||'').toLowerCase();
      if(isAdUrl(src) && iframes[i].id !== 'main-player'){
        iframes[i].parentNode && iframes[i].parentNode.removeChild(iframes[i]);
        LOG('Sweep removed ad iframe: ' + src);
      }
    }
    /* Remove full-screen fixed overlays with no known MoviMoon class/id */
    var allDivs = document.querySelectorAll('div[style*="position:fixed"],div[style*="position: fixed"]');
    for(var j=0;j<allDivs.length;j++){
      var d = allDivs[j];
      try{
        var zi2 = parseInt(window.getComputedStyle(d).zIndex,10);
        if(zi2 > 999999 && !isOwnElement(d)){
          d.parentNode && d.parentNode.removeChild(d);
          LOG('Sweep removed overlay: ' + (d.id||d.className));
        }
      }catch(e2){}
    }
  }

  /* ── LAYER 8: contextmenu block on player iframe ── */
  document.addEventListener('contextmenu', function(e){
    if(e.target && e.target.id === 'main-player') e.preventDefault();
  });

  /* Init observer + sweeper after DOM ready */
  function init(){
    observer.observe(document.body, { childList: true, subtree: true });
    /* Sweep at 2s, 4s, 8s after load — covers delayed mobile ad injection */
    setTimeout(sweepAds, 2000);
    setTimeout(sweepAds, 4000);
    setTimeout(sweepAds, 8000);
    /* Sweep every time user touches screen (mobile) */
    document.addEventListener('touchstart', function(){ setTimeout(sweepAds, 500); }, {passive:true});
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c [MoviMoon] Ad & Popup Blocker v2 Active ✓ (Mobile+Desktop) ', 'background:#00C4B4;color:#080C14;font-weight:800;padding:2px 8px;border-radius:3px;');
})();

/* ================================================================
   CINEVAULT PREMIUM v2.0 — JAVASCRIPT ENGINE (Untouched Logic)
================================================================ */

'use strict';

const CFG = {
  API_KEY: '',
  BASE:   '/api/tmdb',
  TMDB_READY: false,
  IMG185: 'https://image.tmdb.org/t/p/w185',
  IMG342: 'https://image.tmdb.org/t/p/w342',
  IMG500: 'https://image.tmdb.org/t/p/w500',
  IMG780: 'https://image.tmdb.org/t/p/w780',
  ORIG:   'https://image.tmdb.org/t/p/original',

  SERVERS: [
    { name: 'MoviMoon', icon: 'fa-play-circle' },
  ],
  SPOTLIGHT_INTERVAL: 6000,
  ITEMS_PER_PAGE: 20,
  GENRES: { 28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western',10759:'Action & Adventure',10762:'Kids',10763:'News',10764:'Reality',10765:'Sci-Fi & Fantasy',10766:'Soap',10767:'Talk',10768:'War & Politics' }
};

var State = { activePage:'home', browseType:'movie', browseMode:'trending', browsePage:1, browseTotalPages:1, isLoading:false, activeId:null, activeType:'movie', activeData:null, activeServer:0, watchlist:[], history:[], recentSearches:[], searchQuery:'', spotlightIndex:0, spotlightItems:[], spotlightTimer:null, currentView:'grid', genreFilter:'', yearFilter:'', qualityFilter:'', langFilter:'', sortFilter:'popularity.desc', htabType:'all', isTrailerPlaying:false };
(function loadStorage(){ try { var wl = localStorage.getItem('cv_watchlist'); if(wl) State.watchlist = JSON.parse(wl); var h = localStorage.getItem('cv_history'); if(h) State.history = JSON.parse(h); var rs = localStorage.getItem('cv_searches'); if(rs) State.recentSearches = JSON.parse(rs); } catch(e){} })();
function saveWatchlist(){ try{ localStorage.setItem('cv_watchlist', JSON.stringify(State.watchlist)); }catch(e){} }
function saveHistory()  { try{ localStorage.setItem('cv_history',   JSON.stringify(State.history));   }catch(e){} }
function saveSearches() { try{ localStorage.setItem('cv_searches',  JSON.stringify(State.recentSearches)); }catch(e){} }

var Utils = {
  slug: function(s){ if(!s) return ''; return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60); },
  runtime: function(mins){ if(!mins) return 'N/A'; var h = Math.floor(mins/60), m = mins%60; return h ? h+'h '+(m?m+'m':'') : m+'m'; },
  year: function(d){ return d ? d.split('-')[0] : 'N/A'; },
  fmt: function(n){ if(!n) return '0'; if(n>=1000000) return (n/1000000).toFixed(1)+'M'; if(n>=1000) return (n/1000).toFixed(0)+'K+'; return ''+n; },
  genreNames: function(ids){ if(!ids) return ''; return ids.slice(0,3).map(function(id){ return CFG.GENRES[id]||''; }).filter(Boolean).join(', ') || 'Unknown'; },
  clamp: function(str, max){ max = max||120; if(!str) return ''; return str.length>max ? str.slice(0,max)+'…' : str; },
  debounce: function(fn, delay){ var t; return function(){ var args = arguments, ctx = this; clearTimeout(t); t = setTimeout(function(){ fn.apply(ctx,args); }, delay||350); }; },
  langName: function(code){ var map = {en:'English (Hollywood)',hi:'Hindi (Bollywood)',te:'Telugu',ta:'Tamil',ml:'Malayalam',kn:'Kannada',bn:'Bengali',ur:'Urdu (Pakistani)',pa:'Punjabi',es:'Spanish',fr:'French',ja:'Japanese',ko:'Korean',zh:'Chinese',pt:'Portuguese',de:'German',it:'Italian'}; return map[code] || (code ? code.toUpperCase() : 'N/A'); },
  placeholder: function(){ return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22%3E%3Crect fill=%22%230D1320%22 width=%22300%22 height=%22450%22/%3E%3Ctext fill=%22%23243346%22 font-size=%2248%22 font-family=%22sans-serif%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.35em%22%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E'; },
  escape: function(s){ return (s||'').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
};

var API = {
  cache: {},
  fetch: function(url){ if(API.cache[url]) return Promise.resolve(API.cache[url]); return fetch(url, {credentials:'same-origin', headers:{accept:'application/json'}}).then(function(res){ if(!res.ok) throw new Error('HTTP '+res.status); return res.json(); }).then(function(data){ API.cache[url] = data; return data; }).catch(function(e){ console.warn('[MoviMoon]', e.message, url); return null; }); },
  url: function(endpoint, params){ params = params || {}; var p = []; for(var k in params){ if(params[k] !== undefined && params[k] !== null && params[k] !== ''){ p.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k])); } } return CFG.BASE + endpoint + (p.length ? '?' + p.join('&') : ''); },
  trending: function(type, page){ return API.fetch(API.url('/trending/'+(type||'all')+'/week', {page:page||1})); },
  topRated: function(type, page){ return API.fetch(API.url('/'+(type||'movie')+'/top_rated', {page:page||1})); },
  popular:  function(type, page){ return API.fetch(API.url('/'+(type||'movie')+'/popular',   {page:page||1})); },
  upcoming: function(page){ return API.fetch(API.url('/movie/upcoming', {page:page||1})); },
  search:   function(q, type, page){ return API.fetch(API.url('/search/'+(type||'multi'), {query:q, page:page||1, include_adult:false})); },
  detail: function(id, type){ return API.fetch(API.url('/'+(type||'movie')+'/'+id, {})); },
  discover: function(type, params){ return API.fetch(API.url('/discover/'+(type||'movie'), params || {})); }
};

var Prog = { el:null, bar:null, init: function(){ this.el=document.getElementById('cv-progress'); this.bar=document.getElementById('cv-progress-bar'); }, start: function(){ if(!this.el) return; this.bar.style.width='0%'; this.el.classList.add('active'); var b=this.bar; setTimeout(function(){ b.style.width='75%'; },50); }, done: function(){ if(!this.el) return; var el=this.el, b=this.bar; b.style.width='100%'; setTimeout(function(){ el.classList.remove('active'); b.style.width='0%'; },400); } };
var Toast = { container:null, init: function(){ this.container=document.getElementById('toast-container'); }, show: function(msg, type, duration){ if(!this.container) return; type = type||'info'; duration = duration===undefined ? 3000 : duration; var icons = {success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle'}; var t = document.createElement('div'); t.className = 'toast '+type; t.innerHTML = '<i class="fas '+(icons[type]||icons.info)+' toast-icon"></i><span class="toast-msg">'+msg+'</span><span class="toast-close" onclick="Toast.remove(this.parentElement)"><i class="fas fa-times"></i></span>'; this.container.appendChild(t); if(duration>0){ var self=this; setTimeout(function(){ self.remove(t); }, duration); } }, remove: function(el){ if(!el||!el.parentElement) return; el.classList.add('removing'); setTimeout(function(){ if(el.parentElement) el.parentElement.removeChild(el); }, 260); } };

var Sidebar = { el:null, overlay:null, main:null, header:null, collapsed:false, init: function(){ this.el=document.getElementById('cv-sidebar'); this.overlay=document.getElementById('sidebar-overlay'); this.main=document.getElementById('cv-main'); this.header=document.getElementById('cv-header'); }, toggle: function(e){ if(e){ e.stopPropagation(); e.preventDefault(); } this.collapsed = !this.collapsed; var cls = this.collapsed ? 'add' : 'remove'; if(this.el) this.el.classList[cls]('collapsed'); if(this.main) this.main.classList[cls]('sidebar-collapsed'); if(this.header) this.header.classList[cls]('sidebar-collapsed'); var mobBtn = document.getElementById('mob-sidebar-toggle-btn'); if(mobBtn) mobBtn.querySelector('i').className = this.collapsed ? 'fas fa-bars' : 'fas fa-times'; }, open: function(){ if(this.el) this.el.classList.add('mobile-open'); if(this.overlay){ this.overlay.classList.add('open'); } document.body.style.overflow='hidden'; }, close: function(){ if(this.el) this.el.classList.remove('mobile-open'); if(this.overlay){ this.overlay.classList.remove('open'); } document.body.style.overflow=''; } };

function initScrollEffects(){ var header = document.getElementById('cv-header'); if(!header) return; window.addEventListener('scroll', function(){ if(window.scrollY>60) header.classList.add('scrolled'); else header.classList.remove('scrolled'); }, {passive:true}); }

var Search = { dropdown:null, resultsEl:null, recentsEl:null, srdLabel:null, srdFooter:null, srdFooterText:null, _debounced:null, _open:false, init: function(){ this.dropdown=document.getElementById('search-dropdown'); this.resultsEl=document.getElementById('srd-results'); this.recentsEl=document.getElementById('srd-recent-tags'); this.srdLabel=document.getElementById('srd-label'); this.srdFooter=document.getElementById('srd-footer'); this.srdFooterText=document.getElementById('srd-footer-text'); this._debounced=Utils.debounce(function(q){ Search.doSearch(q); }, 400); this.renderRecents(); document.addEventListener('click', function(e){ var sc = document.getElementById('search-container'); if(sc && !sc.contains(e.target)) Search.closeDropdown(); }); }, renderRecents: function(){ if(!this.recentsEl) return; var items = State.recentSearches.slice(0,8); this.recentsEl.innerHTML = items.map(function(q){ return '<span class="srd-recent-tag" onclick="Search.clickRecent(\''+Utils.escape(q)+'\')"><i class="fas fa-clock"></i>'+q+'</span>'; }).join(''); }, clickRecent: function(q){ var inp = document.getElementById('search-input'); if(inp) inp.value = q; this.onInput(q); }, onFocus: function(){ if(this.dropdown) this.dropdown.classList.add('open'); var val = (document.getElementById('search-input')||{}).value||''; var rec = document.getElementById('srd-recents'); if(rec) rec.style.display = val ? 'none' : 'block'; }, onInput: function(val){ State.searchQuery = val; var clr = document.getElementById('search-clear'); if(clr) clr.classList.toggle('visible', val.length>0); var rec = document.getElementById('srd-recents'); if(!val.trim()){ if(this.resultsEl) this.resultsEl.innerHTML=''; if(this.srdLabel) this.srdLabel.textContent='Recent Searches'; if(this.srdFooter) this.srdFooter.style.display='none'; if(rec) rec.style.display='block'; if(this.dropdown) this.dropdown.classList.add('open'); return; } if(rec) rec.style.display='none'; if(this.srdLabel) this.srdLabel.textContent='Searching...'; if(this.dropdown) this.dropdown.classList.add('open'); this._debounced(val); }, doSearch: function(q){ if(!q||!q.trim()) return; var mobOverlay=document.getElementById('mob-search-overlay'); var isMobile=mobOverlay&&mobOverlay.classList.contains('open'); if(isMobile){ Search._doMobileSearch(q); return; } if(this.resultsEl) this.resultsEl.innerHTML='<div class="srd-empty"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>'; API.search(q).then(function(data){ if(!data||!data.results){ Search.resultsEl.innerHTML='<div class="srd-empty"><i class="fas fa-search-minus"></i> No results found</div>'; return; } var results = data.results.filter(function(r){ return r.media_type!=='person' && r.poster_path; }).slice(0,7); if(!results.length){ Search.resultsEl.innerHTML='<div class="srd-empty"><i class="fas fa-search-minus"></i> No results for "'+q+'"</div>'; if(Search.srdLabel) Search.srdLabel.textContent='No Results'; if(Search.srdFooter) Search.srdFooter.style.display='none'; return; } if(Search.srdLabel) Search.srdLabel.textContent='Results for "'+q+'"'; Search.resultsEl.innerHTML = results.map(function(r){ var type=r.media_type||'movie'; var title=r.title||r.name||'Untitled'; var year=Utils.year(r.release_date||r.first_air_date); var rating=r.vote_average?r.vote_average.toFixed(1):'N/A'; var img=r.poster_path?CFG.IMG185+r.poster_path:Utils.placeholder(); return '<div class="srd-item" onclick="Search.selectResult('+r.id+',\''+type+'\')"><img class="srd-poster" src="'+img+'" alt="'+Utils.escape(title)+'" loading="lazy"/><div class="srd-info"><div class="srd-title">'+title+'</div><div class="srd-meta"><span class="srd-type-badge '+(type==='tv'?'tv':'')+'">'+(type==='tv'?'TV':'Movie')+'</span><span>'+year+'</span><span>&#9733; '+rating+'</span></div></div><i class="fas fa-chevron-right srd-arrow"></i></div>'; }).join(''); if(Search.srdFooter){ Search.srdFooter.style.display='flex'; } if(Search.srdFooterText) Search.srdFooterText.textContent='View all results for "'+q+'"'; if(!State.recentSearches.includes(q)){ State.recentSearches.unshift(q); if(State.recentSearches.length>10) State.recentSearches.pop(); saveSearches(); Search.renderRecents(); } }); }, selectResult: function(id, type){ this.closeDropdown(); Modal.openFull(id, type); }, viewAll: function(){ this.closeDropdown(); if(State.searchQuery) this.browseFull(State.searchQuery); }, browseFull: function(q){ App.showPage('page-browse'); document.getElementById('header-page-title').textContent='Search'; document.getElementById('breadcrumb-current').textContent='"'+q+'"'; Prog.start(); Browse.reset(); API.search(q).then(function(data){ if(data && data.results){ var items = data.results.filter(function(r){ return r.media_type!=='person' && r.poster_path; }); document.getElementById('filter-count').textContent = items.length; Render.grid('browse-grid', items, null, false); } Prog.done(); }); }, clear: function(){ var inp = document.getElementById('search-input'); if(inp) inp.value=''; State.searchQuery=''; var clr = document.getElementById('search-clear'); if(clr) clr.classList.remove('visible'); if(this.resultsEl) this.resultsEl.innerHTML=''; if(this.srdLabel) this.srdLabel.textContent='Recent Searches'; if(this.srdFooter) this.srdFooter.style.display='none'; var rec = document.getElementById('srd-recents'); if(rec) rec.style.display='block'; }, closeDropdown: function(){ if(this.dropdown) this.dropdown.classList.remove('open'); }, handleTopSearchClick: function(){
  if(window.innerWidth <= 768){ this.focusMobile(); }
},
focusMobile: function(){
  var overlay = document.getElementById('mob-search-overlay');
  if(overlay){ overlay.classList.add('open'); document.body.style.overflow='hidden'; setTimeout(function(){ var inp=document.getElementById('mob-search-input'); if(inp) inp.focus(); }, 100); Search.renderMobileRecents(); }
},
closeMobileOverlay: function(){
  var overlay = document.getElementById('mob-search-overlay'); if(overlay) overlay.classList.remove('open'); document.body.style.overflow='';
},
renderMobileRecents: function(){
  var el = document.getElementById('mob-srd-recent-tags'); if(!el) return;
  var items = State.recentSearches.slice(0,8);
  el.innerHTML = items.map(function(q){ return '<span class="mob-srd-recent-tag" onclick="Search.clickMobileRecent(\''+Utils.escape(q)+'\')"><i class="fas fa-clock"></i>'+q+'</span>'; }).join('');
  var rec = document.getElementById('mob-srd-recents'); if(rec) rec.style.display = items.length ? 'block' : 'none';
},
clickMobileRecent: function(q){
  var inp = document.getElementById('mob-search-input'); if(inp) inp.value=q; Search.onMobileInput(q);
},
onMobileInput: function(val){
  State.searchQuery = val;
  var clr = document.getElementById('mob-search-clear'); if(clr) clr.classList.toggle('visible', val.length>0);
  var rec = document.getElementById('mob-srd-recents');
  if(!val.trim()){ var res=document.getElementById('mob-srd-results'); if(res) res.innerHTML=''; var footer=document.getElementById('mob-srd-footer'); if(footer) footer.style.display='none'; if(rec) rec.style.display='block'; return; }
  if(rec) rec.style.display='none';
  var res=document.getElementById('mob-srd-results'); if(res) res.innerHTML='<div class="mob-srd-empty"><i class="fas fa-circle-notch fa-spin"></i></div>';
  this._debounced(val);
},
_doMobileSearch: function(q){
  API.search(q).then(function(data){
    if(!data||!data.results){ var res=document.getElementById('mob-srd-results'); if(res) res.innerHTML='<div class="mob-srd-empty"><i class="fas fa-search-minus"></i><span>No results</span></div>'; return; }
    var results = data.results.filter(function(r){ return r.media_type!=='person' && r.poster_path; }).slice(0,10);
    var res=document.getElementById('mob-srd-results'); if(!res) return;
    if(!results.length){ res.innerHTML='<div class="mob-srd-empty"><i class="fas fa-search-minus"></i><span>No results for \"'+q+'\"</span></div>'; var footer=document.getElementById('mob-srd-footer'); if(footer) footer.style.display='none'; return; }
    res.innerHTML = results.map(function(r){ var type=r.media_type||'movie'; var title=r.title||r.name||'Untitled'; var year=Utils.year(r.release_date||r.first_air_date); var rating=r.vote_average?r.vote_average.toFixed(1):'N/A'; var img=r.poster_path?CFG.IMG185+r.poster_path:Utils.placeholder(); return '<div class="mob-srd-item" onclick="Search.selectMobileResult('+r.id+',\''+type+'\')"><img class="mob-srd-poster" src="'+img+'" alt="'+Utils.escape(title)+'" loading="lazy"/><div class="mob-srd-info"><div class="mob-srd-title">'+title+'</div><div class="mob-srd-meta"><span class="mob-srd-type-badge '+(type==='tv'?'tv':'')+'">'+(type==='tv'?'TV':'Movie')+'</span><span>'+year+'</span><span>&#9733; '+rating+'</span></div></div><i class="fas fa-chevron-right mob-srd-arrow"></i></div>'; }).join('');
    var footer=document.getElementById('mob-srd-footer'); if(footer){ footer.style.display='flex'; var ft=document.getElementById('mob-srd-footer-text'); if(ft) ft.textContent='View all results for \"'+q+'\"'; }
    if(!State.recentSearches.includes(q)){ State.recentSearches.unshift(q); if(State.recentSearches.length>10) State.recentSearches.pop(); saveSearches(); Search.renderMobileRecents(); }
  });
},
selectMobileResult: function(id, type){ this.closeMobileOverlay(); Modal.openFull(id, type); },
mobileViewAll: function(){ this.closeMobileOverlay(); if(State.searchQuery) this.browseFull(State.searchQuery); },
clearMobile: function(){
  var inp=document.getElementById('mob-search-input'); if(inp) inp.value=''; State.searchQuery='';
  var clr=document.getElementById('mob-search-clear'); if(clr) clr.classList.remove('visible');
  var res=document.getElementById('mob-srd-results'); if(res) res.innerHTML='';
  var footer=document.getElementById('mob-srd-footer'); if(footer) footer.style.display='none';
  var rec=document.getElementById('mob-srd-recents'); if(rec) rec.style.display='block';
} };

function initDragScrollEl(el){ if(!el) return; var isDown=false, startX=0, scrollL=0; el.addEventListener('mousedown', function(e){ isDown=true; startX=e.pageX-el.offsetLeft; scrollL=el.scrollLeft; el.classList.add('dragging'); }); el.addEventListener('mouseleave', function(){ isDown=false; el.classList.remove('dragging'); }); el.addEventListener('mouseup', function(){ isDown=false; el.classList.remove('dragging'); }); el.addEventListener('mousemove', function(e){ if(!isDown) return; e.preventDefault(); el.scrollLeft = scrollL - (e.pageX - el.offsetLeft - startX) * 1.5; }); }
function initDragScroll(){ document.querySelectorAll('.cv-hscroll').forEach(initDragScrollEl); }

var Spotlight = { track:null, dotsEl:null, thumbEl:null, progBar:null, timer:null, current:0, total:0, init: function(items){ this.track=document.getElementById('spotlight-track'); this.dotsEl=document.getElementById('spotlight-dots'); this.thumbEl=document.getElementById('spotlight-thumbstrip'); this.progBar=document.getElementById('spotlight-progress-bar'); if(!this.track || !items || !items.length) return; State.spotlightItems = items; this.total = items.length; this.current = 0; this.renderSlides(items); this.renderDots(items); this.renderThumbs(items); this.activateSlide(0); this.startAuto(); }, renderSlides: function(items){ this.track.innerHTML = items.map(function(item, i){ var title=item.title||item.name||'Untitled'; var year=Utils.year(item.release_date||item.first_air_date); var rating=item.vote_average?item.vote_average.toFixed(1):'N/A'; var desc=Utils.clamp(item.overview, 180); var type=item.media_type||(item.title?'movie':'tv'); var runtime=type==='movie'?'~2h':((item.number_of_seasons||1)+' Season(s)'); var genres=Utils.genreNames(item.genre_ids||[]); var bg=item.backdrop_path?CFG.ORIG+item.backdrop_path:''; var isWL=State.watchlist.some(function(w){ return w.id===item.id; }); var safeTitle=Utils.escape(title); var poster=item.poster_path||''; return '<div class="spotlight-slide" id="slide-'+i+'"><div class="spotlight-bg" style="background-image:url(\''+bg+'\')"></div><div class="spotlight-content"><div class="spotlight-category"><span class="spotlight-category-dot"></span>'+(type==='tv'?'TV Series':'Feature Film')+' &middot; '+year+'</div><h2 class="spotlight-title">'+title+'</h1><div class="spotlight-meta"><div class="spotlight-meta-item"><i class="fas fa-star"></i> '+rating+'</div><div class="spotlight-meta-sep"></div><div class="spotlight-meta-item"><i class="fas fa-clock"></i> '+runtime+'</div><div class="spotlight-meta-sep"></div><div class="spotlight-meta-item">'+genres+'</div><div class="spotlight-quality">4K HD</div></div><p class="spotlight-desc">'+desc+'</p><div class="spotlight-actions"><button class="btn-spotlight-play" onclick="Modal.openFull('+item.id+',\''+type+'\')"><i class="fas fa-play"></i> Watch Now</button><button class="btn-spotlight-info" onclick="Modal.openQuick('+item.id+',\''+type+'\')"><i class="fas fa-info-circle"></i> More Info</button><button class="btn-spotlight-wl'+(isWL?' in-list':'')+'" onclick="Watchlist.toggleById('+item.id+',this,\''+type+'\',\''+safeTitle+'\',\''+poster+'\')" title="Watchlist"><i class="fas fa-heart"></i></button></div></div></div>'; }).join(''); }, renderDots: function(items){ if(!this.dotsEl) return; this.dotsEl.innerHTML = items.map(function(_,i){ return '<div class="spotlight-dot'+(i===0?' active':'')+'" onclick="Spotlight.goTo('+i+')"></div>'; }).join(''); }, renderThumbs: function(items){ if(!this.thumbEl) return; this.thumbEl.innerHTML = items.map(function(item,i){ var img=item.backdrop_path?CFG.IMG185+item.backdrop_path:''; var t=Utils.escape(item.title||item.name||''); return '<div class="spotlight-thumb'+(i===0?' active':'')+'" onclick="Spotlight.goTo('+i+')" title="'+t+'"><img src="'+img+'" alt="'+t+'" loading="lazy"/></div>'; }).join(''); }, activateSlide: function(idx){ this.current = idx; if(this.track) this.track.style.transform='translateX(-'+(idx*100)+'%)'; document.querySelectorAll('.spotlight-dot').forEach(function(d,i){ d.classList.toggle('active',i===idx); }); document.querySelectorAll('.spotlight-thumb').forEach(function(t,i){ t.classList.toggle('active',i===idx); }); document.querySelectorAll('.spotlight-slide').forEach(function(s,i){ s.classList.toggle('active',i===idx); }); this.resetProgress(); }, goTo: function(idx){ this.activateSlide(idx); this.restartAuto(); }, next: function(){ this.goTo((this.current+1)%this.total); }, prev: function(){ this.goTo((this.current-1+this.total)%this.total); }, startAuto: function(){ clearInterval(this.timer); var self=this; this.timer = setInterval(function(){ self.next(); }, CFG.SPOTLIGHT_INTERVAL); this.resetProgress(); }, restartAuto: function(){ this.startAuto(); }, resetProgress: function(){ if(!this.progBar) return; this.progBar.classList.remove('animating'); void this.progBar.offsetWidth; this.progBar.classList.add('animating'); } };

var Render = { posterCard: function(item, type){ if(!item) return ''; var mediaType=type||item.media_type||(item.title?'movie':'tv'); var title=item.title||item.name||'Untitled'; var year=Utils.year(item.release_date||item.first_air_date); var rating=item.vote_average?item.vote_average.toFixed(1):'N/A'; var img=item.poster_path?CFG.IMG342+item.poster_path:Utils.placeholder(); var genres=Utils.genreNames(item.genre_ids||[]); var isWL=State.watchlist.some(function(w){ return w.id===item.id; }); var isNew=item.release_date&&(new Date(item.release_date)>new Date(Date.now()-60*24*60*60*1000)); var safeT=Utils.escape(title); var poster=item.poster_path||''; return '<div class="poster-card" onclick="Modal.openFull('+item.id+',\''+mediaType+'\')"><div class="poster-card-img-wrap"><img class="poster-card-img" src="'+img+'" alt="'+safeT+'" loading="lazy" onerror="this.src=\''+Utils.placeholder()+'\'"/><div class="poster-card-grad"></div><div class="poster-card-top">'+(isNew?'<span class="pc-badge pc-badge-new">NEW</span>':'<span class="pc-badge pc-badge-quality">'+(mediaType==='tv'?'Series':'HD')+'</span>')+'<span class="pc-rating"><i class="fas fa-star"></i>'+rating+'</span></div><div class="pc-play-wrap"><div class="pc-play-btn"><i class="fas fa-play"></i></div></div><button class="pc-wl-btn'+(isWL?' in-list':'')+'" onclick="event.stopPropagation();Watchlist.toggleById('+item.id+',this,\''+mediaType+'\',\''+safeT+'\',\''+poster+'\')" title="Watchlist"><i class="fas fa-'+(isWL?'check':'heart')+'"></i></button></div><div class="poster-card-info"><div class="pc-title" title="'+safeT+'">'+title+'</div><div class="pc-meta"><span>'+year+'</span><span class="pc-meta-dot">&middot;</span><span class="pc-genre">'+(genres.split(',')[0]||mediaType)+'</span></div><div class="lv-extra"><button class="lv-btn lv-btn-play" onclick="event.stopPropagation();Modal.openFull('+item.id+',\''+mediaType+'\')"><i class="fas fa-play"></i> Watch</button><button class="lv-btn lv-btn-info" onclick="event.stopPropagation();Modal.openQuick('+item.id+',\''+mediaType+'\')"><i class="fas fa-info-circle"></i> Info</button></div></div></div>'; }, landscapeCard: function(item, type){ if(!item) return ''; var mediaType=type||item.media_type||(item.title?'movie':'tv'); var title=item.title||item.name||'Untitled'; var year=Utils.year(item.release_date||item.first_air_date); var rating=item.vote_average?item.vote_average.toFixed(1):'N/A'; var img=item.backdrop_path?CFG.IMG780+item.backdrop_path:(item.poster_path?CFG.IMG500+item.poster_path:Utils.placeholder()); var genres=Utils.genreNames(item.genre_ids||[]); return '<div class="landscape-card" onclick="Modal.openFull('+item.id+',\''+mediaType+'\')"><div class="lc-img-wrap"><img class="lc-img" src="'+img+'" alt="'+Utils.escape(title)+'" loading="lazy" onerror="this.src=\''+Utils.placeholder()+'\'"/><div class="lc-overlay"></div><div class="lc-top"><span class="pc-badge pc-badge-quality">'+(mediaType==='tv'?'Series':'Movie')+'</span><span class="pc-rating"><i class="fas fa-star"></i>'+rating+'</span></div><div class="lc-bottom"><div></div><div class="lc-play"><i class="fas fa-play"></i></div></div></div><div class="lc-info"><div class="lc-title">'+title+'</div><div class="lc-meta"><span>'+year+'</span><span> &middot; </span><span>'+genres+'</span></div></div></div>'; }, compactCard: function(item, rank, type){ if(!item) return ''; var mediaType=type||item.media_type||(item.title?'movie':'tv'); var title=item.title||item.name||'Untitled'; var year=Utils.year(item.release_date||item.first_air_date); var rating=item.vote_average?item.vote_average.toFixed(1):'N/A'; var img=item.poster_path?CFG.IMG185+item.poster_path:Utils.placeholder(); var genres=Utils.genreNames(item.genre_ids||[]); return '<div class="compact-card" onclick="Modal.openFull('+item.id+',\''+mediaType+'\')"><span class="compact-card-num">'+rank+'</span><img class="compact-card-img" src="'+img+'" alt="'+Utils.escape(title)+'" loading="lazy" onerror="this.src=\''+Utils.placeholder()+'\'"/><div class="compact-card-info"><div class="compact-card-title">'+title+'</div><div class="compact-card-meta">'+year+' &middot; '+(genres.split(',')[0]||mediaType)+'</div></div><div class="compact-card-right"><div class="compact-card-rating"><i class="fas fa-star"></i>'+rating+'</div><span style="font-size:11px;color:var(--text-4)">'+(mediaType==='tv'?'Series':'Movie')+'</span></div></div>'; }, hscrollRow: function(containerId, items, type){ var el=document.getElementById(containerId); if(!el) return; var html=''; for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], type); el.innerHTML=html; initDragScrollEl(el); }, grid: function(containerId, items, type, append){ var el=document.getElementById(containerId); if(!el) return; var html=''; for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], type||items[i].media_type); if(append) el.innerHTML+=html; else el.innerHTML=html; }, landscapeGrid: function(containerId, items, type){ var el=document.getElementById(containerId); if(!el) return; var html=''; for(var i=0;i<items.length;i++) html+=Render.landscapeCard(items[i], type); el.innerHTML=html; }, compactList: function(containerId, items, type){ var el=document.getElementById(containerId); if(!el) return; var html=''; for(var i=0;i<items.length;i++) html+=Render.compactCard(items[i], i+1, type); el.innerHTML=html; }, skeletons: function(containerId, count){ var el=document.getElementById(containerId); if(!el) return; var html=''; for(var i=0;i<(count||8);i++) html+='<div class="skel-poster"></div>'; el.innerHTML=html; } };

function initTrendingRibbon(){ API.trending('all',1).then(function(data){ if(!data||!data.results) return; var items=data.results.slice(0,15); var html=items.map(function(item,i){ var title=item.title||item.name||'Untitled'; var rating=item.vote_average?item.vote_average.toFixed(1):'N/A'; var type=item.media_type||(item.title?'movie':'tv'); return '<div class="tr-item" onclick="Modal.openFull('+item.id+',\''+type+'\')"><span class="tr-item-num">'+(i+1)+'</span><span class="tr-item-title">'+title+'</span><span class="tr-item-rating"><i class="fas fa-star"></i>'+rating+'</span></div>'; }).join(''); var scroll=document.getElementById('trending-scroll'); if(scroll) scroll.innerHTML=html+html; }); }

var App = { activePage:'home', showPage: function(pageId){
      // IPTV Stop Logic - Fix background playback when leaving Live TV
      try {
        if(this.activePage === 'page-livetv' && pageId !== 'page-livetv') {
          console.log('[IPTV] Leaving Live TV page, stopping playback');
          // Stop video element
          var tvPlayer = document.getElementById('tvPlayer');
          if(tvPlayer) {
            tvPlayer.pause();
            tvPlayer.removeAttribute('src');
            tvPlayer.load();
            try { tvPlayer.srcObject = null; } catch(e){}
          }
          // Destroy HLS player (bufferless fast loading)
          if(window.IPTV && IPTV.hlsPlayer) {
            try {
              IPTV.hlsPlayer.destroy();
              console.log('[IPTV] HLS player destroyed');
            } catch(e){ console.error('[IPTV] HLS destroy error', e); }
            IPTV.hlsPlayer = null;
          }
          // Clear loader
          var loader = document.getElementById('iptvLoader');
          if(loader) loader.style.display = 'flex';
          loader.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Select a channel to play';
          // Reset active channel UI
          document.querySelectorAll('.iptv-channel-card').forEach(function(el){ el.classList.remove('active'); });
          var activeName = document.getElementById('activeName');
          if(activeName) activeName.innerText = 'Select a channel';
        }
      } catch(e){ console.error('[IPTV] Stop error', e); }
      
      try{ if(pageId==='page-home'){ if(window.location.hash.indexOf('watch=')!==-1) Router.clear(); } else { if(window.location.hash.indexOf('watch=')!==-1){ window.location.hash='home'; try{ history.replaceState({},'',window.location.pathname+'#'+pageId.replace('page-','')); }catch(e){} } } }catch(e){} document.querySelectorAll('.cv-page').forEach(function(p){ p.classList.remove('active'); }); var pg = document.getElementById(pageId); if(pg) pg.classList.add('active'); this.activePage = pageId; window.scrollTo({top:0, behavior:'smooth'}); Sidebar.close(); }, setNavActive: function(navId){ document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); }); var el = document.getElementById(navId); if(el) el.classList.add('active'); }, setTitle: function(title, crumb){ var t=document.getElementById('header-page-title'); var c=document.getElementById('breadcrumb-current'); if(t) t.textContent=title; if(c) c.textContent=crumb||title; }, goHome: function(){ try{ Router.clear(); window.location.hash='home'; }catch(e){} 
      if(window.Filter) Filter.clearAll(false);
      this.showPage('page-home'); this.setNavActive('nav-home'); this.setTitle('Discover','Home');
      // V120: Sync Header All Button with Sidebar Home - Bidirectional!
      try{
        document.querySelectorAll('.hft-btn').forEach(function(b){ b.classList.remove('active'); });
        var ab = document.getElementById('htab-all'); if(ab) ab.classList.add('active');
        State.htabType='all'; State.browseType='all'; State.browseMode='popular'; State.browsePage=1;
        document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
        var nh = document.getElementById('nav-home'); if(nh) nh.classList.add('active');
      }catch(e){}
      if(typeof Home !== 'undefined' && Home.load) Home.load();
    }, browseMovies: function(){ try{ if(window.location.hash.indexOf('watch=')!==-1){ Router.clear(); } }catch(e){} 
      if(window.Filter) Filter.clearAll(false);
      State.browseType='movie'; State.browseMode='popular'; State.browsePage=1; 
      this.showPage('page-browse'); this.setNavActive('nav-movies'); this.setTitle('Movies','Movies');
      // V120: Sync Header Movies Button with Sidebar Movies - Bidirectional!
      try{
        document.querySelectorAll('.hft-btn').forEach(function(b){ b.classList.remove('active'); });
        var mb = document.getElementById('htab-movie'); if(mb) mb.classList.add('active');
        State.htabType='movie';
        document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
        var nm = document.getElementById('nav-movies'); if(nm) nm.classList.add('active');
      }catch(e){}
      Browse.load(true); 
    }, browseTV: function(){ return this.browseTVShows(); }, browseTVShows: function(){ try{ if(window.location.hash.indexOf('watch=')!==-1){ Router.clear(); } }catch(e){} 
      if(window.Filter) Filter.clearAll(false);
      State.browseType='tv'; State.browseMode='popular'; State.browsePage=1; 
      this.showPage('page-browse'); this.setNavActive('nav-tv'); this.setTitle('TV Shows','TV Shows');
      // V120: Sync Header TV Shows Button with Sidebar TV Shows - Bidirectional!
      try{
        document.querySelectorAll('.hft-btn').forEach(function(b){ b.classList.remove('active'); });
        var tb = document.getElementById('htab-tv'); if(tb) tb.classList.add('active');
        State.htabType='tv';
        document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
        var nt = document.getElementById('nav-tv'); if(nt) nt.classList.add('active');
      }catch(e){}
      Browse.load(true); 
    }, browseTrending: function(){ try{ if(window.location.hash.indexOf('watch=')!==-1){ Router.clear(); } }catch(e){}  if(window.Filter) Filter.clearAll(false);
      State.browseType='all'; State.browseMode='trending'; State.browsePage=1; this.showPage('page-browse'); this.setNavActive('nav-trending'); this.setTitle('Trending','Trending');
      document.querySelectorAll('.hft-btn').forEach(function(b){ b.classList.remove('active'); });
      var ab = document.getElementById('htab-all'); if(ab) ab.classList.add('active');
      State.htabType='all'; Browse.load(true); }, browseTopRated: function(){ try{ if(window.location.hash.indexOf('watch=')!==-1){ Router.clear(); } }catch(e){}  if(window.Filter) Filter.clearAll(false);
      State.browseType='all'; State.browseMode='toprated'; State.browsePage=1; this.showPage('page-browse'); this.setNavActive('nav-toprated'); this.setTitle('Top Rated','Top Rated'); Browse.load(true); }, browseUpcoming: function(){ try{ if(window.location.hash.indexOf('watch=')!==-1){ Router.clear(); } }catch(e){}  if(window.Filter) Filter.clearAll(false);
      State.browseType='all'; State.browseMode='upcoming'; State.browsePage=1; this.showPage('page-browse'); this.setNavActive('nav-upcoming'); this.setTitle('Upcoming','Upcoming'); Browse.load(true); }, showWatchlist: function(){ try{ if(window.location.hash.indexOf('watch=')!==-1){ Router.clear(); } }catch(e){}  this.showPage('page-watchlist'); this.setNavActive('nav-watchlist'); this.setTitle('Watchlist','My Watchlist'); Watchlist.render(); }, showHistory: function(){ try{ if(window.location.hash.indexOf('watch=')!==-1){ Router.clear(); } }catch(e){}  this.showPage('page-history'); this.setNavActive('nav-history'); this.setTitle('History','Watch History'); History.render(); }, showLiveTV: function(){ try{ if(window.location.hash.indexOf('watch=')!==-1){ Router.clear(); } }catch(e){}  this.showPage('page-livetv'); this.setNavActive('nav-livetv'); this.setTitle('Live TV','Live TV'); try{ if(window.LiveTV && LiveTV.onPageShown) LiveTV.onPageShown(); }catch(e){} } };

var Browse = { reset: function(){ State.browsePage=1; var g=document.getElementById('browse-grid'); if(g) g.innerHTML=''; var fc=document.getElementById('filter-count'); if(fc) fc.textContent='...'; }, load: function(reset){ if(State.isLoading) return; if(reset) this.reset(); State.isLoading=true; Prog.start(); if(reset) Render.skeletons('browse-grid',20); var type=State.browseType==='all'?'movie':State.browseType; var mode=State.browseMode; var pg=State.browsePage; var promise; 
      // V118 FIX: If filter is active, use filter params instead of trending/toprated
      if(State.filterActive && State.filterParams){
        var fp = State.filterParams;
        var fParams = { sort_by: fp.sort || 'popularity.desc', page: pg };
        if(fp.genre) fParams.with_genres = fp.genre;
        if(fp.lang) fParams.with_original_language = fp.lang;
        if(fp.year && fp.year.length===4){
          // V202 FIX - Year filter: movie=primary_release_year, tv=first_air_date_year
          if(type==='tv') fParams.first_air_date_year = fp.year;
          else fParams.primary_release_year = fp.year;
        }
        promise = API.discover(type, fParams);
      } else if(mode==='trending'){
        // V118: Trending Mixed Hollywood + Bollywood + South Indian
        if(State.browseType==='all'){
          // Mixed trending - fetch parallel
          Promise.all([
            API.trending('movie', pg),
            API.discover('movie', {with_original_language: 'hi', sort_by: 'popularity.desc', page: pg}),
            API.discover('movie', {with_original_language: 'te', sort_by: 'popularity.desc', page: pg}),
            API.discover('movie', {with_original_language: 'ta', sort_by: 'popularity.desc', page: pg})
          ]).then(function(res){
            var combined = [];
            if(res[0] && res[0].results) combined = combined.concat(res[0].results.slice(0,10));
            if(res[1] && res[1].results) combined = combined.concat(res[1].results.slice(0,6));
            if(res[2] && res[2].results) combined = combined.concat(res[2].results.slice(0,3));
            if(res[3] && res[3].results) combined = combined.concat(res[3].results.slice(0,3));
            for(var i=combined.length-1; i>0; i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=combined[i]; combined[i]=combined[j]; combined[j]=tmp; }
            var data = { results: combined, total_pages: 10, total_results: combined.length*50 };
            // Render directly
            var gridEl=document.getElementById('browse-grid');
            if(!gridEl){ State.isLoading=false; Prog.done(); return; }
            var items=data.results.filter(function(r){ return r.poster_path; });
            State.browseTotalPages=data.total_pages||1;
            var fc=document.getElementById('filter-count');
            if(fc) fc.textContent=items.length + ' mixed';
            if(reset) gridEl.innerHTML='';
            var html='';
            for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], type==='all'?items[i].media_type||'movie':type);
            gridEl.innerHTML+=html;
            ViewToggle.applyClass();
            var lm=document.getElementById('btn-load-more');
            if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex';
            State.isLoading=false; Prog.done();
          });
          return;
        } else {
          promise=API.trending(State.browseType, pg);
        }
      } else if(mode==='toprated'){
        if(State.browseType==='all'){
          // V119 FIX: Top Rated - Rating Highest First + Mixed Balanced + Movie + Series
          Promise.all([
            API.topRated('movie', pg),
            API.topRated('tv', pg),
            API.discover('movie', {with_original_language: 'hi', sort_by: 'vote_average.desc', 'vote_count.gte': 100, page: pg}),
            API.discover('movie', {with_original_language: 'te', sort_by: 'vote_average.desc', 'vote_count.gte': 50, page: pg}),
            API.discover('movie', {with_original_language: 'ta', sort_by: 'vote_average.desc', 'vote_count.gte': 50, page: pg}),
            API.discover('movie', {with_original_language: 'ur', sort_by: 'vote_average.desc', 'vote_count.gte': 10, page: pg})
          ]).then(function(res){
            var combined = [];
            if(res[0] && res[0].results) combined = combined.concat(res[0].results.slice(0,6));
            if(res[1] && res[1].results) combined = combined.concat(res[1].results.slice(0,4));
            if(res[2] && res[2].results) combined = combined.concat(res[2].results.slice(0,5));
            if(res[3] && res[3].results) combined = combined.concat(res[3].results.slice(0,3));
            if(res[4] && res[4].results) combined = combined.concat(res[4].results.slice(0,2));
            if(res[5] && res[5].results) combined = combined.concat(res[5].results.slice(0,2));
            
            // V119: Sort by rating highest first (8.9, 8.8, 8.7...)
            combined.sort(function(a,b){
              return (b.vote_average||0) - (a.vote_average||0);
            });
            
            // Balanced: Ensure movie + series mix in top
            var topMovies = combined.filter(function(r){ return r.title; }).slice(0,10);
            var topTV = combined.filter(function(r){ return r.name && !r.title; }).slice(0,6);
            var balanced = topMovies.slice(0,6).concat(topTV.slice(0,3)).concat(topMovies.slice(6,10));
            balanced.sort(function(a,b){ return (b.vote_average||0) - (a.vote_average||0); });
            
            console.log('[V119] Top Rated Sorted:', balanced.slice(0,5).map(function(x){ return (x.title||x.name) + ' ' + x.vote_average; }));
            
            var data = { results: balanced, total_pages: 5, total_results: 50000 };
            var gridEl=document.getElementById('browse-grid');
            if(!gridEl){ State.isLoading=false; Prog.done(); return; }
            var items=data.results.filter(function(r){ return r.poster_path; });
            State.browseTotalPages=data.total_pages||1;
            var fc=document.getElementById('filter-count');
            if(fc) fc.textContent=items.length + ' top rated';
            if(reset) gridEl.innerHTML='';
            var html='';
            for(var i=0;i<items.length;i++){
              var mt = items[i].title ? 'movie' : 'tv';
              html+=Render.posterCard(items[i], mt);
            }
            gridEl.innerHTML+=html;
            ViewToggle.applyClass();
            var lm=document.getElementById('btn-load-more');
            if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex';
            State.isLoading=false; Prog.done();
          });
          return;
        } else {
          // For movie or tv specific, sort by rating
          var p = type==='movie' ? API.topRated('movie', pg) : API.topRated('tv', pg);
          p.then(function(data){
            if(data && data.results){
              data.results.sort(function(a,b){ return (b.vote_average||0) - (a.vote_average||0); });
            }
            var gridEl=document.getElementById('browse-grid');
            if(!gridEl){ State.isLoading=false; Prog.done(); return; }
            var items=data.results.filter(function(r){ return r.poster_path; });
            State.browseTotalPages=data.total_pages||1;
            var fc=document.getElementById('filter-count');
            if(fc) fc.textContent=data.total_results?Utils.fmt(data.total_results):items.length;
            if(reset) gridEl.innerHTML='';
            var html='';
            for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], type);
            gridEl.innerHTML+=html;
            ViewToggle.applyClass();
            var lm=document.getElementById('btn-load-more');
            if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex';
            State.isLoading=false; Prog.done();
          });
          return;
        }
      } else if(mode==='upcoming'){
        if(State.browseType==='all'){
          // V119 FIX: Upcoming - Only Future Releases, No 1995, 2009, Pakistani Added
          var today = new Date().toISOString().split('T')[0];
          Promise.all([
            API.upcoming(pg),
            API.discover('movie', {with_original_language: 'hi', sort_by: 'primary_release_date.asc', 'primary_release_date.gte': today, page: pg}),
            API.discover('movie', {with_original_language: 'te', sort_by: 'primary_release_date.asc', 'primary_release_date.gte': today, page: pg}),
            API.discover('movie', {with_original_language: 'ta', sort_by: 'primary_release_date.asc', 'primary_release_date.gte': today, page: pg}),
            API.discover('movie', {with_original_language: 'ur', sort_by: 'primary_release_date.asc', 'primary_release_date.gte': '2024-01-01', page: pg}),
            API.discover('movie', {with_original_language: 'bn', sort_by: 'primary_release_date.asc', 'primary_release_date.gte': today, page: pg})
          ]).then(function(res){
            var combined = [];
            // Filter only future releases (>= today), exclude old like 1995, 2009
            function isFuture(m){
              var d = m.release_date || m.first_air_date || '';
              return d >= today && d <= '2027-12-31';
            }
            if(res[0] && res[0].results) combined = combined.concat(res[0].results.filter(isFuture).slice(0,6));
            if(res[1] && res[1].results) combined = combined.concat(res[1].results.filter(isFuture).slice(0,5));
            if(res[2] && res[2].results) combined = combined.concat(res[2].results.filter(isFuture).slice(0,3));
            if(res[3] && res[3].results) combined = combined.concat(res[3].results.filter(isFuture).slice(0,2));
            if(res[4] && res[4].results) combined = combined.concat(res[4].results.filter(function(m){ return (m.release_date||'') >= '2024-06-01'; }).slice(0,2));
            if(res[5] && res[5].results) combined = combined.concat(res[5].results.filter(isFuture).slice(0,2));
            
            // If not enough future, use upcoming API results which are already future
            if(combined.length < 5){
              if(res[0] && res[0].results) combined = res[0].results.slice(0,10);
            }
            
            // Sort by release date ascending (nearest upcoming first)
            combined.sort(function(a,b){
              var da = a.release_date || a.first_air_date || '2026-12-31';
              var db = b.release_date || b.first_air_date || '2026-12-31';
              return da.localeCompare(db);
            });
            
            // Strict: Remove old movies like 1995, 2009
            combined = combined.filter(function(m){
              var d = m.release_date || m.first_air_date || '';
              return d >= '2024-01-01'; // No 1995, 2009
            });
            
            console.log('[V119] Upcoming Future Only:', combined.slice(0,5).map(function(x){ return (x.title||x.name) + ' ' + (x.release_date||x.first_air_date); }));
            
            var data = { results: combined, total_pages: 5, total_results: combined.length*20 };
            var gridEl=document.getElementById('browse-grid');
            if(!gridEl){ State.isLoading=false; Prog.done(); return; }
            var items=data.results.filter(function(r){ return r.poster_path; });
            State.browseTotalPages=data.total_pages||1;
            var fc=document.getElementById('filter-count');
            if(fc) fc.textContent=items.length + ' upcoming';
            if(reset) gridEl.innerHTML='';
            var html='';
            for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], 'movie');
            gridEl.innerHTML+=html;
            ViewToggle.applyClass();
            var lm=document.getElementById('btn-load-more');
            if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex';
            State.isLoading=false; Prog.done();
          });
          return;
        } else {
          // For specific type, also filter future only
          var today = new Date().toISOString().split('T')[0];
          if(type==='movie'){
            API.discover('movie', {sort_by: 'primary_release_date.asc', 'primary_release_date.gte': today, page: pg}).then(function(data){
              var items = data.results.filter(function(r){ return r.poster_path && (r.release_date||'') >= today; });
              var gridEl=document.getElementById('browse-grid');
              if(!gridEl){ State.isLoading=false; Prog.done(); return; }
              State.browseTotalPages=data.total_pages||1;
              var fc=document.getElementById('filter-count');
              if(fc) fc.textContent=items.length + ' upcoming';
              if(reset) gridEl.innerHTML='';
              var html='';
              for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], 'movie');
              gridEl.innerHTML+=html;
              ViewToggle.applyClass();
              var lm=document.getElementById('btn-load-more');
              if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex';
              State.isLoading=false; Prog.done();
            });
          } else {
            API.discover('tv', {sort_by: 'first_air_date.asc', 'first_air_date.gte': today, page: pg}).then(function(data){
              var items = data.results.filter(function(r){ return r.poster_path && (r.first_air_date||'') >= today; });
              var gridEl=document.getElementById('browse-grid');
              if(!gridEl){ State.isLoading=false; Prog.done(); return; }
              State.browseTotalPages=data.total_pages||1;
              var fc=document.getElementById('filter-count');
              if(fc) fc.textContent=items.length + ' upcoming';
              if(reset) gridEl.innerHTML='';
              var html='';
              for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], 'tv');
              gridEl.innerHTML+=html;
              ViewToggle.applyClass();
              var lm=document.getElementById('btn-load-more');
              if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex';
              State.isLoading=false; Prog.done();
            });
          }
          return;
        }
      } else {
        // V119 FIX: Movies Page Mixed - Hollywood + Bollywood + South Indian + Pakistani
        if(type==='movie' && mode==='popular'){
          Promise.all([
            API.popular('movie', pg),
            API.discover('movie', {with_original_language: 'hi', sort_by: 'popularity.desc', page: pg}),
            API.discover('movie', {with_original_language: 'te', sort_by: 'popularity.desc', page: pg}),
            API.discover('movie', {with_original_language: 'ta', sort_by: 'popularity.desc', page: pg}),
            API.discover('movie', {with_original_language: 'ur', sort_by: 'popularity.desc', page: pg}),
            API.discover('movie', {with_original_language: 'bn', sort_by: 'popularity.desc', page: pg})
          ]).then(function(res){
            var combined = [];
            if(res[0] && res[0].results) combined = combined.concat(res[0].results.slice(0,8));
            if(res[1] && res[1].results) combined = combined.concat(res[1].results.slice(0,6));
            if(res[2] && res[2].results) combined = combined.concat(res[2].results.slice(0,3));
            if(res[3] && res[3].results) combined = combined.concat(res[3].results.slice(0,3));
            if(res[4] && res[4].results) combined = combined.concat(res[4].results.slice(0,2));
            if(res[5] && res[5].results) combined = combined.concat(res[5].results.slice(0,2));
            for(var i=combined.length-1; i>0; i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=combined[i]; combined[i]=combined[j]; combined[j]=tmp; }
            var data = { results: combined, total_pages: 20, total_results: 1200000 };
            var gridEl=document.getElementById('browse-grid');
            if(!gridEl){ State.isLoading=false; Prog.done(); return; }
            var items=data.results.filter(function(r){ return r.poster_path; });
            State.browseTotalPages=data.total_pages||1;
            var fc=document.getElementById('filter-count');
            if(fc) fc.textContent='1.2M+ mixed';
            if(reset) gridEl.innerHTML='';
            var html='';
            for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], 'movie');
            gridEl.innerHTML+=html;
            ViewToggle.applyClass();
            var lm=document.getElementById('btn-load-more');
            if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex';
            State.isLoading=false; Prog.done();
          });
          return;
        } else if(type==='tv' && mode==='popular'){
          // V119 FIX: TV Shows Page Mixed - Hollywood + Bollywood Hindi TV + Pakistani + South Indian TV
          Promise.all([
            API.popular('tv', pg),
            API.discover('tv', {with_original_language: 'hi', sort_by: 'popularity.desc', page: pg}),
            API.discover('tv', {with_original_language: 'ur', sort_by: 'popularity.desc', page: pg}),
            API.discover('tv', {with_original_language: 'en', sort_by: 'popularity.desc', page: pg})
          ]).then(function(res){
            var combined = [];
            if(res[0] && res[0].results) combined = combined.concat(res[0].results.slice(0,10));
            if(res[1] && res[1].results) combined = combined.concat(res[1].results.slice(0,4));
            if(res[2] && res[2].results) combined = combined.concat(res[2].results.slice(0,3));
            // Add some Indian TV from movie discover that are actually series (first_air_date check)
            if(res[3] && res[3].results){
              var tvFromEn = res[3].results.filter(function(r){ return r.first_air_date; }).slice(0,3);
              combined = combined.concat(tvFromEn);
            }
            for(var i=combined.length-1; i>0; i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=combined[i]; combined[i]=combined[j]; combined[j]=tmp; }
            var data = { results: combined, total_pages: 15, total_results: 230000 };
            var gridEl=document.getElementById('browse-grid');
            if(!gridEl){ State.isLoading=false; Prog.done(); return; }
            var items=data.results.filter(function(r){ return r.poster_path && !r.title; }); // Only TV (no title, only name)
            if(items.length < 5) items = data.results.filter(function(r){ return r.poster_path; });
            State.browseTotalPages=data.total_pages||1;
            var fc=document.getElementById('filter-count');
            if(fc) fc.textContent='230K+ mixed';
            if(reset) gridEl.innerHTML='';
            var html='';
            for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], 'tv');
            gridEl.innerHTML+=html;
            ViewToggle.applyClass();
            var lm=document.getElementById('btn-load-more');
            if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex';
            State.isLoading=false; Prog.done();
          });
          return;
        } else {
          promise=API.popular(type, pg);
        }
      } promise.then(function(data){ var gridEl=document.getElementById('browse-grid'); if(!gridEl){ State.isLoading=false; Prog.done(); return; } if(data && data.results){ var items=data.results.filter(function(r){ return r.poster_path; }); State.browseTotalPages=data.total_pages||1; var fc=document.getElementById('filter-count'); if(fc) fc.textContent=data.total_results?Utils.fmt(data.total_results):items.length; if(reset) gridEl.innerHTML=''; var html=''; for(var i=0;i<items.length;i++) html+=Render.posterCard(items[i], type==='all'?items[i].media_type:type); gridEl.innerHTML+=html; ViewToggle.applyClass(); } else { if(reset) gridEl.innerHTML='<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-film"></i></div><div class="empty-state-title">No content found</div><div class="empty-state-sub">Check your API key or try again</div></div>'; } var lm=document.getElementById('btn-load-more'); if(lm) lm.style.display=State.browsePage>=State.browseTotalPages?'none':'inline-flex'; State.isLoading=false; Prog.done(); }); }, loadMore: function(){ if(State.browsePage>=State.browseTotalPages||State.isLoading) return; State.browsePage++; this.load(false); }, byGenre: function(genreId, genreName){ State.browseType='movie'; State.browseMode='popular'; var fg=document.getElementById('filter-genre'); if(fg) fg.value=genreId; App.showPage('page-browse'); App.setTitle(genreName, genreName); Filter.apply(); }, initInfiniteScroll: function(){ var sentinel=document.getElementById('load-more-wrap'); if(!sentinel) return; var obs=new IntersectionObserver(function(entries){ if(entries[0].isIntersecting && !State.isLoading && App.activePage==='page-browse'){ Browse.loadMore(); } }, {rootMargin:'400px'}); obs.observe(sentinel); } };

var Filter = {
  // Movie to TV genre mapping for strict filter
  getAllowedGenres: function(genreId){
    var map = {
      '28': [28,10759], '12': [12,10759], '35': [35], '80': [80], '99': [99], '10764': [10764],
      '18': [18], '10751': [10751], '14': [14], '36': [36], '27': [27],
      '10402': [10402], '9648': [9648], '10749': [10749], '878': [878,10765],
      '10770': [10770], '53': [53], '10752': [10752], '37': [37], '16': [16]
    };
    var gid = String(genreId);
    return map[gid] || [parseInt(gid)];
  },
  apply: function(){
    var genreEl = document.getElementById('filter-genre');
    var genre = genreEl ? genreEl.value : '';
    var yearEl = document.getElementById('filter-year');
    var year = yearEl ? yearEl.value : '';
    var langEl = document.getElementById('filter-lang');
    var lang = langEl ? langEl.value : '';
    var sortEl = document.getElementById('filter-sort');
    var sort = sortEl ? sortEl.value : 'popularity.desc';
    
    this.renderActiveTags(genre, year, lang);
    
    // V118 FIX: Store filter state for strict filtering and pagination
    State.filterActive = !!(genre || year || lang);
    State.filterParams = { genre: genre, year: year, lang: lang, sort: sort };
    State.browsePage = 1;
    
    var type = State.browseType === 'all' ? 'movie' : State.browseType;
    if(type==='all') type='movie';
    var allowedGenres = genre ? this.getAllowedGenres(genre) : null;
    
    var params = { sort_by: sort, page: 1 };
    if(genre) params.with_genres = genre;
    if(lang) params.with_original_language = lang;
    if(year && year.length === 4){
      // V202 FIX - Year filter: TV shows use first_air_date_year, Movies use primary_release_year
      var currentType = (State && State.browseType) ? State.browseType : type;
      if(currentType==='tv') params.first_air_date_year = year;
      else params.primary_release_year = year;
    }
    
    // V118 FIX: For language filter, also filter by original_language strict
    if(lang){
      console.log('[V118 Filter] Strict Language Filter:', lang);
    }
    
    Prog.start();
    var self = this;
    
    // Use discover API
    API.discover(type, params).then(function(data){
      if(!data || !data.results){
        Prog.done();
        return;
      }
      var items = data.results.filter(function(r){ return r.poster_path; });
      
      // V118 STRICT CLIENT-SIDE FILTER - Language + Genre
      if(allowedGenres && allowedGenres.length > 0){
        var filtered = [];
        for(var i=0;i<items.length;i++){
          var item = items[i];
          var gids = item.genre_ids || [];
          var hasGenre = false;
          for(var a=0;a<allowedGenres.length;a++){
            if(gids.indexOf(allowedGenres[a]) !== -1){
              hasGenre = true;
              break;
            }
          }
          if(hasGenre) filtered.push(item);
        }
        items = filtered;
      }
      
      // V118 STRICT LANGUAGE FILTER - Only show selected language
      if(lang){
        var langFiltered = [];
        for(var i=0;i<items.length;i++){
          var it = items[i];
          var origLang = it.original_language || '';
          if(origLang === lang){
            langFiltered.push(it);
          }
        }
        // If TMDB API didn't filter enough, use strict
        if(langFiltered.length > 0){
          items = langFiltered;
          console.log('[V118] Language Strict Filter:', lang, 'Result:', items.length);
        }
      }
      
      var countEl = document.getElementById('filter-count');
      if(countEl){
        countEl.textContent = items.length + ' filtered / ' + (data.total_results ? Utils.fmt(data.total_results) + ' total' : '');
      }
      
      var gridEl = document.getElementById('browse-grid');
      if(!items.length){
        if(gridEl) gridEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-filter"></i></div><div class="empty-state-title">No results for this filter</div><div class="empty-state-sub">Try a different genre</div></div>';
      } else {
        Render.grid('browse-grid', items, type, false);
      }
      ViewToggle.applyClass();
      Prog.done();
    });
  },
  renderActiveTags: function(genre, year, lang){
    var wrap = document.getElementById('active-filters');
    if(!wrap) return;
    var tags = [];
    var gg = document.getElementById('filter-genre');
    if(genre && gg && gg.selectedIndex >=0) tags.push({label: 'Genre: ' + gg.options[gg.selectedIndex].text, key: 'genre'});
    if(year) tags.push({label: 'Year: ' + year, key: 'year'});
    if(lang) tags.push({label: 'Lang: ' + Utils.langName(lang), key: 'lang'});
    var html = '';
    for(var i=0;i<tags.length;i++){
      html += '<div class="active-filter-tag">' + tags[i].label + '<span class="aft-remove" onclick="Filter.removeTag(\'' + tags[i].key + '\')"><i class="fas fa-times"></i></span></div>';
    }
    wrap.innerHTML = html;
  },
  removeTag: function(key){
    var map = {genre: 'filter-genre', year: 'filter-year', lang: 'filter-lang'};
    var el = document.getElementById(map[key]);
    if(el) el.value = '';
    this.apply();
  },
  clearAll: function(apply){
    var genreEl = document.getElementById('filter-genre');
    var yearEl = document.getElementById('filter-year');
    var langEl = document.getElementById('filter-lang');
    var sortEl = document.getElementById('filter-sort');
    if(genreEl) genreEl.value = '';
    if(yearEl) yearEl.value = '';
    if(langEl) langEl.value = '';
    if(sortEl) sortEl.value = 'popularity.desc';
    State.filterActive = false;
    State.filterParams = null;
    var wrap = document.getElementById('active-filters');
    if(wrap) wrap.innerHTML = '';
    if(apply !== false){
      // Don't auto apply when clearing from nav
    }
    console.log('[V118] Filter Cleared');
  }
};

var ViewToggle = { set: function(mode, btn){ State.currentView=mode; document.querySelectorAll('.vt-btn').forEach(function(b){ b.classList.remove('active'); }); if(btn) btn.classList.add('active'); this.applyClass(); }, applyClass: function(){ var grid=document.getElementById('browse-grid'); if(grid) grid.classList.toggle('list-view', State.currentView==='list'); } };

var Modal = { overlay:null, qv:null, fv:null, init: function(){ this.overlay=document.getElementById('modal-overlay'); this.qv=document.getElementById('qv-modal'); this.fv=document.getElementById('fv-modal'); }, overlayClick: function(e){ if(e.target===this.overlay) this.closeAll(); }, closeAll: function(){ if(this.overlay) this.overlay.classList.remove('open'); document.body.style.overflow=''; var player=document.getElementById('main-player'); if(player) player.src=''; if(this.fv) this.fv.classList.remove('open'); }, open: function(){ if(this.overlay) this.overlay.classList.add('open'); document.body.style.overflow='hidden'; }, openQuick: function(id, type){ State.activeId=id; State.activeType=type; Prog.start(); API.detail(id, type).then(function(data){ if(!data){ Prog.done(); return; } State.activeData=data; var title=data.title||data.name||''; try{ console.log('[openQuick] pushing', id, type, title); Router.push(id, type, title); }catch(e){}  var year=Utils.year(data.release_date||data.first_air_date); var rating=data.vote_average?data.vote_average.toFixed(1):'N/A'; var runtime=type==='movie'?Utils.runtime(data.runtime):((data.number_of_seasons||1)+' Season(s)'); var lang=Utils.langName(data.original_language); var genres=(data.genres||[]).map(function(g){ return g.name; }).join(' &middot; '); var desc=Utils.clamp(data.overview,200); var backdrop=data.backdrop_path?CFG.IMG780+data.backdrop_path:Utils.placeholder(); var set=function(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }; document.getElementById('qv-backdrop').src=backdrop; set('qv-title', title); set('qv-rating', rating); set('qv-year', year); set('qv-runtime',runtime); set('qv-lang', lang); set('qv-desc', data.overview||''); var tagsEl=document.getElementById('qv-tags'); if(tagsEl) tagsEl.innerHTML=genres.split(' &middot; ').map(function(g){ return '<span class="qv-tag">'+g+'</span>'; }).join(''); var isWL=State.watchlist.some(function(w){ return w.id===id; }); var wlBtn=document.getElementById('qv-wl-btn'); if(wlBtn){ wlBtn.classList.toggle('in-list',isWL); wlBtn.querySelector('i').className='fas fa-'+(isWL?'check':'heart'); } if(Modal.fv) Modal.fv.classList.remove('open'); if(Modal.qv) Modal.qv.style.display='flex'; if(Modal.fv) Modal.fv.style.display='none'; Modal.open(); Prog.done(); }); }, upgradeToFull: function(){ if(State.activeId) this.openFull(State.activeId, State.activeType); }, openFull: function(id, type){ State.activeId=id; State.activeType=type; try{ console.log('[openFull] pushing loading', id, type); Router.push(id, type, 'watch-'+id); }catch(e){} Prog.start(); API.detail(id, type).then(function(data){ if(!data){ Prog.done(); Toast.show('Failed to load details. Check API key.','error'); return; } State.activeData=data; var title=data.title||data.name||''; try{ console.log('[openFull] pushing title', id, type, title); Router.push(id, type, title); }catch(e){}  var year=Utils.year(data.release_date||data.first_air_date); var rating=data.vote_average?data.vote_average.toFixed(1):'N/A'; var runtime=type==='movie'?Utils.runtime(data.runtime):((data.number_of_seasons||1)+' Season(s)'); var lang=Utils.langName(data.original_language); var genres=(data.genres||[]).map(function(g){ return g.name; }).join(', '); var director=''; var crew=(data.credits&&data.credits.crew)||[]; for(var i=0;i<crew.length;i++){ if(crew[i].job==='Director'){ director=crew[i].name; break; } } var votes=Utils.fmt(data.vote_count); var poster=data.poster_path?CFG.IMG342+data.poster_path:Utils.placeholder(); var backdrop=data.backdrop_path?CFG.ORIG+data.backdrop_path:Utils.placeholder(); document.getElementById('fv-backdrop').src=backdrop; document.getElementById('fv-poster').src=poster; var set=function(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }; set('fv-title', title); set('fv-rating', rating); set('fv-year', year); set('fv-lang', lang.toUpperCase().slice(0,2)); set('fv-desc', data.overview||''); set('fv-director', director||'N/A'); set('fv-genre', genres||'N/A'); set('fv-runtime', runtime); set('fv-lang-detail',lang); set('fv-status', data.status||'N/A'); set('fv-votes', votes); var isWL=State.watchlist.some(function(w){ return w.id===id; }); var wlBtn=document.getElementById('fv-wl-btn'); if(wlBtn){ wlBtn.classList.toggle('active-wl',isWL); wlBtn.querySelector('i').className='fas fa-'+(isWL?'check':'heart'); } var cast=((data.credits&&data.credits.cast)||[]).slice(0,20); var castHtml=''; for(var c=0;c<cast.length;c++){ var cm=cast[c]; var cimg=cm.profile_path?CFG.IMG185+cm.profile_path:Utils.placeholder(); castHtml+='<div class="cast-card"><img class="cast-avatar" src="'+cimg+'" alt="'+Utils.escape(cm.name)+'" loading="lazy" onerror="this.src=\''+Utils.placeholder()+'\'"/><div class="cast-name" title="'+Utils.escape(cm.name)+'">'+cm.name+'</div><div class="cast-role" title="'+Utils.escape(cm.character||'Actor')+'">'+(cm.character||'Actor')+'</div></div>'; } var castEl=document.getElementById('fv-cast'); if(castEl) castEl.innerHTML=castHtml; var related=((data.similar&&data.similar.results)||[]).filter(function(r){ return r.poster_path; }).slice(0,12); var relHtml=''; for(var r=0;r<related.length;r++){ var ri=related[r]; relHtml+='<div class="fv-related-card" onclick="Modal.openFull('+ri.id+',\''+type+'\')"><img src="'+CFG.IMG342+ri.poster_path+'" alt="'+Utils.escape(ri.title||ri.name||'')+'" loading="lazy"/><div class="fv-related-title">'+(ri.title||ri.name||'')+'</div></div>'; } var relEl=document.getElementById('fv-related'); if(relEl) relEl.innerHTML=relHtml; Player.initServers(); var epRow=document.getElementById('ep-row'); if(epRow){ if(type==='tv'){ epRow.classList.remove('hidden'); var seasons=data.number_of_seasons||1; var seasHtml='', epHtml=''; for(var s=1;s<=seasons;s++) seasHtml+='<option value="'+s+'">Season '+s+'</option>'; for(var e=1;e<=20;e++) epHtml+='<option value="'+e+'">Episode '+e+'</option>'; var sEl=document.getElementById('ep-season'), eEl=document.getElementById('ep-episode'); if(sEl) sEl.innerHTML=seasHtml; if(eEl) eEl.innerHTML=epHtml; var goBtn=document.getElementById('btn-ep-go'); if(goBtn) goBtn.onclick=Player.loadVideo; } else { epRow.classList.add('hidden'); } } FVTabs.showTab('overview', document.querySelector('[data-tab="overview"]')); History.add(id, type, title, data.poster_path, year); if(Modal.qv) Modal.qv.style.display='none'; if(Modal.fv){ Modal.fv.style.display='block'; Modal.fv.classList.add('open'); Modal.fv.scrollTop=0; } Modal.open(); Prog.done(); }); } };

var FVTabs = { showTab: function(tabName, el, skipAutoLoad){
  document.querySelectorAll('.fv-tab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('.fv-tab-pane').forEach(function(p){ p.classList.remove('active'); });
  if(el) el.classList.add('active');
  var pane=document.getElementById('tab-'+tabName);
  if(pane) pane.classList.add('active');
  if(tabName==='watch' && !skipAutoLoad){
    Player.loadVideo();
  }
  if(tabName!=='watch'){
    State.isTrailerPlaying=false;
  }
} };

var Player = {
  initServers: function(){
    State.activeServer=0;
    var html='';
    for(var i=0;i<CFG.SERVERS.length;i++){
      var s=CFG.SERVERS[i];
      html+='<div class="server-tab'+(i===0?' active':'')+'" onclick="Player.switchServer('+i+')"><i class="fas '+s.icon+'"></i>'+s.name+'</div>';
    }
    var st=document.getElementById('server-tabs');
    if(st) st.innerHTML=html;
  },
  switchServer: function(idx){
    State.isTrailerPlaying=false;
    State.activeServer=idx;
    document.querySelectorAll('.server-tab').forEach(function(t,i){ t.classList.toggle('active',i===idx); });
    this.loadVideo();
  },
  playMovie: function(){
    State.isTrailerPlaying=false;
    var fvModal = document.getElementById('fv-modal');
    var playerModal = document.getElementById('fv-player-modal');
    if(fvModal){
      fvModal.style.display='none';
      fvModal.classList.remove('open');
    }
    if(playerModal){
      playerModal.style.display='flex';
      playerModal.classList.add('open');
    }
    var html='';
    for(var i=0;i<CFG.SERVERS.length;i++){
      var s=CFG.SERVERS[i];
      html+='<div class="server-tab'+(i===0?' active':'')+'" onclick="Player.switchServer('+i+')"><i class="fas '+s.icon+'"></i>'+s.name+'</div>';
    }
    var stPlayer=document.getElementById('server-tabs-player');
    var stMain=document.getElementById('server-tabs');
    if(stPlayer) stPlayer.innerHTML=html;
    if(stMain) stMain.innerHTML=html;
    this.loadVideo();
    if(window.Toast) Toast.show('Loading movie...','success');
  },
  loadVideo: function(){
    State.isTrailerPlaying=false;
    var id=State.activeId; var type=State.activeType;
    if(!id || (type!=='movie' && type!=='tv')) return;
    var season=(document.getElementById('ep-season')||{}).value||1;
    var episode=(document.getElementById('ep-episode')||{}).value||1;
    var p=document.getElementById('main-player');
    if(p){ p.src='about:blank'; }
    var url='/api/player-config?mediaType='+encodeURIComponent(type)+'&mediaId='+encodeURIComponent(id);
    if(type==='tv'){ url+='&season='+encodeURIComponent(season)+'&episode='+encodeURIComponent(episode); }
    fetch(url,{credentials:'same-origin',headers:{accept:'application/json'}}).then(function(r){ return r.json().then(function(d){ return {ok:r.ok,data:d}; }); }).then(function(result){
      if(!result.ok || !result.data || !result.data.enabled || !result.data.src){ if(window.Toast) Toast.show('Player is not configured for this site.','warning'); return; }
      if(p){ p.src=result.data.src; }
    }).catch(function(){ if(window.Toast) Toast.show('Unable to load the configured player.','error'); });
  },
  playTrailer: function(){
    console.log('[V51] Trailer button clicked');
    var data=State.activeData;
    if(!data){
      if(window.Toast) Toast.show('Loading data...','info');
      return;
    }
    var videos=(data.videos&&data.videos.results)||[];
    console.log('[V51] Videos count', videos.length, videos);
    var trailer=null;
    for(var i=0;i<videos.length;i++){
      var v=videos[i];
      if(v.type==='Trailer' && v.site==='YouTube'){ trailer=v; break; }
    }
    if(!trailer){
      for(var j=0;j<videos.length;j++){
        if(videos[j].site==='YouTube'){ trailer=videos[j]; break; }
      }
    }
    if(trailer){
      console.log('[V51] Found trailer', trailer.key, trailer.name);
      State.isTrailerPlaying=true;
      // Show watch tab WITHOUT auto loading movie server
      var watchTab=document.querySelector('[data-tab="watch"]');
      FVTabs.showTab('watch', watchTab, true);
      // Deactivate server tabs
      document.querySelectorAll('.server-tab').forEach(function(t){ t.classList.remove('active'); });
      // Load YouTube trailer AFTER tab shown
      setTimeout(function(){
        var p=document.getElementById('main-player');
        if(p){
          p.src='https://www.youtube-nocookie.com/embed/'+trailer.key+'?autoplay=1&fs=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1&origin='+encodeURIComponent(window.location.origin);
          // Age-restriction fix: If YouTube blocks, try alternative embed
          p.onerror = function(){
            console.log('[V112] YouTube embed error, trying fallback');
            p.src='https://www.youtube-nocookie.com/embed/'+trailer.key+'?autoplay=1&fs=1&rel=0&modestbranding=1';
          };
          // Listen for age-restriction message
          setTimeout(function(){
            try{
              // Check if iframe shows age-restricted message by trying to access
              // If blocked, show custom overlay with Watch on YouTube + Search alternative
              var checkInterval = setInterval(function(){
                // If player still shows age-restricted after 3s, show fallback UI
                if(p && p.contentDocument && p.contentDocument.body && p.contentDocument.body.innerText.indexOf('age-restricted') !== -1){
                  console.log('[V112] Age-restricted detected');
                  clearInterval(checkInterval);
                }
              }, 1000);
              setTimeout(function(){ clearInterval(checkInterval); }, 10000);
            }catch(e){}
          }, 2000);
          console.log('[V51] YouTube trailer loaded in player');
        }
      }, 150);
      if(window.Toast) Toast.show('Playing trailer: '+(trailer.name||'Trailer'),'success');
    } else {
      console.warn('[V51] No trailer found', videos);
      // Fallback: try fetching from API if videos empty
      var id=State.activeId; var type=State.activeType||'movie';
      var url=API.url('/'+(type==='tv'?'tv':'movie')+'/'+id+'/videos',{});
      console.log('[V51] Fetching trailer from API', url);
      if(window.Toast) Toast.show('Fetching trailer...','info');
      fetch(url).then(function(r){ return r.json(); }).then(function(json){
        var results=json.results||[];
        var t=null;
        for(var k=0;k<results.length;k++){ if(results[k].site==='YouTube' && results[k].type==='Trailer'){ t=results[k]; break; } }
        if(!t){ for(var k=0;k<results.length;k++){ if(results[k].site==='YouTube'){ t=results[k]; break; } } }
        if(t){
          State.isTrailerPlaying=true;
          var watchTab=document.querySelector('[data-tab="watch"]');
          FVTabs.showTab('watch', watchTab, true);
          document.querySelectorAll('.server-tab').forEach(function(s){ s.classList.remove('active'); });
          setTimeout(function(){
            var p=document.getElementById('main-player');
            if(p) p.src='https://www.youtube-nocookie.com/embed/'+t.key+'?autoplay=1&fs=1&rel=0';
          }, 150);
          if(window.Toast) Toast.show('Playing trailer','success');
        } else {
          if(window.Toast) Toast.show('Trailer not available for this title','warning');
        }
      }).catch(function(err){
        console.error('Trailer fetch error', err);
        if(window.Toast) Toast.show('Failed to load trailer','error');
      });
    }
  }
};
var Watchlist = { toggleCurrent: function(){ var id=State.activeId, type=State.activeType, data=State.activeData; if(!id||!data) return; this.toggleById(id, null, type, data.title||data.name||'', data.poster_path||''); var isNowWL=State.watchlist.some(function(w){ return w.id===id; }); var fvBtn=document.getElementById('fv-wl-btn'), qvBtn=document.getElementById('qv-wl-btn'); if(fvBtn){ fvBtn.classList.toggle('active-wl',isNowWL); fvBtn.querySelector('i').className='fas fa-'+(isNowWL?'check':'heart'); } if(qvBtn){ qvBtn.classList.toggle('in-list',isNowWL); qvBtn.querySelector('i').className='fas fa-'+(isNowWL?'check':'heart'); } }, toggleById: function(id, btnEl, type, title, poster){ var idx=-1; for(var i=0;i<State.watchlist.length;i++){ if(State.watchlist[i].id===id){ idx=i; break; } } if(idx===-1){ State.watchlist.unshift({id:id,type:type,title:title,poster:poster}); Toast.show('"'+title+'" added to watchlist','success'); if(btnEl){ btnEl.classList.add('in-list','active-wl'); btnEl.querySelector('i').className='fas fa-check'; } } else { State.watchlist.splice(idx,1); Toast.show('"'+title+'" removed from watchlist','info'); if(btnEl){ btnEl.classList.remove('in-list','active-wl'); btnEl.querySelector('i').className='fas fa-heart'; } } saveWatchlist(); this.updateSidebarBadge(); if(App.activePage==='page-watchlist') this.render(); }, updateSidebarBadge: function(){ var badge=document.getElementById('wl-sidebar-count'), count=State.watchlist.length; if(badge){ badge.textContent=count; badge.classList.toggle('hidden',count===0); } var disp=document.getElementById('wl-count-display'); if(disp) disp.textContent=count+' item'+(count!==1?'s':''); }, render: function(){ var gridEl=document.getElementById('wl-grid'), emptyEl=document.getElementById('wl-empty'); if(!gridEl) return; var items=State.watchlist; var disp=document.getElementById('wl-count-display'); if(disp) disp.textContent=items.length+' item'+(items.length!==1?'s':''); if(!items.length){ gridEl.innerHTML=''; if(emptyEl) emptyEl.style.display='flex'; return; } if(emptyEl) emptyEl.style.display='none'; var html=''; for(var i=0;i<items.length;i++){ var item=items[i]; var img=item.poster?CFG.IMG342+item.poster:Utils.placeholder(); var safeT=Utils.escape(item.title); html+='<div class="poster-card" onclick="Modal.openFull('+item.id+',\''+item.type+'\')"><div class="poster-card-img-wrap"><img class="poster-card-img" src="'+img+'" alt="'+safeT+'" loading="lazy"/><div class="poster-card-grad"></div><div class="pc-play-wrap"><div class="pc-play-btn"><i class="fas fa-play"></i></div></div><button class="pc-wl-btn in-list" onclick="event.stopPropagation();Watchlist.toggleById('+item.id+',this,\''+item.type+'\',\''+safeT+'\',\''+item.poster+'\')" title="Remove"><i class="fas fa-check"></i></button></div><div class="poster-card-info"><div class="pc-title">'+item.title+'</div><div class="pc-meta"><span class="pc-genre">'+(item.type==='tv'?'TV Show':'Movie')+'</span></div></div></div>'; } gridEl.innerHTML=html; } };

var History = { add: function(id, type, title, poster, year){ for(var i=0;i<State.history.length;i++){ if(State.history[i].id===id){ State.history.splice(i,1); break; } } State.history.unshift({id:id,type:type,title:title,poster:poster,year:year,ts:Date.now()}); if(State.history.length>50) State.history.pop(); saveHistory(); }, render: function(){ var gridEl=document.getElementById('history-grid'), emptyEl=document.getElementById('history-empty'); if(!gridEl) return; var items=State.history; if(!items.length){ gridEl.innerHTML=''; if(emptyEl) emptyEl.classList.remove('hidden'); return; } if(emptyEl) emptyEl.classList.add('hidden'); var html=''; for(var i=0;i<items.length;i++){ var item=items[i]; var img=item.poster?CFG.IMG342+item.poster:Utils.placeholder(); var date=new Date(item.ts).toLocaleDateString(); html+='<div class="poster-card" onclick="Modal.openFull('+item.id+',\''+item.type+'\')"><div class="poster-card-img-wrap"><img class="poster-card-img" src="'+img+'" alt="'+Utils.escape(item.title)+'" loading="lazy"/><div class="poster-card-grad"></div><div class="pc-play-wrap"><div class="pc-play-btn"><i class="fas fa-play"></i></div></div></div><div class="poster-card-info"><div class="pc-title">'+item.title+'</div><div class="pc-meta"><span>'+(item.year||'N/A')+'</span><span class="pc-meta-dot">&middot;</span><span style="font-size:10px;color:var(--text-4)">'+date+'</span></div></div></div>'; } gridEl.innerHTML=html; }, clearAll: function(){ State.history=[]; saveHistory(); this.render(); Toast.show('Watch history cleared','info'); } };

var Share = { current: function(){ var data=State.activeData; if(!data) return; var title=data.title||data.name||'MoviMoon'; var url=window.location.href; if(navigator.share){ navigator.share({title:title, url:url}).catch(function(){}); } else { if(navigator.clipboard) navigator.clipboard.writeText(url); Toast.show('Copied: '+url,'success',4000); } } };

var Router = {
  _slug: function(s){ try{ if(!s) return ''; if(window.Utils && Utils.slug) return Utils.slug(s); return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60); }catch(e){ return ''; } },
  push: function(id, type, title){
    try{
      var slug = this._slug(title||'');
      var param = type + '-' + id + (slug ? '-' + slug : '');
      var hash = 'watch=' + param;
      console.log('[Router] Pushing hash:', hash, 'title:', title);
      // Method 1: Direct hash assignment - 100% works on Blogger
      window.location.hash = hash;
      // Method 2: Also try pushState for history
      try{ history.pushState({id:id, type:type, title:title}, '', '#' + hash); }catch(e){}
      if(title){ document.title = title + ' - MoviMoon'; }
    }catch(e){ console.error('[Router] push error', e); }
  },
  clear: function(){
    try{
      if(window.location.hash.indexOf('watch=') !== -1){
        console.log('[Router] Clearing hash to home');
        window.location.hash = 'home';
        document.title = 'MoviMoon - Premium Streaming';
        try{ history.replaceState({}, '', window.location.pathname + '#home'); }catch(e){}
      } else if(window.location.hash && window.location.hash !== '#home' && window.location.hash.indexOf('watch=')===-1){
        window.location.hash = 'home';
      }
    }catch(e){}
  },
  parse: function(){
    try{
      var href = window.location.href;
      var hash = window.location.hash || '';
      var search = window.location.search || '';
      var watch = null;
      // Priority 1: hash #watch=
      if(hash.indexOf('watch=') !== -1){
        watch = hash.split('watch=')[1].split('&')[0].split('#')[0];
      }
      // Priority 2: search ?watch=
      if(!watch && search.indexOf('watch=') !== -1){
        var m2 = search.match(/watch=([^&]+)/);
        if(m2) watch = m2[1];
      }
      // Priority 3: full href
      if(!watch){
        var m = href.match(/watch=([^&\#]+)/);
        if(m) watch = m[1];
      }
      if(!watch) return null;
      watch = decodeURIComponent(watch);
      var parts = watch.split('-');
      if(parts.length < 2) return null;
      var type = parts[0];
      if(type !== 'movie' && type !== 'tv') return null;
      var id = parseInt(parts[1],10);
      if(isNaN(id)) return null;
      console.log('[Router] Parsed', {id:id, type:type, raw:watch});
      return {id:id, type:type, raw:watch};
    }catch(e){ console.error('Router parse', e); return null; }
  },
  handleNavigationHash: function(){
    try{
      var hash = (window.location.hash || '').replace(/^#/, '').toLowerCase();
      if(!hash || hash === 'home'){ App.goHome(); return true; }
      if(hash === 'movies'){ App.browseMovies(); return true; }
      if(hash === 'shows' || hash === 'tv'){ App.browseTVShows(); return true; }
      if(hash === 'trending'){ App.browseTrending(); return true; }
      if(hash === 'top-rated' || hash === 'toprated'){ App.browseTopRated(); return true; }
      if(hash === 'upcoming'){ App.browseUpcoming(); return true; }
      if(hash === 'watchlist'){ App.showWatchlist(); return true; }
      if(hash === 'history'){ App.showHistory(); return true; }
      if(hash === 'live' || hash === 'livetv'){ App.showLiveTV(); return true; }
    }catch(e){ console.error('[Router] navigation hash error', e); }
    return false;
  }
};

window.addEventListener('popstate', function(){ 
  console.log('[Router] popstate'); 
  var p = Router.parse(); 
  if(p){ Modal.openFull(p.id, p.type); } 
  else { if(Modal && Modal.overlay && Modal.overlay.classList.contains('open')){ Modal.closeAll(); } }
});

window.addEventListener('hashchange', function(){ 
  console.log('[Router] hashchange to', window.location.hash); 
  var p = Router.parse(); 
  if(p){ 
    // Avoid loop if already open same movie
    if(State.activeId !== p.id){ Modal.openFull(p.id, p.type); }
    return;
  }
  Router.handleNavigationHash();
});

function initStats(){ Promise.all([ API.fetch(API.url('/discover/movie',{page:1})), API.fetch(API.url('/discover/tv',{page:1})) ]).then(function(results){ var movies=results[0], shows=results[1]; if(movies){ var el=document.getElementById('stat-movies'); if(el) el.textContent=Utils.fmt(movies.total_results); } if(shows) { var el2=document.getElementById('stat-shows'); if(el2) el2.textContent=Utils.fmt(shows.total_results); } }); }

var HTab = { 
  set: function(type, btn){ 
    document.querySelectorAll('.hft-btn').forEach(function(b){ b.classList.remove('active'); }); 
    if(btn) btn.classList.add('active'); 
    State.htabType=type;
    if(type==='livetv'){
      App.showPage('page-livetv'); 
      App.setNavActive('nav-livetv'); 
      App.setTitle('Live TV','Live TV'); 
      try{ document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); }); var nl = document.getElementById('nav-livetv'); if(nl) nl.classList.add('active'); }catch(e){}
      LiveTV.onPageShown();
      return;
    }
    // V120: Bidirectional Sync - Header <-> Sidebar
    if(type==='movie'){ 
      State.browseType='movie'; State.browseMode='popular'; State.browsePage=1;
      App.showPage('page-browse'); 
      App.setNavActive('nav-movies'); 
      App.setTitle('Movies','Movies');
      try{
        document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
        var nm = document.getElementById('nav-movies'); if(nm) nm.classList.add('active');
        if(window.Filter) Filter.clearAll(false);
      }catch(e){}
      Browse.load(true);
    } else if(type==='tv'){ 
      State.browseType='tv'; State.browseMode='popular'; State.browsePage=1;
      App.showPage('page-browse'); 
      App.setNavActive('nav-tv'); 
      App.setTitle('TV Shows','TV Shows');
      try{
        document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
        var nt = document.getElementById('nav-tv'); if(nt) nt.classList.add('active');
        if(window.Filter) Filter.clearAll(false);
      }catch(e){}
      Browse.load(true);
    } else { 
      State.browseType='all'; State.browseMode='popular'; State.browsePage=1;
      App.showPage('page-browse'); 
      App.setNavActive('nav-home'); 
      App.setTitle('Discover','All Content');
      try{
        document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
        var nh = document.getElementById('nav-home'); if(nh) nh.classList.add('active');
        if(window.Filter) Filter.clearAll(false);
      }catch(e){}
      // If already on home, reload home mixed
      if(App.activePage==='page-home' || type==='all'){
        try{ if(typeof Home !== 'undefined' && Home.load) Home.load(); }catch(e){}
        App.showPage('page-home');
        App.setNavActive('nav-home');
      } else {
        Browse.load(true);
      }
    }
  }
};

var MobNav = { setActive: function(navEl){ document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); }); if(navEl) navEl.classList.add('active'); }, setBottomActive: function(btn){ document.querySelectorAll('.mbb-btn').forEach(function(b){ b.classList.remove('active'); }); if(btn) btn.classList.add('active'); } };

function initGenreChips(){ var genres=[ {id:28,name:'Action'},{id:35,name:'Comedy'},{id:27,name:'Horror'}, {id:878,name:'Sci-Fi'},{id:18,name:'Drama'},{id:10749,name:'Romance'}, {id:80,name:'Crime'},{id:16,name:'Animation'},{id:14,name:'Fantasy'}, {id:53,name:'Thriller'},{id:12,name:'Adventure'},{id:9648,name:'Mystery'} ]; var chipsEl=document.getElementById('genre-chips'); if(chipsEl){ var h=''; for(var i=0;i<genres.length;i++) h+='<div class="genre-chip" onclick="Browse.byGenre('+genres[i].id+',\''+genres[i].name+'\')">'+genres[i].name+'</div>'; chipsEl.innerHTML=h; } var sidebarEl=document.getElementById('sidebar-genres'); if(sidebarEl){ var h2=''; for(var j=0;j<8;j++) h2+='<div class="sidebar-genre-chip" onclick="Browse.byGenre('+genres[j].id+',\''+genres[j].name+'\')">'+genres[j].name+'</div>'; sidebarEl.innerHTML=h2; } }

function loadHomePage(){ Prog.start(); Render.skeletons('row-trending',15); Render.skeletons('row-tvshows',15); Render.skeletons('row-newreleases',15);
      Render.skeletons('row-indian-movies',15); Render.skeletons('row-netflix-originals',15); Render.skeletons('row-prime-shows',15);
      Render.skeletons('row-apple-shows',15); Render.skeletons('row-disney-shows',15); Render.skeletons('row-peacock-shows',15);
      Render.skeletons('row-max-shows',15); Render.skeletons('row-hulu-originals',15); var hasKey=CFG.TMDB_READY; if(!hasKey){ var banner=document.getElementById('api-key-banner'); if(banner) banner.style.display='flex'; Prog.done(); return; } Promise.all([ 
      API.trending('all',1), 
      API.topRated('movie',1), 
      API.popular('tv',1), 
      API.upcoming(1), 
      API.popular('movie',1),
      API.discover('movie', {with_original_language: 'hi', sort_by: 'popularity.desc', page: 1}),
      API.discover('movie', {with_original_language: 'te', sort_by: 'popularity.desc', page: 1}),
      API.discover('movie', {with_original_language: 'ta', sort_by: 'popularity.desc', page: 1}),
      API.discover('tv', {with_original_language: 'hi', sort_by: 'popularity.desc', page: 1}),
      API.discover('movie', {with_original_language: 'hi|te|ta|ml|kn|bn', sort_by: 'popularity.desc', page: 1}),
      API.discover('tv', {with_watch_providers: '8', watch_region: 'US', with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc', page: 1}),
      API.discover('tv', {with_watch_providers: '9|119', watch_region: 'US', with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc', page: 1}),
      API.discover('tv', {with_watch_providers: '350', watch_region: 'US', with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc', page: 1}),
      API.discover('tv', {with_watch_providers: '337', watch_region: 'US', with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc', page: 1}),
      API.discover('tv', {with_watch_providers: '386', watch_region: 'US', with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc', page: 1}),
      API.discover('tv', {with_watch_providers: '1899', watch_region: 'US', with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc', page: 1}),
      API.discover('tv', {with_watch_providers: '15', watch_region: 'US', with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc', page: 1})
    ]).then(function(results){ 
      var trending=results[0], topRated=results[1], tvShows=results[2], upcoming=results[3], nowPlaying=results[4];
      var bollywood=results[5], tollywood=results[6], kollywood=results[7], hindiTV=results[8];
      var indianMovies=results[9], netflixOriginals=results[10], primeShows=results[11], appleShows=results[12], disneyShows=results[13], peacockShows=results[14], maxShows=results[15], huluOriginals=results[16];
      
      if(trending && trending.results){
        // V117: Discover 7 Mixed - Hollywood + Bollywood + South Indian + TV Series Shuffle
        var hollywood = trending.results.filter(function(r){ return r.backdrop_path; }).slice(0,6);
        var bolly = (bollywood && bollywood.results) ? bollywood.results.filter(function(r){ return r.backdrop_path; }).slice(0,4) : [];
        var south1 = (tollywood && tollywood.results) ? tollywood.results.filter(function(r){ return r.backdrop_path; }).slice(0,3) : [];
        var south2 = (kollywood && kollywood.results) ? kollywood.results.filter(function(r){ return r.backdrop_path; }).slice(0,2) : [];
        var pakistani = [];
        try {
          // Pakistani from discover urdu - if available in home load, add
          var urduResults = null;
          // Will be fetched separately if needed
        } catch(e){}
        var tvMixed = (tvShows && tvShows.results) ? tvShows.results.filter(function(r){ return r.backdrop_path; }).slice(0,3) : [];
        
        // Combine and shuffle for Discover 7 - Hollywood + Bollywood + South Indian + Pakistani + TV
        var mixedPool = [].concat(hollywood, bolly, south1, south2, tvMixed);
        // Add Pakistani if available (from hindiTV or bollywood includes urdu sometimes)
        if(mixedPool.length < 15){
          // Add more variety
          var extra = trending.results.filter(function(r){ return r.backdrop_path; }).slice(8,12);
          mixedPool = mixedPool.concat(extra);
        }
        // Shuffle
        for(var i=mixedPool.length-1; i>0; i--){ var j=Math.floor(Math.random()* (i+1)); var tmp=mixedPool[i]; mixedPool[i]=mixedPool[j]; mixedPool[j]=tmp; }
        var spItems = mixedPool.slice(0,7);
        console.log('[V117] Discover 7 Mixed:', spItems.map(function(x){ return x.title||x.name; }));
        Spotlight.init(spItems);
        
        // Trending Now - Mixed Hollywood + Bollywood + South Indian
        var trendingMixed = [];
        if(trending.results) trendingMixed = trendingMixed.concat(trending.results.slice(0,8));
        if(bollywood && bollywood.results) trendingMixed = trendingMixed.concat(bollywood.results.slice(0,6));
        if(tollywood && tollywood.results) trendingMixed = trendingMixed.concat(tollywood.results.slice(0,3));
        if(kollywood && kollywood.results) trendingMixed = trendingMixed.concat(kollywood.results.slice(0,3));
        for(var i=trendingMixed.length-1; i>0; i--){ var j=Math.floor(Math.random()* (i+1)); var tmp=trendingMixed[i]; trendingMixed[i]=trendingMixed[j]; trendingMixed[j]=tmp; }
        Render.hscrollRow('row-trending', trendingMixed.filter(function(r){ return r.poster_path; }).slice(0,20));
        
        Render.compactList('list-top10', trendingMixed.slice(0,10));
      } 
      
      if(topRated && topRated.results){
        var topMixed = topRated.results.slice(0,4);
        if(bollywood && bollywood.results) topMixed = topMixed.concat(bollywood.results.slice(0,2));
        if(tollywood && tollywood.results) topMixed = topMixed.concat(tollywood.results.slice(0,2));
        for(var i=topMixed.length-1; i>0; i--){ var j=Math.floor(Math.random()* (i+1)); var tmp=topMixed[i]; topMixed[i]=topMixed[j]; topMixed[j]=tmp; }
        Render.landscapeGrid('grid-toprated', topMixed.filter(function(r){ return r.backdrop_path; }).slice(0,6), 'movie'); 
      } 
      
      if(tvShows && tvShows.results){
        var tvMixedAll = tvShows.results.filter(function(r){ return r.media_type!=='movie'; }).slice(0,6);
        if(hindiTV && hindiTV.results) tvMixedAll = tvMixedAll.concat(hindiTV.results.filter(function(r){ return r.poster_path; }).slice(0,4));
        // Add Telugu/Tamil TV if available - fetch more TV
        var teluguTV = (tollywood && tollywood.results) ? tollywood.results.filter(function(r){ return r.first_air_date; }).slice(0,2) : [];
        var tamilTV = (kollywood && kollywood.results) ? kollywood.results.filter(function(r){ return r.first_air_date; }).slice(0,2) : [];
        tvMixedAll = tvMixedAll.concat(teluguTV).concat(tamilTV);
        // Strict: Only TV Shows - remove any movie items
        tvMixedAll = tvMixedAll.filter(function(r){ return !r.title || r.name; });
        for(var i=tvMixedAll.length-1; i>0; i--){ var j=Math.floor(Math.random()* (i+1)); var tmp=tvMixedAll[i]; tvMixedAll[i]=tvMixedAll[j]; tvMixedAll[j]=tmp; }
        console.log('[V118] Popular TV Shows - Only Series:', tvMixedAll.length);
        Render.hscrollRow('row-tvshows', tvMixedAll.filter(function(r){ return r.poster_path; }).slice(0,15), 'tv'); 
      } 
      
      if(nowPlaying && nowPlaying.results){
        // V118 FIX: New Releases - Only Latest 2025-2026, Movie + Series Mix
        var now = new Date();
        var cutoff = new Date();
        cutoff.setMonth(now.getMonth() - 12); // Last 12 months
        var cutoffStr = cutoff.toISOString().split('T')[0];
        
        var latestMovies = nowPlaying.results.filter(function(r){
          var date = r.release_date || r.first_air_date || '';
          return date >= '2025-01-01' && r.poster_path;
        }).slice(0,10);
        
        var latestBollywood = (bollywood && bollywood.results) ? bollywood.results.filter(function(r){
          var date = r.release_date || r.first_air_date || '';
          return date >= '2024-06-01' && r.poster_path;
        }).slice(0,6) : [];
        
        var latestSouth = [];
        if(tollywood && tollywood.results) latestSouth = latestSouth.concat(tollywood.results.filter(function(r){ return (r.release_date||'') >= '2024-06-01' && r.poster_path; }).slice(0,3));
        if(kollywood && kollywood.results) latestSouth = latestSouth.concat(kollywood.results.filter(function(r){ return (r.release_date||'') >= '2024-06-01' && r.poster_path; }).slice(0,3));
        
        // If not enough latest, fallback to popular but sorted by date
        var allLatest = [].concat(latestMovies, latestBollywood, latestSouth);
        if(allLatest.length < 6){
          allLatest = nowPlaying.results.filter(function(r){ return r.poster_path; }).slice(0,5)
            .concat((bollywood && bollywood.results ? bollywood.results.filter(function(r){ return r.poster_path; }).slice(0,4) : []))
            .concat((tollywood && tollywood.results ? tollywood.results.filter(function(r){ return r.poster_path; }).slice(0,2) : []));
        }
        
        // Sort by date descending (newest first)
        allLatest.sort(function(a,b){
          var da = a.release_date || a.first_air_date || '1900-01-01';
          var db = b.release_date || b.first_air_date || '1900-01-01';
          return db.localeCompare(da);
        });
        
        for(var i=allLatest.length-1; i>0; i--){ var j=Math.floor(Math.random()* (i+1)); var tmp=allLatest[i]; allLatest[i]=allLatest[j]; allLatest[j]=tmp; }
        // Re-sort to keep newest first after slight shuffle? Keep sorted for new releases
        allLatest.sort(function(a,b){
          var da = a.release_date || a.first_air_date || '1900-01-01';
          var db = b.release_date || b.first_air_date || '1900-01-01';
          return db.localeCompare(da);
        });
        
        console.log('[V118] New Releases - Latest Only:', allLatest.slice(0,6).map(function(x){ return (x.title||x.name) + ' ' + (x.release_date||x.first_air_date); }));
        Render.hscrollRow('row-newreleases', allLatest.filter(function(r){ return r.poster_path; }).slice(0,15), 'movie'); 
      } 
      
      if(upcoming && upcoming.results){
        // V125 FIX: Real Upcoming - Filter only future releases (release_date >= today)
        var todayStr = new Date().toISOString().split('T')[0];
        var realUpcoming = upcoming.results.filter(function(m){
          var rd = m.release_date || '';
          return rd >= todayStr;
        });
        // If too few after filter, fetch real upcoming via discover
        if(realUpcoming.length < 4) {
          // Sort original by release date and filter again
          var sorted = upcoming.results.slice().sort(function(a,b){
            var da = a.release_date || '9999-12-31';
            var db = b.release_date || '9999-12-31';
            return da.localeCompare(db);
          });
          realUpcoming = sorted.filter(function(m){
            return (m.release_date || '') >= todayStr;
          });
          if(realUpcoming.length === 0) {
            realUpcoming = upcoming.results.slice(0,4);
          }
        }
        var upcomingMixed = realUpcoming.slice(0,8);
        // Sort by nearest release date first
        upcomingMixed.sort(function(a,b){
          var da = a.release_date || '9999-12-31';
          var db = b.release_date || '9999-12-31';
          return da.localeCompare(db);
        });
        console.log('[V125 Real Upcoming] Filtered:', upcomingMixed.map(function(x){ return x.title + ' (' + x.release_date + ')'; }));
        Render.landscapeGrid('grid-upcoming', upcomingMixed.filter(function(r){ return r.backdrop_path || r.poster_path; }).slice(0,6), 'movie');
        // Background fetch more real upcoming
        try {
          (function(){
            var today = new Date().toISOString().split('T')[0];
            var next90 = new Date(); next90.setDate(next90.getDate()+90);
            var toDate = next90.toISOString().split('T')[0];
            var url = API.url('/discover/movie', {
              'primary_release_date.gte': today,
              'primary_release_date.lte': toDate,
              'sort_by': 'primary_release_date.asc',
              'page': 1,
              'region': 'US'
            });
            API.fetch(url).then(function(data){
              if(data && data.results && data.results.length>0){
                var filtered = data.results.filter(function(m){ return (m.release_date||'') >= today && m.poster_path; }).slice(0,8);
                filtered.sort(function(a,b){ return (a.release_date||'').localeCompare(b.release_date||''); });
                Render.landscapeGrid('grid-upcoming', filtered.filter(function(r){ return r.backdrop_path || r.poster_path; }).slice(0,8), 'movie');
                console.log('[V125] Background Real Upcoming:', filtered.length);
              }
            });
          })();
        } catch(e) {}
      } 
      
      
      if(indianMovies && indianMovies.results){
        var indianMixed = indianMovies.results.filter(function(r){ return r.poster_path; }).slice(0,20);
        for(var i=indianMixed.length-1; i>0; i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=indianMixed[i]; indianMixed[i]=indianMixed[j]; indianMixed[j]=tmp; }
        Render.hscrollRow('row-indian-movies', indianMixed.slice(0,15), 'movie');
      }
      if(netflixOriginals && netflixOriginals.results){
        Render.hscrollRow('row-netflix-originals', netflixOriginals.results.filter(function(r){ return r.poster_path; }).slice(0,15), 'tv');
      }
      if(primeShows && primeShows.results){
        Render.hscrollRow('row-prime-shows', primeShows.results.filter(function(r){ return r.poster_path; }).slice(0,15), 'tv');
      }
      if(appleShows && appleShows.results){
        Render.hscrollRow('row-apple-shows', appleShows.results.filter(function(r){ return r.poster_path; }).slice(0,15), 'tv');
      }
      if(disneyShows && disneyShows.results){
        Render.hscrollRow('row-disney-shows', disneyShows.results.filter(function(r){ return r.poster_path; }).slice(0,15), 'tv');
      }
      if(peacockShows && peacockShows.results){
        Render.hscrollRow('row-peacock-shows', peacockShows.results.filter(function(r){ return r.poster_path; }).slice(0,15), 'tv');
      }
      if(maxShows && maxShows.results){
        Render.hscrollRow('row-max-shows', maxShows.results.filter(function(r){ return r.poster_path; }).slice(0,15), 'tv');
      }
      if(huluOriginals && huluOriginals.results){
        Render.hscrollRow('row-hulu-originals', huluOriginals.results.filter(function(r){ return r.poster_path; }).slice(0,15), 'tv');
      }
      
      initStats(); 
      initTrendingRibbon(); 
      Prog.done(); 
    }).catch(function(e){ console.error('[MoviMoon V117] Home load error:', e); Toast.show('Failed to load content. Check API key.','error',5000); Prog.done(); }); }


// ===== V125 NEW: Auto Shuffle for Trending, TV Shows, New Releases, Region - Like Discover =====
(function() {
  function initAutoHScrollV125() {
    try {
      var rows = [
        {id: 'row-trending', interval: 3500, amount: 360},
        {id: 'row-newreleases', interval: 4000, amount: 360},
        {id: 'row-indian-movies', interval: 4500, amount: 360},
        {id: 'row-tvshows', interval: 5000, amount: 360},
        {id: 'row-netflix-originals', interval: 5500, amount: 360},
        {id: 'row-prime-shows', interval: 6000, amount: 360},
        {id: 'row-apple-shows', interval: 6500, amount: 360},
        {id: 'row-disney-shows', interval: 7000, amount: 360},
        {id: 'row-peacock-shows', interval: 7500, amount: 360},
        {id: 'row-max-shows', interval: 8000, amount: 360},
        {id: 'row-hulu-originals', interval: 8500, amount: 360},
        {id: 'row-region-trending', interval: 5000, amount: 360}
      ];
      
      rows.forEach(function(cfg) {
        var el = document.getElementById(cfg.id);
        if(!el) return;
        
        // Clear existing timer if any
        if(el._v125Timer) clearInterval(el._v125Timer);
        
        var paused = false;
        el.addEventListener('mouseenter', function(){ paused = true; });
        el.addEventListener('mouseleave', function(){ paused = false; });
        el.addEventListener('touchstart', function(){ paused = true; }, {passive:true});
        el.addEventListener('touchend', function(){ setTimeout(function(){ paused = false; }, 2500); }, {passive:true});
        
        el._v125Timer = setInterval(function() {
          if(paused) return;
          try {
            var max = el.scrollWidth - el.clientWidth;
            if(max <= 10) return;
            if(el.scrollLeft + el.clientWidth >= el.scrollWidth - 80) {
              el.scrollTo({left: 0, behavior: 'smooth'});
            } else {
              el.scrollBy({left: cfg.amount, behavior: 'smooth'});
            }
          } catch(e) {}
        }, cfg.interval);
        
        console.log('[V125 AutoScroll] Started for', cfg.id);
      });
      
      // Coming Soon grid shuffle
      var grid = document.getElementById('grid-upcoming');
      if(grid && !grid._v125GridTimer) {
        grid._v125GridTimer = setInterval(function() {
          try {
            var cards = grid.querySelectorAll('.landscape-card');
            if(cards.length < 2) return;
            var first = cards[0];
            first.style.transition = 'opacity 0.4s, transform 0.4s';
            first.style.opacity = '0';
            first.style.transform = 'scale(0.95)';
            setTimeout(function(){
              grid.appendChild(first);
              first.style.opacity = '1';
              first.style.transform = 'scale(1)';
            }, 400);
          } catch(e) {}
        }, 7000);
      }
    } catch(e) { console.log('[V125 AutoScroll Error]', e); }
  }
  
  // Start after page load
  setTimeout(initAutoHScrollV125, 2500);
  
  // Re-init after home loads
  var checkHome = setInterval(function(){
    if(typeof loadHomePage === 'function' && !loadHomePage._v125Patched) {
      var orig = loadHomePage;
      window.loadHomePage = function() {
        var res = orig.apply(this, arguments);
        setTimeout(initAutoHScrollV125, 2000);
        return res;
      };
      loadHomePage._v125Patched = true;
      clearInterval(checkHome);
      console.log('[V125] loadHomePage patched for auto scroll');
    }
  }, 500);
  setTimeout(function(){ clearInterval(checkHome); }, 10000);
  
  // Also init on browse page etc
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) setTimeout(initAutoHScrollV125, 1000);
  });
})();
// ===== END V125 Auto Shuffle =====



var IPTV = {
  WORKER_URL: "https://livetv.md-ismail.workers.dev",
  CONTINENT_MAP: {
    ASIA: ["BD", "IN", "PK", "NP", "LK", "CN", "JP", "KR", "ID", "MY", "TH", "VN", "PH", "SG", "AE", "SA", "QA", "KW", "OM", "BH", "TR", "IR", "IQ", "JO", "LB", "SY", "YE", "KZ", "UZ", "TM", "TJ", "KG", "AZ", "GE", "AM"],
    EUROPE: ["GB", "FR", "DE", "IT", "ES", "PT", "NL", "BE", "RU", "UA", "PL", "SE", "NO", "FI", "CH", "AT", "DK", "CZ", "RO", "HU", "GR", "IE", "IS", "HR", "RS", "BG", "SK", "SI", "LT", "LV", "EE", "BY", "MD", "ME", "BA", "MK", "AL", "MT", "CY", "LU"],
    AMERICAS: ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC", "UY", "PY", "BO", "CR", "PA", "GT", "HN", "SV", "NI", "DO", "PR", "JM", "TT", "BS", "BB", "BZ", "SR", "GY", "HT"],
    AFRICA: ["EG", "ZA", "NG", "KE", "MA", "DZ", "TN", "LY", "SD", "GH", "ET", "TZ", "UG", "RW", "ZM", "ZW", "AO", "MZ", "CM", "CI", "SN", "ML", "NE", "BF", "BJ", "TG", "GM", "SL", "LR", "GW", "CV", "ST", "GQ", "GA", "CG", "CD", "BI", "DJ", "ER", "SO", "SS", "CF", "TD", "MR"],
    OCEANIA: ["AU", "NZ", "FJ", "PG", "SB", "VU", "WS", "TO", "KI", "MH", "FM", "PW", "NR", "TV"]
  },
  allChannels: [], filteredChannels: [], hlsPlayer: null,
  init: async function(){
    var grid=document.getElementById('channelGrid');
    var countEl=document.getElementById('iptvChannelCount');
    
    // V112 FIX: Independent of HLS.js! Channel list loads even if HLS.js blocked!
    console.log('[IPTV V112] Init - HLS exists:', !!window.Hls, 'Mobile:', /Mobile/i.test(navigator.userAgent));
    
    if(grid) grid.innerHTML='<div style="text-align:center;color:var(--text-3);padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:12px;display:block;color:#00e5ff;"></i>Loading channels...<br><span style="font-size:12px;">V112 Mobile Fix - Independent of HLS.js</span></div>';
    if(countEl) countEl.textContent='Loading... V112';

    try {
      var cached=localStorage.getItem('iptv_channels_data');
      var cacheTime=localStorage.getItem('iptv_cache_time');
      
      if(cached && cacheTime && (Date.now()-parseInt(cacheTime)<43200000)){
        console.log('[IPTV V112] Cache hit');
        this.allChannels=JSON.parse(cached);
        this.setupInterface();
      } else {
        console.log('[IPTV V112] Fetching from worker');
        var res=await fetch(this.WORKER_URL+'/?action=get_channels', { cache: 'no-store' });
        console.log('[IPTV V112] Fetch status:', res.status);
        if(!res.ok) throw new Error('Worker '+res.status);
        var channels=await res.json();
        console.log('[IPTV V112] Channels:', channels.length);
        
        if(Array.isArray(channels) && channels.length>0){
          this.allChannels=channels;
          try {
            localStorage.setItem('iptv_channels_data', JSON.stringify(channels));
            localStorage.setItem('iptv_cache_time', Date.now().toString());
          } catch(e) {
            console.warn('Cache save failed', e);
          }
          this.setupInterface();
        } else {
          this.showError('No channel data');
        }
      }
    } catch(err){
      console.error('[IPTV V112] Load error', err);
      this.showError('Server error: '+err.message+'<br><span style="font-size:11px;">Try Clear Cache</span>');
    }
  },
  setupInterface: function(){
    var el=document.getElementById('iptvChannelCount');
    if(el) el.textContent='Total: '+this.allChannels.length+' Channels | md-ismail';
    this.populateCountries('ALL');
    this.filterChannels();
  },
  onContinentChange: function(){
    var sel=document.getElementById('continentSelect');
    this.populateCountries(sel?sel.value:'ALL');
    this.filterChannels();
  },
  onCountryChange: function(){ this.filterChannels(); },
  populateCountries: function(continentKey){
    var countrySelect=document.getElementById('countrySelect');
    if(!countrySelect) return;
    var currentVal=countrySelect.value;
    countrySelect.innerHTML='<option value="ALL">All Countries</option>';
    var availableCountries=new Set();
    this.allChannels.forEach(function(ch){
      if(!ch.country) return;
      if(continentKey==='ALL'){
        availableCountries.add(ch.country);
      } else if(this.CONTINENT_MAP[continentKey] && this.CONTINENT_MAP[continentKey].includes(ch.country)){
        availableCountries.add(ch.country);
      }
    }.bind(this));
    Array.from(availableCountries).sort().forEach(function(code){
      var opt=document.createElement('option');
      opt.value=code;
      opt.innerText=code;
      countrySelect.appendChild(opt);
    });
    if(currentVal && availableCountries.has(currentVal)) countrySelect.value=currentVal;
  },
  filterChannels: function(){
    var continent=document.getElementById('continentSelect')?document.getElementById('continentSelect').value:'ALL';
    var country=document.getElementById('countrySelect')?document.getElementById('countrySelect').value:'ALL';
    var search=document.getElementById('searchInput')?document.getElementById('searchInput').value.toLowerCase().trim():'';
    var self=this;
    this.filteredChannels=this.allChannels.filter(function(ch){
      var mc=true;
      if(continent!=='ALL'){
        var allowed=self.CONTINENT_MAP[continent]||[];
        mc=allowed.indexOf(ch.country)!==-1;
      }
      var mco=true;
      if(country!=='ALL') mco=(ch.country===country);
      var ms=true;
      if(search!=='') ms=ch.name.toLowerCase().indexOf(search)!==-1;
      return mc&&mco&&ms;
    });
    var isMobile=window.innerWidth<=768;
    var limit=isMobile?40:80;
    this.renderChannelList(this.filteredChannels.slice(0, limit));
  },
  renderChannelList: function(channels){
    var grid=document.getElementById('channelGrid');
    if(!grid) return;
    grid.innerHTML='';
    if(channels.length===0){
      grid.innerHTML='<div style="text-align:center;color:var(--text-3);padding:30px;">No channels found<br><span style="font-size:12px;">Try All Countries or clear search</span><br><button onclick="document.getElementById(\'searchInput\').value=\'\';IPTV.filterChannels()" style="margin-top:12px;background:var(--bg-main);border:1px solid rgba(255,255,255,0.1);color:white;padding:8px 16px;border-radius:6px;cursor:pointer;">Clear Search</button></div>';
      return;
    }
    var self=this;
    var frag=document.createDocumentFragment();
    channels.forEach(function(ch){
      var card=document.createElement('div');
      card.className='iptv-channel-card';
      card.onclick=function(){ self.selectAndPlay(ch, card); };
      var logo=ch.logo||'https://via.placeholder.com/36?text=TV';
      card.innerHTML='<img src="'+logo+'" loading="lazy" onerror="this.src=\'https://via.placeholder.com/36?text=TV\'"/><div class="name">'+ch.name.replace(/</g,"&lt;")+'</div><span class="cc">'+(ch.country||'GLOBAL')+'</span>';
      frag.appendChild(card);
    });
    grid.appendChild(frag);
    if(this.filteredChannels.length>channels.length){
      var more=document.createElement('div');
      more.style.cssText='text-align:center;padding:12px;';
      more.innerHTML='<button onclick="IPTV.showMore()" style="background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.2);color:#00e5ff;padding:8px 18px;border-radius:20px;cursor:pointer;font-size:12px;">Show '+(this.filteredChannels.length-channels.length)+' more ('+this.filteredChannels.length+' total)</button>';
      grid.appendChild(more);
    }
  },
  showMore: function(){
    var cur=document.querySelectorAll('.iptv-channel-card').length;
    var next=this.filteredChannels.slice(cur, cur+40);
    var grid=document.getElementById('channelGrid');
    var btn=grid.querySelector('button');
    if(btn && btn.textContent.includes('more')) btn.parentElement.remove();
    var self=this;
    next.forEach(function(ch){
      var card=document.createElement('div');
      card.className='iptv-channel-card';
      card.onclick=function(){ self.selectAndPlay(ch, card); };
      var logo=ch.logo||'https://via.placeholder.com/36?text=TV';
      card.innerHTML='<img src="'+logo+'" loading="lazy" onerror="this.src=\'https://via.placeholder.com/36?text=TV\'"/><div class="name">'+ch.name.replace(/</g,"&lt;")+'</div><span class="cc">'+(ch.country||'GLOBAL')+'</span>';
      grid.appendChild(card);
    });
    if(this.filteredChannels.length>cur+next.length){
      var more=document.createElement('div');
      more.style.cssText='text-align:center;padding:12px;';
      more.innerHTML='<button onclick="IPTV.showMore()" style="background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.2);color:#00e5ff;padding:8px 18px;border-radius:20px;cursor:pointer;font-size:12px;">Show more ('+(this.filteredChannels.length-cur-next.length)+' left)</button>';
      grid.appendChild(more);
    }
  },
  selectAndPlay: function(channel, element){
    document.querySelectorAll('.iptv-channel-card').forEach(function(el){ el.classList.remove('active'); });
    if(element) element.classList.add('active');
    var nEl=document.getElementById('activeName');
    var gEl=document.getElementById('activeGroup');
    var lEl=document.getElementById('activeLogo');
    if(nEl) nEl.innerText=channel.name;
    if(gEl) gEl.innerText='Country: '+(channel.country||'Global')+' | Group: '+(channel.group||'General');
    if(lEl&&channel.logo) lEl.src=channel.logo;
    var video=document.getElementById('tvPlayer');
    var loader=document.getElementById('iptvLoader');
    if(loader) { loader.style.display='flex'; loader.innerHTML='<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Loading '+channel.name.substring(0,20)+'...'; }
    var directUrl=channel.streamUrl;
    var proxyUrl=this.WORKER_URL+'/?stream='+encodeURIComponent(channel.streamUrl);
    if(this.hlsPlayer){ try{ this.hlsPlayer.destroy(); }catch(e){} this.hlsPlayer=null; }
    
    // Check if HLS.js loaded, if not, try to load it now or use native
    if(!window.Hls) {
      console.log('[IPTV V112] HLS.js not loaded, loading now...');
      if(loader) loader.innerHTML='<i class="fas fa-spinner fa-spin"></i> Loading player...';
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
      var self=this;
      s.onload=function(){
        console.log('[IPTV V112] HLS.js loaded, retrying play');
        self.selectAndPlay(channel, element);
      };
      s.onerror=function(){
        console.error('[IPTV V112] HLS.js failed, trying native');
        if(video.canPlayType('application/vnd.apple.mpegurl')){
          video.src=directUrl;
          video.play().then(function(){ if(loader) loader.style.display='none'; });
        } else {
          if(loader) loader.innerHTML='<div style="color:#FF6B6B;">Player load failed<br>Try another channel</div>';
        }
      };
      document.head.appendChild(s);
      return;
    }
    
    if(window.Hls&&Hls.isSupported()){
      this.hlsPlayer=new Hls({
        startLevel: 0,
        capLevelToPlayerSize: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60*1000*1000,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        abrEwmaDefaultEstimate: 300000,
        abrBandWidthFactor: 0.8,
        abrBandWidthUpFactor: 0.7,
        enableWorker: true,
        manifestLoadingTimeOut: 10000,
        fragLoadingTimeOut: 20000
      });
      var self=this;
      this.hlsPlayer.on(Hls.Events.LEVEL_SWITCHED, function(e,data){
        var level=self.hlsPlayer.levels[data.level];
        if(level && gEl){
          var h=level.height||'Auto';
          var orig=gEl.innerText.split(' | ')[0];
          gEl.innerText=orig+' | '+h+'p ('+Math.round(level.bitrate/1000)+'kbps)';
        }
      });
      this.hlsPlayer.loadSource(directUrl);
      this.hlsPlayer.attachMedia(video);
      var proxyTried=false;
      this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function(){
        if(loader) loader.style.display='none';
        video.play().catch(function(){ video.muted=true; video.play(); });
      });
      this.hlsPlayer.on(Hls.Events.ERROR, function(e,d){
        if(d.fatal){
          if(d.type===Hls.ErrorTypes.NETWORK_ERROR && !proxyTried){
            proxyTried=true;
            if(loader) loader.innerHTML='<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Trying proxy...';
            self.hlsPlayer.loadSource(proxyUrl);
            self.hlsPlayer.startLoad();
            setTimeout(function(){
              if(loader && loader.style.display!=='none'){
                loader.innerHTML='<div style="text-align:center;"><div style="color:#FF6B6B;">Channel offline</div><div style="font-size:12px;">Try another</div><button onclick="document.getElementById(\'iptvLoader\').style.display=\'none\'" style="margin-top:8px;background:rgba(255,255,255,0.1);border:none;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;">Close</button></div>';
              }
            }, 8000);
          }else if(d.type===Hls.ErrorTypes.MEDIA_ERROR){
            self.hlsPlayer.recoverMediaError();
          }
        }
      });
    }else if(video.canPlayType('application/vnd.apple.mpegurl')){
      var tried=false;
      video.src=directUrl;
      video.addEventListener('error', function(){
        if(!tried){
          tried=true;
          if(loader) loader.innerHTML='<i class="fas fa-spinner fa-spin"></i> Proxy...';
          video.src=proxyUrl;
          video.play();
        }
      });
      video.play().then(function(){ if(loader) loader.style.display='none'; }).catch(function(){
        if(!tried){
          tried=true;
          video.src=proxyUrl;
          video.play().then(function(){ if(loader) loader.style.display='none'; });
        }
      });
    }
  },
  showError: function(msg){
    var grid=document.getElementById('channelGrid');
    if(grid) grid.innerHTML='<div style="text-align:center;color:#FF6B6B;padding:30px;"><div style="font-size:32px;margin-bottom:10px;">⚠️</div>'+msg+'<br><button onclick="IPTV.init()" style="margin-top:16px;background:var(--cv-red);color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">Retry</button><br><button onclick="localStorage.removeItem(\'iptv_channels_data\');localStorage.removeItem(\'iptv_cache_time\');location.reload()" style="margin-top:10px;background:rgba(255,255,255,0.1);color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;">Clear Cache</button></div>';
  }
};

var LiveTV = {
  _hlsLoading: false,
  onPageShown: function(){
    // V112 FIX: Load channels IMMEDIATELY, independent of HLS.js!
    // HLS.js is loaded in parallel, not blocking channel list!
    console.log('[LiveTV V112] onPageShown - HLS exists:', !!window.Hls);
    
    // Load HLS.js in parallel (non-blocking)
    if(!window.Hls && !this._hlsLoading){
      this._hlsLoading=true;
      console.log('[LiveTV V112] Loading HLS.js in parallel...');
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
      s.onload=function(){ console.log('[LiveTV V112] HLS.js loaded parallel'); };
      s.onerror=function(){ console.error('[LiveTV V112] HLS.js failed parallel - will try on play'); };
      document.head.appendChild(s);
    }
    
    // IMMEDIATELY load channels - NOT waiting for HLS.js!
    IPTV.init();
  }
};

var LiveTV = {
  onPageShown: function(){
    if(!window.Hls){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
      s.onload=function(){ IPTV.init(); };
      s.onerror=function(){
        var grid=document.getElementById('channelGrid');
        if(grid) grid.innerHTML='<div style="text-align:center;color:#FF6B6B;padding:20px;">Player failed<br><button onclick="LiveTV.onPageShown()" style="margin-top:10px;background:var(--cv-red);color:white;border:none;padding:8px 16px;border-radius:6px;">Retry</button></div>';
      };
      document.head.appendChild(s);
    }else{
      IPTV.init();
    }
  }
};

var LiveTV = {
  onPageShown: function(){
    if(!window.Hls){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
      s.onload=function(){ IPTV.init(); };
      s.onerror=function(){ 
        var grid=document.getElementById('channelGrid');
        if(grid) grid.innerHTML='<div style="text-align:center;color:#FF6B6B;padding:20px;">Player failed<br><button onclick="LiveTV.onPageShown()" style="margin-top:10px;background:var(--cv-red);color:white;border:none;padding:8px 16px;border-radius:6px;">Retry</button></div>';
      };
      document.head.appendChild(s);
    } else {
      IPTV.init();
    }
  }
};

var LiveTV = {
  onPageShown: function(){
    if(!window.Hls){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
      s.onload=function(){ IPTV.init(); };
      s.onerror=function(){ 
        var grid=document.getElementById('channelGrid');
        if(grid) grid.innerHTML='<div style="text-align:center;color:#FF6B6B;padding:20px;">Player load failed<br><button onclick="LiveTV.onPageShown()" style="margin-top:10px;background:var(--cv-red);color:white;border:none;padding:8px 16px;border-radius:6px;">Retry</button></div>';
      };
      document.head.appendChild(s);
    } else {
      IPTV.init();
    }
  }
};

var LiveTV = {
  onPageShown: function(){
    if(!window.Hls){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
      s.onload=function(){ console.log('[IPTV] HLS loaded'); IPTV.init(); };
      s.onerror=function(){ 
        var grid=document.getElementById('channelGrid');
        if(grid) grid.innerHTML='<div style="text-align:center;color:#FF6B6B;padding:20px;">Player failed<br><button onclick="LiveTV.onPageShown()" style="margin-top:10px;background:var(--cv-red);color:white;border:none;padding:8px 16px;border-radius:6px;">Retry</button></div>';
      };
      document.head.appendChild(s);
    } else {
      IPTV.init();
    }
  }
};

var LiveTV = {
  onPageShown: function(){
    // Preload HLS.js if not already loaded (for faster channel switching)
    if(!window.Hls){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
      s.onload=function(){ console.log('[IPTV] HLS.js loaded'); IPTV.init(); };
      s.onerror=function(){ 
        var grid=document.getElementById('channelGrid');
        if(grid) grid.innerHTML='<div style="text-align:center;color:#FF6B6B;padding:20px;">Failed to load player<br><button onclick="LiveTV.onPageShown()" style="margin-top:10px;background:var(--cv-red);color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">Retry</button></div>';
      };
      document.head.appendChild(s);
    } else {
      IPTV.init();
    }
  }
};

var LiveTV = {
  onPageShown: function(){
    if(!window.Hls){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hls.js@latest';
      s.onload=function(){ IPTV.init(); };
      document.head.appendChild(s);
    } else {
      IPTV.init();
    }
  }
};

function loadCloudConfig(){
  return fetch('/api/config',{credentials:'same-origin',headers:{accept:'application/json'}}).then(function(r){ return r.json(); }).then(function(cfg){
    CFG.TMDB_READY=!!(cfg&&cfg.tmdbReady);
    CFG.PLAYER_CONFIGURED=!!(cfg&&cfg.playerConfigured);
    return cfg;
  }).catch(function(e){ CFG.TMDB_READY=false; CFG.PLAYER_CONFIGURED=false; console.warn('[MoviMoon] Cloud config unavailable',e); return null; });
}

document.addEventListener('DOMContentLoaded', function(){ Prog.init(); Toast.init(); Sidebar.init(); Modal.init(); Search.init(); initScrollEffects(); initDragScroll(); initGenreChips(); Watchlist.updateSidebarBadge(); document.addEventListener('keydown', function(e){ if(e.key==='Escape') Modal.closeAll(); }); loadCloudConfig().then(function(){ loadHomePage(); Browse.initInfiniteScroll(); });
      console.log('[MoviMoon] DOMContentLoaded, checking deep link, href=', window.location.href);
      function tryDeepLink(n){ try{ if(window.__SKIP_SPA_REDIRECT__) return false; var p=Router.parse(); if(p&&p.id){ console.log('[DeepLink] Attempt '+n+' opening',p); Toast.show('Opening shared link: '+p.type+' '+p.id,'info'); Modal.openFull(p.id,p.type); return true; } else { console.log('[DeepLink] No watch link found attempt '+n); return false; } }catch(e){ console.error(e); } return false; }
      setTimeout(function(){
        if(!tryDeepLink(1)){
          if(!Router.handleNavigationHash()){
            setTimeout(function(){ tryDeepLink(2); }, 2000);
          }
        }
      }, 1200); console.log('%c MoviMoon Premium v2.0 Layout Ready! ', 'background:#00C4B4;color:#080C14;font-size:13px;font-weight:800;padding:4px 12px;border-radius:4px;'); });
//]]>


/* XML supplemental script 35 */

//<![CDATA[
(function(){
  console.log('[V112 FINAL] Ultimate Ad Manager - 90s Delay + 5 Min Cooldown + Bottom Right');

  window.mmMarkAdClosed = function(type){
    localStorage.setItem('mm_ad_closed_' + (type||'notification'), Date.now().toString());
    localStorage.setItem('mm_ad_closed_notification', Date.now().toString());
    console.log('[V112] Ad closed, 5 min cooldown started');
  };

  function enforceBottomRight(){
    document.querySelectorAll('div[style*="position: fixed"]').forEach(function(div){
      if(div.id==='cv-header' || div.id==='cv-sidebar' || div.classList.contains('cv-header') || div.classList.contains('cv-sidebar')) return;
      var style = div.getAttribute('style')||'';
      var cs = window.getComputedStyle(div);
      if(cs.position==='fixed' && (cs.top==='0px' || style.indexOf('top: 0')!==-1 || style.indexOf('top:0')!==-1)){
        var z = parseInt(cs.zIndex)||0;
        if(z>1000 && z<100000){
          var txt = (div.textContent||'').toLowerCase();
          if(txt.length>5){
            div.style.top='auto';
            div.style.bottom='20px';
            div.style.right='20px';
            div.style.left='auto';
            div.style.maxWidth='360px';
            div.style.zIndex='2999';
          }
        }
      }
    });
  }

  function init(){
    enforceBottomRight();
    var iv = setInterval(enforceBottomRight, 1000);
    setTimeout(function(){ clearInterval(iv); }, 120000);

    var obs = new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){
          if(!n||n.nodeType!==1) return;
          setTimeout(enforceBottomRight, 100);
          if(n.querySelectorAll){
            n.querySelectorAll('*').forEach(function(el){
              var t=(el.textContent||'').trim().toLowerCase();
              if(t==='hide' || t==='close' || t==='×'){
                el.addEventListener('click', function(){ window.mmMarkAdClosed('notification'); });
              }
            });
          }
        });
      });
    });
    obs.observe(document.body, {childList:true, subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
//]]>


/* XML supplemental script 36 */

//<![CDATA[
(function(){
  console.log('[V116 FINAL] YouTube Age + ETPL Block Bypass - All Previous Fixes Preserved');

  window.tryAlternativeTrailer = function(currentId){
    console.log('[Age/ETPL] Trying alternative trailer');
    var data = (window.State && window.State.activeData) || {};
    var videos = (data.videos && data.videos.results) || [];
    for(var i=0; i<videos.length; i++){
      var v = videos[i];
      if(v.site==='YouTube' && v.key !== currentId){
        console.log('[Alternative] Found:', v.key, v.name);
        var p = document.getElementById('main-player');
        if(p){
          p.src = 'https://www.youtube-nocookie.com/embed/' + v.key + '?autoplay=1&fs=1&rel=0&modestbranding=1';
          var overlay = document.querySelector('.yt-age-restricted-overlay');
          if(overlay) overlay.remove();
          if(window.Toast) Toast.show('Playing alternative: ' + (v.name||'Trailer'), 'success');
        }
        return;
      }
    }
    var id = (window.State && window.State.activeId) || '1213243';
    var type = (window.State && window.State.activeType) || 'movie';
    var url = API.url('/' + type + '/' + id + '/videos', {});
    fetch(url).then(function(r){ return r.json(); }).then(function(json){
      var results = json.results||[];
      for(var k=0;k<results.length;k++){
        var t = results[k];
        if(t.site==='YouTube' && t.key !== currentId){
          var p = document.getElementById('main-player');
          if(p){
            p.src = 'https://www.youtube-nocookie.com/embed/' + t.key + '?autoplay=1&fs=1&rel=0&modestbranding=1';
            var overlay = document.querySelector('.yt-age-restricted-overlay');
            if(overlay) overlay.remove();
            if(window.Toast) Toast.show('Playing: ' + (t.name||'Alternative'), 'success');
          }
          return;
        }
      }
      if(window.Toast) Toast.show('No alternative trailer found. Please watch on YouTube.', 'info');
    });
  };

  function createBlockedOverlay(videoId, videoName, type){
    var container = document.getElementById('main-player');
    if(!container) return;
    var wrapper = container.parentElement;
    if(!wrapper) return;
    var existing = wrapper.querySelector('.yt-age-restricted-overlay');
    if(existing) existing.remove();
    var isETPL = type === 'etpl';
    var icon = isETPL ? 'fa-ban' : 'fa-exclamation-triangle';
    var iconBg = isETPL ? 'rgba(255,136,61,0.15)' : 'rgba(255,0,0,0.1)';
    var iconBorder = isETPL ? 'rgba(255,136,61,0.3)' : 'rgba(255,0,0,0.2)';
    var iconColor = isETPL ? '#FF8A3D' : '#FF4D4D';
    var titleText = isETPL ? 'Video Blocked by Owner' : 'Age-Restricted Trailer';
    var descText = isETPL ? 
      'This trailer contains content from ETPL, who has blocked it from display on this website. Copyright restriction.' :
      'This trailer is age-restricted and requires login.';
    var overlay = document.createElement('div');
    overlay.className = 'yt-age-restricted-overlay';
    overlay.innerHTML = '<div class="yt-age-overlay-icon" style="background:' + iconBg + ';border-color:' + iconBorder + ';color:' + iconColor + '"><i class="fas ' + icon + '"></i></div><div class="yt-age-overlay-title">' + titleText + '</div><div class="yt-age-overlay-desc">' + descText + ' \'' + videoName + '\' cannot be played here.</div><div class="yt-age-overlay-btns"><a href="https://www.youtube.com/watch?v=' + videoId + '" target="_blank" class="btn-yt-watch"><i class="fab fa-youtube"></i> Watch on YouTube</a><button class="btn-yt-alt" onclick="window.tryAlternativeTrailer(\'' + videoId + '\')"><i class="fas fa-search"></i> Try Alternative</button></div>';
    wrapper.style.position = 'relative';
    wrapper.appendChild(overlay);
  }

  function createAgeRestrictedOverlay(videoId, videoName){
    createBlockedOverlay(videoId, videoName, 'age-restricted');
  }

  function monitorYouTubePlayer(){
    var player = document.getElementById('main-player');
    if(!player) return;
    var checkCount = 0;
    var checker = setInterval(function(){
      checkCount++;
      if(checkCount > 12){ clearInterval(checker); return; }
      try{
        var src = player.src||'';
        if(src.indexOf('youtube.com') !== -1 || src.indexOf('youtube-nocookie.com') !== -1){
          if(checkCount === 3){
            if(window.State && window.State.isTrailerPlaying){
              var activeId = window.State.activeId || 0;
              var hash = window.location.hash||'';
              var match = src.match(/embed\/([^?]+)/);
              var videoId = match ? match[1] : '';
              var isLikelyBlocked = false;
              var blockType = 'blocked';
              var title = 'Trailer';
              if(activeId === 1213243 || hash.indexOf('1213243') !== -1 || hash.indexOf('toxic') !== -1){
                isLikelyBlocked = true; blockType = 'age-restricted'; title = 'Toxic: A Fairy Tale for Grown-ups - Trailer';
              } else if(activeId === 1740614 || hash.indexOf('1740614') !== -1 || hash.indexOf('newton') !== -1){
                isLikelyBlocked = true; blockType = 'etpl-blocked'; title = "Newton's 3rd Law - Trailer (ETPL Blocked)";
              } else if(window.State.activeData && window.State.activeData.title){
                title = window.State.activeData.title + ' - Trailer';
                if(checkCount === 4){ isLikelyBlocked = true; blockType = 'unavailable'; }
              }
              if(isLikelyBlocked && videoId){
                if(blockType === 'etpl-blocked'){ createBlockedOverlay(videoId, title, 'etpl'); }
                else { createAgeRestrictedOverlay(videoId, title); }
              }
            }
          }
        }
      }catch(e){}
    }, 2000);
  }

  if(window.FVTabs){
    var orig = window.FVTabs.showTab;
    window.FVTabs.showTab = function(tab, el, isTrailer){
      var result = orig.apply(this, arguments);
      if(tab === 'watch'){ setTimeout(monitorYouTubePlayer, 1000); }
      return result;
    };
  }

  window.addEventListener('hashchange', function(){
    setTimeout(function(){
      if(location.hash.indexOf('1213243') !== -1 || location.hash.indexOf('1740614') !== -1 || location.hash.indexOf('toxic') !== -1 || location.hash.indexOf('newton') !== -1){
        setTimeout(monitorYouTubePlayer, 2000);
      }
    }, 1000);
  });

  setTimeout(function(){
    if(location.hash.indexOf('1213243') !== -1 || location.hash.indexOf('1740614') !== -1){
      monitorYouTubePlayer();
    }
  }, 3000);

})();
//]]>


/* XML supplemental script 37 */

//<![CDATA[
(function(){
  var originalShowTab = null;
  var checkFVTabs = setInterval(function(){
    if(window.FVTabs && window.FVTabs.showTab){
      clearInterval(checkFVTabs);
      originalShowTab = window.FVTabs.showTab;
      window.FVTabs.showTab = function(tabName, el, skipAutoLoad){
        if(tabName==='watch'){
          // Watch tab clicked - open popup player instead of showing player below
          if(window.Player && window.Player.playMovie){
            window.Player.playMovie();
            return;
          }
        }
        // For other tabs, use original
        document.querySelectorAll('.fv-tab').forEach(function(t){ t.classList.remove('active'); });
        document.querySelectorAll('.fv-tab-pane').forEach(function(p){ p.classList.remove('active'); });
        if(el) el.classList.add('active');
        var pane=document.getElementById('tab-'+tabName);
        if(pane) pane.classList.add('active');
        if(tabName==='watch' && !skipAutoLoad){
          // Don't load video in old player
        }
        if(tabName!=='watch'){
          State.isTrailerPlaying=false;
        }
      };
      console.log('[V136] Watch tab now opens popup player - Single player only');
    }
  }, 500);
})();

window.closePlayerModal = function(){
  var fvModal = document.getElementById('fv-modal');
  var playerModal = document.getElementById('fv-player-modal');
  var player = document.getElementById('main-player');
  if(playerModal){
    playerModal.style.display='none';
    playerModal.classList.remove('open');
  }
  if(fvModal){
    fvModal.style.display='block';
    fvModal.classList.add('open');
  }
  if(player){
    player.src='';
  }
  return false;
};

document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){
    var playerModal=document.getElementById('fv-player-modal');
    if(playerModal && playerModal.style.display!=='none' && playerModal.classList.contains('open')){
      closePlayerModal();
    }
  }
});

if(window.Modal && window.Modal.closeAll){
  var origCloseAll = window.Modal.closeAll;
  window.Modal.closeAll = function(){
    var playerModal = document.getElementById('fv-player-modal');
    if(playerModal && playerModal.classList.contains('open')){
      closePlayerModal();
      return;
    }
    if(this.overlay) this.overlay.classList.remove('open');
    document.body.style.overflow='';
    var player=document.getElementById('main-player');
    if(player) player.src='';
    if(this.fv){
      this.fv.classList.remove('open');
      this.fv.style.display='none';
    }
    if(this.qv){
      this.qv.style.display='none';
    }
  };
}
//]]>


/* XML supplemental script 38 */

//<![CDATA[
(function(){
  window.updateMovieSchema = function(data){
    try{
      if(!data) return;
      var title = data.title || data.name || 'Movie';
      var desc = data.overview || 'Watch '+title+' online in HD on MoviMoon';
      var rating = data.vote_average || '7.0';
      var votes = data.vote_count || '1';
      var year = (data.release_date || data.first_air_date || '').split('-')[0] || '2024';
      var poster = data.poster_path ? 'https://image.tmdb.org/t/p/w500'+data.poster_path : '';
      
      var oldSchema = document.getElementById('movie-schema');
      if(oldSchema) oldSchema.remove();
      
      var schema = {
        "@context": "https://schema.org",
        "@type": "Movie",
        "name": title,
        "description": desc,
        "image": poster,
        "dateCreated": year,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": rating,
          "reviewCount": votes,
          "bestRating": "10",
          "worstRating": "1"
        },
        "genre": (data.genres||[]).map(function(g){ return g.name; }),
        "contentRating": "PG-13",
        "url": window.location.href
      };
      
      var script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'movie-schema';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }catch(e){}
  };
  
  var checkModal = setInterval(function(){
    if(window.Modal && window.Modal.openFull){
      clearInterval(checkModal);
      var origOpenFull = window.Modal.openFull;
      window.Modal.openFull = function(id, type){
        var result = origOpenFull.apply(this, arguments);
        setTimeout(function(){
          if(window.State && window.State.activeData){
            updateMovieSchema(window.State.activeData);
          }
        }, 1000);
        return result;
      };
    }
  }, 500);
})();
//]]>


function closePlayerModal(){ try{ if(window.Modal && Modal.closeAll) Modal.closeAll(); }catch(e){} }
