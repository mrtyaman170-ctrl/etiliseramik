import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const context={
  console,
  Uint8Array,
  ArrayBuffer,
  DataView,
  TextEncoder,
  TextDecoder,
  Blob,
  atob,
  setTimeout,
  clearTimeout
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"vendor/fflate.min.js"),"utf8"),context,{filename:"fflate.min.js"});
vm.runInContext(`
  const SHIFT_OFF="OFF";
  function normalizeImportedShift(value){
    const text=String(value??"").trim().toUpperCase().replace(/\\s+/g,"");
    if(["00-08","00:00-08:00"].includes(text))return "00-08";
    if(["08-16","08:00-16:00"].includes(text))return "08-16";
    if(["16-24","16:00-24:00"].includes(text))return "16-24";
    if(text==="OFF")return SHIFT_OFF;
    return null;
  }
`,context,{filename:"shift-test-globals.js"});
vm.runInContext(fs.readFileSync(path.join(root,"js/shift-template.js"),"utf8"),context,{filename:"shift-template.js"});

const build=vm.runInContext("buildShiftTemplateXlsx",context);
const loadTemplate=vm.runInContext("loadShiftTemplateBytes",context);
const sheetPathFor=vm.runInContext("shiftTemplateSheetPath",context);
const unzip=vm.runInContext("fflate.unzipSync",context);
const schedule={
  dates:Array.from({length:31},(_,index)=>new Date(2026,0,index+1)),
  rows:[
    {id:"P001",name:"Ayşe Yılmaz",days:Array.from({length:31},(_,index)=>({shift:["00-08","08-16","16-24","OFF"][index%4]}))},
    {id:"P002",name:"Mehmet Demir",days:Array.from({length:31},()=>({shift:"08:00-16:00"}))},
    {id:"P003",name:"Elif Kaya",days:Array.from({length:31},()=>({shift:"16-24"}))}
  ]
};
const template=new Uint8Array(fs.readFileSync(path.join(root,"assets/vardiya_sablonu.xlsx")));
context.ETILISMART_SHIFT_TEMPLATE_BASE64=Buffer.from(template).toString("base64");
const embeddedTemplate=await loadTemplate();
assert.deepEqual([...embeddedTemplate.slice(0,256)],[...template.slice(0,256)],"tek dosya içindeki Excel şablonu doğru okunmalı");
const templateFiles=unzip(template);
const decode=bytes=>new TextDecoder().decode(bytes);
const targetSheetPath=sheetPathFor(
  decode(templateFiles["xl/workbook.xml"]),
  decode(templateFiles["xl/_rels/workbook.xml.rels"])
);
const result=await build(template,"1. Fabrika","Mekanik Bakım","2026-01-01",schedule);
assert.match(result.filename,/ETILISMART_1_Fabrika_Mekanik_Bakım_2026_01\.xlsx$/u);
const files=unzip(result.bytes);
const workbookXml=decode(files["xl/workbook.xml"]);
const relsXml=decode(files["xl/_rels/workbook.xml.rels"]);
assert.match(workbookXml,/name="Vardiya Çizelgesi"/);
assert.match(relsXml,/Relationship/);
const sheetXml=decode(files[targetSheetPath]);
const stylesXml=decode(files["xl/styles.xml"]);
const cellTag=(address)=>sheetXml.match(new RegExp(`<c\\b(?=[^>]*\\br="${address}")[\\s\\S]*?<\\/c>|<c\\b(?=[^>]*\\br="${address}")[^>]*/>`))?.[0]||"";
const cellStyle=address=>Number(cellTag(address).match(/\bs="(\d+)"/)?.[1]||0);
const cellText=address=>cellTag(address).match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]||"";
const xfSection=stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1]||"";
const xfs=[...xfSection.matchAll(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g)].map(match=>match[0]);
const fillOf=styleId=>Number(xfs[styleId].match(/\bfillId="(\d+)"/)?.[1]||0);
const fillSection=stylesXml.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/)?.[1]||"";
const fills=[...fillSection.matchAll(/<fill>[\s\S]*?<\/fill>/g)].map(match=>match[0]);
const colorOfStyle=styleId=>fills[fillOf(styleId)].match(/\brgb="([A-F0-9]+)"/)?.[1]||"";

assert.equal(cellText("A7"),"Ayşe Yılmaz");
assert.equal(cellText("A8"),"Mehmet Demir");
assert.equal(cellText("A9"),"Elif Kaya");
assert.equal(cellStyle("B7"),132,"00-08 vardiyası ilk hücrede vurgulanmalı");
assert.equal(cellStyle("F7"),132,"08-16 vardiyası orta hücrede vurgulanmalı");
assert.equal(cellStyle("J7"),133,"16-24 vardiyası son hücrede vurgulanmalı");
assert.equal(cellStyle("F8"),135,"farklı yazılmış 08-16 değeri görünür vardiyaya dönüşmeli");
assert.equal(cellStyle("J9"),139,"üçüncü kişinin 16-24 vardiyası görünür olmalı");
assert.equal(cellText("K7"),"İZİN");
assert.notEqual(fillOf(cellStyle("B7")),fillOf(cellStyle("F8")),"kişilerin vardiya renkleri birbirinden farklı olmalı");
assert.notEqual(fillOf(cellStyle("F8")),fillOf(cellStyle("J9")),"kişilerin vardiya renkleri birbirinden farklı olmalı");
assert.equal(colorOfStyle(cellStyle("F8")),"FFC6CCD2","sürekli 08-16 çalışanı gri tonda gösterilmeli");
assert.equal(cellStyle("A10"),47,"boş personel satırının adı şablondaki normal stilde kalmalı");
assert.equal(cellStyle("B10"),29,"boş vardiya hücresi şablondaki beyaz stilde kalmalı");
assert.equal(cellStyle("D10"),46,"boş vardiya grubunun sağ kenarlığı korunmalı");
assert.match(stylesXml,/<fills\b[^>]*count="34"/);
assert.match(stylesXml,/<cellXfs\b[^>]*count="142"/);
fs.writeFileSync("/tmp/etilismart-shift-template-test.xlsx",result.bytes);
console.log("Shift template export test passed.");
