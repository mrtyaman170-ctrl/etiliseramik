const JSON_HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};

function json(data,status=200,extraHeaders={}){
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extraHeaders}});
}
function html(content,status=200){
  return new Response(content,{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}
function normalizeUsername(value){
  return String(value||"").trim().replace(/^@+/,"").toLowerCase();
}
function safeText(value,max=500){
  return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
}
function escapeHtml(value){
  return safeText(value,1800).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function allowedOrigins(env){
  return String(env.ALLOWED_ORIGINS||"").split(",").map(item=>item.trim().replace(/\/+$/,"")).filter(Boolean);
}
function corsHeaders(request,env){
  const origin=request.headers.get("Origin")||"";
  const allowed=allowedOrigins(env);
  if(!origin||(!allowed.includes(origin)&&!allowed.includes("*")))return null;
  return {
    "Access-Control-Allow-Origin":allowed.includes("*")?"*":origin,
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
    "Access-Control-Max-Age":"86400",
    "Vary":"Origin"
  };
}
async function readJson(request){
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>32768)throw new Error("İstek çok büyük.");
  return request.json();
}
async function telegramApi(env,method,payload){
  if(!env.TELEGRAM_BOT_TOKEN)throw new Error("TELEGRAM_BOT_TOKEN tanımlı değil.");
  const response=await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const body=await response.json().catch(()=>({ok:false,description:`HTTP ${response.status}`}));
  if(!response.ok||!body.ok)throw new Error(body.description||`Telegram API ${response.status}`);
  return body.result;
}
async function linkedChat(env,username){
  if(!env.TELEGRAM_LINKS)return null;
  const raw=await env.TELEGRAM_LINKS.get(`user:${normalizeUsername(username)}`);
  if(!raw)return null;
  try{return JSON.parse(raw)}catch(error){return null}
}
async function rememberTelegramUser(env,message){
  const username=normalizeUsername(message?.from?.username);
  const chatId=message?.chat?.id;
  if(!env.TELEGRAM_LINKS||!username||!chatId)return {ok:false,username};
  await env.TELEGRAM_LINKS.put(`user:${username}`,JSON.stringify({
    chatId:String(chatId),
    username,
    firstName:safeText(message.from.first_name,80),
    lastName:safeText(message.from.last_name,80),
    linkedAt:new Date().toISOString()
  }));
  return {ok:true,username,chatId:String(chatId)};
}
async function handleTelegramWebhook(request,env){
  const supplied=request.headers.get("X-Telegram-Bot-Api-Secret-Token")||"";
  if(!env.TELEGRAM_WEBHOOK_SECRET||supplied!==env.TELEGRAM_WEBHOOK_SECRET)return json({ok:false},403);
  const update=await readJson(request);
  const message=update?.message;
  if(!message?.chat?.id)return json({ok:true});
  if(message.chat.type!=="private"){
    await telegramApi(env,"sendMessage",{chat_id:message.chat.id,text:"ETİLİSMART bildirimleri yalnızca kişisel sohbet üzerinden çalışır."});
    return json({ok:true});
  }
  const linked=await rememberTelegramUser(env,message);
  if(!linked.ok){
    await telegramApi(env,"sendMessage",{
      chat_id:message.chat.id,
      text:"ETİLİSMART bağlantısı için Telegram hesabınıza bir kullanıcı adı tanımlayın ve ardından tekrar /start gönderin."
    });
    return json({ok:true});
  }
  await telegramApi(env,"sendMessage",{
    chat_id:message.chat.id,
    parse_mode:"HTML",
    text:`✅ <b>ETİLİSMART bağlantısı hazır.</b>\n\nTelegram hesabı: @${escapeHtml(linked.username)}\nArıza bildirimleri yalnızca aktif vardiyanızda ve ilgili bakım ekibindeyseniz gönderilir.`
  });
  return json({ok:true});
}
function setupPage(env){
  const ready=!!(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_WEBHOOK_SECRET&&env.SETUP_KEY&&env.TELEGRAM_LINKS);
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ETİLİSMART Telegram Kurulumu</title><style>body{margin:0;background:#f4f6f9;font-family:Arial,sans-serif;color:#20242b}.card{max-width:640px;margin:48px auto;background:#fff;border:1px solid #dfe3e8;border-radius:18px;padding:26px;box-shadow:0 18px 50px #0001}h1{margin:0 0 8px}p{color:#59616d;line-height:1.55}.state{padding:12px;border-radius:10px;background:${ready?"#e7f7ed":"#fff4d8"};color:${ready?"#176a37":"#765400"};font-weight:700}label{display:block;font-size:13px;font-weight:700;margin:18px 0 7px}input{box-sizing:border-box;width:100%;padding:13px;border:1px solid #cfd5dc;border-radius:10px}button{margin-top:14px;border:0;border-radius:10px;background:#f2b817;color:#1d1d1d;font-weight:800;padding:13px 18px;cursor:pointer}small{display:block;margin-top:18px;color:#6b7280}</style></head><body><main class="card"><h1>ETİLİSMART Telegram Kurulumu</h1><p>Bu işlem Telegram webhook bağlantısını güvenli Worker adresine tanımlar.</p><div class="state">${ready?"Worker değişkenleri hazır.":"Worker secret veya KV ayarlarından biri eksik."}</div><form method="post" action="/admin/setup-webhook"><label>Kurulum anahtarı</label><input type="password" name="setupKey" autocomplete="current-password" required><button type="submit">Webhook Bağlantısını Kur</button></form><small>Bot tokenı bu sayfada gösterilmez ve tarayıcıya gönderilmez.</small></main></body></html>`;
}
async function setupWebhook(request,env){
  const contentType=request.headers.get("Content-Type")||"";
  let setupKey="";
  if(contentType.includes("application/json"))setupKey=safeText((await readJson(request)).setupKey,256);
  else setupKey=safeText((await request.formData()).get("setupKey"),256);
  if(!env.SETUP_KEY||setupKey!==env.SETUP_KEY)return html("<h2>Kurulum anahtarı hatalı.</h2>",403);
  if(!env.TELEGRAM_WEBHOOK_SECRET)return html("<h2>TELEGRAM_WEBHOOK_SECRET tanımlı değil.</h2>",500);
  const origin=new URL(request.url).origin;
  const result=await telegramApi(env,"setWebhook",{
    url:`${origin}/telegram/webhook`,
    secret_token:env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates:["message"],
    drop_pending_updates:true
  });
  return html(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial,sans-serif;padding:40px"><h2>✅ Telegram webhook bağlantısı kuruldu.</h2><p>${escapeHtml(String(result))}</p><p>Şimdi Telegram'da botu açıp <b>Başlat</b> düğmesine basabilirsiniz.</p></body></html>`);
}
function faultMessage(fault){
  const stopped=!!fault.stopped;
  const icon=stopped?"🔴":"🟠";
  const heading=stopped?"ÜRETİMİ DURDURAN ARIZA":"YENİ ARIZA BİLDİRİMİ";
  return `${icon} <b>${heading}</b>

<b>Kayıt:</b> #${escapeHtml(fault.id)}
<b>Fabrika:</b> ${escapeHtml(fault.factory)}
<b>Hat / Alan:</b> ${escapeHtml(fault.line)}
<b>Bölüm:</b> ${escapeHtml(fault.department)}
<b>Makine:</b> ${escapeHtml(fault.machine)}
<b>Arıza türü:</b> ${escapeHtml(fault.type)}
<b>Konu:</b> ${escapeHtml(fault.subject)}
<b>Açıklama:</b> ${escapeHtml(fault.description)}

<b>Açan:</b> ${escapeHtml(fault.openedBy)}
<b>Sistem ataması:</b> ${escapeHtml(fault.assignedTo||"Atama Bekliyor")}
<b>Aktif vardiya:</b> ${escapeHtml(fault.shift)}
<b>Üretim durdu:</b> ${stopped?"Evet":"Hayır"}`;
}
function testMessage(test){
  return `✅ <b>ETİLİSMART test bildirimi</b>

Telegram bağlantısı başarıyla çalışıyor.
Gönderen: ${escapeHtml(test?.sentBy||"ETİLİSMART")}
Zaman: ${escapeHtml(new Date(test?.sentAt||Date.now()).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"}))}`;
}
async function enforceRateLimit(request,env){
  if(!env.TELEGRAM_LINKS)return true;
  const ip=request.headers.get("CF-Connecting-IP")||"unknown";
  const minute=Math.floor(Date.now()/60000);
  const key=`rate:${ip}:${minute}`;
  const count=Number(await env.TELEGRAM_LINKS.get(key)||0);
  if(count>=30)return false;
  await env.TELEGRAM_LINKS.put(key,String(count+1),{expirationTtl:120});
  return true;
}
async function handleStatus(request,env,cors){
  const body=await readJson(request);
  const usernames=[...new Set((Array.isArray(body.usernames)?body.usernames:[]).map(normalizeUsername).filter(username=>/^[a-z0-9_]{5,32}$/.test(username)))].slice(0,100);
  const linked={};
  await Promise.all(usernames.map(async username=>{linked[username]=!!(await linkedChat(env,username))}));
  return json({ok:true,linked},200,cors);
}
async function handleNotify(request,env,cors){
  if(!(await enforceRateLimit(request,env)))return json({ok:false,error:"Çok fazla bildirim isteği gönderildi."},429,cors);
  const body=await readJson(request);
  if(!["fault.created","test"].includes(body.event))return json({ok:false,error:"Geçersiz bildirim türü."},400,cors);
  const eventId=safeText(body.eventId,160);
  if(!eventId)return json({ok:false,error:"eventId zorunludur."},400,cors);
  const dedupeKey=`event:${eventId}`;
  if(await env.TELEGRAM_LINKS?.get(dedupeKey))return json({ok:true,duplicate:true,sent:0,failed:0,unlinked:[]},200,cors);

  const recipients=(Array.isArray(body.recipients)?body.recipients:[]).slice(0,30)
    .map(recipient=>({
      appUserId:safeText(recipient?.appUserId,40),
      name:safeText(recipient?.name,120),
      username:normalizeUsername(recipient?.username)
    }))
    .filter(recipient=>/^[a-z0-9_]{5,32}$/.test(recipient.username));
  if(!recipients.length)return json({ok:false,error:"Geçerli bildirim alıcısı bulunamadı."},400,cors);

  const message=body.event==="test"?testMessage(body.test):faultMessage(body.fault||{});
  const appUrl=safeText(body.appUrl||env.APP_URL,500);
  const replyMarkup=/^https:\/\//.test(appUrl)
    ?{inline_keyboard:[[{text:"ETİLİSMART'ı Aç",url:appUrl}]]}
    :undefined;
  let sent=0;
  let failed=0;
  const unlinked=[];
  const errors=[];

  for(const recipient of recipients){
    const link=await linkedChat(env,recipient.username);
    if(!link?.chatId){
      unlinked.push(recipient.username);
      continue;
    }
    try{
      await telegramApi(env,"sendMessage",{
        chat_id:link.chatId,
        text:message,
        parse_mode:"HTML",
        disable_web_page_preview:true,
        ...(replyMarkup?{reply_markup:replyMarkup}:{})
      });
      sent++;
    }catch(error){
      failed++;
      errors.push({username:recipient.username,error:safeText(error.message,180)});
    }
  }
  await env.TELEGRAM_LINKS?.put(dedupeKey,JSON.stringify({sent,failed,unlinked,at:new Date().toISOString()}),{expirationTtl:604800});
  return json({ok:true,sent,failed,unlinked,errors},200,cors);
}
async function handleApi(request,env,path){
  const cors=corsHeaders(request,env);
  if(!cors)return json({ok:false,error:"Bu kaynaktan gelen isteğe izin verilmiyor."},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(request.method!=="POST")return json({ok:false,error:"Yalnızca POST isteği kabul edilir."},405,cors);
  if(path==="/api/health"){
    let botUsername="";
    let apiReady=false;
    try{
      const bot=await telegramApi(env,"getMe",{});
      botUsername=bot.username||"";
      apiReady=true;
    }catch(error){}
    const ready=apiReady&&!!env.TELEGRAM_LINKS&&!!env.TELEGRAM_WEBHOOK_SECRET;
    return json({ok:true,ready,botUsername,message:ready?"Telegram servisi hazır.":"Worker secret, KV veya bot bağlantısı eksik."},200,cors);
  }
  if(!env.TELEGRAM_LINKS)return json({ok:false,error:"TELEGRAM_LINKS KV bağlantısı tanımlı değil."},500,cors);
  if(path==="/api/status")return handleStatus(request,env,cors);
  if(path==="/api/notify")return handleNotify(request,env,cors);
  return json({ok:false,error:"API yolu bulunamadı."},404,cors);
}

export default {
  async fetch(request,env){
    try{
      const url=new URL(request.url);
      if(url.pathname==="/")return json({service:"ETILISMART Telegram Gateway",version:"1.0.0",status:"running"});
      if(url.pathname==="/setup"&&request.method==="GET")return html(setupPage(env));
      if(url.pathname==="/admin/setup-webhook"&&request.method==="POST")return setupWebhook(request,env);
      if(url.pathname==="/telegram/webhook"&&request.method==="POST")return handleTelegramWebhook(request,env);
      if(url.pathname.startsWith("/api/"))return handleApi(request,env,url.pathname);
      return json({ok:false,error:"Sayfa bulunamadı."},404);
    }catch(error){
      return json({ok:false,error:safeText(error?.message||"Beklenmeyen Worker hatası.",300)},500);
    }
  }
};
