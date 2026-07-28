import fs from "node:fs";
import {JSDOM,VirtualConsole} from "../../../downloads/node_modules/jsdom/lib/api.js";
import worker from "../telegram-worker/src/index.js";

const htmlPath=process.argv[2]||new URL("../dist/ETILISMART.html",import.meta.url);
const html=fs.readFileSync(htmlPath,"utf8");
const runtimeErrors=[];
const requests=[];
const virtualConsole=new VirtualConsole();
virtualConsole.on("jsdomError",error=>runtimeErrors.push(error));

const dom=new JSDOM(html,{
  runScripts:"dangerously",
  pretendToBeVisual:true,
  url:"https://mrtyaman170-ctrl.github.io/etiliseramik/",
  virtualConsole,
  beforeParse(window){
    window.alert=()=>{};
    window.confirm=()=>true;
    window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    window.fetch=async(url,options={})=>{
      requests.push({url:String(url),options});
      return new Response(JSON.stringify({ok:true,sent:1,failed:0,unlinked:[]}),{
        status:200,
        headers:{"Content-Type":"application/json"}
      });
    };
  }
});
await new Promise(resolve=>dom.window.addEventListener("load",resolve,{once:true}));
const w=dom.window;
const run=source=>w.eval(source);
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(run("etilismartVersion()")==="1.5.0","Uygulama sürümü v1.5.0 değil.");
run(`s.user={id:"9001",...APP_USERS["9001"]};s.login=true;s.page="telegram";render()`);
assert(w.document.querySelector(".telegram-page-title"),"Telegram yönetim sayfası açılmadı.");
assert(w.document.querySelector("#telegramWorkerUrl"),"Worker adres alanı bulunamadı.");
assert(w.document.querySelector("#telegramSendTest"),"Telegram test düğmesi bulunamadı.");

run(`saveTelegramWorkerUrl("https://etilismart-telegram.example.workers.dev")`);
const fault=run(`(()=>{const f={
  id:99101,factory:"1. Fabrika",line:"1. Hat",department:"Pres Bölümü",machine:"1. PRES",
  type:"Elektrik",subject:"Telegram test arızası",description:"Test açıklaması",stopped:true,
  openedBy:"Test Operatörü",assignedTo:"Atama Bekliyor",createdAt:new Date().toISOString()
};const recipients=telegramRecipientAccountsForFault(f);recipients.forEach(person=>APP_USERS[person.appUserId].telegramUsername="tg_"+person.appUserId);return f})()`);
await w.sendFaultTelegramNotification(fault);
assert(requests.length===1,"Telegram Worker bildirim isteği gönderilmedi.");
const payload=JSON.parse(requests[0].options.body);
const activeIds=run(`telegramRecipientAccountsForFault(${JSON.stringify(fault)}).map(person=>person.appUserId)`);
assert(payload.event==="fault.created","Yanlış Telegram olay türü gönderildi.");
assert(payload.fault.stopped===true,"Üretim duruş bilgisi Telegram yüküne eklenmedi.");
assert(payload.recipients.length===activeIds.length,"Aktif vardiya alıcı filtresi bozuldu.");
assert(payload.recipients.every(person=>activeIds.includes(person.appUserId)),"Vardiya dışındaki kullanıcı bildirime eklendi.");
assert(fault.telegramDelivery.status==="sent","Başarılı Telegram gönderimi kayda işlenmedi.");

class MemoryKv{
  constructor(){this.map=new Map()}
  async get(key){return this.map.get(key)??null}
  async put(key,value){this.map.set(key,String(value))}
}
const kv=new MemoryKv();
const telegramCalls=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  telegramCalls.push({url:String(url),body:JSON.parse(options.body)});
  return new Response(JSON.stringify({ok:true,result:String(url).endsWith("/getMe")?{username:"EtiliSmartBakimBot"}:true}),{
    status:200,
    headers:{"Content-Type":"application/json"}
  });
};
const env={
  TELEGRAM_BOT_TOKEN:"test-token",
  TELEGRAM_WEBHOOK_SECRET:"webhook-secret",
  SETUP_KEY:"setup-secret",
  TELEGRAM_LINKS:kv,
  ALLOWED_ORIGINS:"https://mrtyaman170-ctrl.github.io",
  APP_URL:"https://mrtyaman170-ctrl.github.io/etiliseramik/"
};
const webhookResponse=await worker.fetch(new Request("https://worker.example/telegram/webhook",{
  method:"POST",
  headers:{"Content-Type":"application/json","X-Telegram-Bot-Api-Secret-Token":"webhook-secret"},
  body:JSON.stringify({message:{chat:{id:12345,type:"private"},from:{username:"merty17",first_name:"Mert"},text:"/start"}})
}),env);
assert(webhookResponse.status===200,"Telegram webhook kullanıcı kaydı başarısız.");
assert(await kv.get("user:merty17"),"Telegram kullanıcı adı / chat ID eşleştirilmedi.");

const notifyResponse=await worker.fetch(new Request("https://worker.example/api/notify",{
  method:"POST",
  headers:{"Content-Type":"application/json","Origin":"https://mrtyaman170-ctrl.github.io","CF-Connecting-IP":"127.0.0.1"},
  body:JSON.stringify({
    event:"fault.created",
    eventId:"fault-worker-test-1",
    appUrl:env.APP_URL,
    recipients:[{appUserId:"9001",name:"Mert Yaman",username:"merty17"},{appUserId:"9999",name:"Bağlı Değil",username:"baglidegil"}],
    fault:{id:"99101",factory:"1. Fabrika",line:"1. Hat",department:"Pres Bölümü",machine:"1. PRES",type:"Elektrik",subject:"Test",description:"Açıklama",stopped:true,openedBy:"Operatör",assignedTo:"Mert Yaman",shift:"16-24"}
  })
}),env);
const notifyBody=await notifyResponse.json();
assert(notifyResponse.status===200&&notifyBody.sent===1,"Worker bağlı Telegram kullanıcısına bildirim göndermedi.");
assert(notifyBody.unlinked.includes("baglidegil"),"Bağlı olmayan kullanıcı doğru raporlanmadı.");
assert(telegramCalls.some(call=>call.url.endsWith("/sendMessage")&&String(call.body.text).includes("ÜRETİMİ DURDURAN ARIZA")),"Kritik arıza mesajı oluşturulmadı.");

const forbidden=await worker.fetch(new Request("https://worker.example/api/status",{
  method:"POST",
  headers:{"Content-Type":"application/json","Origin":"https://example.com"},
  body:JSON.stringify({usernames:["merty17"]})
}),env);
assert(forbidden.status===403,"İzin verilmeyen web kaynağı Worker API'sine erişebiliyor.");

globalThis.fetch=originalFetch;
if(runtimeErrors.length)throw new Error(`Tarayıcı çalışma hatası: ${runtimeErrors[0].message}`);
console.log("Telegram entegrasyonu doğrulandı: aktif vardiya filtresi, kullanıcı eşleştirme, kişisel mesaj, CORS ve durum kaydı.");
dom.window.close();
