const SHIFT_LABELS=["00-08","08-16","16-24"];
const SHIFT_OFF="OFF";
const SHIFT_ASSIGNMENT_VALUES=[...SHIFT_LABELS,SHIFT_OFF];
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
function shiftDisplayLabel(value){return value===SHIFT_OFF?"İzinli":value||"-"}
function importedLeaveValue(value){
  const text=String(value??"").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g,"");
  return ["İ","IZIN","İZİN","OFF","TATİL","R","RAPOR","İSTİRAHAT"].includes(text);
}
function normalizeImportedShift(value){
  const text=String(value??"").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g,"");
  if(["00-08","00:00-08:00","0-8","0:00-8:00","24/8","24-8","24:00-08:00","A","1","GECE"].includes(text))return "00-08";
  if(["08-16","08:00-16:00","8-16","8:00-16:00","8/16","B","2","GÜNDÜZ","SABAH"].includes(text))return "08-16";
  if(["16-24","16:00-24:00","16-00","16:00-00:00","16/24","C","3","AKŞAM"].includes(text))return "16-24";
  if(importedLeaveValue(value))return SHIFT_OFF;
  return null;
}
function importedShiftDate(value){
  if(value instanceof Date&&!Number.isNaN(value.getTime()))return new Date(value.getFullYear(),value.getMonth(),value.getDate());
  if(typeof value==="number"&&window.XLSX?.SSF?.parse_date_code){
    const parsed=XLSX.SSF.parse_date_code(value);
    if(parsed)return new Date(parsed.y,parsed.m-1,parsed.d);
  }
  const text=String(value??"").trim();
  const tr=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if(tr)return new Date(Number(tr[3]),Number(tr[2])-1,Number(tr[1]));
  const iso=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(iso)return new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3]));
  const date=new Date(text);
  return Number.isNaN(date.getTime())?null:new Date(date.getFullYear(),date.getMonth(),date.getDate());
}
function normalizeHeader(value){
  return String(value??"").trim().toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]+/gu,"");
}
function importNameKey(value){
  return String(value??"").trim().toLocaleLowerCase("tr-TR")
    .replace(/ı/g,"i").normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .replace(/\s+/g," ");
}
function findImportPerson(id,name,factory,team){
  const people=personnelForFactory(factory,team);
  const cleanId=String(id??"").trim();
  if(cleanId){
    const byId=people.find(person=>String(person.id)===cleanId);
    if(byId)return byId;
  }
  const cleanName=importNameKey(name);
  return cleanName?people.find(person=>importNameKey(person.name)===cleanName):null;
}
function applyImportedShift(person,date,shift,factory,team){
  const weekOffset=weekOffsetForDate(date);
  const dayIndex=(date.getDay()+6)%7;
  setShiftOverride(factory,team,weekOffset,person.id,dayIndex,shift);
}
function blankShiftImportResult(){
  return {added:0,skipped:0,errors:[],unmatchedNames:[],ambiguous:0,monthDate:null,sourceSheet:""};
}
function templateMonthIndex(value){
  const name=String(value??"").trim().toLocaleUpperCase("tr-TR");
  return {"OCAK":0,"ŞUBAT":1,"SUBAT":1,"MART":2,"NİSAN":3,"NISAN":3,"MAYIS":4,"HAZİRAN":5,"HAZIRAN":5,"TEMMUZ":6,"AĞUSTOS":7,"AGUSTOS":7,"EYLÜL":8,"EYLUL":8,"EKİM":9,"EKIM":9,"KASIM":10,"ARALIK":11}[name];
}
function valueAfterLabel(row,start){
  for(let column=start+1;column<Math.min(row.length,start+8);column++){
    const value=row[column];
    if(value!==""&&value!==undefined&&value!==null)return value;
  }
  return "";
}
function templatePeriod(rows,headerRow){
  let monthValue="",yearValue="";
  for(let rowIndex=0;rowIndex<=headerRow;rowIndex++){
    const row=rows[rowIndex]||[];
    row.forEach((value,column)=>{
      const label=normalizeHeader(value);
      if(label==="ay"&&!monthValue)monthValue=valueAfterLabel(row,column);
      if(["yıl","yil"].includes(label)&&!yearValue)yearValue=valueAfterLabel(row,column);
    });
  }
  const month=templateMonthIndex(monthValue);
  const year=Number(yearValue);
  if(Number.isInteger(month)&&year>=2000&&year<=2200)return new Date(year,month,1);
  return null;
}
function templateDayForColumn(rows,headerRow,personColumn,column){
  for(let rowIndex=headerRow-1;rowIndex>=Math.max(0,headerRow-3);rowIndex--){
    for(let checkColumn=column;checkColumn>=Math.max(personColumn+1,column-2);checkColumn--){
      const day=Number(rows[rowIndex]?.[checkColumn]);
      if(Number.isInteger(day)&&day>=1&&day<=31)return day;
    }
  }
  return null;
}
function shiftImportCellIsColored(cell){
  const fg=cell?.s?.fill?.fgColor||cell?.s?.fgColor;
  if(!fg)return false;
  const rgb=String(fg.rgb||"").toUpperCase().replace(/^FF(?=[0-9A-F]{6}$)/,"");
  if(rgb)return !["FFFFFF","000000"].includes(rgb);
  return typeof fg.theme==="number"&&fg.theme!==0;
}
function templateShiftLayout(sheet){
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:true});
  const personHeaders=["personeladı","personeladi","adsoyad","personel","isimsoyisim","isim"];
  const headerRow=rows.findIndex(row=>row.some(value=>personHeaders.includes(normalizeHeader(value))));
  if(headerRow<0)return null;
  const personColumn=(rows[headerRow]||[]).findIndex(value=>personHeaders.includes(normalizeHeader(value)));
  const period=templatePeriod(rows,headerRow);
  if(!period)return null;
  const groups=new Map();
  (rows[headerRow]||[]).forEach((value,column)=>{
    const shift=normalizeImportedShift(value);
    const day=templateDayForColumn(rows,headerRow,personColumn,column);
    if(!SHIFT_LABELS.includes(shift)||!day)return;
    const date=new Date(period.getFullYear(),period.getMonth(),day);
    if(date.getMonth()!==period.getMonth())return;
    const key=dateKeyLocal(date);
    if(!groups.has(key))groups.set(key,{date,columns:[]});
    groups.get(key).columns.push({column,shift});
  });
  if(groups.size<1)return null;
  return {rows,headerRow,personColumn,period,groups:[...groups.values()]};
}
function importTemplateShiftWorksheet(sheet,fallbackFactory,fallbackTeam,layout=templateShiftLayout(sheet)){
  const result=blankShiftImportResult();
  if(!layout){result.errors.push("Vardiyalı çalışma çizelgesi şablonu tanınamadı.");return result}
  const unmatched=new Set();
  const known=new Set();
  layout.rows.slice(layout.headerRow+1).forEach(row=>{
    const rawName=String(row[layout.personColumn]??"").trim();
    if(!rawName||/^(TOPLAM|HAZIRLAYAN|ONAYLAYAN|NOT)/i.test(rawName))return;
    const person=findImportPerson("",rawName,fallbackFactory,fallbackTeam);
    if(!person){unmatched.add(rawName);return}
    known.add(person.id);
    layout.groups.forEach(group=>{
      const cells=group.columns.map(item=>({
        ...item,
        cell:sheet[XLSX.utils.encode_cell({r:layout.rows.indexOf(row),c:item.column})]
      }));
      if(cells.some(item=>importedLeaveValue(item.cell?.v))){
        applyImportedShift(person,group.date,SHIFT_OFF,fallbackFactory,fallbackTeam);result.added++;return;
      }
      const active=cells.filter(item=>shiftImportCellIsColored(item.cell));
      if(active.length===1){
        applyImportedShift(person,group.date,active[0].shift,fallbackFactory,fallbackTeam);result.added++;
      }else if(active.length>1){
        result.ambiguous++;result.skipped++;
      }else result.skipped++;
    });
  });
  result.unmatchedNames=[...unmatched].sort((a,b)=>a.localeCompare(b,"tr-TR"));
  result.monthDate=layout.period;
  if(!known.size)result.errors.push("Seçili fabrika ve ekipte çizelgedeki personellerle eşleşen kayıt bulunamadı.");
  return result;
}
function importShiftWorksheet(sheet,fallbackFactory,fallbackTeam){
  const template=templateShiftLayout(sheet);
  if(template)return importTemplateShiftWorksheet(sheet,fallbackFactory,fallbackTeam,template);
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:true});
  if(rows.length<2)return {...blankShiftImportResult(),errors:["Çalışma sayfasında veri bulunamadı."]};
  const headers=rows[0].map(normalizeHeader);
  const findHeader=(names)=>headers.findIndex(header=>names.includes(header));
  const idCol=findHeader(["personelid","sicilno","sicil","id"]);
  const nameCol=findHeader(["adsoyad","personel","personeladı","personeladi","isimsoyisim","isim"]);
  const dateCol=findHeader(["tarih","gün","gun"]);
  const shiftCol=findHeader(["vardiya","vardiyaadi","vardiyakodu"]);
  const factoryCol=findHeader(["fabrika","tesis"]);
  const teamCol=findHeader(["ekip","bakımekibi","bakimekibi","birim"]);
  let added=0,skipped=0;const errors=[];
  const add=(row,dateValue,shiftValue)=>{
    const factory=shiftFactoryName(factoryCol>=0?row[factoryCol]:fallbackFactory);
    const team=teamCol>=0?String(row[teamCol]).trim():fallbackTeam;
    const date=importedShiftDate(dateValue);const shift=normalizeImportedShift(shiftValue);
    const person=findImportPerson(idCol>=0?row[idCol]:"",nameCol>=0?row[nameCol]:"",factory,team);
    if(!date||shift===null||!person||!["1. Fabrika","2. Fabrika"].includes(factory)||!["Elektrik Bakım","Mekanik Bakım"].includes(team)){skipped++;return}
    applyImportedShift(person,date,shift,factory,team);added++;
  };
  if((idCol>=0||nameCol>=0)&&dateCol>=0&&shiftCol>=0){
    rows.slice(1).forEach(row=>add(row,row[dateCol],row[shiftCol]));
  }else if(idCol>=0||nameCol>=0){
    const dateColumns=rows[0].map((header,index)=>({index,date:importedShiftDate(header)})).filter(item=>item.date);
    if(!dateColumns.length)return {...blankShiftImportResult(),skipped:rows.length-1,errors:["Tarih veya vardiya sütunları tanınamadı."]};
    rows.slice(1).forEach(row=>dateColumns.forEach(column=>add(row,column.date,row[column.index])));
  }else errors.push("Personel ID veya Ad Soyad sütunu bulunamadı.");
  return {...blankShiftImportResult(),added,skipped,errors};
}
async function importShiftExcelFile(file,factory,team){
  if(!window.XLSX)throw new Error("Excel okuma bileşeni yüklenemedi. İnternet bağlantısını kontrol edip tekrar deneyin.");
  const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true,cellStyles:true});
  const totals=blankShiftImportResult();
  const templates=workbook.SheetNames.map(name=>({name,layout:templateShiftLayout(workbook.Sheets[name])})).filter(item=>item.layout);
  const sheets=templates.length
    ?[...templates].sort((a,b)=>b.layout.period-a.layout.period).slice(0,1)
    :workbook.SheetNames.map(name=>({name,layout:null}));
  const unmatched=new Set();
  sheets.forEach(({name,layout})=>{
    const result=layout
      ?importTemplateShiftWorksheet(workbook.Sheets[name],factory,team,layout)
      :importShiftWorksheet(workbook.Sheets[name],factory,team);
    totals.added+=result.added;totals.skipped+=result.skipped;totals.ambiguous+=result.ambiguous||0;
    result.unmatchedNames.forEach(person=>unmatched.add(person));
    totals.errors.push(...result.errors.map(error=>`${name}: ${error}`));
    if(result.monthDate){totals.monthDate=result.monthDate;totals.sourceSheet=name}
  });
  totals.unmatchedNames=[...unmatched].sort((a,b)=>a.localeCompare(b,"tr-TR"));
  return totals;
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
    .filter(([,u])=>["Bakım Personeli","Elektrik Bakım Formeni","Mekanik Bakım Formeni","Bakım Formeni"].includes(u.role)&&u.team)
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
  if(value===SHIFT_OFF)return "off";
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
function buildTeamMonthSchedule(factory,team,monthDate){
  const selected=new Date(monthDate);
  const first=new Date(selected.getFullYear(),selected.getMonth(),1);
  const dayCount=new Date(selected.getFullYear(),selected.getMonth()+1,0).getDate();
  const dates=Array.from({length:dayCount},(_,index)=>new Date(selected.getFullYear(),selected.getMonth(),index+1));
  const rows=personnelForFactory(factory,team).map(person=>({...person,days:[]}));
  const weekCache=new Map();
  dates.forEach(date=>{
    const offset=weekOffsetForDate(date);
    if(!weekCache.has(offset))weekCache.set(offset,buildTeamWeekSchedule(factory,team,offset));
    const dayIndex=(date.getDay()+6)%7;
    rows.forEach(row=>{
      const weekly=weekCache.get(offset).find(person=>person.id===row.id);
      row.days.push({date,shift:weekly?.days[dayIndex]?.shift||"",weekOffset:offset,dayIndex});
    });
  });
  return {dates,rows};
}
function shiftMonthText(monthDate){
  return new Date(monthDate).toLocaleDateString("tr-TR",{month:"long",year:"numeric"});
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
  const monthly=s.shiftViewMode==="monthly";
  const monthSchedule=buildTeamMonthSchedule(s.shiftFactory,s.shiftTeam,s.shiftMonthDate);
  const monthRows=monthSchedule.rows.filter(r=>!s.shiftSearch||r.name.toLocaleLowerCase("tr-TR").includes(s.shiftSearch.toLocaleLowerCase("tr-TR")));

  const monday=weekMonday(s.shiftWeekOffset);
  const dates=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d});

  const coverage=dates.map((d,dayIndex)=>{
    const counts={};
    SHIFT_LABELS.forEach(sh=>counts[sh]=rows.filter(r=>r.days[dayIndex]?.shift===sh).length);
    return counts;
  });
  const minimumCoverage=Math.min(...coverage.flatMap(c=>SHIFT_LABELS.map(sh=>c[sh])));
  const shiftTable=monthly?`<section class="shift-table-wrap monthly-shift-wrap">
    <table class="shift-table monthly-shift-table">
      <thead><tr><th>Personel</th>${monthSchedule.dates.map(date=>`<th class="${dateKeyLocal(date)===dateKeyLocal(new Date())?"today":""}"><span>${date.getDate()}</span><small>${SHIFT_DAY_NAMES[(date.getDay()+6)%7]}</small></th>`).join("")}</tr></thead>
      <tbody>${monthRows.map(row=>`<tr><td><button class="shift-person-button" data-shift-person="${esc(row.id)}"><i>${esc(row.name.charAt(0))}</i><span><b>${esc(row.name)}</b><small>ID: ${esc(row.id)}</small></span></button></td>${row.days.map(day=>`<td>${canManageShiftTeam(s.shiftTeam)?`<select class="shift-assignment-select monthly ${shiftClass(day.shift)} ${dateKeyLocal(day.date)===dateKeyLocal(new Date())?"today":""}" data-shift-person-id="${esc(row.id)}" data-shift-day="${day.dayIndex}" data-shift-week-offset="${day.weekOffset}">${SHIFT_ASSIGNMENT_VALUES.map(label=>`<option value="${label}" ${day.shift===label?"selected":""}>${shiftDisplayLabel(label)}</option>`).join("")}</select>`:`<span class="shift-cell ${shiftClass(day.shift)}">${esc(shiftDisplayLabel(day.shift))}</span>`}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="${monthSchedule.dates.length+1}"><div class="compact-empty"><p>Bu ekipte personel bulunamadı.</p></div></td></tr>`}</tbody>
    </table>
  </section>`:`<section class="shift-table-wrap">
    <table class="shift-table">
      <thead><tr><th>Personel</th>${dates.map((d,i)=>`<th><span>${SHIFT_DAY_NAMES[i]}</span><small>${d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"})}</small></th>`).join("")}</tr></thead>
      <tbody>${rows.map(r=>`<tr><td><button class="shift-person-button" data-shift-person="${esc(r.id)}"><i>${esc(r.name.charAt(0))}</i><span><b>${esc(r.name)}</b><small>ID: ${esc(r.id)}</small></span></button></td>${r.days.map((d,i)=>`<td>${canManageShiftTeam(s.shiftTeam)?`<select class="shift-assignment-select ${shiftClass(d.shift)} ${s.shiftWeekOffset===0&&i===(new Date().getDay()+6)%7?"today":""}" data-shift-person-id="${esc(r.id)}" data-shift-day="${i}" data-shift-week-offset="${s.shiftWeekOffset}">${SHIFT_ASSIGNMENT_VALUES.map(sh=>`<option value="${sh}" ${d.shift===sh?"selected":""}>${shiftDisplayLabel(sh)}</option>`).join("")}</select>`:`<span class="shift-cell ${shiftClass(d.shift)}">${esc(shiftDisplayLabel(d.shift))}</span>`}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="8"><div class="compact-empty"><p>Bu ekipte personel bulunamadı.</p></div></td></tr>`}</tbody>
    </table>
  </section>`;

  return `${clockBlock()}
  <section class="desktop-page-title shift-page-title">
    <div>
      <span>${monthly?"AYLIK":"HAFTALIK"} BAKIM ORGANİZASYONU</span>
      <h1>${esc(s.shiftFactory)} ${esc(s.shiftTeam)} Vardiya Çizelgesi</h1>
      <p>Bu çizelgede yalnızca seçilen fabrikanın ${esc(s.shiftTeam.toLocaleLowerCase("tr-TR"))} personelleri yer alır.${s.shiftFactory==="2. Fabrika"?" A ve B Blok ortak bakım ekibi olarak değerlendirilir.":""} ${canManageShiftTeam(s.shiftTeam)?"Vardiya hücrelerini değiştirebilirsiniz.":"Çizelge salt okunur görüntüleniyor."}</p>
    </div>
    <div class="week-nav">
      <button id="prevShiftWeek">‹</button>
      <div><small>SEÇİLİ ${monthly?"AY":"HAFTA"}</small><b>${monthly?shiftMonthText(s.shiftMonthDate):weekRangeText(s.shiftWeekOffset)}</b></div>
      <button id="nextShiftWeek">›</button>
    </div>
  </section>

  <section class="shift-filter-card team-only">
    <div class="shift-view-switch"><button type="button" data-shift-view="weekly" class="${!monthly?"active":""}">Haftalık</button><button type="button" data-shift-view="monthly" class="${monthly?"active":""}">Aylık</button></div>
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

  ${canManageShiftTeam(s.shiftTeam)?`<details class="shift-import-panel">
    <summary><span>⇩</span><div><b>Excel Vardiya Çizelgesini İçe Aktar</b><small>.xlsx veya .xls dosyasındaki personel ve vardiya bilgilerini sisteme işleyin.</small></div><i>⌄</i></summary>
    <div class="shift-import-content">
      <input id="shiftExcelFile" type="file" accept=".xlsx,.xls">
      <button type="button" class="primary" id="importShiftExcel">Excel’i Kontrol Et ve Aktar</button>
      <p>Personel eşlemesi ID veya Ad Soyad ile yapılır. Vardiyalı Çalışma Çizelgesi şablonunda ay/yıl, 24/8–8/16–16/24 başlıkları, renkli vardiya hücreleri ve İZİN kayıtları otomatik okunur. Aynı dosyada eski aylar varsa en güncel ay aktarılır.</p>
    </div>
  </details>`:""}

  <section class="shift-summary">
    <div><small>TOPLAM PERSONEL</small><b>${monthly?monthRows.length:rows.length}</b></div>
    <div><small>ÇİZELGE GÖRÜNÜMÜ</small><b>${monthly?"Aylık":"Haftalık"}</b></div>
    <div><small>${monthly?"GÖSTERİLEN GÜN":"HER VARDİYADA EN AZ"}</small><b>${monthly?monthSchedule.dates.length+" gün":minimumCoverage+" kişi"}</b></div>
  </section>

  ${shiftTable}

  ${monthly?"":`<section class="shift-coverage-panel">
    <div class="coverage-head"><div><span>VARDİYA DOLULUK KONTROLÜ</span><h3>Her vardiyada en az bir personel</h3></div><b class="${minimumCoverage>=1?"ok":"warn"}">${minimumCoverage>=1?"Uygun":"Eksik"}</b></div>
    <div class="coverage-grid">
      ${dates.map((d,dayIndex)=>`<div>
        <strong>${SHIFT_DAY_NAMES[dayIndex]}</strong>
        ${SHIFT_LABELS.map(sh=>`<span><i class="${shiftClass(sh)}"></i>${sh}<b>${coverage[dayIndex][sh]} kişi</b></span>`).join("")}
      </div>`).join("")}
    </div>
  </section>`}

  <div class="shift-legend">
    <span><i class="night"></i>00-08</span>
    <span><i class="morning"></i>08-16</span>
    <span><i class="evening"></i>16-24</span>
    <span><i class="off"></i>İzinli</span>
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
      ${row.days.map((d,i)=>`<div><span>${SHIFT_DAY_NAMES[i]} · ${d.date.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"})}</span><b class="${shiftClass(d.shift)}">${esc(shiftDisplayLabel(d.shift))}</b></div>`).join("")}
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
        <button type="button" class="qr-home-button" id="openQrScanner">${qrScanIcon()}<span>QR Kod Tara</span></button>
        <button class="primary operator-new-btn" data-p="new">+ Arıza Kaydı Aç</button>
      </div>
    </div>

    <div class="qr-home-card">
      <div class="qr-home-symbol">${qrScanIcon("large")}</div>
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

  return `${clockBlock()}
  <section class="app-hero">
    <div class="hero-copy">
      <span class="hero-version">MOBİL PRO v2</span>
      <h1>${isManagementRole()?"Yönetim Paneli":"Ana Panel"}</h1>
      <p>${factoryLabel} · ${shift.name} · ${shift.range}</p>
      <div class="hero-meta">${new Date().toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric",weekday:"long"})}</div>
    </div>
    <button type="button" class="hero-qr" id="openQrScanner">${qrScanIcon("hero")}<b>QR Tara</b></button>
  </section>

  ${canAccess("new")||canAddMaintenanceLog()?`<section class="quick-actions dashboard-primary-actions">
    ${canAccess("new")?`<button data-p="new"><span>＋</span><div><b>Yeni Arıza</b><small>Hızlı kayıt oluştur</small></div></button>`:""}
    ${canAddMaintenanceLog()?`<button type="button" id="openMaintenanceLog"><span>✎</span><div><b>Yapılan İş Ekle</b><small>Atölye ve saha işini kaydet</small></div></button>`:""}
  </section>`:""}

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

  <section class="dashboard-duty-grid">
    ${dashboardFactories.map(factory=>onDutyDashboardCard(factory)).join("")}
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
    </div>
    <div class="top-machine-list">
      ${countBy(all,"machine").slice(0,6).map(([machine,total],index)=>{
        const pct=Math.round(total/Math.max(1,countBy(all,"machine")[0]?.[1]||1)*100);
        return `<div class="top-machine-row">
          <span class="machine-rank">${index+1}</span>
          <div class="machine-rank-copy"><b>${esc(machine)}</b><small>${total} arıza kaydı</small><i><em style="width:${pct}%"></em></i></div>
          <strong>${total}</strong>
        </div>`;
      }).join("")}
    </div>
  </section>

  <section class="line-preview-card">
    <div class="section-modern-head">
      <div><h2>Fabrika Şeması Özeti</h2><p>Makine durumlarını hızlı kontrol et</p></div>
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
