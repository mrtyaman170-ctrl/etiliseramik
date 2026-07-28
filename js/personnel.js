/* Kullanıcılar, roller ve personel yetkileri */
const ROLES=["Operatör","Bakım Personeli","Bölüm Formeni","Bölüm Yöneticisi","Üretim Müdürü","Bakım Formeni","Bakım Müdürü","Depo Sorumlusu","Atölye Personeli","Genel Müdür","Yazılımcı"];
const TYPES=["Elektrik","Mekanik","Otomasyon","Pnömatik","Hidrolik","Diğer"];

const APP_VERSION="1.4.4";
const APP_RELEASE_DATE="28.07.2026";
const AUTH_VERSION="pc-v5";
const DEMO_USERS={"1111":{"password":"1111","name":"Genel Yönetici","role":"Genel Müdür","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":""},"2222":{"password":"2222","name":"1. Fabrika Yöneticisi","role":"Fabrika Müdürü","factories":["1. Fabrika"],"department":""},"3333":{"password":"3333","name":"2. Fabrika Yöneticisi","role":"Fabrika Müdürü","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":""},"4444":{"password":"4444","name":"1. Fabrika Bölüm Formeni","role":"Bölüm Formeni","factories":["1. Fabrika"],"department":"Pres Bölümü"},"5555":{"password":"5555","name":"2. Fabrika Bölüm Formeni","role":"Bölüm Formeni","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Pres Bölümü"},"6666":{"password":"6666","name":"1. Fabrika Operatörü","role":"Operatör","factories":["1. Fabrika"],"department":"Pres Bölümü"},"7777":{"password":"7777","name":"2. Fabrika Operatörü","role":"Operatör","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Pres Bölümü"},"4001":{"password":"7318","name":"Hamit Uysal","role":"Bakım Müdürü","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":""},"4401":{"password":"1801","name":"Masse Bölümü Formeni","role":"Bölüm Formeni","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Masse Bölümü"},"4402":{"password":"1802","name":"Pres Bölümü Formeni","role":"Bölüm Formeni","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Pres Bölümü"},"4403":{"password":"1803","name":"Sır Bantları Formeni","role":"Bölüm Formeni","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Sır Bantları"},"4404":{"password":"1804","name":"Fırınlar Formeni","role":"Bölüm Formeni","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Fırınlar"},"4405":{"password":"1805","name":"Polisaj Formeni","role":"Bölüm Formeni","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Polisaj"},"4406":{"password":"1806","name":"Paketleme Formeni","role":"Bölüm Formeni","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Paketleme"},"4101":{"password":"2846","name":"Halil İbrahim Utku","role":"Elektrik Bakım Formeni","factories":["1. Fabrika"],"department":"","team":"Elektrik Bakım"},"4102":{"password":"9573","name":"Adem Keleş","role":"Elektrik Bakım Formeni","factories":["1. Fabrika"],"department":"","team":"Elektrik Bakım"},"4103":{"password":"6159","name":"Mert Yaman","role":"Elektrik Bakım Formeni","factories":["1. Fabrika"],"department":"","team":"Elektrik Bakım"},"4201":{"password":"3487","name":"Necip Gökkaya","role":"Mekanik Bakım Formeni","factories":["1. Fabrika"],"department":"","team":"Mekanik Bakım"},"4202":{"password":"8294","name":"Serkan Çeviren","role":"Mekanik Bakım Formeni","factories":["1. Fabrika"],"department":"","team":"Mekanik Bakım"},"4301":{"password":"5726","name":"Kemal Ayrancı","role":"Bakım Formeni","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Tüm Bakım"},"5101":{"password":"1937","name":"Sercan Şahin","role":"Bakım Personeli","factories":["1. Fabrika"],"department":"","team":"Elektrik Bakım"},"5102":{"password":"8462","name":"Onur Arga","role":"Bakım Personeli","factories":["1. Fabrika"],"department":"","team":"Elektrik Bakım"},"5103":{"password":"5271","name":"Mehmet Çağlayan","role":"Bakım Personeli","factories":["1. Fabrika"],"department":"","team":"Elektrik Bakım"},"5104":{"password":"3648","name":"Ali Sezer","role":"Bakım Personeli","factories":["1. Fabrika"],"department":"","team":"Elektrik Bakım"},"5201":{"password":"9185","name":"Üzeyir Toy","role":"Bakım Personeli","factories":["1. Fabrika"],"department":"","team":"Mekanik Bakım"},"5202":{"password":"2469","name":"Recep Kocabıyık","role":"Bakım Personeli","factories":["1. Fabrika"],"department":"","team":"Mekanik Bakım"},"6101":{"password":"7834","name":"Ahmet Gürer","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Elektrik Bakım"},"6102":{"password":"4592","name":"Tayfun Akıncı","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Elektrik Bakım"},"6103":{"password":"1268","name":"Rasim Çelik","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Elektrik Bakım"},"6104":{"password":"8951","name":"Arda Uysal","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Elektrik Bakım"},"6105":{"password":"3176","name":"Buğra Varol","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Elektrik Bakım"},"6106":{"password":"6843","name":"Mustafa Çağrı Tekin","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Elektrik Bakım"},"6201":{"password":"5417","name":"Özgür Öz","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Bakım"},"6202":{"password":"9724","name":"Rasim Genel","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Bakım"},"6203":{"password":"2385","name":"Ramazan Aykut","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Bakım"},"6204":{"password":"7561","name":"Alper Boztepe","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Bakım"},"6205":{"password":"4139","name":"Alperen Durmaz","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Bakım"},"6206":{"password":"8672","name":"Turgay Songur","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Bakım"},"6207":{"password":"3294","name":"Ozan Kinet","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Bakım"},"6208":{"password":"5948","name":"Umut Tokgöz","role":"Bakım Personeli","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Bakım"}};
const USER_STORE_KEY="etilismart_users_v2";
const DELETED_PERSONNEL_KEY="etilismart_deleted_personnel_ids_v1";
const FACTORY_DEPARTMENT_FOREMEN={
  "4401":{"password":"1801","name":"1. Fabrika Masse Bölümü Formeni","role":"Bölüm Formeni","factories":["1. Fabrika"],"department":"Masse Bölümü"},
  "4402":{"password":"1802","name":"1. Fabrika Pres Bölümü Formeni","role":"Bölüm Formeni","factories":["1. Fabrika"],"department":"Pres Bölümü"},
  "4403":{"password":"1803","name":"1. Fabrika Sır Bantları Formeni","role":"Bölüm Formeni","factories":["1. Fabrika"],"department":"Sır Bantları"},
  "4404":{"password":"1804","name":"1. Fabrika Fırınlar Formeni","role":"Bölüm Formeni","factories":["1. Fabrika"],"department":"Fırınlar"},
  "4405":{"password":"1805","name":"1. Fabrika Polisaj Formeni","role":"Bölüm Formeni","factories":["1. Fabrika"],"department":"Polisaj"},
  "4406":{"password":"1806","name":"1. Fabrika Paketleme Formeni","role":"Bölüm Formeni","factories":["1. Fabrika"],"department":"Paketleme"},
  "4501":{"password":"2801","name":"2. Fabrika Masse Bölümü Formeni","role":"Bölüm Formeni","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Masse Bölümü"},
  "4502":{"password":"2802","name":"2. Fabrika Pres Bölümü Formeni","role":"Bölüm Formeni","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Pres Bölümü"},
  "4503":{"password":"2803","name":"2. Fabrika Sır Bantları Formeni","role":"Bölüm Formeni","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Sır Bantları"},
  "4504":{"password":"2804","name":"2. Fabrika Fırınlar Formeni","role":"Bölüm Formeni","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Fırınlar"},
  "4505":{"password":"2805","name":"2. Fabrika Polisaj Formeni","role":"Bölüm Formeni","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Polisaj"},
  "4506":{"password":"2806","name":"2. Fabrika Paketleme Formeni","role":"Bölüm Formeni","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":"Paketleme"}
};
const PRODUCTION_MANAGER_USERS={
  "3901":{"password":"3901","name":"1. Fabrika Üretim Müdürü","role":"Üretim Müdürü","factories":["1. Fabrika"],"department":""},
  "3902":{"password":"3902","name":"2. Fabrika Üretim Müdürü","role":"Üretim Müdürü","factories":["2. Fabrika A Blok","2. Fabrika B Blok"],"department":""}
};
const DEVELOPER_USERS={
  "9001":{"password":"9001","name":"Mert Yaman","role":"Yazılımcı","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Tüm Bakım"}
};
const WAREHOUSE_USERS={
  "8001":{"password":"8001","name":"Depo Sorumlusu","role":"Depo Sorumlusu","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Depo"}
};
const WORKSHOP_USERS={
  "8101":{"password":"8101","name":"Atölye Sorumlusu","role":"Atölye Personeli","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Atölye"},
  "8102":{"password":"8102","name":"Atölye Personeli","role":"Atölye Personeli","factories":["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],"department":"","team":"Mekanik Atölye"}
};
const VALID_ACCOUNT_ROLES=new Set([...ROLES,"Elektrik Bakım Formeni","Mekanik Bakım Formeni","Fabrika Müdürü"]);
let DELETED_PERSONNEL_IDS=new Set(storageJsonArray(localStorage,DELETED_PERSONNEL_KEY,[]).map(String));
const REMOVED_LEGACY_USER_IDS=["2222","3333","4444","5555"];
function removeLegacyUsers(users){
  REMOVED_LEGACY_USER_IDS.forEach(id=>delete users[id]);
  return users;
}
const DEFAULT_USERS=removeLegacyUsers({...DEMO_USERS,...FACTORY_DEPARTMENT_FOREMEN,...PRODUCTION_MANAGER_USERS,...DEVELOPER_USERS,...WAREHOUSE_USERS,...WORKSHOP_USERS});
const PROTECTED_USERS=Object.fromEntries(
  Object.entries(DEFAULT_USERS)
    .filter(([,account])=>account.role!=="Bakım Personeli")
    .map(([id,account])=>[id,JSON.parse(JSON.stringify(account))])
);
function validStoredUsers(saved){
  const valid={};
  Object.entries(saved||{}).forEach(([id,account])=>{
    if(!/^\d{4}$/.test(String(id))||!account||typeof account!=="object"||Array.isArray(account))return;
    const name=String(account.name||"").trim();
    const password=String(account.password||"").trim();
    const role=String(account.role||"").trim();
    const factories=Array.isArray(account.factories)
      ?[...new Set(account.factories.filter(factory=>Object.prototype.hasOwnProperty.call(FACTORIES,factory)))]
      :[];
    if(!name||!/^\d{4}$/.test(password)||!VALID_ACCOUNT_ROLES.has(role)||!factories.length)return;
    valid[id]={
      ...account,
      password,
      name,
      role,
      factories,
      department:String(account.department||"").trim(),
      team:String(account.team||"").trim()
    };
  });
  return valid;
}
function saveDeletedPersonnelIds(){
  storageSet(localStorage,DELETED_PERSONNEL_KEY,JSON.stringify([...DELETED_PERSONNEL_IDS]));
}
function loadAppUsers(){
  const saved=storageJsonRecord(localStorage,USER_STORE_KEY,null);
  if(saved){
    const merged=removeLegacyUsers({...JSON.parse(JSON.stringify(DEMO_USERS)),...validStoredUsers(saved),...PROTECTED_USERS});
    DELETED_PERSONNEL_IDS.forEach(id=>{
      if(merged[id]?.role==="Bakım Personeli")delete merged[id];
    });
    storageSet(localStorage,USER_STORE_KEY,JSON.stringify(merged));
    return merged;
  }
  const initial=JSON.parse(JSON.stringify(DEFAULT_USERS));
  DELETED_PERSONNEL_IDS.forEach(id=>{
    if(initial[id]?.role==="Bakım Personeli")delete initial[id];
  });
  storageSet(localStorage,USER_STORE_KEY,JSON.stringify(initial));
  return initial;
}
let APP_USERS=loadAppUsers();
function saveAppUsers(){storageSet(localStorage,USER_STORE_KEY,JSON.stringify(APP_USERS));}
function appUserEntries(){return Object.entries(APP_USERS);}


const MAINTENANCE_PERSONNEL={
  "1. Fabrika":{
    "Elektrik Bakım":["Sercan Şahin","Onur Arga","Mehmet Çağlayan","Ali Sezer"],
    "Mekanik Bakım":["Üzeyir Toy","Recep Kocabıyık"]
  },
  "2. Fabrika":{
    "Elektrik Bakım":["Ahmet Gürer","Tayfun Akıncı","Rasim Çelik","Arda Uysal","Buğra Varol","Mert Yaman","Mustafa Çağrı Tekin"],
    "Mekanik Bakım":["Özgür Öz","Rasim Genel","Ramazan Aykut","Alper Boztepe","Alperen Durmaz","Turgay Songur","Ozan Kinet","Umut Tokgöz"]
  }
};
const DEMO_FAULT_OPENERS=[
  "Emre Kaya","Burak Demir","Hakan Yıldız","Serkan Aydın","Mehmet Aksoy",
  "Caner Koç","Uğur Şen","Tolga Arslan","Oğuzhan Çetin","Gökhan Yılmaz",
  "İbrahim Özkan","Onur Kılıç","Murat Tunç","Ali Rıza Eren","Erdem Doğan",
  "Selim Karaca","Kadir Polat","Yunus Emre Taş","Ömer Faruk Acar","Sinan Kurt"
];
function maintenanceFactoryGroup(factory){
  return String(factory||"").startsWith("1.")?"1. Fabrika":"2. Fabrika";
}
function maintenanceDisciplineForFault(fault){
  const type=String(fault?.type||"").toLocaleLowerCase("tr-TR");
  const subject=String(fault?.subject||"").toLocaleLowerCase("tr-TR");
  if(type.includes("mekanik")||type.includes("hidrolik")||type.includes("pnömatik")||
     subject.includes("rulman")||subject.includes("kayış")||subject.includes("zincir")||
     subject.includes("redüktör")||subject.includes("kaçak"))return "Mekanik Bakım";
  return "Elektrik Bakım";
}
function maintenanceOptionsForFault(fault){
  const group=maintenanceFactoryGroup(fault?.factory);
  const team=maintenanceDisciplineForFault(fault);
  const dynamic=appUserEntries().filter(([,u])=>u.role==="Bakım Personeli"&&u.team===team&&personnelFactoryGroup(u)===group).map(([,u])=>u.name);
  return dynamic.length?dynamic:(MAINTENANCE_PERSONNEL[group]?.[team]||[]);
}
function deterministicPerson(list,id,salt=0){
  if(!list.length)return "";
  return list[Math.abs((Number(id)||1)*37+salt*101)%list.length];
}

function personnelFactoryGroup(user){
  return (user?.factories||[]).some(x=>String(x).startsWith("1."))?"1. Fabrika":"2. Fabrika";
}
function currentManagerScope(){
  if(permissions().manageAllPersonnel)return {all:true,team:"Tüm Bakım",factories:["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"]};
  return {all:false,team:s.user?.team||"",factories:userFactories()};
}
function canManagePersonnelAccount(account){
  if(!account||account.role!=="Bakım Personeli")return false;
  if(permissions().manageAllPersonnel)return true;
  if(!permissions().manageOwnTeam)return false;
  const sameFactory=(account.factories||[]).some(f=>userCanSeeFactory(f));
  const sameTeam=s.user?.team==="Tüm Bakım"||account.team===s.user?.team;
  return sameFactory&&sameTeam;
}
function canViewPersonnelAccount(account){
  if(!account||account.role!=="Bakım Personeli")return false;
  if(permissions().manageAllPersonnel)return true;
  const sameFactory=(account.factories||[]).some(f=>userCanSeeFactory(f));
  if(permissions().manageOwnTeam){
    const sameTeam=s.user?.team==="Tüm Bakım"||account.team===s.user?.team;
    return sameFactory&&sameTeam;
  }
  if(permissions().viewPerformance||permissions().personnel)return sameFactory;
  return false;
}
function managedPersonnelEntries(){
  return appUserEntries()
    .filter(([,u])=>canViewPersonnelAccount(u))
    .sort((a,b)=>a[1].name.localeCompare(b[1].name,"tr"));
}
function faultParticipants(fault){
  return [...new Set(Array.isArray(fault?.participants)?fault.participants.filter(name=>typeof name==="string"&&name.trim()).map(name=>name.trim()):[])];
}
function normalizeFaultParticipants(){
  let changed=false;
  s.faults.forEach(f=>{
    if(!Array.isArray(f.usedMaterials)){f.usedMaterials=[];changed=true}
    if(typeof f.solutionText!=="string"){f.solutionText="";changed=true}
    if(typeof f.solutionBy!=="string"){f.solutionBy="";changed=true}
    if(f.solutionAt===undefined){f.solutionAt=null;changed=true}
    if(!Array.isArray(f.handovers)){f.handovers=[];changed=true}
    if(!Array.isArray(f.assignmentHistory)){f.assignmentHistory=[];changed=true}
    if(!f.assignmentState){
      f.assignmentState=f.status==="progress"||f.status==="done"?"accepted":"pending";
      if(f.status==="open"&&Array.isArray(f.participants)&&f.participants.length===1&&f.participants[0]===f.assignedTo)f.participants=[];
      changed=true;
    }
    if(f.assignmentState==="accepted"){
      if(!f.claimedBy)f.claimedBy=f.assignedTo||faultParticipants(f)[0]||"";
      if(!f.claimedAt)f.claimedAt=f.createdAt||new Date().toISOString();
    }else{
      if(f.claimedBy===undefined)f.claimedBy="";
      if(f.claimedAt===undefined)f.claimedAt=null;
    }
    const normalized=faultParticipants(f);
    if(JSON.stringify(f.participants||[])!==JSON.stringify(normalized)){
      f.participants=normalized;
      changed=true;
    }
  });
  if(changed)save();
}
function isCurrentMaintenanceUserActiveForFault(fault){
  if(s.user?.role!=="Bakım Personeli")return false;
  const account=APP_USERS[s.user.id];
  if(!account)return false;
  const sameFactory=(account.factories||[]).some(f=>shiftFactoryName(f)===shiftFactoryName(fault.factory));
  const sameTeam=account.team===maintenanceDisciplineForFault(fault);
  if(!sameFactory||!sameTeam)return false;
  return activeTeamMembers(shiftFactoryName(fault.factory),account.team).some(p=>p.id===s.user.id||p.name===s.user.name);
}
function currentMaintenanceAccountForFault(fault){
  if(!fault||s.user?.role!=="Bakım Personeli")return null;
  const account=APP_USERS[s.user.id];
  if(!account)return null;
  const sameFactory=(account.factories||[]).some(f=>shiftFactoryName(f)===shiftFactoryName(fault.factory));
  const sameTeam=account.team===maintenanceDisciplineForFault(fault);
  return sameFactory&&sameTeam?account:null;
}
function canClaimFault(fault){
  if(!fault||fault.status==="done"||fault.assignmentState==="accepted")return false;
  if(!currentMaintenanceAccountForFault(fault)||!isCurrentMaintenanceUserActiveForFault(fault))return false;
  const assigned=String(fault.assignedTo||"").trim();
  const activeNames=activeMaintenanceForFault(fault);
  return !assigned
    ||["Atama Bekliyor","Bakım Ekibi"].includes(assigned)
    ||assigned===s.user?.name
    ||!activeNames.includes(assigned);
}
function claimFaultByCurrentUser(fault){
  if(!canClaimFault(fault))return {ok:false,message:"Bu arızayı üstlenme yetkiniz yok veya arıza başka bir personele atanmış."};
  const now=new Date().toISOString();
  const previous=fault.assignedTo||"Atama Bekliyor";
  fault.assignedTo=s.user.name;
  fault.assignmentState="accepted";
  fault.claimedBy=s.user.name;
  fault.claimedAt=now;
  fault.status="progress";
  fault.closedAt=null;
  fault.participants=[...new Set([...faultParticipants(fault),s.user.name])];
  if(!Array.isArray(fault.assignmentHistory))fault.assignmentHistory=[];
  fault.assignmentHistory.push({action:"claimed",from:previous,to:s.user.name,by:s.user.name,at:now,shift:currentShiftLabel()});
  return {ok:true};
}
function canUpdateFaultStatus(fault){
  if(!fault||!permissions().editStatus)return false;
  if(canRedirectFault(fault))return true;
  if(s.user?.role!=="Bakım Personeli"||!currentMaintenanceAccountForFault(fault))return false;
  return fault.assignmentState==="accepted"&&faultParticipants(fault).includes(s.user.name);
}
function canManageFaultParticipants(fault){
  if(canRedirectFault(fault))return true;
  return isCurrentMaintenanceUserActiveForFault(fault)&&fault.assignmentState==="accepted"&&faultParticipants(fault).includes(s.user?.name);
}
function activeParticipantCandidates(fault){
  const team=maintenanceDisciplineForFault(fault);
  return activeTeamMembers(shiftFactoryName(fault.factory),team).map(p=>p.name);
}
function participantCandidateNames(fault){
  if(canRedirectFault(fault))return [...new Set([...availableMaintenanceForFault(fault),...maintenanceOptionsForFault(fault),...faultParticipants(fault)])];
  if(isCurrentMaintenanceUserActiveForFault(fault))return [...new Set([...activeParticipantCandidates(fault),...faultParticipants(fault)])];
  return faultParticipants(fault);
}

function canAddMaintenanceLog(){
  return ["Bakım Personeli","Elektrik Bakım Formeni","Mekanik Bakım Formeni","Bakım Formeni","Bakım Müdürü","Yazılımcı"].includes(s.user?.role);
}
function saveMaintenanceLogs(){
  storageSet(localStorage,MAINTENANCE_LOG_KEY,JSON.stringify(s.maintenanceLogs||[]));
}
function maintenanceLogParticipants(log){
  return [...new Set(Array.isArray(log?.participants)?log.participants.filter(name=>typeof name==="string"&&name.trim()).map(name=>name.trim()):[])];
}
function maintenanceWorkPeople(factory){
  const roles=["Bakım Personeli","Elektrik Bakım Formeni","Mekanik Bakım Formeni","Bakım Formeni","Bakım Müdürü"];
  return appUserEntries()
    .filter(([,u])=>roles.includes(u.role)&&(u.factories||[]).some(f=>shiftFactoryName(f)===shiftFactoryName(factory)))
    .map(([id,u])=>({id,name:u.name,role:u.role,team:u.team||"Bakım Yönetimi"}))
    .sort((a,b)=>a.name.localeCompare(b.name,"tr"));
}
function visibleMaintenanceLogs(){
  let rows=[...(s.maintenanceLogs||[])];
  if(!permissions().allFactories)rows=rows.filter(log=>userCanSeeFactory(log.factory));
  if(s.user?.role==="Bakım Personeli")rows=rows.filter(log=>maintenanceLogParticipants(log).includes(s.user.name));
  return rows.sort((a,b)=>new Date(b.performedAt||b.createdAt)-new Date(a.performedAt||a.createdAt));
}
function maintenanceLogsForPerson(name){
  return (s.maintenanceLogs||[])
    .filter(log=>maintenanceLogParticipants(log).includes(name))
    .sort((a,b)=>new Date(b.performedAt||b.createdAt)-new Date(a.performedAt||a.createdAt));
}
function canSelfJoinFault(fault){
  if(!fault||fault.status==="done"||s.user?.role!=="Bakım Personeli")return false;
  if(fault.assignmentState!=="accepted")return false;
  if(faultParticipants(fault).includes(s.user?.name))return false;
  return isCurrentMaintenanceUserActiveForFault(fault);
}
function shiftLabelForDate(date=new Date()){
  const h=date.getHours();
  return h<8?"00-08":h<16?"08-16":"16-24";
}
function weekOffsetForDate(date){
  const target=new Date(date);target.setHours(0,0,0,0);
  const monday=new Date(target);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  return Math.round((monday-weekMonday(0))/(7*86400000));
}
function nextShiftDate(date=new Date()){
  const next=new Date(date);
  const h=date.getHours();
  if(h<8)next.setHours(8,0,0,0);
  else if(h<16)next.setHours(16,0,0,0);
  else{next.setDate(next.getDate()+1);next.setHours(0,0,0,0)}
  return next;
}
function nextShiftLabel(date=new Date()){
  return shiftLabelForDate(nextShiftDate(date));
}
function nextShiftMembersForFault(fault){
  const team=maintenanceDisciplineForFault(fault);
  const factory=shiftFactoryName(fault.factory);
  return activeTeamMembers(factory,team,nextShiftDate()).map(p=>p.name).filter(name=>name!==s.user?.name);
}
function canHandoverFault(fault){
  if(!fault||fault.status==="done")return false;
  if(canRedirectFault(fault))return true;
  return s.user?.role==="Bakım Personeli"&&fault.assignmentState==="accepted"&&faultParticipants(fault).includes(s.user?.name)&&
    maintenanceDisciplineForFault(fault)===APP_USERS[s.user.id]?.team;
}
function personnelPerformance(name){
  const assigned=visibleFaults().filter(f=>faultParticipants(f).includes(name));
  const completed=assigned.filter(f=>f.status==="done");
  const active=assigned.filter(f=>f.status!=="done");
  const stopped=assigned.filter(f=>f.stopped);
  const avgMinutes=completed.length?Math.round(completed.reduce((sum,f)=>{
    const start=new Date(f.createdAt).getTime(),end=new Date(f.closedAt||f.createdAt).getTime();
    return sum+Math.max(0,(end-start)/60000);
  },0)/completed.length):0;
  const now=new Date();
  const monthRecords=assigned.filter(f=>{
    const d=new Date(f.closedAt||f.createdAt);
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const monthCompleted=monthRecords.filter(f=>f.status==="done").length;
  const machineCounts={};
  assigned.forEach(f=>{const key=f.machine||"Belirtilmemiş";machineCounts[key]=(machineCounts[key]||0)+1});
  const topMachines=Object.entries(machineCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return {assigned:assigned.length,completed:completed.length,active:active.length,stopped:stopped.length,avgMinutes,monthCompleted,monthAssigned:monthRecords.length,topMachines,records:assigned};
}
function performanceScore(p){
  if(!p.assigned)return 0;
  const completion=(p.completed/p.assigned)*70;
  const speed=p.avgMinutes?Math.max(0,30-Math.min(30,p.avgMinutes/12)):15;
  return Math.max(0,Math.min(100,Math.round(completion+speed)));
}
function monthlyPerformanceScore(p){
  if(!p.monthAssigned)return 0;
  const completion=(p.monthCompleted/p.monthAssigned)*80;
  const activity=Math.min(20,p.monthAssigned*2);
  return Math.max(0,Math.min(100,Math.round(completion+activity)));
}

function startOfWeek(date=new Date()){
  const d=new Date(date);
  const day=(d.getDay()+6)%7;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-day);
  return d;
}
function startOfMonth(date=new Date()){
  return new Date(date.getFullYear(),date.getMonth(),1);
}
function startOfYear(date=new Date()){
  return new Date(date.getFullYear(),0,1);
}
function performanceForPeriod(name,period="monthly"){
  const now=new Date();
  const start=period==="weekly"?startOfWeek(now):period==="yearly"?startOfYear(now):startOfMonth(now);
  const records=visibleFaults().filter(f=>{
    if(!faultParticipants(f).includes(name))return false;
    const d=new Date(f.closedAt||f.createdAt);
    return d>=start&&d<=now;
  });
  const completed=records.filter(f=>f.status==="done");
  const active=records.filter(f=>f.status!=="done");
  const stopped=records.filter(f=>f.stopped);
  const avgMinutes=completed.length?Math.round(completed.reduce((sum,f)=>{
    const startTime=new Date(f.createdAt).getTime();
    const endTime=new Date(f.closedAt||f.createdAt).getTime();
    return sum+Math.max(0,(endTime-startTime)/60000);
  },0)/completed.length):0;
  const score=records.length
    ?Math.max(0,Math.min(100,Math.round((completed.length/records.length)*80+Math.min(20,records.length*2))))
    :0;
  return {assigned:records.length,completed:completed.length,active:active.length,stopped:stopped.length,avgMinutes,score,records};
}
function performancePeriodLabel(period){
  return period==="weekly"?"Haftalık":period==="yearly"?"Yıllık":"Aylık";
}
function nextFourDigitId(){
  const ids=Object.keys(APP_USERS).map(Number).filter(n=>n>=1000&&n<=9999);
  for(let i=7001;i<=9999;i++)if(!ids.includes(i))return String(i);
  return "";
}
function randomFourDigitPassword(){
  return String(1000+Math.floor(Math.random()*9000));
}

function deleteMaintenancePersonnelAccount(id){
  const account=APP_USERS[id];
  if(!account||account.role!=="Bakım Personeli")return {ok:false,message:"Personel hesabı bulunamadı."};
  if(!permissions().manageAllPersonnel)return {ok:false,message:"Personel silme yetkisi yalnızca Bakım Müdüründedir."};

  delete APP_USERS[id];
  DELETED_PERSONNEL_IDS.add(String(id));
  saveDeletedPersonnelIds();
  saveAppUsers();

  // Silinen personeli açık ve geçmiş arıza katılımcılarından kaldır.
  s.faults.forEach(f=>{
    const remaining=faultParticipants(f).filter(name=>name!==account.name);
    f.participants=remaining;
    if(f.assignedTo===account.name){
      f.assignedTo=remaining[0]||"Atama Bekliyor";
      f.assignmentState=remaining.length?"accepted":"pending";
      f.claimedBy=remaining[0]||"";
      f.claimedAt=remaining.length?(f.claimedAt||new Date().toISOString()):null;
      if(!remaining.length&&f.status!=="done")f.status="open";
    }
  });

  s.workItems.forEach(item=>{
    if(item.kind==="workorder"&&item.assignedTo===account.name){
      item.assignedTo="";
      if(item.status==="assigned")item.status="open";
    }
  });

  // Vardiya planındaki kayıtlarını kaldır.
  if(s.shiftPlan&&typeof s.shiftPlan==="object"){
    Object.keys(s.shiftPlan).forEach(key=>{
      const value=s.shiftPlan[key];
      if(Array.isArray(value)){
        s.shiftPlan[key]=value.filter(x=>{
          if(typeof x==="string")return x!==account.name&&x!==id;
          return x?.name!==account.name&&x?.id!==id;
        });
      }else if(value&&typeof value==="object"){
        Object.keys(value).forEach(k=>{
          if(Array.isArray(value[k])){
            value[k]=value[k].filter(x=>{
              if(typeof x==="string")return x!==account.name&&x!==id;
              return x?.name!==account.name&&x?.id!==id;
            });
          }
        });
      }
    });
  }

  if(typeof SHIFT_OVERRIDES==="object"&&SHIFT_OVERRIDES){
    Object.keys(SHIFT_OVERRIDES)
      .filter(key=>key.split("|")[3]===String(id))
      .forEach(key=>delete SHIFT_OVERRIDES[key]);
    storageSet(localStorage,SHIFT_OVERRIDE_KEY,JSON.stringify(SHIFT_OVERRIDES));
  }

  save();
  saveWorkItems();
  return {ok:true,name:account.name};
}


const ROLE_PERMISSIONS={
  "Genel Müdür":{dashboard:true,newFault:false,faults:true,report:true,layout:true,planned:true,shiftSchedule:false,personnel:true,materials:true,workRequests:true,editPlanned:false,editStatus:false,viewPerformance:true,allFactories:true,dailyChecks:true},
  "Bakım Müdürü":{dashboard:true,newFault:false,faults:true,report:true,layout:true,planned:true,shiftSchedule:true,personnel:true,materials:true,manageMaterials:true,workRequests:true,workshop:true,createWorkshopRequest:true,manageWorkshopJobs:true,editPlanned:true,editStatus:true,manageShifts:true,redirectFaults:true,manageAllPersonnel:true,viewPerformance:true,allFactories:true,manageFaultMaterials:true,manageRequests:true,createDirectWorkOrder:true,dailyChecks:true,manageDailyChecks:true,manageMachines:true,manageDailyControlCatalog:true},
  "Elektrik Bakım Formeni":{dashboard:true,newFault:false,faults:true,report:true,layout:true,planned:true,shiftSchedule:true,personnel:true,materials:true,manageMaterials:true,workRequests:true,workshop:true,createWorkshopRequest:true,editPlanned:true,editStatus:true,manageShifts:true,redirectFaults:true,manageOwnTeam:true,viewPerformance:true,manageFaultMaterials:true,manageRequests:true,createDirectWorkOrder:true,dailyChecks:true,manageDailyChecks:true,manageMachines:true,manageDailyControlCatalog:true},
  "Mekanik Bakım Formeni":{dashboard:true,newFault:false,faults:true,report:true,layout:true,planned:true,shiftSchedule:true,personnel:true,materials:true,manageMaterials:true,workRequests:true,workshop:true,createWorkshopRequest:true,editPlanned:true,editStatus:true,manageShifts:true,redirectFaults:true,manageOwnTeam:true,viewPerformance:true,manageFaultMaterials:true,manageRequests:true,createDirectWorkOrder:true,dailyChecks:true,manageDailyChecks:true,manageMachines:true,manageDailyControlCatalog:true},
  "Bakım Formeni":{dashboard:true,newFault:false,faults:true,report:true,layout:true,planned:true,shiftSchedule:true,personnel:true,materials:true,manageMaterials:true,workRequests:true,workshop:true,createWorkshopRequest:true,editPlanned:true,editStatus:true,manageShifts:true,redirectFaults:true,manageOwnTeam:true,viewPerformance:true,manageFaultMaterials:true,manageRequests:true,createDirectWorkOrder:true,dailyChecks:true,manageDailyChecks:true,manageMachines:true,manageDailyControlCatalog:true},
  "Bölüm Formeni":{dashboard:true,newFault:true,faults:true,report:true,layout:true,planned:true,shiftSchedule:true,materials:true,workRequests:true,workshop:true,createWorkshopRequest:true,createRequest:true,editPlanned:true,editStatus:false,departmentOnly:true},
  "Üretim Müdürü":{dashboard:true,newFault:true,faults:true,report:true,layout:true,planned:true,shiftSchedule:true,materials:true,workRequests:true,workshop:true,createWorkshopRequest:true,createRequest:true,editPlanned:true,editStatus:false,allDepartments:true,allDepartmentForemanRights:true},
  "Bakım Personeli":{dashboard:true,newFault:false,faults:true,report:false,layout:true,planned:true,shiftSchedule:true,materials:true,manageMaterials:true,workRequests:true,workshop:true,createWorkshopRequest:true,editPlanned:false,editStatus:true,manageFaultMaterials:true,updateAssignedWorkOrders:true,viewAllShiftFactories:true,dailyChecks:true,completeDailyChecks:true},
  "Depo Sorumlusu":{dashboard:true,newFault:false,faults:false,report:false,layout:false,planned:false,shiftSchedule:false,personnel:false,materials:true,manageMaterials:true,workRequests:false,dailyChecks:false,allFactories:true},
  "Atölye Personeli":{dashboard:true,newFault:false,faults:false,report:false,layout:true,planned:false,shiftSchedule:false,personnel:false,materials:true,workRequests:false,workshop:true,manageWorkshopJobs:true,createWorkshopDirect:true,dailyChecks:false,allFactories:true},
  "Operatör":{dashboard:true,newFault:true,faults:true,report:false,layout:false,planned:true,shiftSchedule:true,workRequests:false,editPlanned:false,editStatus:false,departmentOnly:true,ownFaultsOnly:true,viewCurrentShiftMaintenance:true},
  "Yazılımcı":{dashboard:true,newFault:true,faults:true,report:true,layout:true,planned:true,shiftSchedule:true,personnel:true,materials:true,manageMaterials:true,workRequests:true,workshop:true,createWorkshopRequest:true,createWorkshopDirect:true,manageWorkshopJobs:true,dailyChecks:true,editPlanned:true,editStatus:true,manageShifts:true,redirectFaults:true,manageAllPersonnel:true,manageAllUserAccounts:true,manageOwnTeam:true,viewPerformance:true,allFactories:true,allDepartments:true,allDepartmentForemanRights:true,manageFaultMaterials:true,manageRequests:true,createRequest:true,createDirectWorkOrder:true,updateAssignedWorkOrders:true,viewAllShiftFactories:true,manageDailyChecks:true,completeDailyChecks:true,manageMachines:true,manageDailyControlCatalog:true}
};

/* Personel ekranları */
function personnelDetailModal(){
  if(!s.personnelDetailId)return "";
  const u=APP_USERS[s.personnelDetailId];
  if(!u)return "";
  const p=personnelPerformance(u.name);
  const selectedPeriod=s.personnelPerformancePeriod||"monthly";
  const periodP=performanceForPeriod(u.name,selectedPeriod);
  const score=performanceScore(p);
  const recent=[...p.records].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10);
  const allWorkLogs=maintenanceLogsForPerson(u.name);
  const workLogs=allWorkLogs.slice(0,12);
  const canEdit=canManagePersonnelAccount(u);
  return `<div class="modal-backdrop" id="personnelDetailBackdrop">
    <div class="modal personnel-detail-modal">
      <div class="modal-head"><div><span>BAKIM PERSONELİ PROFİLİ</span><h2>${esc(u.name)}</h2><p>${esc(shiftFactoryName(u.factories?.[0]||""))} · ${esc(u.team||"-")}</p></div><button type="button" id="closePersonnelDetail">×</button></div>
      <section class="personnel-profile-head">
        <div class="personnel-avatar">${esc(u.name.split(" ").map(x=>x[0]).slice(0,2).join(""))}</div>
        <div class="personnel-profile-main"><h3>${esc(u.name)}</h3><span>${esc(u.role)}</span><div class="profile-chips"><b>${esc(shiftFactoryName(u.factories?.[0]||""))}</b><b>${esc(u.team||"-")}</b><b class="active-chip">Aktif</b></div></div>
        <div class="profile-login-box"><small>KULLANICI ID</small><strong>${esc(s.personnelDetailId)}</strong><small>ŞİFRE</small><strong>${esc(u.password)}</strong>${canEdit?`<button class="secondary personnel-detail-edit" data-user-id="${esc(s.personnelDetailId)}">Hesabı Düzenle</button>${permissions().manageAllPersonnel?`<button class="danger personnel-delete-btn" data-user-id="${esc(s.personnelDetailId)}">Personeli Sil</button>`:""}`:""}</div>
      </section>
      <div class="detail-period-tabs"><button class="${selectedPeriod==="weekly"?"active":""}" data-performance-period="weekly">Haftalık</button><button class="${selectedPeriod==="monthly"?"active":""}" data-performance-period="monthly">Aylık</button><button class="${selectedPeriod==="yearly"?"active":""}" data-performance-period="yearly">Yıllık</button></div>
      <section class="personnel-detail-kpis">
        <article><small>${performancePeriodLabel(selectedPeriod).toUpperCase()} ATANAN</small><b>${periodP.assigned}</b><span>arıza kaydı</span></article>
        <article><small>TAMAMLANAN</small><b>${periodP.completed}</b><span>çözülen arıza</span></article>
        <article><small>AKTİF İŞ</small><b>${periodP.active}</b><span>${performancePeriodLabel(selectedPeriod).toLowerCase()} aktif</span></article>
        <article><small>YAPILAN İŞ KAYDI</small><b>${allWorkLogs.length}</b><span>atölye / saha işi</span></article>
        <article><small>ORT. ÇÖZÜM</small><b>${periodP.avgMinutes?`${Math.floor(periodP.avgMinutes/60)} sa ${periodP.avgMinutes%60} dk`:"-"}</b><span>tamamlanan işler</span></article>
        <article><small>PERFORMANS</small><b>%${score}</b><span>hesaplanan puan</span></article>
      </section>
      <div class="personnel-detail-grid">
        <section class="personnel-detail-card"><div class="section-modern-head"><div><h3>En Çok Müdahale Edilen Makineler</h3><p>Atanan arızalara göre</p></div></div><div class="top-machine-list">${p.topMachines.length?p.topMachines.map(([name,count],i)=>`<div><span>${i+1}</span><b>${esc(name)}</b><strong>${count} iş</strong></div>`).join(""):'<p class="muted">Henüz kayıt bulunmuyor.</p>'}</div></section>
        <section class="personnel-detail-card"><div class="section-modern-head"><div><h3>Performans Özeti</h3><p>Mevcut kayıtlar üzerinden</p></div></div><div class="profile-performance"><div class="profile-score-ring"><span>%${score}</span></div><dl><div><dt>Çözüm oranı</dt><dd>%${p.assigned?Math.round(p.completed/p.assigned*100):0}</dd></div><div><dt>Duruşlu arıza</dt><dd>${p.stopped}</dd></div><div><dt>Açık iş yükü</dt><dd>${p.active}</dd></div></dl></div></section>
        <section class="personnel-detail-card wide"><div class="section-modern-head"><div><h3>Yapılan İş Kayıtları</h3><p>Arıza ve iş emri dışında kaydedilen çalışmalar</p></div></div><div class="maintenance-log-person-list">${workLogs.map(log=>`<article><div><small>${new Date(log.performedAt||log.createdAt).toLocaleDateString("tr-TR")} · ${esc(log.factory)}</small><b>${esc(log.title)}</b><span>${esc(log.location||"-")}</span></div><p>${esc(log.description)}</p><strong>${maintenanceLogParticipants(log).map(esc).join(" · ")}</strong></article>`).join("")||'<div class="compact-empty"><span>✎</span><p>Bu personele ait yapılan iş kaydı bulunmuyor.</p></div>'}</div></section>
        <section class="personnel-detail-card wide"><div class="section-modern-head"><div><h3>Son 10 Arıza Kaydı</h3><p>Personele atanmış veya müdahale ettiği işler</p></div></div><div class="table-wrap"><table><thead><tr><th>Kayıt</th><th>Makine</th><th>Konu</th><th>Durum</th><th>Açılış</th><th>Süre</th></tr></thead><tbody>${recent.map(f=>`<tr class="personnel-fault-link" data-fault-id="${esc(f.id)}"><td>#${esc(f.id)}</td><td>${esc(f.machine)}</td><td>${esc(f.subject)}</td><td><span class="status ${esc(f.status)}">${statusLabel(f.status)}</span></td><td>${fmtDate(f.createdAt)}</td><td>${durationText(f)}</td></tr>`).join("")||'<tr><td colspan="6">Henüz atanmış arıza bulunmuyor.</td></tr>'}</tbody></table></div></section>
      </div>
    </div>
  </div>`;
}

function personnelManagementPage(){
  const selectedPeriod=s.personnelPerformancePeriod||"monthly";
  const entries=managedPersonnelEntries().sort((a,b)=>{
    const pa=performanceForPeriod(a[1].name,selectedPeriod),pb=performanceForPeriod(b[1].name,selectedPeriod);
    return pb.score-pa.score||pb.completed-pa.completed||a[1].name.localeCompare(b[1].name,"tr");
  });
  const total=entries.length;
  const completed=entries.reduce((sum,[,u])=>sum+performanceForPeriod(u.name,selectedPeriod).completed,0);
  const active=entries.reduce((sum,[,u])=>sum+performanceForPeriod(u.name,selectedPeriod).active,0);
  const avgScore=entries.length?Math.round(entries.reduce((sum,[,u])=>sum+performanceForPeriod(u.name,selectedPeriod).score,0)/entries.length):0;
  const monthRanking=entries.map(([id,u])=>({id,u,p:personnelPerformance(u.name)}))
    .sort((a,b)=>monthlyPerformanceScore(b.p)-monthlyPerformanceScore(a.p)||b.p.monthCompleted-a.p.monthCompleted);
  const employeeOfMonth=monthRanking[0]||null;
  const periodLeader=entries.length?{
    id:entries[0][0],
    u:entries[0][1],
    p:performanceForPeriod(entries[0][1].name,selectedPeriod)
  }:null;
  const canAdd=permissions().manageAllPersonnel||permissions().manageOwnTeam;
  const teamOptions=permissions().manageAllPersonnel?["Elektrik Bakım","Mekanik Bakım"]:(s.user?.team==="Tüm Bakım"?["Elektrik Bakım","Mekanik Bakım"]:[s.user?.team]);
  const factoryOptions=permissions().manageAllPersonnel?["1. Fabrika","2. Fabrika"]:Array.from(new Set(userFactories().map(shiftFactoryName)));

  const groups=[
    {factory:"1. Fabrika",team:"Elektrik Bakım",icon:"⚡",title:"1. Fabrika Elektrik Bakım"},
    {factory:"1. Fabrika",team:"Mekanik Bakım",icon:"🔧",title:"1. Fabrika Mekanik Bakım"},
    {factory:"2. Fabrika",team:"Elektrik Bakım",icon:"⚡",title:"2. Fabrika Elektrik Bakım"},
    {factory:"2. Fabrika",team:"Mekanik Bakım",icon:"🔧",title:"2. Fabrika Mekanik Bakım"}
  ].filter(g=>entries.some(([,u])=>personnelFactoryGroup(u)===g.factory&&u.team===g.team));

  function personnelCard(id,u){
    const p=performanceForPeriod(u.name,selectedPeriod),score=p.score;
    return `<article class="personnel-profile-card" data-personnel-detail-id="${esc(id)}">
      <div class="personnel-rank-badge">${u.rank===1?"🥇":u.rank===2?"🥈":u.rank===3?"🥉":"#"+u.rank}</div>
      <div class="personnel-card-top">
        <div class="personnel-avatar small">${esc(u.name.split(" ").map(x=>x[0]).slice(0,2).join(""))}</div>
        <div><h3>${esc(u.name)}</h3><span>${esc(u.team||"-")}</span></div>
        <strong>%${score}</strong>
      </div>
      <div class="personnel-card-stats">
        <div><small>Tamamlanan</small><b>${p.completed}</b></div>
        <div><small>Aktif</small><b>${p.active}</b></div>
        <div><small>Ort. Süre</small><b>${p.avgMinutes?Math.floor(p.avgMinutes/60)+"s "+p.avgMinutes%60+"dk":"-"}</b></div>
      </div>
      <div class="personnel-card-login"><span>ID: <b>${esc(id)}</b></span><span>Şifre: <b>${esc(u.password)}</b></span></div>
      ${canManagePersonnelAccount(u)?`<div class="personnel-card-actions">
        <button class="secondary personnel-edit-btn" data-user-id="${esc(id)}">Düzenle</button>
      </div>`:""}
    </article>`;
  }

  return `${clockBlock()}
  <section class="desktop-page-title personnel-title">
    <div><span>BAKIM EKİBİ YÖNETİMİ</span><h1>Personel ve Performans</h1><p>Bakım ekipleri fabrika ve disipline göre ayrı listelenir. Performansları haftalık, aylık veya yıllık görüntüleyebilirsiniz.</p></div>
    <div class="personnel-title-actions">
      <div class="performance-period-switch">
        <button class="${selectedPeriod==="weekly"?"active":""}" data-performance-period="weekly">Haftalık</button>
        <button class="${selectedPeriod==="monthly"?"active":""}" data-performance-period="monthly">Aylık</button>
        <button class="${selectedPeriod==="yearly"?"active":""}" data-performance-period="yearly">Yıllık</button>
      </div>
      ${canAddMaintenanceLog()?'<button class="secondary" id="openMaintenanceLogFromPersonnel">+ Yapılan İş Ekle</button>':""}
      ${canAdd?'<button class="primary" id="openPersonnelAdd">+ Yeni Bakım Personeli</button>':""}
    </div>
  </section>

  <section class="personnel-kpi-grid">
    <article><small>EKİP PERSONELİ</small><b>${total}</b><span>aktif hesap</span></article>
    <article><small>TAMAMLANAN İŞ</small><b>${completed}</b><span>${performancePeriodLabel(selectedPeriod).toLowerCase()} tamamlanan</span></article>
    <article><small>AKTİF İŞ</small><b>${active}</b><span>devam eden</span></article>
    <article><small>ORTALAMA PERFORMANS</small><b>%${avgScore}</b><span>${performancePeriodLabel(selectedPeriod).toLowerCase()} ekip puanı</span></article>
  </section>

  ${employeeOfMonth?`<section class="employee-of-month">
    <div class="employee-month-crown">★</div>
    <div class="employee-month-copy">
      <span>AYIN PERSONELİ</span>
      <h2>${esc(employeeOfMonth.u.name)}</h2>
      <p>${esc(personnelFactoryGroup(employeeOfMonth.u))} · ${esc(employeeOfMonth.u.team)} · Bu ay ${employeeOfMonth.p.monthCompleted} tamamlanan iş</p>
    </div>
    <div class="employee-month-score"><small>AYLIK PUAN</small><b>%${monthlyPerformanceScore(employeeOfMonth.p)}</b></div>
  </section>`:""}

  ${periodLeader?`<section class="period-leader-card">
    <div>
      <span>${performancePeriodLabel(selectedPeriod).toUpperCase()} PERFORMANS LİDERİ</span>
      <h2>${esc(periodLeader.u.name)}</h2>
      <p>${esc(personnelFactoryGroup(periodLeader.u))} · ${esc(periodLeader.u.team)}</p>
    </div>
    <div class="period-leader-stats">
      <article><small>PUAN</small><b>%${periodLeader.p.score}</b></article>
      <article><small>TAMAMLANAN</small><b>${periodLeader.p.completed}</b></article>
      <article><small>AKTİF</small><b>${periodLeader.p.active}</b></article>
    </div>
  </section>`:""}

  <section class="performance-ranking-card">
    <div class="section-modern-head"><div><h2>${performancePeriodLabel(selectedPeriod)} Personel Performans Sıralaması</h2><p>${performancePeriodLabel(selectedPeriod)} kayıtlara göre en yüksek puandan başlayarak sıralanır.</p></div></div>
    <div class="ranking-list">
      ${entries.map(([id,u],index)=>{const p=performanceForPeriod(u.name,selectedPeriod),score=p.score;return `<button data-personnel-detail-id="${esc(id)}">
        <span class="ranking-place">${index===0?"🥇":index===1?"🥈":index===2?"🥉":index+1}</span>
        <b>${esc(u.name)}</b>
        <small>${esc(personnelFactoryGroup(u))} · ${esc(u.team)}</small>
        <strong>%${score}</strong>
        <em>${p.completed} tamamlanan</em>
      </button>`}).join("")}
    </div>
  </section>

  <section class="personnel-group-tabs">
    ${groups.map((g,idx)=>`<button class="${idx===0?"active":""}" data-personnel-group="${esc(g.factory+"|"+g.team)}">${g.icon} ${esc(g.title)}</button>`).join("")}
  </section>

  ${groups.map((g,idx)=>{
    const list=entries.filter(([,u])=>personnelFactoryGroup(u)===g.factory&&u.team===g.team)
      .sort((a,b)=>performanceForPeriod(b[1].name,selectedPeriod).score-performanceForPeriod(a[1].name,selectedPeriod).score);
    return `<section class="personnel-group-section ${idx===0?"active":""}" data-personnel-group-panel="${esc(g.factory+"|"+g.team)}">
      <div class="section-modern-head">
        <div><h2>${g.icon} ${esc(g.title)}</h2><p>${list.length} bakım personeli</p></div>
        <span class="list-count blue">${list.length}</span>
      </div>
      <div class="personnel-card-grid">${list.map(([id,u],rank)=>personnelCard(id,{...u,rank:rank+1})).join("")}</div>
    </section>`;
  }).join("")||'<section class="personnel-table-card"><div class="compact-empty"><span>◌</span><p>Yetki alanınızda personel bulunmuyor.</p></div></section>'}

  <div class="modal-backdrop" id="personnelEditorBackdrop" style="display:none">
    <div class="modal personnel-editor-modal">
      <div class="modal-head"><div><span>PERSONEL HESABI</span><h2 id="personnelEditorTitle">Yeni Bakım Personeli</h2></div><button type="button" id="closePersonnelEditor">×</button></div>
      <form id="personnelEditorForm">
        <input type="hidden" id="personnelOriginalId">
        <div class="form-grid">
          <div class="field wide"><label>Ad Soyad</label><input id="personnelName" required></div>
          <div class="field"><label>Fabrika</label><select id="personnelFactory">${factoryOptions.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
          <div class="field"><label>Ekip</label><select id="personnelTeam">${teamOptions.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
          <div class="field"><label>4 Haneli Kullanıcı ID</label><input id="personnelId" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required></div>
          <div class="field"><label>4 Haneli Şifre</label><div class="password-generate-row"><input id="personnelPassword" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required><button type="button" class="secondary" id="generatePersonnelPassword">Üret</button></div></div>
        </div>
        <div class="modal-actions"><button type="button" class="secondary" id="cancelPersonnelEditor">Vazgeç</button><button class="primary" type="submit">Kaydet</button></div>
      </form>
    </div>
  </div>`;
}
