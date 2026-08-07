// ============================================================
// 09. Category management
// ============================================================

// ── Category helpers ──
function getCategoryPrayerCounts(){
  const counts=new Map();

  AppState.prayers.forEach(p=>{
    const category=CategoryService.normalize(p.cat);
    counts.set(category,(counts.get(category)||0)+1);
  });

  return counts;
}

function getDisplayCategories(){
  const hasUncategorizedPrayer=AppState.prayers.some(
    prayer=>CategoryService.isUncategorized(prayer.cat)
  );
  const regular=[];
  const uncategorized=[];

  AppState.categories.forEach((category,idx)=>{
    const c=CategoryService.normalize(category);
    const item={c,idx};

    if(CategoryService.isUncategorized(c)) uncategorized.push(item);
    else regular.push(item);
  });

  return hasUncategorizedPrayer
    ? [...regular,...uncategorized]
    : regular;
}

// ── Category UI ──

const categoryManageEditState={
  categoryId:null,
  value:'',
  suspendBlur:false
};

const categoryDeletePending=new Set();

function captureCategoryManageEdit(){
  if(!categoryManageEditState.categoryId) return null;
  const active=document.querySelector('#cat-rows .cat-manage-name.editing');
  if(active) categoryManageEditState.value=active.textContent||'';
  return {
    categoryId:categoryManageEditState.categoryId,
    value:categoryManageEditState.value
  };
}

function clearCategoryManageEdit(categoryId){
  if(categoryId&&categoryManageEditState.categoryId!==categoryId) return;
  categoryManageEditState.categoryId=null;
  categoryManageEditState.value='';
}
function categoryDomKey(category){
  return encodeURIComponent(CategoryService.normalize(category));
}

function categoryFromDomKey(value){
  try{ return CategoryService.normalize(decodeURIComponent(String(value||''))); }
  catch(e){ return CategoryService.normalize(value); }
}

function renderCategoryManageRow({c:categoryId,idx},counts){
  const cnt=counts.get(categoryId)||0;
  const isUncat=CategoryService.isUncategorized(categoryId);
  const isDeleting=categoryDeletePending.has(categoryId);
  const domKey=categoryDomKey(categoryId);

  return `<div class="cat-manage-row${isUncat?' fixed':''}${isDeleting?' is-deleting':''}" data-idx="${idx}" data-category-id="${domKey}">
    <span class="drag-handle"><i class="ti ti-grip-vertical"></i></span>
    <span class="cat-manage-name">${escHtml(CategoryService.label(categoryId))}</span>
    <span class="cat-manage-actions">
      <span class="cat-manage-count">${cnt}</span>
      ${isUncat?'':`<button type="button" class="cat-manage-btn" data-category-action="edit" aria-label="${uiT('editCategoryLabel')}"><i class="ti ti-pencil"></i></button>
      <button type="button" class="cat-manage-btn del" data-category-action="delete" aria-label="${uiT('deleteCategoryLabel')}"><i class="ti ti-trash"></i></button>`}
    </span>
  </div>`;
}

function bindCategoryManageEvents(){
  const view=document.getElementById('cat-view');
  if(!view||view.dataset.categoryActionsBound==='1') return;

  view.addEventListener('click',event=>{
    const button=event.target.closest('[data-category-action]');
    if(!button||!view.contains(button)) return;
    const action=button.dataset.categoryAction;

    if(action==='add'){
      addCat();
      return;
    }

    const row=button.closest('.cat-manage-row[data-category-id]');
    if(!row) return;
    const categoryId=categoryFromDomKey(row.dataset.categoryId);
    if(!categoryId||categoryDeletePending.has(categoryId)) return;

    if(action==='edit') editCat(categoryId,row);
    if(action==='delete') delCat(categoryId);
  });

  view.addEventListener('keydown',event=>{
    if(event.key!=='Enter'||event.target.id!=='cat-add-inp') return;
    event.preventDefault();
    addCat();
  });

  view.dataset.categoryActionsBound='1';
}

function renderCatManage(){
  const el=document.getElementById('cat-rows');
  if(!el) return;

  bindCategoryManageEvents();
  const editing=captureCategoryManageEdit();
  categoryManageEditState.suspendBlur=true;

  try{
    const counts=getCategoryPrayerCounts();
    const displayCats=getDisplayCategories();
    el.innerHTML=displayCats
      .map(item=>renderCategoryManageRow(item,counts))
      .join('');

    initDragSort();

    if(editing){
      const stillExists=AppState.categories.some(
        category=>CategoryService.normalize(category)===editing.categoryId
      );
      if(stillExists){
        const row=el.querySelector(`.cat-manage-row[data-category-id="${categoryDomKey(editing.categoryId)}"]`);
        editCat(editing.categoryId,row,{initialValue:editing.value});
      }else{
        clearCategoryManageEdit(editing.categoryId);
      }
    }
  }finally{
    categoryManageEditState.suspendBlur=false;
  }
}

function refreshCategoryUI({detail=true}={}){
  renderCatManage();
  renderTabs();
  buildSlides();
  renderNewCatChips();
  if(detail&&document.getElementById('view-detail')?.classList.contains('visible')) renderDetail();
  refreshLocalizedUI();
}

// ── Category actions ──
async function addCat(){
  const inp=document.getElementById('cat-add-inp');
  if(!inp) return;
  const validation=validateCategoryName(inp.value);
  if(!validation.ok){
    await showAlert(validation.message);
    inp.focus();
    return;
  }
  const name=validation.value;
  if(!CategoryService.add(name)){
    await showAlert(popupT('catDuplicate'));
    inp.focus();
    return;
  }
  inp.value='';
  if(!CategoryService.commit({refresh:false})){
    refreshCategoryUI({detail:false});
    return;
  }
  refreshCategoryUI({detail:false});
}

function focusCategoryEditor(el){
  el.focus();
  const range=document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel=window.getSelection();
  if(!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

function editCat(categoryId,rowElement,{initialValue=null}={}){
  const old=CategoryService.normalize(categoryId);
  if(!old||CategoryService.isUncategorized(old)||categoryDeletePending.has(old)) return;
  const exists=AppState.categories.some(c=>CategoryService.normalize(c)===old);
  if(!exists) return;

  const row=rowElement||document.querySelector(`.cat-manage-row[data-category-id="${categoryDomKey(old)}"]`);
  const el=row?.querySelector('.cat-manage-name');
  if(!el||el.isContentEditable) return;
  const oldLabel=CategoryService.label(old);
  const editorValue=initialValue===null?oldLabel:String(initialValue);
  let busy=false;
  let closed=false;

  categoryManageEditState.categoryId=old;
  categoryManageEditState.value=editorValue;
  el.textContent=editorValue;
  el.contentEditable='true';
  el.classList.add('editing');
  row?.classList.add('is-editing');
  row?.parentElement?.classList.add('has-editing');
  focusCategoryEditor(el);

  function cleanup(){
    el.removeEventListener('blur',onBlur);
    el.removeEventListener('keydown',onKeyDown);
    el.removeEventListener('input',onInput);
  }

  function closeEditor(label=oldLabel){
    if(closed) return;
    closed=true;
    cleanup();
    el.contentEditable='false';
    el.classList.remove('editing');
    row?.classList.remove('is-editing');
    document.getElementById('cat-rows')?.classList.remove('has-editing');
    el.textContent=label;
    clearCategoryManageEdit(old);
  }

  async function saveEdit(){
    if(busy||closed) return;
    busy=true;
    categoryManageEditState.value=el.textContent||'';
    const validation=validateCategoryName(categoryManageEditState.value);
    if(!validation.ok){
      await showAlert(validation.message);
      busy=false;
      if(!closed) focusCategoryEditor(el);
      return;
    }

    const raw=validation.value;
    const next=CategoryService.normalize(raw);
    if(!next||next===old){
      closeEditor(CategoryService.label(old));
      return;
    }

    const renamed=CategoryService.rename(old,next);
    if(!renamed){
      await showAlert(popupT('catDuplicate'));
      busy=false;
      if(!closed) focusCategoryEditor(el);
      return;
    }

    closeEditor(CategoryService.label(renamed));
    if(!CategoryService.commit({refresh:false})){
      refreshCategoryUI();
      return;
    }
    refreshCategoryUI();
  }

  function onInput(){
    categoryManageEditState.value=el.textContent||'';
  }
  function onBlur(){
    if(categoryManageEditState.suspendBlur) return;
    saveEdit();
  }
  function onKeyDown(e){
    if(e.key==='Enter'){
      e.preventDefault();
      saveEdit();
    }
    if(e.key==='Escape'){
      e.preventDefault();
      closeEditor(oldLabel);
    }
  }

  el.addEventListener('blur',onBlur);
  el.addEventListener('keydown',onKeyDown);
  el.addEventListener('input',onInput);
}

async function delCat(categoryId){
  const normalizedName=CategoryService.normalize(categoryId);
  if(!normalizedName||CategoryService.isUncategorized(normalizedName)) return;
  if(categoryManageEditState.categoryId===normalizedName||categoryDeletePending.has(normalizedName)) return;

  categoryDeletePending.add(normalizedName);
  const row=document.querySelector(`.cat-manage-row[data-category-id="${categoryDomKey(normalizedName)}"]`);
  row?.classList.add('is-deleting');
  try{
    const displayName=CategoryService.label(normalizedName);
    const cnt=AppState.prayers.filter(
      p=>CategoryService.normalize(p.cat)===normalizedName
    ).length;

    if(!(await showConfirm(popupT('deleteCategory',displayName,cnt)))) return;

    // 기도제목은 삭제하지 않고 "미분류"로 이동한다.
    const removed=CategoryService.remove(
      normalizedName,
      CategoryService.UNCATEGORIZED
    );
    if(removed===null) return;

    if(!CategoryService.commit({adjustTab:true,refresh:false})){
      refreshCategoryUI();
      return;
    }
    refreshCategoryUI();
  }finally{
    categoryDeletePending.delete(normalizedName);
    document.querySelector(`.cat-manage-row[data-category-id="${categoryDomKey(normalizedName)}"]`)
      ?.classList.remove('is-deleting');
  }
}

// ── Category drag sorting ──
function getCategoryDragState(){
  return initDragSort.state||(initDragSort.state={
    container:null,
    dragIdx:null,
    ghost:null,
    offX:0,
    offY:0,
    rowHeight:0,
    newPos:null,
    mouseMove:null,
    mouseUp:null,
    startHandler:null,
    touchMove:null,
    touchEnd:null
  });
}

function getCategoryDragRows(state){
  return state.container?[...state.container.querySelectorAll('.cat-manage-row')]:[];
}

function removeCategoryDragGhost(state){
  if(!state.ghost) return;
  state.ghost.remove();
  state.ghost=null;
}

function resetCategoryDragRows(state){
  getCategoryDragRows(state).forEach(row=>{
    row.classList.remove('dragging');
    row.style.transform='';
  });
}

function createCategoryDragGhost(state,row,cx,cy){
  const rect=row.getBoundingClientRect();
  state.offX=cx-rect.left;
  state.offY=cy-rect.top;
  state.ghost=document.createElement('div');
  state.ghost.className='drag-ghost-el';
  state.ghost.innerHTML=row.innerHTML;
  state.ghost.style.width=rect.width+'px';
  state.ghost.style.left=(cx-state.offX)+'px';
  state.ghost.style.top=(cy-state.offY)+'px';
  document.body.appendChild(state.ghost);
}

function moveCategoryDragGhost(state,cx,cy){
  if(!state.ghost) return;
  state.ghost.style.left=(cx-state.offX)+'px';
  state.ghost.style.top=(cy-state.offY)+'px';
}

function categoryDragCrossesFixed(from,to){
  const a=Math.min(from,to);
  const b=Math.max(from,to);
  return AppState.categories
    .slice(a,b+1)
    .some(category=>CategoryService.isUncategorized(category));
}

function handleCategoryDragStart(state,e,idx){
  if(state.dragIdx!==null||categoryManageEditState.categoryId) return false;
  const categoryId=CategoryService.normalize(AppState.categories[idx]);
  if(CategoryService.isUncategorized(categoryId)||categoryDeletePending.has(categoryId)) return false;

  const row=getCategoryDragRows(state).find(r=>Number(r.dataset.idx)===idx);
  if(!row) return false;

  const point=e.touches?e.touches[0]:e;
  if(!point) return false;

  state.dragIdx=idx;
  state.newPos=idx;
  state.rowHeight=row.getBoundingClientRect().height+8;
  row.classList.add('dragging');
  createCategoryDragGhost(state,row,point.clientX,point.clientY);
  return true;
}

function handleCategoryDragMove(state,e){
  if(state.dragIdx===null) return;

  const point=e.touches?e.touches[0]:e;
  if(!point) return;

  moveCategoryDragGhost(state,point.clientX,point.clientY);

  const rows=getCategoryDragRows(state);
  let nextPos=state.dragIdx;
  for(const row of rows){
    const idx=Number(row.dataset.idx);
    if(idx===state.dragIdx||CategoryService.isUncategorized(AppState.categories[idx])) continue;
    const rect=row.getBoundingClientRect();
    const mid=rect.top+rect.height/2;
    if(idx<state.dragIdx&&point.clientY<mid) nextPos=Math.min(nextPos,idx);
    if(idx>state.dragIdx&&point.clientY>mid) nextPos=Math.max(nextPos,idx);
  }

  state.newPos=categoryDragCrossesFixed(state.dragIdx,nextPos)?state.dragIdx:nextPos;

  rows.forEach(row=>{
    const idx=Number(row.dataset.idx);
    if(idx===state.dragIdx){
      row.style.transform='';
      return;
    }
    let shift=0;
    if(state.dragIdx<state.newPos&&idx>state.dragIdx&&idx<=state.newPos) shift=-state.rowHeight;
    if(state.dragIdx>state.newPos&&idx<state.dragIdx&&idx>=state.newPos) shift=state.rowHeight;
    row.style.transform=`translateY(${shift}px)`;
  });
}

function handleCategoryDragEnd(state){
  if(state.dragIdx===null) return;

  const from=state.dragIdx;
  const to=state.newPos;

  resetCategoryDragRows(state);
  removeCategoryDragGhost(state);
  state.dragIdx=null;
  state.newPos=null;

  if(to!==null&&CategoryService.move(from,to)){
    if(!CategoryService.commit({adjustTab:true,refresh:false})){
      refreshCategoryUI({detail:false});
      return;
    }
    refreshCategoryUI({detail:false});
  }
}

function bindCategoryDragDocumentEvents(state){
  if(state.startHandler) return;

  state.startHandler=e=>{
    const handle=e.target.closest('.drag-handle');
    if(!handle||!state.container?.contains(handle)) return;

    const row=handle.closest('.cat-manage-row');
    if(!row) return;
    const idx=Number(row.dataset.idx);
    if(!Number.isInteger(idx)) return;

    if(e.type==='mousedown'){
      e.preventDefault();
      if(!handleCategoryDragStart(state,e,idx)) return;

      state.mouseMove=moveEvent=>handleCategoryDragMove(state,moveEvent);
      state.mouseUp=()=>{
        handleCategoryDragEnd(state);
        document.removeEventListener('mousemove',state.mouseMove);
        document.removeEventListener('mouseup',state.mouseUp);
        state.mouseMove=null;
        state.mouseUp=null;
      };
      document.addEventListener('mousemove',state.mouseMove);
      document.addEventListener('mouseup',state.mouseUp);
      return;
    }

    if(!handleCategoryDragStart(state,e,idx)) return;
    e.stopPropagation();

    state.touchMove=moveEvent=>{
      if(state.dragIdx===null) return;
      moveEvent.preventDefault();
      handleCategoryDragMove(state,moveEvent);
    };
    state.touchEnd=()=>{
      handleCategoryDragEnd(state);
      document.removeEventListener('touchmove',state.touchMove);
      document.removeEventListener('touchend',state.touchEnd);
      document.removeEventListener('touchcancel',state.touchEnd);
      state.touchMove=null;
      state.touchEnd=null;
    };
    document.addEventListener('touchmove',state.touchMove,{passive:false});
    document.addEventListener('touchend',state.touchEnd);
    document.addEventListener('touchcancel',state.touchEnd);
  };
}

function bindCategoryDragContainer(state,container){
  if(state.container===container) return;

  if(state.container){
    state.container.removeEventListener('mousedown',state.startHandler);
    state.container.removeEventListener('touchstart',state.startHandler);
  }
  state.container=container;
  state.container.addEventListener('mousedown',state.startHandler);
  state.container.addEventListener('touchstart',state.startHandler,{passive:true});
}

function initDragSort(){
  const container=document.getElementById('cat-rows');
  if(!container) return;

  const state=getCategoryDragState();
  bindCategoryDragDocumentEvents(state);
  bindCategoryDragContainer(state,container);
}
