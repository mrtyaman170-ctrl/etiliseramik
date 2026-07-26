function updateClockAndDurations(){
  const x=liveDateTime(),d=document.getElementById("liveDate"),t=document.getElementById("liveTime"),v=document.getElementById("liveShift");
  if(d)d.textContent=x.date;if(t)t.textContent=x.time;if(v)v.textContent=x.shift.name;
  document.querySelectorAll(".duration").forEach(el=>{const f=s.faults.find(x=>x.id==el.dataset.id);if(f)el.textContent=durationText(f)});
}
function render(){window.__etiliStarted=true;document.getElementById("app").innerHTML=s.login?app():login();bind();updateClockAndDurations()}
function bind(){
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
    s.workTab=item.kind==="request"?"requests":"orders";
    s.workDetailId=String(item.id);
    render();
  });

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
    if(e.target.closest("select,button,input,a,label"))return;
    s.faultModalId=Number(row.dataset.faultDetailId);
    render();
  });

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
    const participants=[...document.querySelectorAll(".maintenance-log-person:checked")].map(x=>x.value);
    if(!participants.length){alert("İşe dahil olan en az bir personel seçiniz.");return}
    const title=document.getElementById("maintenanceLogTitle").value.trim();
    const description=document.getElementById("maintenanceLogDescription").value.trim();
    if(!title||!description)return;
    s.maintenanceLogs.push({id:`MW-${Date.now()}`,factory:document.getElementById("maintenanceLogFactory").value,title,location:document.getElementById("maintenanceLogLocation").value.trim(),description,participants,performedAt:`${document.getElementById("maintenanceLogDate").value}T12:00:00`,createdBy:s.user?.name||"Bilinmeyen Kullanıcı",createdAt:new Date().toISOString()});
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
    const photo=form.querySelector(".contractor-photo")?.files?.[0];

    if(!company||!reportNo||!result){
      alert("Taşeron firma, rapor numarası ve kontrol sonucunu giriniz.");
      return;
    }
    if(!photo&&!existing?.photoStored){
      alert("Taşeron kontrol fotoğrafı veya rapor fotoğrafı zorunludur.");
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
        checkedBy:s.user?.name||"Bilinmeyen Kullanıcı",
        checkedAt:new Date().toISOString(),
        photoStored:!!photo||!!existing?.photoStored
      };
      saveContractorChecks();
      render();
    }catch(error){
      console.error(error);
      alert("Taşeron kontrol kaydı kaydedilemedi.");
      if(submit){submit.disabled=false;submit.textContent=existing?"Kaydı Güncelle":"Aylık Kontrolü Kaydet"}
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

  const printUtilityOutput=document.getElementById("printUtilityOutput");
  if(printUtilityOutput)printUtilityOutput.onclick=()=>{
    const factory=s.dailyControlFactory;
    const date=s.dailyControlDate;
    const waterAsset=dailyAssetsForFactory(factory).find(asset=>asset.type==="water");
    const gasAsset=dailyAssetsForFactory(factory).find(asset=>asset.type==="gas");
    const waterRecord=waterAsset?dailyCheckRecord(date,factory,waterAsset.id):null;
    const gasRecord=gasAsset?dailyCheckRecord(date,factory,gasAsset.id):null;
    const waterUse=waterAsset?utilityConsumption(waterAsset,date,waterRecord):null;
    const gasUse=gasAsset?utilityConsumption(gasAsset,date,gasRecord):null;
    const popup=window.open("","_blank","width=900,height=700");
    if(!popup){
      alert("Yazdırma penceresi engellendi. Açılır pencereye izin verin.");
      return;
    }
    popup.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Su ve Gaz Tüketim Çıktısı</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#263746}h1{font-size:22px}p{color:#66737e}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccd5dc;padding:12px;text-align:left}th{background:#edf3f7}.meta{display:flex;gap:30px;margin:15px 0}.footer{margin-top:50px;display:flex;justify-content:space-between}.sign{width:220px;border-top:1px solid #333;padding-top:8px;text-align:center}@media print{button{display:none}}</style>
      </head><body>
      <h1>ETİLİSMART – Günlük Su ve Gaz Tüketim Çıktısı</h1>
      <div class="meta"><b>Fabrika: ${esc(factory)}</b><b>Tarih: ${esc(date)}</b></div>
      <table><thead><tr><th>Değer</th><th>Güncel Sayaç</th><th>Günlük Tüketim</th></tr></thead><tbody>
      <tr><td>İşletmeye Gelen Su</td><td>${waterRecord?.readings?.incoming??"-"} m³</td><td>${waterUse?.incoming??"-"} m³</td></tr>
      <tr><td>A Blok Kullanılan Su</td><td>${waterRecord?.readings?.aBlock??"-"} m³</td><td>${waterUse?.aBlock??"-"} m³</td></tr>
      <tr><td>B Blok Kullanılan Su</td><td>${waterRecord?.readings?.bBlock??"-"} m³</td><td>${waterUse?.bBlock??"-"} m³</td></tr>
      <tr><td>İşletmeye Gelen Gaz</td><td>${gasRecord?.readings?.incoming??"-"} m³</td><td>${gasUse?.incoming??"-"} m³</td></tr>
      </tbody></table>
      <p>Günlük tüketim, seçilen günün kümülatif sayaç değeri ile önceki günün kümülatif sayaç değeri arasındaki farktır.</p>
      <div class="footer"><div class="sign">Kontrol Eden</div><div class="sign">Bakım Formeni</div></div>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };


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

      if(!title||!description||!location){
        alert("Başlık, yer ve açıklama alanları boş bırakılamaz.");
        return;
      }

      item.factory=document.getElementById("workDetailFactory")?.value||item.factory;
      item.department=(document.getElementById("workDetailDepartment")?.value||"").trim();
      item.location=location;
      item.category=document.getElementById("workDetailCategory")?.value||item.category;
      item.title=title;
      item.priority=document.getElementById("workDetailPriority")?.value||item.priority;
      item.description=description;
      item.assignedTeam=document.getElementById("workDetailTeam")?.value||item.assignedTeam;

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
      item.workDescription=(document.getElementById("workDetailResult")?.value||"").trim();
      item.status=nextStatus;

      if(nextStatus==="done"){
        item.completedAt=item.completedAt||new Date().toISOString();
        item.completedBy=s.user?.name||"Bilinmeyen Kullanıcı";
        const source=s.workItems.find(x=>x.id===item.sourceRequestId);
        if(source){
          source.status="done";
          source.completedAt=item.completedAt;
        }
      }else{
        item.completedAt=null;
        item.completedBy="";
        const source=s.workItems.find(x=>x.id===item.sourceRequestId);
        if(source&&source.status==="done")source.status="converted";
      }
    }

    item.updatedBy=s.user?.name||"Bilinmeyen Kullanıcı";
    item.updatedAt=new Date().toISOString();
    saveWorkItems();
    alert(`${isRequest?"İş talebi":"İş emri"} güncellendi.`);
    render();
  };

  const deleteWorkDetail=document.getElementById("deleteWorkDetail");
  if(deleteWorkDetail)deleteWorkDetail.onclick=()=>{
    const item=findWorkItemById(s.workDetailId);
    if(!item)return;

    if(deleteWorkDetail.dataset.confirmDelete!=="yes"){
      deleteWorkDetail.dataset.confirmDelete="yes";
      deleteWorkDetail.textContent=`Tekrar Tıkla: ${item.kind==="request"?"Talebi":"İş Emrini"} Sil`;
      setTimeout(()=>{
        if(document.body.contains(deleteWorkDetail)){
          deleteWorkDetail.dataset.confirmDelete="";
          deleteWorkDetail.textContent=item.kind==="request"?"Talebi Sil":"İş Emrini Sil";
        }
      },5000);
      return;
    }

    const result=deleteWorkItemById(item.id);
    if(!result.ok){
      alert(result.message);
      deleteWorkDetail.dataset.confirmDelete="";
      deleteWorkDetail.textContent=item.kind==="request"?"Talebi Sil":"İş Emrini Sil";
      return;
    }

    s.workDetailId=null;
    s.workTab=item.kind==="request"?"requests":"orders";
    alert(`${item.id} numaralı ${item.kind==="request"?"iş talebi":"iş emri"} silindi.`);
    render();
  };

  document.querySelectorAll("[data-work-tab]").forEach(btn=>btn.onclick=()=>{s.workTab=btn.dataset.workTab;render()});
  document.querySelectorAll("[data-open-work-create]").forEach(btn=>btn.onclick=()=>{s.workCreateMode=btn.dataset.openWorkCreate;render()});
  const closeWorkCreate=document.getElementById("closeWorkCreate");
  if(closeWorkCreate)closeWorkCreate.onclick=()=>{s.workCreateMode="";render()};

  const workRequestForm=document.getElementById("workRequestForm");
  if(workRequestForm)workRequestForm.onsubmit=e=>{
    e.preventDefault();
    if(!permissions().createRequest)return;
    const category=document.getElementById("wrCategory").value;
    s.workItems.push({id:nextWorkId("request"),kind:"request",factory:document.getElementById("wrFactory").value,department:s.user?.department||document.getElementById("wrDepartment").value,location:document.getElementById("wrLocation").value.trim(),title:document.getElementById("wrTitle").value.trim(),category,priority:document.getElementById("wrPriority").value,description:document.getElementById("wrDescription").value.trim(),requestedDate:document.getElementById("wrRequestedDate").value,status:"new",createdBy:s.user?.name||"Bilinmeyen Kullanıcı",createdAt:new Date().toISOString(),assignedTeam:workTeamForCategory(category),assignedTo:"",sourceRequestId:"",workDescription:"",completedAt:null,usedMaterials:[]});
    saveWorkItems();s.workCreateMode="";s.workTab="requests";render();
  };

  const woFactory=document.getElementById("woFactory"),woTeam=document.getElementById("woTeam"),woAssigned=document.getElementById("woAssigned");
  const refreshWoPeople=()=>{if(!woAssigned)return;const people=workMaintenanceOptions(woFactory.value,woTeam.value);woAssigned.innerHTML='<option value="">Personel seçiniz</option>'+people.map(p=>`<option>${esc(p)}</option>`).join("")};
  if(woFactory)woFactory.onchange=refreshWoPeople;if(woTeam)woTeam.onchange=refreshWoPeople;if(woAssigned)refreshWoPeople();
  const directWorkOrderForm=document.getElementById("directWorkOrderForm");
  if(directWorkOrderForm)directWorkOrderForm.onsubmit=e=>{
    e.preventDefault();if(!permissions().createDirectWorkOrder)return;
    const assignedTo=woAssigned.value;
    s.workItems.push({id:nextWorkId("workorder"),kind:"workorder",factory:woFactory.value,department:document.getElementById("woDepartment").value,location:document.getElementById("woLocation").value.trim(),title:document.getElementById("woTitle").value.trim(),category:document.getElementById("woCategory").value,priority:document.getElementById("woPriority").value,description:document.getElementById("woDescription").value.trim(),requestedDate:"",planStart:document.getElementById("woStart").value,planEnd:document.getElementById("woEnd").value,status:assignedTo?"assigned":"open",createdBy:s.user?.name||"Bilinmeyen Kullanıcı",createdAt:new Date().toISOString(),assignedTeam:woTeam.value,assignedTo,sourceRequestId:"",workDescription:"",completedAt:null,usedMaterials:[]});
    saveWorkItems();s.workCreateMode="";s.workTab="orders";render();
  };

  document.querySelectorAll("[data-work-request-action]").forEach(btn=>btn.onclick=()=>{
    const item=findWorkItemById(btn.dataset.workId);if(!item)return;
    const action=btn.dataset.workRequestAction;
    const actor=s.user?.name||"Bilinmeyen Kullanıcı";
    const at=new Date().toISOString();
    if(action==="cancelled"&&permissions().createRequest&&item.createdBy===s.user?.name){item.status="cancelled";item.cancelledBy=actor;item.cancelledAt=at;saveWorkItems();render();return}
    if(!canManageWorkRequest(item))return;
    if(action==="convert"){
      const team=item.assignedTeam||workTeamForCategory(item.category);const people=workMaintenanceOptions(item.factory,team);const assignedTo=people[0]||"";
      s.workItems.push({id:nextWorkId("workorder"),kind:"workorder",factory:item.factory,department:item.department,location:item.location,title:item.title,category:item.category,priority:item.priority,description:item.description,requestedDate:item.requestedDate||"",planStart:dateOnly(new Date()),planEnd:item.requestedDate||dateOnly(new Date(Date.now()+3*86400000)),status:assignedTo?"assigned":"open",createdBy:actor,createdAt:at,assignedTeam:team,assignedTo,sourceRequestId:item.id,workDescription:"",completedAt:null,usedMaterials:[]});
      item.status="converted";item.convertedBy=actor;item.convertedAt=at;if(!item.approvedBy){item.approvedBy=actor;item.approvedAt=at}s.workTab="orders";
    }else{
      item.status=action;
      if(action==="reviewing"){item.reviewedBy=actor;item.reviewedAt=at}
      if(action==="approved"){item.approvedBy=actor;item.approvedAt=at;item.rejectedBy="";item.rejectedAt=null}
      if(action==="rejected"){item.rejectedBy=actor;item.rejectedAt=at;item.approvedBy="";item.approvedAt=null}
    }
    saveWorkItems();render();
  });

  document.querySelectorAll(".work-assignee").forEach(sel=>sel.onchange=()=>{const item=s.workItems.find(x=>x.id===sel.dataset.workId);if(item&&canManageWorkRequest(item)){item.assignedTo=sel.value;if(sel.value&&item.status==="open")item.status="assigned";saveWorkItems();render()}});
  document.querySelectorAll(".work-order-status").forEach(sel=>sel.onchange=()=>{const item=s.workItems.find(x=>x.id===sel.dataset.workId);if(item&&canUpdateWorkOrder(item)){item.status=sel.value;item.completedAt=sel.value==="done"?new Date().toISOString():null;const source=s.workItems.find(x=>x.id===item.sourceRequestId);if(source&&sel.value==="done")source.status="done";saveWorkItems();render()}});
  document.querySelectorAll(".save-work-result").forEach(btn=>btn.onclick=()=>{const item=findWorkItemById(btn.dataset.workId);if(!item||!canUpdateWorkOrder(item))return;const ta=document.querySelector(`.work-result-text[data-work-id="${CSS.escape(item.id)}"]`);item.workDescription=(ta?.value||"").trim();saveWorkItems();render()});
  document.querySelectorAll(".work-material-form").forEach(form=>form.onsubmit=e=>{e.preventDefault();const item=findWorkItemById(form.dataset.workId);if(!item||!canUpdateWorkOrder(item))return;const materialId=form.querySelector(".work-material-id").value;const qty=Number(form.querySelector(".work-material-qty").value);const material=materialById(materialId);if(!material||qty<=0)return;if(!Array.isArray(item.usedMaterials))item.usedMaterials=[];item.usedMaterials.push({materialId,quantity:qty,unit:material.unit,name:material.name,addedBy:s.user?.name||"",addedAt:new Date().toISOString()});saveWorkItems();render()});
  document.querySelectorAll("[data-remove-work-material]").forEach(btn=>btn.onclick=()=>{const item=s.workItems.find(x=>x.id===btn.dataset.removeWorkMaterial);if(!item||!canUpdateWorkOrder(item))return;item.usedMaterials.splice(Number(btn.dataset.index),1);saveWorkItems();render()});

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

    if(!code||!name||!category||!unit){
      alert("Malzeme kodu, malzeme adı, kategori ve birim alanlarını doldurun.");
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
      custom:true,
      createdBy:s.user?.name||"Bilinmeyen Kullanıcı",
      createdAt:new Date().toISOString()
    });
    saveMaterials();
    alert(`"${name}" malzeme kataloğuna eklendi.`);
    render();
  };

  document.querySelectorAll("[data-material-edit]").forEach(btn=>btn.onclick=()=>{s.materialEditId=btn.dataset.materialEdit;render()});
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
    const duplicate=MATERIALS.find(x=>x.id!==id&&String(x.code).toLocaleUpperCase("tr-TR")===code);
    if(duplicate){alert(`Bu malzeme kodu zaten kullanılıyor: ${duplicate.name}`);return}
    Object.assign(material,{code,name,category:document.getElementById("materialEditCategory").value,unit:document.getElementById("materialEditUnit").value,stock:Number(document.getElementById("materialEditStock").value||0),minStock:Number(document.getElementById("materialEditMinStock").value||0),description:document.getElementById("materialEditDescription").value.trim(),updatedBy:s.user?.name||"",updatedAt:new Date().toISOString()});
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
  document.querySelectorAll("[data-material-delete]").forEach(btn=>btn.onclick=()=>deleteMaterialByButton(btn));
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
    const materialId=document.getElementById("faultMaterialId").value;
    const quantity=Number(document.getElementById("faultMaterialQuantity").value);
    const note=document.getElementById("faultMaterialNote").value.trim();
    const material=materialById(materialId);
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
    if(!fault||!permissions().editStatus)return;
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
    ensureNotificationBaseline();
    render();
  };
  const out=document.getElementById("out");if(out)out.onclick=()=>{storageClear(sessionStorage);s.login=false;s.user=null;s.page="dashboard";render()};
  const df=document.getElementById("dashboardFactory");if(df)df.onchange=()=>{s.dashboardFactory=df.value;render()};
  document.querySelectorAll("[data-dashboard-fault-tab]").forEach(button=>button.onclick=()=>{
    s.dashboardFaultTab=button.dataset.dashboardFaultTab;
    render();
  });

  const prevShiftWeek=document.getElementById("prevShiftWeek");
  const nextShiftWeek=document.getElementById("nextShiftWeek");
  if(prevShiftWeek)prevShiftWeek.onclick=()=>{s.shiftWeekOffset--;render()};
  if(nextShiftWeek)nextShiftWeek.onclick=()=>{s.shiftWeekOffset++;render()};

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
    if(APP_USERS[newId]&&newId!==original){alert("Bu kullanıcı ID zaten kullanılıyor.");return}
    const factories=factory==="1. Fabrika"?["1. Fabrika"]:["2. Fabrika A Blok","2. Fabrika B Blok"];
    const candidate={password,name,role:"Bakım Personeli",factories,department:"",team};
    if(!canManagePersonnelAccount(candidate)){alert("Yalnızca kendi fabrikanızdaki ve ekibinizdeki bakım personellerini yönetebilirsiniz.");return}
    if(original&&original!==newId)delete APP_USERS[original];
    APP_USERS[newId]=candidate;
    saveAppUsers();
    render();
    alert(`${name} personel hesabı kaydedildi.`);
  };

  const shiftSearch=document.getElementById("shiftSearch");

  if(shiftFactory)shiftFactory.onchange=()=>{s.shiftFactory=shiftFactory.value;render()};
  if(shiftTeam)shiftTeam.onchange=()=>{s.shiftTeam=shiftTeam.value;render()};
  if(shiftSearch)shiftSearch.oninput=()=>{s.shiftSearch=shiftSearch.value;render()};
  document.querySelectorAll(".shift-assignment-select").forEach(el=>el.onchange=()=>{
    if(!canManageShiftTeam(s.shiftTeam)){render();return}
    const personId=el.dataset.shiftPersonId;
    const dayIndex=Number(el.dataset.shiftDay);
    setShiftOverride(s.shiftFactory,s.shiftTeam,s.shiftWeekOffset,personId,dayIndex,el.value);
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
    if(roleIsDepartmentLimited()&&s.user?.department&&depEl.value!==s.user.department){
      alert("Yalnızca kendi bölümünüz için arıza kaydı açabilirsiniz.");
      return;
    }
    const now=new Date().toISOString();
    const fault={id:Math.max(...s.faults.map(x=>x.id))+1,factory:factoryEl.value,line:lineEl.value,department:depEl.value,machine:machineEl.value,type:document.getElementById("type").value,subject:document.getElementById("subject").value,description:document.getElementById("desc").value,stopped:document.getElementById("stopped").checked,photoName:document.getElementById("photo").files[0]?.name||"",status:"open",openedBy:s.user?.name||"Bilinmeyen Kullanıcı",assignedTo:"",assignmentState:"pending",claimedBy:"",claimedAt:null,assignmentHistory:[],participants:[],solutionText:"",solutionBy:"",solutionAt:null,createdAt:now,closedAt:null};
    const activePeople=activeMaintenanceForFault(fault);
    fault.assignedTo=deterministicPerson(activePeople,fault.id,31)||"Atama Bekliyor";
    fault.assignmentHistory.push({action:"assigned",from:"",to:fault.assignedTo,by:"Sistem",at:now,shift:currentShiftLabel()});
    s.faults.push(fault);
    save();s.page="faults";render();
    alert(fault.assignedTo==="Atama Bekliyor"?"Arıza kaydı oluşturuldu. Aktif vardiyada uygun bakım personeli bulunamadığı için atama bekliyor.":`Arıza kaydı ${fault.assignedTo} personeline atandı. Müdahalenin başlaması için personelin arızayı üstlenmesi gerekiyor.`);
  };
  document.querySelectorAll(".status-sel").forEach(x=>x.onchange=()=>{
    const fault=s.faults.find(y=>y.id==x.dataset.id);
    if(!fault||!canUpdateFaultStatus(fault))return;
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
    if(fault&&canRedirectFault(fault)){
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
    const initialMachines=catalogMachines(pmFactory.value,pmLine.value,pmDepartment.value);
    pmMachine.innerHTML=opts(initialMachines,"Makine seçiniz","");
  }
  const pmForm=document.getElementById("plannedForm");
  if(pmForm)pmForm.onsubmit=e=>{
    e.preventDefault();
    const editing=s.plannedMaintenances.find(x=>String(x.id)===String(s.plannedEditId));
    if(editing&&!canEditPlannedMaintenance(editing)){alert("Bu planlı bakımı düzenleme yetkiniz yok.");return}
    if(!editing&&!canCreatePlannedMaintenance()){alert("Planlı bakım oluşturma yetkiniz yok.");return}
    const department=s.user?.role==="Bölüm Formeni"?s.user.department:pmDepartment.value;
    if(s.user?.role==="Bölüm Formeni"&&department!==s.user.department){alert("Yalnızca kendi bölümünüz için işlem yapabilirsiniz.");return}
    const ids=s.plannedMaintenances.map(x=>Number(x.id)||0);
    const values={
      title:document.getElementById("pmTitle").value.trim(),
      factory:pmFactory.value,line:pmLine.value,
      department,machine:pmMachine.value,
      type:document.getElementById("pmType").value,
      priority:document.getElementById("pmPriority").value,
      date:document.getElementById("pmDate").value,
      time:document.getElementById("pmTime").value,
      duration:Number(document.getElementById("pmDuration").value)||60,
      assigned:document.getElementById("pmAssigned").value.trim(),
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
    <pre style="white-space:pre-wrap;color:#a00">${String(error.message||error)}</pre>
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
