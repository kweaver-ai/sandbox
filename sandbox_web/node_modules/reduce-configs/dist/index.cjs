"use strict";
var __webpack_require__ = {};
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports1)=>{
        if ('undefined' != typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports1, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports1, '__esModule', {
            value: true
        });
    };
})();
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
    reduceConfigs: ()=>reduceConfigs,
    reduceConfigsAsyncWithContext: ()=>reduceConfigsAsyncWithContext,
    reduceConfigsMergeContext: ()=>reduceConfigsMergeContext,
    reduceConfigsWithContext: ()=>reduceConfigsWithContext
});
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
exports.reduceConfigs = __webpack_exports__.reduceConfigs;
exports.reduceConfigsAsyncWithContext = __webpack_exports__.reduceConfigsAsyncWithContext;
exports.reduceConfigsMergeContext = __webpack_exports__.reduceConfigsMergeContext;
exports.reduceConfigsWithContext = __webpack_exports__.reduceConfigsWithContext;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "reduceConfigs",
    "reduceConfigsAsyncWithContext",
    "reduceConfigsMergeContext",
    "reduceConfigsWithContext"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
