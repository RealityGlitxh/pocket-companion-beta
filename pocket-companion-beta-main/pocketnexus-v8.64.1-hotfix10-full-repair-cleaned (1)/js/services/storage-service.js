// V8.4 centralized browser storage service. Works under file:// with in-memory fallback.
const StorageService=(()=>{
  const memory={}; let ok=true;
  function get(key){try{return localStorage.getItem(key)}catch(e){ok=false;return Object.prototype.hasOwnProperty.call(memory,key)?memory[key]:null}}
  function set(key,value){memory[key]=String(value);try{localStorage.setItem(key,String(value));return true}catch(e){ok=false;return false}}
  function remove(key){delete memory[key];try{localStorage.removeItem(key);return true}catch(e){ok=false;return false}}
  function jsonGet(key,fallback=null){const raw=get(key);if(!raw)return fallback;try{return JSON.parse(raw)}catch(e){return fallback}}
  function jsonSet(key,value){return set(key,JSON.stringify(value))}
  function available(){return ok}
  return {get,set,remove,jsonGet,jsonSet,available};
})();
