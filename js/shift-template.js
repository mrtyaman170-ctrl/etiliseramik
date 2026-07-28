const SHIFT_TEMPLATE_FILE="assets/vardiya_sablonu.xlsx";
const SHIFT_TEMPLATE_SHEET="şubat kopyası";
const SHIFT_TEMPLATE_DATA_START_ROW=7;
const SHIFT_TEMPLATE_DATA_END_ROW=23;
const SHIFT_TEMPLATE_MAX_DAYS=31;

function shiftTemplateBase64Bytes(base64){
  const binary=atob(base64);
  const bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
  return bytes;
}
async function loadShiftTemplateBytes(){
  if(window.ETILISMART_SHIFT_TEMPLATE_BASE64){
    return shiftTemplateBase64Bytes(window.ETILISMART_SHIFT_TEMPLATE_BASE64);
  }
  const response=await fetch(SHIFT_TEMPLATE_FILE);
  if(!response.ok)throw new Error("Vardiya Excel şablonu yüklenemedi.");
  return new Uint8Array(await response.arrayBuffer());
}
function shiftTemplateReadU16(view,offset){return view.getUint16(offset,true)}
function shiftTemplateReadU32(view,offset){return view.getUint32(offset,true)}
async function shiftTemplateInflate(bytes,method){
  if(method===0)return bytes;
  if(method!==8)throw new Error(`Desteklenmeyen Excel sıkıştırma yöntemi: ${method}`);
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function shiftTemplateUnzip(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let eocd=-1;
  for(let offset=bytes.length-22;offset>=Math.max(0,bytes.length-65557);offset--){
    if(shiftTemplateReadU32(view,offset)===0x06054b50){eocd=offset;break}
  }
  if(eocd<0)throw new Error("Excel şablonu ZIP yapısı tanınamadı.");
  const entryCount=shiftTemplateReadU16(view,eocd+10);
  let centralOffset=shiftTemplateReadU32(view,eocd+16);
  const decoder=new TextDecoder();
  const entries=[];
  for(let index=0;index<entryCount;index++){
    if(shiftTemplateReadU32(view,centralOffset)!==0x02014b50)throw new Error("Excel şablonu dosya dizini bozuk.");
    const method=shiftTemplateReadU16(view,centralOffset+10);
    const compressedSize=shiftTemplateReadU32(view,centralOffset+20);
    const nameLength=shiftTemplateReadU16(view,centralOffset+28);
    const extraLength=shiftTemplateReadU16(view,centralOffset+30);
    const commentLength=shiftTemplateReadU16(view,centralOffset+32);
    const localOffset=shiftTemplateReadU32(view,centralOffset+42);
    const name=decoder.decode(bytes.slice(centralOffset+46,centralOffset+46+nameLength));
    if(shiftTemplateReadU32(view,localOffset)!==0x04034b50)throw new Error("Excel şablonu yerel dosya kaydı bozuk.");
    const localNameLength=shiftTemplateReadU16(view,localOffset+26);
    const localExtraLength=shiftTemplateReadU16(view,localOffset+28);
    const dataOffset=localOffset+30+localNameLength+localExtraLength;
    const compressed=bytes.slice(dataOffset,dataOffset+compressedSize);
    entries.push({
      name,
      data:await shiftTemplateInflate(compressed,method),
      compressed,
      method,
      crc:shiftTemplateReadU32(view,centralOffset+16)
    });
    centralOffset+=46+nameLength+extraLength+commentLength;
  }
  return entries;
}
let SHIFT_TEMPLATE_CRC_TABLE=null;
function shiftTemplateCrc32(bytes){
  if(!SHIFT_TEMPLATE_CRC_TABLE){
    SHIFT_TEMPLATE_CRC_TABLE=Array.from({length:256},(_,number)=>{
      let value=number;
      for(let bit=0;bit<8;bit++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;
      return value>>>0;
    });
  }
  let crc=0xffffffff;
  for(const byte of bytes)crc=SHIFT_TEMPLATE_CRC_TABLE[(crc^byte)&0xff]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function shiftTemplateWriteU16(view,offset,value){view.setUint16(offset,value,true)}
function shiftTemplateWriteU32(view,offset,value){view.setUint32(offset,value>>>0,true)}
function shiftTemplateJoinBytes(parts){
  const size=parts.reduce((sum,part)=>sum+part.length,0);
  const result=new Uint8Array(size);
  let offset=0;
  parts.forEach(part=>{result.set(part,offset);offset+=part.length});
  return result;
}
function shiftTemplateZip(entries){
  const encoder=new TextEncoder();
  const localParts=[],centralParts=[];
  let localOffset=0;
  entries.forEach(entry=>{
    const name=encoder.encode(entry.name);
    const data=entry.data;
    const useOriginal=!entry.modified&&entry.compressed instanceof Uint8Array;
    const payload=useOriginal?entry.compressed:data;
    const method=useOriginal?entry.method:0;
    const crc=useOriginal?entry.crc:shiftTemplateCrc32(data);
    const local=new Uint8Array(30+name.length);
    const localView=new DataView(local.buffer);
    shiftTemplateWriteU32(localView,0,0x04034b50);
    shiftTemplateWriteU16(localView,4,20);
    shiftTemplateWriteU16(localView,6,0x0800);
    shiftTemplateWriteU16(localView,8,method);
    shiftTemplateWriteU32(localView,14,crc);
    shiftTemplateWriteU32(localView,18,payload.length);
    shiftTemplateWriteU32(localView,22,data.length);
    shiftTemplateWriteU16(localView,26,name.length);
    local.set(name,30);
    localParts.push(local,payload);

    const central=new Uint8Array(46+name.length);
    const centralView=new DataView(central.buffer);
    shiftTemplateWriteU32(centralView,0,0x02014b50);
    shiftTemplateWriteU16(centralView,4,20);
    shiftTemplateWriteU16(centralView,6,20);
    shiftTemplateWriteU16(centralView,8,0x0800);
    shiftTemplateWriteU16(centralView,10,method);
    shiftTemplateWriteU32(centralView,16,crc);
    shiftTemplateWriteU32(centralView,20,payload.length);
    shiftTemplateWriteU32(centralView,24,data.length);
    shiftTemplateWriteU16(centralView,28,name.length);
    shiftTemplateWriteU32(centralView,42,localOffset);
    central.set(name,46);
    centralParts.push(central);
    localOffset+=local.length+payload.length;
  });
  const centralOffset=localOffset;
  const centralSize=centralParts.reduce((sum,part)=>sum+part.length,0);
  const end=new Uint8Array(22);
  const endView=new DataView(end.buffer);
  shiftTemplateWriteU32(endView,0,0x06054b50);
  shiftTemplateWriteU16(endView,8,entries.length);
  shiftTemplateWriteU16(endView,10,entries.length);
  shiftTemplateWriteU32(endView,12,centralSize);
  shiftTemplateWriteU32(endView,16,centralOffset);
  return shiftTemplateJoinBytes([...localParts,...centralParts,end]);
}
function shiftTemplateXmlText(bytes){return new TextDecoder().decode(bytes)}
function shiftTemplateXmlBytes(text){return new TextEncoder().encode(text)}
function shiftTemplateXmlEscape(value){
  return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
function shiftTemplateColumnName(index){
  let name="",number=index+1;
  while(number){const remainder=(number-1)%26;name=String.fromCharCode(65+remainder)+name;number=Math.floor((number-1)/26)}
  return name;
}
function shiftTemplateCellTag(xml,address){
  const cellStart=`<c\\b(?=[^>]*\\br="${address}")`;
  const match=xml.match(new RegExp(`(?:${cellStart}[^>]*?\\/>|${cellStart}[^>]*?>[\\s\\S]*?<\\/c>)`));
  return match?.[0]||"";
}
function shiftTemplateCellStyle(tag){
  const match=String(tag).match(/\bs="(\d+)"/);
  return match?Number(match[1]):0;
}
function shiftTemplateSetCell(xml,address,{style,value=null,numeric=false}){
  const current=shiftTemplateCellTag(xml,address);
  if(!current)throw new Error(`Şablonda ${address} hücresi bulunamadı.`);
  const styleId=Number.isInteger(style)?style:shiftTemplateCellStyle(current);
  const styleAttribute=styleId?` s="${styleId}"`:"";
  let replacement=`<c r="${address}"${styleAttribute}/>`;
  if(value!==null&&value!==undefined&&value!==""){
    replacement=numeric
      ?`<c r="${address}"${styleAttribute}><v>${Number(value)}</v></c>`
      :`<c r="${address}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${shiftTemplateXmlEscape(value)}</t></is></c>`;
  }
  return xml.replace(current,replacement);
}
function shiftTemplateSetRowHidden(xml,row,hidden){
  const pattern=new RegExp(`<row\\b([^>]*\\br="${row}"[^>]*)>`);
  return xml.replace(pattern,(_tag,attributes)=>{
    const clean=attributes.replace(/\s+hidden="[^"]*"/g,"");
    return `<row${clean}${hidden?' hidden="1"':""}>`;
  });
}
function shiftTemplateStyleFillIds(stylesXml){
  const section=stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1]||"";
  return [...section.matchAll(/<xf\b[^>]*>/g)].map(match=>{
    const fill=match[0].match(/\bfillId="(\d+)"/);
    return fill?Number(fill[1]):0;
  });
}
function shiftTemplateMostFrequent(values,fallback=0){
  const counts=new Map();
  values.filter(Number.isInteger).forEach(value=>counts.set(value,(counts.get(value)||0)+1));
  return [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??fallback;
}
function shiftTemplateRowPattern(sheetXml,styles,row){
  const nameStyle=shiftTemplateCellStyle(shiftTemplateCellTag(sheetXml,`A${row}`));
  const rowFill=styles[nameStyle]||0;
  const active=[[],[],[]],inactive=[[],[],[]];
  let leave=null;
  for(let day=0;day<SHIFT_TEMPLATE_MAX_DAYS;day++){
    const tags=[0,1,2].map(offset=>shiftTemplateCellTag(sheetXml,`${shiftTemplateColumnName(1+day*3+offset)}${row}`));
    const hasLeave=tags.some(tag=>/<v>\d+<\/v>/.test(tag)||/inlineStr/.test(tag));
    const styleIds=tags.map(shiftTemplateCellStyle);
    if(hasLeave&&!leave){leave=styleIds;continue}
    styleIds.forEach((styleId,offset)=>{
      if((styles[styleId]||0)===rowFill&&rowFill!==0)active[offset].push(styleId);
      else inactive[offset].push(styleId);
    });
  }
  const inactiveStyles=inactive.map(values=>shiftTemplateMostFrequent(values));
  const activeStyles=active.map((values,offset)=>shiftTemplateMostFrequent(values,inactiveStyles[offset]));
  return {nameStyle,inactiveStyles,activeStyles,leaveStyles:leave||activeStyles};
}
function shiftTemplateReplaceDataMerges(sheetXml,offRanges){
  return sheetXml.replace(/<mergeCells\b[^>]*>([\s\S]*?)<\/mergeCells>/,(_all,body)=>{
    const retained=[...body.matchAll(/<mergeCell\b[^>]*\bref="([^"]+)"[^>]*\/>/g)]
      .filter(match=>{
        const rows=[...match[1].matchAll(/\d+/g)].map(item=>Number(item[0]));
        return !rows.some(row=>row>=SHIFT_TEMPLATE_DATA_START_ROW&&row<=SHIFT_TEMPLATE_DATA_END_ROW);
      })
      .map(match=>match[0]);
    const additions=offRanges.map(range=>`<mergeCell ref="${range}"/>`);
    const all=[...retained,...additions];
    return `<mergeCells count="${all.length}">${all.join("")}</mergeCells>`;
  });
}
function shiftTemplateKeepOnePage(sheetXml){
  let updated=sheetXml.replace(/<sheetView\b([^>]*)>/,(_tag,attributes)=>{
    const clean=attributes.replace(/\s+topLeftCell="[^"]*"/g,"");
    return `<sheetView${clean} topLeftCell="A1">`;
  });
  updated=updated.replace(/<selection\b[^>]*\/>/,'<selection activeCell="A1" sqref="A1"/>');
  return updated.replace(/<pageSetup\b([^>]*)\/>/,(_tag,attributes)=>{
    const clean=attributes.replace(/\s+(?:fitToWidth|fitToHeight)="[^"]*"/g,"");
    return `<pageSetup${clean} fitToWidth="1" fitToHeight="1"/>`;
  });
}
function shiftTemplateUpdateWorkbookXml(xml){
  const sheets=xml.match(/<sheets>([\s\S]*?)<\/sheets>/)?.[1]||"";
  const sheetTags=[...sheets.matchAll(/<sheet\b[^>]*\/>/g)].map(match=>match[0]);
  const targetIndex=sheetTags.findIndex(tag=>tag.includes(`name="${SHIFT_TEMPLATE_SHEET}"`));
  if(targetIndex<0)throw new Error("Excel şablon sayfası bulunamadı.");
  const updatedSheets=sheetTags.map((tag,index)=>{
    const clean=tag.replace(/\s+state="[^"]*"/,"");
    if(index===targetIndex)return clean.replace(/\bname="[^"]*"/,'name="Vardiya Çizelgesi"');
    return clean.replace(/\/>$/,' state="hidden"/>');
  });
  let updated=xml.replace(/<sheets>[\s\S]*?<\/sheets>/,`<sheets>${updatedSheets.join("")}</sheets>`);
  updated=updated.replace(/<workbookView\b([^>]*?)\/>/,(_tag,attributes)=>{
    const clean=attributes.replace(/\s+(?:activeTab|firstSheet)="[^"]*"/g,"");
    return `<workbookView${clean} activeTab="${targetIndex}" firstSheet="${targetIndex}"/>`;
  });
  return updated;
}
function shiftTemplateSheetPath(workbookXml,relationshipsXml){
  const sheet=[...workbookXml.matchAll(/<sheet\b[^>]*\/>/g)].find(match=>match[0].includes(`name="${SHIFT_TEMPLATE_SHEET}"`));
  const relationshipId=sheet?.[0].match(/\br:id="([^"]+)"/)?.[1];
  if(!relationshipId)throw new Error("Excel şablon sayfa bağlantısı bulunamadı.");
  const relationship=[...relationshipsXml.matchAll(/<Relationship\b[^>]*\/>/g)].find(match=>match[0].includes(`Id="${relationshipId}"`));
  const target=relationship?.[0].match(/\bTarget="([^"]+)"/)?.[1];
  if(!target)throw new Error("Excel şablon sayfa dosyası bulunamadı.");
  return `xl/${target.replace(/^\/+/,"").replace(/^xl\//,"")}`;
}
function shiftTemplateSafeFilename(value){
  return String(value||"").trim().replace(/[^\p{L}\p{N}]+/gu,"_").replace(/^_+|_+$/g,"")||"Vardiya";
}
async function buildShiftTemplateXlsx(templateBytes,factory,team,monthValue,schedule){
  const month=new Date(monthValue);
  if(Number.isNaN(month.getTime()))throw new Error("Seçili ay okunamadı.");
  const selectedMonth=new Date(month.getFullYear(),month.getMonth(),1);
  if(schedule.rows.length>SHIFT_TEMPLATE_DATA_END_ROW-SHIFT_TEMPLATE_DATA_START_ROW+1){
    throw new Error(`Şablon en fazla ${SHIFT_TEMPLATE_DATA_END_ROW-SHIFT_TEMPLATE_DATA_START_ROW+1} personel destekliyor.`);
  }
  const entries=window.fflate
    ?Object.entries(fflate.unzipSync(templateBytes)).map(([name,data])=>({name,data}))
    :await shiftTemplateUnzip(templateBytes);
  const byName=new Map(entries.map(entry=>[entry.name,entry]));
  const workbookEntry=byName.get("xl/workbook.xml");
  const relationshipEntry=byName.get("xl/_rels/workbook.xml.rels");
  const stylesEntry=byName.get("xl/styles.xml");
  if(!workbookEntry||!relationshipEntry||!stylesEntry)throw new Error("Excel şablonunun temel dosyaları eksik.");
  const workbookXml=shiftTemplateXmlText(workbookEntry.data);
  const relationshipsXml=shiftTemplateXmlText(relationshipEntry.data);
  const sheetPath=shiftTemplateSheetPath(workbookXml,relationshipsXml);
  const sheetEntry=byName.get(sheetPath);
  if(!sheetEntry)throw new Error("Vardiya çizelgesi çalışma sayfası eksik.");
  const styles=shiftTemplateStyleFillIds(shiftTemplateXmlText(stylesEntry.data));
  let sheetXml=shiftTemplateXmlText(sheetEntry.data);

  sheetXml=shiftTemplateSetCell(sheetXml,"Q3",{value:`${factory} · ${team}`.toLocaleUpperCase("tr-TR")});
  sheetXml=shiftTemplateSetCell(sheetXml,"BV3",{value:selectedMonth.toLocaleDateString("tr-TR",{month:"long"}).toLocaleUpperCase("tr-TR")});
  sheetXml=shiftTemplateSetCell(sheetXml,"CI3",{value:selectedMonth.getFullYear(),numeric:true});

  for(let dayIndex=0;dayIndex<SHIFT_TEMPLATE_MAX_DAYS;dayIndex++){
    const date=schedule.dates[dayIndex];
    const startColumn=1+dayIndex*3;
    const dayNameAddress=`${shiftTemplateColumnName(startColumn+1)}4`;
    const dayNumberAddress=`${shiftTemplateColumnName(startColumn)}5`;
    sheetXml=shiftTemplateSetCell(sheetXml,dayNameAddress,{value:date?date.toLocaleDateString("tr-TR",{weekday:"long"}).toLocaleUpperCase("tr-TR"):""});
    sheetXml=shiftTemplateSetCell(sheetXml,dayNumberAddress,{value:date?date.getDate():null,numeric:true});
  }

  const offRanges=[];
  for(let row=SHIFT_TEMPLATE_DATA_START_ROW;row<=SHIFT_TEMPLATE_DATA_END_ROW;row++){
    const person=schedule.rows[row-SHIFT_TEMPLATE_DATA_START_ROW];
    const pattern=shiftTemplateRowPattern(sheetXml,styles,row);
    // Şablonun 17 personellik baskı yüksekliğini ve imza alanlarının konumunu koru.
    sheetXml=shiftTemplateSetRowHidden(sheetXml,row,false);
    sheetXml=shiftTemplateSetCell(sheetXml,`A${row}`,{style:pattern.nameStyle,value:person?.name||""});
    for(let dayIndex=0;dayIndex<SHIFT_TEMPLATE_MAX_DAYS;dayIndex++){
      const day=person?.days?.[dayIndex];
      const startColumn=1+dayIndex*3;
      const isOff=day?.shift===SHIFT_OFF;
      for(let offset=0;offset<3;offset++){
        const address=`${shiftTemplateColumnName(startColumn+offset)}${row}`;
        const style=isOff?pattern.leaveStyles[offset]:day?(
          offset===SHIFT_LABELS.indexOf(day.shift)?pattern.activeStyles[offset]:pattern.inactiveStyles[offset]
        ):pattern.inactiveStyles[offset];
        sheetXml=shiftTemplateSetCell(sheetXml,address,{
          style,
          value:isOff&&offset===0?"İZİN":null
        });
      }
      if(isOff){
        offRanges.push(`${shiftTemplateColumnName(startColumn)}${row}:${shiftTemplateColumnName(startColumn+2)}${row}`);
      }
    }
  }
  sheetXml=shiftTemplateReplaceDataMerges(sheetXml,offRanges);
  sheetXml=shiftTemplateKeepOnePage(sheetXml);
  sheetEntry.data=shiftTemplateXmlBytes(sheetXml);
  sheetEntry.modified=true;
  workbookEntry.data=shiftTemplateXmlBytes(shiftTemplateUpdateWorkbookXml(workbookXml));
  workbookEntry.modified=true;

  const filename=`ETILISMART_${shiftTemplateSafeFilename(factory)}_${shiftTemplateSafeFilename(team)}_${selectedMonth.getFullYear()}_${String(selectedMonth.getMonth()+1).padStart(2,"0")}.xlsx`;
  const bytes=window.fflate
    ?fflate.zipSync(Object.fromEntries(entries.map(entry=>[entry.name,entry.data])),{level:6})
    :shiftTemplateZip(entries);
  return {bytes,filename};
}
function shiftTemplateDownload(bytes,filename){
  const blob=new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function exportShiftTemplateFile(factory,team,monthValue){
  const month=new Date(monthValue);
  const schedule=buildTeamMonthSchedule(factory,team,month);
  const result=await buildShiftTemplateXlsx(await loadShiftTemplateBytes(),factory,team,monthValue,schedule);
  shiftTemplateDownload(result.bytes,result.filename);
  return result;
}
