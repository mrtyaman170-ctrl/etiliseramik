/* Uygulama durumu, bildirimler ve ortak yardımcılar */
const NOTIFICATION_STATE_KEY="etilismart_notification_state_v1";
function notificationUserId(){
  return String(s.user?.id||s.user?.name||"guest");
}
function notificationStateMap(){
  return safeJson(storageGet(localStorage,NOTIFICATION_STATE_KEY,"{}"),{})||{};
}
function ensureNotificationBaseline(){
  if(!s.user)return;
  const map=notificationStateMap();
  const key=notificationUserId();
  if(!map[key]){
    const initialSeen=new Date(Date.now()-8*60*60*1000).toISOString();
    map[key]={faults:initialSeen,requests:initialSeen};
    storageSet(localStorage,NOTIFICATION_STATE_KEY,JSON.stringify(map));
  }
}
function notificationSeenState(){
  ensureNotificationBaseline();
  const map=notificationStateMap();
  return map[notificationUserId()]||{faults:new Date().toISOString(),requests:new Date().toISOString()};
}
function markNotificationsSeen(pageName){
  if(!s.user)return;
  if(!["faults","work"].includes(pageName))return;
  const map=notificationStateMap();
  const key=notificationUserId();
  const current=map[key]||{faults:new Date().toISOString(),requests:new Date().toISOString()};
  const now=new Date().toISOString();
  if(pageName==="faults")current.faults=now;
  if(pageName==="work")current.requests=now;
  map[key]=current;
  storageSet(localStorage,NOTIFICATION_STATE_KEY,JSON.stringify(map));
}
function newNotificationCounts(){
  if(!s.user)return {faults:0,requests:0};
  const seen=notificationSeenState();
  const currentName=s.user?.name||"";
  const faults=visibleFaults()
    .filter(fault=>fault.status!=="done")
    .filter(fault=>new Date(fault.createdAt)>new Date(seen.faults))
    .filter(fault=>(fault.openedBy||fault.createdBy||"")!==currentName)
    .length;
  const requests=visibleWorkItems()
    .filter(item=>item.kind==="request"&&["new","reviewing"].includes(item.status))
    .filter(item=>new Date(item.createdAt)>new Date(seen.requests))
    .filter(item=>(item.createdBy||"")!==currentName)
    .length;
  return {faults,requests};
}
function pageNotificationCount(pageName){
  const counts=newNotificationCounts();
  if(pageName==="faults")return counts.faults;
  if(pageName==="work")return counts.requests;
  return 0;
}
function notificationBadge(pageName){
  const count=pageNotificationCount(pageName);
  return count?`<span class="nav-notification" title="${count} yeni kayıt"><b>!</b><small>${count}</small></span>`:"";
}

const storedUser=safeJson(storageGet(sessionStorage,"esuser","null"),null);
const sessionIsCurrent=storageGet(sessionStorage,"esauthversion","")===AUTH_VERSION;
let s={
  login:sessionIsCurrent&&storageGet(sessionStorage,"eslogin","0")==="1"&&!!storedUser,
  user:sessionIsCurrent?storedUser:null,
  page:"dashboard",
  faults:safeJson(storageGet(localStorage,K,"null"),null)||generateHistory(),
  plannedMaintenances:safeJson(storageGet(localStorage,PM_KEY,"null"),null)||generatePlannedMaintenances(),
  workItems:safeJson(storageGet(localStorage,WORK_KEY,"null"),null)||generateWorkItems(),
  workDetailId:null,
  maintenanceLogs:safeJson(storageGet(localStorage,MAINTENANCE_LOG_KEY,"[]"),[]),
  maintenanceLogModal:false,
  materialEditId:null,
  dailyChecks:safeJson(storageGet(localStorage,DAILY_CHECK_KEY,"{}"),{}),
  contractorChecks:safeJson(storageGet(localStorage,CONTRACTOR_CHECK_KEY,"{}"),{}),
  dailyControlTab:"daily",
  dailyControlDate:dateOnly(new Date()),
  contractorControlMonth:monthKeyLocal(new Date()),
  dailyControlFactory:"1. Fabrika",
  dailyControlCategory:"Tümü",
  dailyControlDetail:null,
  utilityStatsDays:14,
  workTab:"requests",
  workCreateMode:"",
  calendarDate:new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString(),
  plannedModal:false,
  plannedEditId:null,
  plannedDetailId:null,
  plannedSelectedDate:"",
  dashboardFactory:"Tümü",
  dashboardFaultTab:"active",
  reportFactory:"Tümü",
  reportStart:"",
  reportEnd:"",
  layoutFactory:"1. Fabrika",
  layoutLine:"1. Hat",
  layoutDepartment:"",
  shiftWeekOffset:0,
  shiftFactory:"1. Fabrika",
  shiftLine:"",
  shiftDepartment:"",
  shiftTeam:"Elektrik Bakım",
  shiftSearch:"",
  shiftPersonModal:null,
  machineModal:null,
  faultModalId:null,
  personnelDetailId:null,
  personnelPerformancePeriod:"monthly",
  machineTab:"overview",
  chartRanges:{
    trend:{unit:"day",value:30},
    department:{unit:"day",value:30},
    type:{unit:"day",value:30},
    downtime:{unit:"day",value:30},
    status:{unit:"day",value:30},
    machineRank:{unit:"day",value:30},
    repeatSubject:{unit:"day",value:30},
    shiftTrend:{unit:"shift",value:12},
    machineTrend:{unit:"day",value:30},
    machineType:{unit:"day",value:30},
    machineDowntime:{unit:"day",value:30}
  },
  qrModal:null,
  qrScanner:null
};


function esc(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function opts(items,placeholder="Seçiniz",selected=""){
  const list=Array.isArray(items)?items:[];
  const first=`<option value="" ${selected===""?"selected":""} disabled>${esc(placeholder)}</option>`;
  return first+list.map(item=>`<option value="${esc(item)}" ${item===selected?"selected":""}>${esc(item)}</option>`).join("");
}
function fmtDate(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "-";
  return d.toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function durationMs(fault){
  const start=new Date(fault.createdAt).getTime();
  const end=fault.closedAt?new Date(fault.closedAt).getTime():Date.now();
  return Math.max(0,end-start);
}
function durationText(fault){
  const totalMinutes=Math.floor(durationMs(fault)/60000);
  const days=Math.floor(totalMinutes/1440);
  const hours=Math.floor((totalMinutes%1440)/60);
  const minutes=totalMinutes%60;
  if(days>0)return `${days} gün ${hours} sa ${minutes} dk`;
  if(hours>0)return `${hours} sa ${minutes} dk`;
  return `${minutes} dk`;
}
function shiftInfo(date=new Date()){
  const h=date.getHours();
  if(h<8)return {name:"00–08 Vardiyası",range:"00:00–08:00",startHour:0,endHour:8};
  if(h<16)return {name:"08–16 Vardiyası",range:"08:00–16:00",startHour:8,endHour:16};
  return {name:"16–00 Vardiyası",range:"16:00–00:00",startHour:16,endHour:24};
}
function isInCurrentShift(fault){
  const now=new Date();
  const shift=shiftInfo(now);
  const start=new Date(now);
  start.setHours(shift.startHour,0,0,0);
  const end=new Date(start);
  if(shift.endHour===24)end.setDate(end.getDate()+1);
  end.setHours(shift.endHour===24?0:shift.endHour,0,0,0);
  const created=new Date(fault.createdAt);
  return created>=start&&created<end;
}
function liveDateTime(){
  const now=new Date();
  return {
    date:now.toLocaleDateString("tr-TR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}),
    time:now.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),
    shift:shiftInfo(now)
  };
}
function clockBlock(){
  const x=liveDateTime();
  const shift=x.shift;
  const now=new Date();
  const next=nextShiftDate(now);
  const remaining=Math.max(0,Math.ceil((next-now)/60000));
  const remainingText=remaining>=60?`${Math.floor(remaining/60)} sa ${remaining%60} dk`:`${remaining} dk`;
  const factory=shiftFactoryName(userFactories()[0]||"1. Fabrika");
  const electrical=activeTeamMembers(factory,"Elektrik Bakım",now);
  const mechanical=activeTeamMembers(factory,"Mekanik Bakım",now);
  const shiftStart=new Date(now);shiftStart.setHours(shift.startHour,0,0,0);
  const shiftEnd=new Date(shiftStart);if(shift.endHour===24)shiftEnd.setDate(shiftEnd.getDate()+1);shiftEnd.setHours(shift.endHour===24?0:shift.endHour,0,0,0);
  const progress=Math.max(0,Math.min(100,Math.round((now-shiftStart)/(shiftEnd-shiftStart)*100)));
  return `<section class="pro-timebar rich-timebar">
    <div class="pro-time-main">
      <div class="pro-calendar-icon">▦</div>
      <div class="pro-date-copy"><small>BUGÜN</small><b id="liveDate">${esc(x.date)}</b><em>${esc(s.user?.name||"")} · ${esc(s.user?.role||"")}</em></div>
    </div>
    <div class="pro-time-divider"></div>
    <div class="pro-time-item"><span class="pro-time-icon">◷</span><div><small>CANLI SAAT</small><b id="liveTime">${esc(x.time)}</b><em>Yerel sistem saati</em></div></div>
    <div class="pro-time-divider"></div>
    <div class="pro-time-item shift-detail"><span class="pro-time-icon shift">⇄</span><div><small>AKTİF VARDİYA</small><b id="liveShift">${esc(shift.name)}</b><em>${esc(shift.range)} · %${progress} tamamlandı</em></div></div>
    <div class="pro-time-divider"></div>
    <div class="pro-time-item"><span class="pro-time-icon">→</span><div><small>SONRAKİ VARDİYA</small><b>${esc(nextShiftLabel(now))}</b><em>${remainingText} sonra</em></div></div>
    <div class="pro-time-divider"></div>
    <div class="pro-time-item crew-summary"><span class="pro-time-icon">♙</span><div><small>${esc(factory)} AKTİF BAKIM</small><b>${electrical.length+mechanical.length} personel</b><em>E: ${electrical.length} · M: ${mechanical.length}</em></div></div>
    <div class="pro-system-state"><i></i><span>Sistem aktif</span></div>
  </section>`;
}

function countBy(items,key){
  const map=new Map();
  items.forEach(item=>{
    const label=item?.[key]||"Belirtilmemiş";
    map.set(label,(map.get(label)||0)+1);
  });
  return [...map.entries()].sort((a,b)=>b[1]-a[1]);
}
function statusLabel(status){
  return status==="done"?"Tamamlandı":status==="progress"?"Müdahale Ediliyor":"Açık";
}
function table(items,editable=false){
  if(!items.length)return `<div class="card empty-panel"><h3>Kayıt bulunamadı</h3><p>Seçilen kriterlere uygun arıza kaydı yok.</p></div>`;
  return `<div class="card table-wrap"><table>
    <thead><tr><th>Tarih</th><th>Fabrika / Hat</th><th>Bölüm / Makine</th><th>Arıza</th><th>Kaydı Açan</th><th>Sorumlu Bakımcı</th><th>Durum</th><th>Süre</th>${editable?"<th>İşlem</th>":""}</tr></thead>
    <tbody>${items.map(f=>`<tr class="fault-click-row" data-fault-detail-id="${f.id}" title="Arıza detaylarını görüntülemek için tıklayın">
      <td data-label="Tarih">${fmtDate(f.createdAt)}</td>
      <td data-label="Fabrika / Hat"><b>${esc(f.factory)}</b><br><small>${esc(f.line)}</small></td>
      <td data-label="Bölüm / Makine"><b>${esc(f.department)}</b><br><small>${esc(f.machine)}</small></td>
      <td data-label="Arıza"><b>${esc(f.subject)}</b>${f.description?`<br><small>${esc(f.description)}</small>`:""}${f.stopped?'<br><span class="stop-tag">Üretim durdu</span>':""}</td>
      <td data-label="Kaydı Açan"><span class="person-cell"><i>${esc((f.openedBy||"?").charAt(0))}</i><b>${esc(f.openedBy||"Bilinmiyor")}</b></span></td>
      <td data-label="Sorumlu Bakımcı">${canRedirectFault(f)
        ?`<select class="sel personnel-sel" data-personnel-id="${f.id}">${personnelSelectOptions(f)}</select>`
        :`<span class="assigned-person">${esc(f.assignedTo||"Otomatik atanıyor")}</span>`}</td>
      <td data-label="Durum"><span class="status ${f.status}">${statusLabel(f.status)}</span>${f.status==="done"&&!String(f.solutionText||"").trim()?'<br><span class="missing-solution-tag">Arıza açıklaması yazılmadı</span>':""}</td>
      <td data-label="Süre"><span class="duration" data-id="${f.id}">${durationText(f)}</span></td>
      ${editable&&canUpdateFaultStatus(f)?`<td data-label="İşlem"><select class="sel status-sel" data-id="${f.id}">
        <option value="open" ${f.status==="open"?"selected":""}>Yeni</option>
        <option value="progress" ${f.status==="progress"?"selected":""}>İşlemde</option>
        <option value="done" ${f.status==="done"?"selected":""}>Tamamlandı</option>
      </select></td>`:editable?'<td data-label="İşlem"><small>Yetkiniz yok</small></td>':""}
    </tr>`).join("")}</tbody>
  </table></div>`;
}
function nav(page,label){
  return `<button class="nav ${s.page===page?"active":""}" data-p="${page}"><span class="nav-copy">${esc(label)}</span>${notificationBadge(page)}</button>`;
}

function save(){storageSet(localStorage,K,JSON.stringify(s.faults))}
function savePlanned(){storageSet(localStorage,PM_KEY,JSON.stringify(s.plannedMaintenances))}

function ensureFaultPersonnel(){
  let changed=false;
  s.faults.forEach((fault,index)=>{
    if(!fault.openedBy){
      fault.openedBy=deterministicPerson(DEMO_FAULT_OPENERS,fault.id,index);
      changed=true;
    }
    if(!Object.prototype.hasOwnProperty.call(fault,"assignedTo")||!fault.assignedTo||fault.assignedTo==="Bakım Ekibi"){
      const people=activeMaintenanceForFault(fault);
      fault.assignedTo=deterministicPerson(people,fault.id,index+7)||"Atama Bekliyor";
      fault.assignmentState="pending";
      fault.claimedBy="";
      fault.claimedAt=null;
      changed=true;
    }
  });
  if(changed)save();
}

function isOperator(){
  return s.user?.role==="Operatör";
}
function permissions(){
  return ROLE_PERMISSIONS[s.user?.role]||{};
}
function isDeveloper(){
  return s.user?.role==="Yazılımcı";
}
function canCreateFault(){
  return !!permissions().newFault;
}
function canManageMachines(){
  return !!permissions().manageMachines;
}
function canManageDailyControlCatalog(){
  return !!permissions().manageDailyControlCatalog;
}
function canManageShiftTeam(team){
  if(!permissions().manageShifts)return false;
  if(isDeveloper())return true;
  if(s.user?.role==="Bakım Müdürü")return true;
  if(s.user?.role==="Elektrik Bakım Formeni")return team==="Elektrik Bakım";
  if(s.user?.role==="Mekanik Bakım Formeni")return team==="Mekanik Bakım";
  if(s.user?.role==="Bakım Formeni")return true;
  return false;
}
function canRedirectFault(fault){
  if(!permissions().redirectFaults)return false;
  if(isDeveloper())return userCanSeeFactory(fault.factory);
  const team=maintenanceDisciplineForFault(fault);
  if(s.user?.role==="Bakım Müdürü")return userCanSeeFactory(fault.factory);
  if(s.user?.role==="Elektrik Bakım Formeni")return team==="Elektrik Bakım"&&userCanSeeFactory(fault.factory);
  if(s.user?.role==="Mekanik Bakım Formeni")return team==="Mekanik Bakım"&&userCanSeeFactory(fault.factory);
  if(s.user?.role==="Bakım Formeni")return userCanSeeFactory(fault.factory);
  return false;
}
function canAccess(page){
  const p=permissions();
  if(page==="dashboard")return !!p.dashboard;
  if(page==="new")return canCreateFault();
  if(page==="faults")return !!p.faults;
  if(page==="report")return !!p.report;
  if(page==="layout")return !!p.layout;
  if(page==="planned")return !!p.planned;
  if(page==="shifts")return !!p.shiftSchedule;
  if(page==="personnel")return !!(p.personnel||p.viewPerformance||p.manageOwnTeam||p.manageAllPersonnel);
  if(page==="materials")return !!p.materials;
  if(page==="work")return !!p.workRequests;
  if(page==="dailyChecks")return !!p.dailyChecks;
  return false;
}
function roleHasCharts(){
  return !!permissions().report;
}
function isManagementRole(){
  return ["Bölüm Formeni","Üretim Müdürü","Genel Müdür","Bakım Müdürü","Elektrik Bakım Formeni","Mekanik Bakım Formeni","Bakım Formeni","Yazılımcı"].includes(s.user?.role);
}
function roleIsDepartmentLimited(){
  return !!permissions().departmentOnly;
}
function userFactories(){
  return Array.isArray(s.user?.factories)&&s.user.factories.length?s.user.factories:Object.keys(FACTORIES);
}
function userCanSeeFactory(factory){
  return permissions().allFactories||userFactories().includes(factory);
}
function visibleFaults(base=s.faults){
  let a=[...base].filter(x=>userCanSeeFactory(x.factory));
  if(roleIsDepartmentLimited()&&s.user?.department)a=a.filter(x=>x.department===s.user.department);
  if(permissions().ownFaultsOnly)a=a.filter(x=>x.openedBy===s.user?.name);
  return a;
}
function chartConfig(chartId){
  return s.chartRanges[chartId]||{unit:"day",value:30};
}
function rangeStartDateFor(chartId){
  const cfg=chartConfig(chartId);
  const now=new Date();
  const n=Math.max(1,Number(cfg.value)||1);
  if(cfg.unit==="hour")return new Date(now.getTime()-n*3600000);
  if(cfg.unit==="shift")return new Date(now.getTime()-n*8*3600000);
  if(cfg.unit==="day")return new Date(now.getTime()-n*86400000);
  const d=new Date(now);d.setMonth(d.getMonth()-n);return d;
}
function chartRangeFaultsFor(base,chartId){
  const start=rangeStartDateFor(chartId);
  return visibleFaults(base).filter(x=>new Date(x.createdAt)>=start);
}
function chartRangeControlsFor(chartId){
  const cfg=chartConfig(chartId);
  return `<div class="chart-local-controls">
    <div class="field">
      <label>Zaman Birimi</label>
      <select class="chart-unit" data-chart="${chartId}">
        <option value="hour" ${cfg.unit==="hour"?"selected":""}>Saat</option>
        <option value="shift" ${cfg.unit==="shift"?"selected":""}>Vardiya</option>
        <option value="day" ${cfg.unit==="day"?"selected":""}>Gün</option>
        <option value="month" ${cfg.unit==="month"?"selected":""}>Ay</option>
      </select>
    </div>
    <div class="field">
      <label>Son Kaç Birim?</label>
      <input class="chart-value" data-chart="${chartId}" type="number" min="1" max="365" value="${cfg.value}">
    </div>
  </div>`;
}
function periodLabel(d,chartId){
  const unit=chartConfig(chartId).unit;
  if(unit==="hour")return d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
  if(unit==="shift"){
    const h=d.getHours();
    const name=h<8?"00–08":h<16?"08–16":"16–00";
    return `${d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"})} ${name}`;
  }
  if(unit==="day")return d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"});
  return d.toLocaleDateString("tr-TR",{month:"short",year:"2-digit"});
}
function trendDataFor(base,chartId){
  const cfg=chartConfig(chartId);
  const a=chartRangeFaultsFor(base,chartId);
  const now=new Date();
  const n=Math.max(1,Number(cfg.value)||1);
  const buckets=[];
  if(cfg.unit==="hour"){
    for(let i=n-1;i>=0;i--){
      const start=new Date(now.getTime()-(i+1)*3600000),end=new Date(now.getTime()-i*3600000);
      buckets.push({start,end,label:periodLabel(end,chartId),value:0});
    }
  }else if(cfg.unit==="shift"){
    for(let i=n-1;i>=0;i--){
      const end=new Date(now.getTime()-i*8*3600000),start=new Date(end.getTime()-8*3600000);
      buckets.push({start,end,label:periodLabel(start,chartId),value:0});
    }
  }else if(cfg.unit==="day"){
    for(let i=n-1;i>=0;i--){
      const start=new Date(now);start.setDate(now.getDate()-i);start.setHours(0,0,0,0);
      const end=new Date(start);end.setDate(start.getDate()+1);
      buckets.push({start,end,label:periodLabel(start,chartId),value:0});
    }
  }else{
    for(let i=n-1;i>=0;i--){
      const start=new Date(now.getFullYear(),now.getMonth()-i,1);
      const end=new Date(now.getFullYear(),now.getMonth()-i+1,1);
      buckets.push({start,end,label:periodLabel(start,chartId),value:0});
    }
  }
  a.forEach(f=>{
    const t=new Date(f.createdAt);
    const b=buckets.find(x=>t>=x.start&&t<x.end);
    if(b)b.value++;
  });
  return buckets;
}
function chartLabelParts(label){
  const raw=String(label??"");
  // Vardiya etiketlerini: "25.07 08-16" veya benzeri ise iki satıra böl.
  const shiftMatch=raw.match(/^(.{4,12}?)\s+(0?0[-–]0?8|0?8[-–]16|16[-–]24|Vardiya\s*\d+)$/i);
  if(shiftMatch)return [shiftMatch[1],shiftMatch[2]];
  // Uzun tarih-vardiya etiketlerini son boşluktan ikiye böl.
  if(raw.length>12&&raw.includes(" ")){
    const parts=raw.split(/\s+/);
    if(parts.length>=2)return [parts.slice(0,-1).join(" "),parts[parts.length-1]];
  }
  return [raw];
}
function chartShortLabel(label,max=14){
  const raw=String(label??"");
  return raw.length>max?raw.slice(0,max-1)+"…":raw;
}
function lineChartSVG(data,title){
  const safe=data?.length?data:[{label:"Kayıt Yok",value:0}];
  const W=760,H=310,L=48,R=22,T=24,B=safe.length>6?92:64;
  const innerW=W-L-R,innerH=H-T-B,max=Math.max(1,...safe.map(x=>Number(x.value)||0));
  const step=safe.length>1?innerW/(safe.length-1):innerW;
  const points=safe.map((x,i)=>({
    x:L+(safe.length===1?innerW/2:i*step),
    y:T+innerH-(Number(x.value)||0)/max*innerH,
    ...x
  }));
  const path=points.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ");
  const rotate=safe.length>6;
  const grid=[0,.25,.5,.75,1].map(r=>{
    const y=T+innerH-innerH*r;
    return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" class="chart-grid-line"/>
      <text x="${L-8}" y="${y+4}" text-anchor="end" class="chart-y-label">${Math.round(max*r)}</text>`;
  }).join("");
  const labels=points.map((p,i)=>{
    const parts=chartLabelParts(p.label);
    const label=chartShortLabel(parts[0],rotate?12:16);
    if(rotate){
      return `<g transform="translate(${p.x},${T+innerH+16}) rotate(-42)">
        <title>${esc(String(p.label))}</title>
        <text text-anchor="end" class="chart-x-label">${esc(label)}</text>
        ${parts[1]?`<text y="13" text-anchor="end" class="chart-x-label secondary">${esc(chartShortLabel(parts[1],12))}</text>`:""}
      </g>`;
    }
    return `<g transform="translate(${p.x},${T+innerH+18})">
      <title>${esc(String(p.label))}</title>
      <text text-anchor="middle" class="chart-x-label">${esc(label)}</text>
      ${parts[1]?`<text y="13" text-anchor="middle" class="chart-x-label secondary">${esc(chartShortLabel(parts[1],12))}</text>`:""}
    </g>`;
  }).join("");
  return `<div class="chartbox responsive-chartbox">${title?`<h4>${esc(title)}</h4>`:""}
    <div class="chart-scroll-area">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title||"Çizgi grafik")}">
        ${grid}
        <path d="${path}" class="chart-line-path"/>
        ${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4.5" class="chart-point"><title>${esc(String(p.label))}: ${p.value}</title></circle>`).join("")}
        ${labels}
      </svg>
    </div>
  </div>`;
}
function barChartSVG(data,title){
  const safe=data?.length?data:[{label:"Kayıt Yok",value:0}];
  const W=760,H=330,L=52,R=20,T=22,B=safe.length>5?105:72;
  const innerW=W-L-R,innerH=H-T-B,max=Math.max(1,...safe.map(x=>Number(x.value)||0));
  const slot=innerW/safe.length,barW=Math.max(12,Math.min(58,slot*.58));
  const rotate=safe.length>5||safe.some(x=>String(x.label).length>12);
  const grid=[0,.25,.5,.75,1].map(r=>{
    const y=T+innerH-innerH*r;
    return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" class="chart-grid-line"/>
      <text x="${L-8}" y="${y+4}" text-anchor="end" class="chart-y-label">${Math.round(max*r)}</text>`;
  }).join("");
  const bars=safe.map((d,i)=>{
    const value=Number(d.value)||0;
    const h=value/max*innerH;
    const x=L+i*slot+(slot-barW)/2,y=T+innerH-h,cx=x+barW/2;
    const parts=chartLabelParts(d.label);
    const primary=chartShortLabel(parts[0],rotate?13:16);
    const labelMarkup=rotate
      ? `<g transform="translate(${cx},${T+innerH+17}) rotate(-42)">
          <title>${esc(String(d.label))}</title>
          <text text-anchor="end" class="chart-x-label">${esc(primary)}</text>
          ${parts[1]?`<text y="13" text-anchor="end" class="chart-x-label secondary">${esc(chartShortLabel(parts[1],12))}</text>`:""}
        </g>`
      : `<g transform="translate(${cx},${T+innerH+18})">
          <title>${esc(String(d.label))}</title>
          <text text-anchor="middle" class="chart-x-label">${esc(primary)}</text>
          ${parts[1]?`<text y="13" text-anchor="middle" class="chart-x-label secondary">${esc(chartShortLabel(parts[1],12))}</text>`:""}
        </g>`;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="7" class="chart-bar"><title>${esc(String(d.label))}: ${value}</title></rect>
      <text x="${cx}" y="${Math.max(T+12,y-7)}" text-anchor="middle" class="chart-value-label">${value}</text>
      ${labelMarkup}`;
  }).join("");
  return `<div class="chartbox responsive-chartbox">${title?`<h4>${esc(title)}</h4>`:""}
    <div class="chart-scroll-area">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title||"Sütun grafik")}">
        ${grid}${bars}
      </svg>
    </div>
  </div>`;
}

function compactFaultList(items,emptyText){
  if(!items.length)return `<div class="compact-empty"><span>✓</span><p>${esc(emptyText)}</p></div>`;
  return `<div class="compact-fault-list">${items.slice(0,8).map(f=>`
    <button class="compact-fault-row" data-p="faults">
      <span class="compact-state ${f.stopped?"stop":f.status}"></span>
      <div class="compact-fault-copy">
        <div><b>${esc(f.machine)}</b><time>${durationText(f)}</time></div>
        <small>${esc(f.factory)} · ${esc(f.line)} · ${esc(f.department)}</small>
        <p>${esc(f.subject)}</p>
        <div class="compact-people"><span>Açan: <b>${esc(f.openedBy||"Bilinmiyor")}</b></span><span>Bakım: <b>${esc(f.assignedTo||"Atama Bekliyor")}</b></span></div>
      </div>
      <i>›</i>
    </button>`).join("")}</div>`;
}
function shiftPerformanceCard(allShiftFaults){
  const completed=allShiftFaults.filter(x=>x.status==="done").length;
  const active=allShiftFaults.filter(x=>x.status!=="done").length;
  const stopped=allShiftFaults.filter(x=>x.stopped).length;
  const total=allShiftFaults.length;
  const completionRate=total?Math.round(completed/total*100):100;
  const avgMinutes=completed.length===0?0:0;
  const resolved=allShiftFaults.filter(x=>x.status==="done");
  const avgResolution=resolved.length?Math.round(resolved.reduce((sum,x)=>sum+durationMs(x)/60000,0)/resolved.length):0;
  const score=Math.max(0,Math.min(100,Math.round(completionRate-(stopped*8)+(total?10:0))));
  return `<section class="shift-performance">
    <div class="performance-head">
      <div><span>ANLIK VARDİYA PERFORMANSI</span><h2>${score}<small>/100</small></h2></div>
      <div class="score-ring" style="--score:${score}"><b>${score}%</b></div>
    </div>
    <div class="performance-progress"><i style="width:${score}%"></i></div>
    <div class="performance-metrics">
      <div><small>Toplam Kayıt</small><b>${total}</b></div>
      <div><small>Tamamlanan</small><b>${completed}</b></div>
      <div><small>Aktif</small><b>${active}</b></div>
      <div><small>Üretim Duruşu</small><b>${stopped}</b></div>
      <div><small>Tamamlama</small><b>%${completionRate}</b></div>
      <div><small>Ort. Çözüm</small><b>${avgResolution} dk</b></div>
    </div>
  </section>`;
}

/* Sayfa yönlendirme, modallar ve giriş ekranı */
function maintenanceLogModal(){
  if(!s.maintenanceLogModal||!canAddMaintenanceLog())return "";
  const factories=[...new Set(userFactories().map(shiftFactoryName))];
  const defaultFactory=factories[0]||"1. Fabrika";
  const people=[...new Map(factories.flatMap(factory=>maintenanceWorkPeople(factory)).map(p=>[p.id,p])).values()];
  return `<div class="modal-backdrop" id="maintenanceLogBackdrop"><div class="modal maintenance-log-modal">
    <div class="modal-head"><div><span>BAKIM ÇALIŞMA KAYDI</span><h2>Yapılan İş Ekle</h2><p>Arıza veya iş emri dışında tamamlanan atölye ve saha çalışmalarını kaydedin.</p></div><button type="button" id="closeMaintenanceLog">×</button></div>
    <form id="maintenanceLogForm" class="maintenance-log-form">
      <div class="field"><label>Fabrika *</label><select id="maintenanceLogFactory" required>${factories.map(f=>`<option>${esc(f)}</option>`).join("")}</select></div>
      <div class="field"><label>İşin Yapıldığı Tarih *</label><input id="maintenanceLogDate" type="date" value="${dateOnly(new Date())}" required></div>
      <div class="field wide"><label>İş Başlığı *</label><input id="maintenanceLogTitle" maxlength="140" placeholder="Örn. Atölyeye getirilen Masterjet pompası tamir edildi" required></div>
      <div class="field wide"><label>Makine / Konum</label><input id="maintenanceLogLocation" maxlength="140" placeholder="Örn. Bakım atölyesi · 2. Masterjet pompası"></div>
      <div class="field wide"><label>Yapılan İş Açıklaması *</label><textarea id="maintenanceLogDescription" rows="5" maxlength="1800" placeholder="Arıza tespiti, değiştirilen parçalar, yapılan test ve sonuç bilgilerini yazın." required></textarea></div>
      <div class="field wide"><label>İşe Dahil Olan Personeller *</label><div class="maintenance-log-people">${people.map(p=>`<label data-log-person-factories="${esc((APP_USERS[p.id]?.factories||[]).map(shiftFactoryName).join("|"))}"><input type="checkbox" class="maintenance-log-person" value="${esc(p.name)}" ${p.name===s.user?.name?"checked":""}><span><b>${esc(p.name)}</b><small>${esc(p.role)} · ${esc(p.team)}</small></span></label>`).join("")}</div></div>
      <div class="modal-actions wide"><button type="button" class="secondary" id="cancelMaintenanceLog">Vazgeç</button><button type="submit" class="primary">Yapılan İşi Kaydet</button></div>
    </form>
  </div></div>`;
}
function materialEditorModal(){
  if(!s.materialEditId)return "";
  const m=materialById(s.materialEditId);
  if(!m)return "";
  const categories=["Elektrik","Mekanik","Pnömatik","Hidrolik","Enstrümantasyon","Sarf","Diğer"];
  const units=["Adet","Metre","Kilogram","Litre","Paket","Kutu","Rulo","Takım","Set","Çift"];
  return `<div class="modal-backdrop" id="materialEditorBackdrop"><div class="modal material-editor-modal"><div class="modal-head"><div><span>MALZEME KARTI</span><h2>${esc(m.name)}</h2><p>${esc(m.code)}</p></div><button type="button" id="closeMaterialEditor">×</button></div><form id="materialEditorForm" class="material-editor-form"><input type="hidden" id="materialEditorId" value="${esc(m.id)}"><div class="field"><label>Malzeme Kodu *</label><input id="materialEditCode" value="${esc(m.code)}" required></div><div class="field wide"><label>Malzeme Adı *</label><input id="materialEditName" value="${esc(m.name)}" required></div><div class="field"><label>Kategori *</label><select id="materialEditCategory">${categories.map(x=>`<option ${x===m.category?"selected":""}>${esc(x)}</option>`).join("")}</select></div><div class="field"><label>Birim *</label><select id="materialEditUnit">${units.map(x=>`<option ${x===m.unit?"selected":""}>${esc(x)}</option>`).join("")}</select></div><div class="field"><label>Mevcut Stok</label><input id="materialEditStock" type="number" min="0" step="0.01" value="${Number(m.stock)||0}"></div><div class="field"><label>Minimum Stok</label><input id="materialEditMinStock" type="number" min="0" step="0.01" value="${Number(m.minStock)||0}"></div><div class="field wide"><label>Açıklama</label><textarea id="materialEditDescription" rows="3">${esc(m.description||"")}</textarea></div><div class="modal-actions wide"><button type="button" class="danger" id="deleteMaterialFromEditor" data-material-id="${esc(m.id)}">Malzemeyi Sil</button><button type="button" class="secondary" id="cancelMaterialEditor">Vazgeç</button><button type="submit" class="primary">Değişiklikleri Kaydet</button></div></form></div></div>`;
}
function page(){
  if(!canAccess(s.page))s.page=allowedNavItems()[0]?.[0]||"dashboard";
  if(s.page==="new")return newf();
  if(s.page==="faults")return `${clockBlock()}
  <section class="desktop-page-title">
    <div><span>BAKIM OPERASYONLARI</span><h1>Arıza Kayıtları</h1><p>Yetki alanınızdaki tüm arıza kayıtlarını görüntüleyin ve yönetin.</p></div>
    <div class="desktop-page-actions">
      <div class="record-count"><small>TOPLAM KAYIT</small><b>${visibleFaults().length}</b></div>
      ${canAccess("new")?'<button class="primary" data-p="new">+ Yeni Arıza</button>':""}
    </div>
  </section>
  ${table([...visibleFaults()].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)),!!permissions().editStatus)}`;
  if(s.page==="layout")return layoutPage();
  if(s.page==="planned")return plannedMaintenancePage();
  if(s.page==="shifts")return shiftSchedulePage();
  if(s.page==="personnel")return personnelManagementPage();
  if(s.page==="materials")return materialsManagementPage();
  if(s.page==="dailyChecks")return dailyChecksPage();
  if(s.page==="work")return workManagementPage();
  if(s.page==="report")return reportPage();
  return dashboard();
}
function allowedNavItems(){
  const items=[
    ["dashboard","⌂","Panel"],
    ["new","+","Arıza Aç"],
    ["faults","≡","Arızalar"],
    ["report","▥","Raporlar ve Grafikler"],
    ["planned","▦","Planlı Bakım"],
    ["shifts","◷","Vardiya Planı"],
    ["personnel","♙","Personel Yönetimi"],
    ["materials","□","Malzeme Yönetimi"],
    ["dailyChecks","✓","Günlük Kontroller"],
    ["work","◇","Talepler ve İş Emirleri"],
    ["layout","⌘","Fabrika Şeması"]
  ];
  return items.filter(([page])=>canAccess(page));
}
function mobileNav(){
  return `<nav class="mobile-top-tabs">${allowedNavItems().map(([page,icon,label])=>`
    <button type="button" data-p="${page}" class="${s.page===page?"active":""}">
      <span>${icon}</span><small>${label}</small>${notificationBadge(page)}
    </button>`).join("")}</nav>`;
}
function app(){
  normalizeFaultParticipants();
  ensureNotificationBaseline();
  return `<div class="top"><div class="brand">ETİLİ<span>SMART</span><small>Bakım Yönetim Sistemi</small></div>
    <div class="top-user"><span class="top-user-name">${esc(s.user?.name||"")}</span><span class="top-user-role">${esc(s.user?.role||"")}</span><button id="out" class="secondary">Çıkış</button></div>
  </div>
  ${mobileNav()}
  <div class="layout"><aside>
    <div class="aside-user"><b>${esc(s.user?.name||"")}</b><small>${esc(s.user?.role||"")}</small></div>
    ${allowedNavItems().map(([page,icon,label])=>nav(page,`${icon}  ${label}`)).join("")}
    <div class="aside-scope"><small>YETKİ ALANI</small><b>${permissions().allFactories?"Tüm fabrikalar":userFactories().join(" · ")}</b>${s.user?.department?`<span>${esc(s.user.department)}</span>`:""}</div>
  </aside><main>${page()}</main></div>${personnelDetailModal()}${faultDetailModal()}${machineModal()}${workDetailModal()}${dailyControlDetailModal()}${maintenanceLogModal()}${materialEditorModal()}${qrModal()}${shiftPersonModal()}`;
}
function login(){
  return `<div class="login login-redesign">
    <div class="login-shell">
      <section class="login-brand-panel">
        <div class="login-brand-mark">ES</div>
        <span>ETİLİ SERAMİK</span>
        <h1>Bakım yönetimini<br>daha görünür hale getirin.</h1>
        <p>Arıza kayıtları, hat durumu, bakım performansı ve makine analizleri tek ekranda.</p>
        <div class="login-feature-grid">
          <div><b>QR</b><span>Makineye hızlı erişim</span></div>
          <div><b>7/24</b><span>Canlı arıza takibi</span></div>
          <div><b>3</b><span>Fabrika görünümü</span></div>
        </div>
      </section>
      <section class="login-form-panel">
        <div class="login-title"><span>ETİLİ<span>SMART</span></span><small>Dijital Bakım Yönetim Sistemi</small></div>
        <h2>Hesabınıza giriş yapın</h2>
        <p>Size tanımlanan kullanıcı ID ve parolayı girin.</p>
        <form id="login">
          <div class="field"><label>Kullanıcı ID</label><input id="userId" inputmode="numeric" autocomplete="username" placeholder="Örn. 1111" required></div>
          <div class="field"><label>Parola</label><input id="password" type="password" inputmode="numeric" autocomplete="current-password" placeholder="••••" required></div>
          <div id="loginError" class="login-error"></div>
          <button class="primary login-submit">Giriş Yap <span>→</span></button>
        </form>
        <div class="login-demo-note"><b>Demo hesapları</b><span>Genel yönetici: 1111 / 1111</span><small>Personeller kendilerine tanımlanan 4 haneli ID ve parola ile giriş yapabilir.</small></div>
      </section>
    </div>
  </div>`;
}
