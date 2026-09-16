// 02. PIN lock
// ============================================================
function persistLockEnabled(enabled){
  const nextValue=Boolean(enabled);
  const serialized=nextValue?'true':'false';
  try{
    localStorage.setItem('pj_lock',serialized);
    if(localStorage.getItem('pj_lock')!==serialized) throw new Error('Lock setting verification failed.');
    lockEnabled=nextValue;
    return true;
  }catch(error){
    notifyStorageWriteFailure('pj_lock',error);
    return false;
  }
}
function clearPinBuffer(){
  pinState.buffer='';
  updateDots();
}
function clearSensitivePinState(){
  pinState.buffer='';
  pinState.temporaryPin='';
  pinState.processing=false;
  updateDots();
}
function resetPinState({mode='unlock',origin='startup',returnFocusId=''}={}){
  pinState.buffer='';
  pinState.mode=mode;
  pinState.temporaryPin='';
  pinState.origin=origin;
  pinState.processing=false;
  pinState.returnFocusId=returnFocusId;
  updateDots();
  const err=document.getElementById('pin-err');
  if(err) err.textContent='';
}
function setPinMode(mode,{clearBuffer=true,clearTemporary=false}={}){
  pinState.mode=mode;
  if(clearBuffer) pinState.buffer='';
  if(clearTemporary) pinState.temporaryPin='';
  updateDots();
  applyPinLanguage();
}
function showPinScreen({backVisible=false}={}){
  const backButton=document.getElementById('lock-back-btn');
  setHidden(backButton,!backVisible);
  setBlockShown(backButton,backVisible);
  document.getElementById('lock')?.classList.remove('hidden');
  document.getElementById('topbar')?.classList.remove('visible');
  document.getElementById('bottom-nav')?.classList.remove('visible');
  setAppLockState();
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('visible'));
  applyPinLanguage();
  requestAnimationFrame(()=>document.getElementById('lock-sub')?.focus());
}
function hidePinScreen(){
  setHidden(document.getElementById('lock-back-btn'),true);
  document.getElementById('lock')?.classList.add('hidden');
}
function showMainAppShell({bottomNav=true}={}){
  hidePinScreen();
  document.getElementById('topbar')?.classList.add('visible');
  document.getElementById('bottom-nav')?.classList.toggle('visible',bottomNav);
}
function returnToSecuritySettings(){
  const focusId=pinState.returnFocusId || 'lock-toggle';
  clearSensitivePinState();
  showMainAppShell();
  showView('list',false);
  requestAnimationFrame(()=>{
    openSettings();
    requestAnimationFrame(()=>document.getElementById(focusId)?.focus());
  });
}
function showSplash(splash){
  splash?.classList.remove('hidden');
  splash?.classList.add('splash-center');
}
function hideSplash(splash){
  splash?.classList.add('hidden');
  splash?.classList.remove('splash-center');
}
function initLock(){
  try{ if(localStorage.getItem('pj_lock')==='false') lockEnabled=false; }catch(e){}
  const splash=document.getElementById('splash');
  if(!lockEnabled){
    document.getElementById('lock')?.classList.add('hidden');
    showSplash(splash);
    setTimeout(()=>{
      hideSplash(splash);
      document.getElementById('topbar')?.classList.add('visible');
      showView('list');
    },SPLASH_DURATION_MS);
    return;
  }
  hideSplash(splash);
  const credentialState=getPinCredentialState();
  if(credentialState.status==='invalid'){
    startPinSetup('startup');
    showPinError('pinCredentialInvalid');
  }else if(credentialState.status==='missing' && !getLegacyPin()){
    startPinSetup('startup');
  }else{
    resetPinState({mode:'unlock',origin:'startup'});
    showPinScreen({backVisible:false});
  }
}
function kp(d){
  if(pinState.processing || pinState.buffer.length>=4) return;
  pinState.buffer+=d;
  updateDots();
  const err=document.getElementById('pin-err');
  if(err) err.textContent='';
  if(pinState.buffer.length===4) setTimeout(()=>{ void handlePin(); },120);
}
function kpDel(){
  if(pinState.processing) return;
  pinState.buffer=pinState.buffer.slice(0,-1);
  updateDots();
}
function updateDots(){
  for(let i=0;i<4;i++) document.getElementById('d'+i)?.classList.toggle('on',i<pinState.buffer.length);
  const progress=document.getElementById('pin-progress');
  if(progress) progress.textContent=uiT('pinProgress',pinState.buffer.length,4);
}
async function handlePin(){
  if(pinState.processing || pinState.buffer.length!==4) return;
  pinState.processing=true;
  const entered=pinState.buffer;
  try{
    if(pinState.mode==='unlock'){
      if(await verifyPin(entered)) unlockApp();
      else showPinError('pinWrong');
    }else if(pinState.mode==='setup1'){
      pinState.temporaryPin=entered;
      setPinMode('setup2');
    }else if(pinState.mode==='setup2'){
      if(entered===pinState.temporaryPin){
        await savePinCredential(entered);
        await completePinSetup();
      }else{
        setPinMode('setup1',{clearTemporary:true});
        showPinError('pinMismatch');
      }
    }else if(pinState.mode==='change1'){
      if(await verifyPin(entered)){
        setPinMode('change2',{clearTemporary:true});
      }else showPinError('pinCurrentWrong');
    }else if(pinState.mode==='change2'){
      pinState.temporaryPin=entered;
      setPinMode('change3');
    }else if(pinState.mode==='change3'){
      if(entered===pinState.temporaryPin){
        await savePinCredential(entered);
        returnToSecuritySettings();
      }else{
        setPinMode('change2',{clearTemporary:true});
        showPinError('pinMismatch');
      }
    }
  }catch(error){
    console.error('PIN operation failed:',error);
    showPinError('pinStorageError');
  }finally{
    pinState.processing=false;
  }
}
function showPinError(key){
  const err=document.getElementById('pin-err');
  if(err) err.textContent=uiT(key);
  clearPinBuffer();
}
async function completePinSetup(){
  if(!persistLockEnabled(true)){
    showPinError('pinStorageError');
    return;
  }
  if(pinState.origin==='settings-enable'){
    returnToSecuritySettings();
    return;
  }
  unlockApp();
}
function unlockApp(){
  clearSensitivePinState();
  showMainAppShell();
  showView('list');
}
function cancelPinChange(){
  const shouldDisableLock=pinState.origin==='settings-enable';
  if(shouldDisableLock) persistLockEnabled(false);
  returnToSecuritySettings();
}
function startPinSetup(origin='startup'){
  resetPinState({
    mode:'setup1',
    origin,
    returnFocusId:origin==='settings-enable'?'lock-toggle':''
  });
  showPinScreen({backVisible:origin==='settings-enable'});
}
function startPinChange(){
  if(!hasPinCredential()){
    startPinSetup('settings-enable');
    return;
  }
  resetPinState({
    mode:'change1',
    origin:'settings-change',
    returnFocusId:'change-pin-item'
  });
  showPinScreen({backVisible:true});
}


// ============================================================
