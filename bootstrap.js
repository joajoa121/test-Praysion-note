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
  initViewportKeyboardOffsetGuard();
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


// Cross-browser keyboard viewport guard
// ============================================================
// Real cause (confirmed): since Chrome 108, Android Chrome stopped resizing
// the *layout* viewport when the on-screen keyboard opens — it now behaves
// like iOS Safari, where only the *visual* viewport shrinks/shifts down
// (visualViewport.offsetTop grows) while the layout viewport (what
// position:fixed is anchored to) stays full height. Our #frame is
// position:fixed and pinned to the layout viewport, so its top — where
// the TopBar lives — scrolls out of the area the visual viewport is
// actually showing. This is standard modern browser behavior, not a
// Samsung Internet quirk (reproduces in Chrome too).
//
// Fix: track window.visualViewport.offsetTop directly and translate
// #frame down by that amount, so #frame's top edge always matches the
// top of whatever region is actually visible on screen. This works
// regardless of whether interactive-widget=resizes-content is honored
// by the browser, and needs no polling — it's driven entirely by
// visualViewport's own resize/scroll events.
function initViewportKeyboardOffsetGuard(){
  if(window.__vvOffsetGuardBound) return;
  window.__vvOffsetGuardBound=true;

  function updateViewportOffset(){
    const frame=document.getElementById('frame');
    const topbar=document.getElementById('topbar');
    if(!frame) return;

    const vv=window.visualViewport;
    const offsetTop=vv ? Math.max(0, Math.round(vv.offsetTop)) : 0;
    frame.style.setProperty('--vv-offset', offsetTop+'px');

    // Belt-and-suspenders: if something also nudges the document scroll
    // position itself, cancel that out too.
    if(window.scrollX!==0 || window.scrollY!==0) window.scrollTo(0,0);

    // Any page whose TopBar does not scroll-collapse (new / detail / edit /
    // category / backup) must keep its TopBar forced visible. Only
    // list/archive are allowed to collapse it on scroll.
    const isFixedTopbarPage = !frame.classList.contains('page-list') && !frame.classList.contains('page-archive');
    if(isFixedTopbarPage && topbar){
      topbar.classList.add('visible');
      topbar.style.setProperty('display','flex','important');
    }
  }

  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',updateViewportOffset);
    window.visualViewport.addEventListener('scroll',updateViewportOffset);
  }
  window.addEventListener('resize',updateViewportOffset);
  document.addEventListener('focusin',updateViewportOffset,true);
  document.addEventListener('focusout',()=>setTimeout(updateViewportOffset,60),true);

  updateViewportOffset();
}


// ============================================================
