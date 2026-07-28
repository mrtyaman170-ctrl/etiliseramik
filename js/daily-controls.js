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
    gas:"Gaz Sayacı",
    gasStation:"Gaz İstasyonu",
    fireSystem:"Yangın Sistemi",
    water:"Su Deposu"
  };
  const contractorMonthly=["transformer","breakerRoom","breakerPanel","gasStation","fireSystem"].includes(type);
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
  dailyAsset("F1-GAZ-IST","1. Fabrika","gasStation",0,"Periyodik Kontrol"),
  dailyAsset("F1-YANGIN","1. Fabrika","fireSystem",0,"Periyodik Kontrol"),
  dailyAsset("F1-GAZ-1","1. Fabrika","gas",1,"Mekanik Bakım"),
  dailyAsset("F1-SU-1","1. Fabrika","water",1,"Mekanik Bakım"),

  ...Array.from({length:5},(_,i)=>dailyAsset(`F2-TR-${i+1}`,"2. Fabrika","transformer",i+1,"Taşeron")),
  ...Array.from({length:5},(_,i)=>dailyAsset(`F2-KES-${i+1}`,"2. Fabrika","breakerPanel",i+1,"Taşeron")),
  dailyAsset("F2-GAZ-IST","2. Fabrika","gasStation",0,"Periyodik Kontrol"),
  dailyAsset("F2-YANGIN","2. Fabrika","fireSystem",0,"Periyodik Kontrol"),
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
CUSTOM_DAILY_CONTROL_ASSETS=storageJsonRecordArray(localStorage,DAILY_CONTROL_CUSTOM_CATALOG_KEY,[])
  .filter(asset=>typeof asset.id==="string"
    &&["1. Fabrika","2. Fabrika"].includes(asset.factory)
    &&typeof asset.name==="string"&&asset.name.trim()
    &&["compressor","transformer","generator","ups","compensation","breakerRoom","breakerPanel","gas","gasStation","fireSystem","water","other"].includes(asset.type)
    &&["Elektrik Bakım","Mekanik Bakım","Periyodik Kontrol","Taşeron"].includes(asset.team))
  .map(asset=>({
    ...asset,
    id:asset.id.trim(),
    name:asset.name.trim(),
    special:["water","gas"].includes(asset.type),
    contractorMonthly:!!asset.contractorMonthly,
    custom:true
  }));
DELETED_DAILY_CONTROL_ASSETS=storageJsonArray(localStorage,DAILY_CONTROL_DELETED_CATALOG_KEY,[]).filter(id=>typeof id==="string");
CUSTOM_DAILY_CONTROL_ASSETS.forEach(asset=>{
  if(asset?.id&&!DAILY_CONTROL_ASSETS.some(item=>item.id===asset.id))DAILY_CONTROL_ASSETS.push(asset);
});
for(let index=DAILY_CONTROL_ASSETS.length-1;index>=0;index--){
  if(DELETED_DAILY_CONTROL_ASSETS.includes(DAILY_CONTROL_ASSETS[index].id))DAILY_CONTROL_ASSETS.splice(index,1);
}
function saveDailyControlCatalog(){
  storageSet(localStorage,DAILY_CONTROL_CUSTOM_CATALOG_KEY,JSON.stringify(CUSTOM_DAILY_CONTROL_ASSETS));
  storageSet(localStorage,DAILY_CONTROL_DELETED_CATALOG_KEY,JSON.stringify(DELETED_DAILY_CONTROL_ASSETS));
}
function addDailyControlToCatalog({factory,name,type,team}){
  const clean=String(name||"").trim();
  if(!canManageDailyControlCatalog()||!dailyControlFactories().includes(factory)){
    return {ok:false,message:"Bu fabrika için günlük kontrol tanımlama yetkiniz bulunmuyor."};
  }
  if(!clean)return {ok:false,message:"Kontrol adı boş bırakılamaz."};
  if(!["compressor","generator","ups","compensation","gas","water","other"].includes(type)){
    return {ok:false,message:"Geçerli bir kontrol türü seçiniz."};
  }
  if(!["Elektrik Bakım","Mekanik Bakım"].includes(team)){
    return {ok:false,message:"Geçerli bir sorumlu bakım ekibi seçiniz."};
  }
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
function addPeriodicControlToCatalog({factory,name,type,team}){
  const clean=String(name||"").trim();
  if(!canManageDailyControlCatalog()||!dailyControlFactories().includes(factory)){
    return {ok:false,message:"Bu fabrika için periyodik kontrol tanımlama yetkiniz bulunmuyor."};
  }
  if(!clean)return {ok:false,message:"Periyodik kontrol adı boş bırakılamaz."};
  const allowedTypes=["transformer","breakerRoom","breakerPanel","gasStation","fireSystem","generator","ups","other"];
  if(!allowedTypes.includes(type))return {ok:false,message:"Geçerli bir periyodik kontrol türü seçiniz."};
  if(DAILY_CONTROL_ASSETS.some(item=>item.factory===factory&&item.name.toLocaleLowerCase("tr-TR")===clean.toLocaleLowerCase("tr-TR"))){
    return {ok:false,message:"Bu fabrikada aynı isimde bir kontrol zaten bulunuyor."};
  }
  const asset={
    id:`PERIODIC-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    factory,type,name:clean,team:team||"Periyodik Kontrol",
    special:false,contractorMonthly:true,custom:true,
    createdBy:s.user?.name||"",createdAt:new Date().toISOString()
  };
  CUSTOM_DAILY_CONTROL_ASSETS.push(asset);DAILY_CONTROL_ASSETS.push(asset);saveDailyControlCatalog();
  return {ok:true,asset};
}
function deleteDailyControlFromCatalog(id){
  const index=DAILY_CONTROL_ASSETS.findIndex(asset=>asset.id===id);
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
  return isDeveloper()||["Bakım Müdürü","Elektrik Bakım Formeni","Mekanik Bakım Formeni","Bakım Formeni"].includes(s.user?.role);
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
    gasStation:"Gaz İstasyonu",
    fireSystem:"Yangın Sistemi",
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
function dailyResultLabel(value){
  return ({
    normal:"Normal",
    cleaned:"Temizlik / küçük müdahale yapıldı",
    warning:"Takip edilmesi gereken durum var",
    fault:"Arıza / uygunsuzluk tespit edildi"
  })[value]||"Belirtilmedi";
}
function dailyResultOptions(record){
  return `
    <option value="">Kontrol sonucu seçiniz</option>
    <option value="normal" ${record?.result==="normal"?"selected":""}>Normal</option>
    <option value="cleaned" ${record?.result==="cleaned"?"selected":""}>Temizlik / küçük müdahale yapıldı</option>
    <option value="warning" ${record?.result==="warning"?"selected":""}>Takip edilmesi gereken durum var</option>
    <option value="fault" ${record?.result==="fault"?"selected":""}>Arıza / uygunsuzluk tespit edildi</option>`;
}
function dailyControlDetailModal(){
  const detail=s.dailyControlDetail;
  if(!detail?.assetId)return "";
  const asset=DAILY_CONTROL_ASSETS.find(item=>item.id===detail.assetId);
  if(!asset)return "";

  const isContractor=detail.kind==="contractor";
  const period=isContractor?s.contractorControlMonth:s.dailyControlDate;
  const record=isContractor
    ?contractorCheckRecord(period,asset.factory,asset.id)
    :dailyCheckRecord(period,asset.factory,asset.id);
  const done=record?.status==="done";
  const photoKey=isContractor
    ?contractorCheckKey(period,asset.factory,asset.id)
    :dailyCheckKey(period,asset.factory,asset.id);
  const periodLabel=isContractor
    ?new Date(`${period}-01T12:00:00`).toLocaleDateString("tr-TR",{month:"long",year:"numeric"})
    :new Date(`${dailyCheckDateKey(period)}T12:00:00`).toLocaleDateString("tr-TR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const assignees=isContractor?[]:dailyDutyMembers(asset.factory,asset.team,period);
  const consumption=!isContractor&&asset.special?utilityConsumption(asset,period,record):null;
  const canAct=isContractor?canRecordContractorCheck(asset):(asset.special?canCompleteUtilityAsset(asset,period):canCompleteDailyAsset(asset,period));
  const canDelete=canManageDailyControlCatalog()&&(!isContractor||canRecordContractorCheck(asset));
  const detailKind=isContractor
    ?"PERİYODİK KONTROL"
    :asset.special
      ?"GÜNLÜK SAYAÇ KONTROLÜ"
      :"GÜNLÜK EKİPMAN KONTROLÜ";
  const windowState=!isContractor&&asset.special?utilityWindowState(period):null;
  const managerOverride=!isContractor&&asset.special&&dailyAssetCanBeManaged(asset)&&!windowState.inWindow;
  const statsDays=[7,14,30].includes(Number(s.utilityStatsDays))?Number(s.utilityStatsDays):14;
  const utilityRows=!isContractor&&asset.special?utilityStatisticsRows(asset.factory,period,statsDays):[];

  const utilityDetails=!isContractor&&asset.type==="water"?`
    <article><small>GELEN SU SAYACI</small><b>${record?.readings?.incoming??"-"} m³</b><span>Günlük kullanım: ${consumption?.incoming??"-"} m³</span></article>
    <article><small>A BLOK SU SAYACI</small><b>${record?.readings?.aBlock??"-"} m³</b><span>Günlük kullanım: ${consumption?.aBlock??"-"} m³</span></article>
    <article><small>B BLOK SU SAYACI</small><b>${record?.readings?.bBlock??"-"} m³</b><span>Günlük kullanım: ${consumption?.bBlock??"-"} m³</span></article>
  `:!isContractor&&asset.type==="gas"?`
    <article><small>GELEN GAZ SAYACI</small><b>${record?.readings?.incoming??"-"} m³</b><span>Günlük kullanım: ${consumption?.incoming??"-"} m³</span></article>
  `:"";

  const utilityCharts=!isContractor&&asset.special?`
    <section class="daily-detail-chart-section">
      <div class="daily-detail-section-head">
        <div><small>SAYAÇ İSTATİSTİĞİ</small><h3>Son ${statsDays} Günlük Tüketim Grafiği</h3><p>Grafikler kümülatif sayaçların geçerli günlük farklarından oluşur.</p></div>
      </div>
      <div class="utility-detail-chart-grid ${asset.type==="water"?"water":"gas"}">
        ${asset.type==="water"?`
          ${utilityTrendChart(utilityRows,row=>row.water?.incoming,"İşletmeye Gelen Su","water")}
          ${utilityTrendChart(utilityRows,row=>row.water?.aBlock,"A Blok Kullanılan Su","water")}
          ${utilityTrendChart(utilityRows,row=>row.water?.bBlock,"B Blok Kullanılan Su","water")}
        `:utilityTrendChart(utilityRows,row=>row.gas?.incoming,"İşletmeye Gelen Gaz","gas")}
      </div>
    </section>
  `:"";

  const regularEditor=!isContractor&&!asset.special&&canAct?`
    <section class="daily-detail-editor">
      <div class="daily-detail-section-head">
        <div><small>YETKİLİ İŞLEM</small><h3>${done?"Kontrol Kaydını Düzenle":"Kontrolü Tamamla"}</h3><p>Sonuç, açıklama ve kontrol fotoğrafını bu pencereden kaydedin.</p></div>
      </div>
      <form class="daily-detail-regular-form" data-asset-id="${esc(asset.id)}">
        <div class="field">
          <label>Kontrol sonucu *</label>
          <select class="daily-check-result" data-asset-id="${esc(asset.id)}">${dailyResultOptions(record)}</select>
        </div>
        <div class="field">
          <label>Kontrol notu</label>
          <textarea class="daily-check-note" data-asset-id="${esc(asset.id)}" rows="3" placeholder="İsteğe bağlı açıklama">${esc(record?.note||"")}</textarea>
        </div>
        <div class="field">
          <label>Kontrol fotoğrafı ${record?.photoStored?"(değiştirmek için seçin)":"*"}</label>
          <input class="daily-check-photo" data-asset-id="${esc(asset.id)}" type="file" accept="image/*" capture="environment" ${record?.photoStored?"":"required"}>
        </div>
        <div class="daily-detail-editor-actions">
          ${done?`<button type="button" class="secondary undo-daily-check" data-asset-id="${esc(asset.id)}">Kontrolü Geri Al</button>`:""}
          <button type="button" class="primary complete-daily-check" data-asset-id="${esc(asset.id)}">${done?"Kontrolü Güncelle":"Fotoğraflı Kontrolü Kaydet"}</button>
        </div>
      </form>
    </section>
  `:"";

  const utilityEditor=!isContractor&&asset.special&&canAct?`
    <section class="daily-detail-editor">
      <div class="daily-detail-section-head">
        <div><small>YETKİLİ SAYAÇ İŞLEMİ</small><h3>${done?"Sayaç Kaydını Düzenle":"Sayaç Değerlerini Kaydet"}</h3><p>Bakım personeli için rutin giriş saati 08:00–09:00'dur; yetkili yöneticiler saat dışında düzeltme yapabilir.</p></div>
      </div>
      <div class="utility-window-status ${windowState.inWindow?"open":managerOverride?"override":"closed"}">
        <b>${windowState.inWindow?"Rutin ölçüm saati açık":managerOverride?"Yetkili saat dışı düzeltme":"Rutin ölçüm saati kapalı"}</b>
        <span>${windowState.inWindow?"08:00–09:00 arasında zamanında kayıt alınır.":managerOverride?"Bu işlem saat dışı yetkili giriş olarak kaydedilir.":"Mevcut kullanıcı bu saatte sayaç kaydı giremez."}</span>
      </div>
      <form class="daily-reading-form daily-detail-utility-form" data-asset-id="${esc(asset.id)}">
        ${asset.type==="water"?`
          <div class="field"><label>Depoya gelen su sayacı (m³) *</label><input class="water-meter-incoming" type="number" min="0" step="0.01" value="${esc(record?.readings?.incoming??"")}" placeholder="Toplam sayaç"></div>
          <div class="field"><label>A Blok kullanılan su sayacı (m³) *</label><input class="water-meter-a" type="number" min="0" step="0.01" value="${esc(record?.readings?.aBlock??"")}" placeholder="Toplam sayaç"></div>
          <div class="field"><label>B Blok kullanılan su sayacı (m³) *</label><input class="water-meter-b" type="number" min="0" step="0.01" value="${esc(record?.readings?.bBlock??"")}" placeholder="Toplam sayaç"></div>
        `:`
          <div class="field"><label>İşletmeye gelen gaz sayacı (m³) *</label><input class="gas-meter-incoming" type="number" min="0" step="0.01" value="${esc(record?.readings?.incoming??"")}" placeholder="Toplam sayaç"></div>
        `}
        <div class="field"><label>Kontrol sonucu *</label><select class="daily-reading-result">${dailyResultOptions(record)}</select></div>
        <div class="field"><label>Kontrol fotoğrafı ${record?.photoStored?"(değiştirmek için seçin)":"*"}</label><input class="daily-reading-photo" type="file" accept="image/*" capture="environment" ${record?.photoStored?"":"required"}></div>
        <div class="field daily-reading-note"><label>Kontrol notu</label><input class="daily-reading-note-input" value="${esc(record?.note||"")}" placeholder="İsteğe bağlı açıklama"></div>
        <div class="daily-reading-actions">
          ${done?`<button type="button" class="secondary undo-daily-check" data-asset-id="${esc(asset.id)}">Kontrolü Geri Al</button>`:""}
          <button type="submit" class="primary">${done?"Değerleri Güncelle":"Kaydet ve Yapıldı İşaretle"}</button>
        </div>
      </form>
    </section>
  `:"";
  const periodicEditor=isContractor&&canAct?`
    <section class="daily-detail-editor periodic-detail-editor">
      <div class="daily-detail-section-head">
        <div><small>YETKİLİ İŞLEM</small><h3>${done?"Periyodik Kontrolü Düzenle":"Periyodik Kontrol Kaydı Gir"}</h3><p>Tüm kontrol ayrıntıları yalnızca bu detay ekranından kaydedilir.</p></div>
      </div>
      <form class="contractor-check-form periodic-detail-form" data-asset-id="${esc(asset.id)}">
        <div class="field"><label>Kontrol firması / sorumlu *</label><input class="contractor-company" value="${esc(record?.company||"")}" placeholder="Firma veya sorumlu kişi" required></div>
        <div class="field"><label>Rapor / form numarası *</label><input class="contractor-report-no" value="${esc(record?.reportNo||"")}" placeholder="Rapor no" required></div>
        <div class="field"><label>Kontrol tarihi *</label><input class="contractor-performed-date" type="date" value="${esc(record?.performedDate||dateOnly(new Date()))}" required></div>
        <div class="field"><label>Sonraki kontrol tarihi</label><input class="contractor-next-date" type="date" value="${esc(record?.nextDueDate||"")}"></div>
        <div class="field"><label>Kontrol sonucu *</label><select class="contractor-result">${dailyResultOptions(record)}</select></div>
        <div class="field"><label>Standart / kontrol kapsamı</label><input class="contractor-standard" value="${esc(record?.standard||"")}" placeholder="Örn. yönetmelik, test kapsamı"></div>
        <div class="field periodic-full"><label>Tespitler ve ölçüm sonuçları</label><textarea class="contractor-findings" rows="4" placeholder="Ölçümler, uygunsuzluklar ve kontrol bulguları">${esc(record?.findings||"")}</textarea></div>
        <div class="field periodic-full"><label>Yapılacak işlem / öneri</label><textarea class="contractor-action" rows="3" placeholder="Takip edilecek işlem veya düzeltici faaliyet">${esc(record?.actionRequired||"")}</textarea></div>
        <div class="field periodic-full"><label>Genel açıklama</label><textarea class="contractor-note-input" rows="3" placeholder="Periyodik kontrol açıklaması">${esc(record?.note||"")}</textarea></div>
        <div class="field periodic-full"><label>Rapor / kontrol fotoğrafı ${record?.photoStored?"(değiştirmek için seçin)":"*"}</label><input class="contractor-photo" type="file" accept="image/*" capture="environment" ${record?.photoStored?"":"required"}></div>
        <div class="daily-detail-editor-actions periodic-full">
          ${done?`<button type="button" class="secondary undo-contractor-check" data-asset-id="${esc(asset.id)}">Kaydı Geri Al</button>`:""}
          <button type="submit" class="primary">${done?"Değişiklikleri Kaydet":"Periyodik Kontrolü Kaydet"}</button>
        </div>
      </form>
    </section>
  `:"";

  return `<div class="modal-backdrop" id="dailyControlDetailBackdrop">
    <div class="modal daily-control-detail-modal">
      <div class="modal-head">
        <div><span>${detailKind}</span><h2>${esc(asset.name)}</h2><p>${esc(asset.factory)} · ${esc(periodLabel)}</p></div>
        <button type="button" id="closeDailyControlDetail" aria-label="Kapat">×</button>
      </div>

      <section class="daily-detail-hero">
        <article><small>KONTROL DURUMU</small><b class="daily-check-status ${done?"done":"pending"}">${done?"Yapıldı":"Yapılmadı"}</b></article>
        <article><small>KONTROL TÜRÜ</small><b>${esc(dailyAssetTypeLabel(asset.type))}</b></article>
        <article><small>SORUMLU EKİP</small><b>${esc(asset.team)}</b></article>
        <article><small>PERİYOT</small><b>${isContractor?"Aylık":"Günlük"}</b></article>
      </section>

      <section class="daily-detail-grid">
        ${isContractor?`
          <article><small>TAŞERON FİRMA</small><b>${esc(record?.company||"Henüz girilmedi")}</b></article>
          <article><small>RAPOR / FORM NUMARASI</small><b>${esc(record?.reportNo||"Henüz girilmedi")}</b></article>
        `:`
          <article class="wide"><small>08:00–16:00 SORUMLU PERSONELİ</small><b>${assignees.length?esc(assignees.join(", ")):"Atanmış personel yok"}</b></article>
        `}
        ${utilityDetails}
        <article><small>KONTROL SONUCU</small><b class="control-result ${esc(record?.result||"")}">${esc(done?dailyResultLabel(record.result):"Henüz girilmedi")}</b></article>
        <article><small>KONTROL EDEN</small><b>${esc(record?.checkedBy||"Henüz kontrol edilmedi")}</b></article>
        <article><small>KONTROL ZAMANI</small><b>${record?.checkedAt?fmtDate(record.checkedAt):"-"}</b>${record?.entryTiming?`<span>${esc(utilityEntryTimingLabel(record))}</span>`:""}</article>
        <article class="wide"><small>KONTROL NOTU / AÇIKLAMA</small><p>${esc(record?.note||"Kontrol notu bulunmuyor.")}</p></article>
      </section>

      <div class="daily-detail-info ${done?"done":"pending"}">
        <b>${done?"Kontrol kaydı tamamlandı.":"Bu kontrol henüz tamamlanmadı."}</b>
        <span>${done
          ?record?.photoStored?"Fotoğraflı kontrol kaydı oluşturuldu.":"Kontrol kaydında fotoğraf bulunmuyor."
          :canAct?"Kontrolü aşağıdaki yetkili işlem alanından tamamlayabilirsiniz.":"Bu kayıt mevcut yetkinizle salt okunur görüntüleniyor."}</span>
      </div>

      ${utilityCharts}
      ${regularEditor}
      ${utilityEditor}
      ${periodicEditor}

      <div class="modal-actions">
        ${done&&record?.photoStored?`<button type="button" class="secondary view-control-photo" data-photo-key="${esc(photoKey)}" data-photo-title="${esc(asset.name)}">▣ Kontrol Fotoğrafını Gör</button>`:""}
        ${canDelete?`<button type="button" class="danger delete-daily-control ${asset.special?"special-delete-control":""}" data-delete-daily-control="${esc(asset.id)}">${isContractor?"Periyodik Kontrolü Sil":asset.special?"Bu Günlük Kontrolü Sil":"Kontrolü Sil"}</button>`:""}
        <button type="button" class="primary" id="closeDailyControlDetailBottom">Kapat</button>
      </div>
    </div>
  </div>`;
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
    rows.push({
      date:key,
      ...dailyCompletionStats(factory,key),
      electricalDuty:dailyDutyMembers(factory,"Elektrik Bakım",key),
      mechanicalDuty:dailyDutyMembers(factory,"Mekanik Bakım",key)
    });
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
function utilityReadingState(record,previous,fields){
  if(!record||record.status!=="done")return "missing";
  if(!previous||previous.status!=="done")return "missing_previous";
  const currentRaw=fields.map(field=>record.readings?.[field]);
  const previousRaw=fields.map(field=>previous.readings?.[field]);
  if([...currentRaw,...previousRaw].some(value=>value===null||value===undefined||String(value).trim()===""))return "invalid";
  const currentValues=currentRaw.map(Number);
  const previousValues=previousRaw.map(Number);
  if([...currentValues,...previousValues].some(value=>!Number.isFinite(value)))return "invalid";
  if(currentValues.some((value,index)=>value<previousValues[index]))return "reset";
  return "valid";
}
function utilityStatisticsRows(factory,endDate,days=14){
  const normalizedDays=Math.max(1,Math.min(31,Number(days)||14));
  const waterAsset=dailyAssetsForFactory(factory).find(asset=>asset.type==="water");
  const gasAsset=dailyAssetsForFactory(factory).find(asset=>asset.type==="gas");
  const rows=[];

  for(let offset=normalizedDays-1;offset>=0;offset--){
    const date=dateBeforeKey(endDate,offset);
    const previousDate=dateBeforeKey(date,1);
    const waterRecord=waterAsset?dailyCheckRecord(date,factory,waterAsset.id):null;
    const previousWater=waterAsset?dailyCheckRecord(previousDate,factory,waterAsset.id):null;
    const gasRecord=gasAsset?dailyCheckRecord(date,factory,gasAsset.id):null;
    const previousGas=gasAsset?dailyCheckRecord(previousDate,factory,gasAsset.id):null;
    const waterState=waterAsset?utilityReadingState(waterRecord,previousWater,["incoming","aBlock","bBlock"]):"missing";
    const gasState=gasAsset?utilityReadingState(gasRecord,previousGas,["incoming"]):"missing";
    let water=null;
    let gas=null;

    if(waterState==="valid"){
      const incoming=meterDifference(waterRecord.readings.incoming,previousWater.readings.incoming);
      const aBlock=meterDifference(waterRecord.readings.aBlock,previousWater.readings.aBlock);
      const bBlock=meterDifference(waterRecord.readings.bBlock,previousWater.readings.bBlock);
      water={
        incoming,
        aBlock,
        bBlock,
        balance:Number((incoming-aBlock-bBlock).toFixed(2))
      };
    }
    if(gasState==="valid"){
      gas={incoming:meterDifference(gasRecord.readings.incoming,previousGas.readings.incoming)};
    }
    rows.push({date,water,gas,waterState,gasState});
  }
  return rows;
}
function utilityNumber(value,digits=2){
  if(!Number.isFinite(Number(value)))return "-";
  return Number(value).toLocaleString("tr-TR",{maximumFractionDigits:digits});
}
function utilityValues(rows,selector){
  return rows.map(selector).filter(value=>Number.isFinite(Number(value))).map(Number);
}
function utilitySum(values){
  return Number(values.reduce((sum,value)=>sum+value,0).toFixed(2));
}
function utilityTotal(values){
  return values.length?utilitySum(values):null;
}
function utilityAverage(values){
  return values.length?Number((utilitySum(values)/values.length).toFixed(2)):null;
}
function utilityMaximum(rows,selector){
  return rows.reduce((best,row)=>{
    const value=selector(row);
    return Number.isFinite(Number(value))&&(!best||Number(value)>best.value)
      ?{value:Number(value),date:row.date}
      :best;
  },null);
}
function utilityStateLabel(state){
  return ({
    valid:"Hesaplandı",
    missing:"Kayıt yok",
    missing_previous:"Önceki gün yok",
    invalid:"Geçersiz değer",
    reset:"Sayaç düşüşü / sıfırlama"
  })[state]||"Kayıt yok";
}
function utilityTrendChart(rows,selector,title,theme){
  const values=utilityValues(rows,selector);
  const max=values.length?Math.max(...values):0;
  return `<article class="utility-trend-card ${theme}">
    <div class="utility-trend-head">
      <div><small>GÜNLÜK EĞİLİM</small><h3>${esc(title)}</h3></div>
      <span>En yüksek <b>${values.length?`${utilityNumber(max)} m³`:"-"}</b></span>
    </div>
    <div class="utility-chart-scroll">
      <div class="utility-bar-chart" style="--utility-bars:${rows.length}">
        ${rows.map(row=>{
          const raw=selector(row);
          const value=Number.isFinite(Number(raw))?Number(raw):null;
          const height=value!==null&&max>0?Math.max(3,Math.round(value/max*100)):0;
          const label=new Date(`${row.date}T12:00:00`).toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"});
          return `<div class="utility-bar-item ${value===null?"missing":""}" title="${value===null?"Geçerli tüketim verisi yok":`${utilityNumber(value)} m³`}">
            <div class="utility-bar-value">${value===null?"–":utilityNumber(value,1)}</div>
            <div class="utility-bar-track"><i style="height:${height}%"></i></div>
            <small>${label}</small>
          </div>`;
        }).join("")}
      </div>
    </div>
  </article>`;
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

  const resultOptions=dailyResultOptions;
  const resultLabel=dailyResultLabel;

  const photoButton=(key,title)=>`<button type="button" class="photo-view-button view-control-photo" data-photo-key="${esc(key)}" data-photo-title="${esc(title)}">▣ Kontrol Fotoğrafını Gör</button>`;

  const assetCard=asset=>{
    const record=dailyCheckRecord(date,factory,asset.id);
    const done=record?.status==="done";

    return `<article class="daily-check-card daily-status-only-card ${done?"done":"pending"}" data-daily-detail-kind="daily" data-daily-detail-asset-id="${esc(asset.id)}" role="button" tabindex="0" aria-label="${esc(asset.name)} kontrol detayını aç">
      <div class="daily-check-icon">${dailyAssetIcon(asset.type)}</div>
      <div class="daily-check-main">
        <small>${esc(dailyAssetTypeLabel(asset.type))}</small>
        <h3>${esc(asset.name)}</h3>
      </div>
      <span class="daily-check-status ${done?"done":"pending"}">${done?"Yapıldı":"Yapılmadı"}</span>
    </article>`;
  };

  const specialCard=asset=>{
    const record=dailyCheckRecord(date,factory,asset.id);
    const done=record?.status==="done";

    return `<article class="daily-reading-card daily-status-only-card ${done?"done":"pending"}" data-daily-detail-kind="daily" data-daily-detail-asset-id="${esc(asset.id)}" role="button" tabindex="0" aria-label="${esc(asset.name)} kontrol detayını aç">
      <div class="daily-reading-head">
        <div class="daily-check-icon">${dailyAssetIcon(asset.type)}</div>
        <div><small>${esc(dailyAssetTypeLabel(asset.type))}</small><h3>${esc(asset.name)}</h3></div>
        <span class="daily-check-status ${done?"done":"pending"}">${done?"Yapıldı":"Yapılmadı"}</span>
      </div>
    </article>`;
  };

  const contractorCard=asset=>{
    const record=contractorCheckRecord(s.contractorControlMonth,factory,asset.id);
    const done=record?.status==="done";
    return `<article class="contractor-check-card ${done?"done":"pending"}" data-daily-detail-kind="contractor" data-daily-detail-asset-id="${esc(asset.id)}" role="button" tabindex="0" aria-label="${esc(asset.name)} kontrol detayını aç">
      <div class="contractor-check-head">
        <div class="daily-check-icon">${dailyAssetIcon(asset.type)}</div>
        <div><small>${esc(dailyAssetTypeLabel(asset.type))}</small><h3>${esc(asset.name)}</h3><p>${done?`${esc(record?.company||"")} · ${esc(record?.performedDate||s.contractorControlMonth)}`:"Detayları görüntülemek veya kayıt girmek için tıklayın"}</p></div>
        <span class="daily-check-status ${done?"done":"pending"}">${done?"Yapıldı":"Yapılmadı"}</span>
      </div>
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
      <div><h2>Su ve Gaz Tüketim Çıktıları</h2><p>Su ve gazı ayrı ayrı; günlük, haftalık veya aylık tek sayfa raporlayın.</p></div>
      <div class="utility-print-controls">
        <select id="utilityPrintPeriod" aria-label="Çıktı dönemi"><option value="daily">Günlük</option><option value="weekly">Haftalık</option><option value="monthly">Aylık</option></select>
        <button type="button" class="secondary utility-print-button water" data-print-utility="water">Su Çıktısı</button>
        <button type="button" class="secondary utility-print-button gas" data-print-utility="gas">Gaz Çıktısı</button>
      </div>
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

  const utilityStatsDays=[7,14,30].includes(Number(s.utilityStatsDays))?Number(s.utilityStatsDays):14;
  s.utilityStatsDays=utilityStatsDays;
  const utilityRows=utilityStatisticsRows(factory,date,utilityStatsDays);
  const waterIncomingValues=utilityValues(utilityRows,row=>row.water?.incoming);
  const waterAValues=utilityValues(utilityRows,row=>row.water?.aBlock);
  const waterBValues=utilityValues(utilityRows,row=>row.water?.bBlock);
  const gasIncomingValues=utilityValues(utilityRows,row=>row.gas?.incoming);
  const waterMaximum=utilityMaximum(utilityRows,row=>row.water?.incoming);
  const gasMaximum=utilityMaximum(utilityRows,row=>row.gas?.incoming);
  const resetCount=utilityRows.filter(row=>row.waterState==="reset"||row.gasState==="reset").length;
  const invalidCount=utilityRows.filter(row=>row.waterState==="invalid"||row.gasState==="invalid").length;
  const missingCount=utilityRows.filter(row=>["missing","missing_previous"].includes(row.waterState)||["missing","missing_previous"].includes(row.gasState)).length;
  const shortDate=value=>value
    ?new Date(`${value}T12:00:00`).toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"})
    :"-";
  const utilityStatistics=`<section class="utility-statistics-card">
    <div class="section-modern-head utility-statistics-head">
      <div>
        <span>SU VE GAZ ANALİZİ</span>
        <h2>Sayaç Tüketim İstatistikleri</h2>
        <p>${esc(factory)} · ${shortDate(date)} tarihinde biten dönem. Yalnızca ardışık ve geçerli sayaç kayıtları hesaplamaya katılır.</p>
      </div>
      <label>Dönem
        <select id="utilityStatsDays">
          <option value="7" ${utilityStatsDays===7?"selected":""}>Son 7 gün</option>
          <option value="14" ${utilityStatsDays===14?"selected":""}>Son 14 gün</option>
          <option value="30" ${utilityStatsDays===30?"selected":""}>Son 30 gün</option>
        </select>
      </label>
    </div>

    <div class="utility-stat-kpis">
      <article class="water"><small>GELEN SU TOPLAMI</small><b data-utility-stat="water-total">${waterIncomingValues.length?`${utilityNumber(utilityTotal(waterIncomingValues))} m³`:"-"}</b><span>${waterIncomingValues.length} geçerli gün</span></article>
      <article class="water"><small>A BLOK SU TOPLAMI</small><b>${waterAValues.length?`${utilityNumber(utilityTotal(waterAValues))} m³`:"-"}</b><span>${waterAValues.length} geçerli gün</span></article>
      <article class="water"><small>B BLOK SU TOPLAMI</small><b>${waterBValues.length?`${utilityNumber(utilityTotal(waterBValues))} m³`:"-"}</b><span>${waterBValues.length} geçerli gün</span></article>
      <article class="gas"><small>GELEN GAZ TOPLAMI</small><b data-utility-stat="gas-total">${gasIncomingValues.length?`${utilityNumber(utilityTotal(gasIncomingValues))} m³`:"-"}</b><span>${gasIncomingValues.length} geçerli gün</span></article>
    </div>

    <div class="utility-stat-insights">
      <article><small>ORTALAMA GÜNLÜK SU</small><b>${utilityNumber(utilityAverage(waterIncomingValues))} m³</b><span>geçerli günlerin ortalaması</span></article>
      <article><small>ORTALAMA GÜNLÜK GAZ</small><b>${utilityNumber(utilityAverage(gasIncomingValues))} m³</b><span>geçerli günlerin ortalaması</span></article>
      <article><small>EN YÜKSEK SU TÜKETİMİ</small><b>${utilityNumber(waterMaximum?.value)} m³</b><span>${shortDate(waterMaximum?.date)}</span></article>
      <article><small>EN YÜKSEK GAZ TÜKETİMİ</small><b>${utilityNumber(gasMaximum?.value)} m³</b><span>${shortDate(gasMaximum?.date)}</span></article>
    </div>

    <div class="utility-trend-grid">
      ${utilityTrendChart(utilityRows,row=>row.water?.incoming,"İşletmeye Gelen Su","water")}
      ${utilityTrendChart(utilityRows,row=>row.gas?.incoming,"İşletmeye Gelen Gaz","gas")}
    </div>

    <div class="utility-data-quality ${resetCount||invalidCount?"warning":missingCount?"info":"ok"}">
      <b>Veri kalitesi</b>
      <span>${resetCount?`${resetCount} günde sayaç düşüşü veya sıfırlama tespit edildi ve tüketim toplamına katılmadı. `:""}${invalidCount?`${invalidCount} günde geçersiz değer bulundu. `:""}${missingCount?`${missingCount} günde su veya gaz için ardışık kayıt bulunamadı. `:""}${!resetCount&&!invalidCount&&!missingCount?"Seçilen dönemdeki tüm sayaç farkları güvenle hesaplandı.":""}</span>
    </div>

    <div class="table-wrap utility-history-wrap">
      <table class="utility-history-table">
        <thead><tr><th>Tarih</th><th>Gelen Su</th><th>A Blok</th><th>B Blok</th><th>Dağıtım Farkı</th><th>Gelen Gaz</th><th>Veri Durumu</th></tr></thead>
        <tbody>${[...utilityRows].reverse().map(row=>`<tr>
          <td><b>${shortDate(row.date)}</b></td>
          <td>${row.water?`${utilityNumber(row.water.incoming)} m³`:"-"}</td>
          <td>${row.water?`${utilityNumber(row.water.aBlock)} m³`:"-"}</td>
          <td>${row.water?`${utilityNumber(row.water.bBlock)} m³`:"-"}</td>
          <td>${row.water?`${utilityNumber(row.water.balance)} m³`:"-"}</td>
          <td>${row.gas?`${utilityNumber(row.gas.incoming)} m³`:"-"}</td>
          <td><span class="utility-state ${row.waterState}">Su: ${esc(utilityStateLabel(row.waterState))}</span><span class="utility-state ${row.gasState}">Gaz: ${esc(utilityStateLabel(row.gasState))}</span></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
    <p class="utility-balance-note"><b>Dağıtım farkı</b>, gelen su tüketiminden A ve B blok sayaç tüketimlerinin çıkarılmasıyla hesaplanır. Bu değer tek başına kaçak veya kayıp anlamına gelmez.</p>
  </section>`;

  return `${clockBlock()}
  <section class="desktop-page-title daily-control-title">
    <div>
      <span>TESİS KONTROL VE SAYAÇ TAKİBİ</span>
      <h1>Günlük Kontroller</h1>
      <p>Bakım ekibi günlük ekipman kontrollerini tamamlar; tesisin aylık kontrolleri Periyodik Kontroller bölümünde takip edilir.</p>
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
    <button type="button" class="${activeTab==="contractor"?"active":""}" data-daily-control-tab="contractor">Periyodik Kontroller</button>
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

  ${activeTab==="contractor"&&canManageDailyControlCatalog()?`<details class="daily-control-management-panel periodic-management-panel">
    <summary><span>＋</span><div><b>Periyodik Kontrol Listesini Yönet</b><small>Yeni kontrol noktası ekleyin; silme işlemini kontrol detayından yapın.</small></div><i>⌄</i></summary>
    <form id="periodicControlCatalogForm" class="daily-control-management-form">
      <label>Fabrika<select id="newPeriodicControlFactory">${factories.map(item=>`<option ${item===factory?"selected":""}>${esc(item)}</option>`).join("")}</select></label>
      <label class="daily-control-name-field">Kontrol / Ekipman Adı<input id="newPeriodicControlName" maxlength="120" placeholder="Örn. Ana Yangın Pompası Testi" required></label>
      <label>Kontrol Türü<select id="newPeriodicControlType"><option value="transformer">Trafo</option><option value="breakerRoom">Kesici Odası</option><option value="breakerPanel">Kesici Panosu</option><option value="gasStation">Gaz İstasyonu</option><option value="fireSystem">Yangın Sistemi</option><option value="generator">Jeneratör</option><option value="ups">UPS</option><option value="other" selected>Diğer</option></select></label>
      <label>Sorumlu<select id="newPeriodicControlTeam"><option>Periyodik Kontrol</option><option>Taşeron</option><option>Elektrik Bakım</option><option>Mekanik Bakım</option></select></label>
      <button type="submit" class="primary">Periyodik Kontrol Ekle</button>
    </form>
    <p>Silinen kontrol noktaları yeni aylık listelerden kaldırılır; geçmiş kontrol kayıtları korunur.</p>
  </details>`:""}

  ${activeTab==="daily"?`
    <section class="daily-control-kpis daily-control-kpis-compact">
      <article><small>GÜNLÜK KONTROL</small><b>${stats.total}</b><span>trafo ve kesici hariç</span></article>
      <article><small>YAPILDI</small><b>${stats.done}</b><span>fotoğraflı kontrol</span></article>
      <article><small>YAPILMADI</small><b>${stats.pending}</b><span>bekleyen kontrol</span></article>
      <article><small>TAMAMLANMA</small><b>%${stats.percent}</b><span>${selectedIsToday?"bugünkü durum":"seçilen tarih"}</span></article>
    </section>

    <section class="daily-section-card daily-primary-section">
      <div class="section-modern-head">
        <div><h2>Su ve Gaz Sayaçları</h2><p>Değer girmek, grafikleri görmek veya düzenlemek için kartın üzerine tıklayın.</p></div>
        <span class="daily-inline-status ${windowState.inWindow?"open":"closed"}"><b>08:00–09:00</b>${windowState.inWindow?"Giriş Açık":windowState.beforeWindow?"Henüz Başlamadı":"Süre Doldu"}</span>
      </div>
      <div class="daily-reading-grid">${specialAssets.map(specialCard).join("")}</div>
    </section>

    <section class="daily-section-card daily-primary-section">
      <div class="daily-list-heading">
        <div><h2>Günlük Kontrol Listesi</h2><p>Detay ve yetkili işlemler için kontrol kartına tıklayın.</p></div>
        <select id="dailyControlCategory">${categories.map(category=>`<option ${category===s.dailyControlCategory?"selected":""}>${esc(category)}</option>`).join("")}</select>
      </div>
      <div class="daily-check-list">${visibleAssets.map(assetCard).join("")}</div>
    </section>

    <details class="daily-secondary-panel">
      <summary><span>◷</span><div><b>Günün Sorumluları ve Kontrol Saatleri</b><small>08:00–16:00 ekipleri ve sayaç giriş zamanını görüntüleyin.</small></div><i>⌄</i></summary>
      <div class="daily-secondary-content">
        <section class="daily-duty-banner">
          <div><small>EKİPMAN KONTROL VARDİYASI</small><b>08:00 – 16:00</b><span>Kompresör, jeneratör, UPS, kompanzasyon, su ve gaz kontrolleri.</span></div>
          <div class="daily-duty-team"><small>ELEKTRİK BAKIM</small><b>${electricalDuty.length?esc(electricalDuty.join(" · ")):"Atanmış personel yok"}</b></div>
          <div class="daily-duty-team"><small>MEKANİK BAKIM</small><b>${mechanicalDuty.length?esc(mechanicalDuty.join(" · ")):"Atanmış personel yok"}</b></div>
        </section>
        <section class="utility-time-banner ${windowState.inWindow?"open":"closed"}">
          <div><span>◷</span><div><small>SU VE GAZ RUTİN DEĞER ALMA SAATİ</small><b>08:00 – 09:00</b><p>Bakım personeli su ve gaz sayaçlarını yalnızca bu saat aralığında kaydedebilir.</p></div></div>
          <strong>${windowState.inWindow?"Giriş Açık":windowState.beforeWindow?"Henüz Başlamadı":"Süre Doldu"}</strong>
        </section>
      </div>
    </details>

    <details class="daily-secondary-panel">
      <summary><span>▥</span><div><b>Su ve Gaz Raporları</b><small>Günlük çıktı, dönem toplamları, grafikler ve sayaç geçmişi.</small></div><i>⌄</i></summary>
      <div class="daily-secondary-content daily-utility-reports">
        ${utilityOutput}
        ${utilityStatistics}
      </div>
    </details>

    <details class="daily-secondary-panel">
      <summary><span>↺</span><div><b>Son 7 Günlük Kontrol Geçmişi</b><small>${esc(factory)} tamamlanma oranlarını görüntüleyin.</small></div><i>⌄</i></summary>
      <div class="daily-secondary-content">
        <div class="table-wrap">
          <table class="daily-history-table">
            <thead><tr><th>Tarih</th><th>Vardiyadaki Personeller (08:00–16:00)</th><th>Yapıldı</th><th>Yapılmadı</th><th>Toplam</th><th>Tamamlanma</th></tr></thead>
            <tbody>${history.map(row=>`<tr>
              <td>${new Date(`${row.date}T12:00:00`).toLocaleDateString("tr-TR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</td>
              <td><div class="daily-history-duty"><span><b>Elektrik:</b> ${esc(row.electricalDuty.join(", ")||"Atanmış personel yok")}</span><span><b>Mekanik:</b> ${esc(row.mechanicalDuty.join(", ")||"Atanmış personel yok")}</span></div></td>
              <td><b class="daily-history-done">${row.done}</b></td>
              <td><b class="daily-history-pending">${row.pending}</b></td>
              <td>${row.total}</td>
              <td><div class="daily-history-progress"><i style="width:${row.percent}%"></i><span>%${row.percent}</span></div></td>
            </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    </details>
  `:`
    <section class="contractor-info-banner">
      <div><span>✓</span><div><b>Periyodik tesis kontrolleri tek ekranda takip edilir.</b><p>Trafolar, kesiciler, gaz istasyonu ve yangın sistemi için firma/sorumlu, rapor numarası, sonuç ve kontrol fotoğrafı kaydedilir.</p></div></div>
    </section>

    <section class="daily-control-kpis contractor-kpis">
      <article><small>PERİYODİK EKİPMAN</small><b>${contractorStats.total}</b><span>tesis kontrol noktası</span></article>
      <article><small>YAPILDI</small><b>${contractorStats.done}</b><span>kontrol kaydı</span></article>
      <article><small>YAPILMADI</small><b>${contractorStats.pending}</b><span>bekleyen periyodik kontrol</span></article>
      <article><small>TAMAMLANMA</small><b>%${contractorStats.percent}</b><span>${esc(s.contractorControlMonth)}</span></article>
    </section>

    <section class="daily-section-card">
      <div class="section-modern-head">
        <div><h2>Periyodik Kontrol Listesi</h2><p>Kontrol kayıtlarını bakım müdürü ile elektrik, mekanik ve genel bakım formenleri düzenleyebilir.</p></div>
      </div>
      <div class="contractor-check-list">${contractorAssets.map(contractorCard).join("")}</div>
    </section>
  `}`;
}
