function safeJson(text,fallback){
  try{return JSON.parse(text)}catch(e){return fallback}
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
