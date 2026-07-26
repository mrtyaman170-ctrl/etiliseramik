const K="etilismart_faults_v5";
const MAINTENANCE_LOG_KEY="etilismart_maintenance_work_logs_v1";
const MATERIAL_DELETED_KEY="etilismart_deleted_material_ids_v1";

const FACTORIES={
  "1. Fabrika":["1. Hat","2. Hat","3. Hat"],
  "2. Fabrika B Blok":["1. Hat","2. Hat","Ortak Alan"],
  "2. Fabrika A Blok":["1. Hat","2. Hat","3. Hat","Ortak Alan"]
};

const STRUCTURE={
  "Masse Bölümü":["Beşiker","Değirmen Üstü Konveyörler","Değirmenler","Karıştırma Havuzları","Elekler","Spray Dryer","Silo Üstü Konveyör Bantları","Silo","Silo Altı Konveyör Bantları"],
  "Pres Bölümü":["Presler","Pres Rulo ve Kayışlar","Mengil"],
  "Sır Bantları":["Konveyör Bantlar","Su Atma","Engop Atma","Sır Atma","Sır Tankları","Dijital Baskı"],
  "Fırınlar":["Fırın Girişi Elevatör","Fırın Girişi Kayışlar","Fırın Girişi Rulolar","Fırın","Fırın Çıkışı Rulolar","Fırın Çıkışı Kayışlar","Fırın Çıkışı Şematik"],
  "Polisaj":["Nano","Parlatma","Kareleme","Kalibre","Su Emme","Kayışlar"],
  "Paketleme":["Kalite Masası","Stoker","Paketleme","Bantlar","Etiket Yazıcı","Deste Birleştirici","Deste Çevirici","Paletizer","Streçleme"]
};

// Excel dosyasından alınan gerçek 2. Fabrika makine-hat yapısı.
const MACHINE_CATALOG_2_FACTORY={"2. Fabrika B Blok":{"Ortak Alan":{"Masse Bölümü":["BEŞİKER 1","BEŞİKER 2","BEŞİKER DEĞİRMEN ARASI KONVEYÖRLER","1. DEĞİRMEN","2. DEĞİRMEN","3. DEĞİRMEN","4. DEĞİRMEN","5. DEĞİRMEN","6. DEĞİRMEN","7. DEĞİRMEN","8. DEĞİRMEN","ÇAMUR HAVUZU 1","ÇAMUR HAVUZU 2","ÇAMUR HAVUZU 3","ÇAMUR HAVUZU 4","ELEK 1","ELEK 2","ELEK 3","ELEK 4","SERVİS TANKI","ÇAMUR POMPALARI","SPRAY DRYER","SPRAY SİLO ARASI KONVEYÖRLER","1. SİLO","2. SİLO","3. SİLO","4. SİLO","5. SİLO","6. SİLO","7. SİLO","8. SİLO","9. SİLO","10. SİLO","SİLO PRES ARASI KONVEYÖRLER","İÇ ATIK SU HAVUZU","DIŞ ELEK"],"Sır Bantları":["1. SIR TANKI","2. SIR TANKI","3. SIR TANKI","4. SIR TANKI","1. MASTERJET","2. MASTERJET","3. MASTERJET","4. MASTERJET","5. MASTERJET","6. MASTERJET","1. SIR KAZANI","2. SIR KAZANI","3. SIR KAZANI","4. SIR KAZANI","5. SIR KAZANI","6. SIR KAZANI"],"Fırınlar":["POPPİ","TGV 1","TGV 2","TGV 3"],"Paketleme":["TRANSPALET 1","TRANSPALET 2","TRANSPALET 3","TRANSPALET 4"]},"1. Hat":{"Pres Bölümü":["1. PRES","2. PRES","PRES RULOLAR","1. PRES ÇEVİRİCİ","2. PRES ÇEVİRİCİ","2. KURUTMA GİRİŞİ ASANSÖR VE RULOLAR","2. KURUTMA","1. PRES YAĞ SOĞUTUCU","2. PRES YAĞ SOĞUTUCU"],"Sır Bantları":["1. KURUTMA ÇIKIŞI ASANSÖR VE RULOLAR","1. KURUTMA- SU ATMA KABİNİ ARASI BANTLAR","SU ATMA KABİNİ","SU ATMA KABİNİ - ENGOP ARASI BANTLAR","KENAR TAŞLAMA VE FIRÇA","1. ENGOP","ENGOP DİJİTAL ARASI BANTLAR","DİJİTAL ÖNCESİ FANLAR","1. DİJİTAL","DİJİTAL SONRASI KUMLAMA","1. SIRLAMA","DİJİTAL SIRLAMA ARASI BANTLAR","DİJİTAL ENGOP ARASI BANTLAR","SIRLAMA ELEVATÖR ARASI BANTLAR","ELEVATÖR DÖNER ARASI BANTLAR"],"Fırınlar":["1. FIRIN GİRİŞİ 1. ELEVATÖR","DÖNER SONRASI BANTLAR","1. FIRIN GİRİŞİ RULOLAR","1. FIRIN GİRİŞİ BARİYER","1. FIRIN","1. FIRIN ÇIKIŞI RULOLAR","DÖNER","1. FIRIN ÇIKIŞI -DÖNER ARASI KAYIŞLAR","DÖNER - HAVUZ ARASI BANTLAR","HAVUZ BANTLAR","HAVUZ ŞEMATİK ARASI BANTLAR","1. FIRIN ÇIKIŞI ŞEMATİK"],"Polisaj":["1. POLİSAJ ŞEMATİK","1. POLİSAJ ŞEMATİK ÇIKIŞI BANTLAR","1. NANO","2. NANO","3. NANO","1. PARLATMA","2. PARLATMA","3. PARLATMA","4. PARLATMA","1. KARELEME","2. KARELEME","1. KALİBRE","1. SU EMME","KARELEME ÇIKIŞI FANLAR","1. POLİSAJ HATTI BANTLAR"],"Paketleme":["1. PAKETLEME ŞEMATİK","1. KALİTE MASASI ÖNCESİ BANTLAR","1. KALİTE MASASI","1. KALİTE MASASI SONRASI BANTLAR (SYNTHESIS ONCESI)","1. SYNTHESIS (STOKER)","1. PAKETLEME","1. DESTE BİRLEŞTİCİ","1. ETİKET YAZICI","1. DESTE ÇEVİRİCİ","1. PALETİZER","1.STREÇLEME"]},"2. Hat":{"Pres Bölümü":["3. PRES","4. PRES","3-4 PRES RULOLAR","3. PRES ÇEVİRİCİ","4. PRES ÇEVİRİCİ","2. KURUTMA GİRİŞİ ASANSÖR VE RULOLAR","2. KURUTMA","3. PRES YAĞ SOĞUTUCU","4. PRES YAĞ SOĞUTUCU"],"Sır Bantları":["2. KURUTMA ÇIKIŞI ASANSÖR VE RULOLAR","2. KURUTMA- SU ATMA KABİNİ ARASI BANTLAR","SU ATMA KABİNİ","SU ATMA KABİNİ - ENGOP ARASI BANTLAR","KENAR TAŞLAMA VE FIRÇA","2. ENGOP","ENGOP DİJİTAL ARASI BANTLAR","DİJİTAL ÖNCESİ FANLAR","2. DİJİTAL","DİJİTAL SONRASI KUMLAMA","2. SIRLAMA","DİJİTAL SIRLAMA ARASI BANTLAR","DİJİTAL ENGOP ARASI BANTLAR","SIRLAMA ELEVATÖR ARASI BANTLAR","ELEVATÖR DÖNER ARASI BANTLAR"],"Fırınlar":["2. FIRIN GİRİŞİ 2. ELEVATÖR","DÖNER SONRASI BANTLAR","2. FIRIN GİRİŞİ RULOLAR","2. FIRIN GİRİŞİ BARİYER","2. FIRIN","2. FIRIN ÇIKIŞI RULOLAR","DÖNER","2. FIRIN ÇIKIŞI -DÖNER ARASI KAYIŞLAR","DÖNER - HAVUZ ARASI BANTLAR","HAVUZ BANTLAR","HAVUZ ŞEMATİK ARASI BANTLAR","2. FIRIN ÇIKIŞI ŞEMATİK"],"Polisaj":["2. POLİSAJ ŞEMATİK","2. POLİSAJ ŞEMATİK ÇIKIŞI BANTLAR","4. NANO","5. NANO","6. NANO","5. PARLATMA","6. PARLATMA","7. PARLATMA","8. PARLATMA","3. KARELEME","4. KARELEME","2. KALİBRE","2. SU EMME","KARELEME ÇIKIŞI FANLAR","2. POLİSAJ HATTI BANTLAR"],"Paketleme":["2. PAKETLEME ŞEMATİK","2. KALİTE MASASI ÖNCESİ BANTLAR","2. KALİTE MASASI","2. KALİTE MASASI SONRASI BANTLAR (SYNTHESIS ONCESI)","2. SYNTHESIS (STOKER)","2. PAKETLEME","2. DESTE BİRLEŞTİCİ","2. ETİKET YAZICI","2. DESTE ÇEVİRİCİ","2. PALETİZER","2.STREÇLEME"]}},"2. Fabrika A Blok":{"Ortak Alan":{"Masse Bölümü":["BEŞİKER 1","BEŞİKER 2","BEŞİKER DEĞİRMEN ARASI KONVEYÖRLER","1. DEĞİRMEN","2. DEĞİRMEN","3. DEĞİRMEN","4. DEĞİRMEN","5. DEĞİRMEN","6. DEĞİRMEN","7. DEĞİRMEN","8. DEĞİRMEN","ÇAMUR HAVUZU 1","ÇAMUR HAVUZU 2","ÇAMUR HAVUZU 3","ÇAMUR HAVUZU 4","ELEK 1","ELEK 2","ELEK 3","ELEK 4","SERVİS TANKI","ÇAMUR POMPALARI","SPRAY DRYER","SPRAY SİLO ARASI KONVEYÖRLER","1. SİLO","2. SİLO","3. SİLO","4. SİLO","5. SİLO","6. SİLO","7. SİLO","8. SİLO","9. SİLO","10. SİLO","SİLO PRES ARASI KONVEYÖRLER","İÇ ATIK SU HAVUZU","DIŞ ELEK"],"Sır Bantları":["1. SIR TANKI","2. SIR TANKI","3. SIR TANKI","4. SIR TANKI","1. MASTERJET","2. MASTERJET","3. MASTERJET","4. MASTERJET","5. MASTERJET","6. MASTERJET","1. SIR KAZANI","2. SIR KAZANI","3. SIR KAZANI","4. SIR KAZANI","5. SIR KAZANI","6. SIR KAZANI"],"Fırınlar":["POPPİ","AGV 1","AGV 2"],"Paketleme":["TRANSPALET 1","TRANSPALET 2","TRANSPALET 3","TRANSPALET 4"]},"1. Hat":{"Pres Bölümü":["1. PRES","2. PRES","PRES RULOLAR","1. PRES ÇEVİRİCİ","2. PRES ÇEVİRİCİ","2. KURUTMA GİRİŞİ ASANSÖR VE RULOLAR","2. KURUTMA","1. PRES YAĞ SOĞUTUCU","2. PRES YAĞ SOĞUTUCU"],"Sır Bantları":["1. KURUTMA ÇIKIŞI ASANSÖR VE RULOLAR","1. KURUTMA- SU ATMA KABİNİ ARASI BANTLAR","SU ATMA KABİNİ","SU ATMA KABİNİ - ENGOP ARASI BANTLAR","KENAR TAŞLAMA VE FIRÇA","1. ENGOP","ENGOP DİJİTAL ARASI BANTLAR","DİJİTAL ÖNCESİ FANLAR","1. DİJİTAL","DİJİTAL SONRASI KUMLAMA","1. SIRLAMA","DİJİTAL SIRLAMA ARASI BANTLAR","DİJİTAL ENGOP ARASI BANTLAR","SIRLAMA ELEVATÖR ARASI BANTLAR","ELEVATÖR DÖNER ARASI BANTLAR"],"Fırınlar":["1. FIRIN GİRİŞİ 1. ELEVATÖR","DÖNER SONRASI BANTLAR","1. FIRIN GİRİŞİ RULOLAR","1. FIRIN GİRİŞİ BARİYER","1. FIRIN","1. FIRIN ÇIKIŞI RULOLAR","DÖNER","1. FIRIN ÇIKIŞI -DÖNER ARASI KAYIŞLAR","DÖNER - HAVUZ ARASI BANTLAR","HAVUZ BANTLAR","HAVUZ ŞEMATİK ARASI BANTLAR","1. FIRIN ÇIKIŞI ŞEMATİK"],"Polisaj":["1. POLİSAJ ŞEMATİK","1. POLİSAJ ŞEMATİK ÇIKIŞI BANTLAR","1. NANO","2. NANO","3. NANO","1. PARLATMA","2. PARLATMA","3. PARLATMA","4. PARLATMA","1. KARELEME","2. KARELEME","1. KALİBRE","1. SU EMME","KARELEME ÇIKIŞI FANLAR","1. POLİSAJ HATTI BANTLAR"],"Paketleme":["1. PAKETLEME ŞEMATİK","1. KALİTE MASASI ÖNCESİ BANTLAR","1. KALİTE MASASI","1. KALİTE MASASI SONRASI BANTLAR (SYNTHESIS ONCESI)","1. SYNTHESIS (STOKER)","1. PAKETLEME","1. DESTE BİRLEŞTİCİ","1. ETİKET YAZICI","1. DESTE ÇEVİRİCİ","1. PALETİZER","1.STREÇLEME"]},"2. Hat":{"Pres Bölümü":["3. PRES","4. PRES","3-4 PRES RULOLAR","3. PRES ÇEVİRİCİ","4. PRES ÇEVİRİCİ","2. KURUTMA GİRİŞİ ASANSÖR VE RULOLAR","2. KURUTMA","3. PRES YAĞ SOĞUTUCU","4. PRES YAĞ SOĞUTUCU"],"Sır Bantları":["2. KURUTMA ÇIKIŞI ASANSÖR VE RULOLAR","2. KURUTMA- SU ATMA KABİNİ ARASI BANTLAR","SU ATMA KABİNİ","SU ATMA KABİNİ - ENGOP ARASI BANTLAR","KENAR TAŞLAMA VE FIRÇA","2. ENGOP","ENGOP DİJİTAL ARASI BANTLAR","DİJİTAL ÖNCESİ FANLAR","2. DİJİTAL","DİJİTAL SONRASI KUMLAMA","2. SIRLAMA","DİJİTAL SIRLAMA ARASI BANTLAR","DİJİTAL ENGOP ARASI BANTLAR","SIRLAMA ELEVATÖR ARASI BANTLAR","ELEVATÖR DÖNER ARASI BANTLAR"],"Fırınlar":["2. FIRIN GİRİŞİ 2. ELEVATÖR","DÖNER SONRASI BANTLAR","2. FIRIN GİRİŞİ RULOLAR","2. FIRIN GİRİŞİ BARİYER","2. FIRIN","2. FIRIN ÇIKIŞI RULOLAR","DÖNER","2. FIRIN ÇIKIŞI -DÖNER ARASI KAYIŞLAR","DÖNER - HAVUZ ARASI BANTLAR","HAVUZ BANTLAR","HAVUZ ŞEMATİK ARASI BANTLAR","2. FIRIN ÇIKIŞI ŞEMATİK"],"Polisaj":["2. POLİSAJ ŞEMATİK","2. POLİSAJ ŞEMATİK ÇIKIŞI BANTLAR","4. NANO","5. NANO","6. NANO","5. PARLATMA","6. PARLATMA","7. PARLATMA","8. PARLATMA","3. KARELEME","4. KARELEME","2. KALİBRE","2. SU EMME","KARELEME ÇIKIŞI FANLAR","2. POLİSAJ HATTI BANTLAR"],"Paketleme":["2. PAKETLEME ŞEMATİK","2. KALİTE MASASI ÖNCESİ BANTLAR","2. KALİTE MASASI","2. KALİTE MASASI SONRASI BANTLAR (SYNTHESIS ONCESI)","2. SYNTHESIS (STOKER)","2. PAKETLEME","2. DESTE BİRLEŞTİCİ","2. ETİKET YAZICI","2. DESTE ÇEVİRİCİ","2. PALETİZER","2.STREÇLEME"]},"3. Hat":{"Polisaj":["3. POLİSAJ ŞEMATİK","3. POLİSAJ ŞEMATİK ÇIKIŞI BANTLAR","7. NANO","8. NANO","9. NANO","9. PARLATMA","10. PARLATMA","11. PARLATMA","12. PARLATMA","5. KARELEME","6. KARELEME","3. KALİBRE","3. SU EMME","KARELEME ÇIKIŞI FANLAR","3. POLİSAJ HATTI BANTLAR"],"Paketleme":["3. PAKETLEME ŞEMATİK","3. KALİTE MASASI ÖNCESİ BANTLAR","3. KALİTE MASASI","3. KALİTE MASASI SONRASI BANTLAR (SYNTHESIS ONCESI)","3. SYNTHESIS (STOKER)","3. PAKETLEME","3. DESTE BİRLEŞTİCİ","3. ETİKET YAZICI","3. DESTE ÇEVİRİCİ","3. PALETİZER","3.STREÇLEME"]}}};


const MACHINE_CATALOG_CUSTOM_KEY="etilismart_custom_machines_v1";
const MACHINE_CATALOG_DELETED_KEY="etilismart_deleted_machines_v1";
let CUSTOM_MACHINE_CATALOG=[];
let DELETED_MACHINE_CATALOG=[];
CUSTOM_MACHINE_CATALOG=storageJsonRecordArray(localStorage,MACHINE_CATALOG_CUSTOM_KEY,[]);
DELETED_MACHINE_CATALOG=storageJsonArray(localStorage,MACHINE_CATALOG_DELETED_KEY,[]).filter(key=>typeof key==="string");
function machineCatalogKey(factory,line,department,machine){
  return [factory,line,department,machine].join("¦");
}
function ensureMachineCatalogFactory(factory){
  if(!MACHINE_CATALOG_2_FACTORY[factory]){
    MACHINE_CATALOG_2_FACTORY[factory]={};
    const lines=FACTORIES[factory]||["1. Hat"];
    lines.forEach(line=>{
      MACHINE_CATALOG_2_FACTORY[factory][line]={};
      Object.entries(STRUCTURE).forEach(([department,machines])=>{
        MACHINE_CATALOG_2_FACTORY[factory][line][department]=[...machines];
      });
    });
  }
  return MACHINE_CATALOG_2_FACTORY[factory];
}
function ensureMachineCatalogPath(factory,line,department){
  ensureMachineCatalogFactory(factory);
  if(!MACHINE_CATALOG_2_FACTORY[factory][line]){
    MACHINE_CATALOG_2_FACTORY[factory][line]={};
    Object.entries(STRUCTURE).forEach(([defaultDepartment,machines])=>{
      MACHINE_CATALOG_2_FACTORY[factory][line][defaultDepartment]=[...machines];
    });
  }
  if(!MACHINE_CATALOG_2_FACTORY[factory][line][department])MACHINE_CATALOG_2_FACTORY[factory][line][department]=[];
  return MACHINE_CATALOG_2_FACTORY[factory][line][department];
}
function applyMachineCatalogChanges(){
  DELETED_MACHINE_CATALOG.forEach(key=>{
    const [factory,line,department,machine]=String(key).split("¦");
    const list=MACHINE_CATALOG_2_FACTORY[factory]?.[line]?.[department];
    if(Array.isArray(list)){
      const index=list.indexOf(machine);
      if(index>=0)list.splice(index,1);
    }
  });
  CUSTOM_MACHINE_CATALOG.forEach(item=>{
    if(!item?.factory||!item?.line||!item?.department||!item?.machine)return;
    const list=ensureMachineCatalogPath(item.factory,item.line,item.department);
    if(!list.includes(item.machine))list.push(item.machine);
  });
}
function saveMachineCatalogChanges(){
  storageSet(localStorage,MACHINE_CATALOG_CUSTOM_KEY,JSON.stringify(CUSTOM_MACHINE_CATALOG));
  storageSet(localStorage,MACHINE_CATALOG_DELETED_KEY,JSON.stringify(DELETED_MACHINE_CATALOG));
}
function addMachineToCatalog(factory,line,department,machine){
  const clean=String(machine||"").trim();
  if(!clean)return {ok:false,message:"Makine adı boş bırakılamaz."};
  const list=ensureMachineCatalogPath(factory,line,department);
  if(list.some(item=>item.toLocaleLowerCase("tr-TR")===clean.toLocaleLowerCase("tr-TR"))){
    return {ok:false,message:"Bu bölümde aynı isimde bir makine zaten bulunuyor."};
  }
  const record={factory,line,department,machine:clean,createdBy:s.user?.name||"",createdAt:new Date().toISOString()};
  CUSTOM_MACHINE_CATALOG.push(record);
  const key=machineCatalogKey(factory,line,department,clean);
  DELETED_MACHINE_CATALOG=DELETED_MACHINE_CATALOG.filter(item=>item!==key);
  list.push(clean);
  saveMachineCatalogChanges();
  return {ok:true};
}
function deleteMachineFromCatalog(factory,line,department,machine){
  const list=ensureMachineCatalogPath(factory,line,department);
  if(!Array.isArray(list))return false;
  const index=list.indexOf(machine);
  if(index<0)return false;
  list.splice(index,1);
  const key=machineCatalogKey(factory,line,department,machine);
  const customIndex=CUSTOM_MACHINE_CATALOG.findIndex(item=>machineCatalogKey(item.factory,item.line,item.department,item.machine)===key);
  if(customIndex>=0)CUSTOM_MACHINE_CATALOG.splice(customIndex,1);
  else if(!DELETED_MACHINE_CATALOG.includes(key))DELETED_MACHINE_CATALOG.push(key);
  saveMachineCatalogChanges();
  return true;
}
function isCustomMachine(factory,line,department,machine){
  const key=machineCatalogKey(factory,line,department,machine);
  return CUSTOM_MACHINE_CATALOG.some(item=>machineCatalogKey(item.factory,item.line,item.department,item.machine)===key);
}
applyMachineCatalogChanges();

function catalogLines(factory){
  if(MACHINE_CATALOG_2_FACTORY[factory]){
    const lines=Object.keys(MACHINE_CATALOG_2_FACTORY[factory]);
    return lines.sort((a,b)=>{
      if(a==="Ortak Alan")return 1;
      if(b==="Ortak Alan")return -1;
      return a.localeCompare(b,"tr",{numeric:true});
    });
  }
  return FACTORIES[factory]||[];
}
function catalogDepartments(factory,line){
  if(MACHINE_CATALOG_2_FACTORY[factory]){
    return Object.keys(MACHINE_CATALOG_2_FACTORY[factory][line]||{});
  }
  return Object.keys(STRUCTURE);
}
function catalogMachines(factory,line,department){
  if(MACHINE_CATALOG_2_FACTORY[factory]){
    return MACHINE_CATALOG_2_FACTORY[factory]?.[line]?.[department]||[];
  }
  return STRUCTURE[department]||[];
}
function allFactoryMachines(factory){
  if(!MACHINE_CATALOG_2_FACTORY[factory])return Object.values(STRUCTURE).flat();
  return Object.values(MACHINE_CATALOG_2_FACTORY[factory])
    .flatMap(departments=>Object.values(departments).flat());
}

function findMachineDepartment(factory,line,machine){
  const departments=catalogDepartments(factory,line);
  return departments.find(department=>catalogMachines(factory,line,department).includes(machine))||"";
}
