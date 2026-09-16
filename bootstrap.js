// 13. Exposed handlers and bootstrap
// ============================================================
function initFrameResizeObserver(){
  if(typeof ResizeObserver==='undefined'){ initResizeFallback(); return; }
  const frame=document.getElementById('frame');
  if(!frame||frame.dataset.resizeObserverBound==='1') return;
  frame.dataset.resizeObserverBound='1';
  let roTimer=null;
  const ro=new ResizeObserver(()=>{
    clearTimeout(roTimer);
    roTimer=setTimeout(resizeVisibleSlideLayout,120);
  });
  ro.observe(frame);
}



function initSettingsSheetSwipeDown(){
  const sheet=document.getElementById('settings-sheet');
  if(!sheet || sheet.dataset.swipeBound==='1') return;
  sheet.dataset.swipeBound='1';

  let startY=0, currentY=0, dragging=false;

  function start(e){
    const t=e.touches?e.touches[0]:e;
    startY=t.clientY;
    currentY=startY;
    dragging=true;
    sheet.style.transition='none';
  }

  function move(e){
    if(!dragging) return;
    const t=e.touches?e.touches[0]:e;
    currentY=t.clientY;
    const dy=Math.max(0,currentY-startY);
    if(dy>0){
      if(e.cancelable) e.preventDefault();
      sheet.style.transform=`translateY(${dy}px)`;
    }
  }

  function end(){
    if(!dragging) return;
    dragging=false;
    const dy=Math.max(0,currentY-startY);
    sheet.style.transition='';
    sheet.style.transform='';
    if(dy>42) closeSettings();
  }

  sheet.addEventListener('touchstart',start,{passive:true});
  sheet.addEventListener('touchmove',move,{passive:false});
  sheet.addEventListener('touchend',end);
  sheet.addEventListener('mousedown',start);
  window.addEventListener('mousemove',move);
  window.addEventListener('mouseup',end);
}




function handlePinKeyboard(event){
  const lock=document.getElementById('lock');
  if(!lock || lock.classList.contains('hidden')) return;
  if(event.ctrlKey || event.metaKey || event.altKey) return;
  if(/^\d$/.test(event.key)){
    event.preventDefault();
    kp(event.key);
    return;
  }
  if(event.key==='Backspace' || event.key==='Delete'){
    event.preventDefault();
    kpDel();
    return;
  }
  if(event.key==='Enter'){
    if(pinState.buffer.length===4){
      event.preventDefault();
      void handlePin();
    }
    return;
  }
  if(event.key==='Escape' && !document.getElementById('lock-back-btn')?.classList.contains('is-hidden')){
    event.preventDefault();
    cancelPinChange();
  }
}

function bindStaticNavigationEvents(){
  document.getElementById('topbar-back')?.addEventListener('click',topbarBack);
  document.getElementById('search-clear')?.addEventListener('click',clearSearch);
  document.getElementById('fab')?.addEventListener('click',openNew);
  document.getElementById('nav-settings')?.addEventListener('click',openSettings);

  document.getElementById('bottom-nav')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-nav-view]');
    if(!button || !event.currentTarget.contains(button)) return;
    navTo(button.dataset.navView);
  });

  document.getElementById('settings-overlay')?.addEventListener('click',closeSettings);
  document.getElementById('settings-sheet')?.addEventListener('click',event=>{
    const item=event.target.closest('[data-settings-menu]');
    if(!item || !event.currentTarget.contains(item)) return;
    goSettingsMenu(item.dataset.settingsMenu);
  });
}

function bindBootstrapEvents(){
  // ── 이벤트 ──
  bindStaticNavigationEvents();
  bindDetailToolbarActions();
  bindSingleLineInputGuards();
  document.querySelectorAll('[data-pin-digit]').forEach(button=>{
    button.addEventListener('click',()=>kp(button.dataset.pinDigit));
  });
  document.getElementById('pin-delete-btn')?.addEventListener('click',kpDel);
  document.getElementById('lock-back-btn')?.addEventListener('click',cancelPinChange);
  document.getElementById('lock-toggle')?.addEventListener('change',event=>onLockToggle(event.target.checked));
  document.getElementById('change-pin-item')?.addEventListener('click',()=>goSettingsMenu('pin'));
  document.querySelectorAll('[data-lang-option]').forEach(option=>{
    option.addEventListener('click',()=>setLang(option.dataset.langOption));
  });
  document.getElementById('view-new')?.addEventListener('click',handleNewPrayerClick);
  document.addEventListener('keydown',handlePinKeyboard);
  document.getElementById('cat-add-inp').addEventListener('keydown',e=>{ if(e.key==='Enter') addCat(); });
  document.getElementById('memo-add-ta').addEventListener('input',function(){ this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,160)+'px'; });
  document.getElementById('new-title').addEventListener('input',event=>{
    resizeTextareaToContent(event.currentTarget);
  });
  document.getElementById('new-body').addEventListener('input',event=>{
    resizeTextareaToContent(event.currentTarget);
  });
  let _resizeTimer=null;
  function initResizeFallback(){
    if(window._resizeFallbackBound) return;
    window._resizeFallbackBound=true;
    window.addEventListener('resize',()=>{
      clearTimeout(_resizeTimer);
      _resizeTimer=setTimeout(resizeVisibleSlideLayout,120);
    });
  }

  document.getElementById('archive-search-input').addEventListener('input',function(){
    archiveSearchQuery=this.value;
    if(this.value&&archiveTabIdx!==0){ archiveTabIdx=0; renderArchiveTabs(); }
    refreshArchiveSlides();
  });

  initSettingsSheetSwipeDown();
  initLock();
  initAndroidBackButton();
  initFrameResizeObserver();
  initGlobalKeyboardScrollGuard();
  afterNextPaint(refreshLocalizedUI);
}

function bootstrapPraysionApp(){
  bindBootstrapEvents();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bootstrapPraysionApp);
else bootstrapPraysionApp();


// ============================================================
// Service worker update handling
// ============================================================
if ("serviceWorker" in navigator) {
  let refreshing = false;

  function askToReloadForUpdate(registration) {
    const reload = () => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        location.reload();
      }
    };

    const message = popupT('updateAvailable');
    if (typeof showConfirm === "function") {
      showConfirm(message).then((ok) => {
        if (ok) reload();
      });
    } else if (confirm(message)) {
      reload();
    }
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").then((registration) => {
      if (registration.waiting) {
        askToReloadForUpdate(registration);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            askToReloadForUpdate(registration);
          }
        });
      });
    }).catch((err) => console.error("Service Worker registration failed:", err));
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    if (!navigator.serviceWorker.controller) return;
    refreshing = true;
    location.reload();
  });
}


// RC7F: keyboard-aware submit overlay for new prayer page
function updateNewSubmitOffset(){
  const frame=document.getElementById('frame');
  const view=document.getElementById('view-new');
  if(!frame || !view || !view.classList.contains('visible')){
    if(frame) frame.style.setProperty('--new-submit-kb-offset','0px');
    return;
  }
  const vv=window.visualViewport;
  let offset=0;
  if(vv){
    const frameRect=frame.getBoundingClientRect();
    const viewportBottom=vv.offsetTop + vv.height;
    const overlap=Math.max(0, frameRect.bottom - viewportBottom);
    offset=Math.round(overlap);
  }
  frame.style.setProperty('--new-submit-kb-offset', offset + 'px');
  afterNextPaint(keepNewCaretAboveSubmit);
}
(function bindNewSubmitKeyboardOffset(){
  if(window.__newSubmitKeyboardBound) return;
  window.__newSubmitKeyboardBound=true;
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', updateNewSubmitOffset);
    window.visualViewport.addEventListener('scroll', updateNewSubmitOffset);
  }
  window.addEventListener('resize', updateNewSubmitOffset);
  document.addEventListener('focusin', e=>{
    if(document.getElementById('view-new')?.classList.contains('visible')){
      setTimeout(updateNewSubmitOffset, 60);
      setTimeout(updateNewSubmitOffset, 260);
    }
  });
  document.addEventListener('focusout', e=>{
    setTimeout(updateNewSubmitOffset, 80);
    setTimeout(updateNewSubmitOffset, 260);
  });
})();



// RC7H: scroll new-prayer form so the caret stays above the submit overlay
function getTextareaCaretRect(textarea){
  const div=document.createElement('div');
  const style=getComputedStyle(textarea);
  const props=[
    'boxSizing','width','height','overflowX','overflowY',
    'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
    'paddingTop','paddingRight','paddingBottom','paddingLeft',
    'fontStyle','fontVariant','fontWeight','fontStretch','fontSize','fontSizeAdjust',
    'lineHeight','fontFamily','textAlign','textTransform','textIndent',
    'textDecoration','letterSpacing','wordSpacing','tabSize','MozTabSize'
  ];
  props.forEach(p=>{ div.style[p]=style[p]; });
  div.style.position='absolute';
  div.style.visibility='hidden';
  div.style.whiteSpace='pre-wrap';
  div.style.wordWrap='break-word';
  div.style.overflow='hidden';
  div.style.left='-9999px';
  div.style.top='0';

  const value=textarea.value || '';
  const selection=textarea.selectionStart || 0;
  div.textContent=value.substring(0, selection);
  const span=document.createElement('span');
  span.textContent=value.substring(selection) || '.';
  div.appendChild(span);
  document.body.appendChild(div);

  const spanRect=span.getBoundingClientRect();
  const taRect=textarea.getBoundingClientRect();
  const divRect=div.getBoundingClientRect();
  const rect={
    top: taRect.top + (spanRect.top - divRect.top) - textarea.scrollTop,
    bottom: taRect.top + (spanRect.bottom - divRect.top) - textarea.scrollTop,
    left: taRect.left + (spanRect.left - divRect.left),
    right: taRect.left + (spanRect.right - divRect.left)
  };
  document.body.removeChild(div);
  return rect;
}

function keepNewCaretAboveSubmit(){
  const view=document.getElementById('view-new');
  const form=document.getElementById('new-form');
  const ta=document.getElementById('new-body');
  const submitWrap=view?.querySelector(':scope > .restore-btn-wrap');
  if(!view || !form || !ta || !submitWrap || !view.classList.contains('visible')) return;

  requestAnimationFrame(()=>{
    const caret=getTextareaCaretRect(ta);
    const btnRect=submitWrap.getBoundingClientRect();
    const formRect=form.getBoundingClientRect();
    const safeBottom=Math.min(btnRect.top, formRect.bottom) - 18;

    if(caret.bottom > safeBottom){
      const delta=caret.bottom - safeBottom;
      form.scrollTop += delta + 24;
    }

    const safeTop=formRect.top + 12;
    if(caret.top < safeTop){
      form.scrollTop -= (safeTop - caret.top) + 12;
    }
  });
}

(function bindNewCaretScrollFix(){
  if(window.__newCaretScrollFixBound) return;
  window.__newCaretScrollFixBound=true;
  ['input','keyup','click','compositionend'].forEach(evt=>{
    document.addEventListener(evt, e=>{
      if(e.target && e.target.id==='new-body'){
        keepNewCaretAboveSubmit();
      }
    }, true);
  });
  document.addEventListener('selectionchange', ()=>{
    if(document.activeElement && document.activeElement.id==='new-body'){
      keepNewCaretAboveSubmit();
    }
  });
  document.addEventListener('focusin', e=>{
    if(e.target && e.target.id==='new-body'){
      setTimeout(keepNewCaretAboveSubmit,80);
      setTimeout(keepNewCaretAboveSubmit,280);
    }
  });
})();



function bindSingleLineInputGuards(){
  ['new-title','detail-title-input','cat-add-inp'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el || el.dataset.singleLineGuardBound==='1') return;
    el.dataset.singleLineGuardBound='1';
    el.addEventListener('keydown',e=>{
      if(e.key==='Enter'){ e.preventDefault(); }
    });
    el.addEventListener('paste',()=>{
      afterNextPaint(()=>{
        const clean=normalizeSingleLine(el.value ?? el.textContent ?? '');
        if('value' in el) el.value=clean;
        else el.textContent=clean;
      });
    });
  });
}


// Samsung Internet keyboard/viewport handling
// ============================================================
// Detail/edit uses a Visual Viewport shell: #frame follows the actually visible
// viewport and only #detail-scroll scrolls. Other screens keep the legacy
// window-scroll recovery guard because they do not use this shell.
function initGlobalKeyboardScrollGuard(){
  if(window.__kbScrollGuardBound) return;
  window.__kbScrollGuardBound=true;

  let guarding=false;
  let guardRaf=0;

  function isTextEntryElement(el){
    if(!el) return false;
    if(el.isContentEditable) return true;
    if(el.tagName==='TEXTAREA') return true;
    if(el.tagName!=='INPUT') return false;

    return [
      'text',
      'search',
      'email',
      'url',
      'tel',
      'password',
      'number'
    ].includes((el.type||'text').toLowerCase());
  }

  function syncDetailVisualViewport(){
    const frame=document.getElementById('frame');
    if(!frame) return;

    if(!frame.classList.contains('page-detail')){
      frame.style.removeProperty('--detail-vv-top');
      frame.style.removeProperty('--detail-vv-height');

      // Detail mode temporarily overrides TopBar transform/display inline.
      // Remove those overrides as soon as we leave detail so list/archive
      // compositor collapse CSS can take control again.
      const topbar=document.getElementById('topbar');
      if(topbar){
        topbar.style.removeProperty('display');
        topbar.style.removeProperty('transform');
      }
      return;
    }

    const vv=window.visualViewport;
    const top=vv ? Math.max(0, Math.round(vv.offsetTop)) : 0;
    const height=vv ? Math.max(1, Math.round(vv.height)) : Math.max(1, window.innerHeight);

    frame.style.setProperty('--detail-vv-top', top+'px');
    frame.style.setProperty('--detail-vv-height', height+'px');

    const topbar=document.getElementById('topbar');
    if(topbar){
      topbar.classList.add('visible');
      topbar.style.setProperty('display','flex','important');
      topbar.style.setProperty('transform','none','important');
    }
  }

  function restoreAppViewport(){
    if(!guarding) return;

    const frame=document.getElementById('frame');

    // Detail/edit deliberately follows VisualViewport instead of fighting it.
    if(frame?.classList.contains('page-detail')){
      syncDetailVisualViewport();
      return;
    }

    if(window.scrollX!==0 || window.scrollY!==0){
      window.scrollTo(0,0);
    }

    if(frame){
      frame.style.setProperty('top','0px','important');
      frame.style.setProperty('left','0px','important');
      frame.style.setProperty('transform','none','important');
    }
  }

  function runGuardLoop(){
    if(!guarding){
      guardRaf=0;
      return;
    }

    restoreAppViewport();
    guardRaf=requestAnimationFrame(runGuardLoop);
  }

  function startGuard(){
    guarding=true;
    if(!guardRaf) guardRaf=requestAnimationFrame(runGuardLoop);
  }

  function stopGuardLater(){
    requestAnimationFrame(()=>{
      guarding=isTextEntryElement(document.activeElement);
      if(!guarding && guardRaf){
        cancelAnimationFrame(guardRaf);
        guardRaf=0;
      }
      syncDetailVisualViewport();
    });
  }

  document.addEventListener('focusin',event=>{
    if(!isTextEntryElement(event.target)) return;
    startGuard();
    syncDetailVisualViewport();
  },true);

  document.addEventListener('focusout',event=>{
    if(!isTextEntryElement(event.target)) return;
    stopGuardLater();
  },true);

  [
    'keydown',
    'keyup',
    'beforeinput',
    'input',
    'compositionstart',
    'compositionupdate',
    'compositionend',
    'selectionchange'
  ].forEach(eventName=>{
    document.addEventListener(eventName,()=>{
      if(!isTextEntryElement(document.activeElement)) return;
      startGuard();
      restoreAppViewport();
    },true);
  });

  window.addEventListener('scroll',restoreAppViewport,{passive:true});
  window.addEventListener('resize',()=>{
    syncDetailVisualViewport();
    restoreAppViewport();
  });

  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',syncDetailVisualViewport);
    window.visualViewport.addEventListener('scroll',syncDetailVisualViewport);
  }

  // showView() changes page-* classes on #frame. Sync immediately when detail
  // becomes active, even before a keyboard/viewport event occurs.
  const frame=document.getElementById('frame');
  if(frame){
    new MutationObserver(syncDetailVisualViewport).observe(frame,{
      attributes:true,
      attributeFilter:['class']
    });
  }
  syncDetailVisualViewport();
}


// ============================================================
