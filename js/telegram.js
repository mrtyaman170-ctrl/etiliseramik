/* Telegram kişisel bildirim entegrasyonu */
const TELEGRAM_WORKER_URL_KEY="etilismart_telegram_worker_url_v1";
const TELEGRAM_REQUEST_TIMEOUT_MS=10000;
const TELEGRAM_PAGE_STATE={health:null,linked:{}};

function etilismartVersion(){
  return String(window.ETILISMART_CONFIG?.version||"1.5.0");
}
function telegramConfig(){
  return window.ETILISMART_CONFIG?.telegram||{};
}
function telegramBotUsername(){
  return normalizeTelegramUsername(telegramConfig().botUsername||"EtiliSmartBakimBot")||"EtiliSmartBakimBot";
}
function normalizeTelegramUsername(value){
  return String(value||"").trim().replace(/^@+/,"").toLocaleLowerCase("en-US");
}
function validTelegramUsername(value){
  const username=normalizeTelegramUsername(value);
  return !username||/^[a-z0-9_]{5,32}$/.test(username);
}
function normalizeWorkerUrl(value){
  const raw=String(value||"").trim().replace(/\/+$/,"");
  if(!raw)return "";
  try{
    const parsed=new URL(raw);
    if(parsed.protocol!=="https:"&&!["localhost","127.0.0.1"].includes(parsed.hostname))return "";
    return parsed.origin+parsed.pathname.replace(/\/+$/,"");
  }catch(error){
    return "";
  }
}
function telegramWorkerUrl(){
  const local=storageGet(localStorage,TELEGRAM_WORKER_URL_KEY,"");
  return normalizeWorkerUrl(local)||normalizeWorkerUrl(telegramConfig().workerUrl||"");
}
function saveTelegramWorkerUrl(value){
  const normalized=normalizeWorkerUrl(value);
  if(value&&!normalized)return {ok:false,message:"Geçerli bir HTTPS Worker adresi girin."};
  if(normalized)storageSet(localStorage,TELEGRAM_WORKER_URL_KEY,normalized);
  else storageRemove(localStorage,TELEGRAM_WORKER_URL_KEY);
  return {ok:true,url:normalized};
}
function telegramAppUrl(){
  const configured=String(telegramConfig().appUrl||"").trim();
  if(configured)return configured;
  if(location.protocol==="http:"||location.protocol==="https:")return `${location.origin}${location.pathname}`;
  return "";
}
function telegramUsernameForAccount(account){
  return normalizeTelegramUsername(account?.telegramUsername||"");
}
function telegramRecipientAccountsForFault(fault,date=new Date()){
  const team=maintenanceDisciplineForFault(fault);
  const factory=shiftFactoryName(fault.factory);
  const recipients=activeTeamMembers(factory,team,date)
    .filter(person=>APP_USERS[String(person.id)]?.role==="Bakım Personeli")
    .map(person=>{
    const account=APP_USERS[String(person.id)]||{};
    return {
      appUserId:String(person.id),
      name:account.name||person.name,
      username:telegramUsernameForAccount(account),
      team:account.team||team
    };
  });
  return [...new Map(recipients.map(person=>[person.username||`id:${person.appUserId}`,person])).values()];
}
function telegramDeliveryLabel(delivery){
  const status=delivery?.status||"not-sent";
  if(status==="queued")return "Gönderim bekleniyor";
  if(status==="sent")return `Gönderildi · ${Number(delivery.sent)||0} kişi`;
  if(status==="partial")return `Kısmi gönderildi · ${Number(delivery.sent)||0} kişi`;
  if(status==="failed")return "Gönderilemedi";
  if(status==="no-recipient")return "Telegram hesabı tanımlı aktif personel yok";
  if(status==="not-configured")return "Worker adresi tanımlanmadı";
  return "Bildirim oluşturulmadı";
}
function telegramDeliveryClass(delivery){
  const status=delivery?.status||"not-sent";
  if(status==="sent")return "success";
  if(status==="queued"||status==="partial")return "warning";
  if(status==="failed")return "danger";
  return "neutral";
}
function telegramFaultDeliveryCard(fault){
  const delivery=fault?.telegramDelivery||null;
  const recipients=Array.isArray(delivery?.recipientNames)?delivery.recipientNames:[];
  const missing=Array.isArray(delivery?.missingNames)?delivery.missingNames:[];
  const detail=delivery?.message
    ?`<p>${esc(delivery.message)}</p>`
    :recipients.length
      ?`<p>Hedef: ${recipients.map(esc).join(" · ")}</p>`
      :"<p>Bu kayıt için henüz Telegram gönderimi yapılmadı.</p>";
  return `<section class="fault-detail-card wide telegram-delivery-card ${telegramDeliveryClass(delivery)}" data-telegram-delivery-fault="${esc(fault?.id||"")}">
    <div><span>TELEGRAM BİLDİRİMİ</span><strong>${esc(telegramDeliveryLabel(delivery))}</strong></div>
    ${detail}
    ${missing.length?`<small>Telegram kullanıcı adı eksik: ${missing.map(esc).join(" · ")}</small>`:""}
  </section>`;
}
async function telegramPost(path,payload){
  const workerUrl=telegramWorkerUrl();
  if(!workerUrl)throw new Error("Telegram Worker adresi tanımlı değil.");
  if(typeof fetch!=="function")throw new Error("Bu tarayıcı bildirim bağlantısını desteklemiyor.");
  const controller=typeof AbortController==="function"?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),TELEGRAM_REQUEST_TIMEOUT_MS):null;
  try{
    const response=await fetch(`${workerUrl}${path}`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),
      signal:controller?.signal
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||`Worker yanıtı: ${response.status}`);
    return body;
  }finally{
    if(timer)clearTimeout(timer);
  }
}
function updateTelegramDeliveryDom(fault){
  const card=document.querySelector(`[data-telegram-delivery-fault="${String(fault?.id||"")}"]`);
  if(!card)return;
  const wrapper=document.createElement("div");
  wrapper.innerHTML=telegramFaultDeliveryCard(fault);
  const next=wrapper.firstElementChild;
  if(next)card.replaceWith(next);
}
async function sendFaultTelegramNotification(fault){
  const activeRecipients=telegramRecipientAccountsForFault(fault);
  const configuredRecipients=activeRecipients.filter(person=>person.username);
  const missingNames=activeRecipients.filter(person=>!person.username).map(person=>person.name);
  const workerUrl=telegramWorkerUrl();
  const baseDelivery={
    attemptedAt:new Date().toISOString(),
    recipientNames:activeRecipients.map(person=>person.name),
    missingNames,
    sent:0,
    failed:0
  };

  if(!workerUrl){
    fault.telegramDelivery={...baseDelivery,status:"not-configured",message:"Arıza kaydedildi; Telegram Worker adresi tanımlanmadığı için telefon bildirimi gönderilmedi."};
    save();
    return fault.telegramDelivery;
  }
  if(!configuredRecipients.length){
    fault.telegramDelivery={...baseDelivery,status:"no-recipient",message:"Aktif vardiyada Telegram kullanıcı adı tanımlanmış uygun bakım personeli bulunamadı."};
    save();
    return fault.telegramDelivery;
  }

  fault.telegramDelivery={...baseDelivery,status:"queued",message:"Bildirim aktif vardiyadaki ilgili bakım ekibine gönderiliyor."};
  save();
  try{
    const response=await telegramPost("/api/notify",{
      event:"fault.created",
      eventId:`fault-${fault.id}-${fault.createdAt}`,
      appUrl:telegramAppUrl(),
      recipients:configuredRecipients,
      fault:{
        id:String(fault.id),
        factory:String(fault.factory||""),
        line:String(fault.line||""),
        department:String(fault.department||""),
        machine:String(fault.machine||""),
        type:String(fault.type||""),
        subject:String(fault.subject||""),
        description:String(fault.description||""),
        stopped:!!fault.stopped,
        openedBy:String(fault.openedBy||""),
        assignedTo:String(fault.assignedTo||"Atama Bekliyor"),
        shift:String(currentShiftLabel()),
        createdAt:String(fault.createdAt||new Date().toISOString())
      }
    });
    const sent=Number(response.sent)||0;
    const failed=Number(response.failed)||0;
    const unlinked=Array.isArray(response.unlinked)?response.unlinked:[];
    const hasMissing=missingNames.length||unlinked.length||failed;
    fault.telegramDelivery={
      ...baseDelivery,
      status:sent>0?(hasMissing?"partial":"sent"):"failed",
      sent,
      failed,
      unlinked,
      completedAt:new Date().toISOString(),
      message:sent>0
        ?`${sent} aktif vardiya personeline kişisel Telegram bildirimi gönderildi.`
        :"Telegram'a bağlı aktif vardiya personeli bulunamadığı için bildirim teslim edilemedi."
    };
  }catch(error){
    fault.telegramDelivery={
      ...baseDelivery,
      status:"failed",
      completedAt:new Date().toISOString(),
      message:String(error?.name==="AbortError"?"Telegram servisi zaman aşımına uğradı.":error?.message||"Telegram bildirimi gönderilemedi.")
    };
  }
  save();
  updateTelegramDeliveryDom(fault);
  return fault.telegramDelivery;
}
function canManageTelegramSettings(){
  return ["Yazılımcı","Bakım Müdürü"].includes(s.user?.role);
}
function telegramAdminAccounts(){
  const currentId=String(s.user?.id||"");
  const maintenance=allMaintenanceAccounts().map(person=>[String(person.id),APP_USERS[String(person.id)]||person]);
  const current=APP_USERS[currentId]&&telegramUsernameForAccount(APP_USERS[currentId])
    ?[[currentId,APP_USERS[currentId]]]
    :[];
  return [...new Map([...current,...maintenance].map(entry=>[entry[0],entry])).values()]
    .sort((a,b)=>String(a[1].name).localeCompare(String(b[1].name),"tr"));
}
function telegramActiveIdsNow(){
  const ids=new Set();
  for(const factory of ["1. Fabrika","2. Fabrika"]){
    for(const team of ["Elektrik Bakım","Mekanik Bakım"]){
      activeTeamMembers(factory,team).forEach(person=>ids.add(String(person.id)));
    }
  }
  return ids;
}
function telegramAdminPage(){
  if(!canManageTelegramSettings())return `<div class="card empty-panel"><h3>Yetkisiz işlem</h3><p>Telegram ayarlarını yalnızca Bakım Müdürü ve Yazılımcı yönetebilir.</p></div>`;
  const workerUrl=telegramWorkerUrl();
  const botUsername=telegramBotUsername();
  const accounts=telegramAdminAccounts();
  const activeIds=telegramActiveIdsNow();
  const configuredCount=accounts.filter(([,account])=>telegramUsernameForAccount(account)).length;
  const activeConfigured=accounts.filter(([id,account])=>activeIds.has(id)&&telegramUsernameForAccount(account)).length;
  return `${clockBlock()}
  <section class="desktop-page-title telegram-page-title">
    <div><span>TELEFON BİLDİRİMLERİ</span><h1>Telegram Bildirim Yönetimi</h1><p>Arıza mesajları yalnızca ilgili ekibin aktif vardiyadaki personellerine kişisel olarak gönderilir.</p></div>
    <a class="primary telegram-open-bot" href="https://t.me/${esc(botUsername)}?start=etilismart" target="_blank" rel="noopener">Telegram Botunu Aç</a>
  </section>
  <section class="telegram-kpi-grid">
    <article><small>ENTEGRASYON</small><b>${workerUrl?"Yapılandırıldı":"Kurulum Bekliyor"}</b><span>v${esc(etilismartVersion())}</span></article>
    <article><small>KULLANICI ADI TANIMLI</small><b>${configuredCount}</b><span>${accounts.length} uygun hesap</span></article>
    <article><small>ŞU AN AKTİF VE TANIMLI</small><b>${activeConfigured}</b><span>kişisel bildirim hedefi</span></article>
  </section>
  <section class="telegram-settings-grid">
    <article class="telegram-panel">
      <div class="section-modern-head"><div><h2>Worker Bağlantısı</h2><p>Bot tokenı burada tutulmaz. Yalnızca güvenli servis adresi kaydedilir.</p></div></div>
      <form id="telegramConfigForm">
        <div class="field wide"><label>Cloudflare Worker HTTPS Adresi</label><input id="telegramWorkerUrl" type="url" value="${esc(workerUrl)}" placeholder="https://etilismart-telegram....workers.dev"></div>
        <div class="telegram-form-actions"><button type="submit" class="primary">Bu Tarayıcıda Kaydet</button><button type="button" class="secondary" id="telegramHealthCheck">Bağlantıyı Kontrol Et</button></div>
      </form>
      <div class="telegram-ui-message" id="telegramUiMessage">Worker kurulduktan sonra adresi girip bağlantıyı kontrol edin.</div>
      <small class="telegram-scope-note">Kalıcı ve tüm cihazlarda ortak kullanım için aynı adresi <b>js/config.js</b> dosyasına ekleyip siteyi yeniden yayınlayın.</small>
    </article>
    <article class="telegram-panel">
      <div class="section-modern-head"><div><h2>Test Bildirimi</h2><p>Seçilen Telegram hesabına deneme mesajı gönderin.</p></div></div>
      <div class="field wide"><label>Test Alıcısı</label><select id="telegramTestRecipient"><option value="">Kullanıcı seçiniz</option>${accounts.filter(([,account])=>telegramUsernameForAccount(account)).map(([id,account])=>`<option value="${esc(id)}">${esc(account.name)} · @${esc(telegramUsernameForAccount(account))}</option>`).join("")}</select></div>
      <button type="button" class="primary" id="telegramSendTest">Test Mesajı Gönder</button>
      <p class="telegram-test-help">Alıcının önce @${esc(botUsername)} botuna <b>Başlat</b> demiş olması gerekir.</p>
    </article>
  </section>
  <section class="telegram-panel telegram-personnel-panel">
    <div class="section-modern-head"><div><h2>Bakım Personeli Eşleştirmeleri</h2><p>Telegram kullanıcı adını Personel Yönetimi → Düzenle alanından tanımlayın.</p></div><button type="button" class="secondary" id="telegramRefreshLinks">Bağlantıları Yenile</button></div>
    <div class="table-wrap"><table class="telegram-personnel-table"><thead><tr><th>Personel</th><th>Fabrika</th><th>Ekip</th><th>Vardiya</th><th>Telegram</th><th>Bot Bağlantısı</th></tr></thead><tbody>
      ${allMaintenanceAccounts().map(person=>{
        const account=APP_USERS[String(person.id)]||person;
        const username=telegramUsernameForAccount(account);
        return `<tr><td><b>${esc(account.name)}</b><small>ID ${esc(person.id)}</small></td><td>${esc(shiftFactoryName(account.factories?.[0]||""))}</td><td>${esc(account.team||"-")}</td><td><span class="telegram-shift-state ${activeIds.has(String(person.id))?"active":""}">${activeIds.has(String(person.id))?"Aktif vardiya":"Vardiya dışında"}</span></td><td>${username?`@${esc(username)}`:'<span class="telegram-missing">Tanımlanmadı</span>'}</td><td><span class="telegram-link-state ${username?"checking":"missing"}" ${username?`data-telegram-username="${esc(username)}"`:""}>${username?"Kontrol bekliyor":"Kullanıcı adı gerekli"}</span></td></tr>`;
      }).join("")}
    </tbody></table></div>
  </section>`;
}
function setTelegramUiMessage(message,state=""){
  const element=document.getElementById("telegramUiMessage");
  if(!element)return;
  element.textContent=message;
  element.className=`telegram-ui-message ${state}`.trim();
}
async function refreshTelegramLinkStates(){
  const badges=[...document.querySelectorAll("[data-telegram-username]")];
  const usernames=[...new Set(badges.map(badge=>normalizeTelegramUsername(badge.dataset.telegramUsername)).filter(Boolean))];
  if(!usernames.length)return;
  if(!telegramWorkerUrl()){
    badges.forEach(badge=>{badge.textContent="Worker bekleniyor";badge.className="telegram-link-state missing"});
    return;
  }
  try{
    const response=await telegramPost("/api/status",{usernames});
    const linked=safeRecord(response.linked,{});
    TELEGRAM_PAGE_STATE.linked=linked;
    badges.forEach(badge=>{
      const username=normalizeTelegramUsername(badge.dataset.telegramUsername);
      const isLinked=!!linked[username];
      badge.textContent=isLinked?"Bot başlatıldı":"Bot başlatılmadı";
      badge.className=`telegram-link-state ${isLinked?"linked":"missing"}`;
    });
    setTelegramUiMessage(`${Object.values(linked).filter(Boolean).length} Telegram hesabının bot bağlantısı doğrulandı.`,"success");
  }catch(error){
    badges.forEach(badge=>{badge.textContent="Kontrol edilemedi";badge.className="telegram-link-state danger"});
    setTelegramUiMessage(error.message||"Telegram bağlantıları kontrol edilemedi.","danger");
  }
}
async function checkTelegramHealth(){
  if(!telegramWorkerUrl()){
    setTelegramUiMessage("Önce Cloudflare Worker adresini girin.","warning");
    return;
  }
  setTelegramUiMessage("Bağlantı kontrol ediliyor…","warning");
  try{
    const result=await telegramPost("/api/health",{});
    TELEGRAM_PAGE_STATE.health=result;
    if(!result.ready)throw new Error(result.message||"Worker kurulumu eksik.");
    setTelegramUiMessage(`Bağlantı hazır · @${result.botUsername||telegramBotUsername()}`,"success");
    await refreshTelegramLinkStates();
  }catch(error){
    setTelegramUiMessage(error.message||"Worker bağlantısı kurulamadı.","danger");
  }
}
async function sendTelegramTest(){
  const select=document.getElementById("telegramTestRecipient");
  const id=String(select?.value||"");
  const account=APP_USERS[id];
  const username=telegramUsernameForAccount(account);
  if(!account||!username){
    setTelegramUiMessage("Telegram kullanıcı adı tanımlı bir test alıcısı seçin.","warning");
    return;
  }
  setTelegramUiMessage(`@${username} hesabına test mesajı gönderiliyor…`,"warning");
  try{
    const result=await telegramPost("/api/notify",{
      event:"test",
      eventId:`test-${Date.now()}`,
      appUrl:telegramAppUrl(),
      recipients:[{appUserId:id,name:account.name,username}],
      test:{sentBy:s.user?.name||"ETİLİSMART",sentAt:new Date().toISOString()}
    });
    if(!result.sent)throw new Error(result.unlinked?.length?"Alıcı botu henüz başlatmamış.":"Test mesajı teslim edilemedi.");
    setTelegramUiMessage(`Test mesajı @${username} hesabına gönderildi.`,"success");
  }catch(error){
    setTelegramUiMessage(error.message||"Test mesajı gönderilemedi.","danger");
  }
}
function bindTelegramUi(){
  const form=document.getElementById("telegramConfigForm");
  if(form)form.onsubmit=event=>{
    event.preventDefault();
    const result=saveTelegramWorkerUrl(document.getElementById("telegramWorkerUrl")?.value||"");
    if(!result.ok){
      setTelegramUiMessage(result.message,"danger");
      return;
    }
    setTelegramUiMessage(result.url?"Worker adresi bu tarayıcı için kaydedildi.":"Yerel Worker adresi kaldırıldı.","success");
  };
  const health=document.getElementById("telegramHealthCheck");
  if(health)health.onclick=checkTelegramHealth;
  const test=document.getElementById("telegramSendTest");
  if(test)test.onclick=sendTelegramTest;
  const refresh=document.getElementById("telegramRefreshLinks");
  if(refresh)refresh.onclick=refreshTelegramLinkStates;
}
