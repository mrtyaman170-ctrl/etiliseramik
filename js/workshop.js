/* Mekanik Atölye — parça üretim talepleri, üretim ve arşiv */
const WORKSHOP_KEY="etilismart_workshop_jobs_v1";
const WORKSHOP_STATUSES=["Talep Açıldı","İnceleniyor","Onaylandı","Üretimde","Kontrol Bekliyor","Tamamlandı","Reddedildi"];
const WORKSHOP_PART_TYPES=["Mil","Burç","Flanş","Dişli","Kasnak","Rulo","Yatak","Bağlantı Parçası","Koruyucu / Muhafaza","Kaynaklı İmalat","Revizyon","Diğer"];
function workshopSeed(){
  const now=Date.now();
  return [
    {id:"AT-1001",title:"Pres rulo mili imalatı",partName:"Pres Rulo Mili",partCode:"ATM-PRM-001",partType:"Mil",quantity:2,minimumStock:1,factory:"1. Fabrika",line:"1. Hat",department:"Pres Bölümü",machine:"Pres Rulo ve Kayışlar",description:"Aşınan mil numuneye göre işlenecek. Rulman yatakları ölçülerek tolerans korunacak.",materialSpec:"C45 çelik",technicalDrawingName:"",technicalDrawingData:"",priority:"Yüksek",status:"Üretimde",requestedBy:"Halil İbrahim Utku",requestedAt:new Date(now-26*3600000).toISOString(),approvedBy:"Atölye Sorumlusu",approvedAt:new Date(now-20*3600000).toISOString(),estimatedHours:12,startedAt:new Date(now-18*3600000).toISOString(),completedAt:null,workNotes:"Kaba tornalama tamamlandı.",linkedMaterialId:""},
    {id:"AT-0998",title:"Konveyör yatak burcu",partName:"Konveyör Yatak Burcu",partCode:"ATM-KYB-004",partType:"Burç",quantity:4,minimumStock:2,factory:"2. Fabrika A Blok",line:"1. Hat",department:"Sır Bantları",machine:"Konveyör Bantlar",description:"Eski parçaya göre bronz burç üretildi.",materialSpec:"Bronz",technicalDrawingName:"KYB-004.pdf",technicalDrawingData:"",priority:"Orta",status:"Tamamlandı",requestedBy:"Kemal Ayrancı",requestedAt:new Date(now-12*86400000).toISOString(),approvedBy:"Atölye Sorumlusu",approvedAt:new Date(now-11*86400000).toISOString(),estimatedHours:6,startedAt:new Date(now-10*86400000).toISOString(),completedAt:new Date(now-9*86400000).toISOString(),completedBy:"Atölye Sorumlusu",workNotes:"Ölçü kontrolü yapıldı ve bölüme teslim edildi.",linkedMaterialId:""}
  ];
}
function normalizeWorkshopJob(job){
  const minimumStock=Number(job?.minimumStock);
  return {...job,minimumStock:Number.isFinite(minimumStock)&&minimumStock>=0?Math.round(minimumStock):0,linkedMaterialId:String(job?.linkedMaterialId||"")};
}
function loadWorkshopJobs(){
  const jobs=storageJsonRecordArray(localStorage,WORKSHOP_KEY,workshopSeed()).map(normalizeWorkshopJob);
  storageSet(localStorage,WORKSHOP_KEY,JSON.stringify(jobs));
  return jobs;
}
function saveWorkshopJobs(){storageSet(localStorage,WORKSHOP_KEY,JSON.stringify(s.workshopJobs||[]))}
function canCreateWorkshopRequest(){return !!permissions().createWorkshopRequest}
function canCreateWorkshopDirect(){return !!permissions().createWorkshopDirect}
function canManageWorkshopJobs(){return !!permissions().manageWorkshopJobs}
function workshopMaterialForJob(job){
  if(!job)return null;
  return materialById(job.linkedMaterialId)||MATERIALS.find(material=>String(material.workshopJobId||"")===String(job.id))||null;
}
function workshopMaterialDescription(job){
  return `${job.machine} için atölyede üretildi. Atölye işi: ${job.id}`;
}
function workshopSyncMaterialFromJob(job,actor=s.user?.name||"Bilinmeyen Kullanıcı"){
  const material=workshopMaterialForJob(job);
  if(!material||String(material.workshopJobId||"")!==String(job.id))return {ok:true,material};
  const duplicate=MATERIALS.find(item=>String(item.id)!==String(material.id)&&String(item.code||"").trim().toLocaleUpperCase("tr-TR")===String(job.partCode||"").trim().toLocaleUpperCase("tr-TR"));
  if(duplicate)return {ok:false,message:`${job.partCode} kodu ${duplicate.name} malzemesinde zaten kullanılıyor.`};
  Object.assign(material,{code:job.partCode,name:job.partName,category:"Mekanik",unit:"Adet",minStock:Number(job.minimumStock)||0,description:workshopMaterialDescription(job),updatedBy:actor,updatedAt:new Date().toISOString()});
  job.linkedMaterialId=material.id;
  saveMaterials();
  return {ok:true,material};
}
function ensureWorkshopMaterial(job,actor=s.user?.name||"Bilinmeyen Kullanıcı"){
  let material=workshopMaterialForJob(job);
  if(material){
    job.linkedMaterialId=material.id;
    delete job.deletedMaterialId;
    return workshopSyncMaterialFromJob(job,actor);
  }
  const duplicate=MATERIALS.find(item=>String(item.code||"").trim().toLocaleUpperCase("tr-TR")===String(job.partCode||"").trim().toLocaleUpperCase("tr-TR"));
  if(duplicate){
    job.linkedMaterialId=duplicate.id;
    delete job.deletedMaterialId;
    return {ok:true,material:duplicate,linkedExisting:true};
  }
  material={id:`MAT-AT-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,code:job.partCode,name:job.partName,category:"Mekanik",unit:"Adet",stock:Number(job.quantity)||1,minStock:Number(job.minimumStock)||0,warehouseLocation:"Mekanik Atölye · Üretilen Parça Rafı",description:workshopMaterialDescription(job),custom:true,workshopJobId:job.id,createdBy:actor,createdAt:new Date().toISOString()};
  MATERIALS.push(material);
  job.linkedMaterialId=material.id;
  delete job.deletedMaterialId;
  saveMaterials();
  return {ok:true,material,created:true};
}
function syncWorkshopPartFromMaterial(material){
  if(!material?.workshopJobId)return;
  const job=(s.workshopJobs||[]).find(item=>String(item.id)===String(material.workshopJobId));
  if(!job)return;
  Object.assign(job,{partCode:material.code,partName:material.name,minimumStock:Number(material.minStock)||0,linkedMaterialId:material.id,updatedBy:s.user?.name||"",updatedAt:new Date().toISOString()});
  saveWorkshopJobs();
}
function unlinkWorkshopMaterial(materialId){
  let changed=false;
  (s.workshopJobs||[]).forEach(job=>{if(String(job.linkedMaterialId||"")===String(materialId)){job.deletedMaterialId=String(materialId);job.linkedMaterialId="";changed=true}});
  if(changed)saveWorkshopJobs();
}
function workshopVisibleJobs(){
  let jobs=[...(s.workshopJobs||[])].filter(job=>userCanSeeFactory(job.factory));
  if(roleIsDepartmentLimited()&&s.user?.department)jobs=jobs.filter(job=>job.department===s.user.department);
  return jobs;
}
function workshopStatusClass(status){
  if(status==="Tamamlandı")return "done";
  if(status==="Reddedildi")return "rejected";
  if(["Üretimde","Kontrol Bekliyor"].includes(status))return "progress";
  if(status==="Onaylandı")return "approved";
  return "open";
}
function workshopDateValue(job){return new Date(job.completedAt||job.requestedAt).getTime()||0}
function workshopSortValue(job,key){
  if(key==="date")return workshopDateValue(job);
  if(key==="estimatedHours"||key==="quantity")return Number(job[key])||0;
  return String(job[key]||"").toLocaleLowerCase("tr-TR");
}
function workshopSortHead(key,label){
  const active=s.workshopSortKey===key;
  return `<th><button type="button" class="workshop-sort-button ${active?"active":""}" data-workshop-sort="${esc(key)}">${esc(label)} <span>${active?(s.workshopSortDir==="asc"?"▲":"▼"):"↕"}</span></button></th>`;
}
function workshopMatches(job,query){
  if(!query)return true;
  return [job.id,job.title,job.partName,job.partCode,job.partType,job.factory,job.line,job.department,job.machine,job.materialSpec,job.requestedBy,job.status].join(" ").toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"));
}
function workshopUsageVisible(record){
  if(!userCanSeeFactory(record.factory))return false;
  return !roleIsDepartmentLimited()||!s.user?.department||record.department===s.user.department;
}
function workshopPartUsageHistory(){
  const completed=workshopVisibleJobs().filter(job=>job.status==="Tamamlandı");
  const materials=new Map();
  completed.forEach(job=>{
    const material=workshopMaterialForJob(job);
    const materialId=material?.id||job.deletedMaterialId;
    if(materialId)materials.set(String(materialId),{job,material});
  });
  if(!materials.size)return [];
  const rows=[];
  const addUsage=(source,entry,details)=>{
    const found=materials.get(String(entry?.materialId||""));
    if(!found)return;
    const quantity=Number(entry.quantity);
    if(!Number.isFinite(quantity)||quantity<=0)return;
    rows.push({id:`${source}-${details.id}-${details.index}`,date:entry.addedAt||details.date||"",source,sourceId:details.id,sourceTitle:details.title||"-",partName:found.material?.name||found.job.partName,partCode:found.material?.code||found.job.partCode,materialId:found.material?.id||found.job.deletedMaterialId||"",quantity,unit:entry.unit||found.material?.unit||"Adet",machine:details.machine||"Belirtilmedi",factory:details.factory||"-",department:details.department||"-",usedBy:entry.addedBy||details.usedBy||"Bilinmiyor"});
  };
  (s.faults||[]).forEach(fault=>{
    safeRecordArray(fault.usedMaterials,[]).forEach((entry,index)=>addUsage("Arıza",entry,{id:`ARZ-${fault.id}`,index,date:fault.closedAt||fault.createdAt,title:fault.subject||fault.description,machine:fault.machine,factory:fault.factory,department:fault.department,usedBy:fault.solutionBy||fault.openedBy}));
  });
  (s.workItems||[]).filter(item=>item.kind==="workorder").forEach(item=>{
    safeRecordArray(item.usedMaterials,[]).forEach((entry,index)=>addUsage("İş Emri",entry,{id:item.id,index,date:item.completedAt||item.updatedAt||item.createdAt,title:item.title,machine:item.machine||item.location,factory:item.factory,department:item.department,usedBy:item.completedBy||item.updatedBy||item.createdBy}));
  });
  return rows.filter(workshopUsageVisible).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
}
function workshopUsageMatches(row,query){
  if(!query)return true;
  return [row.source,row.sourceId,row.sourceTitle,row.partName,row.partCode,row.machine,row.factory,row.department,row.usedBy].join(" ").toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"));
}
function workshopUsageSortValue(row,key){
  if(key==="date")return new Date(row.date||0).getTime()||0;
  if(key==="quantity")return Number(row.quantity)||0;
  return String(row[key]||"").toLocaleLowerCase("tr-TR");
}
function workshopUsageSortHead(key,label){
  const active=s.workshopUsageSortKey===key;
  return `<th><button type="button" class="workshop-sort-button ${active?"active":""}" data-workshop-usage-sort="${esc(key)}">${esc(label)} <span>${active?(s.workshopUsageSortDir==="asc"?"▲":"▼"):"↕"}</span></button></th>`;
}
function workshopUsageTable(rows){
  return `<div class="card table-wrap workshop-table-wrap workshop-usage-wrap"><table class="workshop-table workshop-usage-table"><thead><tr>${workshopUsageSortHead("date","Kullanım Tarihi")}${workshopUsageSortHead("partCode","Parça Kodu")}${workshopUsageSortHead("partName","Üretilen Parça")}${workshopUsageSortHead("quantity","Miktar")}${workshopUsageSortHead("source","Kaynak")}${workshopUsageSortHead("machine","Kullanıldığı Makine / Konum")}${workshopUsageSortHead("factory","Fabrika")}${workshopUsageSortHead("usedBy","Kaydı Giren")}</tr></thead><tbody>${rows.map(row=>`<tr><td data-label="Kullanım Tarihi">${fmtDate(row.date)}</td><td data-label="Parça Kodu"><code>${esc(row.partCode||"-")}</code></td><td data-label="Üretilen Parça"><b>${esc(row.partName)}</b><small>${esc(row.sourceId)} · ${esc(row.sourceTitle)}</small></td><td data-label="Miktar"><b>${Number(row.quantity.toFixed(2))} ${esc(row.unit)}</b></td><td data-label="Kaynak"><span class="workshop-usage-source ${row.source==="Arıza"?"fault":"order"}">${esc(row.source)}</span></td><td data-label="Kullanıldığı Makine / Konum">${esc(row.machine)}</td><td data-label="Fabrika">${esc(row.factory)}<small>${esc(row.department)}</small></td><td data-label="Kaydı Giren">${esc(row.usedBy)}</td></tr>`).join("")||'<tr><td colspan="8"><div class="compact-empty"><p>Atölyede üretilen ve arıza ya da iş emrinde kullanılan parça kaydı henüz bulunmuyor.</p></div></td></tr>'}</tbody></table></div>`;
}
function workshopCreatePanel(){
  if(!canCreateWorkshopRequest()&&!canCreateWorkshopDirect())return "";
  const direct=canCreateWorkshopDirect()&&!canCreateWorkshopRequest();
  const factories=userFactories();
  const factory=factories[0]||"1. Fabrika";
  const line=(FACTORIES[factory]||[])[0]||"";
  const departments=roleIsDepartmentLimited()&&s.user?.department?[s.user.department]:catalogDepartments(factory,line);
  const department=departments[0]||"";
  return `<details class="workshop-create-panel" ${s.workshopCreateOpen?"open":""}>
    <summary><span>＋</span><div><b>${direct?"Kendi Yaptığım İşi Ekle":"Yeni Atölye Talebi"}</b><small>${direct?"Atölyede talep olmadan ürettiğiniz, revize ettiğiniz veya tamamladığınız parçayı kaydedin.":"Üretilecek veya revize edilecek mekanik parçayı tanımlayın."}</small></div><i>⌄</i></summary>
    <form id="workshopCreateForm" class="workshop-create-form">
      <div class="field"><label>Fabrika *</label><select id="workshopFactory" required>${factories.map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field"><label>Hat *</label><select id="workshopLine" required>${(FACTORIES[factory]||[]).map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field"><label>Bölüm *</label><select id="workshopDepartment" ${roleIsDepartmentLimited()?"disabled":""} required>${departments.map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field"><label>Makine *</label><select id="workshopMachine" required>${catalogMachines(factory,line,department).map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field wide"><label>${direct?"İş Başlığı":"Talep Başlığı"} *</label><input id="workshopTitle" maxlength="140" placeholder="Örn. Pres rulo mili imalatı" required></div>
      <div class="field"><label>Parça Adı *</label><input id="workshopPartName" maxlength="120" required></div>
      <div class="field"><label>Parça Kodu</label><input id="workshopPartCode" maxlength="50" placeholder="Otomatik oluşturulabilir"></div>
      <div class="field"><label>Parça Tipi *</label><select id="workshopPartType">${WORKSHOP_PART_TYPES.map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field"><label>Üretilen / İstenen Adet *</label><input id="workshopQuantity" type="number" min="1" step="1" value="1" required></div>
      <div class="field"><label>Minimum Stok Adedi *</label><input id="workshopMinimumStock" type="number" min="0" step="1" value="0" required><small class="field-help">Parça kartı oluştuğunda stok uyarı eşiği olarak kullanılır.</small></div>
      <div class="field"><label>Malzeme / Hammadde</label><input id="workshopMaterialSpec" maxlength="100" placeholder="Örn. C45 çelik, bronz"></div>
      <div class="field"><label>Öncelik *</label><select id="workshopPriority"><option>Normal</option><option>Orta</option><option>Yüksek</option><option>Acil</option></select></div>
      <div class="field wide"><label>Ölçüler ve İş Açıklaması *</label><textarea id="workshopDescription" rows="4" maxlength="1800" required></textarea></div>
      <div class="field wide"><label>Teknik Resim / Dosya</label><input id="workshopDrawing" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.dxf"><small class="field-help">PDF veya görsel dosyalar en fazla 1,5 MB olabilir.</small></div>
      ${direct?`<div class="field"><label>İş Durumu *</label><select id="workshopDirectStatus"><option>Üretimde</option><option>Tamamlandı</option></select></div><div class="field"><label>Çalışma Süresi (saat) *</label><input id="workshopDirectHours" type="number" min=".5" step=".5" value="1" required></div><div class="field wide"><label>Yapılan İş / Üretim Notu *</label><textarea id="workshopDirectNotes" rows="3" required></textarea></div>`:""}
      <div class="modal-actions wide"><button type="reset" class="secondary">Temizle</button><button type="submit" class="primary">${direct?"Yapılan İşi Kaydet":"Atölye Talebi Oluştur"}</button></div>
    </form>
  </details>`;
}
function workshopPage(){
  const allJobs=workshopVisibleJobs();
  const active=allJobs.filter(job=>!["Tamamlandı","Reddedildi"].includes(job.status));
  const archive=allJobs.filter(job=>["Tamamlandı","Reddedildi"].includes(job.status));
  const usage=workshopPartUsageHistory();
  const producedMaterials=[...new Map(allJobs.filter(job=>job.status==="Tamamlandı").map(job=>{
    const material=workshopMaterialForJob(job);
    return material?[material.id,material]:null;
  }).filter(Boolean)).values()];
  const lowStock=producedMaterials.filter(material=>Number(material.stock)<=Number(material.minStock));
  const isUsage=s.workshopTab==="usage";
  let jobs=isUsage?[]:(s.workshopTab==="archive"?archive:active);
  jobs=jobs.filter(job=>workshopMatches(job,s.workshopSearch||"")).sort((a,b)=>{
    const av=workshopSortValue(a,s.workshopSortKey),bv=workshopSortValue(b,s.workshopSortKey);
    const result=typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv),"tr",{numeric:true});
    return (s.workshopSortDir==="desc"?-result:result)||workshopDateValue(b)-workshopDateValue(a);
  });
  const usageRows=usage.filter(row=>workshopUsageMatches(row,s.workshopSearch||"")).sort((a,b)=>{
    const av=workshopUsageSortValue(a,s.workshopUsageSortKey),bv=workshopUsageSortValue(b,s.workshopUsageSortKey);
    const result=typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv),"tr",{numeric:true});
    return (s.workshopUsageSortDir==="desc"?-result:result)||(new Date(b.date||0)-new Date(a.date||0));
  });
  const shownCount=isUsage?usageRows.length:jobs.length;
  return `${clockBlock()}
    <section class="desktop-page-title workshop-page-title"><div><span>MEKANİK PARÇA ÜRETİMİ</span><h1>Mekanik Atölye</h1><p>Parça imalatını, minimum stok eşiklerini, teknik resimleri ve kullanım geçmişini tek akışta yönetin.</p></div><div class="record-count"><small>GÖSTERİLEN KAYIT</small><b>${shownCount}</b></div></section>
    ${workshopCreatePanel()}
    <section class="workshop-kpis workshop-kpis-expanded"><article><small>AKTİF İŞ</small><b>${active.length}</b></article><article><small>ÜRETİMDE</small><b>${active.filter(job=>job.status==="Üretimde").length}</b></article><article><small>KONTROL BEKLEYEN</small><b>${active.filter(job=>job.status==="Kontrol Bekliyor").length}</b></article><article><small>ARŞİVLENEN</small><b>${archive.length}</b></article><article><small>ÜRETİLEN PARÇA KARTI</small><b>${producedMaterials.length}</b></article><article class="${lowStock.length?"stock-warning":""}"><small>MİNİMUM STOK ALTI</small><b>${lowStock.length}</b></article></section>
    <section class="workshop-toolbar"><div class="workshop-tabs"><button data-workshop-tab="active" class="${s.workshopTab==="active"?"active":""}">Aktif İşler <span>${active.length}</span></button><button data-workshop-tab="archive" class="${s.workshopTab==="archive"?"active":""}">İş Arşivi <span>${archive.length}</span></button><button data-workshop-tab="usage" class="${isUsage?"active":""}">Parça Kullanım Geçmişi <span>${usage.length}</span></button></div><label class="record-search"><span>⌕</span><input id="workshopSearch" value="${esc(s.workshopSearch||"")}" placeholder="${isUsage?"Parça, kod, kaynak, makine veya kişi ara":"Parça, kod, makine, talep açan veya durum ara"}"></label></section>
    ${isUsage?workshopUsageTable(usageRows):`<div class="card table-wrap workshop-table-wrap"><table class="workshop-table"><thead><tr>${workshopSortHead("date","Tarih")}${workshopSortHead("partCode","Kod")}${workshopSortHead("partName","Parça")}${workshopSortHead("partType","Tip")}${workshopSortHead("machine","Kullanılacağı Makine")}${workshopSortHead("requestedBy","Talep Açan")}${workshopSortHead("minimumStock","Min. Stok")}${workshopSortHead("estimatedHours","Tahmini Süre")}${workshopSortHead("status","Durum")}</tr></thead><tbody>${jobs.map(job=>{const material=workshopMaterialForJob(job);return `<tr class="workshop-detail-row" tabindex="0" data-workshop-detail="${esc(job.id)}"><td data-label="Tarih">${fmtDate(job.requestedAt)}</td><td data-label="Kod"><code>${esc(job.partCode||"-")}</code></td><td data-label="Parça"><b>${esc(job.partName)}</b><small>${job.quantity} adet · ${esc(job.materialSpec||"Malzeme belirtilmedi")}</small></td><td data-label="Tip">${esc(job.partType)}</td><td data-label="Kullanılacağı Makine"><b>${esc(job.machine)}</b><small>${esc(job.factory)} · ${esc(job.department)}</small></td><td data-label="Talep Açan">${esc(job.requestedBy)}</td><td data-label="Min. Stok"><b>${Number(job.minimumStock)||0} adet</b><small>${material?`Mevcut: ${Number(material.stock)||0} ${esc(material.unit||"Adet")}`:"Parça kartı bekliyor"}</small></td><td data-label="Tahmini Süre">${job.estimatedHours?`${job.estimatedHours} saat`:"Bekleniyor"}</td><td data-label="Durum"><span class="workshop-status ${workshopStatusClass(job.status)}">${esc(job.status)}</span></td></tr>`;}).join("")||'<tr><td colspan="9"><div class="compact-empty"><p>Seçilen kriterlere uygun atölye işi bulunmuyor.</p></div></td></tr>'}</tbody></table></div>`}
    ${workshopDetailModal()}`;
}
function workshopSelectOptions(values,selected){
  return values.map(value=>`<option ${value===selected?"selected":""}>${esc(value)}</option>`).join("");
}
function workshopPartCodeConflict(partCode,jobId=""){
  const code=String(partCode||"").trim().toLocaleUpperCase("tr-TR");
  if(!code)return null;
  const job=(s.workshopJobs||[]).find(item=>String(item.id)===String(jobId));
  return MATERIALS.find(material=>String(material.code||"").trim().toLocaleUpperCase("tr-TR")===code&&String(job?.linkedMaterialId||"")!==String(material.id))||null;
}
function workshopLocationIsValid(values){
  return !!values?.factory&&userCanSeeFactory(values.factory)
    &&(FACTORIES[values.factory]||[]).includes(values.line)
    &&catalogDepartments(values.factory,values.line).includes(values.department)
    &&catalogMachines(values.factory,values.line,values.department).includes(values.machine);
}
function workshopDetailModal(){
  if(!s.workshopDetailId)return "";
  const job=(s.workshopJobs||[]).find(item=>String(item.id)===String(s.workshopDetailId));
  if(!job)return "";
  const linked=workshopMaterialForJob(job);
  const factories=userFactories();
  const lines=FACTORIES[job.factory]||[];
  const departments=catalogDepartments(job.factory,job.line);
  const machines=catalogMachines(job.factory,job.line,job.department);
  const canEditLinked=!!linked&&canManageMaterialCatalog(linked);
  const drawing=job.technicalDrawingData?`<a class="secondary workshop-drawing-link" href="${esc(job.technicalDrawingData)}" download="${esc(job.technicalDrawingName||"teknik-resim")}">Teknik Resmi Aç / İndir</a>`:job.technicalDrawingName?`<span class="workshop-file-name">${esc(job.technicalDrawingName)}</span>`:'<span class="workshop-file-name empty">Teknik resim eklenmedi</span>';
  return `<div class="modal-backdrop" id="workshopDetailBackdrop"><div class="modal workshop-detail-modal">
    <div class="modal-head"><div><span>${job.directEntry?"ATÖLYE ÜRETİM KAYDI":"ATÖLYE İŞİ"} ${esc(job.id)}</span><h2>${esc(job.partName)}</h2><p>${esc(job.factory)} · ${esc(job.department)} · ${esc(job.machine)}</p></div><button id="closeWorkshopDetail">×</button></div>
    <div class="workshop-detail-hero"><div><small>PARÇA KODU</small><b>${esc(job.partCode||"-")}</b></div><div><small>PARÇA TİPİ</small><b>${esc(job.partType)}</b></div><div><small>ÜRETİLEN / İSTENEN</small><b>${Number(job.quantity)||0} adet</b></div><div><small>MİNİMUM STOK</small><b>${Number(job.minimumStock)||0} adet</b></div><div><small>DURUM</small><b class="workshop-status ${workshopStatusClass(job.status)}">${esc(job.status)}</b></div></div>
    <div class="workshop-detail-grid"><section><span>TALEP VE KULLANIM</span><p><b>${job.directEntry?"İşi kaydeden":"Talep başlığı"}:</b> ${job.directEntry?`${esc(job.requestedBy)} · ${fmtDate(job.requestedAt)}`:esc(job.title)}</p><p><b>Kullanılacağı makine:</b> ${esc(job.machine)}</p><p><b>Konum:</b> ${esc(job.factory)} · ${esc(job.line)} · ${esc(job.department)}</p>${job.directEntry?`<p><b>İş başlığı:</b> ${esc(job.title)}</p>`:`<p><b>Talep açan:</b> ${esc(job.requestedBy)} · ${fmtDate(job.requestedAt)}</p>`}</section><section><span>TEKNİK BİLGİ</span><p><b>Hammadde:</b> ${esc(job.materialSpec||"-")}</p><p><b>Açıklama / Ölçüler:</b> ${esc(job.description)}</p><p><b>Teknik resim:</b></p>${drawing}</section></div>
    ${canManageWorkshopJobs()?`<form id="workshopManageForm" class="workshop-manage-form" data-workshop-id="${esc(job.id)}"><section class="workshop-edit-section"><div class="workshop-section-title"><span>PARÇA VE KULLANIM BİLGİLERİ</span><p>Parça bilgilerini, minimum stok adedini ve teknik resmi güncelleyin.</p></div><div class="workshop-edit-grid"><div class="field"><label>Fabrika *</label><select id="workshopEditFactory" required>${workshopSelectOptions(factories,job.factory)}</select></div><div class="field"><label>Hat *</label><select id="workshopEditLine" required>${workshopSelectOptions(lines,job.line)}</select></div><div class="field"><label>Bölüm *</label><select id="workshopEditDepartment" required>${workshopSelectOptions(departments,job.department)}</select></div><div class="field"><label>Makine *</label><select id="workshopEditMachine" required>${workshopSelectOptions(machines,job.machine)}</select></div><div class="field wide"><label>İş Başlığı *</label><input id="workshopEditTitle" maxlength="140" value="${esc(job.title)}" required></div><div class="field"><label>Parça Adı *</label><input id="workshopEditPartName" maxlength="120" value="${esc(job.partName)}" required></div><div class="field"><label>Parça Kodu *</label><input id="workshopEditPartCode" maxlength="50" value="${esc(job.partCode||"")}" required></div><div class="field"><label>Parça Tipi *</label><select id="workshopEditPartType">${workshopSelectOptions(WORKSHOP_PART_TYPES,job.partType)}</select></div><div class="field"><label>Üretilen / İstenen Adet *</label><input id="workshopEditQuantity" type="number" min="1" step="1" value="${Number(job.quantity)||1}" required></div><div class="field"><label>Minimum Stok Adedi *</label><input id="workshopEditMinimumStock" type="number" min="0" step="1" value="${Number(job.minimumStock)||0}" required></div><div class="field"><label>Malzeme / Hammadde</label><input id="workshopEditMaterialSpec" maxlength="100" value="${esc(job.materialSpec||"")}"></div><div class="field"><label>Öncelik *</label><select id="workshopEditPriority">${workshopSelectOptions(["Normal","Orta","Yüksek","Acil"],job.priority||"Normal")}</select></div><div class="field wide"><label>Ölçüler ve İş Açıklaması *</label><textarea id="workshopEditDescription" rows="4" maxlength="1800" required>${esc(job.description||"")}</textarea></div><div class="field wide"><label>Teknik Resim / Dosya</label><input id="workshopEditDrawing" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.dxf"><small class="field-help">Yeni bir dosya seçildiğinde mevcut teknik resmin yerine geçer. En fazla 1,5 MB.</small>${job.technicalDrawingName?`<label class="workshop-remove-drawing"><input id="workshopRemoveDrawing" type="checkbox"> Mevcut teknik resmi kaldır (${esc(job.technicalDrawingName)})</label>`:""}</div></div></section><section class="workshop-progress-section"><div class="workshop-section-title"><span>ÜRETİM VE SONUÇ</span><p>İşin durumunu, tahmini süresini ve atölye notunu güncelleyin.</p></div><div class="workshop-progress-grid"><div class="field"><label>Durum *</label><select id="workshopStatus">${workshopSelectOptions(WORKSHOP_STATUSES,job.status)}</select></div><div class="field"><label>Tahmini Süre (saat) *</label><input id="workshopEstimate" type="number" min=".5" step=".5" value="${job.estimatedHours||""}" required></div><div class="field wide"><label>Atölye Çalışma Notu</label><textarea id="workshopNotes" rows="4">${esc(job.workNotes||"")}</textarea></div></div></section><button class="primary wide" type="submit">Parça ve Üretim Bilgilerini Kaydet</button></form>`:""}
    <section class="workshop-material-link"><div><span>MALZEME KATALOĞU BAĞLANTISI</span><b>${linked?`${esc(linked.code)} · ${esc(linked.name)}`:"Henüz malzeme kartıyla ilişkilendirilmedi"}</b><p>${linked?`Mevcut stok: ${Number(linked.stock)||0} ${esc(linked.unit||"Adet")} · Minimum stok: ${Number(linked.minStock)||0} ${esc(linked.unit||"Adet")}.`:"Tamamlanan parça stok ve kullanım takibi için malzeme kartına bağlanır."}</p></div>${linked&&canEditLinked?`<button type="button" class="primary" data-workshop-open-material="${esc(linked.id)}">Parça Kartını Düzenle</button>`:canManageWorkshopJobs()&&job.status==="Tamamlandı"&&!linked?`<button type="button" class="primary" data-workshop-create-material="${esc(job.id)}">Stok Kartını Oluştur</button>`:""}</section>
  </div></div>`;
}
function readWorkshopDrawing(file){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve({name:"",data:""});
    if(file.size>1.5*1024*1024)return reject(new Error("Teknik resim dosyası 1,5 MB sınırını aşıyor."));
    const reader=new FileReader();
    reader.onload=()=>resolve({name:file.name,data:String(reader.result||"")});
    reader.onerror=()=>reject(new Error("Teknik resim okunamadı."));
    reader.readAsDataURL(file);
  });
}
function nextWorkshopId(){
  const values=(s.workshopJobs||[]).map(job=>Number(String(job.id).replace(/\D/g,""))||0);
  return `AT-${Math.max(1000,...values)+1}`;
}
function bindWorkshopPage(){
  document.querySelectorAll("[data-workshop-tab]").forEach(button=>button.onclick=()=>{const tab=button.dataset.workshopTab;s.workshopTab=["active","archive","usage"].includes(tab)?tab:"active";s.workshopDetailId=null;render()});
  const search=document.getElementById("workshopSearch");
  if(search)search.oninput=()=>{const pos=search.selectionStart;s.workshopSearch=search.value;render();const next=document.getElementById("workshopSearch");if(next){next.focus();next.setSelectionRange(pos,pos)}};
  document.querySelectorAll("[data-workshop-sort]").forEach(button=>button.onclick=()=>{const key=button.dataset.workshopSort;if(s.workshopSortKey===key)s.workshopSortDir=s.workshopSortDir==="asc"?"desc":"asc";else{s.workshopSortKey=key;s.workshopSortDir=["date","estimatedHours","quantity","minimumStock"].includes(key)?"desc":"asc"}render()});
  document.querySelectorAll("[data-workshop-usage-sort]").forEach(button=>button.onclick=()=>{const key=button.dataset.workshopUsageSort;if(s.workshopUsageSortKey===key)s.workshopUsageSortDir=s.workshopUsageSortDir==="asc"?"desc":"asc";else{s.workshopUsageSortKey=key;s.workshopUsageSortDir=["date","quantity"].includes(key)?"desc":"asc"}render()});
  document.querySelectorAll(".workshop-detail-row").forEach(row=>{const open=()=>{s.workshopDetailId=row.dataset.workshopDetail;render()};row.onclick=open;row.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}}});
  const close=()=>{s.workshopDetailId=null;render()};
  const closeButton=document.getElementById("closeWorkshopDetail");if(closeButton)closeButton.onclick=close;
  const backdrop=document.getElementById("workshopDetailBackdrop");if(backdrop)backdrop.onclick=e=>{if(e.target===backdrop)close()};
  const bindLocationSelectors=(factory,line,department,machine,{departmentOnly=false}={})=>{
    if(!factory||!line||!department||!machine)return;
    const refreshMachines=()=>{const previous=machine.value;const values=catalogMachines(factory.value,line.value,department.value);machine.innerHTML=workshopSelectOptions(values,values.includes(previous)?previous:values[0]||"")};
    const refreshDepartments=()=>{const previous=department.value;const values=departmentOnly&&s.user?.department?[s.user.department]:catalogDepartments(factory.value,line.value);department.innerHTML=workshopSelectOptions(values,values.includes(previous)?previous:values[0]||"");refreshMachines()};
    factory.onchange=()=>{const previous=line.value;const values=FACTORIES[factory.value]||[];line.innerHTML=workshopSelectOptions(values,values.includes(previous)?previous:values[0]||"");refreshDepartments()};
    line.onchange=refreshDepartments;
    department.onchange=refreshMachines;
  };
  const factory=document.getElementById("workshopFactory"),line=document.getElementById("workshopLine"),department=document.getElementById("workshopDepartment"),machine=document.getElementById("workshopMachine");
  bindLocationSelectors(factory,line,department,machine,{departmentOnly:roleIsDepartmentLimited()});
  const editFactory=document.getElementById("workshopEditFactory"),editLine=document.getElementById("workshopEditLine"),editDepartment=document.getElementById("workshopEditDepartment"),editMachine=document.getElementById("workshopEditMachine");
  bindLocationSelectors(editFactory,editLine,editDepartment,editMachine);
  const create=document.getElementById("workshopCreateForm");
  if(create)create.onsubmit=async e=>{
    e.preventDefault();if(!canCreateWorkshopRequest()&&!canCreateWorkshopDirect())return;
    try{
      const drawing=await readWorkshopDrawing(document.getElementById("workshopDrawing")?.files?.[0]);
      const values={factory:factory.value,line:line.value,department:department.value,machine:machine.value};
      if(!workshopLocationIsValid(values)){alert("Geçersiz fabrika, bölüm veya makine seçimi.");return}
      if(roleIsDepartmentLimited()&&values.department!==s.user.department){alert("Yalnızca kendi bölümünüz için talep açabilirsiniz.");return}
      const title=document.getElementById("workshopTitle").value.trim();
      const partName=document.getElementById("workshopPartName").value.trim();
      const id=nextWorkshopId();
      const direct=canCreateWorkshopDirect()&&!canCreateWorkshopRequest();
      const directStatus=direct?document.getElementById("workshopDirectStatus").value:"Talep Açıldı";
      const now=new Date().toISOString();
      const directHours=direct?Number(document.getElementById("workshopDirectHours").value):null;
      const directNotes=direct?document.getElementById("workshopDirectNotes").value.trim():"";
      const quantity=Number(document.getElementById("workshopQuantity").value);
      const minimumStock=Number(document.getElementById("workshopMinimumStock").value);
      const partCode=document.getElementById("workshopPartCode").value.trim().toLocaleUpperCase("tr-TR")||`ATM-${id.replace(/\D/g,"")}`;
      if(!title||!partName||!Number.isInteger(quantity)||quantity<1||!Number.isInteger(minimumStock)||minimumStock<0){alert("İş başlığı, parça adı, adet ve minimum stok bilgilerini eksiksiz girin.");return}
      if(direct&&(!Number.isFinite(directHours)||directHours<=0||!directNotes)){alert("Yapılan iş notu ve çalışma süresi zorunludur.");return}
      const duplicate=workshopPartCodeConflict(partCode);
      if(duplicate){alert(`"${partCode}" kodu ${duplicate.name} malzemesinde zaten kullanılıyor.`);return}
      const job=normalizeWorkshopJob({...values,id,title,partName,partCode,partType:document.getElementById("workshopPartType").value,quantity,minimumStock,materialSpec:document.getElementById("workshopMaterialSpec").value.trim(),priority:document.getElementById("workshopPriority").value,description:document.getElementById("workshopDescription").value.trim(),technicalDrawingName:drawing.name,technicalDrawingData:drawing.data,status:directStatus,requestedBy:s.user?.name||"",requestedAt:now,approvedBy:direct?s.user?.name||"": "",approvedAt:direct?now:null,startedAt:direct?now:null,completedAt:direct&&directStatus==="Tamamlandı"?now:null,completedBy:direct&&directStatus==="Tamamlandı"?s.user?.name||"":"",estimatedHours:directHours,workNotes:directNotes,linkedMaterialId:"",directEntry:direct,createdBy:s.user?.name||""});
      s.workshopJobs.push(job);
      const materialResult=job.status==="Tamamlandı"?ensureWorkshopMaterial(job,s.user?.name||""):{ok:true};
      if(!materialResult.ok){s.workshopJobs.pop();alert(materialResult.message||"Parça stok kartı oluşturulamadı.");return}
      saveWorkshopJobs();s.workshopCreateOpen=false;s.workshopTab=job.status==="Tamamlandı"?"archive":"active";render();
    }catch(error){alert(error.message)}
  };
  const manage=document.getElementById("workshopManageForm");
  if(manage)manage.onsubmit=async e=>{
    e.preventDefault();if(!canManageWorkshopJobs())return;
    try{
      const job=s.workshopJobs.find(item=>String(item.id)===String(manage.dataset.workshopId));if(!job)return;
      const values={factory:editFactory.value,line:editLine.value,department:editDepartment.value,machine:editMachine.value};
      const title=document.getElementById("workshopEditTitle").value.trim();
      const partName=document.getElementById("workshopEditPartName").value.trim();
      const partCode=document.getElementById("workshopEditPartCode").value.trim().toLocaleUpperCase("tr-TR");
      const quantity=Number(document.getElementById("workshopEditQuantity").value);
      const minimumStock=Number(document.getElementById("workshopEditMinimumStock").value);
      const estimatedHours=Number(document.getElementById("workshopEstimate").value);
      if(!workshopLocationIsValid(values)||!title||!partName||!partCode||!Number.isInteger(quantity)||quantity<1||!Number.isInteger(minimumStock)||minimumStock<0||!Number.isFinite(estimatedHours)||estimatedHours<=0){alert("Zorunlu parça, konum, stok veya süre bilgisini kontrol edin.");return}
      const duplicate=workshopPartCodeConflict(partCode,job.id);
      if(duplicate){alert(`"${partCode}" kodu ${duplicate.name} malzemesinde zaten kullanılıyor.`);return}
      const file=document.getElementById("workshopEditDrawing")?.files?.[0];
      const drawing=file?await readWorkshopDrawing(file):null;
      const removeDrawing=!!document.getElementById("workshopRemoveDrawing")?.checked;
      const previous={...job};
      const now=new Date().toISOString();
      const status=document.getElementById("workshopStatus").value;
      Object.assign(job,{...values,title,partName,partCode,partType:document.getElementById("workshopEditPartType").value,quantity,minimumStock,materialSpec:document.getElementById("workshopEditMaterialSpec").value.trim(),priority:document.getElementById("workshopEditPriority").value,description:document.getElementById("workshopEditDescription").value.trim(),status,estimatedHours,workNotes:document.getElementById("workshopNotes").value.trim(),updatedBy:s.user?.name||"",updatedAt:now});
      if(removeDrawing){job.technicalDrawingName="";job.technicalDrawingData=""}else if(drawing){job.technicalDrawingName=drawing.name;job.technicalDrawingData=drawing.data}
      if(["Onaylandı","Üretimde","Kontrol Bekliyor","Tamamlandı"].includes(status)&&!job.approvedAt){job.approvedAt=now;job.approvedBy=s.user?.name||""}
      if(["Üretimde","Kontrol Bekliyor","Tamamlandı"].includes(status)&&!job.startedAt)job.startedAt=now;
      if(status==="Tamamlandı"&&!job.completedAt){job.completedAt=now;job.completedBy=s.user?.name||""}
      const linked=workshopMaterialForJob(job);
      const materialResult=status==="Tamamlandı"?ensureWorkshopMaterial(job,s.user?.name||""):(linked?.workshopJobId===job.id?workshopSyncMaterialFromJob(job,s.user?.name||""):{ok:true});
      if(!materialResult.ok){Object.assign(job,previous);alert(materialResult.message||"Parça stok kartı güncellenemedi.");return}
      saveWorkshopJobs();s.workshopTab=["Tamamlandı","Reddedildi"].includes(status)?"archive":"active";render();
    }catch(error){alert(error.message)}
  };
  document.querySelectorAll("[data-workshop-create-material]").forEach(button=>button.onclick=()=>{
    if(!canManageWorkshopJobs())return;
    const job=s.workshopJobs.find(item=>String(item.id)===String(button.dataset.workshopCreateMaterial));if(!job)return;
    const result=ensureWorkshopMaterial(job,s.user?.name||"");
    if(!result.ok){alert(result.message||"Parça stok kartı oluşturulamadı.");return}
    saveWorkshopJobs();render();
  });
  document.querySelectorAll("[data-workshop-open-material]").forEach(button=>button.onclick=()=>{
    const material=materialById(button.dataset.workshopOpenMaterial);
    if(!material||!canManageMaterialCatalog(material))return;
    s.workshopDetailId=null;s.materialEditId=material.id;s.page="materials";render();
  });
}
function workshopPartsForMachine(factory,line,department,machine){
  return (s.workshopJobs||[]).filter(job=>job.factory===factory&&job.line===line&&job.department===department&&job.machine===machine&&job.status==="Tamamlandı").sort((a,b)=>new Date(b.completedAt||b.requestedAt)-new Date(a.completedAt||a.requestedAt));
}
