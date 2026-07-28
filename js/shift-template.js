const SHIFT_TEMPLATE_FILE="assets/vardiya_sablonu.xlsx";
const SHIFT_TEMPLATE_SHEET="şubat kopyası";
const SHIFT_TEMPLATE_DATA_START_ROW=7;
const SHIFT_TEMPLATE_DATA_END_ROW=23;
const SHIFT_TEMPLATE_MAX_DAYS=31;
// Yüklenen kurum şablonundaki beyaz, düzenli satır deseni.
// Bu stiller boş personel satırlarında renkli vardiya bloklarını kaldırır.
const SHIFT_TEMPLATE_BLANK_NAME_STYLE=47;
const SHIFT_TEMPLATE_BLANK_DAY_STYLES=[29,29,46];
const SHIFT_TEMPLATE_SCHEDULED_SHIFTS=["00-08","08-16","16-24"];
const SHIFT_TEMPLATE_STYLE_BASES={name:47,inner:29,end:46};
const SHIFT_TEMPLATE_PERSON_COLORS=[
  {name:"EAF3FB",active:"9DC3E6"},
  {name:"ECF4E6",active:"A9D18E"},
  {name:"FCEDE4",active:"F4B183"},
  {name:"F1EAF7",active:"D9B3E6"},
  {name:"FFF7DB",active:"FFE699"},
  {name:"E8F2F8",active:"9BC2E6"},
  {name:"FCE9E9",active:"F4B6B6"},
  {name:"EAF0FA",active:"B4C7E7"},
  {name:"E6F4F5",active:"B7DEE8"},
  {name:"EDF5E7",active:"C6E0B4"},
  {name:"F9E8E8",active:"F4CCCC"},
  {name:"FFF5D9",active:"FFD966"},
  {name:"EAF4E5",active:"D9EAD3"},
  {name:"EDF3FC",active:"C9DAF8"},
  {name:"F7EAEE",active:"EAD1DC"},
  {name:"E7F0F1",active:"D0E0E3"},
  {name:"FFF0E3",active:"FCE5CD"}
];
// Sabit gündüz çalışanları önceki talebe uygun olarak nötr griyle ayırt edilir.
const SHIFT_TEMPLATE_DAY_COLOR={name:"EEF1F4",active:"C6CCD2"};
const SHIFT_TEMPLATE_OFF_COLOR="E7EDF3";

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
function shiftTemplateCellXfTags(stylesXml){
  const section=stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1]||"";
  return [...section.matchAll(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g)].map(match=>match[0]);
}
function shiftTemplateSolidFill(color){
  const rgb=String(color||"").replace(/^#/,"").toUpperCase();
  if(!/^[0-9A-F]{6}$/.test(rgb))throw new Error("Vardiya renk tanımı geçersiz.");
  return `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
}
function shiftTemplateAppendFills(stylesXml,colors){
  let fillIds=[];
  const updated=stylesXml.replace(/<fills\b([^>]*)>([\s\S]*?)<\/fills>/,(_tag,attributes,body)=>{
    const countText=attributes.match(/\bcount="(\d+)"/)?.[1];
    const currentCount=Number.isInteger(Number(countText))?Number(countText):[...body.matchAll(/<fill\b[\s\S]*?<\/fill>/g)].length;
    fillIds=colors.map((_color,index)=>currentCount+index);
    const cleanAttributes=attributes.replace(/\s+count="[^"]*"/g,"");
    return `<fills${cleanAttributes} count="${currentCount+colors.length}">${body}${colors.map(shiftTemplateSolidFill).join("")}</fills>`;
  });
  if(updated===stylesXml)throw new Error("Excel şablonunda renk stilleri bulunamadı.");
  return {stylesXml:updated,fillIds};
}
function shiftTemplateCloneXfWithFill(xf,fillId){
  let updated=String(xf).replace(/\bfillId="\d+"/,`fillId="${fillId}"`);
  if(updated===xf)updated=updated.replace(/^<xf\b/,`<xf fillId="${fillId}"`);
  if(!/\bapplyFill="[^"]*"/.test(updated))updated=updated.replace(/^<xf\b/,"<xf applyFill=\"1\"");
  return updated;
}
function shiftTemplateAppendCellXfs(stylesXml,xfs){
  const updated=stylesXml.replace(/<cellXfs\b([^>]*)>([\s\S]*?)<\/cellXfs>/,(_tag,attributes,body)=>{
    const countText=attributes.match(/\bcount="(\d+)"/)?.[1];
    const present=[...body.matchAll(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g)].length;
    const currentCount=Number.isInteger(Number(countText))?Number(countText):present;
    const cleanAttributes=attributes.replace(/\s+count="[^"]*"/g,"");
    return `<cellXfs${cleanAttributes} count="${currentCount+xfs.length}">${body}${xfs.join("")}</cellXfs>`;
  });
  if(updated===stylesXml)throw new Error("Excel şablonunda hücre stilleri bulunamadı.");
  return updated;
}
function shiftTemplateExportStyles(stylesXml,people){
  const baseXfs=shiftTemplateCellXfTags(stylesXml);
  const baseName=baseXfs[SHIFT_TEMPLATE_STYLE_BASES.name];
  const baseInner=baseXfs[SHIFT_TEMPLATE_STYLE_BASES.inner];
  const baseEnd=baseXfs[SHIFT_TEMPLATE_STYLE_BASES.end];
  if(!baseName||!baseInner||!baseEnd)throw new Error("Excel şablonundaki satır stilleri bulunamadı.");

  const rows=Array.isArray(people)?people:[];
  const colors=rows.map((person,index)=>shiftTemplatePermanentDayWorker(person)
    ?SHIFT_TEMPLATE_DAY_COLOR
    :SHIFT_TEMPLATE_PERSON_COLORS[index%SHIFT_TEMPLATE_PERSON_COLORS.length]);
  const fillColors=[...colors.flatMap(color=>[color.name,color.active]),SHIFT_TEMPLATE_OFF_COLOR];
  const fills=shiftTemplateAppendFills(stylesXml,fillColors);
  const personStyles=[];
  const appendedXfs=[];
  let nextStyleId=baseXfs.length;

  colors.forEach((_color,index)=>{
    const nameFill=fills.fillIds[index*2];
    const activeFill=fills.fillIds[index*2+1];
    const name=nextStyleId++;
    const activeInner=nextStyleId++;
    const activeEnd=nextStyleId++;
    appendedXfs.push(
      shiftTemplateCloneXfWithFill(baseName,nameFill),
      shiftTemplateCloneXfWithFill(baseInner,activeFill),
      shiftTemplateCloneXfWithFill(baseEnd,activeFill)
    );
    personStyles.push({name,active:[activeInner,activeInner,activeEnd]});
  });

  const offFill=fills.fillIds.at(-1);
  const offInner=nextStyleId++;
  const offEnd=nextStyleId++;
  appendedXfs.push(
    shiftTemplateCloneXfWithFill(baseInner,offFill),
    shiftTemplateCloneXfWithFill(baseEnd,offFill)
  );
  return {
    stylesXml:shiftTemplateAppendCellXfs(fills.stylesXml,appendedXfs),
    personStyles,
    offStyles:[offInner,offInner,offEnd]
  };
}
function shiftTemplateCanonicalShift(value){
  if(SHIFT_TEMPLATE_SCHEDULED_SHIFTS.includes(value)||value===SHIFT_OFF)return value;
  if(typeof normalizeImportedShift==="function"){
    const normalized=normalizeImportedShift(value);
    if(SHIFT_TEMPLATE_SCHEDULED_SHIFTS.includes(normalized)||normalized===SHIFT_OFF)return normalized;
  }
  const text=String(value??"").trim().toLocaleUpperCase("tr-TR").replace(/\s+/g,"");
  if(["00:00-08:00","0-8","0:00-8:00","24/8","24-8","24:00-08:00","A","1","GECE"].includes(text))return "00-08";
  if(["08:00-16:00","8-16","8:00-16:00","8/16","B","2","GÜNDÜZ","SABAH"].includes(text))return "08-16";
  if(["16:00-24:00","16-00","16:00-00:00","16/24","C","3","AKŞAM"].includes(text))return "16-24";
  if(["İ","IZIN","İZİN","OFF","TATİL","R","RAPOR","İSTİRAHAT"].includes(text))return SHIFT_OFF;
  return "";
}
function shiftTemplatePermanentDayWorker(person){
  const shifts=(person?.days||[])
    .map(day=>shiftTemplateCanonicalShift(day?.shift))
    .filter(shift=>SHIFT_TEMPLATE_SCHEDULED_SHIFTS.includes(shift));
  return shifts.length>0&&shifts.every(shift=>shift==="08-16");
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
  const exportStyles=shiftTemplateExportStyles(shiftTemplateXmlText(stylesEntry.data),schedule.rows);
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
    const personIndex=row-SHIFT_TEMPLATE_DATA_START_ROW;
    const person=schedule.rows[personIndex];
    const personStyle=exportStyles.personStyles[personIndex];
    // Şablonun 17 personellik baskı yüksekliğini ve imza alanlarının konumunu koru.
    sheetXml=shiftTemplateSetRowHidden(sheetXml,row,false);
    sheetXml=shiftTemplateSetCell(sheetXml,`A${row}`,{
      style:person?personStyle.name:SHIFT_TEMPLATE_BLANK_NAME_STYLE,
      value:person?.name||""
    });
    for(let dayIndex=0;dayIndex<SHIFT_TEMPLATE_MAX_DAYS;dayIndex++){
      const day=person?.days?.[dayIndex];
      const startColumn=1+dayIndex*3;
      const shift=shiftTemplateCanonicalShift(day?.shift);
      const isOff=shift===SHIFT_OFF;
      const activeShiftIndex=SHIFT_TEMPLATE_SCHEDULED_SHIFTS.indexOf(shift);
      for(let offset=0;offset<3;offset++){
        const address=`${shiftTemplateColumnName(startColumn+offset)}${row}`;
        const style=isOff?exportStyles.offStyles[offset]:(!person||activeShiftIndex<0)
          ?SHIFT_TEMPLATE_BLANK_DAY_STYLES[offset]
          :(offset===activeShiftIndex
              ?personStyle.active[offset]
              :SHIFT_TEMPLATE_BLANK_DAY_STYLES[offset]);
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
  stylesEntry.data=shiftTemplateXmlBytes(exportStyles.stylesXml);
  stylesEntry.modified=true;
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
