// 11. TopBar scroll behavior
// ============================================================
let headerScrollRaf=0;
let headerCollapseOffset=0;
const TOPBAR_COLLAPSE_MAX=48;

function isInteractionOverlayOpen(){
  const modal=document.getElementById('custom-modal');
  if(modal && !modal.classList.contains('hidden')) return true;
  const settings=document.getElementById('settings-overlay');
  if(settings && settings.classList.contains('open')) return true;
  return false;
}

function shouldBlockGlobalSwipe(){
  if(isInteractionOverlayOpen()) return true;
  const v=(typeof currentVisibleView==='function')?currentVisibleView():null;
  return v==='detail' || v==='new' || v==='cat' || v==='backup';
}
function clampTopbarOffset(value){
  return Math.max(0, Math.min(TOPBAR_COLLAPSE_MAX, Number(value)||0));
}

function applyTopbarCollapseOffset(offset){
  const next=clampTopbarOffset(offset);
  headerCollapseOffset=next;

  const frame=document.getElementById('frame');
  if(frame){
    // RC9A02: numeric offset only. No collapsed class toggles, no height/margin changes.
    frame.style.setProperty('--topbar-collapse-offset', next+'px');
  }
}

function setTopbarCollapsed(collapsed){
  applyTopbarCollapseOffset(collapsed ? TOPBAR_COLLAPSE_MAX : 0);
}
function resetHeaderCollapse(){
  setTopbarCollapsed(false);
}
function canCollapseHeaderForScroller(el){
  if(!el) return false;
  // 스크롤 여유가 충분할 때만 TopBar를 스크롤 연동으로 접습니다.
  return (el.scrollHeight - el.clientHeight) > 120;
}
function handleHeaderCollapseScroll(el){
  const currentView=(typeof currentVisibleView==='function')?currentVisibleView():null;
  if(currentView!=='list' && currentView!=='archive') return;

  const top=el.scrollTop||0;
  if(!canCollapseHeaderForScroller(el)){
    applyTopbarCollapseOffset(0);
    return;
  }

  // scrollTop 직접 매핑 방식:
  // 사용자가 1px 스크롤하면 TopBar도 1px만큼 이동합니다.
  // delta 누적 방식보다 탭 전환/리렌더링/iOS bounce에서 값이 덜 꼬입니다.
  applyTopbarCollapseOffset(Math.min(top, TOPBAR_COLLAPSE_MAX));
}

function bindOneHeaderCollapseScroller(el){
  if(!el || el.dataset.headerCollapseBound==='1') return;
  el.dataset.headerCollapseBound='1';
  el.addEventListener('scroll',()=>{
    if(headerScrollRaf) return;
    headerScrollRaf=requestAnimationFrame(()=>{
      headerScrollRaf=0;
      handleHeaderCollapseScroll(el);
    });
  },{passive:true});
}
function bindHeaderCollapseScroll(){
  [
    ...document.querySelectorAll('#slides-wrapper .slide'),
    ...document.querySelectorAll('#archive-slides-wrapper .slide'),
    ...document.querySelectorAll('[id^="archive-slide-"]')
  ].forEach(bindOneHeaderCollapseScroller);
}



// ── 안드로이드/PWA 뒤로가기 처리 ──

// ============================================================
