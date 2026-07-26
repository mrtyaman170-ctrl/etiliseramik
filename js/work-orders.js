/* İş talebi ve iş emri veri/yetki işlemleri */
const PM_KEY="etilismart_planned_maintenance_v1";
const WORK_KEY="etilismart_work_requests_v1";
function workIsoOffset(days=0,hour=9){
  const d=new Date();d.setDate(d.getDate()+days);d.setHours(hour,0,0,0);return d.toISOString();
}
function generateWorkItems(){
  return [
    {id:"TLP-1001",kind:"request",factory:"1. Fabrika",department:"Pres Bölümü",location:"1. Pres elektrik panosu önü",title:"Çalışma alanına ilave aydınlatma",category:"Aydınlatma",priority:"Orta",description:"Gece vardiyasında pano önünde aydınlatma yetersiz kalıyor. İki adet LED armatür talep edilmektedir.",requestedDate:dateOnly(new Date(Date.now()+5*86400000)),status:"new",createdBy:"1. Fabrika Bölüm Formeni",createdAt:workIsoOffset(-2,10),assignedTeam:"Elektrik Bakım",assignedTo:"",sourceRequestId:"",workDescription:"",completedAt:null,usedMaterials:[]},
    {id:"TLP-1002",kind:"request",factory:"2. Fabrika A Blok",department:"Paketleme",location:"Kalite masası",title:"Klima montajı talebi",category:"Klima / Havalandırma",priority:"Yüksek",description:"Yaz döneminde kalite masası çevresinde çalışma sıcaklığı yükseliyor. Uygun kapasitede klima kurulması isteniyor.",requestedDate:dateOnly(new Date(Date.now()+10*86400000)),status:"reviewing",createdBy:"2. Fabrika Bölüm Formeni",createdAt:workIsoOffset(-1,11),assignedTeam:"Elektrik Bakım",assignedTo:"",sourceRequestId:"",workDescription:"",completedAt:null,usedMaterials:[]},
    {id:"ISE-2001",kind:"workorder",factory:"1. Fabrika",department:"Sır Bantları",location:"Dijital baskı çıkışı",title:"Kablo tavası kapağı montajı",category:"Elektrik Tesisatı",priority:"Orta",description:"Açık durumdaki kablo tavasına kapakların takılması ve eksik bağlantı elemanlarının tamamlanması.",requestedDate:"",planStart:dateOnly(new Date()),planEnd:dateOnly(new Date(Date.now()+3*86400000)),status:"assigned",createdBy:"Hamit Uysal",createdAt:workIsoOffset(-3,8),assignedTeam:"Elektrik Bakım",assignedTo:"Sercan Şahin",sourceRequestId:"",workDescription:"",completedAt:null,usedMaterials:[]},
    {id:"ISE-2002",kind:"workorder",factory:"2. Fabrika B Blok",department:"Masse Bölümü",location:"Spray Dryer çevresi",title:"Koruyucu bariyer iyileştirmesi",category:"Mekanik İyileştirme",priority:"Yüksek",description:"Geçiş alanındaki mevcut bariyerin uzatılması ve zemine daha sağlam sabitlenmesi.",requestedDate:"",planStart:dateOnly(new Date()),planEnd:dateOnly(new Date(Date.now()+4*86400000)),status:"progress",createdBy:"Kemal Ayrancı",createdAt:workIsoOffset(-4,9),assignedTeam:"Mekanik Bakım",assignedTo:"Özgür Öz",sourceRequestId:"",workDescription:"Ölçüler alındı, profil hazırlığı başladı.",completedAt:null,usedMaterials:[]}
  ];
}
function saveWorkItems(){storageSet(localStorage,WORK_KEY,JSON.stringify(s.workItems))}
function findWorkItemById(id){
  return s.workItems.find(item=>String(item.id)===String(id));
}
function workTeamForCategory(category){
  const c=String(category||"").toLocaleLowerCase("tr-TR");
  if(c.includes("mekanik")||c.includes("bariyer")||c.includes("kaynak")||c.includes("pnömatik")||c.includes("hidrolik"))return "Mekanik Bakım";
  return "Elektrik Bakım";
}
function workStatusLabel(status,kind="workorder"){
  if(kind==="request")return ({new:"Yeni Talep",reviewing:"İnceleniyor",approved:"Onaylandı",rejected:"Reddedildi",converted:"İş Emrine Dönüştürüldü",cancelled:"İptal Edildi",done:"Tamamlandı"})[status]||status;
  return ({open:"Açık",assigned:"Personele Atandı",progress:"Devam Ediyor",material:"Malzeme Bekliyor",approval:"Bölüm Onayı Bekliyor",done:"Tamamlandı",cancelled:"İptal Edildi"})[status]||status;
}
function workStatusClass(status){return String(status||"open").replaceAll("_","-")}
function nextWorkId(kind){
  const prefix=kind==="request"?"TLP":"ISE";
  const base=kind==="request"?1000:2000;
  const nums=s.workItems.filter(x=>x.kind===kind).map(x=>Number(String(x.id).replace(/\D/g,""))||base);
  return `${prefix}-${Math.max(base,...nums)+1}`;
}
function workMaintenanceOptions(factory,team){
  const sf=shiftFactoryName(factory);
  return appUserEntries().filter(([,u])=>u.role==="Bakım Personeli"&&u.team===team&&shiftFactoryMatches(u.factories||[],sf)).map(([,u])=>u.name).sort((a,b)=>a.localeCompare(b,"tr"));
}
function workItemFactoryVisible(item){return userCanSeeFactory(item.factory)}
function canManageWorkRequest(item){
  if(!item)return false;
  if(isDeveloper())return workItemFactoryVisible(item);
  if(s.user?.role==="Bakım Müdürü")return true;
  if(!permissions().manageRequests)return false;
  if(!workItemFactoryVisible(item))return false;
  const team=item.assignedTeam||workTeamForCategory(item.category);
  if(s.user?.role==="Elektrik Bakım Formeni")return team==="Elektrik Bakım";
  if(s.user?.role==="Mekanik Bakım Formeni")return team==="Mekanik Bakım";
  if(s.user?.role==="Bakım Formeni")return true;
  return false;
}
function canUpdateWorkOrder(item){
  if(!item||item.kind!=="workorder")return false;
  if(isDeveloper())return workItemFactoryVisible(item);
  if(s.user?.role==="Bakım Müdürü")return true;
  if(canManageWorkRequest(item))return true;
  return !!permissions().updateAssignedWorkOrders&&item.assignedTo===s.user?.name;
}
function canEditWorkItemCore(item){
  if(!item)return false;
  if(isDeveloper())return workItemFactoryVisible(item);
  if(s.user?.role==="Bakım Müdürü")return true;
  if(canManageWorkRequest(item))return true;
  if(item.kind==="request"&&permissions().allDepartmentForemanRights&&workItemFactoryVisible(item))return true;
  return item.kind==="request"
    &&permissions().createRequest
    &&item.createdBy===s.user?.name
    &&["new","reviewing"].includes(item.status);
}
function canDeleteWorkItem(item){
  if(!item)return false;
  if(item.kind==="workorder"){
    return canManageWorkRequest(item);
  }
  if(item.kind==="request"){
    if(permissions().allDepartmentForemanRights)return workItemFactoryVisible(item);
    return s.user?.role==="Bölüm Formeni"
      &&workItemFactoryVisible(item)
      &&item.department===s.user?.department;
  }
  return false;
}
function deleteWorkItemById(id){
  const item=findWorkItemById(id);
  if(!item)return {ok:false,message:"Kayıt bulunamadı."};
  if(!canDeleteWorkItem(item)){
    return {
      ok:false,
      message:item.kind==="request"
        ?"İş taleplerini yalnızca ilgili bölüm formeni silebilir."
        :"İş emirlerini yalnızca bakım müdürü veya yetkili bakım formeni silebilir."
    };
  }

  if(item.kind==="request"){
    const linked=s.workItems.find(x=>x.kind==="workorder"&&String(x.sourceRequestId)===String(item.id));
    if(linked){
      return {
        ok:false,
        message:`Bu talebe bağlı ${linked.id} numaralı iş emri bulunuyor. Önce bağlı iş emrini silmelisiniz.`
      };
    }
  }

  if(item.kind==="workorder"&&item.sourceRequestId){
    const request=findWorkItemById(item.sourceRequestId);
    if(request){
      request.status="approved";
      request.convertedBy="";
      request.convertedAt=null;
      request.completedAt=null;
    }
  }

  s.workItems=s.workItems.filter(x=>String(x.id)!==String(id));
  saveWorkItems();
  return {ok:true,item};
}
function visibleWorkItems(){
  let items=[...s.workItems];
  if(s.user?.role==="Bakım Müdürü"||permissions().allFactories){}
  else items=items.filter(workItemFactoryVisible);
  if(s.user?.role==="Bölüm Formeni")items=items.filter(x=>x.department===s.user.department);
  if(s.user?.role==="Bakım Personeli")items=items.filter(x=>x.kind==="workorder"&&x.assignedTo===s.user.name);
  return items.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function workMaterials(item){return safeRecordArray(item?.usedMaterials,[])}

/* İş talebi ve iş emri ekranları */
function workManagementPage(){
  const items=visibleWorkItems();
  const requests=items.filter(x=>x.kind==="request");
  const orders=items.filter(x=>x.kind==="workorder");
  const activeOrders=orders.filter(x=>!["done","cancelled"].includes(x.status));
  const overdue=activeOrders.filter(x=>x.planEnd&&x.planEnd<dateOnly(new Date()));
  const categories=["Aydınlatma","Klima / Havalandırma","Elektrik Tesisatı","Enerji Hattı","Kamera / Güvenlik","Mekanik İyileştirme","Kaynak / İmalat","Pnömatik Hat","Hidrolik Sistem","Makine Taşıma","Diğer"];
  const requestDepartmentField=permissions().allDepartments
    ?`<div class="field"><label>Bölüm</label><select id="wrDepartment" required>${Object.keys(STRUCTURE).map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>`
    :`<div class="field"><label>Bölüm</label><input id="wrDepartment" value="${esc(s.user?.department||"")}" readonly required></div>`;
  const requestForm=s.workCreateMode==="request"?`<section class="work-create-card">
    <div class="section-modern-head"><div><h2>Yeni İş Talebi</h2><p>Arıza dışındaki yeni tesis, iyileştirme ve ihtiyaçlar için talep oluşturun.</p></div><button type="button" class="secondary" id="closeWorkCreate">Kapat</button></div>
    <form id="workRequestForm" class="work-create-form">
      <div class="field"><label>Fabrika</label><select id="wrFactory" required>${userFactories().map(f=>`<option>${esc(f)}</option>`).join("")}</select></div>
      ${requestDepartmentField}
      <div class="field"><label>Talep Yeri</label><input id="wrLocation" placeholder="Örn. Pres panosu önü" required></div>
      <div class="field"><label>Kategori</label><select id="wrCategory" required>${categories.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
      <div class="field full"><label>Talep Başlığı</label><input id="wrTitle" maxlength="120" placeholder="Örn. İlave aydınlatma yapılması" required></div>
      <div class="field"><label>Öncelik</label><select id="wrPriority"><option>Düşük</option><option selected>Orta</option><option>Yüksek</option><option>Acil</option></select></div>
      <div class="field"><label>İstenen Tarih</label><input id="wrRequestedDate" type="date" value="${dateOnly(new Date(Date.now()+7*86400000))}"></div>
      <div class="field full"><label>Açıklama</label><textarea id="wrDescription" rows="4" placeholder="İstenen işi ve gerekçesini açıklayın." required></textarea></div>
      <div class="work-form-actions full"><button type="submit" class="primary">Talebi Oluştur</button></div>
    </form>
  </section>`:"";
  const directForm=s.workCreateMode==="order"?`<section class="work-create-card">
    <div class="section-modern-head"><div><h2>Doğrudan İş Emri Oluştur</h2><p>Herhangi bir bölüm talebi olmadan bakım ekibine iş emri verin.</p></div><button type="button" class="secondary" id="closeWorkCreate">Kapat</button></div>
    <form id="directWorkOrderForm" class="work-create-form">
      <div class="field"><label>Fabrika</label><select id="woFactory" required>${userFactories().map(f=>`<option>${esc(f)}</option>`).join("")}</select></div>
      <div class="field"><label>Bölüm</label><select id="woDepartment" required>${Object.keys(STRUCTURE).map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
      <div class="field"><label>İş Yeri</label><input id="woLocation" placeholder="Örn. Paketleme hattı" required></div>
      <div class="field"><label>Kategori</label><select id="woCategory" required>${categories.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
      <div class="field full"><label>İş Emri Başlığı</label><input id="woTitle" maxlength="120" required></div>
      <div class="field"><label>Öncelik</label><select id="woPriority"><option>Düşük</option><option selected>Orta</option><option>Yüksek</option><option>Acil</option></select></div>
      <div class="field"><label>Bakım Ekibi</label><select id="woTeam"><option>Elektrik Bakım</option><option>Mekanik Bakım</option></select></div>
      <div class="field"><label>Atanacak Personel</label><select id="woAssigned"><option value="">Personel seçiniz</option></select></div>
      <div class="field"><label>Planlanan Başlangıç</label><input id="woStart" type="date" value="${dateOnly(new Date())}"></div>
      <div class="field"><label>Planlanan Bitiş</label><input id="woEnd" type="date" value="${dateOnly(new Date(Date.now()+3*86400000))}"></div>
      <div class="field full"><label>İş Açıklaması</label><textarea id="woDescription" rows="4" required></textarea></div>
      <div class="work-form-actions full"><button type="submit" class="primary">İş Emrini Oluştur</button></div>
    </form>
  </section>`:"";
  const requestCards=requests.map(item=>`<article class="work-card request-card clickable-work-card priority-${esc(String(item.priority||"Orta").toLocaleLowerCase("tr-TR"))}" data-work-detail-id="${esc(item.id)}" role="button" tabindex="0">
    <div class="work-card-head"><div><span>${esc(item.id)} · ${esc(item.category)}</span><h3>${esc(item.title)}</h3><p>${esc(item.factory)} · ${esc(item.department)} · ${esc(item.location)}</p></div><div class="work-card-side"><b class="work-status ${esc(workStatusClass(item.status))}">${esc(workStatusLabel(item.status,"request"))}</b><small>${fmtDate(item.createdAt)}</small><button type="button" class="work-open-detail" data-work-detail-id="${esc(item.id)}">Talep Detayını Aç ›</button></div></div>
    <p class="work-description">${esc(item.description)}</p>
    <div class="work-meta"><span>Talep Eden: <b>${esc(item.createdBy)}</b></span><span>Öncelik: <b>${esc(item.priority)}</b></span><span>İstenen Tarih: <b>${esc(item.requestedDate||"-")}</b></span><span>Ekip: <b>${esc(item.assignedTeam||workTeamForCategory(item.category))}</b></span></div>
    <div class="work-request-audit"><span><small>İSTEYEN</small><b>${esc(item.createdBy||"Bilinmiyor")}</b><em>${fmtDate(item.createdAt)}</em></span>${item.reviewedBy?`<span><small>İNCELEYEN</small><b>${esc(item.reviewedBy)}</b><em>${fmtDate(item.reviewedAt)}</em></span>`:""}${item.approvedBy?`<span class="approved"><small>ONAYLAYAN</small><b>${esc(item.approvedBy)}</b><em>${fmtDate(item.approvedAt)}</em></span>`:""}${item.rejectedBy?`<span class="rejected"><small>REDDEDEN</small><b>${esc(item.rejectedBy)}</b><em>${fmtDate(item.rejectedAt)}</em></span>`:""}${item.convertedBy?`<span><small>İŞ EMRİNE ÇEVİREN</small><b>${esc(item.convertedBy)}</b><em>${fmtDate(item.convertedAt)}</em></span>`:""}</div>
  </article>`).join("")||'<div class="card empty-panel"><h3>Talep bulunamadı</h3><p>Yetki alanınızda henüz iş talebi yok.</p></div>';
  const materialOptions=MATERIALS.slice().sort((a,b)=>a.name.localeCompare(b.name,"tr")).map(m=>`<option value="${esc(m.id)}">${esc(m.code)} · ${esc(m.name)}</option>`).join("");
  const orderCards=orders.map(item=>{
    const canUpdate=canUpdateWorkOrder(item);
    const materials=workMaterials(item);
    const people=workMaintenanceOptions(item.factory,item.assignedTeam);
    return `<article class="work-card order-card clickable-work-card priority-${esc(String(item.priority||"Orta").toLocaleLowerCase("tr-TR"))}" data-work-detail-id="${esc(item.id)}" role="button" tabindex="0" aria-label="${esc(item.title)} iş emri detaylarını aç">
      <div class="work-card-head"><div><span>${esc(item.id)} · ${item.sourceRequestId?`Talep: ${esc(item.sourceRequestId)}`:"Doğrudan İş Emri"}</span><h3>${esc(item.title)}</h3><p>${esc(item.factory)} · ${esc(item.department)} · ${esc(item.location)}</p></div><div class="work-card-side"><b class="work-status ${esc(workStatusClass(item.status))}">${esc(workStatusLabel(item.status))}</b><small>${fmtDate(item.createdAt)}</small></div></div>
      <p class="work-description">${esc(item.description)}</p>
      <div class="work-meta"><span>Ekip: <b>${esc(item.assignedTeam)}</b></span><span>Sorumlu: <b>${esc(item.assignedTo||"Atama Bekliyor")}</b></span><span>Plan: <b>${esc(item.planStart||"-")} → ${esc(item.planEnd||"-")}</b></span><span>Öncelik: <b>${esc(item.priority)}</b></span></div>
      <div class="work-material-chips">${materials.map((m,index)=>{const catalog=materialById(m.materialId);return `<span>${esc(catalog?.name||m.name||"Malzeme")} · ${esc(m.quantity)} ${esc(m.unit||catalog?.unit||"Adet")}${canUpdate?`<button data-remove-work-material="${esc(item.id)}" data-index="${index}">×</button>`:""}</span>`}).join("")||'<small>Kullanılan malzeme girilmedi.</small>'}</div>
      ${item.completedAt?`<div class="work-completed">Tamamlanma: ${fmtDate(item.completedAt)}</div>`:""}
    </article>`;
  }).join("")||'<div class="card empty-panel"><h3>İş emri bulunamadı</h3><p>Yetki alanınızda henüz iş emri yok.</p></div>';
  return `${clockBlock()}
  <section class="desktop-page-title work-page-title"><div><span>ARIZA DIŞI BAKIM İŞLERİ</span><h1>Talepler ve İş Emirleri</h1><p>Bölümlerden gelen ihtiyaçları takip edin; bakım formenleri ve müdürü doğrudan iş emri oluşturabilsin.</p></div><div class="desktop-page-actions">${permissions().createRequest?'<button class="secondary" data-open-work-create="request">+ Yeni Talep</button>':""}${permissions().createDirectWorkOrder?'<button class="primary" data-open-work-create="order">+ Doğrudan İş Emri</button>':""}</div></section>
  <section class="work-kpis"><article><small>YENİ TALEP</small><b>${requests.filter(x=>x.status==="new").length}</b></article><article><small>AKTİF İŞ EMRİ</small><b>${activeOrders.length}</b></article><article><small>GECİKEN</small><b>${overdue.length}</b></article><article><small>TAMAMLANAN</small><b>${orders.filter(x=>x.status==="done").length}</b></article></section>
  ${requestForm}${directForm}
  <div class="work-tabs"><button data-work-tab="requests" class="${s.workTab==="requests"?"active":""}">İş Talepleri <span>${requests.length}</span></button><button data-work-tab="orders" class="${s.workTab==="orders"?"active":""}">İş Emirleri <span>${orders.length}</span></button></div>
  <section class="work-list">${s.workTab==="requests"?requestCards:orderCards}</section>`;
}



function workDetailModal(){
  if(!s.workDetailId)return "";
  const item=findWorkItemById(s.workDetailId);
  if(!item)return "";

  const isRequest=item.kind==="request";
  const canCoreEdit=canEditWorkItemCore(item);
  const canProgressEdit=!isRequest&&canUpdateWorkOrder(item);
  const canDelete=canDeleteWorkItem(item);

  const categories=[
    "Aydınlatma",
    "Klima / Havalandırma",
    "Elektrik Tesisatı",
    "Enerji Hattı",
    "Kamera / Güvenlik",
    "Mekanik İyileştirme",
    "Kaynak / İmalat",
    "Pnömatik Hat",
    "Hidrolik Sistem",
    "Makine Taşıma",
    "Diğer"
  ];
  const priorities=["Düşük","Orta","Yüksek","Acil"];
  const factories=[...new Set([...userFactories(),item.factory].filter(Boolean))];
  const teams=["Elektrik Bakım","Mekanik Bakım"];
  const assignedTeam=item.assignedTeam||workTeamForCategory(item.category);
  const people=workMaintenanceOptions(item.factory,assignedTeam);
  const materials=workMaterials(item);

  const auditRows=[
    ["OLUŞTURAN / İSTEYEN",item.createdBy,item.createdAt],
    ["İNCELEYEN",item.reviewedBy,item.reviewedAt],
    ["ONAYLAYAN",item.approvedBy,item.approvedAt],
    ["REDDEDEN",item.rejectedBy,item.rejectedAt],
    ["İŞ EMRİNE DÖNÜŞTÜREN",item.convertedBy,item.convertedAt],
    ["SON DÜZENLEYEN",item.updatedBy,item.updatedAt],
    ["TAMAMLAYAN",item.completedBy,item.completedAt]
  ].filter(([,name])=>name);

  return `<div class="modal-backdrop work-detail-backdrop" id="workDetailBackdrop">
    <div class="modal work-detail-modal">
      <div class="modal-head">
        <div>
          <span class="work-detail-kind">${isRequest?"İŞ TALEBİ":"İŞ EMRİ"}</span>
          <h2>${esc(item.id)} · ${esc(item.title)}</h2>
          <p>${esc(item.factory)} · ${esc(item.department||"-")} · ${esc(item.location||"-")}</p>
        </div>
        <button type="button" id="closeWorkDetail">×</button>
      </div>

      <div class="work-detail-summary">
        <article><small>DURUM</small><b class="work-status ${esc(workStatusClass(item.status))}">${esc(workStatusLabel(item.status,isRequest?"request":"workorder"))}</b></article>
        <article><small>ÖNCELİK</small><b>${esc(item.priority||"-")}</b></article>
        <article><small>BAKIM EKİBİ</small><b>${esc(assignedTeam||"-")}</b></article>
        <article><small>SORUMLU</small><b>${esc(item.assignedTo||"Atama bekliyor")}</b></article>
      </div>

      <form id="workDetailForm" class="work-detail-form" data-work-id="${esc(item.id)}">
        <div class="field">
          <label>Fabrika</label>
          <select id="workDetailFactory" ${canCoreEdit?"":"disabled"}>
            ${factories.map(factory=>`<option value="${esc(factory)}" ${factory===item.factory?"selected":""}>${esc(factory)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Bölüm</label>
          <input id="workDetailDepartment" value="${esc(item.department||"")}" ${canCoreEdit?"":"disabled"}>
        </div>
        <div class="field">
          <label>Talep / İş Yeri</label>
          <input id="workDetailLocation" value="${esc(item.location||"")}" ${canCoreEdit?"":"disabled"}>
        </div>
        <div class="field">
          <label>Kategori</label>
          <select id="workDetailCategory" ${canCoreEdit?"":"disabled"}>
            ${[...new Set([...categories,item.category].filter(Boolean))].map(category=>`<option value="${esc(category)}" ${category===item.category?"selected":""}>${esc(category)}</option>`).join("")}
          </select>
        </div>
        <div class="field work-detail-title-field">
          <label>Başlık</label>
          <input id="workDetailTitle" maxlength="160" value="${esc(item.title||"")}" ${canCoreEdit?"":"disabled"}>
        </div>
        <div class="field">
          <label>Öncelik</label>
          <select id="workDetailPriority" ${canCoreEdit?"":"disabled"}>
            ${priorities.map(priority=>`<option value="${priority}" ${priority===item.priority?"selected":""}>${priority}</option>`).join("")}
          </select>
        </div>

        ${isRequest?`
          <div class="field">
            <label>İstenen Tamamlanma Tarihi</label>
            <input id="workDetailRequestedDate" type="date" value="${esc(item.requestedDate||"")}" ${canCoreEdit?"":"disabled"}>
          </div>
          <div class="field">
            <label>Sorumlu Bakım Ekibi</label>
            <select id="workDetailTeam" ${canCoreEdit?"":"disabled"}>
              ${teams.map(team=>`<option value="${team}" ${team===assignedTeam?"selected":""}>${team}</option>`).join("")}
            </select>
          </div>
        `:`
          <div class="field">
            <label>Planlanan Başlangıç</label>
            <input id="workDetailPlanStart" type="date" value="${esc(item.planStart||"")}" ${canCoreEdit?"":"disabled"}>
          </div>
          <div class="field">
            <label>Planlanan Bitiş</label>
            <input id="workDetailPlanEnd" type="date" value="${esc(item.planEnd||"")}" ${canCoreEdit?"":"disabled"}>
          </div>
          <div class="field">
            <label>Bakım Ekibi</label>
            <select id="workDetailTeam" ${canCoreEdit?"":"disabled"}>
              ${teams.map(team=>`<option value="${team}" ${team===assignedTeam?"selected":""}>${team}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Atanan Personel</label>
            <select id="workDetailAssignedTo" ${canCoreEdit?"":"disabled"}>
              <option value="">Atama bekliyor</option>
              ${[...new Set([...people,item.assignedTo].filter(Boolean))].map(person=>`<option value="${esc(person)}" ${person===item.assignedTo?"selected":""}>${esc(person)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>İş Emri Durumu</label>
            <select id="workDetailStatus" ${canProgressEdit?"":"disabled"}>
              ${[
                ["open","Açık"],
                ["assigned","Personele Atandı"],
                ["progress","Devam Ediyor"],
                ["material","Malzeme Bekliyor"],
                ["approval","Bölüm Onayı Bekliyor"],
                ["done","Tamamlandı"],
                ["cancelled","İptal Edildi"]
              ].map(([value,label])=>`<option value="${value}" ${value===item.status?"selected":""}>${label}</option>`).join("")}
            </select>
          </div>
        `}

        <div class="field work-detail-description-field">
          <label>Açıklama</label>
          <textarea id="workDetailDescription" rows="5" maxlength="2000" ${canCoreEdit?"":"disabled"}>${esc(item.description||"")}</textarea>
        </div>

        ${!isRequest?`<div class="field work-detail-description-field">
          <label>Yapılan İş / Sonuç</label>
          <textarea id="workDetailResult" rows="4" maxlength="2000" ${canProgressEdit?"":"disabled"}>${esc(item.workDescription||"")}</textarea>
        </div>`:""}

        ${(canCoreEdit||canProgressEdit)?`<div class="work-detail-save-row">
          <button type="submit" class="primary">Değişiklikleri Kaydet</button>
        </div>`:""}
      </form>

      ${isRequest&&canManageWorkRequest(item)&&!["converted","rejected","cancelled","done"].includes(item.status)?`<section class="work-detail-decision">
        <div><b>Talep İşlemleri</b><p>Talebi inceleyin, onaylayın, reddedin veya iş emrine dönüştürün.</p></div>
        <div class="work-detail-decision-actions">
          ${item.status==="new"?`<button type="button" data-work-request-action="reviewing" data-work-id="${esc(item.id)}" class="secondary">İncelemeye Al</button>`:""}
          ${item.status!=="approved"?`<button type="button" data-work-request-action="approved" data-work-id="${esc(item.id)}" class="secondary">Onayla</button>`:""}
          <button type="button" data-work-request-action="rejected" data-work-id="${esc(item.id)}" class="danger">Reddet</button>
          <button type="button" data-work-request-action="convert" data-work-id="${esc(item.id)}" class="primary">İş Emrine Dönüştür</button>
        </div>
      </section>`:""}

      ${isRequest&&permissions().createRequest&&item.createdBy===s.user?.name&&["new","reviewing"].includes(item.status)?`<section class="work-detail-decision cancel">
        <div><b>Talebi İptal Et</b><p>Henüz sonuçlanmamış kendi talebinizi iptal edebilirsiniz.</p></div>
        <button type="button" data-work-request-action="cancelled" data-work-id="${esc(item.id)}" class="danger">Talebi İptal Et</button>
      </section>`:""}

      <section class="work-detail-audit">
        <div class="section-modern-head"><div><h2>Kayıt Geçmişi</h2><p>Talebi isteyen, onaylayan, reddeden ve düzenleyen kullanıcı bilgileri.</p></div></div>
        <div class="work-detail-audit-grid">
          ${auditRows.map(([label,name,date])=>`<article><small>${label}</small><b>${esc(name)}</b><span>${date?fmtDate(date):"-"}</span></article>`).join("")||'<div class="compact-empty"><p>İşlem geçmişi bulunmuyor.</p></div>'}
        </div>
      </section>

      ${!isRequest?`<section class="work-detail-materials">
        <div class="section-modern-head"><div><h2>Kullanılan Malzemeler</h2><p>İş emrine kaydedilen malzemeler.</p></div></div>
        ${canProgressEdit?`<form class="work-material-form work-detail-material-form" data-work-id="${esc(item.id)}">
          <select class="work-material-id" required>
            <option value="">Kullanılan malzeme</option>
            ${MATERIALS.slice().sort((a,b)=>a.name.localeCompare(b.name,"tr")).map(material=>`<option value="${esc(material.id)}">${esc(material.code)} · ${esc(material.name)}</option>`).join("")}
          </select>
          <input class="work-material-qty" type="number" min="0.01" step="0.01" value="1" required>
          <button class="secondary" type="submit">Malzeme Ekle</button>
        </form>`:""}
        <div class="work-material-chips">
          ${materials.map((material,index)=>{
            const catalog=materialById(material.materialId);
            return `<span>${esc(catalog?.name||material.name||"Malzeme")} · ${esc(material.quantity)} ${esc(material.unit||catalog?.unit||"Adet")}${canProgressEdit?`<button data-remove-work-material="${esc(item.id)}" data-index="${index}">×</button>`:""}</span>`;
          }).join("")||'<small>Kullanılan malzeme girilmedi.</small>'}
        </div>
      </section>`:""}

      ${canDelete?`<section class="detail-danger-zone work-detail-danger">
        <div>
          <b>${isRequest?"İş Talebini Sil":"İş Emrini Sil"}</b>
          <p>${isRequest
            ?"Talep kalıcı olarak listeden kaldırılır. Bağlı iş emri varsa önce iş emrinin silinmesi gerekir."
            :"İş emri kalıcı olarak kaldırılır. Bir talepten oluşturulduysa talep yeniden Onaylandı durumuna alınır."}</p>
        </div>
        <button type="button" class="danger" id="deleteWorkDetail">${isRequest?"Talebi Sil":"İş Emrini Sil"}</button>
      </section>`:""}
    </div>
  </div>`;
}
