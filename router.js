// 04. UI visibility helpers and page routing
// ============================================================
function setHidden(el, hidden=true){
  if(!el) return;
  el.classList.toggle('is-hidden', !!hidden);
  if(hidden){
    el.classList.remove('is-flex','is-block');
  }else{
    el.style.removeProperty('display');
  }
}
function setShown(el, shown=true){
  setHidden(el, !shown);
}
function setFlexShown(el, shown=true){
  if(!el) return;
  setHidden(el, !shown);
  el.classList.toggle('is-flex', !!shown);
}
function setBlockShown(el, shown=true){
  if(!el) return;
  setHidden(el, !shown);
  el.classList.toggle('is-block', !!shown);
}

function setAppPageState(v){
  const appShell=document.getElementById('frame');
  if(!appShell) return;
  appShell.classList.remove('page-list','page-archive','page-new','page-detail','page-cat','page-backup','page-lock');
  appShell.classList.add('page-'+v);
}
function setAppLockState(){
  const appShell=document.getElementById('frame');
  if(!appShell) return;
  appShell.classList.remove('page-list','page-archive','page-new','page-detail','page-cat','page-backup');
  appShell.classList.add('page-lock');
}

function activeViewName(){
  return ['list','new','detail','cat','archive','backup'].find(x=>document.getElementById('view-'+x)?.classList.contains('visible'))||'';
}

function setTopbarConfig(v){
  const topbar=document.getElementById('topbar');
  const titleEl=document.getElementById('topbar-title');
  const backBtn=document.getElementById('topbar-back');
  const actions=document.getElementById('topbar-actions');
  if(!topbar||!titleEl||!backBtn||!actions) return;

  topbar.classList.add('visible');
  setFlexShown(backBtn, false);
  backBtn.innerHTML='<i class="ti ti-arrow-left"></i>';
  actions.innerHTML='';

  if(v==='list'){
    titleEl.textContent='Write your vision, Pray it into reality';
    actions.innerHTML='';
  }else if(v==='new'){
    titleEl.textContent=uiT('newPrayer');
    setFlexShown(backBtn, true);
    backBtn.innerHTML='<i class="ti ti-x"></i>';
  }else if(v==='archive'){
    titleEl.textContent='Write your vision, Pray it into reality';
    actions.innerHTML='';
  }else if(v==='cat'){
    titleEl.textContent=uiT('catManage');
    setFlexShown(backBtn, true);
  }else if(v==='backup'){
    titleEl.textContent=uiT('backup');
    setFlexShown(backBtn, true);
  }else if(v==='detail'){
    titleEl.textContent='';
    setFlexShown(backBtn, true);
    const p=AppState.prayers.find(x=>x.id===curPrayerId);
    if(p){
      actions.innerHTML=`<button class="hdr-btn" id="edit-detail-btn" type="button" data-detail-toolbar-action="edit" aria-label="${uiT('editPrayerLabel')}"><i class="ti ti-pencil" aria-hidden="true"></i></button><button type="button" class="hdr-btn danger" data-detail-toolbar-action="delete" aria-label="${uiT('deletePrayerLabel')}"><i class="ti ti-trash" aria-hidden="true"></i></button>`;
    }
  }
}


function bindDetailToolbarActions(){
  const actions=document.getElementById('topbar-actions');
  if(!actions || actions.dataset.detailToolbarBound==='1') return;
  actions.addEventListener('click',event=>{
    const button=event.target.closest('[data-detail-toolbar-action]');
    if(!button || !actions.contains(button)) return;
    const action=button.dataset.detailToolbarAction;
    if(action==='edit') toggleDetailEdit(event);
    if(action==='delete') deleteCurPrayer();
  });
  actions.dataset.detailToolbarBound='1';
}

let detailReturnView='list';

function setDetailReturnView(view){
  detailReturnView=view==='archive'?'archive':'list';
}

function returnFromDetail(){
  cancelDetailEdit();
  if(typeof beginDetailReturnRestore==='function') beginDetailReturnRestore();
  showView(detailReturnView,false);
}

function commonTopbarBack(){
  const v=activeViewName();
  if(v==='new'||v==='cat'||v==='backup'||v==='archive'){
    showView('list',false);
    return;
  }
  if(v==='detail'){
    returnFromDetail();
    return;
  }
  goBack();
}

const VIEW_NAMES=['list','new','detail','cat','archive','backup'];

function getViewElement(view){
  return document.getElementById('view-'+view);
}

function showOnlyView(view){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('visible'));
  getViewElement(view)?.classList.add('visible');
}

const VIEW_LIFECYCLE={
  list:{
    enter(){
      buildSlides();
      renderTabs();
      if(typeof restoreDetailReturnState==='function') restoreDetailReturnState('list');
    },
    afterEnter(){
      afterNextPaint(bindHeaderCollapseScroll);
    }
  },
  new:{
    enter(){
      afterNextPaint(updateNewSubmitOffset);
    }
  },
  detail:{
    enter(){
      setTopbarConfig('detail');
      renderDetail();
    },
    leave(nextView){
      if(nextView!=='detail' && typeof resetDetailEditState==='function'){
        resetDetailEditState({restoreValues:true});
      }
    }
  },
  cat:{
    enter(){
      renderCatManage();
    }
  },
  backup:{
    enter(){
      document.getElementById('topbar')?.classList.add('visible');
      setTopbarConfig('backup');
    },
    afterEnter(){
      afterNextPaint(()=>{
        refreshLocalizedUI();
        setTopbarConfig('backup');
        document.getElementById('topbar')?.classList.add('visible');
      });
    }
  },
  archive:{
    enter(){
      const preserveState=typeof shouldPreserveDetailReturnState==='function' && shouldPreserveDetailReturnState('archive');
      renderArchive({preserveState});
      if(typeof restoreDetailReturnState==='function') restoreDetailReturnState('archive');
    },
    afterEnter(){
      afterNextPaint(bindHeaderCollapseScroll);
    }
  }
};

function showView(v, pushHistory=true){
  const nextView=VIEW_NAMES.includes(v)?v:'list';
  const curView=activeViewName();

  resetHeaderCollapse();
  document.getElementById('app-toast')?.classList.add('toast-hidden');
  afterNextPaint(refreshLocalizedUI);

  if(curView && curView!==nextView){
    VIEW_LIFECYCLE[curView]?.leave?.(nextView);
    if(pushHistory) viewHistory.push(curView);
  }

  showOnlyView(nextView);
  setAppPageState(nextView);

  const showNav=nextView==='list'||nextView==='archive';
  document.getElementById('bottom-nav')?.classList.toggle('visible',showNav);
  if(showNav) updateBottomNavActive(nextView);
  document.getElementById('topbar')?.classList.add('visible');

  VIEW_LIFECYCLE[nextView]?.enter?.(curView);
  setTopbarConfig(nextView);
  VIEW_LIFECYCLE[nextView]?.afterEnter?.(curView);

  afterNextPaint(updateNewSubmitOffset);
  if(pushHistory && appBackHistoryReady) pushAppHistory(nextView);
}
function goList(){ viewHistory=[]; showView('list',false); }
function goBack(){ const prev=viewHistory.pop(); if(prev) showView(prev,false); else showView('list',false); }
function topbarBack(){ commonTopbarBack(); }
function goArchive(){ showView('archive'); }
function updateBottomNavActive(v){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  if(v==='list') document.getElementById('nav-list')?.classList.add('active');
  else if(v==='archive') document.getElementById('nav-archive')?.classList.add('active');
}
function navTo(v){
  showView(v, false);
  updateBottomNavActive(v);
}

// ── 탭 ──

// ============================================================
