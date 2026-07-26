const SHIFT_LABELS=["00-08","08-16","16-24"];
const SHIFT_OVERRIDE_KEY="etilismart_shift_overrides_v1";
let SHIFT_OVERRIDES=storageJsonRecord(localStorage,SHIFT_OVERRIDE_KEY,{});
function shiftOverrideKey(factory,team,weekOffset,personId,dayIndex){
  return [shiftFactoryName(factory),team,shiftWeekKey(weekOffset),personId,dayIndex].join("|");
}
function getShiftOverride(factory,team,weekOffset,personId,dayIndex){
  return SHIFT_OVERRIDES[shiftOverrideKey(factory,team,weekOffset,personId,dayIndex)]||"";
}
function setShiftOverride(factory,team,weekOffset,personId,dayIndex,value){
  SHIFT_OVERRIDES[shiftOverrideKey(factory,team,weekOffset,personId,dayIndex)]=value;
  storageSet(localStorage,SHIFT_OVERRIDE_KEY,JSON.stringify(SHIFT_OVERRIDES));
}
const SHIFT_DAY_NAMES=["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

function weekMonday(offset=0){
  const d=new Date();
  const day=(d.getDay()+6)%7;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-day+offset*7);
  return d;
}
function dateKeyLocal(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function shiftWeekKey(offset=0){return dateKeyLocal(weekMonday(offset))}
function shiftHash(value){
  let h=2166136261;
  for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return Math.abs(h>>>0);
}

function shiftFactoryName(factory){
  return factory==="2. Fabrika A Blok"||factory==="2. Fabrika B Blok"?"2. Fabrika":factory;
}
function shiftFactoryOptions(){
  if(permissions().viewAllShiftFactories)return ["1. Fabrika","2. Fabrika"];
  const allowed=userFactories().map(shiftFactoryName);
  return [...new Set(allowed)].filter(f=>f==="1. Fabrika"||f==="2. Fabrika");
}
function currentMaintenanceCrewForUser(){
  const factory=shiftFactoryName(userFactories()[0]||"1. Fabrika");
  return {
    factory,
    electrical:activeTeamMembers(factory,"Elektrik Bakım").map(x=>x.name),
    mechanical:activeTeamMembers(factory,"Mekanik Bakım").map(x=>x.name)
  };
}
function shiftFactoryMatches(personFactories,shiftFactory){
  if(shiftFactory==="2. Fabrika"){
    return personFactories.includes("2. Fabrika A Blok")||
           personFactories.includes("2. Fabrika B Blok")||
           personFactories.includes("2. Fabrika");
  }
  return personFactories.includes(shiftFactory);
}

function allMaintenanceAccounts(){
  return appUserEntries()
    .filter(([,u])=>u.role==="Bakım Personeli"&&u.team)
    .map(([id,u])=>({id,name:u.name,team:u.team,factories:u.factories}));
}
function personnelForFactory(factory,team){
  return allMaintenanceAccounts().filter(p=>shiftFactoryMatches(p.factories,factory)&&p.team===team);
}
function weekRangeText(offset=0){
  const start=weekMonday(offset),end=new Date(start);end.setDate(end.getDate()+6);
  const a=start.toLocaleDateString("tr-TR",{day:"2-digit",month:"short"});
  const b=end.toLocaleDateString("tr-TR",{day:"2-digit",month:"short",year:"numeric"});
  return `${a} – ${b}`;
}
function currentShiftLabel(date=new Date()){
  return shiftLabelForDate(date);
}
function shiftClass(value){
  if(value==="00-08")return "night";
  if(value==="08-16")return "morning";
  return "evening";
}

/*
  Haftalık dağılım:
  - Her gün 3 vardiya vardır.
  - Ekipte en az 3 kişi bulunduğu sürece her vardiyada en az 1 kişi olur.
  - Fazla personeller vardiyalara dengeli dağıtılır.
  - Dağılım hafta bazında deterministik olarak döner.
*/
function buildTeamWeekSchedule(factory,team,weekOffset=0){
  const people=personnelForFactory(factory,team);
  const monday=weekMonday(weekOffset);
  const weekSeed=shiftHash(factory+team+shiftWeekKey(weekOffset));

  const rows=people.map(p=>({ ...p, days:[] }));

  for(let dayIndex=0;dayIndex<7;dayIndex++){
    const date=new Date(monday);date.setDate(date.getDate()+dayIndex);

    // Haftalık ve günlük dönüş; isim sırası sabit kalmaz.
    const rotated=[...people].sort((a,b)=>{
      const ha=shiftHash(a.id+weekSeed+dayIndex);
      const hb=shiftHash(b.id+weekSeed+dayIndex);
      return ha-hb;
    });

    const assignments={};
    rotated.forEach((person,index)=>{
      // İlk üç kişi üç farklı vardiyaya zorunlu atanır.
      // Diğerleri dengeli biçimde vardiyalara eklenir.
      const shiftIndex=index%3;
      assignments[person.id]=SHIFT_LABELS[shiftIndex];
    });

    rows.forEach(row=>{
      const automatic=assignments[row.id]||SHIFT_LABELS[(shiftHash(row.id+dayIndex+weekSeed))%3];
      const override=getShiftOverride(factory,team,weekOffset,row.id,dayIndex);
      row.days.push({date,shift:override||automatic});
    });
  }
  return rows;
}
function activeTeamMembers(factory,team,date=new Date()){
  const dayIndex=(date.getDay()+6)%7;
  const shift=currentShiftLabel(date);
  const offset=weekOffsetForDate(date);
  return buildTeamWeekSchedule(factory,team,offset)
    .filter(row=>row.days[dayIndex]?.shift===shift);
}
function activeMaintenanceForFault(fault,date=new Date()){
  const team=maintenanceDisciplineForFault(fault);
  return activeTeamMembers(shiftFactoryName(fault.factory),team,date).map(p=>p.name);
}
function availableMaintenanceForFault(fault){
  const active=activeMaintenanceForFault(fault);
  return active.length?active:maintenanceOptionsForFault(fault);
}
function personnelSelectOptions(fault){
  const current=fault.assignedTo||"Atama Bekliyor";
  const active=availableMaintenanceForFault(fault);
  const all=maintenanceOptionsForFault(fault);
  const merged=[...new Set(["Atama Bekliyor",...active,...all])];
  return merged.map(name=>{
    const duty=active.includes(name)?" • Aktif vardiyada":"";
    return `<option value="${esc(name)}" ${name===current?"selected":""}>${esc(name+duty)}</option>`;
  }).join("");
}
function shiftSchedulePage(){
  const factories=shiftFactoryOptions();
  s.shiftFactory=shiftFactoryName(s.shiftFactory);
  if(!factories.includes(s.shiftFactory))s.shiftFactory=factories[0]||"1. Fabrika";
  if(!["Elektrik Bakım","Mekanik Bakım"].includes(s.shiftTeam))s.shiftTeam="Elektrik Bakım";

  const rows=buildTeamWeekSchedule(s.shiftFactory,s.shiftTeam,s.shiftWeekOffset)
    .filter(r=>!s.shiftSearch||r.name.toLocaleLowerCase("tr-TR").includes(s.shiftSearch.toLocaleLowerCase("tr-TR")));

  const monday=weekMonday(s.shiftWeekOffset);
  const dates=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d});

  const coverage=dates.map((d,dayIndex)=>{
    const counts={};
    SHIFT_LABELS.forEach(sh=>counts[sh]=rows.filter(r=>r.days[dayIndex]?.shift===sh).length);
    return counts;
  });
  const minimumCoverage=Math.min(...coverage.flatMap(c=>SHIFT_LABELS.map(sh=>c[sh])));

  return `${clockBlock()}
  <section class="desktop-page-title shift-page-title">
    <div>
      <span>HAFTALIK BAKIM ORGANİZASYONU</span>
      <h1>${esc(s.shiftFactory)} ${esc(s.shiftTeam)} Vardiya Çizelgesi</h1>
      <p>Bu çizelgede yalnızca seçilen fabrikanın ${esc(s.shiftTeam.toLocaleLowerCase("tr-TR"))} personelleri yer alır.${s.shiftFactory==="2. Fabrika"?" A ve B Blok ortak bakım ekibi olarak değerlendirilir.":""} ${canManageShiftTeam(s.shiftTeam)?"Vardiya hücrelerini değiştirebilirsiniz.":"Çizelge salt okunur görüntüleniyor."}</p>
    </div>
    <div class="week-nav">
      <button id="prevShiftWeek">‹</button>
      <div><small>SEÇİLİ HAFTA</small><b>${weekRangeText(s.shiftWeekOffset)}</b></div>
      <button id="nextShiftWeek">›</button>
    </div>
  </section>

  <section class="shift-filter-card team-only">
    <label>Fabrika
      <select id="shiftFactory">${opts(factories,"Fabrika",s.shiftFactory)}</select>
    </label>
    <label>Bakım Ekibi
      <select id="shiftTeam">
        <option ${s.shiftTeam==="Elektrik Bakım"?"selected":""}>Elektrik Bakım</option>
        <option ${s.shiftTeam==="Mekanik Bakım"?"selected":""}>Mekanik Bakım</option>
      </select>
    </label>
    <label>Personel Ara
      <input id="shiftSearch" value="${esc(s.shiftSearch)}" placeholder="İsim yazın">
    </label>
  </section>

  <section class="shift-summary">
    <div><small>TOPLAM PERSONEL</small><b>${rows.length}</b></div>
    <div><small>ÇİZELGE TÜRÜ</small><b>${esc(s.shiftTeam)}</b></div>
    <div><small>HER VARDİYADA EN AZ</small><b>${minimumCoverage} kişi</b></div>
  </section>

  <section class="shift-table-wrap">
    <table class="shift-table">
      <thead>
        <tr>
          <th>Personel</th>
          ${dates.map((d,i)=>`<th><span>${SHIFT_DAY_NAMES[i]}</span><small>${d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"})}</small></th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map(r=>`<tr>
          <td>
            <button class="shift-person-button" data-shift-person="${esc(r.id)}">
              <i>${esc(r.name.charAt(0))}</i>
              <span><b>${esc(r.name)}</b><small>ID: ${esc(r.id)}</small></span>
            </button>
          </td>
          ${r.days.map((d,i)=>`<td>${canManageShiftTeam(s.shiftTeam)
            ?`<select class="shift-assignment-select ${shiftClass(d.shift)} ${s.shiftWeekOffset===0&&i===(new Date().getDay()+6)%7?"today":""}" data-shift-person-id="${esc(r.id)}" data-shift-day="${i}">
                ${SHIFT_LABELS.map(sh=>`<option value="${sh}" ${d.shift===sh?"selected":""}>${sh}</option>`).join("")}
              </select>`
            :`<span class="shift-cell ${shiftClass(d.shift)} ${s.shiftWeekOffset===0&&i===(new Date().getDay()+6)%7?"today":""}">${esc(d.shift)}</span>`}</td>`).join("")}
        </tr>`).join("")||`<tr><td colspan="8"><div class="compact-empty"><span>!</span><p>Bu ekipte personel bulunamadı.</p></div></td></tr>`}
      </tbody>
    </table>
  </section>

  <section class="shift-coverage-panel">
    <div class="coverage-head"><div><span>VARDİYA DOLULUK KONTROLÜ</span><h3>Her vardiyada en az bir personel</h3></div><b class="${minimumCoverage>=1?"ok":"warn"}">${minimumCoverage>=1?"Uygun":"Eksik"}</b></div>
    <div class="coverage-grid">
      ${dates.map((d,dayIndex)=>`<div>
        <strong>${SHIFT_DAY_NAMES[dayIndex]}</strong>
        ${SHIFT_LABELS.map(sh=>`<span><i class="${shiftClass(sh)}"></i>${sh}<b>${coverage[dayIndex][sh]} kişi</b></span>`).join("")}
      </div>`).join("")}
    </div>
  </section>

  <div class="shift-legend">
    <span><i class="night"></i>00-08</span>
    <span><i class="morning"></i>08-16</span>
    <span><i class="evening"></i>16-24</span>
  </div>`;
}
function shiftPersonModal(){
  if(!s.shiftPersonModal)return "";
  const person=allMaintenanceAccounts().find(p=>p.id===s.shiftPersonModal);
  if(!person)return "";
  const factory=s.shiftFactory;
  const rows=buildTeamWeekSchedule(factory,person.team,s.shiftWeekOffset);
  const row=rows.find(r=>r.id===person.id);
  if(!row)return "";
  return `<div class="modal-backdrop" id="closeShiftPerson"><div class="modal shift-person-modal" onclick="event.stopPropagation()">
    <button class="modal-close" id="closeShiftPersonBtn">×</button>
    <div class="shift-person-profile">
      <i>${esc(person.name.charAt(0))}</i>
      <div><span>BAKIM PERSONELİ</span><h2>${esc(person.name)}</h2><p>${esc(person.team)} · ${esc(factory)}</p></div>
    </div>
    <div class="shift-person-details">
      <div><small>PERSONEL ID</small><b>${esc(person.id)}</b></div>
      <div><small>EKİP</small><b>${esc(person.team)}</b></div>
      <div><small>HAFTA</small><b>${weekRangeText(s.shiftWeekOffset)}</b></div>
    </div>
    <div class="shift-person-week">
      ${row.days.map((d,i)=>`<div><span>${SHIFT_DAY_NAMES[i]} · ${d.date.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"})}</span><b class="${shiftClass(d.shift)}">${esc(d.shift)}</b></div>`).join("")}
    </div>
  </div></div>`;
}
function onDutyDashboardCard(factory){
  factory=shiftFactoryName(factory);
  const current=currentShiftLabel();
  const electrical=activeTeamMembers(factory,"Elektrik Bakım");
  const mechanical=activeTeamMembers(factory,"Mekanik Bakım");
  const names=list=>list.map(p=>`<li><i>${esc(p.name.charAt(0))}</i><span><b>${esc(p.name)}</b><small>${esc(p.team)}</small></span></li>`).join("")||"<li class='empty-duty'>Görevli bulunamadı</li>";

  return `<section class="card on-duty-card">
    <div class="on-duty-head">
      <div><span>AKTİF VARDİYADAKİ BAKIMCILAR</span><h3>${esc(factory)} · ${esc(current)}</h3></div>
      <button data-p="shifts">Vardiya Çizelgesi ›</button>
    </div>
    <div class="on-duty-columns">
      <div><h4>⚡ Elektrik Bakım <em>${electrical.length} kişi</em></h4><ul>${names(electrical)}</ul></div>
      <div><h4>⚙ Mekanik Bakım <em>${mechanical.length} kişi</em></h4><ul>${names(mechanical)}</ul></div>
    </div>
  </section>`;
}

function dashboard(){
  let all=visibleFaults();
  if(s.dashboardFactory!=="Tümü")all=all.filter(x=>x.factory===s.dashboardFactory);

  const active=all
    .filter(x=>x.status!=="done")
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const currentShiftAll=all
    .filter(isInCurrentShift)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const currentShiftActive=currentShiftAll
    .filter(x=>x.status!=="done")
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const open=currentShiftActive.filter(x=>x.status==="open").length;
  const progress=currentShiftActive.filter(x=>x.status==="progress").length;
  const stopped=currentShiftActive.filter(x=>x.stopped).length;
  const shiftTotal=currentShiftActive.length;

  const allowedFactories=userFactories();
  const factoryOptions=permissions().allFactories?["Tümü",...Object.keys(FACTORIES)]:["Tümü",...allowedFactories];
  const departmentBadge=roleIsDepartmentLimited()?`<div class="scope-badge">Yetki alanı: ${esc(s.user.department)}</div>`:"";
  const shift=shiftInfo();

  if(isOperator()){
    return `${clockBlock()}
    <div class="head operator-head">
      <div>
        <h1>Operatör Paneli</h1>
        <p>Arıza kaydı açabilir, kendi kayıtlarınızın durumunu ve vardiyadaki bakım personellerini görebilirsiniz.</p>
      </div>
      <div class="home-action-buttons">
        <button type="button" class="qr-home-button" id="openQrScanner">▣ QR Kod Tara</button>
        <button class="primary operator-new-btn" data-p="new">+ Arıza Kaydı Aç</button>
      </div>
    </div>

    <div class="qr-home-card">
      <div class="qr-home-symbol">▣</div>
      <div><b>Makine QR Kodunu Tara</b><span>Makine bilgilerini görüntüle ve doğrudan arıza kaydı oluştur.</span></div>
      <button type="button" class="primary" id="openQrScannerCard">Kamerayı Aç</button>
    </div>

    <div class="grid operator-grid">
      <div class="card"><div class="label">Yeni Arıza</div><div class="value">${open}</div></div>
      <div class="card"><div class="label">İşlemde</div><div class="value">${progress}</div></div>
      <div class="card"><div class="label">Üretim Duruşu</div><div class="value">${stopped}</div></div>
      <div class="card"><div class="label">${shift.name}</div><div class="value">${shiftTotal}</div></div>
    </div>
    ${(()=>{const crew=currentMaintenanceCrewForUser();return `<section class="operator-crew-card"><div><small>AKTİF VARDİYA · ${esc(crew.factory)}</small><h3>Vardiyadaki Bakım Personelleri</h3></div><article><b>Elektrik Bakım</b><span>${crew.electrical.map(esc).join(" · ")||"Personel bulunamadı"}</span></article><article><b>Mekanik Bakım</b><span>${crew.mechanical.map(esc).join(" · ")||"Personel bulunamadı"}</span></article><button data-p="shifts" class="secondary">Tüm Çizelgeyi Gör</button></section>`})()}

    <div class="section">
      <div class="section-title-row">
        <div>
          <h3>Açtığım Arıza Kayıtlarının Durumu</h3>
          <p>Kendi bölümünüzde sizin tarafınızdan açılan kayıtlar</p>
        </div>
        <span class="count-badge">${currentShiftActive.length} aktif</span>
      </div>
      ${table([...visibleFaults()].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)))}
    </div>`;
  }

  const trendFaults=chartRangeFaultsFor(all,"trend");
  const departmentFaults=chartRangeFaultsFor(all,"department");
  const typeFaults=chartRangeFaultsFor(all,"type");
  const downtimeFaults=chartRangeFaultsFor(all,"downtime");

  const trend=trendDataFor(all,"trend");
  const departmentData=countBy(departmentFaults,"department").slice(0,6).map(([label,value])=>({label,value}));
  const typeData=countBy(typeFaults,"type").map(([label,value])=>({label,value}));
  const stoppedByDepartment=countBy(downtimeFaults.filter(x=>x.stopped),"department").slice(0,6).map(([label,value])=>({label,value}));

  const urgent=active.slice(0,4);
  const factoryLabel=s.dashboardFactory==="Tümü"?"Tüm Fabrikalar":s.dashboardFactory;
  const totalToday=all.filter(x=>{
    const d=new Date(x.createdAt),n=new Date();
    return d.toDateString()===n.toDateString();
  }).length;

  const dashboardWorkOrders=canAccess("work")
    ?visibleWorkItems().filter(item=>item.kind==="workorder"&&!['done','cancelled'].includes(item.status)).slice(0,12)
    :[];

  const dashboardFactories=s.dashboardFactory==="Tümü"
    ?[...new Set(userFactories().map(shiftFactoryName))]
      .filter(factory=>["1. Fabrika","2. Fabrika"].includes(factory))
    :[shiftFactoryName(s.dashboardFactory)];
  const dashboardFactoryForOps=dashboardFactories[0]||"1. Fabrika";
  const dashboardToday=dateKeyLocal(new Date());

  const dashboardDaily=dashboardFactories.reduce((summary,factory)=>{
    const stats=dailyCompletionStats(factory,dashboardToday);
    summary.total+=stats.total;
    summary.done+=stats.done;
    summary.pending+=stats.pending;
    return summary;
  },{total:0,done:0,pending:0});
  dashboardDaily.percent=dashboardDaily.total
    ?Math.round(dashboardDaily.done/dashboardDaily.total*100)
    :0;

  const dashboardWaterRecords=dashboardFactories.map(factory=>{
    const waterAsset=dailyAssetsForFactory(factory).find(asset=>asset.type==="water");
    const record=waterAsset?dailyCheckRecord(dashboardToday,factory,waterAsset.id):null;
    return {
      factory,
      taken:!!(record&&record.status==="done"),
      record
    };
  });
  const dashboardWaterTaken=dashboardWaterRecords.filter(item=>item.taken).length;
  const dashboardWaterTotal=dashboardWaterRecords.length;
  const dashboardWaterAllTaken=dashboardWaterTotal>0&&dashboardWaterTaken===dashboardWaterTotal;
  const dashboardWaterNoneTaken=dashboardWaterTaken===0;
  const dashboardWaterLabel=dashboardWaterAllTaken
    ?"Alındı"
    :dashboardWaterNoneTaken
      ?"Alınmadı"
      :`${dashboardWaterTaken}/${dashboardWaterTotal} Fabrikada Alındı`;
  const dashboardWaterDetail=dashboardWaterRecords
    .map(item=>`${item.factory.replace(" Fabrika","")}: ${item.taken?"Alındı":"Alınmadı"}`)
    .join(" · ");

  const plannedToday=visibleMaintenances().filter(item=>dateOnly(item.date||item.startDate||item.plannedDate||item.createdAt)===dateOnly(new Date())).length;
  const crewNow={
    electrical:dashboardFactories.flatMap(factory=>activeTeamMembers(factory,"Elektrik Bakım")),
    mechanical:dashboardFactories.flatMap(factory=>activeTeamMembers(factory,"Mekanik Bakım"))
  };
  const recentMaintenanceLogs=visibleMaintenanceLogs().slice(0,6);

  return `
  <section class="app-hero">
    <div class="hero-copy">
      <span class="hero-version">MOBİL PRO v2</span>
      <h1>${isManagementRole()?"Yönetim Paneli":"Ana Panel"}</h1>
      <p>${factoryLabel} · ${shift.name} · ${shift.range}</p>
      <div class="hero-meta">${new Date().toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric",weekday:"long"})}</div>
    </div>
    <button type="button" class="hero-qr" id="openQrScanner"><span>⌗</span><b>QR Tara</b></button>
  </section>

  <section class="quick-actions">
    ${canAccess("new")?`<button data-p="new"><span>＋</span><div><b>Yeni Arıza</b><small>Hızlı kayıt oluştur</small></div></button>`:""}
    <button data-p="faults"><span>≡</span><div><b>Arızalar</b><small>Tüm kayıtları gör</small></div></button>
    <button data-p="layout"><span>⌘</span><div><b>Fabrika Şeması</b><small>Bölüm ve makineleri görüntüle</small></div></button>
    ${canAddMaintenanceLog()?`<button type="button" id="openMaintenanceLog"><span>✎</span><div><b>Yapılan İş Ekle</b><small>Atölye ve saha işini kaydet</small></div></button>`:""}
    ${roleHasCharts()?`<button data-p="report"><span>▥</span><div><b>Grafikler</b><small>Analiz ve performans</small></div></button>`:""}
  </section>

  <section class="mobile-filter-card">
    <div><small>GÖRÜNÜM</small><b>${factoryLabel}</b></div>
    <select id="dashboardFactory">
      ${factoryOptions.map(x=>`<option ${x===s.dashboardFactory||factoryOptions.length===1?"selected":""}>${x}</option>`).join("")}
    </select>
  </section>

  <section class="kpi-title"><h2>Hızlı Göstergeler</h2><span>Canlı</span></section>
  <section class="pro-kpi-grid">
    <article class="pro-kpi red"><div><small>AKTİF ARIZALAR</small><strong>${active.filter(x=>x.status==="open").length}</strong><p>Yeni kayıt</p></div><i>!</i></article>
    <article class="pro-kpi amber"><div><small>İŞLEMDE</small><strong>${active.filter(x=>x.status==="progress").length}</strong><p>Bakım devam ediyor</p></div><i>◷</i></article>
    <article class="pro-kpi green"><div><small>ÜRETİM DURUŞU</small><strong>${active.filter(x=>x.stopped).length}</strong><p>Etkilenen makine</p></div><i>Ⅱ</i></article>
    <article class="pro-kpi blue"><div><small>BUGÜN AÇILAN</small><strong>${totalToday}</strong><p>Arıza kaydı</p></div><i>▤</i></article>
  </section>

  <section class="dashboard-insight-grid">
    <article><small>BUGÜNKÜ PLANLI BAKIM</small><b>${plannedToday}</b><span>takvimdeki görev</span></article>

    <article class="dashboard-control-status ${dashboardDaily.pending===0&&dashboardDaily.total>0?"complete":"pending"}" ${canAccess("dailyChecks")?'data-p="dailyChecks" role="button" tabindex="0"':""}>
      <small>GÜNLÜK KONTROLLER</small>
      <b>%${dashboardDaily.percent} Tamamlandı</b>
      <span><strong>${dashboardDaily.done}</strong> tamamlandı · <strong>${dashboardDaily.pending}</strong> tamamlanmadı</span>
    </article>

    <article class="dashboard-water-status ${dashboardWaterAllTaken?"complete":dashboardWaterNoneTaken?"pending":"partial"}" ${canAccess("dailyChecks")?'data-p="dailyChecks" role="button" tabindex="0"':""}>
      <small>SU DEĞERLERİ</small>
      <b>${dashboardWaterLabel}</b>
      <span>${dashboardWaterDetail||"Su deposu kontrol kaydı bulunamadı"}</span>
    </article>

    <article><small>AKTİF İŞ EMRİ</small><b>${dashboardWorkOrders.length}</b><span>bakım işi devam ediyor</span></article>
    <article><small>VARDİYADAKİ BAKIMCI</small><b>${crewNow.electrical.length+crewNow.mechanical.length}</b><span>Elektrik ${crewNow.electrical.length} · Mekanik ${crewNow.mechanical.length}</span></article>
  </section>

  <section class="dashboard-operations-grid ${canAccess("work")?"with-work":"fault-only"}">
    <article class="dashboard-list-card dashboard-fault-hub optimized">
      <div class="section-modern-head">
        <div><h2>Aktif ve Vardiya Arızaları</h2><p>Yoğun vardiyalarda kayıtlar sekmeli ve kaydırılabilir listede gösterilir.</p></div>
        <span class="list-count red">${active.length}</span>
      </div>

      <div class="dashboard-fault-summary">
        <span><small>YENİ</small><b>${active.filter(fault=>fault.status==="open").length}</b></span>
        <span><small>İŞLEMDE</small><b>${active.filter(fault=>fault.status==="progress").length}</b></span>
        <span><small>ÜRETİM DURUŞU</small><b>${active.filter(fault=>fault.stopped).length}</b></span>
        <span><small>BU VARDİYA</small><b>${currentShiftAll.length}</b></span>
      </div>

      ${onDutyDashboardCard(s.dashboardFactory==="Tümü"?(userFactories()[0]||"1. Fabrika"):s.dashboardFactory)}

      <div class="dashboard-fault-tabs">
        <button type="button" data-dashboard-fault-tab="active" class="${s.dashboardFaultTab==="active"?"active":""}">
          Aktif Arızalar <span>${active.length}</span>
        </button>
        <button type="button" data-dashboard-fault-tab="shift" class="${s.dashboardFaultTab==="shift"?"active":""}">
          Bu Vardiya <span>${currentShiftAll.length}</span>
        </button>
      </div>

      <div class="dashboard-fault-scroll">
        ${s.dashboardFaultTab==="shift"
          ?compactFaultList(currentShiftAll,"Bu vardiyada arıza kaydı bulunmuyor.")
          :compactFaultList(active,"Aktif arıza bulunmuyor.")}
      </div>

      <button class="list-footer-link" data-p="faults">Tüm arıza kayıtlarını görüntüle ›</button>
    </article>

    ${canAccess("work")?`<article class="dashboard-list-card dashboard-work-orders-card">
      <div class="section-modern-head">
        <div><h2>Aktif İş Emirleri</h2><p>Atanan, devam eden ve bekleyen bakım işleri</p></div>
        <span class="list-count blue">${dashboardWorkOrders.length}</span>
      </div>
      <div class="dashboard-work-order-list">
        ${dashboardWorkOrders.map(item=>`<button type="button" data-p="work" data-work-detail-id="${esc(item.id)}" class="dashboard-work-order-row">
          <span class="work-order-priority ${{"Acil":"acil","Yüksek":"yuksek","Orta":"orta","Düşük":"dusuk"}[item.priority]||"orta"}">${esc(item.priority||"Orta")}</span>
          <div><b>${esc(item.title)}</b><small>${esc(item.factory)} · ${esc(item.assignedTeam||"Bakım Ekibi")}</small><em>${esc(item.assignedTo||"Personel bekliyor")}</em></div>
          <strong>${esc(workStatusLabel(item.status,"workorder"))}</strong>
        </button>`).join("")||'<div class="compact-empty"><span>✓</span><p>Aktif iş emri bulunmuyor.</p></div>'}
      </div>
      <button class="list-footer-link" data-p="work">Tüm iş emirlerini görüntüle ›</button>
    </article>`:""}
  </section>

  ${canAddMaintenanceLog()||recentMaintenanceLogs.length?`<section class="dashboard-maintenance-log-card">
    <div class="section-modern-head"><div><h2>Son Yapılan Bakım İşleri</h2><p>Arıza ve iş emri dışında tamamlanan atölye veya saha çalışmaları</p></div>${canAddMaintenanceLog()?'<button type="button" class="primary" id="openMaintenanceLogSecondary">+ Yapılan İş Ekle</button>':""}</div>
    <div class="dashboard-maintenance-log-list">${recentMaintenanceLogs.map(log=>`<article><div><small>${esc(log.factory)} · ${new Date(log.performedAt||log.createdAt).toLocaleDateString("tr-TR")}</small><b>${esc(log.title)}</b><span>${esc(log.location||"Konum belirtilmedi")}</span></div><p>${esc(log.description)}</p><strong>${maintenanceLogParticipants(log).map(esc).join(" · ")}</strong></article>`).join("")||'<div class="compact-empty"><span>✎</span><p>Henüz yapılan iş kaydı bulunmuyor.</p></div>'}</div>
  </section>`:""}

  ${shiftPerformanceCard(currentShiftAll)}

  <section class="top-machines-card">
    <div class="section-modern-head">
      <div><h2>En Çok Arıza Çıkaran Makineler</h2><p>Yetki alanınızdaki tüm kayıtlara göre ilk 6 makine</p></div>
      ${roleHasCharts()?'<button data-p="report">Grafiklerde İncele ›</button>':""}
    </div>
    <div class="top-machine-list">
      ${countBy(all,"machine").slice(0,6).map(([machine,total],index)=>{
        const pct=Math.round(total/Math.max(1,countBy(all,"machine")[0]?.[1]||1)*100);
        return `<button class="top-machine-row" data-p="report">
          <span class="machine-rank">${index+1}</span>
          <div class="machine-rank-copy"><b>${esc(machine)}</b><small>${total} arıza kaydı</small><i><em style="width:${pct}%"></em></i></div>
          <strong>${total}</strong>
        </button>`;
      }).join("")}
    </div>
  </section>

  <section class="line-preview-card">
    <div class="section-modern-head">
      <div><h2>Fabrika Şeması Özeti</h2><p>Makine durumlarını hızlı kontrol et</p></div>
      <button data-p="layout">Fabrika Şemasını Aç ›</button>
    </div>
    <div class="mini-process-flow">
      ${["Hammadde Silo","Değirmen","Spray Dryer","Pres","Fırın","Dijital Baskı","Paketleme","Paletleme"].map((m,i)=>{
        const ms=machineState("2. Fabrika A Blok","1. Hat",m);
        const ico=m.includes("Silo")?"⬡":m.includes("Değirmen")?"✣":m.includes("Spray")?"♨":m.includes("Pres")?"▣":m.includes("Fırın")?"🔥":m.includes("Baskı")?"▦":m.includes("Paket")?"▤":"♜";
        return `<button class="mini-machine ${ms.cls}" data-machine="${esc(m)}" data-mf="2. Fabrika A Blok" data-ml="1. Hat"><i>${ico}</i><span>${esc(m)}</span></button>${i<7?'<b class="flow-line">→</b>':''}`;
      }).join("")}
    </div>
  </section>`;

}
