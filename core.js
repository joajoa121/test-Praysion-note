
// ============================================================
// JS MODULE MAP (Module-1: logical organization before file split)
// 01. Constants, storage, CategoryService, AppState
// 02. PIN lock
// 03. Language, popup, settings sheet
// 04. UI visibility helpers and page routing
// 05. Prayer list
// 06. Archive / answered prayers
// 07. New prayer form
// 08. Detail, edit, memo
// 09. Category management
// 10. Backup / import / Excel
// 11. TopBar scroll behavior
// 12. Android back button / PWA helpers
// 13. Exposed handlers and bootstrap
// ============================================================

// ============================================================
// 01. Constants, storage, CategoryService, AppState
// ============================================================
// ── 앱 기본 텍스트 ──
const APP_KO_NAME='이룸기도';
const APP_EN_NAME='Praysion Note';
const SPLASH_DURATION_MS=3000;

// ── 데이터 ──
const SESSION_DATA_KEYS=['pj_prayers','pj_cats','pj_lang'];
let lastStorageFailureNotice=0;

const Language={
  normalize(value){ return value==='en'?'en':'ko'; },
  get(){
    try{
      const raw=localStorage.getItem('pj_lang');
      if(raw===null) return 'ko';
      // 이전 버전에서 JSON 문자열로 저장된 값도 한 번만 호환합니다.
      try{ return this.normalize(JSON.parse(raw)); }
      catch(error){ return this.normalize(raw); }
    }catch(error){ return 'ko'; }
  },
  set(value){
    const lang=this.normalize(value);
    try{
      localStorage.setItem('pj_lang',lang);
      return lang;
    }catch(error){
      notifyStorageWriteFailure('pj_lang',error);
      return this.get();
    }
  }
};
function storageFailureText(){
  const lang=Language.get();
  return lang==='en'
    ? 'Your changes could not be saved. Please free up storage space and try again.'
    : '변경사항을 저장하지 못했습니다. 저장 공간을 확보한 뒤 다시 시도해 주세요.';
}
function notifyStorageWriteFailure(key,error){
  console.error(`Could not save ${key}:`,error);
  const now=Date.now();
  if(now-lastStorageFailureNotice<2500) return;
  lastStorageFailureNotice=now;
  const notify=()=>{
    const message=storageFailureText();
    if(document.getElementById('app-toast')) showToast(message);
    else window.alert(message);
  };
  if(document.readyState==='loading') window.addEventListener('DOMContentLoaded',notify,{once:true});
  else notify();
}
function cleanupLegacySessionStorage(){
  for(const key of SESSION_DATA_KEYS){
    try{
      const localValue=localStorage.getItem(key);
      const sessionValue=sessionStorage.getItem(key);
      if(localValue===null && sessionValue!==null){
        localStorage.setItem(key,sessionValue);
        if(localStorage.getItem(key)!==sessionValue) throw new Error('Storage verification failed.');
      }
      if(sessionValue!==null) sessionStorage.removeItem(key);
    }catch(error){
      console.error(`Could not migrate ${key} from sessionStorage:`,error);
    }
  }
}
cleanupLegacySessionStorage();

// 이전 테스트용 샘플 제목 삭제 마이그레이션은 완료되어 코드에서 제거했습니다.

const DEFAULT_CATS=['category1','category2','category3','category4'];
const DEFAULT_PRAYERS=[];

function corruptDataNoticeText(){
  const lang=Language.get();
  return lang==='en'
    ? 'Some saved data could not be read. The original value was preserved for recovery.'
    : '저장된 데이터 일부를 읽지 못했습니다. 원본은 복구용으로 보관했습니다.';
}
const MAX_CORRUPT_BACKUPS_PER_KEY=3;
function pruneCorruptBackups(key){
  const prefix=`${key}_corrupt_`;
  try{
    const matches=[];
    for(let i=0;i<localStorage.length;i++){
      const storageKey=localStorage.key(i);
      if(storageKey&&storageKey.startsWith(prefix)) matches.push(storageKey);
    }
    matches.sort((a,b)=>b.localeCompare(a));
    for(const oldKey of matches.slice(MAX_CORRUPT_BACKUPS_PER_KEY)) localStorage.removeItem(oldKey);
  }catch(error){
    console.warn(`Could not prune corrupt backups for ${key}:`,error);
  }
}
function quarantineCorruptStorage(key,raw,error){
  console.error(`Could not load ${key}:`,error);
  const backupKey=`${key}_corrupt_${Date.now()}`;
  try{
    localStorage.setItem(backupKey,raw);
    if(localStorage.getItem(backupKey)!==raw) throw new Error('Corrupt data backup verification failed.');
    localStorage.removeItem(key);
    pruneCorruptBackups(key);
  }catch(backupError){
    console.error(`Could not preserve corrupt ${key}:`,backupError);
    return false;
  }
  const notify=()=>{
    const message=corruptDataNoticeText();
    if(document.getElementById('app-toast')) showToast(message);
    else window.alert(message);
  };
  if(document.readyState==='loading') window.addEventListener('DOMContentLoaded',notify,{once:true});
  else notify();
  return true;
}
function loadStorage(key){
  let value=null;
  try{
    value=localStorage.getItem(key);
    return value===null ? null : JSON.parse(value);
  }catch(error){
    if(value!==null) quarantineCorruptStorage(key,value,error);
    else console.error(`Could not load ${key}:`,error);
    return null;
  }
}
function serializeAppData(val){
  // 구조화된 JSON으로 저장해 줄바꿈·특수문자·이모지 등 유니코드 문자열을 보존한다.
  return JSON.stringify(val);
}
function writeSerializedStorage(key,serialized,{notify=true}={}){
  try{
    localStorage.setItem(key,serialized);
    if(localStorage.getItem(key)!==serialized) throw new Error('Storage verification failed.');
    return true;
  }catch(error){
    if(notify) notifyStorageWriteFailure(key,error);
    else console.error(`Could not save ${key}:`,error);
    return false;
  }
}
function restoreStorageValue(key,previousValue){
  try{
    if(previousValue===null) localStorage.removeItem(key);
    else localStorage.setItem(key,previousValue);
    return localStorage.getItem(key)===previousValue;
  }catch(error){
    console.error(`Could not roll back ${key}:`,error);
    return false;
  }
}
function saveStorage(key,val){
  return writeSerializedStorage(key,serializeAppData(val));
}
const PIN_CREDENTIAL_KEY='pj_pin_credential';
const LEGACY_PIN_HASH_KEY='pj_pin_hash';
const LEGACY_PIN_SALT_KEY='pj_pin_salt';
const LEGACY_PIN_KEY='pp';
const PIN_CREDENTIAL_VERSION=1;
const PIN_ALGORITHM='PBKDF2-SHA256';
const PIN_ITERATIONS=120000;
const PIN_MIN_ITERATIONS=100000;
const PIN_MAX_ITERATIONS=1000000;
const PIN_SALT_HEX_LENGTH=32;
const PIN_HASH_HEX_LENGTH=64;

function getLegacyPin(){
  try{ const v=localStorage.getItem(LEGACY_PIN_KEY); if(v) return v; }catch(e){}
  try{ const v=sessionStorage.getItem(LEGACY_PIN_KEY); if(v) return v; }catch(e){}
  try{ const m=document.cookie.match(/(?:^|; )pp=([^;]*)/); if(m) return decodeURIComponent(m[1]); }catch(e){}
  return '';
}
function clearLegacyPin(){
  try{ localStorage.removeItem(LEGACY_PIN_KEY); }catch(e){}
  try{ sessionStorage.removeItem(LEGACY_PIN_KEY); }catch(e){}
  try{ document.cookie='pp=;path=/;max-age=0;SameSite=Strict'; }catch(e){}
}
function isHexOfLength(value,length){
  return typeof value==='string' && value.length===length && /^[0-9a-f]+$/i.test(value);
}
function isValidPinCredential(value){
  return Boolean(
    value &&
    value.version===PIN_CREDENTIAL_VERSION &&
    value.algorithm===PIN_ALGORITHM &&
    Number.isInteger(value.iterations) &&
    value.iterations>=PIN_MIN_ITERATIONS &&
    value.iterations<=PIN_MAX_ITERATIONS &&
    isHexOfLength(value.salt,PIN_SALT_HEX_LENGTH) &&
    isHexOfLength(value.hash,PIN_HASH_HEX_LENGTH)
  );
}
function storePinCredential(credential){
  localStorage.setItem(PIN_CREDENTIAL_KEY,JSON.stringify(credential));
  localStorage.removeItem(LEGACY_PIN_HASH_KEY);
  localStorage.removeItem(LEGACY_PIN_SALT_KEY);
}
function getPinCredentialState(){
  try{
    const raw=localStorage.getItem(PIN_CREDENTIAL_KEY);
    if(raw!==null){
      try{
        const credential=JSON.parse(raw);
        return isValidPinCredential(credential)
          ? {status:'valid',credential}
          : {status:'invalid',credential:null};
      }catch(error){
        return {status:'invalid',credential:null};
      }
    }

    const hash=localStorage.getItem(LEGACY_PIN_HASH_KEY)||'';
    const salt=localStorage.getItem(LEGACY_PIN_SALT_KEY)||'';
    if(hash || salt){
      const credential={
        version:PIN_CREDENTIAL_VERSION,
        algorithm:PIN_ALGORITHM,
        iterations:PIN_ITERATIONS,
        salt,
        hash
      };
      if(!isValidPinCredential(credential)) return {status:'invalid',credential:null};
      storePinCredential(credential);
      clearLegacyPin();
      return {status:'valid',credential};
    }
  }catch(error){
    console.error('Could not read PIN credential:',error);
    return {status:'invalid',credential:null};
  }
  return {status:'missing',credential:null};
}
function getPinCredential(){
  const result=getPinCredentialState();
  return result.status==='valid' ? result.credential : null;
}
function hasPinCredential(){
  return getPinCredentialState().status==='valid' || Boolean(getLegacyPin());
}
function bytesToHex(bytes){
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function createPinSalt(){
  const webCrypto=globalThis.crypto;
  if(!webCrypto?.getRandomValues) throw new Error('Web Crypto API is unavailable.');
  const bytes=new Uint8Array(16);
  webCrypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}
async function hashPin(pin,salt,iterations=PIN_ITERATIONS){
  const webCrypto=globalThis.crypto;
  if(!webCrypto?.subtle) throw new Error('Web Crypto API is unavailable.');
  const material=await webCrypto.subtle.importKey(
    'raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']
  );
  const bits=await webCrypto.subtle.deriveBits({
    name:'PBKDF2',
    hash:'SHA-256',
    salt:new TextEncoder().encode(salt),
    iterations
  },material,256);
  return bytesToHex(new Uint8Array(bits));
}
async function savePinCredential(pin){
  const salt=createPinSalt();
  const credential={
    version:PIN_CREDENTIAL_VERSION,
    algorithm:PIN_ALGORITHM,
    iterations:PIN_ITERATIONS,
    salt,
    hash:await hashPin(pin,salt,PIN_ITERATIONS)
  };
  storePinCredential(credential);
  clearLegacyPin();
}
async function verifyPin(pin){
  const credential=getPinCredential();
  if(credential){
    return (await hashPin(pin,credential.salt,credential.iterations))===credential.hash;
  }
  const legacy=getLegacyPin();
  if(!legacy || pin!==legacy) return false;
  await savePinCredential(pin);
  return true;
}


// ── 카테고리 규칙 모듈 ──
// 기본 카테고리는 내부 ID로 저장하고, 화면 표시만 언어별로 바꿉니다.
// 사용자 추가 카테고리는 번역하지 않습니다.
// 표시 순서: 분류 1/분류 2/분류 3/분류 4 → 사용자 추가 카테고리 → 미분류
const CategoryService=(()=>{
  const DEFAULT_IDS=['category1','category2','category3','category4'];
  const ALL='전체';
  const UNCATEGORIZED='미분류';
  const LABELS={
    ko:{category1:'분류 1',category2:'분류 2',category3:'분류 3',category4:'분류 4',[UNCATEGORIZED]:'미분류',[ALL]:'전체'},
    en:{category1:'Category 1',category2:'Category 2',category3:'Category 3',category4:'Category 4',[UNCATEGORIZED]:'Uncategorized',[ALL]:'All'}
  };
  const LEGACY={
    '분류1':'category1','분류 1':'category1','Category1':'category1','Category 1':'category1',
    '분류2':'category2','분류 2':'category2','Category2':'category2','Category 2':'category2',
    '분류3':'category3','분류 3':'category3','Category3':'category3','Category 3':'category3',
    '분류4':'category4','분류 4':'category4','Category4':'category4','Category 4':'category4',
    [UNCATEGORIZED]:UNCATEGORIZED,'Uncategorized':UNCATEGORIZED
  };
  function normalize(cat){
    const raw=String(cat||'').trim();
    return LEGACY[raw] || raw;
  }
  function isDefault(cat){
    return DEFAULT_IDS.includes(normalize(cat));
  }
  function isAll(cat){
    return normalize(cat)===ALL;
  }
  function isUncategorized(cat){
    return normalize(cat)===UNCATEGORIZED;
  }
  function label(cat){
    const lang=Language.get();
    const key=normalize(cat);
    return (LABELS[lang]&&LABELS[lang][key]) || key;
  }
  function normalizeArray(arr,opts){
    opts=opts||{};
    const includeDefaults=opts.includeDefaults===true;
    const src=Array.isArray(arr)?arr:[];
    const out=[];
    src.forEach(c=>{
      const n=normalize(c);
      if(n && n!==UNCATEGORIZED && !out.includes(n)) out.push(n);
    });
    if(includeDefaults){
      DEFAULT_IDS.forEach(id=>{ if(!out.includes(id)) out.push(id); });
    }
    const hasUncat=src.some(c=>isUncategorized(c));
    return hasUncat?[...out,UNCATEGORIZED]:out;
  }
  function sort(arr){
    const src=Array.isArray(arr)?arr:[];
    const normalized=[];
    src.forEach(c=>{
      const n=normalize(c);
      if(n&&!normalized.includes(n)) normalized.push(n);
    });
    const out=[];
    DEFAULT_IDS.forEach(id=>{
      if(normalized.includes(id)) out.push(id);
    });
    normalized.forEach(c=>{
      if(!DEFAULT_IDS.includes(c)&&c!==UNCATEGORIZED&&!out.includes(c)) out.push(c);
    });
    if(normalized.includes(UNCATEGORIZED)) out.push(UNCATEGORIZED);
    return out;
  }
  function ensureCategory(list,cat){
    const arr=normalizeArray(list);
    const n=normalize(cat);
    if(n&&!arr.includes(n)){
      if(n===UNCATEGORIZED) arr.push(n);
      else arr.splice(arr.includes(UNCATEGORIZED)?arr.length-1:arr.length,0,n);
    }
    return sort(arr);
  }
  function findIndex(cat){
    const target=normalize(cat);
    return AppState.categories.findIndex(c=>normalize(c)===target);
  }
  function add(name){
    const n=normalize(name);
    if(!n) return null;
    const current=normalizeArray(AppState.categories);
    if(current.includes(n)) return null;
    AppState.categories=ensureCategory(current,n);
    return n;
  }
  function rename(fromCat,toCat){
    const from=normalize(fromCat);
    const to=normalize(toCat);
    if(!from||!to||isUncategorized(from)) return null;

    const currentIndex=findIndex(from);
    if(currentIndex===-1) return null;

    const duplicateIndex=findIndex(to);
    if(duplicateIndex!==-1&&duplicateIndex!==currentIndex) return null;

    AppState.categories[currentIndex]=to;
    AppState.prayers.forEach(p=>{
      if(normalize(p.cat)===from) p.cat=to;
    });
    return to;
  }
  function remove(cat,fallbackCat=UNCATEGORIZED){
    const target=normalize(cat);
    const fallback=normalize(fallbackCat)||UNCATEGORIZED;
    if(!target||isUncategorized(target)) return null;

    const currentIndex=findIndex(target);
    if(currentIndex===-1) return null;

    let reassigned=0;
    AppState.prayers.forEach(p=>{
      if(normalize(p.cat)===target){
        p.cat=fallback;
        reassigned++;
      }
    });
    AppState.categories.splice(currentIndex,1);
    return reassigned;
  }
  function move(fromIndex,toIndex){
    if(!Number.isInteger(fromIndex)||!Number.isInteger(toIndex)) return false;
    if(fromIndex<0||toIndex<0||fromIndex>=AppState.categories.length||toIndex>=AppState.categories.length) return false;
    if(fromIndex===toIndex) return false;
    if(isUncategorized(AppState.categories[fromIndex])) return false;

    const start=Math.min(fromIndex,toIndex);
    const end=Math.max(fromIndex,toIndex);
    if(AppState.categories.slice(start,end+1).some(isUncategorized)) return false;

    const [moved]=AppState.categories.splice(fromIndex,1);
    AppState.categories.splice(toIndex,0,moved);
    return true;
  }
  function replace(categories){
    AppState.categories=normalizeArray(categories);
    return AppState.categories;
  }
  function normalizeState(){
    const categories=normalizeArray(AppState.categories);
    const hasUncategorizedPrayer=AppState.prayers.some(p=>isUncategorized(p.cat));
    const withoutUncategorized=categories.filter(c=>!isUncategorized(c));
    AppState.categories=hasUncategorizedPrayer
      ?[...withoutUncategorized,UNCATEGORIZED]
      :withoutUncategorized;
    AppState.prayers.forEach(p=>{ p.cat=normalize(p.cat); });
    return AppState.categories;
  }
  function commit({adjustTab=false,refresh=true}={}){
    normalizeState();
    if(adjustTab&&typeof tabs==='function'&&curTabIdx>=tabs().length){
      curTabIdx=0;
    }
    const saved=saveData();
    if(refresh&&typeof refreshCategoryUI==='function') refreshCategoryUI();
    return saved;
  }
  return {
    DEFAULT_IDS,ALL,UNCATEGORIZED,
    normalize,isDefault,isAll,isUncategorized,label,
    normalizeArray,sort,ensureCategory,
    add,rename,remove,move,replace,normalizeState,commit
  };
})();

let categories = CategoryService.normalizeArray(loadStorage('pj_cats') || DEFAULT_CATS);
let prayers = loadStorage('pj_prayers') || DEFAULT_PRAYERS;

// ── 기존 저장 데이터 안전 보정 ──
function _safeToday(){ return nowAppDateTime(); }
if(!Array.isArray(prayers)) prayers=[];

prayers = prayers.map((p,idx)=>({
  id: Number.isFinite(Number(p?.id)) ? Number(p.id) : idx+1,
  cat: CategoryService.normalize(p?.cat || categories[0] || 'category1'),
  title: p?.title || '',
  body: p?.body || '',
  archived: !!p?.archived,
  memos: Array.isArray(p?.memos) ? p.memos.map((m,mi)=>({
    id: Number.isFinite(Number(m?.id)) ? Number(m.id) : (idx+1)*1000+mi,
    date: m?.date || _safeToday(),
    text: m?.text || '',
    type: m?.type || 'record'
  })) : [],
  createdAt: p?.createdAt || _safeToday()
}));

prayers.forEach(p=>{
  if(p.cat && !categories.includes(p.cat)) categories.push(p.cat);
});
categories = CategoryService.normalizeArray(categories);

let nextId = Math.max(9,...prayers.map(p=>Number(p.id)||0))+1;
let nextMemoId = Math.max(199,...prayers.flatMap(p=>(Array.isArray(p.memos)?p.memos:[]).map(m=>Number(m.id)||0)))+1;
let curTabIdx=0, curPrayerId=null, searchQuery='', newSelectedCat='';
const pinState={
  buffer:'',
  mode:'unlock',
  temporaryPin:'',
  origin:'startup',
  processing:false,
  returnFocusId:''
};
let lockEnabled=true;
try{sessionStorage.removeItem('pj_lock');}catch(e){}
let viewHistory=[];

// RC7N18: AppState compatibility layer
// 기존 전역 변수와 AppState.xxx를 연결하는 상태 접근 레이어.
// RC7N19: 주요 상태 접근을 AppState.xxx로 점진 전환.
const AppState = {
  get prayers(){ return prayers; },
  set prayers(value){ prayers = Array.isArray(value) ? value : []; },

  get categories(){ return categories; },
  set categories(value){ categories = CategoryService.normalizeArray(value || []); },

  get viewHistory(){ return viewHistory; },
  set viewHistory(value){ viewHistory = Array.isArray(value) ? value : []; },

  get curTabIdx(){ return curTabIdx; },
  set curTabIdx(value){ curTabIdx = Number(value) || 0; },

  get curPrayerId(){ return curPrayerId; },
  set curPrayerId(value){ curPrayerId = value; },

  get searchQuery(){ return searchQuery; },
  set searchQuery(value){ searchQuery = value || ''; },

  get newSelectedCat(){ return newSelectedCat; },
  set newSelectedCat(value){ newSelectedCat = value || ''; }
};


function pad2(value){ return String(value).padStart(2,'0'); }
function localDateOnly(date=new Date()){
  return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
}
function today(){ return localDateOnly(); }
function nowAppDateTime(){
  const d=new Date();
  return `${localDateOnly(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

// Local date-time helpers. Values intentionally carry no timezone offset so
// an entered wall-clock time remains unchanged on import and display.
function parseAppDateTime(v, options={}){
  const { fallbackNow=true, clampFuture=true } = options;
  const fallback=fallbackNow?nowAppDateTime():'';
  const nowValue=nowAppDateTime();

  function build(y,m,d,h=0,min=0,sec=0){
    const nums=[y,m,d,h,min,sec].map(Number);
    if(nums.some(n=>!Number.isFinite(n))) return fallback;
    const [yy,mm,dd,hh,mi,ss]=nums;
    const test=new Date(yy,mm-1,dd,hh,mi,ss,0);
    if(test.getFullYear()!==yy || test.getMonth()!==mm-1 || test.getDate()!==dd ||
       test.getHours()!==hh || test.getMinutes()!==mi || test.getSeconds()!==ss) return fallback;
    const value=`${String(yy).padStart(4,'0')}-${pad2(mm)}-${pad2(dd)}T${pad2(hh)}:${pad2(mi)}:${pad2(ss)}`;
    return clampFuture && value>nowValue ? nowValue : value;
  }

  if(v===undefined || v===null || String(v).trim()==='') return fallback;

  if(typeof v==='number' && window.XLSX && XLSX.SSF){
    const d=XLSX.SSF.parse_date_code(v);
    if(d) return build(d.y,d.m,d.d,d.H||0,d.M||0,Math.floor(d.S||0));
  }

  if(v instanceof Date && !isNaN(v)){
    return build(v.getFullYear(),v.getMonth()+1,v.getDate(),v.getHours(),v.getMinutes(),v.getSeconds());
  }

  const s=String(v).trim().replace(/\./g,'-').replace(/\//g,'-');
  const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
  if(!m) return fallback;
  return build(m[1],m[2],m[3],m[4]||0,m[5]||0,m[6]||0);
}

function formatAppDateTime(v){
  const value=parseAppDateTime(v,{fallbackNow:false,clampFuture:false});
  return value ? `${value.slice(0,10)} ${value.slice(11,16)}` : '';
}

function appDateValue(v){
  const value=parseAppDateTime(v,{fallbackNow:false,clampFuture:false});
  if(!value) return 0;
  const m=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if(!m) return 0;
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6])).getTime();
}

// ============================================================
// Input validation / sanitization helpers
// ============================================================
function stripInvisibleChars(value){
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'');
}
function normalizeSingleLine(value){
  return stripInvisibleChars(value)
    .replace(/[\r\n\t]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function normalizeMultiLine(value){
  return stripInvisibleChars(value)
    .replace(/\r\n?/g,'\n')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{4,}/g,'\n\n\n')
    .trim();
}
function isMeaninglessSymbolsOnly(value){
  const s=normalizeSingleLine(value);
  if(!s) return true;
  // 문자/숫자/한글/이모지가 하나도 없고, 기호와 공백뿐이면 의미 없는 입력으로 봅니다.
  return !/[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ\p{L}\p{N}\p{Extended_Pictographic}]/u.test(s);
}
function validatePrayerTitle(raw){
  const value=normalizeSingleLine(raw);
  if(!value) return {ok:false,value:'',message:uiT('prayerTitleRequired')};
  if(value.length>80) return {ok:false,value,message:uiT('prayerTitleTooLong')};
  if(isMeaninglessSymbolsOnly(value)) return {ok:false,value,message:uiT('meaningfulPrayerTitle')};
  return {ok:true,value,message:''};
}
function validateCategoryName(raw){
  const value=normalizeSingleLine(raw);
  if(!value) return {ok:false,value:'',message:popupT('catEmpty')};
  if(value.length>20) return {ok:false,value,message:uiT('categoryTooLong')};
  if(isMeaninglessSymbolsOnly(value)) return {ok:false,value,message:uiT('meaningfulCategoryName')};
  return {ok:true,value,message:''};
}
function sanitizePrayerBody(raw){
  const value=normalizeMultiLine(raw);
  if(value.length>20000) return value.slice(0,20000).trim();
  return value;
}
function tabs(){
  const categories=CategoryService.normalizeArray(AppState.categories);
  const hasUncat=AppState.prayers.some(p=>CategoryService.isUncategorized(p.cat));
  const base=categories.filter(c=>c!==CategoryService.UNCATEGORIZED);
  return [CategoryService.ALL,...(hasUncat?[...base,CategoryService.UNCATEGORIZED]:base)];
}
function restoreAppStateFromSerialized(catsSerialized,prayersSerialized){
  try{
    const restoredCats=catsSerialized===null?[]:JSON.parse(catsSerialized);
    const restoredPrayers=prayersSerialized===null?[]:JSON.parse(prayersSerialized);
    AppState.categories=CategoryService.normalizeArray(Array.isArray(restoredCats)?restoredCats:[]);
    AppState.prayers=sortPrayersNewestFirst(Array.isArray(restoredPrayers)?restoredPrayers:[]);
    AppState.prayers.forEach(p=>{ p.cat=CategoryService.normalize(p.cat); });
    return true;
  }catch(error){
    console.error('Could not restore in-memory app data:',error);
    return false;
  }
}
function saveData(){
  AppState.categories = CategoryService.normalizeArray(AppState.categories);
  AppState.prayers.forEach(p=>{ p.cat=CategoryService.normalize(p.cat); });
  AppState.prayers = sortPrayersNewestFirst(AppState.prayers);

  const catsKey='pj_cats';
  const prayersKey='pj_prayers';
  let previousCats=null;
  let previousPrayers=null;
  try{
    previousCats=localStorage.getItem(catsKey);
    previousPrayers=localStorage.getItem(prayersKey);
  }catch(error){
    notifyStorageWriteFailure('app-data-read',error);
    return false;
  }

  const rollback=()=>{
    const catsRestored=restoreStorageValue(catsKey,previousCats);
    const prayersRestored=restoreStorageValue(prayersKey,previousPrayers);
    const memoryRestored=restoreAppStateFromSerialized(previousCats,previousPrayers);
    if(!catsRestored || !prayersRestored || !memoryRestored){
      console.error('App data rollback was incomplete.');
    }
    return false;
  };

  const catsSerialized=serializeAppData(AppState.categories);
  const prayersSerialized=serializeAppData(AppState.prayers);
  if(!writeSerializedStorage(catsKey,catsSerialized)) return rollback();
  if(writeSerializedStorage(prayersKey,prayersSerialized)) return true;
  return rollback();
}

// ── PIN ──

// ============================================================

// DOM 반영 이후 실행이 필요한 작업을 한 경로로 예약합니다.
function afterNextPaint(callback){
  if(typeof callback!=='function') return 0;
  if(typeof requestAnimationFrame==='function') return requestAnimationFrame(()=>callback());
  return setTimeout(callback,0);
}

