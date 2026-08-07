// ============================================================
// 05. Prayer list
// ============================================================
// Prayer edit session state (original snapshot + draft-only values)
let _editPrayerState = null;
let _isSavingEditPrayer = false;
let _detailUICache = null;

function getDetailUI(){
  if(_detailUICache) return _detailUICache;
  const ui={
    view:document.getElementById('view-detail'),
    title:document.getElementById('detail-title-input'),
    body:document.getElementById('detail-body-input'),
    category:document.getElementById('detail-cat-wrap'),
    createdAt:document.getElementById('detail-created-at'),
    memoAdd:document.getElementById('memo-add-area'),
    memoList:document.getElementById('memo-list')
  };
  if(Object.values(ui).some(el=>!el)) return ui;
  _detailUICache=ui;
  return ui;
}
function getEditPrayerUI(){
  const detailUI=getDetailUI();
  return {
    view:detailUI.view,
    title:detailUI.title,
    body:detailUI.body,
    category:detailUI.category,
    memoAdd:detailUI.memoAdd,
    saveButton:document.getElementById('edit-detail-btn')
  };
}
function getCurrentDetailPrayer(){
  return AppState.prayers.find(prayer=>prayer.id===curPrayerId)||null;
}
function createEditPrayerState(prayer,titleEl,bodyEl){
  if(!prayer) return null;
  return {
    id:prayer.id,
    original:{
      title:titleEl?.value||'',
      body:bodyEl?.value||'',
      cat:prayer.cat
    },
    draftCategory:prayer.cat
  };
}
function hasActiveEditPrayerSession(){
  return !!(_editPrayerState&&_editPrayerState.id===curPrayerId);
}
function clearEditPrayerState(){
  _editPrayerState=null;
}
function hasDetailCategoryChanged(previousCategory, nextCategory){
  return CategoryService.normalize(previousCategory)!==CategoryService.normalize(nextCategory);
}
function getEditPrayerDraft(){
  const ui=getEditPrayerUI();
  const prayer=getCurrentDetailPrayer();
  return {
    title:ui.title?.value||'',
    body:ui.body?.value||'',
    category:CategoryService.normalize(_editPrayerState?.draftCategory ?? prayer?.cat)
  };
}
async function validateEditPrayerDraft(draft,{prayerId,titleEl}={}){
  if(CategoryService.isUncategorized(draft.category)){
    await showAlert(popupT('uncategorized'));
    return null;
  }

  const title=draft.title.trim();
  if(!title){
    await showAlert(uiT('prayerTitleRequired'));
    if(curPrayerId!==prayerId) return null;
    titleEl?.focus();
    if(typeof titleEl?.setSelectionRange==='function'){
      titleEl.setSelectionRange(titleEl.value.length,titleEl.value.length);
    }
    return null;
  }

  return { ...draft, title };
}
function createEditPrayerSnapshot(prayer){
  return {
    title:prayer?.title||'',
    body:prayer?.body||'',
    cat:prayer?.cat
  };
}
function applyEditPrayerDraft(prayer,draft){
  prayer.title=draft.title;
  prayer.body=draft.body;
  prayer.cat=draft.category;
}
function restoreEditPrayerSnapshot(prayer,snapshot){
  prayer.title=snapshot.title;
  prayer.body=snapshot.body;
  prayer.cat=snapshot.cat;
}

function renderTabs(){
  const bar=document.getElementById('tab-bar');
  renderTabButtons(bar, tabs(), curTabIdx, goTab);
  scrollTabIntoView(curTabIdx);
}
function goTab(i){
  curTabIdx=i;
  const w=document.getElementById('slide-container').getBoundingClientRect().width;
  document.getElementById('slides-wrapper').style.transform=`translateX(${-i*w}px)`;
  renderTabs();
}
function scrollTabIntoView(i){
  const bar=document.getElementById('tab-bar');
  const tabEls=bar.querySelectorAll('.tab');
  if(!tabEls[i]) return;
  const tab=tabEls[i];
  const barRect=bar.getBoundingClientRect();
  const tabRect=tab.getBoundingClientRect();
  const scrollLeft=bar.scrollLeft;
  const tabLeft=tabRect.left-barRect.left+scrollLeft;
  const tabRight=tabLeft+tabRect.width;
  if(tabLeft<scrollLeft+16) bar.scrollTo({left:tabLeft-16,behavior:'smooth'});
  else if(tabRight>scrollLeft+barRect.width-16) bar.scrollTo({left:tabRight-barRect.width+16,behavior:'smooth'});
}

// ── 슬라이드 ──
function resizeSlideLayout({archive=false}={}){
  const containerId=archive?'archive-slide-container':'slide-container';
  const wrapperId=archive?'archive-slides-wrapper':'slides-wrapper';
  const slidePrefix=archive?'archive-slide-':'slide-';
  const activeIndex=archive?archiveTabIdx:curTabIdx;
  const tabCount=archive?archiveTabs().length:tabs().length;
  const cont=document.getElementById(containerId);
  const wrapper=document.getElementById(wrapperId);
  if(!cont||!wrapper) return false;
  const width=cont.getBoundingClientRect().width;
  if(!Number.isFinite(width)||width<=0) return false;
  const previousWidth=Number(wrapper.dataset.slideWidth)||0;
  if(Math.abs(previousWidth-width)<0.5) return false;
  wrapper.dataset.slideWidth=String(width);
  wrapper.style.width=(width*tabCount)+'px';
  wrapper.style.transform=`translateX(${-activeIndex*width}px)`;
  wrapper.querySelectorAll('.slide').forEach((slide,index)=>{
    if(slide.id===`${slidePrefix}${index}`) slide.style.width=width+'px';
  });
  return true;
}

function resizeVisibleSlideLayout(){
  const listVisible=document.getElementById('view-list')?.classList.contains('visible');
  const archiveVisible=document.getElementById('view-archive')?.classList.contains('visible');
  if(listVisible) resizeSlideLayout();
  if(archiveVisible) resizeSlideLayout({archive:true});
}

function buildSlides(){
  const cont=document.getElementById('slide-container');
  bindPrayerCardDelegation(cont);
  const wrapper=document.getElementById('slides-wrapper');
  const allTabs=tabs();
  const w=cont.getBoundingClientRect().width;
  wrapper.dataset.slideWidth=String(w);
  wrapper.style.width=(w*allTabs.length)+'px';
  wrapper.style.transform=`translateX(${-curTabIdx*w}px)`;
  wrapper.innerHTML=allTabs.map((_,i)=>`<div class="slide" id="slide-${i}" style="width:${w}px;"></div>`).join('');
  allTabs.forEach((_,i)=>renderSlide(i));
}

function prayerDateValue(p){
  let newest=appDateValue(p&&p.createdAt);
  if(Array.isArray(p&&p.memos)){
    p.memos.forEach(m=>{
      const value=appDateValue(m&&m.date);
      if(value>newest) newest=value;
    });
  }
  return newest;
}
function sortPrayersNewestFirst(list){
  return list
    .map((prayer,index)=>({
      prayer,
      index,
      dateValue:prayerDateValue(prayer),
      idValue:Number(prayer&&prayer.id)||0
    }))
    .sort((a,b)=>{
      const dateDiff=b.dateValue-a.dateValue;
      if(dateDiff!==0) return dateDiff;
      const idDiff=b.idValue-a.idValue;
      return idDiff!==0?idDiff:a.index-b.index;
    })
    .map(item=>item.prayer);
}


function bindPrayerCardDelegation(container){
  if(!container || container.dataset.prayerCardDelegationBound==='1') return;
  container.addEventListener('click',event=>{
    if(event.target.closest('button,a,input,textarea,select,label')) return;
    const card=event.target.closest('.prayer-card[data-prayer-id]');
    if(!card || !container.contains(card)) return;
    const id=Number(card.dataset.prayerId);
    if(Number.isFinite(id)) openPrayer(id);
  });
  container.dataset.prayerCardDelegationBound='1';
}


function renderTabButtons(bar, tabItems, activeIndex, onSelect){
  if(!bar) return;
  const fragment=document.createDocumentFragment();
  tabItems.forEach((item,index)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='tab'+(activeIndex===index?' active':'');
    btn.textContent=CategoryService.label(item);
    btn.addEventListener('click',()=>onSelect(index));
    fragment.appendChild(btn);
  });
  bar.replaceChildren(fragment);
}

function createEmptyState(iconClass, message){
  const box=document.createElement('div');
  box.className='list-empty';
  const icon=document.createElement('i');
  icon.className=iconClass;
  icon.style.cssText='font-size:36px;color:#ccc;';
  box.appendChild(icon);
  box.appendChild(document.createElement('br'));
  box.appendChild(document.createTextNode(message));
  return box;
}

function createPrayerCardElement(p,{archived=false}={}){
  const card=document.createElement('div');
  card.className='prayer-card';
  card.dataset.prayerId=String(p.id);

  const top=document.createElement('div');
  top.className='prayer-card-top';

  const title=document.createElement('span');
  title.className='prayer-card-title';
  title.textContent=p.title||uiT('untitled');
  top.appendChild(title);

  const badge=document.createElement('span');
  badge.className='cat-badge';
  badge.textContent=CategoryService.label(p.cat);
  top.appendChild(badge);

  if(archived){
    const tag=document.createElement('span');
    tag.className='archived-tag';
    tag.textContent=uiT('answered');
    top.appendChild(tag);
  }

  card.appendChild(top);

  if(p.body){
    const body=document.createElement('div');
    body.className='prayer-card-body';
    body.textContent=p.body;
    card.appendChild(body);
  }

  const sub=document.createElement('div');
  sub.className='prayer-card-sub';
  const date=formatAppDateTime(p.createdAt);
  sub.appendChild(document.createTextNode(date+' '));
  const msgIcon=document.createElement('i');
  msgIcon.className='ti ti-message';
  msgIcon.style.cssText='font-size:13px;vertical-align:0px;margin-left:6px;';
  sub.appendChild(msgIcon);
  sub.appendChild(document.createTextNode(' '+(Array.isArray(p.memos)?p.memos.length:0)));
  card.appendChild(sub);

  return card;
}

function renderPrayerListInto(el,list,{archived=false,emptyIcon='ti ti-pray',emptyMessage='' }={}){
  if(!el) return;
  if(!list.length){
    el.replaceChildren(createEmptyState(emptyIcon, emptyMessage));
    return;
  }
  const fragment=document.createDocumentFragment();
  const count=document.createElement('div');
  count.className='list-count';
  count.textContent=uiT('count',list.length);
  fragment.appendChild(count);
  list.forEach(item=>fragment.appendChild(createPrayerCardElement(item,{archived})));
  el.replaceChildren(fragment);
}

function renderSlide(i){
  const t=tabs()[i];
  const el=document.getElementById('slide-'+i); if(!el) return;
  const q=searchQuery.trim().toLowerCase();
  const list=sortPrayersNewestFirst(AppState.prayers.filter(p=>{
    const catMatch=CategoryService.isAll(t)?!p.archived:CategoryService.normalize(p.cat)===t&&!p.archived;
    if(!catMatch) return false;
    if(!q) return true;
    return (p.title||'').toLowerCase().includes(q)||(p.body||'').toLowerCase().includes(q)||(Array.isArray(p.memos)&&p.memos.some(m=>(m.text||'').toLowerCase().includes(q)));
  }));
  renderPrayerListInto(el, list, {
    archived:false,
    emptyIcon:'ti ti-pray',
    emptyMessage:q?uiT('noSearch'):uiT('empty')
  });
}
function refreshSlides(){ tabs().forEach((_,i)=>renderSlide(i));
  refreshLocalizedUI(); }

function updateSinglePrayerCardUI(prayerId){
  const p=AppState.prayers.find(x=>x.id===prayerId);
  if(!p) return false;
  const cards=document.querySelectorAll(`.prayer-card[data-prayer-id="${prayerId}"]`);
  if(!cards.length) return false;
  cards.forEach(card=>{
    const title=card.querySelector('.prayer-card-title');
    if(title) title.textContent=p.title||uiT('untitled');
    const badge=card.querySelector('.cat-badge');
    if(badge) badge.textContent=CategoryService.label(p.cat);
    const top=card.querySelector('.prayer-card-top');
    let body=card.querySelector('.prayer-card-body');
    if(p.body){
      if(!body&&top){
        body=document.createElement('div');
        body.className='prayer-card-body';
        top.insertAdjacentElement('afterend', body);
      }
      if(body) body.textContent=p.body;
    }else if(body){
      body.remove();
    }
    const sub=card.querySelector('.prayer-card-sub');
    if(sub){
      const memoCount=Array.isArray(p.memos)?p.memos.length:0;
      const date=formatAppDateTime(p.createdAt);
      sub.replaceChildren();
      sub.appendChild(document.createTextNode(date+' '));
      const icon=document.createElement('i');
      icon.className='ti ti-message';
      icon.style.cssText='font-size:13px;vertical-align:0px;margin-left:6px;';
      sub.appendChild(icon);
      sub.appendChild(document.createTextNode(' '+memoCount));
    }
  });
  refreshLocalizedUI();
  return true;
}

// ── 스와이프 ──
(function(){
  let sx=0,sy=0,dragging=false;
  function onStart(e){
    if(typeof shouldBlockGlobalSwipe==='function' && shouldBlockGlobalSwipe()) return;
    if(!document.getElementById('view-list')?.classList.contains('visible')) return;
    const t=e.touches?e.touches[0]:e; sx=t.clientX; sy=t.clientY; dragging=true;
  }
  function onEnd(e){
    if(!dragging) return; dragging=false;
    if(typeof shouldBlockGlobalSwipe==='function' && shouldBlockGlobalSwipe()) return;
    if(!document.getElementById('view-list')?.classList.contains('visible')) return;
    const t=e.changedTouches?e.changedTouches[0]:e;
    const dx=t.clientX-sx, dy=t.clientY-sy;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.2){
      const n=tabs().length;
      if(dx<0&&curTabIdx<n-1) goTab(curTabIdx+1);
      else if(dx>0&&curTabIdx>0) goTab(curTabIdx-1);
    }
  }
  document.addEventListener('touchstart',onStart,{passive:true});
  document.addEventListener('touchend',onEnd,{passive:true});
  document.addEventListener('mousedown',onStart);
  document.addEventListener('mouseup',onEnd);
})();


// ── 응답함 스와이프 ──
(function(){
  let sx=0,sy=0,dragging=false;
  function onStart(e){
    if(typeof shouldBlockGlobalSwipe==='function' && shouldBlockGlobalSwipe()) return;
    if(!document.getElementById('view-archive')?.classList.contains('visible')) return;
    const t=e.touches?e.touches[0]:e;
    sx=t.clientX; sy=t.clientY; dragging=true;
  }
  function onEnd(e){
    if(!dragging) return;
    dragging=false;
    if(typeof shouldBlockGlobalSwipe==='function' && shouldBlockGlobalSwipe()) return;
    if(!document.getElementById('view-archive')?.classList.contains('visible')) return;
    const t=e.changedTouches?e.changedTouches[0]:e;
    const dx=t.clientX-sx, dy=t.clientY-sy;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.2){
      const n=archiveTabs().length;
      if(dx<0&&archiveTabIdx<n-1) goArchiveTab(archiveTabIdx+1);
      else if(dx>0&&archiveTabIdx>0) goArchiveTab(archiveTabIdx-1);
    }
  }
  document.addEventListener('touchstart',onStart,{passive:true});
  document.addEventListener('touchend',onEnd,{passive:true});
  document.addEventListener('mousedown',onStart);
  document.addEventListener('mouseup',onEnd);
})();

// ── 검색 ──
document.getElementById('search-input').addEventListener('input',function(){
  searchQuery=this.value;
  document.getElementById('search-clear').classList.toggle('visible',!!this.value);
  if(this.value&&curTabIdx!==0){ curTabIdx=0; renderTabs(); }
  refreshSlides();
});
function clearSearch(){
  searchQuery='';
  document.getElementById('search-input').value='';
  document.getElementById('search-clear').classList.remove('visible');
  refreshSlides();
}

// ── 보관함 ──

// ============================================================
// 06. Archive / answered prayers
// ============================================================
let archiveTabIdx=0;
let archiveSearchQuery='';

function archiveTabs(){
  const cats=[...new Set(AppState.prayers.filter(p=>p.archived).map(p=>CategoryService.normalize(p.cat)))];
  return [CategoryService.ALL,...CategoryService.sort(cats)];
}

function renderArchive({preserveState=false}={}){
  if(!preserveState){
    archiveTabIdx=0;
    archiveSearchQuery='';
  }
  const input=document.getElementById('archive-search-input');
  if(input) input.value=archiveSearchQuery;
  buildArchiveSlides();
  renderArchiveTabs();
}

function renderArchiveTabs(){
  const bar=document.getElementById('archive-tab-bar');
  renderTabButtons(bar, archiveTabs(), archiveTabIdx, goArchiveTab);
}

function goArchiveTab(i){
  archiveTabIdx=i;
  const w=document.getElementById('archive-slide-container').getBoundingClientRect().width;
  document.getElementById('archive-slides-wrapper').style.transform=`translateX(${-i*w}px)`;
  renderArchiveTabs();
}

function buildArchiveSlides(){
  const cont=document.getElementById('archive-slide-container');
  bindPrayerCardDelegation(cont);
  const wrapper=document.getElementById('archive-slides-wrapper');
  const allTabs=archiveTabs();
  const w=cont.getBoundingClientRect().width;
  wrapper.dataset.slideWidth=String(w);
  wrapper.style.width=(w*allTabs.length)+'px';
  wrapper.style.transform=`translateX(${-archiveTabIdx*w}px)`;
  wrapper.innerHTML=allTabs.map((_,i)=>`<div class="slide" id="archive-slide-${i}" style="width:${w}px;"></div>`).join('');
  allTabs.forEach((_,i)=>renderArchiveSlide(i));
}

function renderArchiveSlide(i){
  const t=archiveTabs()[i];
  const el=document.getElementById('archive-slide-'+i); if(!el) return;
  const q=archiveSearchQuery.trim().toLowerCase();
  const list=AppState.prayers.filter(p=>{
    if(!p.archived) return false;
    const catMatch=CategoryService.isAll(t)||CategoryService.normalize(p.cat)===t;
    if(!catMatch) return false;
    if(!q) return true;
    return (p.title||'').toLowerCase().includes(q)||(p.body||'').toLowerCase().includes(q)||(Array.isArray(p.memos)&&p.memos.some(m=>(m.text||'').toLowerCase().includes(q)));
  });
  renderPrayerListInto(el, list, {
    archived:true,
    emptyIcon:'ti ti-archive',
    emptyMessage:q?uiT('noSearch'):uiT('noArchive')
  });
}

function refreshArchiveSlides(){ archiveTabs().forEach((_,i)=>renderArchiveSlide(i)); refreshLocalizedUI(); }

// ── 새 기도제목 ──

// ============================================================
// 07. New prayer form
// ============================================================
let _newPrayerUI=null;
let _isSubmittingNewPrayer=false;

function getNewPrayerUI(){
  if(_newPrayerUI) return _newPrayerUI;
  _newPrayerUI={
    view:document.getElementById('view-new'),
    form:document.getElementById('new-form'),
    categoryWrap:document.getElementById('new-cat-chips'),
    title:document.getElementById('new-title'),
    body:document.getElementById('new-body'),
    submitButton:document.getElementById('new-submit-btn')
  };
  return _newPrayerUI;
}

function setNewPrayerSubmitState(isSubmitting){
  _isSubmittingNewPrayer=isSubmitting;
  const button=getNewPrayerUI().submitButton;
  if(!button) return;
  button.disabled=isSubmitting;
  button.setAttribute('aria-busy',String(isSubmitting));
}

function getInitialNewPrayerCategory(){
  const currentTab=tabs()[curTabIdx];
  if(!CategoryService.isAll(currentTab)) return CategoryService.normalize(currentTab);
  const selectable=CategoryService.normalizeArray(AppState.categories)
    .filter(category=>!CategoryService.isUncategorized(category));
  return selectable[0]||'';
}

function resetNewPrayerTextarea(textarea){
  if(!textarea) return;
  textarea.value='';
  textarea.style.height='auto';
}

function resetNewPrayerForm(){
  const ui=getNewPrayerUI();
  resetNewPrayerTextarea(ui.title);
  resetNewPrayerTextarea(ui.body);
}

function openNew(){
  newSelectedCat=getInitialNewPrayerCategory();
  resetNewPrayerForm();
  renderNewCatChips();
  showView('new');
  // Auto-focus disabled to keep the new-prayer header stable on mobile.
}
function renderNewCatChips(){
  const wrap=getNewPrayerUI().categoryWrap;
  if(!wrap) return;
  wrap.replaceChildren();
  AppState.categories.filter(c=>!CategoryService.isUncategorized(c)).forEach(c=>{
    const normalizedCategory=CategoryService.normalize(c);
    const isSelected=newSelectedCat===normalizedCategory;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='cat-chip'+(isSelected?' selected':'');
    btn.dataset.newCategory=normalizedCategory;
    btn.setAttribute('aria-pressed',String(isSelected));
    btn.textContent=CategoryService.label(c);
    wrap.appendChild(btn);
  });
}
function updateNewCategorySelection(){
  const wrap=getNewPrayerUI().categoryWrap;
  if(!wrap) return;
  wrap.querySelectorAll('[data-new-category]').forEach(button=>{
    const isSelected=CategoryService.normalize(button.dataset.newCategory)===newSelectedCat;
    button.classList.toggle('selected',isSelected);
    button.setAttribute('aria-pressed',String(isSelected));
  });
}
function selectNewCat(c){
  const nextCategory=CategoryService.normalize(c);
  if(nextCategory===newSelectedCat) return;
  newSelectedCat=nextCategory;
  updateNewCategorySelection();
}

function handleNewPrayerClick(event){
  const ui=getNewPrayerUI();
  if(!ui.view || !(event.target instanceof Element)) return;

  const submitButton=event.target.closest('[data-new-prayer-action="submit"]');
  if(submitButton && ui.view.contains(submitButton)){
    void submitNewPrayer();
    return;
  }

  const categoryButton=event.target.closest('[data-new-category]');
  if(categoryButton && ui.categoryWrap?.contains(categoryButton)){
    selectNewCat(categoryButton.dataset.newCategory);
  }
}
function getSelectedNewPrayerCategory(){
  const selectable=CategoryService.normalizeArray(AppState.categories)
    .filter(category=>!CategoryService.isUncategorized(category));
  return CategoryService.normalize(newSelectedCat||selectable[0]||'');
}

function getNewPrayerDraft(){
  const ui=getNewPrayerUI();
  return {
    title:ui.title?.value||'',
    body:sanitizePrayerBody(ui.body?.value||''),
    category:getSelectedNewPrayerCategory()
  };
}

function createNewPrayer({title,body,category}){
  return {
    id:nextId++,
    cat:category,
    title,
    body,
    archived:false,
    memos:[],
    createdAt:nowAppDateTime()
  };
}

async function submitNewPrayer(){
  if(_isSubmittingNewPrayer) return;
  setNewPrayerSubmitState(true);

  try{
    const ui=getNewPrayerUI();
    const draft=getNewPrayerDraft();
    const titleCheck=validatePrayerTitle(draft.title);
    if(!titleCheck.ok){
      await showAlert(titleCheck.message);
      ui.title?.focus();
      return;
    }
    if(!draft.category || CategoryService.isUncategorized(draft.category)){
      await showAlert(popupT('uncategorized'));
      return;
    }

    const prayer=createNewPrayer({
      title:titleCheck.value,
      body:draft.body,
      category:draft.category
    });
    AppState.prayers.unshift(prayer);
    if(!saveData()){
      await refreshSlides();
      return;
    }
    curPrayerId=prayer.id;
    resetMemoComposer();
    showView('detail');
  }finally{
    setNewPrayerSubmitState(false);
  }
}

// ── 기도제목 상세 ──

// ============================================================
// 08. Detail, edit, memo
// ============================================================
function resetMemoComposer(){
  const ta=document.getElementById('memo-add-ta');
  if(!ta) return;
  ta.value='';
  ta.style.height='auto';
}
let detailReturnState=null;
let detailReturnRestorePending=false;

function captureDetailReturnState(view){
  const targetView=view==='archive'?'archive':'list';
  if(targetView==='archive'){
    const slide=document.getElementById('archive-slide-'+archiveTabIdx);
    detailReturnState={
      view:'archive',
      tabIdx:archiveTabIdx,
      searchQuery:archiveSearchQuery,
      scrollTop:slide?slide.scrollTop:0,
      tabBarScrollLeft:document.getElementById('archive-tab-bar')?.scrollLeft||0
    };
    return;
  }
  const slide=document.getElementById('slide-'+curTabIdx);
  detailReturnState={
    view:'list',
    tabIdx:curTabIdx,
    scrollTop:slide?slide.scrollTop:0,
    tabBarScrollLeft:document.getElementById('tab-bar')?.scrollLeft||0
  };
}

function beginDetailReturnRestore(){
  detailReturnRestorePending=!!detailReturnState;
}

function shouldPreserveDetailReturnState(view){
  return detailReturnRestorePending && detailReturnState?.view===view;
}

function restoreDetailReturnState(view){
  if(!shouldPreserveDetailReturnState(view)) return;
  const state=detailReturnState;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(state.view==='archive'){
      archiveTabIdx=Math.max(0,Math.min(state.tabIdx,archiveTabs().length-1));
      archiveSearchQuery=state.searchQuery||'';
      const input=document.getElementById('archive-search-input');
      if(input) input.value=archiveSearchQuery;
      goArchiveTab(archiveTabIdx);
      const slide=document.getElementById('archive-slide-'+archiveTabIdx);
      if(slide) slide.scrollTop=state.scrollTop||0;
      const bar=document.getElementById('archive-tab-bar');
      if(bar) bar.scrollLeft=state.tabBarScrollLeft||0;
      if(slide && typeof handleHeaderCollapseScroll==='function') handleHeaderCollapseScroll(slide);
    }else{
      curTabIdx=Math.max(0,Math.min(state.tabIdx,tabs().length-1));
      goTab(curTabIdx);
      const slide=document.getElementById('slide-'+curTabIdx);
      if(slide) slide.scrollTop=state.scrollTop||0;
      const bar=document.getElementById('tab-bar');
      if(bar) bar.scrollLeft=state.tabBarScrollLeft||0;
      if(slide && typeof handleHeaderCollapseScroll==='function') handleHeaderCollapseScroll(slide);
    }
    detailReturnRestorePending=false;
  }));
}

function openPrayer(id){
  const returnView=currentVisibleView();
  setDetailReturnView(returnView);
  captureDetailReturnState(returnView);
  resetDetailEditState({ restoreValues:false });
  resetMemoComposer();
  curPrayerId=id;
  showView('detail');
}
function resizeTextareaToContent(textarea, maxHeight=null){
  if(!textarea) return;
  if(textarea.id==='detail-body-input') textarea.rows=1;
  textarea.style.height='auto';
  const nextHeight=maxHeight===null
    ? textarea.scrollHeight
    : Math.min(textarea.scrollHeight,maxHeight);
  textarea.style.height=nextHeight+'px';
}
function setDetailEditButtonMode(button, mode){
  if(!button) return;
  const saving=mode==='save';
  button.innerHTML=saving
    ? '<i class="ti ti-check" aria-hidden="true"></i>'
    : '<i class="ti ti-pencil" aria-hidden="true"></i>';
  button.setAttribute('aria-label',uiT(saving?'savePrayerLabel':'editPrayerLabel'));
}
function setEditPrayerSaveState(isSaving){
  _isSavingEditPrayer=Boolean(isSaving);
  const button=getEditPrayerUI().saveButton;
  if(!button) return;
  button.disabled=_isSavingEditPrayer;
  button.setAttribute('aria-busy',String(_isSavingEditPrayer));
}
function ensureDetailActionDelegation(detailView){
  if(!detailView || detailView.dataset.detailActionsBound==='1') return;
  detailView.addEventListener('click',event=>{
    const actionEl=event.target.closest('[data-detail-action]');
    if(!actionEl || !detailView.contains(actionEl)) return;
    const action=actionEl.dataset.detailAction;
    if(action==='restore') restoreToPraying();
    if(action==='add-memo') addMemo('record');
    if(action==='respond-thanks') handleRespondAndThank();
  });
  detailView.addEventListener('input',event=>{
    const field=event.target;

    // Keep the single-line title auto-sizing behavior.
    if(field?.id==='detail-title-input'){
      resizeTextareaToContent(field);
    }

    // Samsung Internet A/B test:
    // Do not resize #detail-body-input on every IME/input event.
    // Repeated textarea height changes can trigger viewport relayout
    // while the software keyboard is open.
  });
  detailView.dataset.detailActionsBound='1';
}
function ensureMemoActionDelegation(memoList){
  if(!memoList || memoList.dataset.memoActionsBound==='1') return;
  memoList.addEventListener('click',event=>{
    const actionEl=event.target.closest('[data-memo-action][data-memo-id]');
    if(!actionEl || !memoList.contains(actionEl)) return;
    const memoId=Number(actionEl.dataset.memoId);
    if(!Number.isFinite(memoId)) return;
    if(actionEl.dataset.memoAction==='edit') editMemo(memoId);
    if(actionEl.dataset.memoAction==='delete') delMemo(memoId);
    if(actionEl.dataset.memoAction==='cancel-edit') cancelEdit(memoId);
    if(actionEl.dataset.memoAction==='save-edit') saveEdit(memoId);
  });
  memoList.dataset.memoActionsBound='1';
}
function renderDetailFrame(p){
  const detailView=getDetailUI().view;
  if(!detailView) return null;
  detailView.classList.remove('detail-editing');
  detailView.classList.toggle('archived-detail',!!p.archived);
  ensureDetailActionDelegation(detailView);

  const editBtn=getEditPrayerUI().saveButton;
  if(editBtn){
    setHidden(editBtn,false);
    setDetailEditButtonMode(editBtn,'edit');
  }
  const memoAddEl=getDetailUI().memoAdd;
  if(memoAddEl) setHidden(memoAddEl,!!p.archived);
  return detailView;
}
function renderDetailHeader(p){
  const {title:titleEl,category:detailCatWrap}=getDetailUI();
  if(!titleEl) return false;
  titleEl.value=p.title;
  setEditableField(titleEl,false);
  resizeTextareaToContent(titleEl);

  if(!detailCatWrap) return false;
  ensureDetailCatDelegation(detailCatWrap);
  renderDetailCatRead(detailCatWrap,p);
  return true;
}
function renderDetailBody(p){
  const {body:textarea,createdAt}=getDetailUI();
  if(!textarea || !createdAt) return false;

  textarea.placeholder=uiT('newBody');
  textarea.value=p.body||'';
  createdAt.textContent=formatAppDateTime(p.createdAt);

  resizeTextareaToContent(textarea);
  setEditableField(textarea,false);
  return true;
}
function renderDetail(){
  const p=getCurrentDetailPrayer();
  if(!p) return;
  if(!renderDetailFrame(p)) return;
  if(!renderDetailHeader(p)) return;
  if(!renderDetailBody(p)) return;
  renderMemos(p);
}
function isDetailEditMode(){
  return !!getDetailUI().view?.classList.contains('detail-editing');
}
function renderMemos(p){
  const el=getDetailUI().memoList;
  if(!el) return;
  ensureMemoActionDelegation(el);
  if(!p.memos.length){ el.innerHTML=''; return; }
  const readOnlyMemos = isDetailEditMode();
  el.innerHTML=p.memos.slice().reverse().map(m=>memoHTML(m,readOnlyMemos)).join('');
}
function memoHTML(m,ro){
  const isThanks=m.type==='thanks';
  return `<div class="memo-card${isThanks?' thanks':''}" id="mc${m.id}">
    <div class="memo-inner">
      <div class="memo-body" id="mb${m.id}">${escHtml(m.text)}</div>
      <div class="memo-footer">
        <span class="memo-date">${escHtml(formatAppDateTime(m.date))}</span>
        ${!ro?`<span class="memo-actions">
          <button class="memo-btn" type="button" aria-label="${uiT('editMemoLabel')}" data-memo-action="edit" data-memo-id="${m.id}"><i class="ti ti-pencil" aria-hidden="true"></i></button>
          <button class="memo-btn del" type="button" aria-label="${uiT('deleteMemoLabel')}" data-memo-action="delete" data-memo-id="${m.id}"><i class="ti ti-trash" aria-hidden="true"></i></button>
        </span>`:''}
      </div>
    </div>
  </div>`;
}
function getDetailCatList(curCat){
  const categories=CategoryService.normalizeArray(AppState.categories);
  return CategoryService.ensureCategory(categories,curCat);
}
function escHtml(v){ return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function setEditableField(el, editable){
  if(!el) return;
  if('readOnly' in el){
    el.readOnly = !editable;
  }else{
    el.setAttribute('contenteditable', editable ? 'true' : 'false');
    el.setAttribute('aria-readonly', editable ? 'false' : 'true');
  }
}
function isFieldReadOnly(el){
  if(!el) return true;
  if('readOnly' in el) return !!el.readOnly;
  return el.getAttribute('contenteditable') !== 'true';
}
function ensureDetailCatDelegation(wrap){
  if(!wrap || wrap.dataset.catDelegationBound === '1') return;
  wrap.addEventListener('click', (event)=>{
    const btn=event.target.closest('.cat-chip[data-cat]');
    if(!btn || !wrap.contains(btn)) return;
    selectDetailCat(btn.dataset.cat);
  });
  wrap.dataset.catDelegationBound='1';
}
function renderDetailCatRead(wrap,p){
  if(!wrap || !p) return;
  wrap.replaceChildren();
  const cat=document.createElement('span');
  cat.className='cat-chip selected detail-category-readonly';
  cat.textContent=CategoryService.label(p.cat);
  wrap.appendChild(cat);
  if(p.archived){
    const answered=document.createElement('span');
    answered.className='archived-tag detail-answered-tag';
    answered.textContent=uiT('answered');
    wrap.appendChild(answered);
  }
}
function renderDetailCatEdit(wrap,selectedCat){
  if(!wrap) return;
  ensureDetailCatDelegation(wrap);
  const normalizedSelected=CategoryService.normalize(selectedCat);
  wrap.replaceChildren();
  getDetailCatList(selectedCat).forEach(cat=>{
    const isSelected=normalizedSelected===cat;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='cat-chip'+(isSelected?' selected':'');
    btn.dataset.cat=cat;
    btn.setAttribute('aria-pressed',String(isSelected));
    btn.textContent=CategoryService.label(cat);
    wrap.appendChild(btn);
  });
}
function updateEditCategorySelection(wrap,selectedCat){
  if(!wrap) return;
  const normalizedSelected=CategoryService.normalize(selectedCat);
  wrap.querySelectorAll('.cat-chip[data-cat]').forEach(btn=>{
    const isSelected=CategoryService.normalize(btn.dataset.cat)===normalizedSelected;
    btn.classList.toggle('selected',isSelected);
    btn.setAttribute('aria-pressed',String(isSelected));
  });
}
function selectDetailCat(c){
  const normalizedCat=CategoryService.normalize(c);
  const {title:titleEl,body:bodyEl,category:catWrap}=getDetailUI();
  if(!isDetailEditMode() || !titleEl || isFieldReadOnly(titleEl)) return;

  if(!_editPrayerState||_editPrayerState.id!==curPrayerId){
    const source=getCurrentDetailPrayer();
    if(!source) return;
    _editPrayerState=createEditPrayerState(source,titleEl,bodyEl);
  }
  _editPrayerState.draftCategory=normalizedCat;

  updateEditCategorySelection(catWrap,normalizedCat);
}
async function toggleDetailEdit(event){
  if(event) event.preventDefault();
  if(_isSavingEditPrayer) return;

  const p=getCurrentDetailPrayer(); if(!p) return;
  const editingPrayerId=p.id;
  const {
    title:titleEl,
    body:bodyEl,
    saveButton:btn,
    memoAdd:memoAddEl,
    view:viewDetailEl,
    category:catWrap
  }=getEditPrayerUI();
  if(!titleEl) return;
  const isEditing=!isFieldReadOnly(titleEl);

  if(isEditing){
    const draft=getEditPrayerDraft();
    const validatedDraft=await validateEditPrayerDraft(draft,{
      prayerId:editingPrayerId,
      titleEl
    });
    if(!validatedDraft) return;

    setEditPrayerSaveState(true);

    const prevSnapshot=createEditPrayerSnapshot(p);

    try{
      applyEditPrayerDraft(p,validatedDraft);

      if(!saveData()){
        restoreEditPrayerSnapshot(p,prevSnapshot);
        await refreshSlides();
        return;
      }
      if(curPrayerId!==editingPrayerId) return;
      const categoryChanged=hasDetailCategoryChanged(prevSnapshot.cat,validatedDraft.category);
      if(categoryChanged || searchQuery.trim()){
        await refreshSlides();
        if(curPrayerId!==editingPrayerId) return;
      }else{
        updateSinglePrayerCardUI(p.id);
      }

      setEditableField(titleEl,false);
      if(bodyEl){ setEditableField(bodyEl,false); }
      if(memoAddEl) setHidden(memoAddEl, !!p.archived);
      if(viewDetailEl) viewDetailEl.classList.remove('detail-editing');
      setDetailEditButtonMode(btn,'edit');
      const p3=getCurrentDetailPrayer();
      if(catWrap&&p3) renderDetailCatRead(catWrap,p3);
      if(p3) renderMemos(p3);
      clearEditPrayerState();
    } catch(error){
      console.error('저장 실패:', error);
      restoreEditPrayerSnapshot(p,prevSnapshot);
      await showAlert(popupT('detailSaveFailed'));
      if(curPrayerId!==editingPrayerId) return;
      // 편집 모드는 유지하여 사용자가 입력한 값을 잃지 않도록 한다.
    } finally {
      setEditPrayerSaveState(false);
    }
  } else {
    // 수정 모드 진입 — 원본 스냅샷과 편집 중 카테고리를 하나의 세션에 보관
    const source=getCurrentDetailPrayer();
    if(!source) return;
    _editPrayerState=createEditPrayerState(source,titleEl,bodyEl);

    // Detail editing must never inherit the list/archive TopBar offset.
    if(typeof resetHeaderCollapse==='function') resetHeaderCollapse();

    setEditableField(titleEl,true);
    if(bodyEl){ setEditableField(bodyEl,true); }
    requestAnimationFrame(()=>{
      titleEl.focus();
      if(typeof titleEl.setSelectionRange === 'function'){
        titleEl.setSelectionRange(titleEl.value.length, titleEl.value.length);
      }
    });
    if(memoAddEl) setHidden(memoAddEl, true);
    if(viewDetailEl) viewDetailEl.classList.add('detail-editing');
    renderMemos(source);
    setDetailEditButtonMode(btn,'save');
    if(catWrap){
      renderDetailCatEdit(catWrap,_editPrayerState.draftCategory);
    }
  }
}

function resetDetailEditState(options={}){
  const { restoreValues=false } = options;
  const {
    title:titleEl,
    body:bodyEl,
    saveButton:btn,
    memoAdd:memoAddEl,
    view:viewDetailEl,
    category:catWrap
  }=getEditPrayerUI();
  const p=getCurrentDetailPrayer();

  if(restoreValues && titleEl && !isFieldReadOnly(titleEl)){
    const original=hasActiveEditPrayerSession()?_editPrayerState.original:null;
    if(original){
      titleEl.value=original.title;
      if(bodyEl) bodyEl.value=original.body;
    }
  }

  clearEditPrayerState();
  setEditPrayerSaveState(false);

  if(titleEl){ setEditableField(titleEl,false); }
  if(bodyEl){ setEditableField(bodyEl,false); }
  if(viewDetailEl) viewDetailEl.classList.remove('detail-editing');
  if(memoAddEl) setHidden(memoAddEl, !!p?.archived);

  if(catWrap && p) renderDetailCatRead(catWrap,p);
  if(p) renderMemos(p);
  if(btn){
    setDetailEditButtonMode(btn,'edit');
  }
}

function cancelDetailEdit(){
  const titleEl=getDetailUI().title;
  if(!titleEl || isFieldReadOnly(titleEl)) return;
  resetDetailEditState({ restoreValues:true });
}

async function restoreToPraying(){
  const p=getCurrentDetailPrayer(); if(!p) return;
  if(!(await showConfirm(popupT('restoreConfirm',p.title)))) return;
  p.archived=false;
  if(!saveData()){ await refreshSlides(); return; }
  await refreshSlides();
  showView('list', false);
}
async function deleteCurPrayer(){
  const p=getCurrentDetailPrayer();
  if(!(await showConfirm(popupT('deletePrayer',p?.title)))) return;
  AppState.prayers=AppState.prayers.filter(x=>x.id!==curPrayerId);
  if(!saveData()){ await refreshSlides(); return; }
  await refreshSlides();
  goList();
}

// ── 메모 ──
async function addMemo(type='record'){
  const p=getCurrentDetailPrayer();
  const ta=document.getElementById('memo-add-ta');
  const text=ta?.value.trim(); if(!text||!p) return;
  const m={id:nextMemoId++,text,type,date:nowAppDateTime()};
  p.memos.push(m);
  if(!saveData()){ await refreshSlides(); return; }
  ta.value=''; ta.style.height='auto';
  const el=getDetailUI().memoList;
  el.querySelector('div[style*="text-align"]')?.remove();
  const div=document.createElement('div'); div.innerHTML=memoHTML(m,false);
  el.insertBefore(div.firstChild, el.firstChild);
}
function isUncategorizedPrayer(p){
  return !p || CategoryService.isUncategorized(p.cat);
}

function showCategorySelectModal(){
  return new Promise(resolve=>{
    const refs=typeof getCustomModalRefs==='function' ? getCustomModalRefs() : null;
    const options=CategoryService.normalizeArray(AppState.categories)
      .filter(cat=>cat && !CategoryService.isUncategorized(cat));

    if(!options.length){
      showAlert(popupT('categoryAddFirst')).then(()=>resolve(null));
      return;
    }

    if(!refs){
      const picked=window.prompt(popupT('categoryPrompt'));
      resolve(picked ? CategoryService.normalize(picked) : null);
      return;
    }

    const {modal,titleEl,msgEl}=refs;
    const cancelBtn=replaceModalButton(refs.cancelBtn);
    const okBtn=replaceModalButton(refs.okBtn);

    function cleanup(value){
      setShown(okBtn,true);
      closeCustomModal();
      resolve(value || null);
    }

    titleEl.textContent=popupT('categorySelectTitle');
    msgEl.replaceChildren();

    const guide=document.createElement('div');
    guide.textContent=popupT('categorySelectGuide');
    guide.style.marginBottom='14px';
    msgEl.appendChild(guide);

    const chipWrap=document.createElement('div');
    chipWrap.className='cat-select-wrap';
    chipWrap.style.justifyContent='center';
    chipWrap.style.gap='8px';

    options.forEach(cat=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='cat-chip';
      btn.dataset.cat=cat;
      btn.textContent=CategoryService.label(cat);
      btn.addEventListener('click',()=>cleanup(cat),{once:true});
      chipWrap.appendChild(btn);
    });
    msgEl.appendChild(chipWrap);

    modal.classList.remove('alert-mode');
    setShown(okBtn,false);
    if(cancelBtn){
      cancelBtn.textContent=modalT('cancel');
      setShown(cancelBtn,true);
      cancelBtn.addEventListener('click',()=>cleanup(null),{once:true});
    }
    modal.classList.remove('hidden');
  });
}

async function handleRespondAndThank(){
  try{
    const p=getCurrentDetailPrayer();
    if(!p) return;

    if(isUncategorizedPrayer(p)){
      const selectedCat=await showCategorySelectModal();
      if(!selectedCat) return;
      p.cat=CategoryService.normalize(selectedCat);
    }

    await addThanks();
  }catch(error){
    console.error('응답 처리 중 오류 발생:', error);
    await showAlert(popupT('answerProcessFailed'));
  }
}

async function addThanks(){
  const p=getCurrentDetailPrayer(); if(!p) return;
  const ta=document.getElementById('memo-add-ta');
  const text=ta?.value.trim();
  if(text){ const m={id:nextMemoId++,text,type:'thanks',date:nowAppDateTime()}; p.memos.push(m); }
  resetMemoComposer();
  p.archived=true;
  if(!saveData()){ await refreshSlides(); return; }
  await refreshSlides(); goList();
  setTimeout(()=>goArchive(),100);
}
function editMemo(mid){
  if(isDetailEditMode()) return;
  const p=getCurrentDetailPrayer(); const m=p?.memos.find(x=>x.id===mid); if(!m) return;
  const card=document.getElementById('mc'+mid); if(!card) return;
  const isThanks=m.type==='thanks';
  card.innerHTML=`
    <div class="memo-inner">
      <textarea class="memo-edit-input${isThanks?' thanks':''}">${escHtml(m.text)}</textarea>
      <div class="memo-edit-footer">
        <span class="memo-date">${escHtml(formatAppDateTime(m.date))}</span>
        <span class="memo-edit-actions">
          <button class="memo-edit-action cancel" type="button" aria-label="${uiT('cancelMemoEditLabel')}" data-memo-action="cancel-edit" data-memo-id="${mid}"><i class="ti ti-x" aria-hidden="true"></i></button>
          <button class="memo-edit-action save" type="button" aria-label="${uiT('saveMemoEditLabel')}" data-memo-action="save-edit" data-memo-id="${mid}"><i class="ti ti-check" aria-hidden="true"></i></button>
        </span>
      </div>
    </div>`;
  const ta=card.querySelector('textarea'); resizeTextareaToContent(ta); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length);
}
function cancelEdit(mid){
  const p=getCurrentDetailPrayer(); const m=p?.memos.find(x=>x.id===mid); if(!m) return;
  const card=document.getElementById('mc'+mid); if(!card) return;
  card.outerHTML=memoHTML(m, false);
}
async function saveEdit(mid){
  const p=getCurrentDetailPrayer(); const m=p?.memos.find(x=>x.id===mid); if(!m) return;
  const card=document.getElementById('mc'+mid); if(!card) return;
  const ta=card.querySelector('textarea');
  if(ta?.value.trim()){ m.text=ta.value.trim(); }
  if(!saveData()){ await refreshSlides(); return; }
  card.outerHTML=memoHTML(m,false);
}
async function delMemo(mid){
  if(isDetailEditMode()) return;
  if(!(await showConfirm(popupT('deleteMemo')))) return;
  const p=getCurrentDetailPrayer(); if(!p) return;
  p.memos=p.memos.filter(m=>m.id!==mid);
  if(!saveData()){ await refreshSlides(); return; }
  document.getElementById('mc'+mid)?.remove();
}

// ── 카테고리 관리 ──

