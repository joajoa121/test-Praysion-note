// 03. Language, popup, settings sheet
// ============================================================
function updateLangChecks(lang){
  const current=lang==='en'?'en':'ko';
  document.querySelectorAll('[data-lang-option]').forEach(option=>{
    option.classList.toggle('lang-selected', option.dataset.langOption===current);
  });
}


// ── 안전한 언어 표시 전환 ──
// 기도제목, 기도내용, 메모내용, 사용자가 만든 카테고리명은 번역하지 않습니다.
const UI_LANG={
  ko:{
    search:'제목 및 내용 검색', newTitle:'기도제목을 입력하세요.', newBody:'기도내용을 자유롭게 입력하세요.',
    memoPH:'메모나 응답에 대한 감사를 남겨보세요.', newCat:'새 카테고리 추가',
    app:'기도목록', navList:'기도목록', navArchive:'응답함', navSettings:'설정',
    newPrayer:'새 기도제목', archive:'응답함', catManage:'카테고리 관리', backup:'백업 및 가져오기',
    security:'보안 설정', appLock:'앱 잠금', lockOn:'잠금 활성화', lockOff:'잠금 비활성화',
    changePin:'비밀번호 변경', catSettings:'카테고리 설정', langSettings:'언어 설정',
    pinEnter:'PIN 입력', pinSetup:'PIN 만들기', pinSetupHint:'4자리 PIN을 입력하세요', pinConfirm:'PIN을 다시 입력하세요',
    pinWrong:'PIN이 올바르지 않습니다', pinMismatch:'PIN이 일치하지 않습니다', pinCurrent:'현재 PIN 입력',
    pinCurrentWrong:'현재 PIN이 틀렸습니다', pinNew:'새 PIN 만들기', pinNewConfirm:'새 PIN 확인',
    pinStorageError:'PIN을 저장하거나 확인하지 못했습니다', pinCredentialInvalid:'저장된 PIN 정보가 손상되었습니다. 새 PIN을 설정해 주세요.', pinProgress:(entered,total)=>`${total}자리 중 ${entered}자리 입력됨`,
    pinBackLabel:'설정 화면으로 돌아가기', pinDeleteLabel:'마지막 숫자 삭제', pinKeypadLabel:'PIN 키패드',
    backupSettings:'백업 설정',
    all:'전체', uncategorized:'미분류', answered:'응답', restoreBtn:'기도중으로 변경', restoreConfirm:'을 기도중으로 변경할까요?',
    memo:'메모', mark:'응답 및 감사', add:'등록',
    untitled:'제목 없음', prayerTitleRequired:'기도제목을 입력해주세요.', prayerTitleTooLong:'기도제목은 80자 이내로 입력해주세요.', meaningfulPrayerTitle:'의미 있는 기도제목을 입력해주세요.',
    categoryTooLong:'카테고리 이름은 20자 이내로 입력해주세요.', meaningfulCategoryName:'의미 있는 카테고리 이름을 입력해주세요.',
    backLabel:'뒤로가기', newPrayerSubmitLabel:'새 기도제목 등록', addCategoryLabel:'카테고리 추가', editPrayerLabel:'기도 수정', savePrayerLabel:'기도 저장', deletePrayerLabel:'기도 삭제', editMemoLabel:'메모 수정', deleteMemoLabel:'메모 삭제', cancelMemoEditLabel:'메모 수정 취소', saveMemoEditLabel:'메모 저장', editCategoryLabel:'카테고리 수정', deleteCategoryLabel:'카테고리 삭제',
    noSearch:'검색 결과가 없습니다', noArchive:'보관된 기도제목이 없습니다', empty:'기도제목을 추가해보세요',
    backupSectionExport:'백업', backupSaveTitle:'백업 파일 저장',
    backupSaveDesc:'현재 기도제목, 카테고리, 메모를 JSON 파일로 저장합니다.', backupExportBtn:'JSON 백업 내보내기',
    backupSectionImport:'가져오기', backupJsonTitle:'JSON 백업 가져오기',
    backupJsonDesc:'이 앱에서 저장한 백업 파일을 불러와 현재 데이터에 추가합니다.', backupJsonBtn:'JSON 파일 선택',
    backupExcelTitle:'Excel 가져오기', backupExcelDesc:'정해진 양식의 Excel 파일을 불러와 기도제목과 여러 메모를 한 번에 추가합니다.',
    backupTemplateBtn:'Excel 양식 다운로드', backupExcelBtn:'Excel 파일 선택',
    count:n=>`${n}개의 기도제목`
  },
  en:{
    search:'Search title and content', newTitle:'Enter a prayer title.', newBody:'Write your prayer freely.',
    memoPH:'Leave a memo or a note of gratitude for an answered prayer.', newCat:'Add new category',
    app:'Prayers', navList:'Prayers', navArchive:'Answered', navSettings:'Settings',
    newPrayer:'New Prayer', archive:'Answered', catManage:'Manage Categories', backup:'Backup & Import',
    security:'Security', appLock:'App Lock', lockOn:'Lock On', lockOff:'Lock Off',
    changePin:'Change PIN', catSettings:'Categories', langSettings:'Language',
    pinEnter:'Enter PIN', pinSetup:'Create PIN', pinSetupHint:'Enter a 4-digit PIN', pinConfirm:'Confirm PIN',
    pinWrong:'Incorrect PIN', pinMismatch:'PINs do not match', pinCurrent:'Enter current PIN',
    pinCurrentWrong:'Current PIN is incorrect', pinNew:'Create New PIN', pinNewConfirm:'Confirm New PIN',
    pinStorageError:'Could not save or verify the PIN', pinCredentialInvalid:'The saved PIN information is damaged. Please create a new PIN.', pinProgress:(entered,total)=>`${entered} of ${total} digits entered`,
    pinBackLabel:'Return to settings', pinDeleteLabel:'Delete last digit', pinKeypadLabel:'PIN keypad',
    backupSettings:'Backup',
    all:'All', uncategorized:'Uncategorized', answered:'Answered', restoreBtn:'Move to Praying', restoreConfirm:'will be moved back to praying.',
    memo:'Memo', mark:'Mark Answered', add:'Add',
    untitled:'Untitled', prayerTitleRequired:'Please enter a prayer title.', prayerTitleTooLong:'Prayer titles must be 80 characters or fewer.', meaningfulPrayerTitle:'Please enter a meaningful prayer title.',
    categoryTooLong:'Category names must be 20 characters or fewer.', meaningfulCategoryName:'Please enter a meaningful category name.',
    backLabel:'Back', newPrayerSubmitLabel:'Add new prayer', addCategoryLabel:'Add category', editPrayerLabel:'Edit prayer', savePrayerLabel:'Save prayer', deletePrayerLabel:'Delete prayer', editMemoLabel:'Edit memo', deleteMemoLabel:'Delete memo', cancelMemoEditLabel:'Cancel memo edit', saveMemoEditLabel:'Save memo', editCategoryLabel:'Edit category', deleteCategoryLabel:'Delete category',
    noSearch:'No results found', noArchive:'No answered prayers', empty:'Add a prayer title',
    backupSectionExport:'Backup', backupSaveTitle:'Save Backup File',
    backupSaveDesc:'Save your prayers, categories, and memos as a JSON file.', backupExportBtn:'Export JSON Backup',
    backupSectionImport:'Import', backupJsonTitle:'Import JSON Backup',
    backupJsonDesc:'Add data from a backup file created by this app.', backupJsonBtn:'Choose JSON File',
    backupExcelTitle:'Import Excel', backupExcelDesc:'Import prayer titles and multiple memos from the Excel template.',
    backupTemplateBtn:'Download Excel Template', backupExcelBtn:'Choose Excel File',
    count:n=>`${n} prayer${n===1?'':'s'}`
  }
};
function uiT(k,...a){ const lang=Language.get(); const v=(UI_LANG[lang]&&UI_LANG[lang][k])||UI_LANG.ko[k]||k; return typeof v==='function'?v(...a):v; }

// ── 팝업 메시지 다국어 ──

// ── 한국어 조사 처리 ──
function hasFinalConsonantKor(word){
  const s=String(word||'').trim();
  if(!s) return false;
  const ch=s[s.length-1];
  const code=ch.charCodeAt(0);
  if(code<0xAC00 || code>0xD7A3) return false;
  return ((code-0xAC00)%28)!==0;
}
function josaEulReul(word){
  return hasFinalConsonantKor(word)?'을':'를';
}

const POPUP_LANG={
  ko:{
    uncategorized:'카테고리가 미분류 상태입니다.\n카테고리를 설정해주세요.',
    restoreConfirm:title=>`"${title}"${josaEulReul(title)} 기도중으로 변경할까요?`,
    deletePrayer:title=>{ const target=title||'이 기도제목'; return `"${target}"${josaEulReul(target)} 삭제할까요?`; },
    deleteMemo:'이 메모를 삭제할까요?',
    deleteCategory:(name,cnt)=>`"${name}" 카테고리를 삭제할까요?
해당 카테고리의 기도제목 ${cnt}개는
"미분류"로 이동돼요.`,
    importBackupConfirm:'백업 파일의 기도제목이\n현재 데이터에 추가(병합)됩니다.',
    importExcelConfirm:'Excel 파일의 기도제목이\n현재 데이터에 추가됩니다.\n계속하시겠어요?',
    excelLoadFail:'Excel 기능을 불러오지 못했어요. 인터넷 연결 후 다시 시도해주세요.',
    excelImportDone:(added,memoAdded)=>`Excel 가져오기가 완료됐어요.\n기도제목 ${added}개, 메모 ${memoAdded}개가 추가됐어요.`,
    excelImportFail:'Excel 파일을 가져오지 못했어요. 양식의 시트명과 열 이름을 확인해주세요.',
    backupMergeDone:n=>`백업을 성공적으로 병합했어요!\n기도제목 ${n}개가 추가됐어요.`,
    backupInvalid:'올바른 백업 파일이 아니에요.',
    catEmpty:'카테고리 이름을 입력해주세요.',
    catDuplicate:'이미 존재하는 카테고리입니다.',
    detailSaveFailed:'저장에 실패했습니다. 다시 시도해주세요.',
    categoryAddFirst:'먼저 카테고리를 추가해주세요.',
    categoryPrompt:'응답함으로 이동하기 전에 카테고리를 입력해주세요.',
    categorySelectTitle:'카테고리 선택',
    categorySelectGuide:'응답함으로 이동하기 전에 카테고리를 선택해주세요.',
    answerProcessFailed:'응답 처리 중 문제가 발생했습니다. 다시 시도해주세요.',
    updateAvailable:'새 버전이 있습니다.\n지금 업데이트할까요?',
    importConflictReplace:count=>`가져오기 데이터와 현재 데이터가 ${count}건 충돌합니다.\n\n충돌한 모든 항목에 같은 방법이 적용됩니다.\n\n[확인] 가져온 제목/본문 적용 + 메모 병합\n[취소] 다른 방법 선택`,
    importConflictKeepBoth:count=>`충돌한 ${count}건을 둘 다 보관하시겠습니까?\n\n충돌한 모든 항목에 같은 방법이 적용됩니다.\n\n[확인] 둘 다 보관\n[취소] 현재 제목/본문 유지 + 메모 병합`,
    importResult:(result,label)=>{
      const lines=[`${label}가 완료되었습니다.`,'',`추가: ${result.added||0}건`,`병합: ${result.merged||0}건`,`충돌: ${result.conflicted||0}건`,`메모 추가: ${result.memoAdded||0}건`,`건너뜀: ${result.skipped||0}건`];
      if(result.futureDateAdjusted) lines.push('',`※ 미래 날짜 ${result.futureDateAdjusted}건을 현재 날짜로 자동 보정했습니다.`);
      const reasons=[];
      if(result.missingTitleSkipped) reasons.push(`제목 없음 ${result.missingTitleSkipped}건`);
      if(result.missingDateSkipped) reasons.push(`생성일 없음 ${result.missingDateSkipped}건`);
      if(result.invalidDateSkipped) reasons.push(`잘못된 생성일 ${result.invalidDateSkipped}건`);
      if(result.invalidMemoDateSkipped) reasons.push(`잘못된 메모 날짜 ${result.invalidMemoDateSkipped}건`);
      if(result.orphanMemoSkipped) reasons.push(`연결할 기도 없음 ${result.orphanMemoSkipped}건`);
      if(reasons.length) lines.push('',`건너뛴 이유: ${reasons.join(', ')}`);
      return lines.join('\n');
    },
    excelImportLabel:'Excel 가져오기', backupImportLabel:'백업 가져오기'
  },
  en:{
    uncategorized:'This prayer is still uncategorized.\nPlease choose a category.',
    restoreConfirm:title=>`Move "${title}" back to Prayers?`,
    deletePrayer:title=>`Delete "${title||'this prayer'}"?`,
    deleteMemo:'Delete this memo?',
    deleteCategory:(name,cnt)=>`Delete the "${name}" category?
${cnt} prayer${cnt===1?'':'s'} in this category
will be moved to "Uncategorized".`,
    importBackupConfirm:'The prayers in this backup\nwill be merged into your current data.\nContinue?',
    importExcelConfirm:'The prayers in this Excel file\nwill be added to your current data.\nContinue?',
    excelLoadFail:'Could not load the Excel feature. Please check your internet connection and try again.',
    excelImportDone:(added,memoAdded)=>`Excel import completed successfully.\n${added} prayer${added===1?'':'s'} and ${memoAdded} memo${memoAdded===1?'':'s'} added.`,
    excelImportFail:'Could not import the Excel file. Please check the sheet names and column names in the template.',
    backupMergeDone:n=>`Backup merged successfully!\n${n} prayer${n===1?'':'s'} added.`,
    backupInvalid:'This is not a valid backup file.',
    catEmpty:'Please enter a category name.',
    catDuplicate:'This category already exists.',
    detailSaveFailed:'Failed to save. Please try again.',
    categoryAddFirst:'Please add a category first.',
    categoryPrompt:'Enter a category before moving this prayer to Answered.',
    categorySelectTitle:'Select a category',
    categorySelectGuide:'Please select a category before moving this prayer to Answered.',
    answerProcessFailed:'Something went wrong while processing the answer. Please try again.',
    updateAvailable:'A new version is available.\nUpdate now?',
    importConflictReplace:count=>`${count} imported item${count===1?'':'s'} conflict with current data.\n\nThe same choice will be applied to all conflicts.\n\n[OK] Use imported title/body and merge memos\n[Cancel] Choose another option`,
    importConflictKeepBoth:count=>`Keep both versions of the ${count} conflicting item${count===1?'':'s'}?\n\nThe same choice will be applied to all conflicts.\n\n[OK] Keep both\n[Cancel] Keep current title/body and merge memos`,
    importResult:(result,label)=>{
      const lines=[`${label} completed.`,'',`Added: ${result.added||0}`,`Merged: ${result.merged||0}`,`Conflicts: ${result.conflicted||0}`,`Memos added: ${result.memoAdded||0}`,`Skipped: ${result.skipped||0}`];
      if(result.futureDateAdjusted) lines.push('',`Note: ${result.futureDateAdjusted} future date${result.futureDateAdjusted===1?' was':'s were'} adjusted to the current date.`);
      const reasons=[];
      if(result.missingTitleSkipped) reasons.push(`missing title ${result.missingTitleSkipped}`);
      if(result.missingDateSkipped) reasons.push(`missing created date ${result.missingDateSkipped}`);
      if(result.invalidDateSkipped) reasons.push(`invalid created date ${result.invalidDateSkipped}`);
      if(result.invalidMemoDateSkipped) reasons.push(`invalid memo date ${result.invalidMemoDateSkipped}`);
      if(result.orphanMemoSkipped) reasons.push(`memo without matching prayer ${result.orphanMemoSkipped}`);
      if(reasons.length) lines.push('',`Skipped reasons: ${reasons.join(', ')}`);
      return lines.join('\n');
    },
    excelImportLabel:'Excel import', backupImportLabel:'Backup import'
  }
};
function popupT(key,...args){
  const lang=Language.get();
  const dict=POPUP_LANG[lang] || POPUP_LANG.ko;
  const val=(dict && Object.prototype.hasOwnProperty.call(dict,key)) ? dict[key] : (POPUP_LANG.ko[key] || key);
  return typeof val==='function'?val(...args):val;
}


// ── 기본 카테고리 표시 번역 ──
// 사용자가 직접 만든 카테고리는 번역하지 않고 그대로 표시합니다.

// data-i18n 기반 정적 UI 번역기.
// 아이콘/자식 요소가 있는 컨테이너에는 data-i18n을 직접 붙이지 않고,
// 번역할 텍스트 전용 요소에만 붙여 내부 마크업이 지워지지 않게 합니다.
function applyTranslations(root=document){
  if(!root) return;
  const scope = root.matches?.('[data-i18n], [data-i18n-placeholder], [data-i18n-aria-label]')
    ? [root]
    : [];
  const elements = scope.concat(Array.from(root.querySelectorAll?.('[data-i18n], [data-i18n-placeholder], [data-i18n-aria-label]') || []));

  elements.forEach(el=>{
    const textKey=el.dataset.i18n;
    const placeholderKey=el.dataset.i18nPlaceholder;
    const ariaKey=el.dataset.i18nAriaLabel;
    if(textKey) el.textContent=uiT(textKey);
    if(placeholderKey) el.setAttribute('placeholder',uiT(placeholderKey));
    if(ariaKey) el.setAttribute('aria-label',uiT(ariaKey));
  });
}

// 정적 문구는 data-i18n으로 처리하고, 렌더링으로 생성되는 동적 UI만 여기서 갱신합니다.
function refreshLocalizedUI(){
  const lang=Language.get();
  document.documentElement.lang=lang;
  if(typeof updateLangChecks==='function') updateLangChecks(lang);
  applyTranslations(document);

  const _activeTopbarView=activeViewName();
  if(_activeTopbarView){ setTopbarConfig(_activeTopbarView); }

  document.querySelectorAll('.memo-add-btn.record').forEach(e=>e.textContent=uiT('memo'));
  document.querySelectorAll('.memo-add-btn.thanks').forEach(e=>e.textContent=uiT('mark'));
  document.querySelectorAll('.archived-tag').forEach(e=>e.textContent=uiT('answered'));
  document.querySelectorAll('.restore-btn').forEach(e=>{
    if(e.textContent.trim()==='등록'||e.textContent.trim()==='Add') e.textContent=uiT('add');
  });

  const lockSub=document.getElementById('lock-toggle-sub');
  if(lockSub) lockSub.textContent=lockEnabled?uiT('lockOn'):uiT('lockOff');

  document.querySelectorAll('.tab').forEach(e=>{
    const x=e.textContent.trim();
    if(x===CategoryService.ALL||x===CategoryService.label(CategoryService.ALL)) e.textContent=uiT('all');
    else if(x===CategoryService.UNCATEGORIZED||x===CategoryService.label(CategoryService.UNCATEGORIZED)) e.textContent=uiT('uncategorized');
  });
  document.querySelectorAll('.cat-badge,.cat-chip').forEach(e=>{
    const x=e.textContent.trim();
    if(x===CategoryService.UNCATEGORIZED||x===CategoryService.label(CategoryService.UNCATEGORIZED)) e.textContent=uiT('uncategorized');
  });

  // 사용자 생성 카테고리는 번역하지 않습니다.
  document.querySelectorAll('.list-count').forEach(e=>{
    const n=(e.textContent.match(/\d+/)||[])[0];
    if(n) e.textContent=uiT('count',Number(n));
  });
  document.querySelectorAll('.list-empty').forEach(e=>{
    const x=e.textContent;
    const icon=e.querySelector('i');
    let key='';
    if(x.includes('검색 결과가 없습니다')||x.includes('No results found')) key='noSearch';
    else if(x.includes('보관된 기도제목이 없습니다')||x.includes('No answered prayers')) key='noArchive';
    else if(x.includes('기도제목을 추가해보세요')||x.includes('Add a prayer title')) key='empty';
    if(key){
      e.innerHTML='';
      if(icon)e.appendChild(icon);
      e.appendChild(document.createElement('br'));
      e.appendChild(document.createTextNode(uiT(key)));
    }
  });
}
function setLang(lang){
  const previous=Language.get();
  const current=Language.set(lang);
  if(current===previous) return;

  const view=['list','archive','cat','backup','detail'].find(name=>
    document.getElementById('view-'+name)?.classList.contains('visible')
  );
  if(view==='list'){ buildSlides(); renderTabs(); }
  else if(view==='archive'){ renderArchive(); }
  else if(view==='cat'){ renderCatManage(); }
  else if(view==='detail'){ renderDetail(); }

  refreshLocalizedUI();
  applyPinLanguage();
}


// ── 커스텀 팝업 ──
function modalT(key){
  const lang=Language.get();
  const dict={
    ko:{alertTitle:'알림',confirmTitle:'확인',ok:'확인',cancel:'취소'},
    en:{alertTitle:'Notice',confirmTitle:'Confirm',ok:'OK',cancel:'Cancel'}
  };
  return (dict[lang]&&dict[lang][key])||dict.ko[key]||key;
}
function closeCustomModal(){
  const modal=document.getElementById('custom-modal');
  if(modal){
    modal.classList.add('hidden');
    modal.classList.remove('alert-mode');
  }
}

function replaceModalButton(btn){
  if(!btn || !btn.parentNode) return btn;
  const clone=btn.cloneNode(true);
  btn.parentNode.replaceChild(clone, btn);
  return clone;
}

function getCustomModalRefs(){
  const modal=document.getElementById('custom-modal');
  const titleEl=document.getElementById('custom-modal-title');
  const msgEl=document.getElementById('custom-modal-message');
  const cancelBtn=document.getElementById('custom-modal-cancel');
  const okBtn=document.getElementById('custom-modal-ok');
  if(!modal||!titleEl||!msgEl||!okBtn) return null;
  return {modal,titleEl,msgEl,cancelBtn,okBtn};
}

function showModal({title='', body='', onConfirm=null, showCancel=true}={}){
  return new Promise(resolve=>{
    const refs=getCustomModalRefs();
    if(!refs){
      if(showCancel) resolve(window.confirm(body));
      else { window.alert(body); resolve(true); }
      return;
    }

    const {modal,titleEl,msgEl}=refs;
    let cancelBtn=replaceModalButton(refs.cancelBtn);
    let okBtn=replaceModalButton(refs.okBtn);

    titleEl.textContent=title;
    msgEl.textContent=body;
    okBtn.textContent=modalT('ok');

    modal.classList.toggle('alert-mode', !showCancel);
    if(cancelBtn){
      cancelBtn.textContent=modalT('cancel');
      setShown(cancelBtn, !!showCancel);
      cancelBtn.addEventListener('click',()=>{ closeCustomModal(); resolve(false); },{once:true});
    }

    okBtn.addEventListener('click',()=>{
      closeCustomModal();
      if(typeof onConfirm==='function') onConfirm();
      resolve(true);
    },{once:true});

    modal.classList.remove('hidden');
  });
}

function showAlert(message,title){
  return showModal({
    title:title||modalT('alertTitle'),
    body:message,
    showCancel:false
  }).then(()=>undefined);
}

function showConfirm(message,title){
  return showModal({
    title:title||modalT('confirmTitle'),
    body:message,
    showCancel:true
  });
}

// ── PIN 화면 다국어 ──
function applyPinLanguage(){
  const modeKeys={
    unlock:'pinEnter',
    setup1:'pinSetup',
    setup2:'pinConfirm',
    change1:'pinCurrent',
    change2:'pinNew',
    change3:'pinNewConfirm'
  };
  const sub=document.getElementById('lock-sub');
  const hint=document.getElementById('lock-hint');
  if(sub) sub.textContent=uiT(modeKeys[pinState.mode]||'pinEnter');
  if(hint) hint.textContent=pinState.mode==='setup1'?uiT('pinSetupHint'):'';
  const back=document.getElementById('lock-back-btn');
  const del=document.getElementById('pin-delete-btn');
  const keypad=document.querySelector('#lock .keypad');
  if(back) back.setAttribute('aria-label',uiT('pinBackLabel'));
  if(del) del.setAttribute('aria-label',uiT('pinDeleteLabel'));
  if(keypad) keypad.setAttribute('aria-label',uiT('pinKeypadLabel'));
  updateDots();
}

// ── 설정 ──
function openSettings(){
  const toggle=document.getElementById('lock-toggle');
  if(toggle) toggle.checked=lockEnabled;
  setShown(document.getElementById('change-pin-item'), lockEnabled);
  refreshLocalizedUI();
  document.getElementById('settings-overlay').classList.add('open');
}
function closeSettings(e){
  if(!e||e.target===document.getElementById('settings-overlay'))
    document.getElementById('settings-overlay').classList.remove('open');
}
function onLockToggle(checked){
  if(checked && !hasPinCredential()){
    const toggle=document.getElementById('lock-toggle');
    if(toggle) toggle.checked=false;
    document.getElementById('settings-overlay').classList.remove('open');
    setTimeout(()=>startPinSetup('settings-enable'),200);
    return;
  }
  if(!persistLockEnabled(checked)){
    const toggle=document.getElementById('lock-toggle');
    if(toggle) toggle.checked=lockEnabled;
    document.getElementById('lock-toggle-sub').textContent=lockEnabled?uiT('lockOn'):uiT('lockOff');
    setShown(document.getElementById('change-pin-item'),lockEnabled);
    return;
  }
  document.getElementById('lock-toggle-sub').textContent=checked?uiT('lockOn'):uiT('lockOff');
  setShown(document.getElementById('change-pin-item'),checked);
}
function goSettingsMenu(menu){
  document.getElementById('settings-overlay').classList.remove('open');
  if(menu==='cat') showView('cat');
  else if(menu==='backup') showView('backup');
  else if(menu==='pin') startPinChange();
}

// ── 뷰 전환 ──




// ============================================================
