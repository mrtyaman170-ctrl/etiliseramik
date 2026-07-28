function updateClockAndDurations(){
  const x=liveDateTime(),d=document.getElementById("liveDate"),t=document.getElementById("liveTime"),v=document.getElementById("liveShift");
  if(d)d.textContent=x.date;if(t)t.textContent=x.time;if(v)v.textContent=x.shift.name;
  document.querySelectorAll(".duration").forEach(el=>{const f=s.faults.find(x=>x.id==el.dataset.id);if(f)el.textContent=durationText(f)});
}
function render(){
  window.__etiliStarted=true;
  document.body.classList.remove("mobile-menu-open");
  document.getElementById("app").innerHTML=s.login?app():login();
  bind();
  updateClockAndDurations();
}
function bind(){
  bindWorkshopPage();
  const appRoot=document.getElementById("app");
  if(appRoot)appRoot.addEventListener("click",event=>{
    const detailTarget=event.target.closest("[data-work-detail-id]");
    if(!detailTarget)return;
    event.preventDefault();
    event.stopPropagation();

    const item=findWorkItemById(detailTarget.dataset.workDetailId);
    if(!item){
      alert("İş emri veya talep kaydı bulunamadı. Sayfayı yenileyip tekrar deneyin.");
      return;
    }

    markNotificationsSeen("work");
    s.page="work";
    s.workTab=item.kind==="contractor"
      ?(["done","cancelled"].includes(item.status)?"contractorHistory":"contractors")
      :item.kind==="request"
        ?(["done","rejected","cancelled","converted"].includes(item.status)?"requestHistory":"requests")
        :(["done","cancelled"].includes(item.status)?"orderHistory":"orders");
    s.workDetailId=String(item.id);
    render();
  });

  const mobileMenuToggle=document.getElementById("mobileMenuToggle");
  const mobileMenuClose=document.getElementById("mobileMenuClose");
  const mobileNavOverlay=document.getElementById("mobileNavOverlay");
  const setMobileMenu=open=>{
    document.body.classList.toggle("mobile-menu-open",open);
    mobileMenuToggle?.setAttribute("aria-expanded",open?"true":"false");
  };
  if(mobileMenuToggle)mobileMenuToggle.onclick=()=>setMobileMenu(!document.body.classList.contains("mobile-menu-open"));
  if(mobileMenuClose)mobileMenuClose.onclick=()=>setMobileMenu(false);
  if(mobileNavOverlay)mobileNavOverlay.onclick=()=>setMobileMenu(false);

  document.querySelectorAll("[data-p]").forEach(b=>{
    if(b.hasAttribute("data-work-detail-id"))return;
    const openPage=()=>{
      const nextPage=b.dataset.p;
      markNotificationsSeen(nextPage);
      s.workDetailId=null;
      s.dailyControlDetail=null;
      if(nextPage!=="faults")s.faultModalId=null;
      s.page=nextPage;
      render();
    };
    b.onclick=openPage;
    if(b.getAttribute("role")==="button"){
      b.onkeydown=e=>{
        if(e.key==="Enter"||e.key===" "){
          e.preventDefault();
          openPage();
        }
      };
    }
  });

  document.querySelectorAll(".fault-click-row").forEach(row=>row.onclick=e=>{
    const interactive=e.target.closest("select,button,input,a,label");
    if(interactive&&interactive!==row)return;
    s.faultModalId=Number(row.dataset.faultDetailId);
    render();
  });

  document.querySelectorAll("[data-fault-tab]").forEach(button=>button.onclick=()=>{
    s.faultTab=button.dataset.faultTab==="history"?"history":"active";
    render();
  });
  document.querySelectorAll("[data-fault-history-factory]").forEach(button=>button.onclick=()=>{
    s.faultHistoryFactory=button.dataset.faultHistoryFactory||"Tümü";
    render();
  });
  document.querySelectorAll("[data-fault-sort]").forEach(button=>button.onclick=()=>{
    const key=button.dataset.faultSort;
    if(s.faultSortKey===key)s.faultSortDir=s.faultSortDir==="asc"?"desc":"asc";
    else{
      s.faultSortKey=key;
      s.faultSortDir=key==="createdAt"||key==="duration"?"desc":"asc";
    }
    render();
  });
  const faultRecordSearch=document.getElementById("faultRecordSearch");
  if(faultRecordSearch)faultRecordSearch.oninput=()=>{
    const value=faultRecordSearch.value;
    const cursor=faultRecordSearch.selectionStart;
    s.faultSearch=value;
    render();
    const next=document.getElementById("faultRecordSearch");
    if(next){
      next.focus();
      next.setSelectionRange(cursor,cursor);
    }
  };
  const faultDateStart=document.getElementById("faultDateStart");
  const faultDateEnd=document.getElementById("faultDateEnd");
  if(faultDateStart)faultDateStart.onchange=()=>{s.faultDateStart=faultDateStart.value;if(s.faultDateEnd&&s.faultDateStart>s.faultDateEnd)s.faultDateEnd=s.faultDateStart;render()};
  if(faultDateEnd)faultDateEnd.onchange=()=>{s.faultDateEnd=faultDateEnd.value;if(s.faultDateStart&&s.faultDateEnd<s.faultDateStart)s.faultDateStart=s.faultDateEnd;render()};
  const clearFaultDates=document.getElementById("clearFaultDates");
  if(clearFaultDates)clearFaultDates.onclick=()=>{s.faultDateStart="";s.faultDateEnd="";render()};

  const faultModalClose=document.getElementById("faultModalClose");
  const faultModalCloseBg=document.getElementById("faultModalCloseBg");
  if(faultModalClose)faultModalClose.onclick=()=>{s.faultModalId=null;render()};
  if(faultModalCloseBg)faultModalCloseBg.onclick=e=>{
    if(e.target===faultModalCloseBg){s.faultModalId=null;render()}
  };

  document.querySelectorAll(".fault-participant-check").forEach(check=>check.onchange=()=>{
    const fault=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
    if(!fault||!canManageFaultParticipants(fault)){render();return}
    const selected=[...document.querySelectorAll(".fault-participant-check:checked")].map(x=>x.value);
    if(!selected.length){
      alert("Arızada en az bir müdahale eden personel bulunmalıdır.");
      check.checked=true;
      return;
    }
    fault.participants=[...new Set(selected)];
    save();
    render();
  });

  const faultClaimButton=document.getElementById("faultClaimButton");
  if(faultClaimButton)faultClaimButton.onclick=()=>{
    faultClaimButton.disabled=true;
    const fault=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
    const result=claimFaultByCurrentUser(fault);
    if(!result.ok){alert(result.message);render();return}
    save();render();
  };

  const faultSelfJoin=document.getElementById("faultSelfJoin");
  if(faultSelfJoin)faultSelfJoin.onclick=()=>{
    const fault=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
    if(!fault||!canSelfJoinFault(fault))return;
    fault.participants=[...new Set([...faultParticipants(fault),s.user.name])];
    if(!fault.assignedTo)fault.assignedTo=s.user.name;
    if(fault.status==="open")fault.status="progress";
    save();render();
  };
  const faultHandoverForm=document.getElementById("faultHandoverForm");
  if(faultHandoverForm)faultHandoverForm.onsubmit=e=>{
    e.preventDefault();
    const fault=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
    if(!fault||!canHandoverFault(fault))return;
    const to=document.getElementById("faultHandoverTo")?.value||"";
    const note=document.getElementById("faultHandoverNote")?.value.trim()||"";
    if(!to||!note){alert("Devredilecek personeli ve devir notunu giriniz.");return}
    if(!nextShiftMembersForFault(fault).includes(to)){
      alert("Seçilen personel bu arızanın sonraki vardiya ekibinde bulunmuyor.");
      return;
    }
    if(!Array.isArray(fault.handovers))fault.handovers=[];
    fault.handovers.push({from:s.user?.name||"Bilinmeyen Kullanıcı",to,note,at:new Date().toISOString(),fromShift:currentShiftLabel(),toShift:nextShiftLabel()});
    fault.participants=[...new Set([...faultParticipants(fault),to])];
    fault.assignedTo=to;
    fault.assignmentState="pending";
    fault.claimedBy="";
    fault.claimedAt=null;
    fault.status="open";
    if(!Array.isArray(fault.assignmentHistory))fault.assignmentHistory=[];
    fault.assignmentHistory.push({action:"handover",from:s.user?.name||"",to,by:s.user?.name||"",at:new Date().toISOString(),shift:nextShiftLabel()});
    save();render();
  };



  const openMaintenanceLog=()=>{if(canAddMaintenanceLog()){s.maintenanceLogModal=true;render()}};
  ["openMaintenanceLog","openMaintenanceLogSecondary","openMaintenanceLogFromPersonnel"].forEach(id=>{const btn=document.getElementById(id);if(btn)btn.onclick=openMaintenanceLog});
  const closeMaintenanceLog=()=>{s.maintenanceLogModal=false;render()};
  ["closeMaintenanceLog","cancelMaintenanceLog"].forEach(id=>{const btn=document.getElementById(id);if(btn)btn.onclick=closeMaintenanceLog});
  const maintenanceLogBackdrop=document.getElementById("maintenanceLogBackdrop");
  if(maintenanceLogBackdrop)maintenanceLogBackdrop.onclick=e=>{if(e.target===maintenanceLogBackdrop)closeMaintenanceLog()};
  const maintenanceLogFactory=document.getElementById("maintenanceLogFactory");
  const filterMaintenanceLogPeople=()=>{
    const factory=maintenanceLogFactory?.value||"";
    document.querySelectorAll("[data-log-person-factories]").forEach(label=>{
      const show=(label.dataset.logPersonFactories||"").split("|").includes(factory);
      label.hidden=!show;
      if(!show)label.querySelector("input").checked=false;
    });
  };
  if(maintenanceLogFactory){maintenanceLogFactory.onchange=filterMaintenanceLogPeople;filterMaintenanceLogPeople()}
  const maintenanceLogForm=document.getElementById("maintenanceLogForm");
  if(maintenanceLogForm)maintenanceLogForm.onsubmit=e=>{
    e.preventDefault();
    if(!canAddMaintenanceLog())return;
    const factory=document.getElementById("maintenanceLogFactory")?.value||"";
    const title=(document.getElementById("maintenanceLogTitle")?.value||"").trim();
    const workType=(document.getElementById("maintenanceLogType")?.value||"").trim();
    const location=(document.getElementById("maintenanceLogLocation")?.value||"").trim();
    const description=(document.getElementById("maintenanceLogDescription")?.value||"").trim();
    const performedDate=document.getElementById("maintenanceLogDate")?.value||"";
    const validPeople=maintenanceWorkPeople(factory).map(person=>person.name);
    const participants=[...new Set([...document.querySelectorAll(".maintenance-log-person:checked")].map(x=>x.value))]
      .filter(name=>validPeople.includes(name));
    if(!dailyControlFactories().includes(factory)||!/^\d{4}-\d{2}-\d{2}$/.test(performedDate)){
      alert("Geçerli bir fabrika ve çalışma tarihi seçiniz.");
      return;
    }
    if(!participants.length){alert("İşe dahil olan en az bir personel seçiniz.");return}
    if(!["Arıza","Planlı Bakım","İyileştirme","Kontrol","Revizyon","Diğer"].includes(workType)){alert("Geçerli bir iş türü seçiniz.");return}
    if(!title||!description){alert("İş başlığı ve yapılan iş açıklamasını giriniz.");return}
    const logId=`MW-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const performedAt=`${performedDate}T12:00:00`;
    s.maintenanceLogs.push({id:logId,factory,workType,title,location,description,participants,performedAt,createdBy:s.user?.name||"Bilinmeyen Kullanıcı",createdAt:new Date().toISOString()});
    if(workType==="Arıza"){
      const actualFactory=factory==="2. Fabrika"?"2. Fabrika A Blok":factory;
      const line=(FACTORIES[actualFactory]||["Genel Alan"])[0];
      const department=findMachineDepartment(actualFactory,line,location)||"Diğer";
      const numericIds=s.faults.map(item=>Number(item.id)).filter(Number.isFinite);
      s.faults.push({
        id:(numericIds.length?Math.max(...numericIds):2000)+1,
        factory:actualFactory,line,department,machine:location||"Bakım Çalışması",
        type:"Diğer",subject:title,description,stopped:false,photoName:"",
        status:"done",openedBy:s.user?.name||"Bilinmeyen Kullanıcı",
        assignedTo:participants[0]||"",participants,assignmentState:"accepted",
        claimedBy:participants[0]||"",claimedAt:performedAt,assignmentHistory:[],
        solutionText:description,solutionBy:participants.join(", "),solutionAt:performedAt,
        createdAt:performedAt,closedAt:new Date(new Date(performedAt).getTime()+60000).toISOString(),
        maintenanceLogId:logId,usedMaterials:[]
      });
      save();
    }
    saveMaintenanceLogs();s.maintenanceLogModal=false;render();
  };

  const dailyControlFactory=document.getElementById("dailyControlFactory");
  if(dailyControlFactory)dailyControlFactory.onchange=()=>{
    s.dailyControlFactory=dailyControlFactory.value;
    render();
  };

  document.querySelectorAll("[data-daily-control-tab]").forEach(btn=>btn.onclick=()=>{
    s.dailyControlTab=btn.dataset.dailyControlTab;
    render();
  });

  const dailyControlDate=document.getElementById("dailyControlDate");
  if(dailyControlDate)dailyControlDate.onchange=()=>{
    s.dailyControlDate=dailyControlDate.value||dateOnly(new Date());
    render();
  };

  const utilityStatsDays=document.getElementById("utilityStatsDays");
  if(utilityStatsDays)utilityStatsDays.onchange=()=>{
    const days=Number(utilityStatsDays.value);
    s.utilityStatsDays=[7,14,30].includes(days)?days:14;
    render();
  };

  const contractorControlMonth=document.getElementById("contractorControlMonth");
  if(contractorControlMonth)contractorControlMonth.onchange=()=>{
    s.contractorControlMonth=contractorControlMonth.value||monthKeyLocal(new Date());
    render();
  };

  const dailyControlCategory=document.getElementById("dailyControlCategory");
  if(dailyControlCategory)dailyControlCategory.onchange=()=>{
    s.dailyControlCategory=dailyControlCategory.value;
    render();
  };

  const dailyControlCatalogForm=document.getElementById("dailyControlCatalogForm");
  if(dailyControlCatalogForm)dailyControlCatalogForm.onsubmit=e=>{
    e.preventDefault();
    if(!canManageDailyControlCatalog())return;
    const result=addDailyControlToCatalog({
      factory:document.getElementById("newDailyControlFactory")?.value||s.dailyControlFactory,
      name:document.getElementById("newDailyControlName")?.value||"",
      type:document.getElementById("newDailyControlType")?.value||"other",
      team:document.getElementById("newDailyControlTeam")?.value||"Elektrik Bakım"
    });
    if(!result.ok){alert(result.message);return}
    s.dailyControlFactory=result.asset.factory;
    render();
  };
  const periodicControlCatalogForm=document.getElementById("periodicControlCatalogForm");
  if(periodicControlCatalogForm)periodicControlCatalogForm.onsubmit=e=>{
    e.preventDefault();
    const result=addPeriodicControlToCatalog({
      factory:document.getElementById("newPeriodicControlFactory")?.value||s.dailyControlFactory,
      name:document.getElementById("newPeriodicControlName")?.value||"",
      type:document.getElementById("newPeriodicControlType")?.value||"other",
      team:document.getElementById("newPeriodicControlTeam")?.value||"Periyodik Kontrol"
    });
    if(!result.ok){alert(result.message);return}
    s.dailyControlFactory=result.asset.factory;render();
  };

  document.querySelectorAll("[data-delete-daily-control]").forEach(button=>button.onclick=()=>{
    if(!canManageDailyControlCatalog())return;
    if(button.dataset.confirmDelete!=="yes"){
      button.dataset.confirmDelete="yes";
      button.textContent="Tekrar Tıkla: Sil";
      setTimeout(()=>{
        if(document.body.contains(button)){
          button.dataset.confirmDelete="";
          button.textContent=button.classList.contains("special-delete-control")?"Bu Günlük Kontrolü Sil":"Kontrolü Sil";
        }
      },4000);
      return;
    }
    deleteDailyControlFromCatalog(button.dataset.deleteDailyControl);
    render();
  });

  const openDailyControlDetail=(card,event)=>{
    if(event?.target?.closest("button,input,select,textarea,label,a,form"))return;
    const asset=DAILY_CONTROL_ASSETS.find(item=>item.id===card.dataset.dailyDetailAssetId);
    if(!asset)return;
    s.dailyControlDetail={
      kind:card.dataset.dailyDetailKind==="contractor"?"contractor":"daily",
      assetId:asset.id
    };
    render();
  };
  document.querySelectorAll("[data-daily-detail-asset-id]").forEach(card=>{
    card.onclick=event=>openDailyControlDetail(card,event);
    card.onkeydown=event=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      if(event.target!==card)return;
      event.preventDefault();
      openDailyControlDetail(card,event);
    };
  });

  const closeDailyControlDetail=()=>{
    s.dailyControlDetail=null;
    render();
  };
  const dailyControlDetailBackdrop=document.getElementById("dailyControlDetailBackdrop");
  const closeDailyControlDetailButton=document.getElementById("closeDailyControlDetail");
  const closeDailyControlDetailBottom=document.getElementById("closeDailyControlDetailBottom");
  if(closeDailyControlDetailButton)closeDailyControlDetailButton.onclick=closeDailyControlDetail;
  if(closeDailyControlDetailBottom)closeDailyControlDetailBottom.onclick=closeDailyControlDetail;
  if(dailyControlDetailBackdrop)dailyControlDetailBackdrop.onclick=event=>{
    if(event.target===dailyControlDetailBackdrop)closeDailyControlDetail();
  };

  document.querySelectorAll(".complete-daily-check").forEach(btn=>btn.onclick=async()=>{
    const asset=DAILY_CONTROL_ASSETS.find(item=>item.id===btn.dataset.assetId);
    if(!asset||!canCompleteDailyAsset(asset,s.dailyControlDate))return;

    const existing=dailyCheckRecord(s.dailyControlDate,asset.factory,asset.id);
    const editor=btn.closest(".daily-detail-regular-form");
    const result=editor?.querySelector(".daily-check-result")?.value||"";
    const note=editor?.querySelector(".daily-check-note")?.value.trim()||"";
    const photo=editor?.querySelector(".daily-check-photo")?.files?.[0];

    if(!result){
      alert("Kontrol sonucunu seçiniz.");
      return;
    }
    if(!photo&&!existing?.photoStored){
      alert("Kontrolü tamamlamak için fotoğraf eklemelisiniz.");
      return;
    }

    btn.disabled=true;
    btn.textContent="Fotoğraf Kaydediliyor...";
    try{
      const key=dailyCheckKey(s.dailyControlDate,asset.factory,asset.id);
      if(photo)await saveControlPhoto(key,photo);
      s.dailyChecks[key]={
        status:"done",
        checkedBy:s.user?.name||"Bilinmeyen Kullanıcı",
        checkedAt:new Date().toISOString(),
        note,
        result,
        readings:{},
        photoStored:!!photo||!!existing?.photoStored,
        shift:"08-16"
      };
      saveDailyChecks();
      render();
    }catch(error){
      console.error(error);
      alert("Fotoğraf veya kontrol kaydı kaydedilemedi.");
      btn.disabled=false;
      btn.textContent=existing?"Kontrolü Güncelle":"Fotoğraflı Kontrolü Kaydet";
    }
  });

  document.querySelectorAll(".daily-reading-form").forEach(form=>form.onsubmit=async e=>{
    e.preventDefault();
    const asset=DAILY_CONTROL_ASSETS.find(item=>item.id===form.dataset.assetId);
    if(!asset||!canCompleteUtilityAsset(asset,s.dailyControlDate)){
      alert("Su ve gaz değerleri bakım personeli tarafından yalnızca 08:00–09:00 arasında girilebilir.");
      return;
    }

    const existing=dailyCheckRecord(s.dailyControlDate,asset.factory,asset.id);
    const result=form.querySelector(".daily-reading-result")?.value||"";
    const photo=form.querySelector(".daily-reading-photo")?.files?.[0];
    const note=form.querySelector(".daily-reading-note-input")?.value.trim()||"";

    if(!result){
      alert("Kontrol sonucunu seçiniz.");
      return;
    }
    if(!photo&&!existing?.photoStored){
      alert("Kontrol fotoğrafı zorunludur.");
      return;
    }

    let readings={};
    if(asset.type==="water"){
      const incomingRaw=form.querySelector(".water-meter-incoming")?.value.trim()||"";
      const aBlockRaw=form.querySelector(".water-meter-a")?.value.trim()||"";
      const bBlockRaw=form.querySelector(".water-meter-b")?.value.trim()||"";
      const incoming=Number(incomingRaw);
      const aBlock=Number(aBlockRaw);
      const bBlock=Number(bBlockRaw);
      if(!incomingRaw||!aBlockRaw||!bBlockRaw||![incoming,aBlock,bBlock].every(Number.isFinite)||[incoming,aBlock,bBlock].some(x=>x<0)){
        alert("Depoya gelen, A Blok ve B Blok su sayaç değerlerini eksiksiz giriniz.");
        return;
      }
      readings={incoming,aBlock,bBlock};
    }else{
      const incomingRaw=form.querySelector(".gas-meter-incoming")?.value.trim()||"";
      const incoming=Number(incomingRaw);
      if(!incomingRaw||!Number.isFinite(incoming)||incoming<0){
        alert("İşletmeye gelen gaz sayaç değerini giriniz.");
        return;
      }
      readings={incoming};
    }

    const submit=form.querySelector('button[type="submit"]');
    if(submit){submit.disabled=true;submit.textContent="Kaydediliyor..."}

    try{
      const key=dailyCheckKey(s.dailyControlDate,asset.factory,asset.id);
      if(photo)await saveControlPhoto(key,photo);
      const timing=utilityWindowState(s.dailyControlDate);
      s.dailyChecks[key]={
        status:"done",
        checkedBy:s.user?.name||"Bilinmeyen Kullanıcı",
        checkedAt:new Date().toISOString(),
        measuredAt:new Date().toISOString(),
        entryTiming:timing.inWindow?"on_time":"authorized_late",
        note,
        result,
        readings,
        photoStored:!!photo||!!existing?.photoStored,
        shift:"08-16"
      };
      saveDailyChecks();
      render();
    }catch(error){
      console.error(error);
      alert("Sayaç veya fotoğraf kaydı kaydedilemedi.");
      if(submit){submit.disabled=false;submit.textContent=existing?"Değerleri Güncelle":"Kaydet ve Yapıldı İşaretle"}
    }
  });

  document.querySelectorAll(".contractor-check-form").forEach(form=>form.onsubmit=async e=>{
    e.preventDefault();
    const asset=DAILY_CONTROL_ASSETS.find(item=>item.id===form.dataset.assetId);
    if(!asset||!canRecordContractorCheck(asset))return;

    const existing=contractorCheckRecord(s.contractorControlMonth,asset.factory,asset.id);
    const company=form.querySelector(".contractor-company")?.value.trim()||"";
    const reportNo=form.querySelector(".contractor-report-no")?.value.trim()||"";
    const result=form.querySelector(".contractor-result")?.value||"";
    const note=form.querySelector(".contractor-note-input")?.value.trim()||"";
    const performedDate=form.querySelector(".contractor-performed-date")?.value||dateOnly(new Date());
    const nextDueDate=form.querySelector(".contractor-next-date")?.value||"";
    const standard=form.querySelector(".contractor-standard")?.value.trim()||"";
    const findings=form.querySelector(".contractor-findings")?.value.trim()||"";
    const actionRequired=form.querySelector(".contractor-action")?.value.trim()||"";
    const photo=form.querySelector(".contractor-photo")?.files?.[0];

    if(!company||!reportNo||!performedDate||!result){
      alert("Firma/sorumlu, rapor numarası, kontrol tarihi ve kontrol sonucunu giriniz.");
      return;
    }
    if(nextDueDate&&nextDueDate<performedDate){alert("Sonraki kontrol tarihi, kontrol tarihinden önce olamaz.");return}
    if(!photo&&!existing?.photoStored){
      alert("Periyodik kontrol fotoğrafı veya rapor fotoğrafı zorunludur.");
      return;
    }

    const submit=form.querySelector('button[type="submit"]');
    if(submit){submit.disabled=true;submit.textContent="Kaydediliyor..."}

    try{
      const key=contractorCheckKey(s.contractorControlMonth,asset.factory,asset.id);
      if(photo)await saveControlPhoto(key,photo);
      s.contractorChecks[key]={
        status:"done",
        company,
        reportNo,
        result,
        note,
        performedDate,nextDueDate,standard,findings,actionRequired,
        checkedBy:s.user?.name||"Bilinmeyen Kullanıcı",
        checkedAt:new Date().toISOString(),
        photoStored:!!photo||!!existing?.photoStored
      };
      saveContractorChecks();
      render();
    }catch(error){
      console.error(error);
      alert("Periyodik kontrol kaydı kaydedilemedi.");
      if(submit){submit.disabled=false;submit.textContent=existing?"Değişiklikleri Kaydet":"Periyodik Kontrolü Kaydet"}
    }
  });

  document.querySelectorAll(".undo-daily-check").forEach(btn=>btn.onclick=async()=>{
    const asset=DAILY_CONTROL_ASSETS.find(item=>item.id===btn.dataset.assetId);
    const canUndo=asset?.special?canCompleteUtilityAsset(asset,s.dailyControlDate):canCompleteDailyAsset(asset,s.dailyControlDate);
    if(!asset||!canUndo)return;
    if(btn.dataset.confirmUndo!=="yes"){
      btn.dataset.confirmUndo="yes";
      btn.textContent="Tekrar Tıkla: Geri Al";
      setTimeout(()=>{
        if(document.body.contains(btn)){
          btn.dataset.confirmUndo="";
          btn.textContent="Kontrolü Geri Al";
        }
      },4000);
      return;
    }
    const key=dailyCheckKey(s.dailyControlDate,asset.factory,asset.id);
    delete s.dailyChecks[key];
    saveDailyChecks();
    try{await deleteControlPhoto(key)}catch(error){console.warn(error)}
    render();
  });

  document.querySelectorAll(".undo-contractor-check").forEach(btn=>btn.onclick=async()=>{
    const asset=DAILY_CONTROL_ASSETS.find(item=>item.id===btn.dataset.assetId);
    if(!asset||!canRecordContractorCheck(asset))return;
    if(btn.dataset.confirmUndo!=="yes"){
      btn.dataset.confirmUndo="yes";
      btn.textContent="Tekrar Tıkla: Geri Al";
      setTimeout(()=>{
        if(document.body.contains(btn)){
          btn.dataset.confirmUndo="";
          btn.textContent="Kaydı Geri Al";
        }
      },4000);
      return;
    }
    const key=contractorCheckKey(s.contractorControlMonth,asset.factory,asset.id);
    delete s.contractorChecks[key];
    saveContractorChecks();
    try{await deleteControlPhoto(key)}catch(error){console.warn(error)}
    render();
  });

  document.querySelectorAll(".view-control-photo").forEach(btn=>btn.onclick=()=>{
    showControlPhoto(btn.dataset.photoKey,btn.dataset.photoTitle||"Kontrol Fotoğrafı");
  });

  document.querySelectorAll("[data-print-utility]").forEach(printButton=>printButton.onclick=()=>{
    const factory=s.dailyControlFactory;
    const date=s.dailyControlDate;
    const type=printButton.dataset.printUtility==="gas"?"gas":"water";
    const period=document.getElementById("utilityPrintPeriod")?.value||"daily";
    const selected=new Date(`${date}T12:00:00`);
    let endDate=date,days=1,periodLabel="Günlük";
    if(period==="weekly"){days=7;periodLabel="Haftalık"}
    if(period==="monthly"){
      const today=new Date();const sameCurrentMonth=selected.getFullYear()===today.getFullYear()&&selected.getMonth()===today.getMonth();
      const lastDay=sameCurrentMonth?today.getDate():new Date(selected.getFullYear(),selected.getMonth()+1,0).getDate();
      endDate=dateKeyLocal(new Date(selected.getFullYear(),selected.getMonth(),lastDay));days=lastDay;periodLabel="Aylık";
    }
    const rows=utilityStatisticsRows(factory,endDate,days);
    const firstDate=rows[0]?.date||endDate;const lastDate=rows.at(-1)?.date||endDate;
    const validRows=rows.filter(row=>type==="water"?row.water:row.gas);
    const totalIncoming=utilityTotal(utilityValues(validRows,row=>type==="water"?row.water?.incoming:row.gas?.incoming));
    const totalA=type==="water"?utilityTotal(utilityValues(validRows,row=>row.water?.aBlock)):null;
    const totalB=type==="water"?utilityTotal(utilityValues(validRows,row=>row.water?.bBlock)):null;
    const title=type==="water"?"Su Tüketim Çıktısı":"Gaz Tüketim Çıktısı";
    const tableHead=type==="water"
      ?"<th>Tarih</th><th>Gelen Su</th><th>A Blok</th><th>B Blok</th><th>Denge</th><th>Durum</th>"
      :"<th>Tarih</th><th>Gelen Gaz</th><th>Durum</th>";
    const tableRows=rows.map(row=>type==="water"
      ?`<tr><td>${esc(row.date)}</td><td>${utilityNumber(row.water?.incoming)} m³</td><td>${utilityNumber(row.water?.aBlock)} m³</td><td>${utilityNumber(row.water?.bBlock)} m³</td><td>${utilityNumber(row.water?.balance)} m³</td><td>${esc(utilityStateLabel(row.waterState))}</td></tr>`
      :`<tr><td>${esc(row.date)}</td><td>${utilityNumber(row.gas?.incoming)} m³</td><td>${esc(utilityStateLabel(row.gasState))}</td></tr>`).join("");
    const summary=type==="water"
      ?`<div><small>TOPLAM GELEN SU</small><b>${utilityNumber(totalIncoming)} m³</b></div><div><small>A BLOK TOPLAM</small><b>${utilityNumber(totalA)} m³</b></div><div><small>B BLOK TOPLAM</small><b>${utilityNumber(totalB)} m³</b></div>`
      :`<div><small>TOPLAM GAZ</small><b>${utilityNumber(totalIncoming)} m³</b></div><div><small>GEÇERLİ GÜN</small><b>${validRows.length}</b></div>`;
    const popup=window.open("","_blank","width=900,height=700");
    if(!popup){
      alert("Yazdırma penceresi engellendi. Açılır pencereye izin verin.");
      return;
    }
    popup.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${title}</title>
      <style>@page{size:A4 landscape;margin:7mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#263746;font-size:9px}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${type==="water"?"#2f75b5":"#d08a2e"};padding-bottom:7px}h1{font-size:18px;margin:0 0 4px}p{color:#66737e;margin:3px 0}.meta{text-align:right;line-height:1.6}.summary{display:grid;grid-template-columns:repeat(${type==="water"?3:2},1fr);gap:7px;margin:8px 0}.summary div{padding:7px 9px;border:1px solid #d7e0e7;border-radius:6px;background:#f5f8fa}.summary small,.summary b{display:block}.summary b{font-size:13px;margin-top:2px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #ccd5dc;padding:${days>14?"2.5px 5px":"5px 7px"};text-align:left;line-height:1.15}th{background:#edf3f7;font-size:8px}.note{font-size:7.5px}.footer{margin-top:16px;display:flex;justify-content:space-between}.sign{width:180px;border-top:1px solid #333;padding-top:5px;text-align:center}@media print{html,body{width:100%;height:100%;overflow:hidden}}</style>
      </head><body>
      <header><div><h1>ETİLİSMART – ${periodLabel} ${title}</h1><p>Dönem: ${esc(firstDate)} – ${esc(lastDate)}</p></div><div class="meta"><b>${esc(factory)}</b><br>Oluşturan: ${esc(s.user?.name||"-")}<br>${new Date().toLocaleString("tr-TR")}</div></header>
      <section class="summary">${summary}</section>
      <table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table>
      <p class="note">Tüketimler, ardışık günlerin kümülatif sayaç değerleri arasındaki farktan hesaplanır. Eksik veya sıfırlanmış sayaçlar toplam hesabına katılmaz.</p>
      <div class="footer"><div class="sign">Kontrol Eden</div><div class="sign">Bakım Formeni</div></div>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  });


  document.querySelectorAll("[data-work-detail-id][role=\"button\"]").forEach(card=>{
    card.onkeydown=event=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      event.preventDefault();
      card.click();
    };
  });

  const closeWorkDetail=()=>{
    s.workDetailId=null;
    render();
  };
  const closeWorkDetailButton=document.getElementById("closeWorkDetail");
  if(closeWorkDetailButton)closeWorkDetailButton.onclick=closeWorkDetail;
  const workDetailBackdrop=document.getElementById("workDetailBackdrop");
  if(workDetailBackdrop)workDetailBackdrop.onclick=e=>{
    if(e.target===workDetailBackdrop)closeWorkDetail();
  };

  const workDetailTeam=document.getElementById("workDetailTeam");
  const workDetailFactory=document.getElementById("workDetailFactory");
  const workDetailAssignedTo=document.getElementById("workDetailAssignedTo");
  const refreshWorkDetailPeople=()=>{
    if(!workDetailAssignedTo||!workDetailTeam||!workDetailFactory)return;
    const item=findWorkItemById(s.workDetailId);
    const selected=workDetailAssignedTo.value||item?.assignedTo||"";
    const people=workMaintenanceOptions(workDetailFactory.value,workDetailTeam.value);
    workDetailAssignedTo.innerHTML='<option value="">Atama bekliyor</option>'+
      [...new Set([...people,selected].filter(Boolean))]
        .map(person=>`<option value="${esc(person)}" ${person===selected?"selected":""}>${esc(person)}</option>`)
        .join("");
  };
  if(workDetailTeam)workDetailTeam.onchange=refreshWorkDetailPeople;
  if(workDetailFactory)workDetailFactory.onchange=refreshWorkDetailPeople;

  const workDetailForm=document.getElementById("workDetailForm");
  if(workDetailForm)workDetailForm.onsubmit=e=>{
    e.preventDefault();
    const item=findWorkItemById(workDetailForm.dataset.workId);
    if(!item)return;

    const isRequest=item.kind==="request";
    const canCoreEdit=canEditWorkItemCore(item);
    const canProgressEdit=!isRequest&&canUpdateWorkOrder(item);

    if(canCoreEdit){
      const title=(document.getElementById("workDetailTitle")?.value||"").trim();
      const description=(document.getElementById("workDetailDescription")?.value||"").trim();
      const location=(document.getElementById("workDetailLocation")?.value||"").trim();
      const factory=document.getElementById("workDetailFactory")?.value||"";
      const department=(document.getElementById("workDetailDepartment")?.value||"").trim();
      const assignedTeam=document.getElementById("workDetailTeam")?.value||item.assignedTeam;

      if(!title||!description||!location||!department){
        alert("Başlık, bölüm, yer ve açıklama alanları boş bırakılamaz.");
        return;
      }
      if(!userFactories().includes(factory)||!Object.prototype.hasOwnProperty.call(STRUCTURE,department)){
        alert("Yetki alanınız dışında veya geçersiz fabrika/bölüm seçildi.");
        return;
      }
      if(s.user?.role==="Bölüm Formeni"&&department!==s.user.department){
        alert("Yalnızca kendi bölümünüzdeki kayıtları düzenleyebilirsiniz.");
        return;
      }
      if(!["Elektrik Bakım","Mekanik Bakım"].includes(assignedTeam)){
        alert("Geçerli bir bakım ekibi seçin.");
        return;
      }

      if(!isRequest){
        const planStart=document.getElementById("workDetailPlanStart")?.value||"";
        const planEnd=document.getElementById("workDetailPlanEnd")?.value||"";
        const assignedTo=document.getElementById("workDetailAssignedTo")?.value||"";
        const validPeople=workMaintenanceOptions(factory,assignedTeam);
        if(!planStart||!planEnd||planEnd<planStart){
          alert("Planlanan bitiş tarihi başlangıç tarihinden önce olamaz.");
          return;
        }
        if(assignedTo&&!validPeople.includes(assignedTo)){
          alert("Seçilen personel bu fabrika ve bakım ekibinde bulunmuyor.");
          return;
        }
      }

      item.factory=factory;
      item.department=department;
      item.location=location;
      item.category=document.getElementById("workDetailCategory")?.value||item.category;
      item.title=title;
      item.priority=document.getElementById("workDetailPriority")?.value||item.priority;
      item.description=description;
      item.assignedTeam=assignedTeam;

      if(isRequest){
        item.requestedDate=document.getElementById("workDetailRequestedDate")?.value||"";
      }else{
        item.planStart=document.getElementById("workDetailPlanStart")?.value||"";
        item.planEnd=document.getElementById("workDetailPlanEnd")?.value||"";
        item.assignedTo=document.getElementById("workDetailAssignedTo")?.value||"";
        if(item.assignedTo&&item.status==="open")item.status="assigned";
      }
    }

    if(canProgressEdit&&!isRequest){
      const nextStatus=document.getElementById("workDetailStatus")?.value||item.status;
      if(!["open","assigned","progress","material","approval","done","cancelled"].includes(nextStatus)){
        alert("Geçersiz iş emri durumu seçildi.");
        return;
      }
      item.workDescription=(document.getElementById("workDetailResult")?.value||"").trim();
      item.status=nextStatus;

      if(nextStatus==="done"){
        item.completedAt=item.completedAt||new Date().toISOString();
        item.completedBy=s.user?.name||"Bilinmeyen Kullanıcı";
        const source=findWorkItemById(item.sourceRequestId);
        if(source){
          source.status="done";
          source.completedAt=item.completedAt;
        }
      }else{
        item.completedAt=null;
        item.completedBy="";
        const source=findWorkItemById(item.sourceRequestId);
        if(source&&source.status==="done")source.status="converted";
      }
    }

    item.updatedBy=s.user?.name||"Bilinmeyen Kullanıcı";
    item.updatedAt=new Date().toISOString();
    saveWorkItems();
    alert(`${isRequest?"İş talebi":"İş emri"} güncellendi.`);
    render();
  };

  const contractorDetailForm=document.getElementById("contractorDetailForm");
  if(contractorDetailForm)contractorDetailForm.onsubmit=e=>{
    e.preventDefault();
    const item=findWorkItemById(contractorDetailForm.dataset.workId);
    if(!item||!canManageContractorWork(item))return;
    const factory=document.getElementById("contractorDetailFactory")?.value||"";
    const department=document.getElementById("contractorDetailDepartment")?.value||"";
    const location=(document.getElementById("contractorDetailLocation")?.value||"").trim();
    const company=(document.getElementById("contractorDetailCompany")?.value||"").trim();
    const title=(document.getElementById("contractorDetailTitle")?.value||"").trim();
    const startDate=document.getElementById("contractorDetailStartDate")?.value||"";
    const endDate=document.getElementById("contractorDetailEndDate")?.value||"";
    const description=(document.getElementById("contractorDetailDescription")?.value||"").trim();
    if(!factory||!department||!location||!company||!title||!startDate||!description){
      alert("Fabrika, bölüm, iş yeri, taşeron firma, yapılan iş, başlangıç tarihi ve açıklama alanlarını doldurun.");
      return;
    }
    if(!userFactories().includes(factory)||!Object.prototype.hasOwnProperty.call(STRUCTURE,department)){
      alert("Yetki alanınız dışında veya geçersiz fabrika/bölüm seçildi.");
      return;
    }
    if(endDate&&endDate<startDate){
      alert("Bitiş tarihi başlangıç tarihinden önce olamaz.");
      return;
    }
    Object.assign(item,{
      factory,department,location,
      contractorCompany:company,
      title,startDate,endDate,description,
      status:endDate?"done":"progress",
      updatedBy:s.user?.name||"Bilinmeyen Kullanıcı",
      updatedAt:new Date().toISOString()
    });
    saveWorkItems();
    alert("Taşeron işi güncellendi.");
    render();
  };

  const deleteWorkDetail=document.getElementById("deleteWorkDetail");
  if(deleteWorkDetail)deleteWorkDetail.onclick=()=>{
    const item=findWorkItemById(s.workDetailId);
    if(!item)return;

    if(deleteWorkDetail.dataset.confirmDelete!=="yes"){
      deleteWorkDetail.dataset.confirmDelete="yes";
      deleteWorkDetail.textContent=`Tekrar Tıkla: ${item.kind==="request"?"Talebi":item.kind==="contractor"?"Taşeron İşini":"İş Emrini"} Sil`;
      setTimeout(()=>{
        if(document.body.contains(deleteWorkDetail)){
          deleteWorkDetail.dataset.confirmDelete="";
          deleteWorkDetail.textContent=item.kind==="request"?"Talebi Sil":item.kind==="contractor"?"Taşeron İşini Sil":"İş Emrini Sil";
        }
      },5000);
      return;
    }

    const result=deleteWorkItemById(item.id);
    if(!result.ok){
      alert(result.message);
      deleteWorkDetail.dataset.confirmDelete="";
      deleteWorkDetail.textContent=item.kind==="request"?"Talebi Sil":item.kind==="contractor"?"Taşeron İşini Sil":"İş Emrini Sil";
      return;
    }

    s.workDetailId=null;
    s.workTab=item.kind==="contractor"?"contractors":item.kind==="request"?"requests":"orders";
    alert(`${item.id} numaralı ${item.kind==="request"?"iş talebi":item.kind==="contractor"?"taşeron işi":"iş emri"} silindi.`);
    render();
  };

  document.querySelectorAll("[data-work-tab]").forEach(btn=>btn.onclick=()=>{
    s.workTab=btn.dataset.workTab;
    s.workSortKey="createdAt";
    s.workSortDir="desc";
    render();
  });
  document.querySelectorAll("[data-work-sort]").forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.workSort;
    if(!["id","createdAt","factory","department","title","responsible","priority","dateEnd","status"].includes(key))return;
    if(s.workSortKey===key)s.workSortDir=s.workSortDir==="asc"?"desc":"asc";
    else{
      s.workSortKey=key;
      s.workSortDir=["createdAt","dateEnd"].includes(key)?"desc":"asc";
    }
    render();
  });
  const workRecordSearch=document.getElementById("workRecordSearch");
  if(workRecordSearch)workRecordSearch.oninput=()=>{
    const value=workRecordSearch.value;
    const cursor=workRecordSearch.selectionStart;
    s.workSearch=value;
    render();
    const next=document.getElementById("workRecordSearch");
    if(next){
      next.focus();
      next.setSelectionRange(cursor,cursor);
    }
  };
  const workDateStart=document.getElementById("workDateStart");
  const workDateEnd=document.getElementById("workDateEnd");
  if(workDateStart)workDateStart.onchange=()=>{
    s.workDateStart=workDateStart.value;
    if(s.workDateEnd&&s.workDateStart>s.workDateEnd)s.workDateEnd=s.workDateStart;
    render();
  };
  if(workDateEnd)workDateEnd.onchange=()=>{
    s.workDateEnd=workDateEnd.value;
    if(s.workDateStart&&s.workDateEnd<s.workDateStart)s.workDateStart=s.workDateEnd;
    render();
  };
  const clearWorkDates=document.getElementById("clearWorkDates");
  if(clearWorkDates)clearWorkDates.onclick=()=>{
    s.workDateStart="";
    s.workDateEnd="";
    render();
  };
  document.querySelectorAll("[data-open-work-create]").forEach(btn=>btn.onclick=()=>{s.workCreateMode=btn.dataset.openWorkCreate;render()});
  const closeWorkCreate=document.getElementById("closeWorkCreate");
  if(closeWorkCreate)closeWorkCreate.onclick=()=>{s.workCreateMode="";render()};

  const workRequestForm=document.getElementById("workRequestForm");
  if(workRequestForm)workRequestForm.onsubmit=e=>{
    e.preventDefault();
    if(!permissions().createRequest)return;
    const factory=document.getElementById("wrFactory")?.value||"";
    const department=(s.user?.role==="Bölüm Formeni"?s.user.department:document.getElementById("wrDepartment")?.value||"").trim();
    const location=(document.getElementById("wrLocation")?.value||"").trim();
    const title=(document.getElementById("wrTitle")?.value||"").trim();
    const category=document.getElementById("wrCategory")?.value||"";
    const description=(document.getElementById("wrDescription")?.value||"").trim();
    const requestedDate=document.getElementById("wrRequestedDate")?.value||"";
    if(!factory||!department||!location||!title||!category||!description){
      alert("Fabrika, bölüm, yer, kategori, başlık ve açıklama alanlarını doldurun.");
      return;
    }
    if(!userFactories().includes(factory)||!Object.prototype.hasOwnProperty.call(STRUCTURE,department)){
      alert("Yetki alanınız dışında veya geçersiz fabrika/bölüm seçildi.");
      return;
    }
    if(s.user?.role==="Bölüm Formeni"&&department!==s.user.department){
      alert("Yalnızca kendi bölümünüz için iş talebi oluşturabilirsiniz.");
      return;
    }
    s.workItems.push({id:nextWorkId("request"),kind:"request",factory,department,location,title,category,priority:document.getElementById("wrPriority").value,description,requestedDate,status:"new",createdBy:s.user?.name||"Bilinmeyen Kullanıcı",createdAt:new Date().toISOString(),assignedTeam:workTeamForCategory(category),assignedTo:"",sourceRequestId:"",workDescription:"",completedAt:null,usedMaterials:[]});
    saveWorkItems();s.workCreateMode="";s.workTab="requests";render();
  };

  const woFactory=document.getElementById("woFactory"),woTeam=document.getElementById("woTeam"),woAssigned=document.getElementById("woAssigned");
  const refreshWoPeople=()=>{if(!woAssigned)return;const people=workMaintenanceOptions(woFactory.value,woTeam.value);woAssigned.innerHTML='<option value="">Personel seçiniz</option>'+people.map(p=>`<option>${esc(p)}</option>`).join("")};
  if(woFactory)woFactory.onchange=refreshWoPeople;if(woTeam)woTeam.onchange=refreshWoPeople;if(woAssigned)refreshWoPeople();
  const directWorkOrderForm=document.getElementById("directWorkOrderForm");
  if(directWorkOrderForm)directWorkOrderForm.onsubmit=e=>{
    e.preventDefault();if(!permissions().createDirectWorkOrder)return;
    const factory=woFactory?.value||"";
    const department=document.getElementById("woDepartment")?.value||"";
    const location=(document.getElementById("woLocation")?.value||"").trim();
    const title=(document.getElementById("woTitle")?.value||"").trim();
    const category=document.getElementById("woCategory")?.value||"";
    const description=(document.getElementById("woDescription")?.value||"").trim();
    const planStart=document.getElementById("woStart")?.value||"";
    const planEnd=document.getElementById("woEnd")?.value||"";
    const team=woTeam?.value||"";
    const assignedTo=woAssigned?.value||"";
    if(!factory||!department||!location||!title||!category||!description||!planStart||!planEnd){
      alert("Fabrika, bölüm, yer, kategori, başlık, açıklama ve plan tarihlerini doldurun.");
      return;
    }
    if(!userFactories().includes(factory)||!Object.prototype.hasOwnProperty.call(STRUCTURE,department)){
      alert("Yetki alanınız dışında veya geçersiz fabrika/bölüm seçildi.");
      return;
    }
    if(planEnd<planStart){
      alert("Planlanan bitiş tarihi başlangıç tarihinden önce olamaz.");
      return;
    }
    if(!["Elektrik Bakım","Mekanik Bakım"].includes(team)){
      alert("Geçerli bir bakım ekibi seçin.");
      return;
    }
    if(assignedTo&&!workMaintenanceOptions(factory,team).includes(assignedTo)){
      alert("Seçilen personel bu fabrika ve bakım ekibinde bulunmuyor.");
      return;
    }
    s.workItems.push({id:nextWorkId("workorder"),kind:"workorder",factory,department,location,title,category,priority:document.getElementById("woPriority").value,description,requestedDate:"",planStart,planEnd,status:assignedTo?"assigned":"open",createdBy:s.user?.name||"Bilinmeyen Kullanıcı",createdAt:new Date().toISOString(),assignedTeam:team,assignedTo,sourceRequestId:"",workDescription:"",completedAt:null,usedMaterials:[]});
    saveWorkItems();s.workCreateMode="";s.workTab="orders";render();
  };

  const contractorWorkForm=document.getElementById("contractorWorkForm");
  if(contractorWorkForm)contractorWorkForm.onsubmit=e=>{
    e.preventDefault();
    if(!canManageContractorWork())return;
    const factory=document.getElementById("contractorFactory")?.value||"";
    const department=document.getElementById("contractorDepartment")?.value||"";
    const location=(document.getElementById("contractorLocation")?.value||"").trim();
    const contractorCompany=(document.getElementById("contractorCompany")?.value||"").trim();
    const title=(document.getElementById("contractorTitle")?.value||"").trim();
    const startDate=document.getElementById("contractorStartDate")?.value||"";
    const endDate=document.getElementById("contractorEndDate")?.value||"";
    const description=(document.getElementById("contractorDescription")?.value||"").trim();
    if(!factory||!department||!location||!contractorCompany||!title||!startDate||!description){
      alert("Fabrika, bölüm, iş yeri, taşeron firma, yapılan iş, başlangıç tarihi ve açıklama alanlarını doldurun.");
      return;
    }
    if(!userFactories().includes(factory)||!Object.prototype.hasOwnProperty.call(STRUCTURE,department)){
      alert("Yetki alanınız dışında veya geçersiz fabrika/bölüm seçildi.");
      return;
    }
    if(endDate&&endDate<startDate){
      alert("Bitiş tarihi başlangıç tarihinden önce olamaz.");
      return;
    }
    const actor=s.user?.name||"Bilinmeyen Kullanıcı";
    const now=new Date().toISOString();
    s.workItems.push({
      id:nextWorkId("contractor"),
      kind:"contractor",
      factory,department,location,title,contractorCompany,description,startDate,endDate,
      status:endDate?"done":"progress",
      createdBy:actor,createdAt:now,updatedBy:actor,updatedAt:now
    });
    saveWorkItems();
    s.workCreateMode="";
    s.workTab="contractors";
    render();
  };

  document.querySelectorAll("[data-work-request-action]").forEach(btn=>btn.onclick=()=>{
    const item=findWorkItemById(btn.dataset.workId);if(!item)return;
    const action=btn.dataset.workRequestAction;
    if(item.kind!=="request"||!["reviewing","approved","rejected","convert","purchase","outsource","cancelled"].includes(action))return;
    const actor=s.user?.name||"Bilinmeyen Kullanıcı";
    const at=new Date().toISOString();
    if(action==="cancelled"&&permissions().createRequest&&item.createdBy===s.user?.name){item.status="cancelled";item.cancelledBy=actor;item.cancelledAt=at;saveWorkItems();render();return}
    if(!canManageWorkRequest(item))return;
    if(action==="convert"||action==="purchase"||action==="outsource"){
      const linked=s.workItems.find(x=>x.kind==="workorder"&&String(x.sourceRequestId)===String(item.id));
      if(linked){item.status="converted";saveWorkItems();s.workTab="orders";render();return}
      const team=item.assignedTeam||workTeamForCategory(item.category);const people=workMaintenanceOptions(item.factory,team);const assignedTo=people[0]||"";
      const procurementRequired=action==="purchase";
      const outsourcedRequired=action==="outsource";
      const prefix=procurementRequired?"SATIN ALINACAK":outsourcedRequired?"TAŞERONA VERİLECEK":"";
      s.workItems.push({id:nextWorkId("workorder"),kind:"workorder",factory:item.factory,department:item.department,location:item.location,title:item.title,category:item.category,priority:item.priority,description:prefix?`${prefix}\n\n${item.description}`:item.description,requestedDate:item.requestedDate||"",planStart:dateOnly(new Date()),planEnd:item.requestedDate||dateOnly(new Date(Date.now()+3*86400000)),status:procurementRequired?"material":outsourcedRequired?"open":(assignedTo?"assigned":"open"),createdBy:actor,createdAt:at,assignedTeam:team,assignedTo:outsourcedRequired?"":assignedTo,sourceRequestId:item.id,procurementRequired,outsourcedRequired,workDescription:procurementRequired?"SATIN ALINACAK — Satın alma tamamlandıktan sonra iş emri yürütülecek.":outsourcedRequired?"TAŞERONA VERİLECEK — Firma ve iş planı bakım yönetimi tarafından belirlenecek.":"",completedAt:null,usedMaterials:[]});
      item.status="converted";item.conversionType=procurementRequired?"purchase":outsourcedRequired?"outsource":"workorder";item.convertedBy=actor;item.convertedAt=at;if(!item.approvedBy){item.approvedBy=actor;item.approvedAt=at}s.workTab="orders";
    }else{
      item.status=action;
      if(action==="reviewing"){item.reviewedBy=actor;item.reviewedAt=at}
      if(action==="approved"){item.approvedBy=actor;item.approvedAt=at;item.rejectedBy="";item.rejectedAt=null}
      if(action==="rejected"){item.rejectedBy=actor;item.rejectedAt=at;item.approvedBy="";item.approvedAt=null}
    }
    saveWorkItems();render();
  });

  document.querySelectorAll(".work-assignee").forEach(sel=>sel.onchange=()=>{const item=findWorkItemById(sel.dataset.workId);if(item&&canManageWorkRequest(item)&&(!sel.value||workMaintenanceOptions(item.factory,item.assignedTeam).includes(sel.value))){item.assignedTo=sel.value;if(sel.value&&item.status==="open")item.status="assigned";saveWorkItems();render()}});
  document.querySelectorAll(".work-order-status").forEach(sel=>sel.onchange=()=>{const item=findWorkItemById(sel.dataset.workId);if(item&&canUpdateWorkOrder(item)&&["open","assigned","progress","material","approval","done","cancelled"].includes(sel.value)){item.status=sel.value;item.completedAt=sel.value==="done"?new Date().toISOString():null;item.completedBy=sel.value==="done"?(s.user?.name||""):"";const source=findWorkItemById(item.sourceRequestId);if(source){if(sel.value==="done"){source.status="done";source.completedAt=item.completedAt}else if(source.status==="done"){source.status="converted";source.completedAt=null}}saveWorkItems();render()}});
  document.querySelectorAll(".save-work-result").forEach(btn=>btn.onclick=()=>{const item=findWorkItemById(btn.dataset.workId);if(!item||!canUpdateWorkOrder(item))return;const ta=[...document.querySelectorAll(".work-result-text")].find(el=>String(el.dataset.workId)===String(item.id));item.workDescription=(ta?.value||"").trim();saveWorkItems();render()});
  document.querySelectorAll(".work-material-form").forEach(form=>form.onsubmit=e=>{e.preventDefault();const item=findWorkItemById(form.dataset.workId);if(!item||!canUpdateWorkOrder(item))return;const query=(form.querySelector(".work-material-search")?.value||"").trim().toLocaleLowerCase("tr-TR");const qty=Number(form.querySelector(".work-material-qty").value);const material=MATERIALS.find(m=>[m.id,m.code,m.name,`${m.code} · ${m.name}`].some(value=>String(value||"").toLocaleLowerCase("tr-TR")===query));if(!material){alert("Listeden geçerli bir malzeme seçin.");return}if(!Number.isFinite(qty)||qty<=0)return;if(!Array.isArray(item.usedMaterials))item.usedMaterials=[];item.usedMaterials.push({materialId:material.id,quantity:qty,unit:material.unit,name:material.name,addedBy:s.user?.name||"",addedAt:new Date().toISOString()});saveWorkItems();render()});
  document.querySelectorAll("[data-remove-work-material]").forEach(btn=>btn.onclick=()=>{const item=findWorkItemById(btn.dataset.removeWorkMaterial);const index=Number(btn.dataset.index);if(!item||!canUpdateWorkOrder(item)||!Array.isArray(item.usedMaterials)||!Number.isInteger(index)||index<0||index>=item.usedMaterials.length)return;item.usedMaterials.splice(index,1);saveWorkItems();render()});

  const materialCatalogAddForm=document.getElementById("materialCatalogAddForm");
  if(materialCatalogAddForm)materialCatalogAddForm.onsubmit=e=>{
    e.preventDefault();
    if(!canManageMaterialCatalog()){
      alert("Malzeme tanımlama yetkiniz bulunmuyor.");
      return;
    }

    const code=(document.getElementById("newMaterialCode")?.value||"").trim().toLocaleUpperCase("tr-TR");
    const name=(document.getElementById("newMaterialName")?.value||"").trim();
    const category=(document.getElementById("newMaterialCategory")?.value||"").trim();
    const unit=(document.getElementById("newMaterialUnit")?.value||"Adet").trim();
    const stock=Number(document.getElementById("newMaterialStock")?.value||0);
    const minStock=Number(document.getElementById("newMaterialMinStock")?.value||0);
    const description=(document.getElementById("newMaterialDescription")?.value||"").trim();
    const warehouseLocation=(document.getElementById("newMaterialLocation")?.value||"").trim();

    if(!code||!name||!category||!unit||!warehouseLocation){
      alert("Malzeme kodu, adı, kategori, birim ve depo konumu alanlarını doldurun.");
      return;
    }
    if(!Number.isFinite(stock)||stock<0||!Number.isFinite(minStock)||minStock<0){
      alert("Stok değerleri sıfır veya sıfırdan büyük olmalıdır.");
      return;
    }

    const duplicateCode=MATERIALS.find(m=>String(m.code||"").trim().toLocaleUpperCase("tr-TR")===code);
    if(duplicateCode){
      alert(`"${code}" koduyla kayıtlı bir malzeme zaten bulunuyor: ${duplicateCode.name}`);
      document.getElementById("newMaterialCode")?.focus();
      return;
    }

    const duplicateName=MATERIALS.find(m=>String(m.name||"").trim().toLocaleLowerCase("tr-TR")===name.toLocaleLowerCase("tr-TR"));
    if(duplicateName){
      const continueSave=confirm(`"${name}" isimli bir malzeme zaten bulunuyor. Farklı kodla yine de eklemek istiyor musunuz?`);
      if(!continueSave)return;
    }

    MATERIALS.push({
      id:`MAT-U-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      code,
      name,
      category,
      unit,
      stock:Number(stock.toFixed(2)),
      minStock:Number(minStock.toFixed(2)),
      description,
      warehouseLocation,
      custom:true,
      createdBy:s.user?.name||"Bilinmeyen Kullanıcı",
      createdAt:new Date().toISOString()
    });
    saveMaterials();
    alert(`"${name}" malzeme kataloğuna eklendi.`);
    render();
  };

  document.querySelectorAll(".material-detail-row[data-material-edit]").forEach(row=>{
    const open=()=>{s.materialEditId=row.dataset.materialEdit;render()};
    row.onclick=open;
    row.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}};
  });
  document.querySelectorAll("[data-material-sort]").forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.materialSort;
    if(!Object.prototype.hasOwnProperty.call(MATERIAL_SORT_LABELS,key))return;
    if(s.materialSortKey===key)s.materialSortDir=s.materialSortDir==="asc"?"desc":"asc";
    else{s.materialSortKey=key;s.materialSortDir=["stock","minStock","faultCount","usage"].includes(key)?"desc":"asc"}
    render();
  });
  const closeMaterialEditor=()=>{s.materialEditId=null;render()};
  ["closeMaterialEditor","cancelMaterialEditor"].forEach(id=>{const btn=document.getElementById(id);if(btn)btn.onclick=closeMaterialEditor});
  const materialEditorBackdrop=document.getElementById("materialEditorBackdrop");
  if(materialEditorBackdrop)materialEditorBackdrop.onclick=e=>{if(e.target===materialEditorBackdrop)closeMaterialEditor()};
  const materialEditorForm=document.getElementById("materialEditorForm");
  if(materialEditorForm)materialEditorForm.onsubmit=e=>{
    e.preventDefault();if(!canManageMaterialCatalog())return;
    const id=document.getElementById("materialEditorId").value;
    const material=materialById(id);if(!material)return;
    const code=document.getElementById("materialEditCode").value.trim().toLocaleUpperCase("tr-TR");
    const name=document.getElementById("materialEditName").value.trim();
    const category=(document.getElementById("materialEditCategory")?.value||"").trim();
    const unit=(document.getElementById("materialEditUnit")?.value||"").trim();
    const stock=Number(document.getElementById("materialEditStock")?.value);
    const minStock=Number(document.getElementById("materialEditMinStock")?.value);
    if(!code||!name||!category||!unit){
      alert("Malzeme kodu, adı, kategori ve birim alanları boş bırakılamaz.");
      return;
    }
    if(!Number.isFinite(stock)||stock<0||!Number.isFinite(minStock)||minStock<0){
      alert("Stok değerleri sıfır veya sıfırdan büyük olmalıdır.");
      return;
    }
    const duplicate=MATERIALS.find(x=>String(x.id)!==String(id)&&String(x.code||"").trim().toLocaleUpperCase("tr-TR")===code);
    if(duplicate){alert(`Bu malzeme kodu zaten kullanılıyor: ${duplicate.name}`);return}
    Object.assign(material,{code,name,category,unit,stock:Number(stock.toFixed(2)),minStock:Number(minStock.toFixed(2)),warehouseLocation:document.getElementById("materialEditLocation").value.trim(),description:document.getElementById("materialEditDescription").value.trim(),updatedBy:s.user?.name||"",updatedAt:new Date().toISOString()});
    saveMaterials();s.materialEditId=null;render();
  };
  function deleteMaterialByButton(btn){
    if(!btn||!canManageMaterialCatalog())return;
    const id=btn.dataset.materialDelete||btn.dataset.materialId;
    const material=materialById(id);if(!material)return;
    if(btn.dataset.confirmDelete!=="yes"){
      btn.dataset.confirmDelete="yes";btn.textContent="Tekrar Tıkla: Kalıcı Sil";
      setTimeout(()=>{if(document.body.contains(btn)){btn.dataset.confirmDelete="";btn.textContent=btn.id==="deleteMaterialFromEditor"?"Malzemeyi Sil":"Sil"}},5000);return;
    }
    DELETED_MATERIAL_IDS.add(id);saveDeletedMaterialIds();
    MATERIALS=MATERIALS.filter(x=>x.id!==id);saveMaterials();s.materialEditId=null;render();
  }
  const deleteMaterialFromEditor=document.getElementById("deleteMaterialFromEditor");if(deleteMaterialFromEditor)deleteMaterialFromEditor.onclick=()=>deleteMaterialByButton(deleteMaterialFromEditor);

  const materialCatalogSearch=document.getElementById("materialCatalogSearch");
  const materialCatalogCategory=document.getElementById("materialCatalogCategory");
  const applyMaterialCatalogFilter=()=>{
    const query=(materialCatalogSearch?.value||"").trim().toLocaleLowerCase("tr-TR");
    const category=materialCatalogCategory?.value||"";
    let visible=0;
    document.querySelectorAll(".material-table tbody tr[data-material-search]").forEach(row=>{
      const matchesText=!query||(row.dataset.materialSearch||"").includes(query);
      const matchesCategory=!category||row.dataset.materialCategory===category;
      const show=matchesText&&matchesCategory;
      row.hidden=!show;
      if(show)visible++;
    });
    const counter=document.getElementById("materialVisibleCount");
    if(counter)counter.textContent=visible;
  };
  if(materialCatalogSearch)materialCatalogSearch.oninput=applyMaterialCatalogFilter;
  if(materialCatalogCategory)materialCatalogCategory.onchange=applyMaterialCatalogFilter;

  const faultSolutionText=document.getElementById("faultSolutionText");
  const faultSolutionCount=document.getElementById("faultSolutionCount");
  if(faultSolutionText&&faultSolutionCount)faultSolutionText.oninput=()=>{faultSolutionCount.textContent=faultSolutionText.value.length};

  const faultSolutionSave=document.getElementById("faultSolutionSave");
  if(faultSolutionSave)faultSolutionSave.onclick=()=>{
    const fault=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
    if(!fault||!canUpdateFaultStatus(fault))return;
    const solution=(faultSolutionText?.value||"").trim();
    fault.solutionText=solution;
    if(solution){
      fault.solutionBy=s.user?.name||"Bilinmeyen Kullanıcı";
      fault.solutionAt=new Date().toISOString();
    }else{
      fault.solutionBy="";
      fault.solutionAt=null;
    }
    save();
    render();
  };

  const faultMaterialForm=document.getElementById("faultMaterialForm");
  if(faultMaterialForm)faultMaterialForm.onsubmit=e=>{
    e.preventDefault();
    const fault=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
    if(!fault||!canManageFaultMaterials()){
      alert("Bu arızaya malzeme ekleme yetkiniz bulunmuyor.");
      return;
    }
    const materialQuery=(document.getElementById("faultMaterialSearch")?.value||"").trim().toLocaleLowerCase("tr-TR");
    const quantity=Number(document.getElementById("faultMaterialQuantity").value);
    const note=document.getElementById("faultMaterialNote").value.trim();
    const material=MATERIALS.find(m=>[m.id,m.code,m.name,`${m.code} · ${m.name}`].some(value=>String(value||"").toLocaleLowerCase("tr-TR")===materialQuery));
    if(!material||!quantity||quantity<=0){
      alert("Malzeme ve geçerli miktar seçiniz.");
      return;
    }
    if(!Array.isArray(fault.usedMaterials))fault.usedMaterials=[];
    fault.usedMaterials.push({
      materialId:material.id,
      code:material.code,
      name:material.name,
      category:material.category,
      quantity,
      unit:material.unit,
      note,
      addedBy:s.user?.name||"",
      addedAt:new Date().toISOString()
    });
    save();
    render();
  };

  document.querySelectorAll(".fault-material-remove").forEach(btn=>btn.onclick=()=>{
    const fault=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
    if(!fault||!canManageFaultMaterials())return;
    const index=Number(btn.dataset.materialIndex);
    if(!Array.isArray(fault.usedMaterials)||!fault.usedMaterials[index])return;
    if(btn.dataset.confirmRemove!=="yes"){
      btn.dataset.confirmRemove="yes";
      btn.textContent="Tekrar Tıkla";
      setTimeout(()=>{if(document.body.contains(btn)){btn.dataset.confirmRemove="";btn.textContent="Sil"}},4000);
      return;
    }
    fault.usedMaterials.splice(index,1);
    save();
    render();
  });

  const faultModalStatus=document.getElementById("faultModalStatus");
  if(faultModalStatus)faultModalStatus.onchange=()=>{
    const fault=s.faults.find(x=>Number(x.id)===Number(s.faultModalId));
    if(!fault||!canUpdateFaultStatus(fault)||!["open","progress","done"].includes(faultModalStatus.value))return;
    const nextStatus=faultModalStatus.value;
    const solution=(document.getElementById("faultSolutionText")?.value||"").trim();
    fault.solutionText=solution;
    if(solution){
      fault.solutionBy=s.user?.name||fault.solutionBy||"Bilinmeyen Kullanıcı";
      fault.solutionAt=new Date().toISOString();
    }else{
      fault.solutionBy="";
      fault.solutionAt=null;
    }
    fault.closedAt=nextStatus==="done"?(fault.closedAt||new Date().toISOString()):null;
    fault.status=nextStatus;
    save();
    render();
  };
  const l=document.getElementById("login");
  if(l)l.onsubmit=e=>{
    e.preventDefault();
    const userId=document.getElementById("userId").value.trim();
    const password=document.getElementById("password").value;
    const account=APP_USERS[userId];
    if(!account||account.password!==password){
      document.getElementById("loginError").textContent="Kullanıcı ID veya parola hatalı.";
      return;
    }
    s.user={id:userId,name:account.name,role:account.role,factories:[...account.factories],department:account.department||"",team:account.team||""};
    s.shiftFactory=shiftFactoryName((account.factories||[])[0]||"1. Fabrika");
    s.dashboardFactory=permissions().allFactories?"Tümü":(s.user.factories.length===1?s.user.factories[0]:"Tümü");
    s.reportFactory=s.dashboardFactory;
    s.layoutFactory=s.user.factories[0]||"1. Fabrika";
    s.layoutLine=(FACTORIES[s.layoutFactory]||["1. Hat"])[0];
    s.page="dashboard";
    s.login=true;
    storageSet(sessionStorage,"esauthversion",AUTH_VERSION);
    storageSet(sessionStorage,"eslogin","1");
    storageSet(sessionStorage,"esuser",JSON.stringify(s.user));
    if(document.getElementById("rememberMe")?.checked){
      storageSet(localStorage,REMEMBER_LOGIN_KEY,JSON.stringify({authVersion:AUTH_VERSION,user:s.user}));
    }else{
      storageRemove(localStorage,REMEMBER_LOGIN_KEY);
    }
    ensureNotificationBaseline();
    render();
  };
  const out=document.getElementById("out");if(out)out.onclick=()=>{storageClear(sessionStorage);storageRemove(localStorage,REMEMBER_LOGIN_KEY);s.login=false;s.user=null;s.page="dashboard";render()};
  const df=document.getElementById("dashboardFactory");if(df)df.onchange=()=>{s.dashboardFactory=df.value;render()};
  document.querySelectorAll("[data-dashboard-fault-tab]").forEach(button=>button.onclick=()=>{
    s.dashboardFaultTab=button.dataset.dashboardFaultTab;
    render();
  });

  const prevShiftWeek=document.getElementById("prevShiftWeek");
  const nextShiftWeek=document.getElementById("nextShiftWeek");
  if(prevShiftWeek)prevShiftWeek.onclick=()=>{if(s.shiftViewMode==="monthly"){const d=new Date(s.shiftMonthDate);d.setMonth(d.getMonth()-1);s.shiftMonthDate=new Date(d.getFullYear(),d.getMonth(),1).toISOString()}else s.shiftWeekOffset--;render()};
  if(nextShiftWeek)nextShiftWeek.onclick=()=>{if(s.shiftViewMode==="monthly"){const d=new Date(s.shiftMonthDate);d.setMonth(d.getMonth()+1);s.shiftMonthDate=new Date(d.getFullYear(),d.getMonth(),1).toISOString()}else s.shiftWeekOffset++;render()};

  const shiftFactory=document.getElementById("shiftFactory");
  const shiftTeam=document.getElementById("shiftTeam");


  document.querySelectorAll("[data-performance-period]").forEach(btn=>btn.onclick=()=>{
    s.personnelPerformancePeriod=btn.dataset.performancePeriod;
    render();
  });

  document.querySelectorAll("[data-personnel-group]").forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll("[data-personnel-group]").forEach(x=>x.classList.toggle("active",x===btn));
    document.querySelectorAll("[data-personnel-group-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.personnelGroupPanel===btn.dataset.personnelGroup));
  });

  document.querySelectorAll(".personnel-profile-card").forEach(card=>card.onclick=e=>{
    if(e.target.closest("button,input,select,a"))return;
    s.personnelDetailId=card.dataset.personnelDetailId;
    render();
  });

  const personnelDetailBackdrop=document.getElementById("personnelDetailBackdrop");
  const closePersonnelDetail=document.getElementById("closePersonnelDetail");
  if(closePersonnelDetail)closePersonnelDetail.onclick=()=>{s.personnelDetailId=null;render()};
  if(personnelDetailBackdrop)personnelDetailBackdrop.onclick=e=>{
    if(e.target===personnelDetailBackdrop){s.personnelDetailId=null;render()}
  };
  function bindPersonnelDeleteButton(btn){
    if(!btn)return;
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      if(!permissions().manageAllPersonnel){
        alert("Personel silme yetkisi yalnızca Bakım Müdüründedir.");
        return;
      }
      const id=btn.dataset.userId;
      const account=APP_USERS[id];
      if(!account){
        alert("Personel hesabı bulunamadı veya daha önce silinmiş.");
        render();
        return;
      }

      // Tarayıcı onay pencerelerine bağlı kalmadan iki tıklamalı güvenli silme.
      if(btn.dataset.confirmDelete!=="yes"){
        btn.dataset.confirmDelete="yes";
        btn.textContent="Tekrar Tıkla: Kalıcı Sil";
        btn.classList.add("delete-confirming");
        setTimeout(()=>{
          if(document.body.contains(btn)&&btn.dataset.confirmDelete==="yes"){
            btn.dataset.confirmDelete="";
            btn.textContent="Personeli Sil";
            btn.classList.remove("delete-confirming");
          }
        },5000);
        return;
      }

      const result=deleteMaintenancePersonnelAccount(id);
      if(!result.ok){
        alert(result.message);
        return;
      }
      s.personnelDetailId=null;
      render();
      alert(`${result.name} sistemden silindi.`);
    };
  }

  bindPersonnelDeleteButton(document.querySelector(".personnel-delete-btn"));

  const personnelDetailEdit=document.querySelector(".personnel-detail-edit");
  if(personnelDetailEdit)personnelDetailEdit.onclick=e=>{
    e.stopPropagation();
    const id=personnelDetailEdit.dataset.userId;
    s.personnelDetailId=null;
    render();
    setTimeout(()=>{
      const btn=[...document.querySelectorAll(".personnel-edit-btn")].find(x=>x.dataset.userId===id);
      if(btn)btn.click();
    },0);
  };
  document.querySelectorAll(".personnel-fault-link").forEach(row=>row.onclick=()=>{
    s.personnelDetailId=null;
    s.faultModalId=Number(row.dataset.faultId);
    render();
  });

  const personnelBackdrop=document.getElementById("personnelEditorBackdrop");
  const openPersonnelAdd=document.getElementById("openPersonnelAdd");
  const closePersonnelEditor=document.getElementById("closePersonnelEditor");
  const cancelPersonnelEditor=document.getElementById("cancelPersonnelEditor");
  const personnelForm=document.getElementById("personnelEditorForm");
  function hidePersonnelEditor(){if(personnelBackdrop)personnelBackdrop.style.display="none"}
  function showPersonnelEditor(id=""){
    if(!personnelBackdrop)return;
    const original=document.getElementById("personnelOriginalId");
    const idEl=document.getElementById("personnelId");
    const passEl=document.getElementById("personnelPassword");
    const nameEl=document.getElementById("personnelName");
    const factoryEl=document.getElementById("personnelFactory");
    const teamEl=document.getElementById("personnelTeam");
    original.value=id;
    if(id&&APP_USERS[id]){
      const u=APP_USERS[id];
      document.getElementById("personnelEditorTitle").textContent="Personel Hesabını Düzenle";
      idEl.value=id;passEl.value=u.password;nameEl.value=u.name;
      factoryEl.value=shiftFactoryName(u.factories?.[0]||"1. Fabrika");
      teamEl.value=u.team||teamEl.options[0]?.value||"";
    }else{
      document.getElementById("personnelEditorTitle").textContent="Yeni Bakım Personeli";
      idEl.value=nextFourDigitId();passEl.value=randomFourDigitPassword();nameEl.value="";
      if(teamEl.options.length===1)teamEl.selectedIndex=0;
    }
    personnelBackdrop.style.display="flex";
  }
  if(openPersonnelAdd)openPersonnelAdd.onclick=()=>showPersonnelEditor();
  if(closePersonnelEditor)closePersonnelEditor.onclick=hidePersonnelEditor;
  if(cancelPersonnelEditor)cancelPersonnelEditor.onclick=hidePersonnelEditor;
  if(personnelBackdrop)personnelBackdrop.onclick=e=>{if(e.target===personnelBackdrop)hidePersonnelEditor()};
  const generatePersonnelPassword=document.getElementById("generatePersonnelPassword");
  if(generatePersonnelPassword)generatePersonnelPassword.onclick=()=>{document.getElementById("personnelPassword").value=randomFourDigitPassword()};
  document.querySelectorAll(".personnel-edit-btn").forEach(btn=>btn.onclick=()=>showPersonnelEditor(btn.dataset.userId));
  if(personnelForm)personnelForm.onsubmit=e=>{
    e.preventDefault();
    const original=document.getElementById("personnelOriginalId").value;
    const newId=document.getElementById("personnelId").value.trim();
    const password=document.getElementById("personnelPassword").value.trim();
    const name=document.getElementById("personnelName").value.trim();
    const factory=document.getElementById("personnelFactory").value;
    const team=document.getElementById("personnelTeam").value;
    if(!/^\d{4}$/.test(newId)||!/^\d{4}$/.test(password)){alert("ID ve şifre tam olarak 4 haneli olmalıdır.");return}
    if(!name){alert("Personelin adını ve soyadını girin.");return}
    if(!["1. Fabrika","2. Fabrika"].includes(factory)||!["Elektrik Bakım","Mekanik Bakım"].includes(team)){
      alert("Geçerli bir fabrika ve bakım ekibi seçin.");
      return;
    }
    if(APP_USERS[newId]&&newId!==original){alert("Bu kullanıcı ID zaten kullanılıyor.");return}
    const factories=factory==="1. Fabrika"?["1. Fabrika"]:["2. Fabrika A Blok","2. Fabrika B Blok"];
    const candidate={password,name,role:"Bakım Personeli",factories,department:"",team};
    if(!canManagePersonnelAccount(candidate)){alert("Yalnızca kendi fabrikanızdaki ve ekibinizdeki bakım personellerini yönetebilirsiniz.");return}
    if(original&&original!==newId){
      delete APP_USERS[original];
      DELETED_PERSONNEL_IDS.add(String(original));
    }
    DELETED_PERSONNEL_IDS.delete(String(newId));
    saveDeletedPersonnelIds();
    APP_USERS[newId]=candidate;
    saveAppUsers();
    render();
    alert(`${name} personel hesabı kaydedildi.`);
  };

  const shiftSearch=document.getElementById("shiftSearch");

  if(shiftFactory)shiftFactory.onchange=()=>{s.shiftFactory=shiftFactory.value;render()};
  if(shiftTeam)shiftTeam.onchange=()=>{s.shiftTeam=shiftTeam.value;render()};
  document.querySelectorAll("[data-shift-view]").forEach(button=>button.onclick=()=>{s.shiftViewMode=button.dataset.shiftView==="monthly"?"monthly":"weekly";render()});
  if(shiftSearch)shiftSearch.oninput=()=>{
    s.shiftSearch=shiftSearch.value;
    render();
    const next=document.getElementById("shiftSearch");
    if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length)}
  };
  const importShiftExcel=document.getElementById("importShiftExcel");
  if(importShiftExcel)importShiftExcel.onclick=async()=>{
    const input=document.getElementById("shiftExcelFile");
    const file=input?.files?.[0];
    if(!file){alert("Önce bir Excel vardiya çizelgesi seçin.");return}
    if(!canManageShiftTeam(s.shiftTeam)){alert("Bu vardiya ekibini düzenleme yetkiniz bulunmuyor.");return}
    importShiftExcel.disabled=true;importShiftExcel.textContent="Excel okunuyor...";
    try{
      const result=await importShiftExcelFile(file,s.shiftFactory,s.shiftTeam);
      if(!result.added){
        const details=[...result.errors];
        if(result.unmatchedNames?.length)details.push(`Eşleşmeyen personel: ${result.unmatchedNames.slice(0,8).join(", ")}${result.unmatchedNames.length>8?"…":""}`);
        throw new Error(details.join("\n")||"Aktarılabilecek geçerli vardiya kaydı bulunamadı.");
      }
      if(result.monthDate){
        const month=new Date(result.monthDate);
        s.shiftViewMode="monthly";
        s.shiftMonthDate=new Date(month.getFullYear(),month.getMonth(),1).toISOString();
      }
      render();
      const lines=[`${result.added} vardiya kaydı aktarıldı.`];
      if(result.sourceSheet&&result.monthDate)lines.push(`Aktarılan sayfa: ${result.sourceSheet} · ${new Date(result.monthDate).toLocaleDateString("tr-TR",{month:"long",year:"numeric"})}`);
      if(result.skipped)lines.push(`${result.skipped} hücre okunamadığı veya belirsiz olduğu için atlandı.`);
      if(result.ambiguous)lines.push(`${result.ambiguous} hücrede birden fazla vardiya rengi bulundu; bu hücreler bilinçli olarak aktarılmadı.`);
      if(result.unmatchedNames?.length)lines.push(`Eşleşmeyen ${result.unmatchedNames.length} personel: ${result.unmatchedNames.slice(0,8).join(", ")}${result.unmatchedNames.length>8?"…":""}`);
      if(result.errors.length)lines.push(...result.errors);
      alert(lines.join("\n"));
    }catch(error){
      alert(`Excel içe aktarılamadı: ${error.message}`);
      importShiftExcel.disabled=false;importShiftExcel.textContent="Excel’i Kontrol Et ve Aktar";
    }
  };
  const exportShiftTemplate=document.getElementById("exportShiftTemplate");
  if(exportShiftTemplate)exportShiftTemplate.onclick=async()=>{
    exportShiftTemplate.disabled=true;
    const originalText=exportShiftTemplate.textContent;
    exportShiftTemplate.textContent="Şablon hazırlanıyor...";
    try{
      const result=await exportShiftTemplateFile(s.shiftFactory,s.shiftTeam,s.shiftMonthDate);
      alert(`Vardiya çizelgesi Excel dosyası indirildi: ${result.filename}`);
    }catch(error){
      alert(`Excel çıktısı oluşturulamadı: ${error.message}`);
    }finally{
      exportShiftTemplate.disabled=false;
      exportShiftTemplate.textContent=originalText;
    }
  };
  document.querySelectorAll(".shift-assignment-select").forEach(el=>el.onchange=()=>{
    if(!canManageShiftTeam(s.shiftTeam)){render();return}
    const personId=el.dataset.shiftPersonId;
    const dayIndex=Number(el.dataset.shiftDay);
    const weekOffset=Number.isFinite(Number(el.dataset.shiftWeekOffset))?Number(el.dataset.shiftWeekOffset):s.shiftWeekOffset;
    setShiftOverride(s.shiftFactory,s.shiftTeam,weekOffset,personId,dayIndex,el.value);
    render();
  });

  document.querySelectorAll("[data-shift-person]").forEach(x=>x.onclick=()=>{s.shiftPersonModal=x.dataset.shiftPerson;render()});
  const closeShiftPerson=document.getElementById("closeShiftPerson");
  const closeShiftPersonBtn=document.getElementById("closeShiftPersonBtn");
  if(closeShiftPerson)closeShiftPerson.onclick=()=>{s.shiftPersonModal=null;render()};
  if(closeShiftPersonBtn)closeShiftPersonBtn.onclick=()=>{s.shiftPersonModal=null;render()};

  document.querySelectorAll(".chart-unit").forEach(el=>el.onchange=()=>{
    const id=el.dataset.chart;
    if(!s.chartRanges[id])s.chartRanges[id]={unit:"day",value:30};
    s.chartRanges[id].unit=el.value;
    render();
  });
  document.querySelectorAll(".chart-value").forEach(el=>el.onchange=()=>{
    const id=el.dataset.chart;
    if(!s.chartRanges[id])s.chartRanges[id]={unit:"day",value:30};
    s.chartRanges[id].value=Math.max(1,Number(el.value)||1);
    render();
  });
  const factoryEl=document.getElementById("factory"),lineEl=document.getElementById("line");
  const depEl=document.getElementById("department"),machineEl=document.getElementById("machine");
  if(factoryEl)factoryEl.onchange=()=>{
    const lines=catalogLines(factoryEl.value);
    lineEl.innerHTML=opts(lines,"Hat / alan seçiniz");
    lineEl.disabled=!lines.length;
    depEl.innerHTML=opts([],"Önce hat seçiniz");depEl.disabled=true;
    machineEl.innerHTML=opts([],"Önce bölüm seçiniz");machineEl.disabled=true;
  };
  if(lineEl)lineEl.onchange=()=>{
    const departments=catalogDepartments(factoryEl.value,lineEl.value).filter(department=>!roleIsDepartmentLimited()||!s.user?.department||department===s.user.department);
    depEl.innerHTML=opts(departments,"Bölüm seçiniz");
    depEl.disabled=!departments.length;
    machineEl.innerHTML=opts([],"Önce bölüm seçiniz");machineEl.disabled=true;
  };
  if(depEl)depEl.onchange=()=>{
    const machines=catalogMachines(factoryEl.value,lineEl.value,depEl.value);
    machineEl.innerHTML=opts(machines,"Makine seçiniz");
    machineEl.disabled=!machines.length;
  };
  const f=document.getElementById("fault");if(f)f.onsubmit=e=>{
    e.preventDefault();
    if(!canCreateFault()){
      alert("Arıza kaydını yalnızca operatörler, bölüm formenleri ve üretim müdürü açabilir.");
      s.page="dashboard";
      render();
      return;
    }
    const factory=factoryEl?.value||"";
    const line=lineEl?.value||"";
    const department=depEl?.value||"";
    const machine=machineEl?.value||"";
    const type=document.getElementById("type")?.value||"";
    const subject=(document.getElementById("subject")?.value||"").trim();
    const description=(document.getElementById("desc")?.value||"").trim();
    if(roleIsDepartmentLimited()&&s.user?.department&&department!==s.user.department){
      alert("Yalnızca kendi bölümünüz için arıza kaydı açabilirsiniz.");
      return;
    }
    if(!userFactories().includes(factory)||!catalogLines(factory).includes(line)||!catalogDepartments(factory,line).includes(department)||!catalogMachines(factory,line,department).includes(machine)){
      alert("Geçersiz veya yetki alanınız dışında fabrika, hat, bölüm ya da makine seçildi.");
      return;
    }
    if(!TYPES.includes(type)||!subject||!description){
      alert("Arıza tipi, konusu ve açıklamasını eksiksiz girin.");
      return;
    }
    const now=new Date().toISOString();
    const numericFaultIds=s.faults.map(item=>Number(item.id)).filter(Number.isFinite);
    const fault={id:Math.max(1000,...numericFaultIds)+1,factory,line,department,machine,type,subject,description,stopped:!!document.getElementById("stopped")?.checked,photoName:document.getElementById("photo")?.files?.[0]?.name||"",status:"open",openedBy:s.user?.name||"Bilinmeyen Kullanıcı",assignedTo:"",assignmentState:"pending",claimedBy:"",claimedAt:null,assignmentHistory:[],participants:[],solutionText:"",solutionBy:"",solutionAt:null,createdAt:now,closedAt:null};
    const activePeople=activeMaintenanceForFault(fault);
    fault.assignedTo=deterministicPerson(activePeople,fault.id,31)||"Atama Bekliyor";
    fault.assignmentHistory.push({action:"assigned",from:"",to:fault.assignedTo,by:"Sistem",at:now,shift:currentShiftLabel()});
    s.faults.push(fault);
    save();s.page="faults";render();
    alert(fault.assignedTo==="Atama Bekliyor"?"Arıza kaydı oluşturuldu. Aktif vardiyada uygun bakım personeli bulunamadığı için atama bekliyor.":`Arıza kaydı ${fault.assignedTo} personeline atandı. Müdahalenin başlaması için personelin arızayı üstlenmesi gerekiyor.`);
  };
  document.querySelectorAll(".status-sel").forEach(x=>x.onchange=()=>{
    const fault=s.faults.find(y=>y.id==x.dataset.id);
    if(!fault||!canUpdateFaultStatus(fault)||!["open","progress","done"].includes(x.value))return;
    fault.status=x.value;
    if(x.value==="progress"&&(!fault.assignedTo||fault.assignedTo==="Atama Bekliyor")){
      fault.assignedTo=deterministicPerson(activeMaintenanceForFault(fault),fault.id,19)||"Atama Bekliyor";
    }
    if(x.value==="done"){
      if(!fault.closedAt)fault.closedAt=new Date().toISOString();
      if(String(fault.solutionText||"").trim()){
        fault.solutionBy=fault.solutionBy||s.user?.name||"Bilinmeyen Kullanıcı";
        fault.solutionAt=fault.solutionAt||new Date().toISOString();
      }else{
        fault.solutionBy="";
        fault.solutionAt=null;
      }
    }
    if(x.value!=="done")fault.closedAt=null;
    save();render();
  });
  document.querySelectorAll(".personnel-sel").forEach(x=>x.onchange=()=>{
    const fault=s.faults.find(y=>y.id==x.dataset.personnelId);
    const validTargets=fault?["Atama Bekliyor",...maintenanceOptionsForFault(fault)]:[];
    if(fault&&canRedirectFault(fault)&&validTargets.includes(x.value)){
      const previous=fault.assignedTo||"Atama Bekliyor";
      fault.assignedTo=x.value;
      fault.assignmentState="pending";
      fault.claimedBy="";
      fault.claimedAt=null;
      if(fault.status!=="done")fault.status="open";
      if(!Array.isArray(fault.assignmentHistory))fault.assignmentHistory=[];
      fault.assignmentHistory.push({action:"reassigned",from:previous,to:x.value,by:s.user?.name||"",at:new Date().toISOString(),shift:currentShiftLabel()});
      save();render()
    }
  });
  const rf=document.getElementById("reportFactory"),rs=document.getElementById("reportStart"),re=document.getElementById("reportEnd");if(rf)rf.onchange=()=>{s.reportFactory=rf.value;render()};if(rs)rs.onchange=()=>{s.reportStart=rs.value;render()};if(re)re.onchange=()=>{s.reportEnd=re.value;render()};
  const cr=document.getElementById("clearReport");if(cr)cr.onclick=()=>{s.reportFactory="Tümü";s.reportStart="";s.reportEnd="";render()};
  const lf=document.getElementById("layoutFactory"),ll=document.getElementById("layoutLine"),ld=document.getElementById("layoutDepartment");
  if(lf)lf.onchange=()=>{
    s.layoutFactory=lf.value;
    s.layoutLine=catalogLines(lf.value)[0]||"";
    s.layoutDepartment=catalogDepartments(s.layoutFactory,s.layoutLine)[0]||"";
    render();
  };
  if(ll)ll.onchange=()=>{
    s.layoutLine=ll.value;
    s.layoutDepartment=catalogDepartments(s.layoutFactory,s.layoutLine)[0]||"";
    render();
  };
  if(ld)ld.onchange=()=>{s.layoutDepartment=ld.value;render()};
  document.querySelectorAll("[data-department]").forEach(x=>x.onclick=()=>{s.layoutDepartment=x.dataset.department;render()});
  const machineCatalogForm=document.getElementById("machineCatalogForm");
  if(machineCatalogForm)machineCatalogForm.onsubmit=e=>{
    e.preventDefault();
    if(!canManageMachines())return;
    const name=document.getElementById("newMachineName")?.value.trim()||"";
    const result=addMachineToCatalog(s.layoutFactory,s.layoutLine,s.layoutDepartment,name);
    if(!result.ok){alert(result.message);return}
    render();
  };
  document.querySelectorAll("[data-delete-machine]").forEach(button=>button.onclick=e=>{
    e.stopPropagation();
    if(!canManageMachines())return;
    if(button.dataset.confirmDelete!=="yes"){
      button.dataset.confirmDelete="yes";
      button.textContent="Tekrar Tıkla: Sil";
      setTimeout(()=>{
        if(document.body.contains(button)){
          button.dataset.confirmDelete="";
          button.textContent=button.classList.contains("machine-detail-delete")?"Makineyi Sil":"Sil";
        }
      },4000);
      return;
    }
    deleteMachineFromCatalog(button.dataset.deleteFactory,button.dataset.deleteLine,button.dataset.deleteDepartment,button.dataset.deleteMachine);
    s.machineModal=null;
    render();
  });
  const addPm=document.getElementById("addPlannedMaintenance");
  if(addPm)addPm.onclick=()=>{s.plannedSelectedDate=dateOnly(new Date());s.plannedEditId=null;s.plannedModal=true;render()};
  const calPrev=document.getElementById("calendarPrev");
  if(calPrev)calPrev.onclick=()=>{const d=new Date(s.calendarDate);d.setMonth(d.getMonth()-1);s.calendarDate=d.toISOString();render()};
  const calNext=document.getElementById("calendarNext");
  if(calNext)calNext.onclick=()=>{const d=new Date(s.calendarDate);d.setMonth(d.getMonth()+1);s.calendarDate=d.toISOString();render()};
  const calToday=document.getElementById("calendarToday");
  if(calToday)calToday.onclick=()=>{const d=new Date();s.calendarDate=new Date(d.getFullYear(),d.getMonth(),1).toISOString();render()};
  document.querySelectorAll("[data-calendar-date]").forEach(day=>day.ondblclick=()=>{
    if(!canCreatePlannedMaintenance())return;
    s.plannedSelectedDate=day.dataset.calendarDate;s.plannedEditId=null;s.plannedModal=true;render();
  });
  document.querySelectorAll("[data-pm-id]").forEach(x=>{
    x.onclick=e=>{
      if(e.target.closest(".pm-status"))return;
      s.plannedDetailId=x.dataset.pmId;render();
    };
    x.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();s.plannedDetailId=x.dataset.pmId;render()}};
  });
  document.querySelectorAll(".planned-detail-close").forEach(x=>x.onclick=()=>{s.plannedDetailId=null;render()});
  const pmDetailBg=document.querySelector(".planned-detail-bg");
  if(pmDetailBg)pmDetailBg.onclick=e=>{if(e.target===pmDetailBg){s.plannedDetailId=null;render()}};
  document.querySelectorAll("[data-pm-edit]").forEach(x=>x.onclick=()=>{
    const item=s.plannedMaintenances.find(y=>String(y.id)===String(x.dataset.pmEdit));
    if(!canEditPlannedMaintenance(item))return;
    s.plannedDetailId=null;s.plannedEditId=item.id;s.plannedModal=true;render();
  });
  document.querySelectorAll(".planned-close").forEach(x=>x.onclick=()=>{s.plannedModal=false;s.plannedEditId=null;render()});
  const pmBg=document.querySelector(".planned-modal-bg");
  if(pmBg)pmBg.onclick=e=>{if(e.target===pmBg){s.plannedModal=false;s.plannedEditId=null;render()}};
  const pmFactory=document.getElementById("pmFactory"),pmLine=document.getElementById("pmLine");
  const pmDepartment=document.getElementById("pmDepartment"),pmMachine=document.getElementById("pmMachine");
  if(pmFactory)pmFactory.onchange=()=>{
    const lines=catalogLines(pmFactory.value);
    pmLine.innerHTML=opts(lines,"Hat seçiniz",lines[0]||"");
    const departments=s.user?.role==="Bölüm Formeni"?[s.user.department]:catalogDepartments(pmFactory.value,pmLine.value);
    pmDepartment.innerHTML=opts(departments,"Bölüm seçiniz",s.user?.role==="Bölüm Formeni"?s.user.department:departments[0]||"");
    pmMachine.innerHTML=opts(catalogMachines(pmFactory.value,pmLine.value,pmDepartment.value),"Makine seçiniz","");
  };
  if(pmLine)pmLine.onchange=()=>{
    const departments=s.user?.role==="Bölüm Formeni"?[s.user.department]:catalogDepartments(pmFactory.value,pmLine.value);
    pmDepartment.innerHTML=opts(departments,"Bölüm seçiniz",s.user?.role==="Bölüm Formeni"?s.user.department:departments[0]||"");
    pmMachine.innerHTML=opts(catalogMachines(pmFactory.value,pmLine.value,pmDepartment.value),"Makine seçiniz","");
  };
  if(pmDepartment)pmDepartment.onchange=()=>{
    pmMachine.innerHTML=opts(catalogMachines(pmFactory.value,pmLine.value,pmDepartment.value),"Makine seçiniz","");
  };
  if(pmDepartment&&pmMachine){
    const initialSelected=pmMachine.dataset.selected||"";
    const initialMachines=[
      ...new Set([...catalogMachines(pmFactory.value,pmLine.value,pmDepartment.value),initialSelected].filter(Boolean))
    ];
    pmMachine.innerHTML=opts(initialMachines,"Makine seçiniz",initialSelected);
  }
  const pmForm=document.getElementById("plannedForm");
  if(pmForm)pmForm.onsubmit=e=>{
    e.preventDefault();
    const editing=s.plannedMaintenances.find(x=>String(x.id)===String(s.plannedEditId));
    if(editing&&!canEditPlannedMaintenance(editing)){alert("Bu planlı bakımı düzenleme yetkiniz yok.");return}
    if(!editing&&!canCreatePlannedMaintenance()){alert("Planlı bakım oluşturma yetkiniz yok.");return}
    const department=s.user?.role==="Bölüm Formeni"?s.user.department:pmDepartment.value;
    if(s.user?.role==="Bölüm Formeni"&&department!==s.user.department){alert("Yalnızca kendi bölümünüz için işlem yapabilirsiniz.");return}
    const title=(document.getElementById("pmTitle")?.value||"").trim();
    const factory=pmFactory?.value||"";
    const line=pmLine?.value||"";
    const machine=pmMachine?.value||"";
    const type=document.getElementById("pmType")?.value||"";
    const priority=document.getElementById("pmPriority")?.value||"";
    const date=document.getElementById("pmDate")?.value||"";
    const time=document.getElementById("pmTime")?.value||"";
    const duration=Number(document.getElementById("pmDuration")?.value);
    const assigned=(document.getElementById("pmAssigned")?.value||"").trim();
    if(!title||!factory||!line||!department||!machine||!type||!priority||!date||!time||!assigned){
      alert("Planlı bakımın zorunlu alanlarını eksiksiz doldurun.");
      return;
    }
    if(!userFactories().includes(factory)||!catalogLines(factory).includes(line)||!catalogDepartments(factory,line).includes(department)){
      alert("Yetki alanınız dışında veya geçersiz fabrika, hat ya da bölüm seçildi.");
      return;
    }
    const selectableMachines=catalogMachines(factory,line,department);
    if(!selectableMachines.includes(machine)&&String(editing?.machine||"")!==String(machine)){
      alert("Seçilen makine bu fabrika, hat ve bölümde bulunmuyor.");
      return;
    }
    if(!MAINTENANCE_TYPES.includes(type)||!MAINTENANCE_PRIORITIES.includes(priority)){
      alert("Geçersiz bakım türü veya öncelik seçildi.");
      return;
    }
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){
      alert("Geçerli bir tarih ve saat girin.");
      return;
    }
    if(!Number.isFinite(duration)||duration<15){
      alert("Tahmini süre en az 15 dakika olmalıdır.");
      return;
    }
    const ids=s.plannedMaintenances.map(x=>Number(x.id)||0);
    const values={
      title,
      factory,line,
      department,machine,
      type,
      priority,
      date,
      time,
      duration:Number(duration.toFixed(0)),
      assigned,
      description:document.getElementById("pmDescription").value.trim()
    };
    if(editing){
      Object.assign(editing,values,{updatedBy:s.user?.name||"",updatedAt:new Date().toISOString()});
    }else{
      s.plannedMaintenances.push({...values,id:(ids.length?Math.max(...ids):0)+1,status:"planned",createdBy:s.user?.name||"",createdAt:new Date().toISOString()});
    }
    savePlanned();s.plannedModal=false;s.plannedEditId=null;render();
  };
  document.querySelectorAll(".pm-status").forEach(x=>{
    x.onclick=e=>e.stopPropagation();
    x.onchange=()=>{
    const item=s.plannedMaintenances.find(y=>String(y.id)===String(x.dataset.id));
    if(item&&canEditPlannedMaintenance(item)){item.status=x.value;item.updatedBy=s.user?.name||"";item.updatedAt=new Date().toISOString();savePlanned();render()}
    };
  });

  document.querySelectorAll("[data-machine]").forEach(b=>b.onclick=()=>{s.machineModal={factory:b.dataset.mf,line:b.dataset.ml,machine:b.dataset.machine,department:b.dataset.md||findMachineDepartment(b.dataset.mf,b.dataset.ml,b.dataset.machine)};s.machineTab="overview";render()});
  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{s.machineTab=b.dataset.tab;render()});
  const mc=document.getElementById("modalClose");if(mc)mc.onclick=()=>{s.machineModal=null;render()};
  const mb=document.getElementById("modalCloseBg");if(mb)mb.onclick=e=>{if(e.target===mb){s.machineModal=null;render()}};

  const openQr=document.getElementById("openQrScanner");
  if(openQr)openQr.onclick=openQrScanner;
  const openQrCard=document.getElementById("openQrScannerCard");
  if(openQrCard)openQrCard.onclick=openQrScanner;
  document.querySelectorAll(".machine-qr-button").forEach(b=>b.onclick=()=>openQrGenerator(b.dataset.qrFactory,b.dataset.qrLine,b.dataset.qrMachine));
  document.querySelectorAll(".qr-close").forEach(b=>b.onclick=closeQrModal);
  document.querySelectorAll(".qr-backdrop").forEach(bg=>bg.onclick=e=>{if(e.target===bg)closeQrModal()});
  const applyManual=document.getElementById("applyQrManual");
  if(applyManual)applyManual.onclick=()=>applyQrPayload(document.getElementById("qrManualText").value.trim());
  const createFaultFromQr=document.getElementById("createFaultFromQr");
  if(createFaultFromQr)createFaultFromQr.onclick=openFaultFormFromQr;
  const printQr=document.getElementById("printQr");
  if(printQr)printQr.onclick=printMachineQr;
  const downloadQr=document.getElementById("downloadQr");
  if(downloadQr)downloadQr.onclick=downloadMachineQr;

}
function startEtiliSmart(){
  setInterval(updateClockAndDurations,1000);
  try{
    ensureFaultPersonnel();
    render();
  }catch(error){
  console.error(error);
  const app=document.getElementById("app");
  if(app)app.innerHTML=`<div style="max-width:720px;margin:60px auto;padding:24px;font-family:Arial,sans-serif;background:#fff;border:1px solid #ddd;border-radius:16px">
    <h2 style="margin-top:0">ETİLİSMART açılırken bir hata oluştu</h2>
    <p>Tarayıcıdaki eski kayıtları temizleyip sayfayı yenileyin.</p>
    <button id="resetEtiliSmart" style="border:0;border-radius:10px;padding:11px 16px;background:#f2b21a;font-weight:700">Kayıtları Temizle ve Yenile</button>
    <pre style="white-space:pre-wrap;color:#a00">${esc(error.message||error)}</pre>
  </div>`;
  const resetButton=document.getElementById("resetEtiliSmart");
  if(resetButton){
    resetButton.addEventListener("click",function(){
      storageRemove(localStorage,K);
      storageRemove(sessionStorage,"eslogin");
      storageRemove(sessionStorage,"esuser");
      location.reload();
    });
  }
  }
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",startEtiliSmart);
}else{
  startEtiliSmart();
}
