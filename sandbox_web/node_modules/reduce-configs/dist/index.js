const isNil = (o)=>null == o;
const isFunction = (func)=>'function' == typeof func;
const isObject = (obj)=>null !== obj && 'object' == typeof obj;
const isPlainObject = (obj)=>isObject(obj) && '[object Object]' === Object.prototype.toString.call(obj);
function reduceConfigs({ initial, config, mergeFn = Object.assign }) {
    if (isNil(config)) return initial;
    if (isPlainObject(config)) return isPlainObject(initial) ? mergeFn(initial, config) : config;
    if (isFunction(config)) return config(initial) ?? initial;
    if (Array.isArray(config)) return config.reduce((initial, config)=>reduceConfigs({
            initial,
            config,
            mergeFn
        }), initial);
    return config ?? initial;
}
function reduceConfigsWithContext({ initial, config, ctx, mergeFn = Object.assign }) {
    if (isNil(config)) return initial;
    if (isPlainObject(config)) return isPlainObject(initial) ? mergeFn(initial, config) : config;
    if (isFunction(config)) return config(initial, ctx) ?? initial;
    if (Array.isArray(config)) return config.reduce((initial, config)=>reduceConfigsWithContext({
            initial,
            config,
            ctx,
            mergeFn
        }), initial);
    return config ?? initial;
}
async function reduceConfigsAsyncWithContext({ initial, config, ctx, mergeFn = Object.assign }) {
    if (isNil(config)) return initial;
    if (isPlainObject(config)) return isPlainObject(initial) ? mergeFn(initial, config) : config;
    if (isFunction(config)) return await config(initial, ctx) ?? initial;
    if (Array.isArray(config)) return config.reduce((initial, config)=>reduceConfigsWithContext({
            initial,
            config,
            ctx,
            mergeFn
        }), initial);
    return config ?? initial;
}
function reduceConfigsMergeContext({ initial, config, ctx, mergeFn = Object.assign }) {
    if (isNil(config)) return initial;
    if (isPlainObject(config)) return isPlainObject(initial) ? mergeFn(initial, config) : config;
    if (isFunction(config)) return config({
        value: initial,
        ...ctx
    }) ?? initial;
    if (Array.isArray(config)) return config.reduce((initial, config)=>reduceConfigsMergeContext({
            initial,
            config,
            ctx,
            mergeFn
        }), initial);
    return config ?? initial;
}
export { reduceConfigs, reduceConfigsAsyncWithContext, reduceConfigsMergeContext, reduceConfigsWithContext };
