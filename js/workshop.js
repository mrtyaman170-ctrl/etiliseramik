/* Mekanik Atölye — parça üretim talepleri, üretim ve arşiv */
const WORKSHOP_KEY="etilismart_workshop_jobs_v1";
const WORKSHOP_STATUSES=["Talep Açıldı","İnceleniyor","Onaylandı","Üretimde","Kontrol Bekliyor","Tamamlandı","Reddedildi"];
const WORKSHOP_PART_TYPES=["Mil","Burç","Flanş","Dişli","Kasnak","Rulo","Yatak","Bağlantı Parçası","Koruyucu / Muhafaza","Kaynaklı İmalat","Revizyon","Diğer"];
function workshopSeed(){
  const now=Date.now();
  return [
    {id:"AT-1001",title:"Pres rulo mili imalatı",partName:"Pres Rulo Mili",partCode:"ATM-PRM-001",partType:"Mil",quantity:2,factory:"1. Fabrika",line:"1. Hat",department:"Pres Bölümü",machine:"Pres Rulo ve Kayışlar",description:"Aşınan mil numuneye göre işlenecek. Rulman yatakları ölçülerek tolerans korunacak.",materialSpec:"C45 çelik",technicalDrawingName:"",technicalDrawingData:"",priority:"Yüksek",status:"Üretimde",requestedBy:"Halil İbrahim Utku",requestedAt:new Date(now-26*3600000).toISOString(),approvedBy:"Atölye Sorumlusu",approvedAt:new Date(now-20*3600000).toISOString(),estimatedHours:12,startedAt:new Date(now-18*3600000).toISOString(),completedAt:null,workNotes:"Kaba tornalama tamamlandı.",linkedMaterialId:""},
    {id:"AT-0998",title:"Konveyör yatak burcu",partName:"Konveyör Yatak Burcu",partCode:"ATM-KYB-004",partType:"Burç",quantity:4,factory:"2. Fabrika A Blok",line:"1. Hat",department:"Sır Bantları",machine:"Konveyör Bantlar",description:"Eski parçaya göre bronz burç üretildi.",materialSpec:"Bronz",technicalDrawingName:"KYB-004.pdf",technicalDrawingData:"",priority:"Orta",status:"Tamamlandı",requestedBy:"Kemal Ayrancı",requestedAt:new Date(now-12*86400000).toISOString(),approvedBy:"Atölye Sorumlusu",approvedAt:new Date(now-11*86400000).toISOString(),estimatedHours:6,startedAt:new Date(now-10*86400000).toISOString(),completedAt:new Date(now-9*86400000).toISOString(),completedBy:"Atölye Sorumlusu",workNotes:"Ölçü kontrolü yapıldı ve bölüme teslim edildi.",linkedMaterialId:""}
  ];
}
function loadWorkshopJobs(){return storageJsonRecordArray(localStorage,WORKSHOP_KEY,workshopSeed())}
function saveWorkshopJobs(){storageSet(localStorage,WORKSHOP_KEY,JSON.stringify(s.workshopJobs||[]))}
function canCreateWorkshopRequest(){return !!permissions().createWorkshopRequest}
function canCreateWorkshopDirect(){return !!permissions().createWorkshopDirect}
function canManageWorkshopJobs(){return !!permissions().manageWorkshopJobs}
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
function workshopCreatePanel(){
  if(!canCreateWorkshopRequest()&&!canCreateWorkshopDirect())return "";
  const direct=canCreateWorkshopDirect()&&!canCreateWorkshopRequest();
  const factories=userFactories();
  const factory=factories[0]||"1. Fabrika";
  const line=(FACTORIES[factory]||[])[0]||"";
  const departments=roleIsDepartmentLimited()&&s.user?.department?[s.user.department]:catalogDepartments(factory,line);
  const department=departments[0]||"";
  return `<details class="workshop-create-panel" ${s.workshopCreateOpen?"open":""}>
    <summary><span>＋</span><div><b>${direct?"Talep Olmadan Yapılan İş Ekle":"Yeni Atölye Talebi"}</b><small>${direct?"Atölyede doğrudan yapılan veya başlatılan işi kaydedin.":"Üretilecek veya revize edilecek mekanik parçayı tanımlayın."}</small></div><i>⌄</i></summary>
    <form id="workshopCreateForm" class="workshop-create-form">
      <div class="field"><label>Fabrika *</label><select id="workshopFactory" required>${factories.map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field"><label>Hat *</label><select id="workshopLine" required>${(FACTORIES[factory]||[]).map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field"><label>Bölüm *</label><select id="workshopDepartment" ${roleIsDepartmentLimited()?"disabled":""} required>${departments.map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field"><label>Makine *</label><select id="workshopMachine" required>${catalogMachines(factory,line,department).map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field wide"><label>Talep Başlığı *</label><input id="workshopTitle" maxlength="140" placeholder="Örn. Pres rulo mili imalatı" required></div>
      <div class="field"><label>Parça Adı *</label><input id="workshopPartName" maxlength="120" required></div>
      <div class="field"><label>Parça Kodu</label><input id="workshopPartCode" maxlength="50" placeholder="Otomatik oluşturulabilir"></div>
      <div class="field"><label>Parça Tipi *</label><select id="workshopPartType">${WORKSHOP_PART_TYPES.map(item=>`<option>${esc(item)}</option>`).join("")}</select></div>
      <div class="field"><label>Adet *</label><input id="workshopQuantity" type="number" min="1" step="1" value="1" required></div>
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
  let jobs=workshopVisibleJobs();
  const active=jobs.filter(job=>!["Tamamlandı","Reddedildi"].includes(job.status));
  const archive=jobs.filter(job=>["Tamamlandı","Reddedildi"].includes(job.status));
  jobs=s.workshopTab==="archive"?archive:active;
  jobs=jobs.filter(job=>workshopMatches(job,s.workshopSearch||"")).sort((a,b)=>{
    const av=workshopSortValue(a,s.workshopSortKey),bv=workshopSortValue(b,s.workshopSortKey);
    const result=typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv),"tr",{numeric:true});
    return (s.workshopSortDir==="desc"?-result:result)||workshopDateValue(b)-workshopDateValue(a);
  });
  return `${clockBlock()}
    <section class="desktop-page-title workshop-page-title"><div><span>MEKANİK PARÇA ÜRETİMİ</span><h1>Mekanik Atölye</h1><p>Parça imalat taleplerini, teknik resimleri, üretim sürelerini ve tamamlanan işleri yönetin.</p></div><div class="record-count"><small>GÖSTERİLEN KAYIT</small><b>${jobs.length}</b></div></section>
    ${workshopCreatePanel()}
    <section class="workshop-kpis"><article><small>AKTİF TALEP</small><b>${active.length}</b></article><article><small>ÜRETİMDE</small><b>${active.filter(job=>job.status==="Üretimde").length}</b></article><article><small>KONTROL BEKLEYEN</small><b>${active.filter(job=>job.status==="Kontrol Bekliyor").length}</b></article><article><small>ARŞİVLENEN</small><b>${archive.length}</b></article></section>
    <section class="workshop-toolbar"><div class="workshop-tabs"><button data-workshop-tab="active" class="${s.workshopTab==="active"?"active":""}">Aktif İşler <span>${active.length}</span></button><button data-workshop-tab="archive" class="${s.workshopTab==="archive"?"active":""}">İş Arşivi <span>${archive.length}</span></button></div><label class="record-search"><span>⌕</span><input id="workshopSearch" value="${esc(s.workshopSearch||"")}" placeholder="Parça, kod, makine, talep açan veya durum ara"></label></section>
    <div class="card table-wrap workshop-table-wrap"><table class="workshop-table"><thead><tr>${workshopSortHead("date","Tarih")}${workshopSortHead("partCode","Kod")}${workshopSortHead("partName","Parça")}${workshopSortHead("partType","Tip")}${workshopSortHead("machine","Kullanılacağı Makine")}${workshopSortHead("requestedBy","Talep Açan")}${workshopSortHead("estimatedHours","Tahmini Süre")}${workshopSortHead("status","Durum")}</tr></thead><tbody>${jobs.map(job=>`<tr class="workshop-detail-row" tabindex="0" data-workshop-detail="${esc(job.id)}"><td data-label="Tarih">${fmtDate(job.requestedAt)}</td><td data-label="Kod"><code>${esc(job.partCode||"-")}</code></td><td data-label="Parça"><b>${esc(job.partName)}</b><small>${job.quantity} adet · ${esc(job.materialSpec||"Malzeme belirtilmedi")}</small></td><td data-label="Tip">${esc(job.partType)}</td><td data-label="Kullanılacağı Makine"><b>${esc(job.machine)}</b><small>${esc(job.factory)} · ${esc(job.department)}</small></td><td data-label="Talep Açan">${esc(job.requestedBy)}</td><td data-label="Tahmini Süre">${job.estimatedHours?`${job.estimatedHours} saat`:"Bekleniyor"}</td><td data-label="Durum"><span class="workshop-status ${workshopStatusClass(job.status)}">${esc(job.status)}</span></td></tr>`).join("")||'<tr><td colspan="8"><div class="compact-empty"><p>Seçilen kriterlere uygun atölye işi bulunmuyor.</p></div></td></tr>'}</tbody></table></div>
    ${workshopDetailModal()}`;
}
function workshopDetailModal(){
  if(!s.workshopDetailId)return "";
  const job=(s.workshopJobs||[]).find(item=>String(item.id)===String(s.workshopDetailId));
  if(!job)return "";
  const linked=materialById(job.linkedMaterialId);
  const drawing=job.technicalDrawingData?`<a class="secondary workshop-drawing-link" href="${esc(job.technicalDrawingData)}" download="${esc(job.technicalDrawingName||"teknik-resim")}">Teknik Resmi Aç / İndir</a>`:job.technicalDrawingName?`<span class="workshop-file-name">${esc(job.technicalDrawingName)}</span>`:'<span class="workshop-file-name empty">Teknik resim eklenmedi</span>';
  return `<div class="modal-backdrop" id="workshopDetailBackdrop"><div class="modal workshop-detail-modal">
    <div class="modal-head"><div><span>ATÖLYE İŞİ ${esc(job.id)}</span><h2>${esc(job.partName)}</h2><p>${esc(job.factory)} · ${esc(job.department)} · ${esc(job.machine)}</p></div><button id="closeWorkshopDetail">×</button></div>
    <div class="workshop-detail-hero"><div><small>PARÇA KODU</small><b>${esc(job.partCode||"-")}</b></div><div><small>PARÇA TİPİ</small><b>${esc(job.partType)}</b></div><div><small>ADET</small><b>${job.quantity}</b></div><div><small>DURUM</small><b class="workshop-status ${workshopStatusClass(job.status)}">${esc(job.status)}</b></div></div>
    <div class="workshop-detail-grid"><section><span>TALEP VE KULLANIM</span><p><b>Talep başlığı:</b> ${esc(job.title)}</p><p><b>Kullanılacağı makine:</b> ${esc(job.machine)}</p><p><b>Konum:</b> ${esc(job.factory)} · ${esc(job.line)} · ${esc(job.department)}</p><p><b>Talep açan:</b> ${esc(job.requestedBy)} · ${fmtDate(job.requestedAt)}</p></section><section><span>TEKNİK BİLGİ</span><p><b>Hammadde:</b> ${esc(job.materialSpec||"-")}</p><p><b>Açıklama / Ölçüler:</b> ${esc(job.description)}</p>${drawing}</section></div>
    ${canManageWorkshopJobs()?`<form id="workshopManageForm" class="workshop-manage-form" data-workshop-id="${esc(job.id)}"><div class="field"><label>Durum</label><select id="workshopStatus">${WORKSHOP_STATUSES.map(status=>`<option ${status===job.status?"selected":""}>${status}</option>`).join("")}</select></div><div class="field"><label>Tahmini Süre (saat)</label><input id="workshopEstimate" type="number" min=".5" step=".5" value="${job.estimatedHours||""}" required></div><div class="field wide"><label>Atölye Çalışma Notu</label><textarea id="workshopNotes" rows="4">${esc(job.workNotes||"")}</textarea></div><button class="primary wide" type="submit">Atölye Bilgilerini Kaydet</button></form>`:""}
    <section class="workshop-material-link"><div><span>MALZEME KATALOĞU BAĞLANTISI</span><b>${linked?`${esc(linked.code)} · ${esc(linked.name)}`:"Henüz malzeme kartıyla ilişkilendirilmedi"}</b><p>Tamamlanan parçayı stok ve kullanım takibine dahil edin.</p></div>${canManageWorkshopJobs()&&job.status==="Tamamlandı"&&!linked?`<button type="button" class="primary" data-workshop-create-material="${esc(job.id)}">Malzeme Kartı Oluştur</button>`:""}</section>
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
  document.querySelectorAll("[data-workshop-tab]").forEach(button=>button.onclick=()=>{s.workshopTab=button.dataset.workshopTab==="archive"?"archive":"active";s.workshopDetailId=null;render()});
  const search=document.getElementById("workshopSearch");
  if(search)search.oninput=()=>{const pos=search.selectionStart;s.workshopSearch=search.value;render();const next=document.getElementById("workshopSearch");if(next){next.focus();next.setSelectionRange(pos,pos)}};
  document.querySelectorAll("[data-workshop-sort]").forEach(button=>button.onclick=()=>{const key=button.dataset.workshopSort;if(s.workshopSortKey===key)s.workshopSortDir=s.workshopSortDir==="asc"?"desc":"asc";else{s.workshopSortKey=key;s.workshopSortDir=["date","estimatedHours","quantity"].includes(key)?"desc":"asc"}render()});
  document.querySelectorAll(".workshop-detail-row").forEach(row=>{const open=()=>{s.workshopDetailId=row.dataset.workshopDetail;render()};row.onclick=open;row.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}}});
  const close=()=>{s.workshopDetailId=null;render()};
  const closeButton=document.getElementById("closeWorkshopDetail");if(closeButton)closeButton.onclick=close;
  const backdrop=document.getElementById("workshopDetailBackdrop");if(backdrop)backdrop.onclick=e=>{if(e.target===backdrop)close()};
  const factory=document.getElementById("workshopFactory"),line=document.getElementById("workshopLine"),department=document.getElementById("workshopDepartment"),machine=document.getElementById("workshopMachine");
  const refreshMachines=()=>{if(machine)machine.innerHTML=catalogMachines(factory.value,line.value,department.value).map(item=>`<option>${esc(item)}</option>`).join("")};
  const refreshDepartments=()=>{const values=roleIsDepartmentLimited()&&s.user?.department?[s.user.department]:catalogDepartments(factory.value,line.value);department.innerHTML=values.map(item=>`<option>${esc(item)}</option>`).join("");refreshMachines()};
  if(factory)factory.onchange=()=>{line.innerHTML=(FACTORIES[factory.value]||[]).map(item=>`<option>${esc(item)}</option>`).join("");refreshDepartments()};
  if(line)line.onchange=refreshDepartments;if(department)department.onchange=refreshMachines;
  const create=document.getElementById("workshopCreateForm");
  if(create)create.onsubmit=async e=>{
    e.preventDefault();if(!canCreateWorkshopRequest()&&!canCreateWorkshopDirect())return;
    try{
      const drawing=await readWorkshopDrawing(document.getElementById("workshopDrawing")?.files?.[0]);
      const values={factory:factory.value,line:line.value,department:department.value,machine:machine.value};
      if(!userCanSeeFactory(values.factory)||!catalogMachines(values.factory,values.line,values.department).includes(values.machine)){alert("Geçersiz fabrika, bölüm veya makine seçimi.");return}
      if(roleIsDepartmentLimited()&&values.department!==s.user.department){alert("Yalnızca kendi bölümünüz için talep açabilirsiniz.");return}
      const partName=document.getElementById("workshopPartName").value.trim();
      const id=nextWorkshopId();
      const direct=canCreateWorkshopDirect()&&!canCreateWorkshopRequest();
      const directStatus=direct?document.getElementById("workshopDirectStatus").value:"Talep Açıldı";
      const now=new Date().toISOString();
      const directHours=direct?Number(document.getElementById("workshopDirectHours").value):null;
      const directNotes=direct?document.getElementById("workshopDirectNotes").value.trim():"";
      s.workshopJobs.push({...values,id,title:document.getElementById("workshopTitle").value.trim(),partName,partCode:document.getElementById("workshopPartCode").value.trim().toLocaleUpperCase("tr-TR")||`ATM-${id.replace(/\D/g,"")}`,partType:document.getElementById("workshopPartType").value,quantity:Number(document.getElementById("workshopQuantity").value),materialSpec:document.getElementById("workshopMaterialSpec").value.trim(),priority:document.getElementById("workshopPriority").value,description:document.getElementById("workshopDescription").value.trim(),technicalDrawingName:drawing.name,technicalDrawingData:drawing.data,status:directStatus,requestedBy:s.user?.name||"",requestedAt:now,approvedBy:direct?s.user.name:"",approvedAt:direct?now:null,startedAt:direct?now:null,completedAt:direct&&directStatus==="Tamamlandı"?now:null,completedBy:direct&&directStatus==="Tamamlandı"?s.user.name:"",estimatedHours:directHours,workNotes:directNotes,linkedMaterialId:""});
      saveWorkshopJobs();s.workshopCreateOpen=false;render();
    }catch(error){alert(error.message)}
  };
  const manage=document.getElementById("workshopManageForm");
  if(manage)manage.onsubmit=e=>{
    e.preventDefault();if(!canManageWorkshopJobs())return;
    const job=s.workshopJobs.find(item=>String(item.id)===String(manage.dataset.workshopId));if(!job)return;
    const previous=job.status;job.status=document.getElementById("workshopStatus").value;job.estimatedHours=Number(document.getElementById("workshopEstimate").value);job.workNotes=document.getElementById("workshopNotes").value.trim();job.updatedBy=s.user.name;job.updatedAt=new Date().toISOString();
    if(["Onaylandı","Üretimde","Kontrol Bekliyor","Tamamlandı"].includes(job.status)&&!job.approvedAt){job.approvedAt=new Date().toISOString();job.approvedBy=s.user.name}
    if(job.status==="Üretimde"&&!job.startedAt)job.startedAt=new Date().toISOString();
    if(job.status==="Tamamlandı"&&previous!=="Tamamlandı"){job.completedAt=new Date().toISOString();job.completedBy=s.user.name}
    saveWorkshopJobs();render();
  };
  document.querySelectorAll("[data-workshop-create-material]").forEach(button=>button.onclick=()=>{
    if(!canManageWorkshopJobs())return;
    const job=s.workshopJobs.find(item=>String(item.id)===String(button.dataset.workshopCreateMaterial));if(!job||job.linkedMaterialId)return;
    const duplicate=MATERIALS.find(item=>String(item.code).toLocaleUpperCase("tr-TR")===String(job.partCode).toLocaleUpperCase("tr-TR"));
    if(duplicate)job.linkedMaterialId=duplicate.id;
    else{
      const material={id:`MAT-AT-${Date.now()}`,code:job.partCode,name:job.partName,category:"Mekanik",unit:"Adet",stock:Number(job.quantity)||1,minStock:0,warehouseLocation:"Mekanik Atölye · Teslim Bekliyor",description:`${job.machine} için atölyede üretildi. Atölye işi: ${job.id}`,custom:true,workshopJobId:job.id,createdBy:s.user.name,createdAt:new Date().toISOString()};
      MATERIALS.push(material);saveMaterials();job.linkedMaterialId=material.id;
    }
    saveWorkshopJobs();render();
  });
}
function workshopPartsForMachine(factory,line,department,machine){
  return (s.workshopJobs||[]).filter(job=>job.factory===factory&&job.line===line&&job.department===department&&job.machine===machine&&job.status==="Tamamlandı").sort((a,b)=>new Date(b.completedAt||b.requestedAt)-new Date(a.completedAt||a.requestedAt));
}
