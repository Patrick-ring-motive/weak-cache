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
  let request;
  try{
      request = new Request(...arguments);
    let response;
    if (request.method === 'GET'){
      let cachedResponse = WeakCache.get(request.url);
      if (cachedResponse) {
        if(cachedResponse instanceof Promise){
          cachedResponse = await cachedResponse;
          if(!cachedResponse.bodyUsed){
            WeakCache.set(request.url,cachedResponse);
          }else{
            WeakCache.delete(request.url);
          }
        }
        response = cachedResponse.clone();
        console.log('response from cache');
      } else {
        const presponse = globalThis[$fetch](...arguments);
        WeakCache.set(request.url,presponse);
        response = await presponse;
        if (response.status === 200 && !response.bodyUsed) {
          WeakCache.set(request.url, response.clone());
        }else{
          WeakCache.delete(request.url);
        }
      }
      return response;
    }
    return await globalThis[$fetch](...arguments);
  }catch(e){
    WeakCache.delete(request.url);
    return new Response(Object.getOwnPropertyNames(e).map(x=>`${x} : ${e[x]}`).join(''),{
      status : 569,
      statusText:e.message
    });
  }
};

})();