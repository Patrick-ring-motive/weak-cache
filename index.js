(()=>{
const CacheMap = (()=>{
  const objDefProp = (obj,prop,value) =>Object.defineProperty(obj,prop,{
    value:value,
    enumerable:false,
    writable:true,
    configurable:true
  });
  const isSymbol = x => typeof x === 'symbol' || x instanceof Symbol;
  const $weakMap = Symbol('*weak-map');
  const mapSet = (map,key,value)=>Map.prototype.set.call(map,key,value);
  const mapGet = (map,key)=>Map.prototype.get.call(map,key);
  return class CacheMap extends Map{
    constructor(iter){
      super();
      if(!this[$weakMap]){
        objDefProp(this,$weakMap,new WeakMap());
      }
      const init  = new Map(iter);
      for (const [key, value] of init) {
        this.set(key, value);
      }
    }
    get(key){
      const value = this[$weakMap].get(mapGet(this,key));
      if(value === undefined){
        super.delete(key);
      }
      return value;
    }
    set(key,value){
      let weakMapKey = mapGet(this,key);
      if(!isSymbol(weakMapKey))weakMapKey = Symbol(key);
      this[$weakMap].set(weakMapKey,value);
      return mapSet(this,key,weakMapKey);
    }
    has(key){
      return this[$weakMap].get(mapGet(this,key)) !== undefined;
    }
    delete(key) {
    const weakMapKey = super.get(key);
    const hasKey = super.has(key);
    if (hasKey) {
      this[$weakMap].delete(weakMapKey);
      super.delete(key);
    }
    return hasKey;
    }
  }
  })();

globalThis.WeakCache = new CacheMap();

const $fetch = Symbol('*fetch');
globalThis[$fetch] = fetch;
globalThis.fetch = async function fetch(){
  let req;
  try{
    req = new Request(...arguments);
    let response;
    if (req.method === 'GET'){
      let res = WeakCache.get(req.url);
      if (res) {
        if(res instanceof Promise){
          res = await res;
          if(!res.bodyUsed){
            WeakCache.set(req.url,res);
          }else{
            WeakCache.delete(req.url);
          }
        }
        response = res.clone();
      } else {
        const presponse = globalThis[$fetch](...arguments);
        WeakCache.set(req.url,presponse);
        response = await presponse;
        if (response.status === 200 && !res.bodyUsed) {
          WeakCache.set(req.url, response.clone());
        }else{
          WeakCache.delete(req.url);
        }
      }
      return response;
    }
    return await globalThis[$fetch](...arguments);
  }catch(e){
    WeakCache.delete(req.url);
    return new Response(Object.getOwnPropertyNames(e).map(x=>`${x} : ${e[x]}`).join(''),{
      status : 569,
      statusText:e.message
    });
  }
};

})();