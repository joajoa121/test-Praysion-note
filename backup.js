// ============================================================
// 10. Backup / import / Excel
// Backup, import, and Excel operations are isolated in module scope.
// ============================================================
(()=>{
  'use strict';

  // 파일 선택 단계와 실제 가져오기 처리 단계의 중복 실행을 각각 차단합니다.
  let isProcessingImport = false;
  let isOpeningImportPicker = false;

function isImportBusy(){
  return isProcessingImport || isOpeningImportPicker;
}

function updateImportControls(){
  const busy=isImportBusy();
  document.querySelectorAll('[data-import-trigger]').forEach(button=>{
    button.disabled=busy;
    button.setAttribute('aria-busy',busy?'true':'false');
  });
  ['backup-file-input','excel-file-input'].forEach(id=>{
    const input=document.getElementById(id);
    if(input) input.disabled=isProcessingImport;
  });
}

function setImportProcessing(active){
  isProcessingImport=!!active;
  updateImportControls();
}

function exportBackup(){
  document.getElementById('settings-overlay').classList.remove('open');
  const data={version:1,exportedAt:today(),categories:AppState.categories,prayers:AppState.prayers};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`praysion-note-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    try{ document.body.removeChild(a); }catch(e){}
    URL.revokeObjectURL(url);
  },5000);
}

// 가져오기 로직이 의존하는 공통 런타임 상태를 명시적으로 확인합니다.
function ensureBackupRuntimeState(){
  const missing=[];
  if(typeof AppState==='undefined') missing.push('AppState');
  if(typeof nextId==='undefined') missing.push('nextId');
  if(typeof nextMemoId==='undefined') missing.push('nextMemoId');
  if(typeof curTabIdx==='undefined') missing.push('curTabIdx');
  if(typeof searchQuery==='undefined') missing.push('searchQuery');

  if(missing.length){
    throw new Error(`Backup runtime state is unavailable: ${missing.join(', ')}`);
  }
}


// JSON 가져오기
async function importBackup(){
  if(isImportBusy()) return;
  isOpeningImportPicker=true;
  updateImportControls();
  try{
    document.getElementById('settings-overlay').classList.remove('open');
    if(!(await showConfirm(popupT('importBackupConfirm')))) return;
    const fileInput=document.getElementById('backup-file-input');
    if(!fileInput){
      await showAlert(popupT('backupInvalid'));
      return;
    }
    fileInput.value='';
    fileInput.click();
  }finally{
    isOpeningImportPicker=false;
    updateImportControls();
  }
}

function excelCategoryToInternal(raw){
  const s=safeTrim(raw);
  if(!s) return CategoryService.UNCATEGORIZED;
  return CategoryService.normalize(s);
}

function isAnsweredStatus(status){
  return excelKeywordPattern(EXCEL_IMPORT_KEYWORDS.answeredStatus).test(safeTrim(status));
}
function memoTypeFromExcel(typeRaw){
  return excelKeywordPattern(EXCEL_IMPORT_KEYWORDS.thanksMemo).test(safeTrim(typeRaw))?'thanks':'record';
}

function isBlankImportValue(value){
  return value===null || value===undefined || (typeof value==='string' && safeTrim(value)==='');
}
function validateImportDate(value,{required=false,importStats=null}={}){
  if(isBlankImportValue(value)){
    return required ? {ok:false,reason:'missing'} : {ok:true,value:excelDateToISO('',importStats),blank:true};
  }
  const parsed=parseAppDateTime(value,{fallbackNow:false,clampFuture:false});
  if(!parsed) return {ok:false,reason:'invalid'};
  return {ok:true,value:excelDateToISO(value,importStats)};
}

function excelDateToISO(v, importStats=null){
  // Excel의 날짜/시간을 현지 시각 그대로 보존합니다.
  // 날짜만 있으면 00:00:00으로 저장하고, 미래 날짜는 기존 정책대로 현재 시각으로 보정합니다.
  const parsedWithoutClamp=parseAppDateTime(v,{fallbackNow:false,clampFuture:false});
  if(importStats && parsedWithoutClamp && parsedWithoutClamp>nowAppDateTime()){
    importStats.futureDateAdjusted=(importStats.futureDateAdjusted||0)+1;
  }
  return parseAppDateTime(v,{fallbackNow:true,clampFuture:true});
}

function excelStatusToArchived(status){
  return isAnsweredStatus(status);
}
function excelStatusToState(status){
  return excelStatusToArchived(status) ? 'answered' : 'praying';
}
function normalizePrayerRecord(raw, importStats=null){
  const p=raw || {};
  const idNumber=Number(p.id);
  const archived=typeof p.archived==='boolean'
    ? p.archived
    : (p.isAnswered===true || p.status==='answered' || isAnsweredStatus(p.status));
  const memos=Array.isArray(p.memos) ? p.memos.map(m=>{
    const memoIdNumber=Number(m&&m.id);
    return {
      ...(Number.isFinite(memoIdNumber) ? {id:memoIdNumber} : {}),
      date:excelDateToISO(m&&m.date,importStats),
      text:String((m&&m.text) ?? ''),
      type:memoTypeFromExcel((m&&m.type) || '')
    };
  }) : [];
  return {
    ...(safeTrim(p.uuid || p.uid) ? {uuid:safeTrim(p.uuid || p.uid)} : {}),
    ...(Number.isFinite(idNumber) ? {id:idNumber} : {}),
    cat:excelCategoryToInternal(p.cat || p.category || p.categoryId || ''),
    title:String(p.title ?? ''),
    body:String(p.body ?? p.content ?? ''),
    archived,
    status:archived ? 'answered' : 'praying',
    memos,
    createdAt:excelDateToISO(p.createdAt || p.date,importStats)
  };
}
function refreshAfterBackupImport(){
  if(typeof curTabIdx!=='undefined') curTabIdx=0;
  if(typeof searchQuery!=='undefined') searchQuery='';
  const searchInput=document.getElementById('search-input');
  if(searchInput) searchInput.value='';
  const searchClear=document.getElementById('search-clear');
  if(searchClear) searchClear.classList.remove('visible');
  if(typeof showView==='function') showView('list',false);
  else {
    if(typeof renderTabs==='function' && document.getElementById('tab-bar')) renderTabs();
    if(typeof buildSlides==='function' && document.getElementById('slide-container')) buildSlides();
    if(typeof refreshLocalizedUI==='function') refreshLocalizedUI();
  }
}

function yieldToMainThread(){
  return new Promise(resolve=>setTimeout(resolve,0));
}
async function yieldEvery(index, chunkSize=100){
  if(index>0 && index%chunkSize===0) await yieldToMainThread();
}
function clearLargeFileRefs(input){
  if(input){
    try{ input.value=''; }catch(e){}
  }
}
function scheduleBackupRender(){
  return new Promise(resolve=>{
    const run=()=>{ refreshAfterBackupImport(); resolve(); };
    if(typeof requestAnimationFrame==='function') requestAnimationFrame(run);
    else setTimeout(run,0);
  });
}

function normHeader(s){ return String(s||'').replace(/\s/g,'').trim(); }
function safeTrim(value){
  if(value===null || value===undefined) return '';
  return String(value).replace(/^[\s\u00A0]+|[\s\u00A0]+$/g,'');
}

const EXCEL_IMPORT_KEYWORDS = {
  answeredStatus: ['응답','완료','answered','answer','archived','archive','done','thanks'],
  thanksMemo: ['응답 및 감사','응답','감사','thanks','thank','answer','answered']
};
function excelKeywordPattern(list){
  return new RegExp(list.map(v=>String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*')).join('|'),'i');
}

function cleanStringForSignature(value){
  return safeTrim(value).replace(/\s+/g,' ').toLowerCase();
}
function safeMax(array, minVal=0){
  return (Array.isArray(array)?array:[]).reduce((max,val)=>{
    const num=Number(val);
    return Number.isFinite(num) && num<Number.MAX_SAFE_INTEGER ? Math.max(max,num) : max;
  },minVal);
}
function fileHasExtension(file, extensions){
  const name=String((file&&file.name)||'').toLowerCase();
  return extensions.some(ext=>name.endsWith(ext));
}
async function rejectInvalidFile(file, extensions, messageKey){
  if(fileHasExtension(file, extensions)) return false;
  await showAlert(popupT(messageKey));
  return true;
}

function prayerUuid(p){
  return safeTrim((p&&p.uuid) || (p&&p.uid) || '').toLowerCase();
}
function prayerContentSignature(p){
  const uncategorized=CategoryService.UNCATEGORIZED;
  const cat=CategoryService.normalize((p&&p.cat) || uncategorized);
  return [
    cleanStringForSignature(p&&p.title),
    cleanStringForSignature(p&&p.body),
    safeTrim(p&&p.createdAt),
    cleanStringForSignature(cat),
    (p&&p.archived) ? 'answered' : 'praying'
  ].join('|');
}
function legacyIdentitySignature(p){
  const title=cleanStringForSignature(p&&p.title);
  const createdAt=safeTrim(p&&p.createdAt);
  return title && createdAt ? `${title}|${createdAt}` : '';
}
function prayerCoreEquals(a,b){
  return prayerContentSignature(a)===prayerContentSignature(b);
}
function cloneImportValue(value){
  if(typeof structuredClone==='function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
function createPrayerUuid(){
  if(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function') return crypto.randomUUID();
  const bytes=new Uint8Array(16);
  if(typeof crypto!=='undefined' && typeof crypto.getRandomValues==='function') crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256);
  bytes[6]=(bytes[6]&0x0f)|0x40;
  bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function assignFreshImportIds(prayer, allocator, {newUuid=false}={}){
  const p=prayer;
  p.id=Number(allocator.nextPrayerId());
  if(newUuid) p.uuid=createPrayerUuid();
  p.memos=(Array.isArray(p.memos)?p.memos:[]).map(m=>({
    ...m,
    id:Number(allocator.nextMemoId())
  }));
  return p;
}
function createImportAllocator(prayers){
  const list=Array.isArray(prayers)?prayers:[];
  let prayerId=safeMax(list.map(p=>Number(p&&p.id)||0),9)+1;
  let memoId=safeMax(list.flatMap(p=>(Array.isArray(p&&p.memos)?p.memos:[]).map(m=>Number(m&&m.id)||0)),199)+1;
  return {
    nextPrayerId(){ return prayerId++; },
    nextMemoId(){ return memoId++; },
    peekPrayerId(){ return prayerId; },
    peekMemoId(){ return memoId; }
  };
}
function memoSignature(m){
  return [safeTrim(m&&m.date), safeTrim(m&&m.type) || 'record', cleanStringForSignature(m&&m.text)].join('|');
}
function addMemoToPrayer(prayer, rawMemo, allocator=null, importStats=null){
  if(!prayer) return false;
  const text=safeTrim(rawMemo&&rawMemo.text);
  if(!text) return false;
  const type=memoTypeFromExcel((rawMemo&&rawMemo.type) || '');
  const date=excelDateToISO((rawMemo&&rawMemo.date) || '',importStats);
  const memo={...(allocator ? {id:Number(allocator.nextMemoId())} : {}),text,date,type};
  if(!Array.isArray(prayer.memos)) prayer.memos=[];
  const seen=new Set(prayer.memos.map(memoSignature));
  if(seen.has(memoSignature(memo))) return false;
  prayer.memos.push(memo);
  return true;
}
function mergePrayerMemos(target, incoming, allocator=null){
  if(!target || !incoming) return 0;
  if(!Array.isArray(target.memos)) target.memos=[];
  const seen=new Set(target.memos.map(memoSignature));
  let added=0;
  (Array.isArray(incoming.memos)?incoming.memos:[]).forEach(m=>{
    const text=safeTrim(m&&m.text);
    if(!text) return;
    const memo={
      id:allocator ? Number(allocator.nextMemoId()) : Number(nextMemoId++),
      text,
      date:excelDateToISO(m&&m.date),
      type:memoTypeFromExcel((m&&m.type) || '')
    };
    if(seen.has(memoSignature(memo))) return;
    target.memos.push(memo);
    seen.add(memoSignature(memo));
    added++;
  });
  return added;
}
function replacePrayerRecord(target, incoming, allocator=null){
  if(!target || !incoming) return 0;
  target.cat=excelCategoryToInternal(incoming.cat || target.cat);
  target.title=safeTrim(incoming.title) || '';
  target.body=safeTrim(incoming.body) || '';
  target.createdAt=excelDateToISO(incoming.createdAt || target.createdAt);
  target.archived=!!incoming.archived;
  target.status=target.archived ? 'answered' : 'praying';
  const uuid=prayerUuid(incoming);
  if(uuid) target.uuid=safeTrim(incoming.uuid || incoming.uid);
  return mergePrayerMemos(target,incoming,allocator);
}
function countMemoMerge(result, addedMemos){
  const added=Number(addedMemos)||0;
  result.memoAdded+=added;
  if(added>0) result.merged++;
  else result.skipped++;
}
function createImportIndexes(prayers){
  const byUuid=new Map();
  const byContent=new Map();
  const byLegacyIdentity=new Map();
  (Array.isArray(prayers)?prayers:[]).forEach(p=>{
    const uuid=prayerUuid(p);
    if(uuid && !byUuid.has(uuid)) byUuid.set(uuid,p);
    const content=prayerContentSignature(p);
    if(content && !byContent.has(content)) byContent.set(content,p);
    const legacy=legacyIdentitySignature(p);
    if(legacy && !byLegacyIdentity.has(legacy)) byLegacyIdentity.set(legacy,p);
  });
  return {byUuid,byContent,byLegacyIdentity};
}
function indexImportedPrayer(indexes, prayer){
  const uuid=prayerUuid(prayer);
  if(uuid) indexes.byUuid.set(uuid,prayer);
  indexes.byContent.set(prayerContentSignature(prayer),prayer);
  const legacy=legacyIdentitySignature(prayer);
  if(legacy) indexes.byLegacyIdentity.set(legacy,prayer);
}
function findImportMatch(indexes, incoming){
  const uuid=prayerUuid(incoming);
  if(uuid && indexes.byUuid.has(uuid)){
    const target=indexes.byUuid.get(uuid);
    return {target,kind:prayerCoreEquals(target,incoming)?'duplicate':'conflict'};
  }
  const content=prayerContentSignature(incoming);
  if(indexes.byContent.has(content)) return {target:indexes.byContent.get(content),kind:'duplicate'};
  const legacy=legacyIdentitySignature(incoming);
  if(legacy && indexes.byLegacyIdentity.has(legacy)){
    return {target:indexes.byLegacyIdentity.get(legacy),kind:'conflict'};
  }
  return {target:null,kind:'new'};
}
async function chooseConflictPolicy(count){
  if(!count) return 'keepCurrent';
  const replace=await showConfirm(popupT('importConflictReplace',count));
  if(replace) return 'replace';
  const keepBoth=await showConfirm(popupT('importConflictKeepBoth',count));
  return keepBoth ? 'keepBoth' : 'keepCurrent';
}
function formatImportResult(result, label){
  return popupT('importResult',result,label || popupT('backupImportLabel'));
}
function normalizeImportedCategories(categories, prayers){
  const arr=CategoryService.normalizeArray(categories || []);
  (Array.isArray(prayers)?prayers:[]).forEach(p=>{
    const cat=excelCategoryToInternal(p&&p.cat);
    if(cat && !arr.includes(cat)) arr.push(cat);
  });
  return CategoryService.sort(arr);
}
function rowVal(row, names){
  for(const n of names){
    if(row[n]!==undefined && row[n]!==null && String(row[n]).trim()!=='') return row[n];
  }
  return '';
}
function sheetRows(wb, sheetNames){
  if(!window.XLSX || !window.XLSX.utils) return [];
  const names=Array.isArray(sheetNames)?sheetNames:[sheetNames];
  let ws=null;
  for(const sheetName of names){
    ws=wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames.find(n=>n.replace(/\s/g,'').toLowerCase()===String(sheetName).replace(/\s/g,'').toLowerCase())];
    if(ws) break;
  }
  if(!ws) return [];
  const raw=XLSX.utils.sheet_to_json(ws,{defval:''});
  return raw.map(r=>{
    const o={};
    Object.keys(r).forEach(k=>o[normHeader(k)]=r[k]);
    return o;
  });
}
// Excel 양식 다운로드
async function downloadExcelTemplate(){
  if(!window.XLSX){
    await showAlert(popupT('excelLoadFail'));
    return;
  }

  const prayerSheet=XLSX.utils.aoa_to_sheet([
    ['PrayerID','Title','Content','Category','Status','CreatedDate'],
    ['P001','','','','','2026-07-14 18:00'],
    ['P002','','','','','2026-07-15']
  ]);

  const memoSheet=XLSX.utils.aoa_to_sheet([
    ['PrayerID','MemoDate','MemoType','MemoContent'],
    ['P001','2026-07-14 18:30','','']
  ]);

  const guideSheet=XLSX.utils.aoa_to_sheet([
    ['Korean','English'],
    ['이 파일은 이룸기도 백업/가져오기용 Excel 양식입니다.','This Excel template is used for Praysion Note import.'],
    ['PrayerID는 기도제목과 메모를 연결하는 고유값입니다.','PrayerID is the unique value that links a prayer with its memos.'],
    ['Title은 기도제목입니다. 비워두면 가져오지 않습니다.','Title is the prayer title. Rows without a Title will not be imported.'],
    ['Content는 기도내용입니다.','Content is the prayer content.'],
    ['Category는 카테고리 이름입니다. 비워두면 미분류로 저장됩니다. 기본 카테고리는 분류 1, 분류 2, 분류 3, 분류 4를 권장합니다.','Category is the category name. If blank, it will be saved as Uncategorized. Recommended default categories are Category 1, Category 2, Category 3, and Category 4.'],
    ['Status는 기도중 또는 응답을 입력하세요. 응답은 완료도 호환됩니다.','Status should be praying or answered. Done is also supported as answered.'],
    ['CreatedDate는 필수입니다. 날짜가 없거나 형식이 잘못된 기도 행은 가져오지 않습니다. MemoDate는 비워둘 수 있지만, 입력한 날짜 형식이 잘못되면 해당 메모를 가져오지 않습니다. 날짜는 YYYY-MM-DD HH:mm 형식으로 입력하세요. 시간을 생략하면 00:00으로 저장되며, 미래 날짜와 시간은 현재 날짜와 시간으로 저장됩니다.','CreatedDate is required. Prayer rows with a missing or invalid date are not imported. MemoDate may be blank, but a memo with an invalid entered date is not imported. Use YYYY-MM-DD HH:mm. If the time is omitted, 00:00 is used, and future date-times are saved as the current local date and time.'],
    ['MemoType은 메모 또는 응답을 입력하세요. 응답은 감사도 호환됩니다. 비워두면 메모로 저장됩니다.','MemoType should be memo or answer. Thanks is also supported as answer. If blank, it will be saved as memo.']
  ]);

  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,prayerSheet,'Prayers');
  XLSX.utils.book_append_sheet(wb,memoSheet,'Memos');
  XLSX.utils.book_append_sheet(wb,guideSheet,'Guide');
  XLSX.writeFile(wb,'praysion-note-import-template.xlsx');
}
// Excel 파일 선택
async function importExcelBackup(){
  if(isImportBusy()) return;
  isOpeningImportPicker=true;
  updateImportControls();
  try{
    if(!window.XLSX){
      await showAlert(popupT('excelLoadFail'));
      return;
    }
    if(!(await showConfirm(popupT('importExcelConfirm')))) return;
    const fileInput=document.getElementById('excel-file-input');
    if(!fileInput){
      await showAlert(popupT('excelImportFail'));
      return;
    }
    fileInput.value='';
    fileInput.click();
  }finally{
    isOpeningImportPicker=false;
    updateImportControls();
  }
}

// 공통 파일 읽기
function readFileAsArrayBuffer(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=ev=>resolve(ev.target.result);
    reader.onerror=()=>reject(reader.error || new Error('file read failed'));
    reader.readAsArrayBuffer(file);
  });
}
function readFileAsText(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=ev=>resolve(ev.target.result);
    reader.onerror=()=>reject(reader.error || new Error('file read failed'));
    reader.readAsText(file);
  });
}

// Excel 데이터 변환
async function parseExcelToAppState(arrayBuffer){
  ensureBackupRuntimeState();
  await yieldToMainThread();
  const wb=XLSX.read(arrayBuffer,{type:'array',cellDates:true});
  const prayerRows=sheetRows(wb,['Prayers','기도제목']);
  const memoRows=sheetRows(wb,['Memos','메모']);
  if(!prayerRows.length) throw new Error('no prayer sheet');

  const idMap=new Map();
  const signatureMap=new Map();
  const importedCategories=[];
  const importedPrayers=[];
  let memoAdded=0;
  const importStats={futureDateAdjusted:0,skipped:0,missingTitleSkipped:0,missingDateSkipped:0,invalidDateSkipped:0,invalidMemoDateSkipped:0,orphanMemoSkipped:0};

  for(let rowIndex=0; rowIndex<prayerRows.length; rowIndex++){
    await yieldEvery(rowIndex,50);
    const row=prayerRows[rowIndex];
    const oldId=safeTrim(rowVal(row,['PrayerID','기도ID','ID','id'])) || `ROW${rowIndex+1}`;
    const title=safeTrim(rowVal(row,['Title','기도제목','제목','title']));
    if(!title){
      importStats.skipped++;
      importStats.missingTitleSkipped++;
      continue;
    }
    const body=safeTrim(rowVal(row,['Content','기도내용','내용','본문','body']));
    const cat=safeTrim(rowVal(row,['Category','카테고리','분류','category']));
    const normalizedCat=excelCategoryToInternal(cat);
    const status=safeTrim(rowVal(row,['Status','상태','응답여부','status','isAnswered']));
    const createdDateCheck=validateImportDate(rowVal(row,['CreatedDate','기도제목날짜','기도날짜','작성일','날짜','createdAt']),{required:true,importStats});
    if(!createdDateCheck.ok){
      importStats.skipped++;
      if(createdDateCheck.reason==='missing') importStats.missingDateSkipped++;
      else importStats.invalidDateSkipped++;
      continue;
    }
    const createdAt=createdDateCheck.value;

    if(normalizedCat && !importedCategories.includes(normalizedCat)) importedCategories.push(normalizedCat);

    const archived=excelStatusToArchived(status);
    const candidate={
      cat:String(normalizedCat),
      title,
      body,
      archived,
      status:excelStatusToState(status),
      memos:[],
      createdAt
    };

    const sig=prayerContentSignature(candidate);
    const existing=signatureMap.get(sig);
    const newPrayer=existing || candidate;
    if(!existing){
      importedPrayers.push(newPrayer);
      signatureMap.set(sig,newPrayer);
    }
    idMap.set(oldId,newPrayer);

    // 한 행에 기도와 메모가 함께 들어있는 양식도 안전하게 지원합니다.
    const inlineMemoText=safeTrim(rowVal(row,['MemoContent','메모내용','메모','memo','text']));
    if(inlineMemoText){
      const inlineMemoDate=rowVal(row,['MemoDate','메모날짜','메모작성일','메모_생성일','date']);
      const memoDateCheck=validateImportDate(inlineMemoDate,{required:false,importStats});
      if(!memoDateCheck.ok){
        importStats.skipped++;
        importStats.invalidMemoDateSkipped++;
      }else{
        const didAdd=addMemoToPrayer(newPrayer,{
          text:inlineMemoText,
          type:rowVal(row,['MemoType','메모종류','종류','type']),
          date:memoDateCheck.value
        });
        if(didAdd) memoAdded++;
      }
    }
  }

  for(let memoIndex=0; memoIndex<memoRows.length; memoIndex++){
    await yieldEvery(memoIndex,50);
    const row=memoRows[memoIndex];
    const oldId=safeTrim(rowVal(row,['PrayerID','기도ID','ID','id']));
    const p=idMap.get(oldId);
    if(!p){
      importStats.skipped++;
      importStats.orphanMemoSkipped++;
      continue;
    }
    const memoText=safeTrim(rowVal(row,['MemoContent','메모내용','메모','내용','memo','text']));
    if(!memoText) continue;
    const memoDateCheck=validateImportDate(rowVal(row,['MemoDate','메모날짜','메모작성일','메모_생성일','날짜','date']),{required:false,importStats});
    if(!memoDateCheck.ok){
      importStats.skipped++;
      importStats.invalidMemoDateSkipped++;
      continue;
    }
    const didAdd=addMemoToPrayer(p,{
      text:memoText,
      type:rowVal(row,['MemoType','메모종류','종류','type']),
      date:memoDateCheck.value
    });
    if(didAdd) memoAdded++;
  }

  if(!importedPrayers.length) throw new Error('no rows imported');

  return {
    categories:importedCategories,
    prayers:importedPrayers,
    added:importedPrayers.length,
    memoAdded,
    futureDateAdjusted:importStats.futureDateAdjusted,
    skipped:importStats.skipped,
    missingTitleSkipped:importStats.missingTitleSkipped,
    missingDateSkipped:importStats.missingDateSkipped,
    invalidDateSkipped:importStats.invalidDateSkipped,
    invalidMemoDateSkipped:importStats.invalidMemoDateSkipped,
    orphanMemoSkipped:importStats.orphanMemoSkipped
  };
}

// Excel 상태 반영 및 UI 갱신
async function applyExcelImportToAppState(imported){
  ensureBackupRuntimeState();
  if(!imported || !Array.isArray(imported.prayers)) throw new Error('invalid excel import');

  const workingPrayers=cloneImportValue(Array.isArray(AppState.prayers)?AppState.prayers:[]);
  const workingCategories=cloneImportValue(Array.isArray(AppState.categories)?AppState.categories:[]);
  const allocator=createImportAllocator(workingPrayers);
  const indexes=createImportIndexes(workingPrayers);
  const conflicts=[];
  const result={
    added:0,merged:0,conflicted:0,memoAdded:0,
    skipped:Number(imported.skipped)||0,
    futureDateAdjusted:Number(imported.futureDateAdjusted)||0,
    missingTitleSkipped:Number(imported.missingTitleSkipped)||0,
    missingDateSkipped:Number(imported.missingDateSkipped)||0,
    invalidDateSkipped:Number(imported.invalidDateSkipped)||0,
    invalidMemoDateSkipped:Number(imported.invalidMemoDateSkipped)||0,
    orphanMemoSkipped:Number(imported.orphanMemoSkipped)||0
  };

  for(let importIndex=0; importIndex<imported.prayers.length; importIndex++){
    await yieldEvery(importIndex,200);
    const p=normalizePrayerRecord(imported.prayers[importIndex]);
    p.cat=excelCategoryToInternal(p.cat);
    const match=findImportMatch(indexes,p);
    if(match.kind==='duplicate'){
      countMemoMerge(result,mergePrayerMemos(match.target,p,allocator));
    }else if(match.kind==='conflict'){
      conflicts.push({target:match.target,incoming:p});
    }else{
      p.memos=(Array.isArray(p.memos)?p.memos:[]).map(m=>({
        text:safeTrim(m&&m.text),
        date:excelDateToISO(m&&m.date), type:memoTypeFromExcel((m&&m.type)||'')
      })).filter(m=>m.text);
      assignFreshImportIds(p,allocator);
      result.memoAdded+=p.memos.length;
      workingPrayers.unshift(p);
      indexImportedPrayer(indexes,p);
      result.added++;
    }
  }

  const policy=await chooseConflictPolicy(conflicts.length);
  for(const item of conflicts){
    result.conflicted++;
    if(policy==='replace'){
      result.memoAdded+=replacePrayerRecord(item.target,item.incoming,allocator);
      result.merged++;
    }else if(policy==='keepBoth'){
      const p=cloneImportValue(item.incoming);
      assignFreshImportIds(p,allocator,{newUuid:true});
      workingPrayers.unshift(p);
      indexImportedPrayer(indexes,p);
      result.added++;
      result.memoAdded+=p.memos.length;
    }else{
      countMemoMerge(result,mergePrayerMemos(item.target,item.incoming,allocator));
    }
  }

  const finalPrayers=sortPrayersNewestFirst(workingPrayers.map(p=>normalizePrayerRecord(p)));
  const finalCategories=normalizeImportedCategories([...workingCategories,...(Array.isArray(imported.categories)?imported.categories:[])],finalPrayers);
  const previousNextId=nextId;
  const previousNextMemoId=nextMemoId;
  AppState.prayers=finalPrayers;
  AppState.categories=finalCategories;
  nextId=allocator.peekPrayerId();
  nextMemoId=allocator.peekMemoId();
  if(!CategoryService.commit({refresh:false})){
    nextId=previousNextId;
    nextMemoId=previousNextMemoId;
    throw new Error('Imported data could not be saved.');
  }
  await scheduleBackupRender();
  Object.assign(imported,result);
  return result;
}

// Excel 파일 읽기
async function loadExcelFile(e){
  const input=e&&e.target;
  if(isProcessingImport){ clearLargeFileRefs(input); return; }
  const file=input&&input.files?input.files[0]:null;
  if(!file){ clearLargeFileRefs(input); return; }
  if(await rejectInvalidFile(file, ['.xlsx','.xls'], 'excelImportFail')){ clearLargeFileRefs(input); return; }
  let arrayBuffer=null;
  try{
    setImportProcessing(true);
    arrayBuffer=await readFileAsArrayBuffer(file);
    const imported=await parseExcelToAppState(arrayBuffer);
    arrayBuffer=null;
    const result=await applyExcelImportToAppState(imported);
    await showAlert(formatImportResult(result,popupT('excelImportLabel')));
  }catch(err){
    await showAlert(popupT('excelImportFail'));
  }finally{
    arrayBuffer=null;
    setImportProcessing(false);
    clearLargeFileRefs(input);
  }
}

// JSON 백업 데이터 변환
function parseJsonBackupToAppState(text){
  const data=JSON.parse(text);
  if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('invalid root');
  if(!Number.isInteger(data.version) || data.version<1 || data.version>1) throw new Error('unsupported version');
  if(!Array.isArray(data.categories) || !Array.isArray(data.prayers)) throw new Error('invalid collections');
  if(data.categories.some(cat=>typeof cat!=='string')) throw new Error('invalid category');

  const seenUuids=new Set();
  data.prayers.forEach((prayer,index)=>{
    if(!prayer || typeof prayer!=='object' || Array.isArray(prayer)) throw new Error(`invalid prayer:${index}`);
    if(typeof prayer.title!=='string' || typeof (prayer.body ?? prayer.content ?? '')!=='string') throw new Error(`invalid prayer text:${index}`);
    if(!safeTrim(prayer.title)) throw new Error(`missing prayer title:${index}`);
    if(prayer.uuid!==undefined && typeof prayer.uuid!=='string') throw new Error(`invalid uuid:${index}`);
    if(prayer.uid!==undefined && typeof prayer.uid!=='string') throw new Error(`invalid uid:${index}`);
    if(prayer.archived!==undefined && typeof prayer.archived!=='boolean') throw new Error(`invalid archived:${index}`);
    if(prayer.status!==undefined && typeof prayer.status!=='string') throw new Error(`invalid status:${index}`);
    if(!Array.isArray(prayer.memos)) throw new Error(`invalid memos:${index}`);
    const createdDateCheck=validateImportDate(prayer.createdAt ?? prayer.date,{required:true});
    if(!createdDateCheck.ok) throw new Error(`invalid prayer date:${index}`);

    const uuid=prayerUuid(prayer);
    if(uuid){
      if(seenUuids.has(uuid)) throw new Error(`duplicate uuid:${index}`);
      seenUuids.add(uuid);
    }

    prayer.memos.forEach((memo,memoIndex)=>{
      if(!memo || typeof memo!=='object' || Array.isArray(memo)) throw new Error(`invalid memo:${index}:${memoIndex}`);
      if(typeof memo.text!=='string') throw new Error(`invalid memo text:${index}:${memoIndex}`);
      if(memo.type!==undefined && typeof memo.type!=='string') throw new Error(`invalid memo type:${index}:${memoIndex}`);
      if(!isBlankImportValue(memo.date) && !validateImportDate(memo.date,{required:false}).ok){
        throw new Error(`invalid memo date:${index}:${memoIndex}`);
      }
    });
  });
  return cloneImportValue(data);
}

// JSON 백업 상태 반영 및 UI 갱신
async function applyJsonBackupToAppState(data){
  ensureBackupRuntimeState();
  if(!data || !Array.isArray(data.categories) || !Array.isArray(data.prayers)) throw new Error('invalid backup');

  const workingPrayers=cloneImportValue(Array.isArray(AppState.prayers)?AppState.prayers:[]);
  const workingCategories=cloneImportValue(Array.isArray(AppState.categories)?AppState.categories:[]);
  const allocator=createImportAllocator(workingPrayers);
  const indexes=createImportIndexes(workingPrayers);
  const conflicts=[];
  const result={added:0,merged:0,conflicted:0,memoAdded:0,skipped:0,futureDateAdjusted:0};

  for(let idx=0; idx<data.prayers.length; idx++){
    await yieldEvery(idx,200);
    const p=normalizePrayerRecord(data.prayers[idx],result);
    p.cat=excelCategoryToInternal(p.cat);
    const match=findImportMatch(indexes,p);
    if(match.kind==='duplicate'){
      countMemoMerge(result,mergePrayerMemos(match.target,p,allocator));
    }else if(match.kind==='conflict'){
      conflicts.push({target:match.target,incoming:p});
    }else{
      p.memos=(Array.isArray(p.memos)?p.memos:[]).map(m=>({
        text:safeTrim(m&&m.text),
        date:excelDateToISO(m&&m.date), type:memoTypeFromExcel((m&&m.type)||'')
      })).filter(m=>m.text);
      assignFreshImportIds(p,allocator);
      workingPrayers.push(p);
      indexImportedPrayer(indexes,p);
      result.added++;
      result.memoAdded+=p.memos.length;
    }
  }

  const policy=await chooseConflictPolicy(conflicts.length);
  for(const item of conflicts){
    result.conflicted++;
    if(policy==='replace'){
      result.memoAdded+=replacePrayerRecord(item.target,item.incoming,allocator);
      result.merged++;
    }else if(policy==='keepBoth'){
      const p=cloneImportValue(item.incoming);
      assignFreshImportIds(p,allocator,{newUuid:true});
      workingPrayers.push(p);
      indexImportedPrayer(indexes,p);
      result.added++;
      result.memoAdded+=p.memos.length;
    }else{
      countMemoMerge(result,mergePrayerMemos(item.target,item.incoming,allocator));
    }
  }

  const finalPrayers=sortPrayersNewestFirst(workingPrayers.map(p=>normalizePrayerRecord(p)));
  const finalCategories=normalizeImportedCategories([...workingCategories,...data.categories],finalPrayers);
  const previousNextId=nextId;
  const previousNextMemoId=nextMemoId;
  AppState.prayers=finalPrayers;
  AppState.categories=finalCategories;
  nextId=allocator.peekPrayerId();
  nextMemoId=allocator.peekMemoId();
  if(!CategoryService.commit({refresh:false})){
    nextId=previousNextId;
    nextMemoId=previousNextMemoId;
    throw new Error('Imported data could not be saved.');
  }
  await scheduleBackupRender();
  return result;
}

// 백업 파일 읽기
async function loadBackupFile(e){
  const input=e&&e.target;
  if(isProcessingImport){ clearLargeFileRefs(input); return; }
  const file=input&&input.files?input.files[0]:null;
  if(!file){ clearLargeFileRefs(input); return; }
  if(await rejectInvalidFile(file, ['.json'], 'backupInvalid')){ clearLargeFileRefs(input); return; }
  let text='';
  try{
    setImportProcessing(true);
    text=await readFileAsText(file);
    const data=parseJsonBackupToAppState(text);
    await yieldToMainThread();
    const result=await applyJsonBackupToAppState(data);
    await showAlert(formatImportResult(result,popupT('backupImportLabel')));
  }catch(err){
    await showAlert(popupT('backupInvalid'));
  }finally{
    text='';
    setImportProcessing(false);
    clearLargeFileRefs(input);
  }
}


function bindBackupUIEvents(){
  const fileBindings=[
    ['backup-file-input', 'change', loadBackupFile],
    ['excel-file-input', 'change', loadExcelFile]
  ];
  const buttonBindings=[
    ['backup-export-btn', 'click', exportBackup],
    ['backup-json-import-btn', 'click', importBackup],
    ['backup-excel-template-btn', 'click', downloadExcelTemplate],
    ['backup-excel-import-btn', 'click', importExcelBackup]
  ];
  [...fileBindings, ...buttonBindings].forEach(([id,eventName,handler])=>{
    const element=document.getElementById(id);
    if(!element || element.dataset.backupEventBound==='1') return;
    element.dataset.backupEventBound='1';
    element.removeAttribute(eventName==='change'?'onchange':'onclick');
    element.addEventListener(eventName,handler);
  });
}

  bindBackupUIEvents();
})();
