/* Planlı bakım verileri */
const MAINTENANCE_TYPES=["Periyodik Bakım","Yağlama","Elektrik Kontrolü","Mekanik Kontrol","Kalibrasyon","Temizlik","Revizyon","Güvenlik Kontrolü"];
const MAINTENANCE_PRIORITIES=["Düşük","Normal","Yüksek","Kritik"];
function dateOnly(d){
  const x=new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
}
function addDays(base,days){
  const d=new Date(base);d.setDate(d.getDate()+days);return d;
}
function generatePlannedMaintenances(){
  const now=new Date();
  return [
    {id:1,title:"Spray Dryer periyodik kontrol",factory:"2. Fabrika A Blok",line:"1. Hat",department:"Masse Bölümü",machine:"Spray Dryer",type:"Periyodik Bakım",priority:"Yüksek",date:dateOnly(addDays(now,1)),time:"09:00",duration:120,assigned:"Mekanik Bakım Ekibi",status:"planned",description:"Nozul, fan, brülör, sıcaklık sensörleri ve filtre kontrolü."},
    {id:2,title:"Pres hidrolik sistem kontrolü",factory:"1. Fabrika",line:"2. Hat",department:"Pres Bölümü",machine:"Presler",type:"Mekanik Kontrol",priority:"Normal",date:dateOnly(addDays(now,3)),time:"13:30",duration:90,assigned:"Mekanik Bakım Ekibi",status:"planned",description:"Yağ seviyesi, kaçak, basınç ve hortum kontrolleri."},
    {id:3,title:"Fırın pano termal kontrolü",factory:"2. Fabrika B Blok",line:"1. Hat",department:"Fırınlar",machine:"Fırın",type:"Elektrik Kontrolü",priority:"Kritik",date:dateOnly(addDays(now,5)),time:"08:30",duration:180,assigned:"Elektrik Bakım Ekibi",status:"planned",description:"Pano bağlantıları, kontaktörler ve termal kamera kontrolü."},
    {id:4,title:"Dijital baskı kalibrasyonu",factory:"1. Fabrika",line:"1. Hat",department:"Sır Bantları",machine:"Dijital Baskı",type:"Kalibrasyon",priority:"Normal",date:dateOnly(addDays(now,8)),time:"10:00",duration:60,assigned:"Otomasyon Ekibi",status:"planned",description:"Baskı kafası ve eksen kalibrasyonu."},
    {id:5,title:"Paketleme sensör temizliği",factory:"2. Fabrika A Blok",line:"2. Hat",department:"Paketleme",machine:"Paketleme",type:"Temizlik",priority:"Düşük",date:dateOnly(addDays(now,-2)),time:"15:00",duration:45,assigned:"Vardiya Bakım Ekibi",status:"done",description:"Fotosel ve sensör yüzeylerinin temizliği."}
  ];
}

/* Planlı bakım ekranları */
function maintenanceStatusLabel(status){
  return status==="done"?"Tamamlandı":status==="cancelled"?"İptal":status==="progress"?"Devam Ediyor":"Planlandı";
}
function maintenanceStatusClass(status){
  return status==="done"?"done":status==="cancelled"?"cancelled":status==="progress"?"progress":"planned";
}
function visibleMaintenances(){
  let items=[...s.plannedMaintenances].filter(x=>userCanSeeFactory(x.factory));
  if(roleIsDepartmentLimited()&&s.user?.department)items=items.filter(x=>x.department===s.user.department);
  return items;
}
function calendarMonthLabel(date){
  return new Date(date).toLocaleDateString("tr-TR",{month:"long",year:"numeric"});
}
function plannedMaintenanceModal(){
  if(!s.plannedModal)return "";
  const factories=userFactories();
  const defaultFactory=factories[0]||"1. Fabrika";
  const defaultLine=(FACTORIES[defaultFactory]||["1. Hat"])[0];
  const selectedDate=s.plannedSelectedDate||dateOnly(new Date());
  return `<div class="modal-backdrop planned-modal-bg"><div class="modal planned-modal">
    <div class="modal-head"><div><h2>Yeni Planlı Bakım</h2><p>Takvime yeni bakım görevi ekleyin.</p></div><button type="button" class="planned-close">×</button></div>
    <form id="plannedForm" class="formgrid">
      <div class="field full"><label>Bakım Başlığı</label><input id="pmTitle" required placeholder="Örn. Spray Dryer periyodik kontrol"></div>
      <div class="field"><label>Fabrika</label><select id="pmFactory" required>${opts(factories,"Fabrika seçiniz",defaultFactory)}</select></div>
      <div class="field"><label>Hat</label><select id="pmLine" required>${opts(catalogLines(defaultFactory),"Hat seçiniz",defaultLine)}</select></div>
      <div class="field"><label>Bölüm</label><select id="pmDepartment" required>${opts(catalogDepartments(defaultFactory,defaultLine),"Bölüm seçiniz",s.user?.department||"")}</select></div>
      <div class="field"><label>Makine</label><select id="pmMachine" required><option value="">Önce bölüm seçiniz</option></select></div>
      <div class="field"><label>Bakım Türü</label><select id="pmType" required>${opts(MAINTENANCE_TYPES,"Tür seçiniz","Periyodik Bakım")}</select></div>
      <div class="field"><label>Öncelik</label><select id="pmPriority" required>${opts(MAINTENANCE_PRIORITIES,"Öncelik seçiniz","Normal")}</select></div>
      <div class="field"><label>Tarih</label><input id="pmDate" type="date" value="${selectedDate}" required></div>
      <div class="field"><label>Saat</label><input id="pmTime" type="time" value="09:00" required></div>
      <div class="field"><label>Tahmini Süre (dk)</label><input id="pmDuration" type="number" min="15" step="15" value="60" required></div>
      <div class="field"><label>Atanan Ekip / Kişi</label><input id="pmAssigned" placeholder="Örn. Elektrik Bakım Ekibi" required></div>
      <div class="field full"><label>Açıklama</label><textarea id="pmDescription" placeholder="Yapılacak işlemler, kontrol noktaları ve notlar..."></textarea></div>
      <div class="actions full"><button type="button" class="secondary planned-close">İptal</button><button class="primary">Takvime Ekle</button></div>
    </form>
  </div></div>`;
}
function plannedMaintenancePage(){
  const current=new Date(s.calendarDate);
  const year=current.getFullYear(),month=current.getMonth();
  const firstDay=new Date(year,month,1);
  const startOffset=(firstDay.getDay()+6)%7;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const previousDays=new Date(year,month,0).getDate();
  const items=visibleMaintenances();
  const today=dateOnly(new Date());
  const upcoming=items.filter(x=>x.date>=today&&x.status!=="done"&&x.status!=="cancelled").sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const overdue=items.filter(x=>x.date<today&&x.status!=="done"&&x.status!=="cancelled");
  const doneThisMonth=items.filter(x=>x.status==="done"&&new Date(x.date).getMonth()===month&&new Date(x.date).getFullYear()===year);
  const cells=[];
  for(let i=0;i<42;i++){
    const dayNum=i-startOffset+1;
    let cellDate,inside=true,label=dayNum;
    if(dayNum<1){label=previousDays+dayNum;cellDate=new Date(year,month-1,label);inside=false}
    else if(dayNum>daysInMonth){label=dayNum-daysInMonth;cellDate=new Date(year,month+1,label);inside=false}
    else cellDate=new Date(year,month,dayNum);
    const key=dateOnly(cellDate);
    const dayItems=items.filter(x=>x.date===key).sort((a,b)=>a.time.localeCompare(b.time));
    cells.push(`<div class="calendar-day ${inside?"":"outside"} ${key===today?"today":""}" data-calendar-date="${key}">
      <div class="calendar-day-number"><span>${label}</span>${dayItems.length?`<b>${dayItems.length}</b>`:""}</div>
      <div class="calendar-events">${dayItems.slice(0,3).map(x=>`<button type="button" class="calendar-event ${maintenanceStatusClass(x.status)}" data-pm-id="${x.id}" title="${esc(x.title)}"><time>${esc(x.time)}</time><span>${esc(x.machine)}</span></button>`).join("")}${dayItems.length>3?`<small>+${dayItems.length-3} bakım</small>`:""}</div>
    </div>`);
  }
  return `${clockBlock()}
  <section class="desktop-page-title maintenance-title">
    <div><span>BAKIM PLANLAMA</span><h1>Planlı Bakımlar</h1><p>Bakım görevlerini takvim üzerinde planlayın, takip edin ve tamamlayın.</p></div>
    ${permissions().editPlanned?'<button class="primary" id="addPlannedMaintenance">+ Yeni Bakım Planla</button>':""}
  </section>
  <section class="maintenance-kpis">
    <article><i class="blue">▦</i><div><small>BU AY PLANLANAN</small><b>${items.filter(x=>new Date(x.date).getMonth()===month&&new Date(x.date).getFullYear()===year).length}</b></div></article>
    <article><i class="amber">◷</i><div><small>YAKLAŞAN BAKIM</small><b>${upcoming.length}</b></div></article>
    <article><i class="red">!</i><div><small>GECİKEN</small><b>${overdue.length}</b></div></article>
    <article><i class="green">✓</i><div><small>BU AY TAMAMLANAN</small><b>${doneThisMonth.length}</b></div></article>
  </section>
  <section class="maintenance-layout">
    <article class="maintenance-calendar-card">
      <div class="calendar-toolbar">
        <div><button type="button" id="calendarPrev">‹</button><button type="button" id="calendarToday">Bugün</button><button type="button" id="calendarNext">›</button></div>
        <h2>${esc(calendarMonthLabel(current))}</h2>
        <div class="calendar-legend"><span><i class="planned"></i>Planlandı</span><span><i class="progress"></i>Devam Ediyor</span><span><i class="done"></i>Tamamlandı</span></div>
      </div>
      <div class="calendar-weekdays">${["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map(x=>`<b>${x}</b>`).join("")}</div>
      <div class="maintenance-calendar">${cells.join("")}</div>
    </article>
    <aside class="upcoming-maintenance-panel">
      <div class="upcoming-head"><div><h3>Yaklaşan Bakımlar</h3><p>Sıradaki planlı görevler</p></div><span>${upcoming.length}</span></div>
      <div class="upcoming-list">${upcoming.slice(0,8).map(x=>`<article class="upcoming-item priority-${x.priority.toLowerCase().replace("ü","u").replace("ş","s")}">
        <div class="upcoming-date"><b>${new Date(x.date+"T00:00:00").getDate()}</b><small>${new Date(x.date+"T00:00:00").toLocaleDateString("tr-TR",{month:"short"})}</small></div>
        <div class="upcoming-copy"><div><b>${esc(x.machine)}</b><span>${esc(x.time)}</span></div><p>${esc(x.title)}</p><small>${esc(x.factory)} · ${esc(x.line)}</small><em>${esc(x.priority)}</em></div>
        ${permissions().editPlanned?`<select class="pm-status" data-id="${x.id}"><option value="planned" ${x.status==="planned"?"selected":""}>Planlandı</option><option value="progress" ${x.status==="progress"?"selected":""}>Devam Ediyor</option><option value="done" ${x.status==="done"?"selected":""}>Tamamlandı</option><option value="cancelled" ${x.status==="cancelled"?"selected":""}>İptal</option></select>`:""}
      </article>`).join("")||'<div class="compact-empty"><span>✓</span><p>Yaklaşan planlı bakım bulunmuyor.</p></div>'}</div>
    </aside>
  </section>
  ${plannedMaintenanceModal()}`;
}
