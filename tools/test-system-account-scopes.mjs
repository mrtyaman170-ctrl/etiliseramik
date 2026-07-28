import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const store=new Map();
store.set("etilismart_users_v2",JSON.stringify({
  "4401":{password:"1801",name:"Eski Masse Formeni",role:"Bölüm Formeni",factories:["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"],department:"Masse Bölümü",team:""},
  "4501":{password:"2801",name:"Eski 2. Fabrika Formeni",role:"Bölüm Formeni",factories:["1. Fabrika"],department:"Masse Bölümü",team:""},
  "9001":{password:"1234",name:"Mert Yaman",role:"Operatör",factories:["1. Fabrika"],department:"Pres Bölümü",team:""}
}));
const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
};
const context={
  console,
  localStorage,
  FACTORIES:{"1. Fabrika":["1. Hat"],"2. Fabrika A Blok":["1. Hat"],"2. Fabrika B Blok":["1. Hat"]},
  storageGet:(storage,key,fallback)=>storage.getItem(key)??fallback,
  storageSet:(storage,key,value)=>{storage.setItem(key,value);return true;},
  storageJsonArray:(storage,key,fallback=[])=>{try{const value=JSON.parse(storage.getItem(key)||"null");return Array.isArray(value)?value:fallback}catch{return fallback}},
  storageJsonRecord:(storage,key,fallback={})=>{try{const value=JSON.parse(storage.getItem(key)||"null");return value&&typeof value==="object"&&!Array.isArray(value)?value:fallback}catch{return fallback}}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"js/personnel.js"),"utf8"),context,{filename:"personnel.js"});
const users=JSON.parse(vm.runInContext("JSON.stringify(APP_USERS)",context));

assert.deepEqual(users["4401"].factories,["1. Fabrika"]);
assert.equal(users["4401"].department,"Masse Bölümü");
assert.deepEqual(users["4501"].factories,["2. Fabrika A Blok","2. Fabrika B Blok"]);
assert.equal(users["9001"].role,"Yazılımcı");
assert.deepEqual(users["9001"].factories,["1. Fabrika","2. Fabrika A Blok","2. Fabrika B Blok"]);
assert.equal(users["9001"].team,"Tüm Bakım");
assert.equal(users["9001"].password,"1234","kullanıcının değiştirdiği parola korunmalı");
console.log("System account scope migration test passed.");
