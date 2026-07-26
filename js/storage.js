function safeJson(text,fallback){
  try{return JSON.parse(text)}catch(e){return fallback}
}
function safeArray(value,fallback=[]){
  return Array.isArray(value)?value:fallback;
}
function safeRecordArray(value,fallback=[]){
  return safeArray(value,fallback).filter(item=>item!==null&&typeof item==="object"&&!Array.isArray(item));
}
function safeRecord(value,fallback={}){
  return value!==null&&typeof value==="object"&&!Array.isArray(value)?value:fallback;
}
function storageJsonArray(storage,key,fallback=[]){
  return safeArray(safeJson(storageGet(storage,key,"null"),null),fallback);
}
function storageJsonRecordArray(storage,key,fallback=[]){
  return safeRecordArray(safeJson(storageGet(storage,key,"null"),null),fallback);
}
function storageJsonRecord(storage,key,fallback={}){
  return safeRecord(safeJson(storageGet(storage,key,"null"),null),fallback);
}
function storageGet(storage,key,fallback){
  try{
    const value=storage.getItem(key);
    return value===null?fallback:value;
  }catch(e){
    return fallback;
  }
}
function storageSet(storage,key,value){
  try{storage.setItem(key,value);return true}catch(e){return false}
}
function storageRemove(storage,key){
  try{storage.removeItem(key)}catch(e){}
}
function storageClear(storage){
  try{storage.clear()}catch(e){}
}
