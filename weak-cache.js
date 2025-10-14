(() => {
    const WeakRefMap = (() => {
        const _weakRefMap = new Map();
        return class WeakRefMap extends Map {
            get(key) {
                const ref = _weakRefMap.get(key);
                const value = ref?.deref?.();
                if (value === undefined) {
                    _weakRefMap.delete(key);
                }
                return value;
            }
            set(key, value) {
                _weakRefMap.set(key, new WeakRef(value));
                return this;
            }
            delete(key) {
                return _weakRefMap.delete(key);
            }
            has(key) {
                const value = _weakRefMap.get(key)?.deref?.();
                if (value === undefined) {
                    _weakRefMap.delete(key);
                    return false;
                }
                return true;
            }
        }
    })();
    const instanceOf = (x, y) => {
        try {
            return x instanceof y;
        } catch {
            return false;
        }
    };
    const isValidResponse = x => (x?.status === 200 && !x?.bodyUsed && !x?.body?.locked) || x?.status === 304;
    const isResponse = x => instanceOf(x, Response) || x?.constructor?.name == 'Response';
    const isPromise = x => instanceOf(x, Promise) || x?.constructor?.name == 'Promise' || typeof x?.then === 'function';
    globalThis.WeakCache = new WeakRefMap();
    const $response = Symbol('*response');
    const $fetch = Symbol('*fetch');
    globalThis[$fetch] = fetch;
    globalThis.fetch = async function fetch() {
        let request, response;
        try {
            request = new Request(...arguments);
            if (request.method === 'GET') {
                let cachedResponse = WeakCache.get(request.url);
                if (cachedResponse) {
                    request[$response] = cachedResponse;
                    if (isPromise(cachedResponse)) {
                        cachedResponse = await cachedResponse;
                        if (isValidResponse(cachedResponse)) {
                            WeakCache.set(request.url, cachedResponse);
                        } else {
                            WeakCache.delete(request.url);
                        }
                    }
                    try {
                        response = cachedResponse.clone();
                        response[$response] = cachedResponse;
                    } catch {
                        WeakCache.delete(request.url);
                    }
                    console.log('response from cache');
                } else {
                    const presponse = globalThis[$fetch](...arguments);
                    WeakCache.set(request.url, presponse);
                    response = await presponse;
                    if (response.status === 200 && !response.bodyUsed) {
                        WeakCache.set(request.url, response.clone());
                    } else {
                        WeakCache.delete(request.url);
                    }
                }
            }
            if (!isResponse(response)) {
                response = await globalThis[$fetch](...arguments);
            }
            return response;
        } catch (e) {
            WeakCache.delete(request.url);
            return new Response(Object.getOwnPropertyNames(e).map(x => `${x} : ${e[x]}`).join('\n'), {
                status: 500,
                statusText: `500 Internal Server Error ${e?.message}`.trim()
            });
        }
    };
})();
