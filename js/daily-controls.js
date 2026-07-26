/* Günlük kontrol verileri ve fotoğraflar */
const DAILY_CHECK_KEY="etilismart_daily_facility_checks_v1";

function dailyAsset(id,factory,type,index,team){
  const suffix=index?` ${index}`:"";
  const labels={
    compressor:"Kompresör",
    transformer:"Trafo",
    generator:"Jeneratör",
    ups:"UPS",
    compensation:"Kompanzasyon Panosu",
    breakerRoom:"Kesici Odası",
    breakerPanel:"Kesici Panosu",
    gas:"Gaz İstasyonu",
    water:"Su Deposu"
  };
  const contractorMonthly=["transformer","breakerRoom","breakerPanel"].includes(type);
  return {
    id,
    factory,
    type,
    name:`${labels[type]}${suffix}`,
    team,
    special:type==="water"||type==="gas",
    contractorMonthly
  };
}

const DAILY_CONTROL_ASSETS=[
  dailyAsset("F1-KOMP-1","1. Fabrika","compressor",1,"Mekanik Bakım"),
  ...Array.from({length:3},(_,i)=>dailyAsset(`F1-TR-${i+1}`,"1. Fabrika","transformer",i+1,"Taşeron")),
  dailyAsset("F1-JEN-1","1. Fabrika","generator",1,"Elektrik Bakım"),
  ...Array.from({length:2},(_,i)=>dailyAsset(`F1-UPS-${i+1}`,"1. Fabrika","ups",i+1,"Elektrik Bakım")),
  ...Array.from({length:3},(_,i)=>dailyAsset(`F1-KOMPZ-${i+1}`,"1. Fabrika","compensation",i+1,"Elektrik Bakım")),
  ...Array.from({length:3},(_,i)=>dailyAsset(`F1-KES-${i+1}`,"1. Fabrika","breakerRoom",i+1,"Taşeron")),
  dailyAsset("F1-GAZ-1","1. Fabrika","gas",1,"Mekanik Bakım"),
  dailyAsset("F1-SU-1","1. Fabrika","water",1,"Mekanik Bakım"),

  ...Array.from({length:5},(_,i)=>dailyAsset(`F2-TR-${i+1}`,"2. Fabrika","transformer",i+1,"Taşeron")),
  ...Array.from({length:5},(_,i)=>dailyAsset(`F2-KES-${i+1}`,"2. Fabrika","breakerPanel",i+1,"Taşeron")),
  ...Array.from({length:2},(_,i)=>dailyAsset(`F2-KOMP-${i+1}`,"2. Fabrika","compressor",i+1,"Mekanik Bakım")),
  ...Array.from({length:2},(_,i)=>dailyAsset(`F2-JEN-${i+1}`,"2. Fabrika","generator",i+1,"Elektrik Bakım")),
  ...Array.from({length:4},(_,i)=>dailyAsset(`F2-UPS-${i+1}`,"2. Fabrika","ups",i+1,"Elektrik Bakım")),
  ...Array.from({length:6},(_,i)=>dailyAsset(`F2-KOMPZ-${i+1}`,"2. Fabrika","compensation",i+1,"Elektrik Bakım")),
  dailyAsset("F2-SU-1","2. Fabrika","water",1,"Mekanik Bakım"),
  dailyAsset("F2-GAZ-1","2. Fabrika","gas",1,"Mekanik Bakım")
];

const DAILY_CONTROL_CUSTOM_CATALOG_KEY="etilismart_custom_daily_controls_v1";
const DAILY_CONTROL_DELETED_CATALOG_KEY="etilismart_deleted_daily_controls_v1";
let CUSTOM_DAILY_CONTROL_ASSETS=[];
let DELETED_DAILY_CONTROL_ASSETS=[];
try{CUSTOM_DAILY_CONTROL_ASSETS=JSON.parse(localStorage.getItem(DAILY_CONTROL_CUSTOM_CATALOG_KEY)||"[]")||[]}catch(e){CUSTOM_DAILY_CONTROL_ASSETS=[]}
try{DELETED_DAILY_CONTROL_ASSETS=JSON.parse(localStorage.getItem(DAILY_CONTROL_DELETED_CATALOG_KEY)||"[]")||[]}catch(e){DELETED_DAILY_CONTROL_ASSETS=[]}
CUSTOM_DAILY_CONTROL_ASSETS.forEach(asset=>{
  if(asset?.id&&!DAILY_CONTROL_ASSETS.some(item=>item.id===asset.id))DAILY_CONTROL_ASSETS.push(asset);
});
for(let index=DAILY_CONTROL_ASSETS.length-1;index>=0;index--){
  if(DELETED_DAILY_CONTROL_ASSETS.includes(DAILY_CONTROL_ASSETS[index].id))DAILY_CONTROL_ASSETS.splice(index,1);
}
function saveDailyControlCatalog(){
  localStorage.setItem(DAILY_CONTROL_CUSTOM_CATALOG_KEY,JSON.stringify(CUSTOM_DAILY_CONTROL_ASSETS));
  localStorage.setItem(DAILY_CONTROL_DELETED_CATALOG_KEY,JSON.stringify(DELETED_DAILY_CONTROL_ASSETS));
}
function addDailyControlToCatalog({factory,name,type,team}){
  const clean=String(name||"").trim();
  if(!clean)return {ok:false,message:"Kontrol adı boş bırakılamaz."};
  if(DAILY_CONTROL_ASSETS.some(item=>item.factory===factory&&item.name.toLocaleLowerCase("tr-TR")===clean.toLocaleLowerCase("tr-TR"))){
    return {ok:false,message:"Bu fabrikada aynı isimde bir günlük kontrol zaten bulunuyor."};
  }
  const asset={
    id:`CUSTOM-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    factory,
    type:type||"other",
    name:clean,
    team:team||"Elektrik Bakım",
    special:["water","gas"].includes(type),
    contractorMonthly:false,
    custom:true,
    createdBy:s.user?.name||"",
    createdAt:new Date().toISOString()
  };
  CUSTOM_DAILY_CONTROL_ASSETS.push(asset);
  DAILY_CONTROL_ASSETS.push(asset);
  saveDailyControlCatalog();
  return {ok:true,asset};
}
function deleteDailyControlFromCatalog(id){
  const index=DAILY_CONTROL_ASSETS.findIndex(asset=>asset.id===id&&!asset.contractorMonthly);
  if(index<0)return false;
  DAILY_CONTROL_ASSETS.splice(index,1);
  const customIndex=CUSTOM_DAILY_CONTROL_ASSETS.findIndex(asset=>asset.id===id);
  if(customIndex>=0)CUSTOM_DAILY_CONTROL_ASSETS.splice(customIndex,1);
  else if(!DELETED_DAILY_CONTROL_ASSETS.includes(id))DELETED_DAILY_CONTROL_ASSETS.push(id);
  saveDailyControlCatalog();
  return true;
}

const CONTRACTOR_CHECK_KEY="etilismart_contractor_monthly_checks_v1";
const CONTROL_PHOTO_DB="etilismart_control_photos_v1";
const CONTROL_PHOTO_STORE="photos";

function saveDailyChecks(){
  storageSet(localStorage,DAILY_CHECK_KEY,JSON.stringify(s.dailyChecks||{}));
}
function saveContractorChecks(){
  storageSet(localStorage,CONTRACTOR_CHECK_KEY,JSON.stringify(s.contractorChecks||{}));
}
function monthKeyLocal(date=new Date()){
  const d=date instanceof Date?date:new Date(`${date}-01T12:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function dailyCheckDateKey(value){
  const date=value?new Date(`${value}T12:00:00`):new Date();
  return dateKeyLocal(date);
}
function dateBeforeKey(value,days=1){
  const d=new Date(`${dailyCheckDateKey(value)}T12:00:00`);
  d.setDate(d.getDate()-days);
  return dateKeyLocal(d);
}
function dailyCheckKey(date,factory,assetId){
  return `daily|${dailyCheckDateKey(date)}|${factory}|${assetId}`;
}
function contractorCheckKey(month,factory,assetId){
  return `monthly|${month||monthKeyLocal()}|${factory}|${assetId}`;
}
function dailyCheckRecord(date,factory,assetId){
  return (s.dailyChecks||{})[dailyCheckKey(date,factory,assetId)]||null;
}
function contractorCheckRecord(month,factory,assetId){
  return (s.contractorChecks||{})[contractorCheckKey(month,factory,assetId)]||null;
}
function dailyAssetsForFactory(factory){
  return DAILY_CONTROL_ASSETS.filter(asset=>asset.factory===factory&&!asset.contractorMonthly);
}
function contractorAssetsForFactory(factory){
  return DAILY_CONTROL_ASSETS.filter(asset=>asset.factory===factory&&asset.contractorMonthly);
}
function dailyControlFactories(){
  if(permissions().allFactories||s.user?.role==="Bakım Müdürü"||s.user?.role==="Genel Müdür"){
    return ["1. Fabrika","2. Fabrika"];
  }
  return [...new Set(userFactories().map(shiftFactoryName))]
    .filter(factory=>factory==="1. Fabrika"||factory==="2. Fabrika");
}
function dailyCheckWeekOffset(dateValue){
  const selected=new Date(`${dailyCheckDateKey(dateValue)}T12:00:00`);
  const selectedDay=(selected.getDay()+6)%7;
  selected.setDate(selected.getDate()-selectedDay);
  selected.setHours(0,0,0,0);
  return Math.round((selected-weekMonday(0))/(7*86400000));
}
function dailyDutyMembers(factory,team,dateValue){
  const date=new Date(`${dailyCheckDateKey(dateValue)}T12:00:00`);
  const dayIndex=(date.getDay()+6)%7;
  const offset=dailyCheckWeekOffset(dateValue);
  return buildTeamWeekSchedule(factory,team,offset)
    .filter(person=>person.days[dayIndex]?.shift==="08-16")
    .map(person=>person.name);
}
function dailyAssetCanBeManaged(asset){
  if(!permissions().manageDailyChecks||asset.contractorMonthly)return false;
  if(isDeveloper())return dailyControlFactories().includes(asset.factory);
  if(s.user?.role==="Bakım Müdürü")return true;
  if(!dailyControlFactories().includes(asset.factory))return false;
  if(s.user?.role==="Elektrik Bakım Formeni")return asset.team==="Elektrik Bakım";
  if(s.user?.role==="Mekanik Bakım Formeni")return asset.team==="Mekanik Bakım";
  if(s.user?.role==="Bakım Formeni")return true;
  return s.user?.role==="Genel Müdür";
}
function canCompleteDailyAsset(asset,dateValue){
  if(asset.contractorMonthly)return false;
  if(dailyAssetCanBeManaged(asset))return true;
  if(!permissions().completeDailyChecks||s.user?.role!=="Bakım Personeli")return false;
  if(dailyCheckDateKey(dateValue)!==dateKeyLocal(new Date()))return false;
  if(!dailyControlFactories().includes(asset.factory))return false;
  return dailyDutyMembers(asset.factory,asset.team,dateValue).includes(s.user?.name);
}
function utilityWindowState(dateValue){
  const selected=dailyCheckDateKey(dateValue);
  const today=dateKeyLocal(new Date());
  const now=new Date();
  const minutes=now.getHours()*60+now.getMinutes();
  return {
    selectedIsToday:selected===today,
    inWindow:selected===today&&minutes>=8*60&&minutes<9*60,
    beforeWindow:selected===today&&minutes<8*60,
    afterWindow:selected===today&&minutes>=9*60
  };
}
function canCompleteUtilityAsset(asset,dateValue){
  if(!asset?.special)return false;
  if(dailyAssetCanBeManaged(asset))return true;
  return canCompleteDailyAsset(asset,dateValue)&&utilityWindowState(dateValue).inWindow;
}
function canRecordContractorCheck(asset){
  if(!asset?.contractorMonthly)return false;
  if(!dailyControlFactories().includes(asset.factory))return false;
  return isDeveloper()||["Bakım Müdürü","Elektrik Bakım Formeni","Bakım Formeni"].includes(s.user?.role);
}
function dailyAssetTypeLabel(type){
  return ({
    compressor:"Kompresör",
    transformer:"Trafo",
    generator:"Jeneratör",
    ups:"UPS",
    compensation:"Kompanzasyon",
    breakerRoom:"Kesici Odası",
    breakerPanel:"Kesici Panosu",
    gas:"Gaz İstasyonu",
    water:"Su Deposu",
    other:"Diğer Ekipman"
  })[type]||type;
}
function dailyAssetIcon(type){
  return ({
    compressor:"◉",
    transformer:"ϟ",
    generator:"⚙",
    ups:"▣",
    compensation:"≈",
    breakerRoom:"▤",
    breakerPanel:"▤",
    gas:"◌",
    water:"◒",
    other:"⚙"
  })[type]||"□";
}
function dailyCompletionStats(factory,dateValue){
  const assets=dailyAssetsForFactory(factory);
  const done=assets.filter(asset=>dailyCheckRecord(dateValue,factory,asset.id)?.status==="done").length;
  return {
    total:assets.length,
    done,
    pending:assets.length-done,
    percent:assets.length?Math.round(done/assets.length*100):0
  };
}
function contractorCompletionStats(factory,monthValue){
  const assets=contractorAssetsForFactory(factory);
  const done=assets.filter(asset=>contractorCheckRecord(monthValue,factory,asset.id)?.status==="done").length;
  return {
    total:assets.length,
    done,
    pending:assets.length-done,
    percent:assets.length?Math.round(done/assets.length*100):0
  };
}
function dailyCheckHistory(factory,days=7){
  const rows=[];
  for(let i=0;i<days;i++){
    const date=new Date();
    date.setHours(12,0,0,0);
    date.setDate(date.getDate()-i);
    const key=dateKeyLocal(date);
    rows.push({date:key,...dailyCompletionStats(factory,key)});
  }
  return rows;
}
function previousUtilityRecord(asset,dateValue){
  return dailyCheckRecord(dateBeforeKey(dateValue,1),asset.factory,asset.id);
}
function meterDifference(current,previous){
  const c=Number(current),p=Number(previous);
  if(!Number.isFinite(c)||!Number.isFinite(p)||c<p)return null;
  return Number((c-p).toFixed(2));
}
function utilityConsumption(asset,dateValue,record=dailyCheckRecord(dateValue,asset.factory,asset.id)){
  const previous=previousUtilityRecord(asset,dateValue);
  if(!record||!previous)return null;
  if(asset.type==="water"){
    return {
      incoming:meterDifference(record.readings?.incoming,previous.readings?.incoming),
      aBlock:meterDifference(record.readings?.aBlock,previous.readings?.aBlock),
      bBlock:meterDifference(record.readings?.bBlock,previous.readings?.bBlock)
    };
  }
  return {
    incoming:meterDifference(record.readings?.incoming,previous.readings?.incoming)
  };
}
function utilityEntryTimingLabel(record){
  if(!record)return "";
  if(record.entryTiming==="on_time")return "08:00–09:00 arasında alındı";
  if(record.entryTiming==="authorized_late")return "Saat dışı yetkili giriş";
  return "Kayıt saati belirtilmedi";
}

function openControlPhotoDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(CONTROL_PHOTO_DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(CONTROL_PHOTO_STORE)){
        db.createObjectStore(CONTROL_PHOTO_STORE);
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function compressControlPhoto(file){
  if(!file)return null;
  const url=URL.createObjectURL(file);
  try{
    const image=await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error("Fotoğraf okunamadı."));
      img.src=url;
    });
    const maxSize=1280;
    const scale=Math.min(1,maxSize/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>{
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Fotoğraf sıkıştırılamadı.")),"image/jpeg",0.68);
    });
  }finally{
    URL.revokeObjectURL(url);
  }
}
async function saveControlPhoto(key,file){
  const blob=await compressControlPhoto(file);
  const db=await openControlPhotoDb();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(CONTROL_PHOTO_STORE,"readwrite");
    tx.objectStore(CONTROL_PHOTO_STORE).put(blob,key);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}
async function getControlPhoto(key){
  const db=await openControlPhotoDb();
  const blob=await new Promise((resolve,reject)=>{
    const tx=db.transaction(CONTROL_PHOTO_STORE,"readonly");
    const request=tx.objectStore(CONTROL_PHOTO_STORE).get(key);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>reject(request.error);
  });
  db.close();
  return blob;
}
async function deleteControlPhoto(key){
  const db=await openControlPhotoDb();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(CONTROL_PHOTO_STORE,"readwrite");
    tx.objectStore(CONTROL_PHOTO_STORE).delete(key);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}
async function showControlPhoto(key,title="Kontrol Fotoğrafı"){
  try{
    const blob=await getControlPhoto(key);
    if(!blob){
      alert("Fotoğraf kaydı bulunamadı.");
      return;
    }
    const url=URL.createObjectURL(blob);
    const viewer=document.createElement("div");
    viewer.className="control-photo-viewer";
    viewer.innerHTML=`<div class="control-photo-dialog"><div><b>${esc(title)}</b><button type="button">×</button></div><img alt="${esc(title)}"></div>`;
    viewer.querySelector("img").src=url;
    const close=()=>{
      URL.revokeObjectURL(url);
      viewer.remove();
    };
    viewer.querySelector("button").onclick=close;
    viewer.onclick=e=>{if(e.target===viewer)close()};
    document.body.appendChild(viewer);
  }catch(error){
    console.error(error);
    alert("Fotoğraf görüntülenemedi.");
  }
}

/* Günlük kontrol ekranı */
function dailyChecksPage(){
  const factories=dailyControlFactories();
  if(!factories.includes(s.dailyControlFactory))s.dailyControlFactory=factories[0]||"1. Fabrika";
  if(!s.dailyControlDate)s.dailyControlDate=dateOnly(new Date());
  if(!s.contractorControlMonth)s.contractorControlMonth=monthKeyLocal(new Date());

  const factory=s.dailyControlFactory;
  const date=s.dailyControlDate;
  const activeTab=s.dailyControlTab||"daily";
  const dailyAssets=dailyAssetsForFactory(factory);
  const contractorAssets=contractorAssetsForFactory(factory);
  const specialAssets=dailyAssets.filter(asset=>asset.special);
  const regularAssets=dailyAssets.filter(asset=>!asset.special);
  const categories=["Tümü",...new Set(regularAssets.map(asset=>dailyAssetTypeLabel(asset.type)))];

  if(!categories.includes(s.dailyControlCategory))s.dailyControlCategory="Tümü";

  const visibleAssets=s.dailyControlCategory==="Tümü"
    ?regularAssets
    :regularAssets.filter(asset=>dailyAssetTypeLabel(asset.type)===s.dailyControlCategory);

  const stats=dailyCompletionStats(factory,date);
  const contractorStats=contractorCompletionStats(factory,s.contractorControlMonth);
  const electricalDuty=dailyDutyMembers(factory,"Elektrik Bakım",date);
  const mechanicalDuty=dailyDutyMembers(factory,"Mekanik Bakım",date);
  const history=dailyCheckHistory(factory,7);
  const today=dateKeyLocal(new Date());
  const currentMonth=monthKeyLocal(new Date());
  const selectedIsToday=dailyCheckDateKey(date)===today;
  const windowState=utilityWindowState(date);

  const resultOptions=record=>`
    <option value="">Kontrol sonucu seçiniz</option>
    <option value="normal" ${record?.result==="normal"?"selected":""}>Normal</option>
    <option value="cleaned" ${record?.result==="cleaned"?"selected":""}>Temizlik / küçük müdahale yapıldı</option>
    <option value="warning" ${record?.result==="warning"?"selected":""}>Takip edilmesi gereken durum var</option>
    <option value="fault" ${record?.result==="fault"?"selected":""}>Arıza / uygunsuzluk tespit edildi</option>`;

  const resultLabel=value=>({
    normal:"Normal",
    cleaned:"Temizlik / küçük müdahale yapıldı",
    warning:"Takip edilmesi gereken durum var",
    fault:"Arıza / uygunsuzluk tespit edildi"
  })[value]||"Belirtilmedi";

  const photoButton=(key,title)=>`<button type="button" class="photo-view-button view-control-photo" data-photo-key="${esc(key)}" data-photo-title="${esc(title)}">▣ Kontrol Fotoğrafını Gör</button>`;

  const assetCard=asset=>{
    const record=dailyCheckRecord(date,factory,asset.id);
    const done=record?.status==="done";
    const canEdit=canCompleteDailyAsset(asset,date);
    const assignees=dailyDutyMembers(factory,asset.team,date);
    const photoKey=dailyCheckKey(date,factory,asset.id);

    return `<article class="daily-check-card photo-required ${done?"done":"pending"}">
      <div class="daily-check-icon">${dailyAssetIcon(asset.type)}</div>
      <div class="daily-check-main">
        <div class="daily-check-title">
          <div><small>${esc(dailyAssetTypeLabel(asset.type))}</small><h3>${esc(asset.name)}</h3></div>
          <span class="daily-check-status ${done?"done":"pending"}">${done?"Yapıldı":"Yapılmadı"}</span>
        </div>
        <div class="daily-check-meta">
          <span><b>Sorumlu ekip:</b> ${esc(asset.team)}</span>
          <span><b>08–16 personeli:</b> ${assignees.length?esc(assignees.join(", ")):"Atanmış personel yok"}</span>
        </div>
        ${done?`
          <div class="daily-check-completed">
            <b>${esc(record.checkedBy||"Bilinmeyen Kullanıcı")}</b>
            <span>${fmtDate(record.checkedAt)}</span>
            <strong class="control-result ${esc(record.result||"normal")}">${esc(resultLabel(record.result))}</strong>
            ${record.note?`<p>${esc(record.note)}</p>`:""}
          </div>
          ${photoButton(photoKey,asset.name)}
        `:canEdit?`
          <div class="daily-check-entry">
            <select class="daily-check-result" data-asset-id="${esc(asset.id)}">${resultOptions(record)}</select>
            <input class="daily-check-note" data-asset-id="${esc(asset.id)}" placeholder="Kontrol notu (isteğe bağlı)">
            <label class="control-photo-input"><span>Kontrol fotoğrafı *</span><input class="daily-check-photo" data-asset-id="${esc(asset.id)}" type="file" accept="image/*" capture="environment" required></label>
          </div>
        `:""}
      </div>
      <div class="daily-check-actions">
        ${canEdit
          ?done
            ?`<button type="button" class="secondary undo-daily-check" data-asset-id="${esc(asset.id)}">Kontrolü Geri Al</button>`
            :`<button type="button" class="primary complete-daily-check" data-asset-id="${esc(asset.id)}">Fotoğraflı Kontrolü Kaydet</button>`
          :`<small>${selectedIsToday?"Yalnızca ilgili 08–16 personeli işaretleyebilir.":"Geçmiş kayıt salt okunurdur."}</small>`}
        ${canManageDailyControlCatalog()?`<button type="button" class="danger delete-daily-control" data-delete-daily-control="${esc(asset.id)}">Kontrolü Sil</button>`:""}
      </div>
    </article>`;
  };

  const specialCard=asset=>{
    const record=dailyCheckRecord(date,factory,asset.id);
    const done=record?.status==="done";
    const canEdit=canCompleteUtilityAsset(asset,date);
    const managerOverride=dailyAssetCanBeManaged(asset)&&!windowState.inWindow;
    const isWater=asset.type==="water";
    const assignees=dailyDutyMembers(factory,asset.team,date);
    const photoKey=dailyCheckKey(date,factory,asset.id);
    const consumption=utilityConsumption(asset,date,record);

    const timingMessage=windowState.inWindow
      ?"Rutin ölçüm saati açık: 08:00–09:00"
      :windowState.beforeWindow
        ?"Rutin ölçüm saati henüz başlamadı."
        :windowState.afterWindow
          ?"Rutin ölçüm saati sona erdi."
          :"Geçmiş tarih kaydı";

    return `<article class="daily-reading-card photo-required ${done?"done":"pending"}">
      <div class="daily-reading-head">
        <div class="daily-check-icon">${dailyAssetIcon(asset.type)}</div>
        <div><small>${esc(factory)}</small><h3>${esc(asset.name)}</h3><p>Rutin değer alma saati: 08:00–09:00 · ${esc(assignees.join(", ")||"Atanmış personel yok")}</p></div>
        <span class="daily-check-status ${done?"done":"pending"}">${done?"Yapıldı":"Yapılmadı"}</span>
      </div>

      <div class="utility-window-status ${windowState.inWindow?"open":managerOverride?"override":"closed"}">
        <b>${esc(timingMessage)}</b>
        <span>${managerOverride?"Yetkili kullanıcı saat dışında düzeltme kaydı girebilir.":"Bakım personeli yalnızca 08:00–09:00 arasında veri girebilir."}</span>
      </div>

      <form class="daily-reading-form" data-asset-id="${esc(asset.id)}">
        ${isWater?`
          <div class="field"><label>Depoya gelen su sayacı (m³) *</label><input class="water-meter-incoming" type="number" min="0" step="0.01" value="${esc(record?.readings?.incoming??"")}" placeholder="Toplam sayaç" ${canEdit?"":"disabled"}></div>
          <div class="field"><label>A Blok kullanılan su sayacı (m³) *</label><input class="water-meter-a" type="number" min="0" step="0.01" value="${esc(record?.readings?.aBlock??"")}" placeholder="Toplam sayaç" ${canEdit?"":"disabled"}></div>
          <div class="field"><label>B Blok kullanılan su sayacı (m³) *</label><input class="water-meter-b" type="number" min="0" step="0.01" value="${esc(record?.readings?.bBlock??"")}" placeholder="Toplam sayaç" ${canEdit?"":"disabled"}></div>
        `:`
          <div class="field"><label>İşletmeye gelen gaz sayacı (m³) *</label><input class="gas-meter-incoming" type="number" min="0" step="0.01" value="${esc(record?.readings?.incoming??"")}" placeholder="Toplam sayaç" ${canEdit?"":"disabled"}></div>
        `}
        <div class="field"><label>Kontrol sonucu *</label><select class="daily-reading-result" ${canEdit?"":"disabled"}>${resultOptions(record)}</select></div>
        <div class="field"><label>Kontrol fotoğrafı ${record?.photoStored?"(değiştirmek için seçin)":"*"}</label><input class="daily-reading-photo" type="file" accept="image/*" capture="environment" ${canEdit&&!record?.photoStored?"required":""} ${canEdit?"":"disabled"}></div>
        <div class="field daily-reading-note"><label>Kontrol notu</label><input class="daily-reading-note-input" value="${esc(record?.note||"")}" placeholder="İsteğe bağlı açıklama" ${canEdit?"":"disabled"}></div>
        <div class="daily-reading-actions">
          ${canEdit?`<button type="submit" class="primary">${done?"Değerleri Güncelle":"Kaydet ve Yapıldı İşaretle"}</button>${done?`<button type="button" class="secondary undo-daily-check" data-asset-id="${esc(asset.id)}">Kontrolü Geri Al</button>`:""}`:""}
        </div>
      </form>

      ${done?`
        <div class="utility-record-summary">
          <div><small>KAYIT ZAMANI</small><b>${fmtDate(record.checkedAt)}</b><span>${esc(utilityEntryTimingLabel(record))}</span></div>
          <div><small>KAYDEDEN</small><b>${esc(record.checkedBy||"Bilinmeyen Kullanıcı")}</b><span>${esc(resultLabel(record.result))}</span></div>
          ${isWater?`
            <div><small>İŞLETMEYE GELEN SU</small><b>${consumption?.incoming??"-"} m³</b><span>önceki güne göre</span></div>
            <div><small>A BLOK KULLANILAN SU</small><b>${consumption?.aBlock??"-"} m³</b><span>önceki güne göre</span></div>
            <div><small>B BLOK KULLANILAN SU</small><b>${consumption?.bBlock??"-"} m³</b><span>önceki güne göre</span></div>
          `:`
            <div><small>İŞLETMEYE GELEN GAZ</small><b>${consumption?.incoming??"-"} m³</b><span>önceki güne göre</span></div>
          `}
        </div>
        ${photoButton(photoKey,asset.name)}
      `:""}
      ${canManageDailyControlCatalog()?`<button type="button" class="danger delete-daily-control special-delete-control" data-delete-daily-control="${esc(asset.id)}">Bu Günlük Kontrolü Sil</button>`:""}
    </article>`;
  };

  const contractorCard=asset=>{
    const record=contractorCheckRecord(s.contractorControlMonth,factory,asset.id);
    const done=record?.status==="done";
    const canEdit=canRecordContractorCheck(asset);
    const photoKey=contractorCheckKey(s.contractorControlMonth,factory,asset.id);

    return `<article class="contractor-check-card ${done?"done":"pending"}">
      <div class="contractor-check-head">
        <div class="daily-check-icon">${dailyAssetIcon(asset.type)}</div>
        <div><small>${esc(dailyAssetTypeLabel(asset.type))}</small><h3>${esc(asset.name)}</h3><p>Aylık periyodik kontrol · Taşeron firma</p></div>
        <span class="daily-check-status ${done?"done":"pending"}">${done?"Yapıldı":"Yapılmadı"}</span>
      </div>
      <form class="contractor-check-form" data-asset-id="${esc(asset.id)}">
        <div class="field"><label>Taşeron firma *</label><input class="contractor-company" value="${esc(record?.company||"")}" placeholder="Firma adı" ${canEdit?"":"disabled"} required></div>
        <div class="field"><label>Rapor / form numarası *</label><input class="contractor-report-no" value="${esc(record?.reportNo||"")}" placeholder="Rapor no" ${canEdit?"":"disabled"} required></div>
        <div class="field"><label>Kontrol sonucu *</label><select class="contractor-result" ${canEdit?"":"disabled"}>${resultOptions(record)}</select></div>
        <div class="field"><label>Rapor / kontrol fotoğrafı ${record?.photoStored?"(değiştirmek için seçin)":"*"}</label><input class="contractor-photo" type="file" accept="image/*" capture="environment" ${canEdit&&!record?.photoStored?"required":""} ${canEdit?"":"disabled"}></div>
        <div class="field contractor-note"><label>Taşeron kontrol açıklaması</label><input class="contractor-note-input" value="${esc(record?.note||"")}" placeholder="Yapılan kontroller ve tespitler" ${canEdit?"":"disabled"}></div>
        <div class="contractor-actions">
          ${canEdit?`<button type="submit" class="primary">${done?"Kaydı Güncelle":"Aylık Kontrolü Kaydet"}</button>${done?`<button type="button" class="secondary undo-contractor-check" data-asset-id="${esc(asset.id)}">Kaydı Geri Al</button>`:""}`:""}
        </div>
      </form>
      ${done?`<div class="contractor-record-meta"><span><b>${esc(record.company)}</b> · ${esc(record.reportNo)}</span><span>${fmtDate(record.checkedAt)} · ${esc(record.checkedBy)}</span></div>${photoButton(photoKey,asset.name)}`:""}
    </article>`;
  };

  const waterAsset=specialAssets.find(asset=>asset.type==="water");
  const gasAsset=specialAssets.find(asset=>asset.type==="gas");
  const waterRecord=waterAsset?dailyCheckRecord(date,factory,waterAsset.id):null;
  const gasRecord=gasAsset?dailyCheckRecord(date,factory,gasAsset.id):null;
  const waterUse=waterAsset?utilityConsumption(waterAsset,date,waterRecord):null;
  const gasUse=gasAsset?utilityConsumption(gasAsset,date,gasRecord):null;

  const utilityOutput=`<section class="utility-output-card">
    <div class="section-modern-head">
      <div><h2>Günlük Su ve Gaz Tüketim Çıktısı</h2><p>Sayaçların önceki gün değerleriyle farkı otomatik hesaplanır.</p></div>
      <button type="button" class="secondary" id="printUtilityOutput">Yazdır / PDF</button>
    </div>
    <div class="utility-output-grid">
      <article><small>İŞLETMEYE GELEN SU</small><b>${waterUse?.incoming??"-"} m³</b><span>${waterUse?"günlük fark":"Önceki gün kaydı gerekli"}</span></article>
      <article><small>A BLOK KULLANILAN SU</small><b>${waterUse?.aBlock??"-"} m³</b><span>${waterUse?"günlük fark":"Önceki gün kaydı gerekli"}</span></article>
      <article><small>B BLOK KULLANILAN SU</small><b>${waterUse?.bBlock??"-"} m³</b><span>${waterUse?"günlük fark":"Önceki gün kaydı gerekli"}</span></article>
      <article><small>İŞLETMEYE GELEN GAZ</small><b>${gasUse?.incoming??"-"} m³</b><span>${gasUse?"günlük fark":"Önceki gün kaydı gerekli"}</span></article>
    </div>
    <div class="utility-meter-values">
      <span>Su sayaçları: Gelen <b>${waterRecord?.readings?.incoming??"-"}</b> · A Blok <b>${waterRecord?.readings?.aBlock??"-"}</b> · B Blok <b>${waterRecord?.readings?.bBlock??"-"}</b> m³</span>
      <span>Gaz sayacı: Gelen <b>${gasRecord?.readings?.incoming??"-"}</b> m³</span>
    </div>
  </section>`;

  return `${clockBlock()}
  <section class="desktop-page-title daily-control-title">
    <div>
      <span>TESİS KONTROL VE SAYAÇ TAKİBİ</span>
      <h1>Günlük Kontroller</h1>
      <p>Bakım ekibi günlük ekipman kontrollerini fotoğrafla tamamlar. Trafo ve kesiciler yalnızca aylık taşeron periyodik kontrolünde takip edilir.</p>
    </div>
    <div class="daily-control-toolbar">
      <select id="dailyControlFactory">${factories.map(item=>`<option ${item===factory?"selected":""}>${esc(item)}</option>`).join("")}</select>
      ${activeTab==="daily"
        ?`<input id="dailyControlDate" type="date" max="${today}" value="${esc(date)}">`
        :`<input id="contractorControlMonth" type="month" max="${currentMonth}" value="${esc(s.contractorControlMonth)}">`}
    </div>
  </section>

  <div class="daily-control-tabs">
    <button type="button" class="${activeTab==="daily"?"active":""}" data-daily-control-tab="daily">Günlük Bakım Kontrolleri</button>
    <button type="button" class="${activeTab==="contractor"?"active":""}" data-daily-control-tab="contractor">Aylık Taşeron Kontrolleri</button>
  </div>

  ${activeTab==="daily"&&canManageDailyControlCatalog()?`<details class="daily-control-management-panel">
    <summary><span>＋</span><div><b>Günlük Kontrol Listesini Yönet</b><small>Yeni ekipman kontrolü ekleyin veya mevcut kontrol kartlarından birini silin.</small></div><i>⌄</i></summary>
    <form id="dailyControlCatalogForm" class="daily-control-management-form">
      <label>Fabrika<select id="newDailyControlFactory">${factories.map(item=>`<option ${item===factory?"selected":""}>${esc(item)}</option>`).join("")}</select></label>
      <label class="daily-control-name-field">Kontrol / Ekipman Adı<input id="newDailyControlName" maxlength="120" placeholder="Örn. Ana Hava Kurutucu Kontrolü" required></label>
      <label>Kontrol Türü<select id="newDailyControlType"><option value="compressor">Kompresör</option><option value="generator">Jeneratör</option><option value="ups">UPS</option><option value="compensation">Kompanzasyon</option><option value="water">Su Sayacı / Deposu</option><option value="gas">Gaz Sayacı / İstasyonu</option><option value="other" selected>Diğer Ekipman</option></select></label>
      <label>Sorumlu Ekip<select id="newDailyControlTeam"><option>Elektrik Bakım</option><option>Mekanik Bakım</option></select></label>
      <button type="submit" class="primary">Günlük Kontrol Ekle</button>
    </form>
    <p>Silinen kontroller yeni günlük listelerden kaldırılır; daha önce alınmış kontrol kayıtları korunur.</p>
  </details>`:""}

  ${activeTab==="daily"?`
    <section class="daily-duty-banner">
      <div><small>EKİPMAN KONTROL VARDİYASI</small><b>08:00 – 16:00</b><span>Kompresör, jeneratör, UPS, kompanzasyon, su ve gaz kontrolleri.</span></div>
      <div class="daily-duty-team"><small>ELEKTRİK BAKIM</small><b>${electricalDuty.length?esc(electricalDuty.join(" · ")):"Atanmış personel yok"}</b></div>
      <div class="daily-duty-team"><small>MEKANİK BAKIM</small><b>${mechanicalDuty.length?esc(mechanicalDuty.join(" · ")):"Atanmış personel yok"}</b></div>
    </section>

    <section class="utility-time-banner ${windowState.inWindow?"open":"closed"}">
      <div><span>◷</span><div><small>SU VE GAZ RUTİN DEĞER ALMA SAATİ</small><b>08:00 – 09:00</b><p>Bakım personeli su ve gaz sayaçlarını yalnızca bu saat aralığında kaydedebilir.</p></div></div>
      <strong>${windowState.inWindow?"Giriş Açık":windowState.beforeWindow?"Henüz Başlamadı":"Süre Doldu"}</strong>
    </section>

    <section class="daily-control-kpis">
      <article><small>GÜNLÜK KONTROL</small><b>${stats.total}</b><span>trafo ve kesici hariç</span></article>
      <article><small>YAPILDI</small><b>${stats.done}</b><span>fotoğraflı kontrol</span></article>
      <article><small>YAPILMADI</small><b>${stats.pending}</b><span>bekleyen kontrol</span></article>
      <article><small>TAMAMLANMA</small><b>%${stats.percent}</b><span>${selectedIsToday?"bugünkü durum":"seçilen tarih"}</span></article>
    </section>

    <section class="daily-section-card">
      <div class="section-modern-head">
        <div><h2>08:00–09:00 Su ve Gaz Sayaçları</h2><p>Su için üç kümülatif sayaç, gaz için tek gelen sayaç değeri ve fotoğraf zorunludur.</p></div>
      </div>
      <div class="daily-reading-grid">${specialAssets.map(specialCard).join("")}</div>
    </section>

    ${utilityOutput}

    <section class="daily-section-card">
      <div class="daily-list-heading">
        <div><h2>Bakım Ekibi Günlük Kontrol Listesi</h2><p>Her kontrol için sonuç seçimi ve kontrol fotoğrafı zorunludur.</p></div>
        <select id="dailyControlCategory">${categories.map(category=>`<option ${category===s.dailyControlCategory?"selected":""}>${esc(category)}</option>`).join("")}</select>
      </div>
      <div class="daily-check-list">${visibleAssets.map(assetCard).join("")}</div>
    </section>

    <section class="daily-section-card">
      <div class="section-modern-head"><div><h2>Son 7 Günlük Kontrol Geçmişi</h2><p>${esc(factory)} günlük tamamlanma özeti.</p></div></div>
      <div class="table-wrap">
        <table class="daily-history-table">
          <thead><tr><th>Tarih</th><th>Yapıldı</th><th>Yapılmadı</th><th>Toplam</th><th>Tamamlanma</th></tr></thead>
          <tbody>${history.map(row=>`<tr>
            <td>${new Date(`${row.date}T12:00:00`).toLocaleDateString("tr-TR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</td>
            <td><b class="daily-history-done">${row.done}</b></td>
            <td><b class="daily-history-pending">${row.pending}</b></td>
            <td>${row.total}</td>
            <td><div class="daily-history-progress"><i style="width:${row.percent}%"></i><span>%${row.percent}</span></div></td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `:`
    <section class="contractor-info-banner">
      <div><span>⚠</span><div><b>Trafo ve kesiciler günlük bakım ekibi kontrolüne dahil değildir.</b><p>Bu ekipmanların kontrolleri ayda bir defa yetkili taşeron tarafından yapılır; rapor numarası, sonuç ve fotoğraf sisteme kaydedilir.</p></div></div>
    </section>

    <section class="daily-control-kpis contractor-kpis">
      <article><small>AYLIK EKİPMAN</small><b>${contractorStats.total}</b><span>trafo ve kesici</span></article>
      <article><small>YAPILDI</small><b>${contractorStats.done}</b><span>taşeron kaydı</span></article>
      <article><small>YAPILMADI</small><b>${contractorStats.pending}</b><span>bekleyen periyodik kontrol</span></article>
      <article><small>TAMAMLANMA</small><b>%${contractorStats.percent}</b><span>${esc(s.contractorControlMonth)}</span></article>
    </section>

    <section class="daily-section-card">
      <div class="section-modern-head">
        <div><h2>Aylık Taşeron Periyodik Kontrol Listesi</h2><p>Kontrol kaydını bakım müdürü, elektrik bakım formeni veya bakım formeni sisteme işler.</p></div>
      </div>
      <div class="contractor-check-list">${contractorAssets.map(contractorCard).join("")}</div>
    </section>
  `}`;
}
