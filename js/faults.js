/* Arıza ve makine geçmişi verileri */
const MACHINE_QR_REGISTRY={
  "F2A-H1-MAS-SD-001":{
    factory:"2. Fabrika A Blok",
    line:"1. Hat",
    department:"Masse Bölümü",
    machine:"Spray Dryer",
    machineCode:"F2A-H1-MAS-SD-001"
  }
};

const SUBJECTS={
  "Elektrik":["Motor termik attı","Sigorta açtı","Kontaktör çekmiyor","Sensör beslemesi yok","Kablo bağlantısı gevşek","Sürücü alarmı","Faz hatası","Etiket yazıcı enerjisiz"],
  "Mekanik":["Rulman sesi","Kayış gevşek","Zincir uzaması","Redüktör yağ kaçağı","Rulo sıkışması","Kaplin aşınması","Titreşim yüksek","Mekanik sürtünme"],
  "Otomasyon":["PLC haberleşme hatası","Encoder senkron hatası","Servo alarmı","HMI bağlantı hatası","Program çevrim hatası","Pozisyon sapması","Profinet bağlantı kesildi","Reçete yüklenemedi"],
  "Pnömatik":["Hava kaçağı","Piston yavaş","Valf bobini arızalı","Basınç düşük","Vakum oluşmuyor","Regülatör ayarsız"],
  "Hidrolik":["Yağ basıncı düşük","Hidrolik kaçak","Valf sıkışması","Pompa sesi","Yağ sıcaklığı yüksek","Filtre tıkalı"],
  "Diğer":["Operatör bildirimi","Temizlik ihtiyacı","Ayar problemi","Malzeme sıkışması","Kalite kaynaklı duruş"]
};

function seededRandom(seed){
  let value=seed % 2147483647;
  return function(){
    value=value*16807%2147483647;
    return (value-1)/2147483646;
  }
}

function generateHistory(){
  const rnd=seededRandom(20260725);
  const factories=Object.keys(FACTORIES);
  const departments=Object.keys(STRUCTURE);
  const types=TYPES;
  const arr=[];
  let id=2000;
  const now=new Date();

  for(let i=0;i<260;i++){
    const factory=factories[Math.floor(rnd()*factories.length)];
    const line=FACTORIES[factory][Math.floor(rnd()*FACTORIES[factory].length)];
    const department=departments[Math.floor(rnd()*departments.length)];
    const machine=STRUCTURE[department][Math.floor(rnd()*STRUCTURE[department].length)];
    const type=types[Math.floor(rnd()*types.length)];
    const subjectList=SUBJECTS[type];
    const subject=subjectList[Math.floor(rnd()*subjectList.length)];
    const daysAgo=2+Math.floor(rnd()*205);
    const start=new Date(now);
    start.setDate(now.getDate()-daysAgo);
    start.setHours(Math.floor(rnd()*24),Math.floor(rnd()*60),0,0);
    const duration=5+Math.floor(rnd()*235);
    const end=new Date(start.getTime()+duration*60000);
    const stopped=rnd()>0.58;
    arr.push({
      id:id++,
      factory,line,department,machine,type,subject,
      description:"Geçmiş örnek arıza kaydı. Müdahale tamamlandı ve kayıt kapatıldı.",
      stopped,photoName:"",status:"done",
      openedBy:deterministicPerson(DEMO_FAULT_OPENERS,id,i),
      assignedTo:"",
      createdAt:start.toISOString(),closedAt:end.toISOString()
    });
    arr[arr.length-1].assignedTo=deterministicPerson(
      maintenanceOptionsForFault(arr[arr.length-1]),arr[arr.length-1].id,i+11
    );
  }

  arr.push(
    {id:1001,factory:"1. Fabrika",line:"1. Hat",department:"Pres Bölümü",machine:"Presler",type:"Hidrolik",subject:"Yağ basıncı düşük",description:"Basınç normal seviyenin altında.",stopped:true,photoName:"",status:"open",openedBy:"Hakan Yıldız",assignedTo:"Üzeyir Toy",createdAt:new Date(Date.now()-42*60000).toISOString(),closedAt:null},
    {id:1002,factory:"2. Fabrika B Blok",line:"2. Hat",department:"Paketleme",machine:"Etiket Yazıcı",type:"Elektrik",subject:"Etiket yazdırmıyor",description:"Yazıcı çevrimiçi ancak çıktı alınamıyor.",stopped:false,photoName:"",status:"progress",openedBy:"Burak Demir",assignedTo:"Mert Yaman",createdAt:new Date(Date.now()-18*60000).toISOString(),closedAt:null}
  );
  return arr;
}

/* Arıza, rapor ve makine ekranları */
function newf(){
  if(!canCreateFault())return `<div class="card empty-panel"><h3>Yetkisiz işlem</h3><p>Arıza kaydını yalnızca operatörler, bölüm formenleri ve üretim müdürü açabilir.</p></div>`;
  return `${clockBlock()}<div class="head"><div><h1>Arıza Kaydı Oluştur</h1><p>Yeni arıza kaydını sisteme ekleyin.</p></div><button type="button" class="qr-scan-button" id="openQrScanner">${qrScanIcon()}<span>QR Kod Tara</span></button></div>
  <div id="qrFilledInfo" class="qr-filled-info"></div><div class="fault-opener-preview"><span>ARIZA KAYDINI AÇAN</span><div><i>${esc((s.user?.name||"?").charAt(0))}</i><b>${esc(s.user?.name||"Giriş yapan kullanıcı")}</b><small>Kullanıcı ID: ${esc(s.user?.id||"-")}</small></div></div>
  <div class="card form"><form id="fault"><div class="formgrid">
  <div class="field"><label>Fabrika</label><select id="factory" required>${opts(userFactories(),"Fabrika seçiniz")}</select></div>
  <div class="field"><label>Hat / Alan</label><select id="line" required disabled>${opts([],"Önce fabrika seçiniz")}</select></div>
  <div class="field"><label>Bölüm</label><select id="department" required disabled>${opts([],"Önce hat seçiniz")}</select></div>
  <div class="field"><label>Makine</label><select id="machine" required disabled>${opts([],"Önce bölüm seçiniz")}</select></div>
  <div class="field"><label>Arıza Tipi</label><select id="type" required>${opts(TYPES)}</select></div>
  <div class="field"><label>Arıza Konusu</label><input id="subject" maxlength="160" required></div>
  <div class="field full"><label>Arıza Açıklaması</label><textarea id="desc" maxlength="2000" required></textarea></div>
  <div class="field"><label>Fotoğraf</label><input type="file" id="photo" accept="image/*" capture="environment"></div>
  <div class="field check"><label><input type="checkbox" id="stopped"> Üretim durdu mu?</label></div>
  </div><div class="actions"><button type="button" class="secondary" data-p="dashboard">İptal</button><button class="primary">Kaydı Oluştur</button></div></form></div>`;
}
function recentShiftWindows(reference=new Date()){
  const hour=reference.getHours();
  const startHour=hour<8?0:hour<16?8:16;
  const currentStart=new Date(reference);
  currentStart.setHours(startHour,0,0,0);
  // Rapor kartları eski vardiyadan güncel vardiyaya doğru okunur.
  return [2,1,0].map(index=>{
    const start=new Date(currentStart.getTime()-index*8*60*60*1000);
    const end=new Date(start.getTime()+8*60*60*1000);
    return {start,end,label:`${String(start.getHours()).padStart(2,"0")}:00–${String(end.getHours()).padStart(2,"0")}:00`,date:start.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"})};
  });
}
function lastThreeShiftReport(){
  const windows=recentShiftWindows();
  const allowedFactory=factory=>s.reportFactory==="Tümü"?userCanSeeFactory(factory):factory===s.reportFactory;
  const inWindow=(date,window)=>{const value=new Date(date);return Number.isFinite(value.getTime())&&value>=window.start&&value<window.end};
  const entries=windows.map(window=>{
    const faults=visibleFaults().filter(item=>allowedFactory(item.factory)&&inWindow(item.closedAt||item.createdAt,window));
    const logs=(s.maintenanceLogs||[]).filter(item=>allowedFactory(item.factory)&&inWindow(item.performedAt||item.createdAt,window));
    const work=(s.workItems||[]).filter(item=>item.kind==="workorder"&&allowedFactory(item.factory)&&inWindow(item.completedAt||item.createdAt,window));
    const planned=(s.plannedMaintenances||[]).filter(item=>allowedFactory(item.factory)&&item.status==="done"&&inWindow(item.updatedAt||`${item.date}T${item.time||"00:00"}`,window));
    const rows=[
      ...faults.map(item=>({at:item.closedAt||item.createdAt,type:"Arıza",title:item.subject,location:`${item.factory} · ${item.department} · ${item.machine}`,person:item.assignedTo||"Atama bekliyor",status:item.status==="done"?"Tamamlandı":"Açık"})),
      ...logs.map(item=>({at:item.performedAt||item.createdAt,type:item.workType||"Yapılan İş",title:item.title,location:`${item.factory} · ${item.location||"Konum belirtilmedi"}`,person:(item.participants||[]).join(", ")||item.createdBy,status:"Kaydedildi"})),
      ...work.map(item=>({at:item.completedAt||item.createdAt,type:"İş Emri",title:item.title,location:`${item.factory} · ${item.department}`,person:item.completedBy||item.assignedTo||"-",status:workStatusLabel(item.status,"workorder")})),
      ...planned.map(item=>({at:item.updatedAt||`${item.date}T${item.time||"00:00"}`,type:"Planlı Bakım",title:item.title,location:`${item.factory} · ${item.department} · ${item.machine}`,person:item.assigned||item.updatedBy||"-",status:"Tamamlandı"}))
    ].sort((a,b)=>new Date(a.at)-new Date(b.at));
    return {...window,rows,counts:{faults:faults.length,logs:logs.length,work:work.length,planned:planned.length}};
  });
  const total=entries.reduce((sum,item)=>sum+item.rows.length,0);
  return `<section class="shift-report-section">
    <div class="section-modern-head"><div><span>SON 24 SAAT</span><h2>Son 3 Vardiya Faaliyet Raporu</h2><p>Arızalar, yapılan bakım çalışmaları, iş emirleri ve tamamlanan planlı bakımlar vardiya bazında bir arada.</p></div><b class="shift-report-total">${total} faaliyet</b></div>
    <div class="shift-report-grid">${entries.map(entry=>`<article class="shift-report-card">
      <header><div><small>${entry.date}</small><h3>${entry.label} Vardiyası</h3></div><b>${entry.rows.length}</b></header>
      <div class="shift-report-counts"><span>${entry.counts.faults} arıza</span><span>${entry.counts.logs} yapılan iş</span><span>${entry.counts.work} iş emri</span><span>${entry.counts.planned} planlı bakım</span></div>
      <div class="shift-report-list">${entry.rows.map(row=>`<div><span class="shift-report-type">${esc(row.type)}</span><b>${esc(row.title)}</b><small>${esc(row.location)}</small><em>${fmtDate(row.at)} · ${esc(row.person)} · ${esc(row.status)}</em></div>`).join("")||'<div class="shift-report-empty">Bu vardiyada kayıtlı faaliyet bulunmuyor.</div>'}</div>
    </article>`).join("")}</div>
  </section>`;
}
function reportPage(){
  let base=visibleFaults();
  if(s.reportFactory!=="Tümü")base=base.filter(x=>x.factory===s.reportFactory);
  if(s.reportStart)base=base.filter(x=>new Date(x.createdAt)>=new Date(s.reportStart+"T00:00:00"));
  if(s.reportEnd)base=base.filter(x=>new Date(x.createdAt)<=new Date(s.reportEnd+"T23:59:59"));

  const trend=trendDataFor(base,"trend");
  const shiftTrend=trendDataFor(base,"shiftTrend");
  const departmentData=countBy(chartRangeFaultsFor(base,"department"),"department").slice(0,10).map(([label,value])=>({label,value}));
  const typeData=countBy(chartRangeFaultsFor(base,"type"),"type").map(([label,value])=>({label,value}));
  const downtimeData=countBy(chartRangeFaultsFor(base,"downtime").filter(x=>x.stopped),"department").slice(0,10).map(([label,value])=>({label,value}));
  const statusData=[
    {label:"Yeni",value:chartRangeFaultsFor(base,"status").filter(x=>x.status==="open").length},
    {label:"İşlemde",value:chartRangeFaultsFor(base,"status").filter(x=>x.status==="progress").length},
    {label:"Tamamlandı",value:chartRangeFaultsFor(base,"status").filter(x=>x.status==="done").length}
  ];
  const machineData=countBy(chartRangeFaultsFor(base,"machineRank"),"machine").slice(0,12).map(([label,value])=>({label,value}));
  const completed=base.filter(x=>x.status==="done");
  const stoppedFaults=base.filter(x=>x.stopped);
  const averageMinutes=items=>items.length?Math.round(items.reduce((sum,item)=>sum+durationMs(item)/60000,0)/items.length):0;
  const mttr=averageMinutes(completed);
  const totalDowntimeMinutes=Math.round(stoppedFaults.reduce((sum,item)=>sum+durationMs(item)/60000,0));
  const responseRecords=base.filter(x=>x.claimedAt&&new Date(x.claimedAt)>=new Date(x.createdAt));
  const avgResponse=responseRecords.length?Math.round(responseRecords.reduce((sum,item)=>sum+(new Date(item.claimedAt)-new Date(item.createdAt))/60000,0)/responseRecords.length):0;
  const completionRate=base.length?Math.round(completed.length/base.length*100):0;
  const averageByDepartment=(items,valueFn)=>countBy(items,"department").map(([label])=>{
    const group=items.filter(x=>(x.department||"Belirtilmemiş")===label);
    return {label,value:group.length?Math.round(group.reduce((sum,item)=>sum+valueFn(item),0)/group.length):0};
  }).slice(0,10);
  const responseByDepartment=averageByDepartment(responseRecords,item=>Math.max(0,(new Date(item.claimedAt)-new Date(item.createdAt))/60000));
  const repairByDepartment=averageByDepartment(completed,item=>durationMs(item)/60000);
  const repeatData=countBy(chartRangeFaultsFor(base,"repeatSubject"),"subject").filter(([,value])=>value>1).slice(0,10).map(([label,value])=>({label,value}));
  const personnelMap=new Map();
  completed.forEach(item=>faultParticipants(item).forEach(name=>personnelMap.set(name,(personnelMap.get(name)||0)+1)));
  const personnelData=[...personnelMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([label,value])=>({label,value}));
  const factoryOptions=permissions().allFactories?["Tümü",...Object.keys(FACTORIES)]:["Tümü",...userFactories()];

  return `${clockBlock()}
  <section class="desktop-page-title charts-title">
    <div><span>ANALİZ VE RAPORLAMA MERKEZİ</span><h1>Raporlama ve Grafikler</h1><p>Arıza, müdahale, duruş ve bakım performansını tek ekrandan inceleyin.</p></div>
  </section>
  <section class="charts-global-filter">
    <label>Başlangıç Tarihi<input type="date" id="reportStart" value="${s.reportStart}"></label>
    <label>Bitiş Tarihi<input type="date" id="reportEnd" value="${s.reportEnd}"></label>
    <label>Fabrika<select id="reportFactory">${factoryOptions.map(x=>`<option ${x===s.reportFactory?"selected":""}>${x}</option>`).join("")}</select></label>
    <button class="secondary" id="clearReport">Filtreleri Temizle</button>
  </section>
  <section class="report-summary-grid">
    <article><small>TOPLAM ARIZA</small><b>${base.length}</b><span>seçili filtrelerde</span></article>
    <article><small>TAMAMLANMA ORANI</small><b>%${completionRate}</b><span>${completed.length} tamamlandı</span></article>
    <article><small>ORT. MÜDAHALEYE BAŞLAMA</small><b>${avgResponse} dk</b><span>${responseRecords.length} üstlenme kaydı</span></article>
    <article><small>MTTR</small><b>${mttr} dk</b><span>ortalama onarım süresi</span></article>
    <article><small>TOPLAM DURUŞ</small><b>${Math.floor(totalDowntimeMinutes/60)} sa ${totalDowntimeMinutes%60} dk</b><span>${stoppedFaults.length} duruş kaydı</span></article>
  </section>
  ${lastThreeShiftReport()}
  <section class="charts-dashboard-grid">
    <article class="analytics-chart-card wide">
      <div class="chart-panel-head"><div><h3>Arıza Trendi</h3><p>Zamana göre açılan arıza sayısı</p></div>${chartRangeControlsFor("trend")}</div>
      ${lineChartSVG(trend.length?trend:[{label:"Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Vardiya Trendi</h3><p>Vardiyalara göre arıza yoğunluğu</p></div>${chartRangeControlsFor("shiftTrend")}</div>
      ${lineChartSVG(shiftTrend.length?shiftTrend:[{label:"Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Durum Dağılımı</h3><p>Yeni, işlemde ve tamamlanan işler</p></div>${chartRangeControlsFor("status")}</div>
      ${barChartSVG(statusData,"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Bölümlere Göre Arıza</h3><p>En yoğun bölümler</p></div>${chartRangeControlsFor("department")}</div>
      ${barChartSVG(departmentData.length?departmentData:[{label:"Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Arıza Tipleri</h3><p>Elektrik, mekanik ve diğer tipler</p></div>${chartRangeControlsFor("type")}</div>
      ${barChartSVG(typeData.length?typeData:[{label:"Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Üretim Duruşları</h3><p>Bölümlere göre duruş oluşturan arızalar</p></div>${chartRangeControlsFor("downtime")}</div>
      ${barChartSVG(downtimeData.length?downtimeData:[{label:"Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card wide">
      <div class="chart-panel-head"><div><h3>En Çok Arıza Çıkaran Makineler</h3><p>Makine bazında arıza sıralaması</p></div>${chartRangeControlsFor("machineRank")}</div>
      ${barChartSVG(machineData.length?machineData:[{label:"Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Ort. Müdahaleye Başlama Süresi</h3><p>Bölümlere göre dakika cinsinden</p></div></div>
      ${barChartSVG(responseByDepartment.length?responseByDepartment:[{label:"Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Ort. Onarım Süresi</h3><p>Bölümlere göre MTTR (dakika)</p></div></div>
      ${barChartSVG(repairByDepartment.length?repairByDepartment:[{label:"Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Tekrarlayan Arızalar</h3><p>Aynı arıza konusunun tekrar sayısı</p></div>${chartRangeControlsFor("repeatSubject")}</div>
      ${barChartSVG(repeatData.length?repeatData:[{label:"Tekrarlayan Kayıt Yok",value:0}],"")}
    </article>
    <article class="analytics-chart-card">
      <div class="chart-panel-head"><div><h3>Personel Tamamlama Dağılımı</h3><p>Tamamlanan arızalarda görev alan personeller</p></div></div>
      ${barChartSVG(personnelData.length?personnelData:[{label:"Kayıt Yok",value:0}],"")}
    </article>
  </section>`;
}
function machineState(factory,line,machine){
  const active=s.faults.find(x=>x.factory===factory&&x.line===line&&x.machine===machine&&x.status!=="done");
  if(!active)return {cls:"running",text:"Çalışıyor"};
  if(active.stopped)return {cls:"stopped",text:"Duruş"};
  return {cls:"warning",text:"Arızalı"};
}
function layoutPage(){
  const factory=s.layoutFactory;
  const lines=catalogLines(factory);
  if(!lines.includes(s.layoutLine))s.layoutLine=lines[0]||"";
  const line=s.layoutLine;

  const availableDepartments=catalogDepartments(factory,line);
  if(!s.layoutDepartment || !availableDepartments.includes(s.layoutDepartment)){
    s.layoutDepartment=roleIsDepartmentLimited()&&s.user?.department&&availableDepartments.includes(s.user.department)
      ?s.user.department
      :availableDepartments[0]||"";
  }

  const department=s.layoutDepartment;
  const machines=catalogMachines(factory,line,department);

  const iconFor=m=>{
    const u=m.toLocaleUpperCase("tr-TR");
    return u.includes("SİLO")?"⬡":u.includes("DEĞİRMEN")?"✣":u.includes("SPRAY")?"♨":
      u.includes("PRES")?"▣":u.includes("FIRIN")?"🔥":u.includes("DİJİTAL")?"▦":
      u.includes("POLİSAJ")||u.includes("PARLATMA")?"◉":u.includes("PAKET")?"▤":
      u.includes("PALET")?"♜":u.includes("STREÇ")?"◎":u.includes("BANT")||u.includes("KONVEYÖR")?"⇢":
      u.includes("AGV")||u.includes("TGV")?"◆":u.includes("TANK")||u.includes("KAZAN")?"◒":"⚙";
  };

  const departmentCards=availableDepartments
    .filter(dept=>!roleIsDepartmentLimited()||dept===s.user.department)
    .map(dept=>{
      const deptMachines=catalogMachines(factory,line,dept);
      const activeCount=deptMachines.filter(m=>machineState(factory,line,m).cls!=="running").length;
      return `<button class="factory-department-card ${dept===department?"active":""}" data-department="${esc(dept)}">
        <div><span>${deptMachines.length}</span><small>makine</small></div>
        <section><h3>${esc(dept)}</h3><p>${activeCount?`${activeCount} aktif arıza / uyarı`:"Tüm makineler çalışıyor"}</p></section>
        <b>›</b>
      </button>`;
    }).join("");

  const managementPanel=canManageMachines()?`<details class="machine-management-panel">
    <summary><span>＋</span><div><b>Makine Kataloğunu Yönet</b><small>Seçili fabrika, hat ve bölüme yeni makine ekleyin. Makine silme yalnızca makine detay ekranından yapılır.</small></div><i>⌄</i></summary>
    <form id="machineCatalogForm" class="machine-management-form">
      <label>Fabrika<input value="${esc(factory)}" readonly></label>
      <label>Hat / Alan<input value="${esc(line)}" readonly></label>
      <label>Bölüm<input value="${esc(department)}" readonly></label>
      <label class="machine-name-input">Yeni Makine / Ekipman Adı<input id="newMachineName" maxlength="120" placeholder="Örn. 5. PRES BESLEME KONVEYÖRÜ" required></label>
      <button type="submit" class="primary">Seçili Bölüme Ekle</button>
    </form>
    <p class="machine-management-note">Makine silindiğinde eski arıza ve bakım kayıtları korunur; yalnızca yeni seçim listelerinden kaldırılır.</p>
  </details>`:"";

  return `
  <section class="layout-hero">
    <div><span>FABRİKA VE BÖLÜM GÖRÜNÜMÜ</span><h1>Fabrika Şeması</h1><p>${esc(factory)} · ${esc(line)} · ${esc(department||"Bölüm seçiniz")}</p></div>
    <div class="layout-live-dot">● CANLI</div>
  </section>

  <section class="layout-control-modern factory-schema-controls">
    <label>Fabrika<select id="layoutFactory">${opts(userFactories(),"Seçiniz",factory)}</select></label>
    <label>Hat / Alan<select id="layoutLine">${opts(lines,"Seçiniz",line)}</select></label>
    <label>Bölüm<select id="layoutDepartment">${opts(availableDepartments,"Bölüm seçiniz",department)}</select></label>
    <div class="layout-status-legend"><span><i class="running"></i>Çalışıyor</span><span><i class="warning"></i>Arızalı</span><span><i class="stopped"></i>Duruş</span></div>
  </section>

  ${managementPanel}

  <section class="factory-schema-layout">
    <aside class="factory-department-list">
      <div class="factory-department-head"><h2>Bölümler</h2><p>Görüntülemek istediğin bölümü seç</p></div>
      <div class="factory-department-cards">${departmentCards||'<div class="compact-empty"><span>!</span><p>Bu hatta bölüm bulunamadı.</p></div>'}</div>
    </aside>

    <section class="factory-machine-area">
      <div class="factory-machine-head">
        <div><span>SEÇİLİ BÖLÜM</span><h2>${esc(department||"Bölüm seçiniz")}</h2><p>${machines.length} makine / ekipman listeleniyor.</p></div>
        <div class="factory-machine-summary">
          <div><small>TOPLAM</small><b>${machines.length}</b></div>
          <div><small>ARIZALI</small><b>${machines.filter(m=>machineState(factory,line,m).cls!=="running").length}</b></div>
        </div>
      </div>

      <div class="factory-machine-grid">
        ${machines.map((machine,index)=>{
          const state=machineState(factory,line,machine);
          return `<article class="factory-machine-card-shell ${state.cls}">
            <button class="factory-machine-card ${state.cls}" data-machine="${esc(machine)}" data-mf="${esc(factory)}" data-ml="${esc(line)}" data-md="${esc(department)}">
              <div class="factory-machine-icon">${iconFor(machine)}</div>
              <div class="factory-machine-copy">
                <span>Makine ${String(index+1).padStart(2,"0")} ${isCustomMachine(factory,line,department,machine)?"· Kullanıcı Eklemesi":""}</span>
                <h3>${esc(machine)}</h3>
                <p>${esc(department)}</p>
              </div>
              <div class="factory-machine-status"><i></i><b>${state.text}</b></div>
            </button>
          </article>`;
        }).join("")||'<div class="compact-empty"><span>!</span><p>Bu bölümde makine bulunamadı.</p></div>'}
      </div>
    </section>
  </section>`;
}

function faultDetailModal(){
  if(!s.faultModalId)return "";
  const f=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
  if(!f)return "";
  const isDone=f.status==="done";
  const productionText=f.stopped?"Evet — üretim durdu":"Hayır";
  const closeDate=f.closedAt?fmtDate(f.closedAt):"-";
  const photo=f.photoName?`<div class="fault-detail-photo"><span>EKLENEN FOTOĞRAF</span><b>${esc(f.photoName)}</b><small>Demo sürümünde yalnızca dosya adı saklanmaktadır.</small></div>`:"";
  const participants=faultParticipants(f);
  const canManageParticipants=canManageFaultParticipants(f);
  const candidates=participantCandidateNames(f);
  const assignmentControl=canManageParticipants
    ?`<div class="participant-selector"><div class="participant-help">${s.user?.role==="Bakım Personeli"?"Aktif vardiyadaki ekip arkadaşlarınız ve daha önce müdahale edenler gösterilir.":"Birden fazla bakım personeli seçebilirsiniz."}</div>${candidates.map(name=>`<label><input type="checkbox" class="fault-participant-check" value="${esc(name)}" ${participants.includes(name)?"checked":""}><span>${esc(name)}</span>${activeParticipantCandidates(f).includes(name)?'<small>Aktif vardiya</small>':""}</label>`).join("")}</div>`
    :`<div class="participant-chips">${participants.map(name=>`<span>${esc(name)}</span>`).join("")||'<span>Personel atanmadı</span>'}</div>`;
  const claimButton=canClaimFault(f)?`<button type="button" class="primary fault-claim-button" id="faultClaimButton">Arızayı Üstlen ve Müdahaleyi Başlat</button>`:"";
  const selfJoin=canSelfJoinFault(f)?`<button type="button" class="primary fault-self-join" id="faultSelfJoin">+ Ben de Müdahale Ediyorum</button>`:"";
  const handoverCandidates=nextShiftMembersForFault(f);
  const handoverSection=canHandoverFault(f)?`<section class="fault-detail-card wide fault-handover-card"><div class="fault-handover-head"><div><span>VARDİYA DEVİR İŞLEMİ</span><p>Devam eden arızayı bir sonraki vardiyadaki personele devredin. Önceki müdahale edenler kayıtta kalır.</p></div><b>${esc(currentShiftLabel())} → ${esc(nextShiftLabel())}</b></div><form id="faultHandoverForm" class="fault-handover-form"><div class="field"><label>Devredilecek Personel *</label><select id="faultHandoverTo" required><option value="">Sonraki vardiyadan seçiniz</option>${handoverCandidates.map(name=>`<option>${esc(name)}</option>`).join("")}</select></div><div class="field handover-note"><label>Devir Notu *</label><input id="faultHandoverNote" maxlength="500" placeholder="Yapılan işlem, beklenen parça ve sonraki kontrol bilgisi" required></div><button type="submit" class="primary">Arızayı Devret</button></form>${handoverCandidates.length?"":'<div class="solution-missing-message">Sonraki vardiyada uygun personel bulunamadı. Bakım formeni vardiya planını kontrol etmelidir.</div>'}</section>`:"";
  const handoverHistory=(f.handovers||[]).length?`<section class="fault-detail-card wide"><div class="section-modern-head"><div><h3>Arıza Devir Geçmişi</h3><p>Vardiyalar arasındaki teslim kayıtları</p></div></div><div class="fault-handover-history">${[...(f.handovers||[])].reverse().map(h=>`<article><span>${fmtDate(h.at)}</span><b>${esc(h.from)} → ${esc(h.to)}</b><small>${esc(h.fromShift||"-")} → ${esc(h.toShift||"-")}</small><p>${esc(h.note||"Devir notu girilmedi.")}</p></article>`).join("")}</div></section>`:"";
  const statusControl=canUpdateFaultStatus(f)?`<select id="faultModalStatus" class="sel fault-modal-status"><option value="open" ${f.status==="open"?"selected":""}>Yeni</option><option value="progress" ${f.status==="progress"?"selected":""}>İşlemde</option><option value="done" ${f.status==="done"?"selected":""}>Tamamlandı</option></select>`:`<span class="status ${esc(f.status)}">${statusLabel(f.status)}</span>`;
  const canEditSolution=canUpdateFaultStatus(f);
  const solutionText=String(f.solutionText||"");
  const hasSolution=solutionText.trim().length>0;
  const solutionMeta=f.solutionBy||f.solutionAt?`<div class="fault-solution-meta"><span>Yazan: <b>${esc(f.solutionBy||"Bilinmiyor")}</b></span><span>${f.solutionAt?fmtDate(f.solutionAt):""}</span></div>`:"";
  const solutionStateText=isDone?(hasSolution?"Tamamlandı":"Arıza çözümü yazılmadı"):(hasSolution?"Çözüm kaydedildi":"Çözüm bekleniyor");
  const solutionSection=`<section class="fault-detail-card wide fault-solution-card ${isDone?"completed":""} ${isDone&&!hasSolution?"missing-solution":""}"><div class="fault-solution-head"><div><span>ÇÖZÜM VE YAPILAN İŞLEM</span><p>Arıza tamamlandığında yapılan işlemi yazabilirsiniz. Çözüm yazısı zorunlu değildir.</p></div><strong>${solutionStateText}</strong></div>${canEditSolution?`<textarea id="faultSolutionText" maxlength="1500" placeholder="Yapılan işlem ve sonucu yazın.">${esc(solutionText)}</textarea><div class="fault-solution-actions"><small><span id="faultSolutionCount">${solutionText.length}</span>/1500 karakter</small><button type="button" class="secondary" id="faultSolutionSave">Çözüm Yazısını Kaydet</button></div>${isDone&&!hasSolution?'<div class="solution-missing-message">Tamamlandı · Arıza çözümü yazılmadı.</div>':""}${solutionMeta}`:`${solutionText?`<p class="fault-solution-text">${esc(solutionText)}</p>${solutionMeta}`:(isDone?'<div class="solution-missing-message">Tamamlandı · Arıza çözümü yazılmadı.</div>':'<div class="compact-empty"><span>✎</span><p>Henüz çözüm yazısı girilmedi.</p></div>')}`}</section>`;
  const usedMaterials=faultUsedMaterials(f);
  const missingMaterials=isDone&&!usedMaterials.length;
  const canEditMaterials=canManageFaultMaterials();
  const materialOptions=MATERIALS.slice().sort((a,b)=>a.name.localeCompare(b.name,"tr")).map(m=>`<option value="${esc(m.code)} · ${esc(m.name)}"></option>`).join("");
  const materialSection=`<section class="fault-detail-card wide fault-material-card ${missingMaterials?"missing-materials":""}"><div class="fault-material-head"><div><span>KULLANILAN MALZEMELER</span><p>Bu arızada değiştirilen veya tüketilen yedek parçalar.</p></div><b>${usedMaterials.length} kayıt</b></div><div class="fault-material-list">${usedMaterials.map((item,index)=>{const m=materialById(item.materialId);return `<article><div><small>${esc(m?.code||item.code||"-")}</small><b>${esc(m?.name||item.name||"Malzeme")}</b><span>${esc(item.note||"Açıklama girilmedi.")}</span></div><strong>${Number(item.quantity)||0} ${esc(item.unit||m?.unit||"Adet")}</strong>${canEditMaterials?`<button type="button" class="fault-material-remove danger" data-material-index="${index}">Sil</button>`:""}</article>`}).join("")||'<div class="compact-empty"><span>□</span><p>Bu arızaya henüz malzeme eklenmedi.</p></div>'}</div>${missingMaterials?'<div class="material-missing-message">Tamamlandı · Malzeme girilmedi.</div>':""}${canEditMaterials?`<form id="faultMaterialForm" class="fault-material-form"><div class="field"><label>Malzeme</label><input id="faultMaterialSearch" list="faultMaterialOptions" autocomplete="off" placeholder="Kod veya malzeme adıyla ara..." required><datalist id="faultMaterialOptions">${materialOptions}</datalist></div><div class="field"><label>Miktar</label><input id="faultMaterialQuantity" type="number" min="0.01" step="0.01" value="1" required></div><div class="field material-note-field"><label>Açıklama</label><input id="faultMaterialNote" placeholder="Örn. Motor rulmanı değiştirildi"></div><button class="primary" type="submit">+ Malzeme Ekle</button></form>`:""}</section>`;

  return `<div class="modal-backdrop fault-detail-backdrop" id="faultModalCloseBg"><div class="modal fault-detail-modal"><div class="modal-head"><div><span class="fault-detail-id">ARIZA KAYDI #${esc(f.id)}</span><h2>${esc(f.subject)}</h2><p>${esc(f.factory)} · ${esc(f.line)} · ${esc(f.department)}</p></div><button type="button" id="faultModalClose">×</button></div><div class="fault-detail-statusbar"><div><small>DURUM</small>${statusControl}</div><div><small>SÜRE</small><b class="duration" data-id="${esc(f.id)}">${durationText(f)}</b></div><div><small>ÜRETİM DURDU MU?</small><b class="${f.stopped?"fault-stop-yes":""}">${productionText}</b></div></div><div class="fault-detail-grid">
    <section class="fault-detail-card wide"><span>ARIZA AÇIKLAMASI</span><h3>${esc(f.subject)}</h3><p>${esc(f.description||"Açıklama girilmemiş.")}</p>${photo}</section>
    <section class="fault-detail-card"><span>KONUM BİLGİLERİ</span><dl><div><dt>Fabrika</dt><dd>${esc(f.factory)}</dd></div><div><dt>Hat / Alan</dt><dd>${esc(f.line)}</dd></div><div><dt>Bölüm</dt><dd>${esc(f.department)}</dd></div><div><dt>Makine</dt><dd>${esc(f.machine)}</dd></div><div><dt>Arıza Türü</dt><dd>${esc(f.type||"-")}</dd></div></dl></section>
    <section class="fault-detail-card"><span>PERSONEL BİLGİLERİ</span><dl><div><dt>Kaydı Açan</dt><dd>${esc(f.openedBy||"Bilinmiyor")}</dd></div><div><dt>Atanan Personel</dt><dd>${esc(f.assignedTo||"Atama Bekliyor")}</dd></div><div><dt>Üstlenme Durumu</dt><dd>${f.assignmentState==="accepted"?`Üstlenildi · ${esc(f.claimedBy||f.assignedTo||"")}${f.claimedAt?`<br><small>${fmtDate(f.claimedAt)}</small>`:""}`:"Personelin kabulü bekleniyor"}</dd></div><div class="fault-assignment-row"><dt>Müdahale Edenler</dt><dd>${assignmentControl}${claimButton}${selfJoin}</dd></div></dl></section>
    <section class="fault-detail-card"><span>ZAMAN BİLGİLERİ</span><dl><div><dt>Açılış Tarihi</dt><dd>${fmtDate(f.createdAt)}</dd></div><div><dt>Kapanış Tarihi</dt><dd>${closeDate}</dd></div><div><dt>Geçen Süre</dt><dd class="duration" data-id="${esc(f.id)}">${durationText(f)}</dd></div></dl></section>
    <section class="fault-detail-card"><span>KAYIT ÖZETİ</span><dl><div><dt>Kayıt No</dt><dd>#${esc(f.id)}</dd></div><div><dt>Aktif mi?</dt><dd>${isDone?"Hayır":"Evet"}</dd></div><div><dt>Duruş Kaydı</dt><dd>${f.stopped?"Var":"Yok"}</dd></div></dl></section>
    ${handoverSection}${handoverHistory}${solutionSection}${materialSection}
  </div></div></div>`;
}

function machineModal(){
  if(!s.machineModal)return "";
  const {factory,line,machine}=s.machineModal;
  const department=s.machineModal.department||findMachineDepartment(factory,line,machine);
  const hist=visibleFaults().filter(x=>x.factory===factory&&x.line===line&&x.machine===machine).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const total=hist.length,active=hist.filter(x=>x.status!=="done").length,totalMin=Math.round(hist.reduce((sum,x)=>sum+durationMs(x)/60000,0));
  const mttr=total?Math.round(totalMin/total):0;
  const sorted=[...hist].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  let mtbf=0;
  if(sorted.length>1){let sum=0,count=0;for(let i=1;i<sorted.length;i++){sum+=(new Date(sorted[i].createdAt)-new Date(sorted[i-1].createdAt))/3600000;count++}mtbf=Math.round(sum/count)}
  const machineTrend=trendDataFor(hist,"machineTrend");
  const typeData=countBy(chartRangeFaultsFor(hist,"machineType"),"type").map(([label,value])=>({label,value}));
  const machineDowntime=countBy(chartRangeFaultsFor(hist,"machineDowntime").filter(x=>x.stopped),"subject").slice(0,8).map(([label,value])=>({label,value}));
  const topSubject=countBy(hist,"subject")[0]?.[0]||"-";
  const maintenanceHistory=visibleMaintenances()
    .filter(item=>item.factory===factory&&item.line===line&&item.machine===machine)
    .sort((a,b)=>String(b.date+b.time).localeCompare(String(a.date+a.time)));

  let body="";
  if(s.machineTab==="history")body=table(hist);
  else if(s.machineTab==="maintenance")body=`<section class="machine-maintenance-history">
    <div class="section-modern-head"><div><h3>Planlı Bakım Geçmişi</h3><p>${esc(machine)} için tamamlanan ve yaklaşan bakım planları</p></div><span class="list-count blue">${maintenanceHistory.length}</span></div>
    <div class="machine-maintenance-list">${maintenanceHistory.map(item=>`<article>
      <div class="machine-maintenance-date"><b>${new Date(item.date+"T00:00:00").toLocaleDateString("tr-TR",{day:"2-digit",month:"short"})}</b><span>${esc(item.time||"-")}</span></div>
      <div><small>${esc(item.type)} · ${esc(item.priority)}</small><h4>${esc(item.title)}</h4><p>${esc(item.description||"Açıklama girilmemiş.")}</p><span>Planlayan: <b>${esc(item.createdBy||"Sistem / Önceki Kayıt")}</b> · Atanan: <b>${esc(item.assigned||"-")}</b></span></div>
      <strong class="maintenance-detail-status ${maintenanceStatusClass(item.status)}">${esc(maintenanceStatusLabel(item.status))}</strong>
    </article>`).join("")||'<div class="compact-empty"><span>▦</span><p>Bu makine için planlı bakım kaydı bulunmuyor.</p></div>'}</div>
  </section>`;
  else if(s.machineTab==="charts")body=`<div class="machine-chart-grid">
    <article class="analytics-chart-card wide"><div class="chart-panel-head"><div><h3>Makine Arıza Trendi</h3><p>${esc(machine)} için zaman bazlı arıza sayısı</p></div>${chartRangeControlsFor("machineTrend")}</div>${lineChartSVG(machineTrend.length?machineTrend:[{label:"Yok",value:0}],"")}</article>
    <article class="analytics-chart-card"><div class="chart-panel-head"><div><h3>Arıza Tipi Dağılımı</h3><p>Makinenin arıza türleri</p></div>${chartRangeControlsFor("machineType")}</div>${barChartSVG(typeData.length?typeData:[{label:"Yok",value:0}],"")}</article>
    <article class="analytics-chart-card"><div class="chart-panel-head"><div><h3>Duruş Nedenleri</h3><p>Üretimi durduran arıza konuları</p></div>${chartRangeControlsFor("machineDowntime")}</div>${barChartSVG(machineDowntime.length?machineDowntime:[{label:"Yok",value:0}],"")}</article>
  </div>`;
  else if(s.machineTab==="workshop"){
    const parts=workshopPartsForMachine(factory,line,department,machine);
    body=`<section class="machine-workshop-parts"><div class="section-modern-head"><div><h3>Atölyede Üretilen Parçalar</h3><p>${esc(machine)} için tamamlanan mekanik atölye işleri</p></div><span class="list-count blue">${parts.length}</span></div><div class="machine-workshop-list">${parts.map(job=>`<article><div><small>${esc(job.partCode||job.id)} · ${esc(job.partType)}</small><b>${esc(job.partName)}</b><span>${job.quantity} adet · ${esc(job.materialSpec||"Malzeme belirtilmedi")}</span></div><div><small>Tamamlanma</small><b>${job.completedAt?fmtDate(job.completedAt):"-"}</b><span>${job.linkedMaterialId?"Malzeme kataloğuna bağlı":"Katalog bağlantısı yok"}</span></div></article>`).join("")||'<div class="compact-empty"><p>Bu makine için tamamlanmış atölye parçası bulunmuyor.</p></div>'}</div></section>`;
  }
  else if(s.machineTab==="documents")body=`<div class="empty-panel"><h3>Makine Dokümanları</h3><p>Bu alana elektrik şeması, mekanik çizim, kullanım kılavuzu ve PLC yedekleri eklenecek.</p><button class="secondary">+ Doküman Ekle</button></div>`;
  else body=`<div class="machine-kpis"><div class="metric"><span>Toplam Arıza</span><b>${total}</b></div><div class="metric"><span>Aktif Arıza</span><b>${active}</b></div><div class="metric"><span>Toplam Duruş</span><b>${totalMin} dk</b></div><div class="metric"><span>MTTR</span><b>${mttr} dk</b></div><div class="metric"><span>MTBF</span><b>${mtbf} sa</b></div><div class="metric wide"><span>En Sık Arıza</span><b>${esc(topSubject)}</b></div></div><div class="machine-info-grid"><div class="info-card"><h4>Makine Bilgileri</h4><p><b>Fabrika:</b> ${esc(factory)}</p><p><b>Hat:</b> ${esc(line)}</p><p><b>Bölüm:</b> ${esc(department||"-")}</p><p><b>Makine:</b> ${esc(machine)}</p><p><b>Son Kaydı Açan:</b> ${esc(hist[0]?.openedBy||"-")}</p><p><b>Durum:</b> ${machineState(factory,line,machine).text}</p></div><div class="info-card"><h4>Son Kayıt</h4>${hist[0]?`<p><b>${esc(hist[0].subject)}</b></p><p>${fmtDate(hist[0].createdAt)}</p><p>${durationText(hist[0])}</p>`:"<p>Kayıt yok.</p>"}</div></div>`;

  return `<div class="modal-backdrop" id="modalCloseBg"><div class="modal machine-modal">
    <div class="modal-head"><div><h2>${esc(machine)}</h2><p>${esc(factory)} · ${esc(line)} · ${esc(department||"-")}</p></div><div class="modal-head-actions"><button type="button" class="machine-qr-button" data-qr-machine="${esc(machine)}" data-qr-factory="${esc(factory)}" data-qr-line="${esc(line)}">QR</button><button id="modalClose">×</button></div></div>
    <div class="tabs"><button data-tab="overview" class="${s.machineTab==="overview"?"active":""}">Genel Bakış</button><button data-tab="history" class="${s.machineTab==="history"?"active":""}">Arıza Geçmişi</button><button data-tab="maintenance" class="${s.machineTab==="maintenance"?"active":""}">Planlı Bakım Geçmişi</button><button data-tab="workshop" class="${s.machineTab==="workshop"?"active":""}">Atölye Parçaları</button>${roleHasCharts()?`<button data-tab="charts" class="${s.machineTab==="charts"?"active":""}">Grafikler</button>`:""}<button data-tab="documents" class="${s.machineTab==="documents"?"active":""}">Dokümanlar</button></div>
    ${body}
    ${canManageMachines()?`<section class="machine-detail-management"><div><b>Makine Kaydını Kaldır</b><p>Makine katalogdan kaldırılır; geçmiş arıza ve bakım kayıtları korunur.</p></div><button type="button" class="danger machine-detail-delete" data-delete-machine="${esc(machine)}" data-delete-factory="${esc(factory)}" data-delete-line="${esc(line)}" data-delete-department="${esc(department)}">Makineyi Sil</button></section>`:""}
  </div></div>`;
}
