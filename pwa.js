// 12. Android back button / PWA helpers
// ============================================================
let lastAndroidBackTime=0;
let toastTimer=null;
let appBackHistoryReady=false;
let appBackHandlingPop=false;

function currentVisibleView(){
  const found=['list','archive','new','detail','cat','backup'].find(v=>document.getElementById('view-'+v)?.classList.contains('visible'));
  return found || 'list';
}
function showToast(message){
  const toast=document.getElementById('app-toast');
  if(!toast) return;
  toast.textContent=message;
  toast.classList.remove('toast-hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.add('toast-hidden'),2000);
}
function toastText(key){
  const lang=Language.get();
  const dict={
    ko:{exit:'한 번 더 누르면 종료됩니다.'},
    en:{exit:'Press back again to exit.'}
  };
  return (dict[lang]&&dict[lang][key])||dict.ko[key]||key;
}
function closeTopLayerIfOpen(){
  const modal=document.getElementById('custom-modal');
  if(modal && !modal.classList.contains('hidden')){
    closeCustomModal();
    return true;
  }
  const settings=document.getElementById('settings-overlay');
  if(settings && settings.classList.contains('open')){
    settings.classList.remove('open');
    return true;
  }
  return false;
}
function pushAppHistory(view){
  if(appBackHandlingPop) return;
  try{
    const v=view||currentVisibleView();
    const base=location.pathname+location.search;
    history.pushState({app:true,view:v},'',base+'#'+v);
  }catch(e){}
}
function replaceAppHistory(view){
  try{
    const v=view||currentVisibleView();
    const base=location.pathname+location.search;
    history.replaceState({app:true,view:v},'',base+'#'+v);
  }catch(e){}
}
function handleAndroidBack(){
  if(closeTopLayerIfOpen()) return;

  const cur=currentVisibleView();

  if(cur==='new'){
    showView('list',false);
    return;
  }
  if(cur==='detail'){
    returnFromDetail();
    return;
  }
  if(cur==='cat' || cur==='backup'){
    showView('list',false);
    setTimeout(()=>openSettings(),80);
    return;
  }
  if(cur==='archive'){
    showView('list',false);
    return;
  }

  const now=Date.now();
  if(now-lastAndroidBackTime<2000){
    try{ history.go(-2); }catch(e){}
  }else{
    lastAndroidBackTime=now;
    showToast(toastText('exit'));
  }
}
function initAndroidBackButton(){
  if(appBackHistoryReady) return;
  appBackHistoryReady=true;
  try{
    replaceAppHistory('list');
    pushAppHistory('list');
    window.addEventListener('popstate',function(){
      appBackHandlingPop=true;
      handleAndroidBack();
      setTimeout(()=>{
        appBackHandlingPop=false;
        pushAppHistory(currentVisibleView());
      },0);
    });
  }catch(e){}
}





// ============================================================
