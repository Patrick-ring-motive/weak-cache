(()=>{
const instanceOf=(x,y) =>{
  try{
    return x instanceof y;
  }catch{
    return false;
  }
};
const CacheMap = (()=>{
  const objDefProp = (obj,prop,value) =>Object.defineProperty(obj,prop,{
    value:value,
    enumerable:false,
    writable:true,
    configurable:true
  });
  const $weakRefMap = Symbol('*weakRefMap');
  return class WeakRefMap extends Map {
      constructor() {
        super();
        this[$weakRefMap] = new Map();
      }

      get(key) {
        const ref = this[$weakRefMap].get(key);
        const value = ref?.deref?.();
        if (value === undefined) {
          this[$weakRefMap].delete(key);
        }
        return value;
      }

      set(key, value) {
        this[$weakRefMap].set(key, new WeakRef(value));
        return this;
      }

      delete(key) {
        return this[$weakRefMap].delete(key);
      }

      has(key) {
        const value = ref?.deref?.();
        if (value === undefined) {
          this[$weakRefMap].delete(key);
          return false;
        }
        return true;
      }
    }
  })();

globalThis.WeakCache = new WeakRefMap();
const $response = Symbol('*response');
const $fetch = Symbol('*fetch');
globalThis[$fetch] = fetch;
globalThis.fetch = async function fetch(){
  let request,response;
  try{
    request = new Request(...arguments);
    if (request.method === 'GET'){
      let cachedResponse = WeakCache.get(request.url);
      if (cachedResponse) {
        request[$response] = cachedResponse;
        if(cachedResponse instanceof Promise){
          cachedResponse = await cachedResponse;
          if(!cachedResponse.bodyUsed){
            WeakCache.set(request.url,cachedResponse);
          }else{
            WeakCache.delete(request.url);
          }
        }
        try{
          response = cachedResponse.clone();
          response[$response] = cachedResponse;
        }catch{
          WeakCache.delete(request.url);
        }
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
    }
    if(!instanceOf(response,Response)){
     response = await globalThis[$fetch](...arguments);
    }
    return response;
  }catch(e){
    WeakCache.delete(request.url);
    return new Response(Object.getOwnPropertyNames(e).map(x=>`${x} : ${e[x]}`).join(''),{
      status : 569,
      statusText:e.message
    });
  }
};

})();