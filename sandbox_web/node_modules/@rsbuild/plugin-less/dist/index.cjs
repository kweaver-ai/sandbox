"use strict";
let __rslib_import_meta_url__ = 'undefined' == typeof document ? new (require('url'.replace('', ''))).URL('file:' + __filename).href : document.currentScript && document.currentScript.src || new URL('main.js', document.baseURI).href;
var __webpack_require__ = {};
__webpack_require__.n = (module)=>{
    var getter = module && module.__esModule ? ()=>module.default : ()=>module;
    return __webpack_require__.d(getter, {
        a: getter
    }), getter;
}, __webpack_require__.d = (exports1, definition)=>{
    for(var key in definition)__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key) && Object.defineProperty(exports1, key, {
        enumerable: !0,
        get: definition[key]
    });
}, __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop), __webpack_require__.r = (exports1)=>{
    'undefined' != typeof Symbol && Symbol.toStringTag && Object.defineProperty(exports1, Symbol.toStringTag, {
        value: 'Module'
    }), Object.defineProperty(exports1, '__esModule', {
        value: !0
    });
};
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__), __webpack_require__.d(__webpack_exports__, {
    PLUGIN_LESS_NAME: ()=>PLUGIN_LESS_NAME,
    isPlainObject: ()=>isPlainObject,
    pluginLess: ()=>pluginLess
});
let external_node_path_namespaceObject = require("node:path");
var external_node_path_default = __webpack_require__.n(external_node_path_namespaceObject);
let external_node_url_namespaceObject = require("node:url"), external_deepmerge_namespaceObject = require("deepmerge");
var external_deepmerge_default = __webpack_require__.n(external_deepmerge_namespaceObject);
let external_reduce_configs_namespaceObject = require("reduce-configs"), src_dirname = external_node_path_default().dirname((0, external_node_url_namespaceObject.fileURLToPath)(__rslib_import_meta_url__)), isPlainObject = (obj)=>null !== obj && 'object' == typeof obj && Object.getPrototypeOf(obj) === Object.prototype, PLUGIN_LESS_NAME = 'rsbuild:less', getLessLoaderOptions = (userOptions, isUseCssSourceMap, rootPath)=>{
    let excludes = [], defaultLessLoaderOptions = {
        lessOptions: {
            javascriptEnabled: !0,
            paths: [
                external_node_path_default().join(rootPath, 'node_modules')
            ]
        },
        sourceMap: isUseCssSourceMap,
        implementation: external_node_path_default().join(src_dirname, '../compiled/less/index.js')
    };
    return {
        options: (0, external_reduce_configs_namespaceObject.reduceConfigsWithContext)({
            initial: defaultLessLoaderOptions,
            config: userOptions,
            ctx: {
                addExcludes: (items)=>{
                    excludes.push(...Array.isArray(items) ? items : [
                        items
                    ]);
                }
            },
            mergeFn: (defaults, userOptions)=>({
                    ...defaults,
                    ...userOptions,
                    lessOptions: defaults.lessOptions && userOptions.lessOptions ? external_deepmerge_default()(defaults.lessOptions, userOptions.lessOptions, {
                        isMergeableObject: isPlainObject
                    }) : userOptions.lessOptions || defaults.lessOptions
                })
        }),
        excludes
    };
}, findRuleId = (chain, defaultId)=>{
    let id = defaultId, index = 0;
    for(; chain.module.rules.has(id);)id = `${defaultId}-${++index}`;
    return id;
}, pluginLess = (pluginOptions = {})=>({
        name: PLUGIN_LESS_NAME,
        setup (api) {
            let { include = /\.less$/, parallel = !1 } = pluginOptions;
            api.modifyBundlerChain((chain, { CHAIN_ID, environment })=>{
                var callback;
                let { config } = environment, lessRule = chain.module.rule(findRuleId(chain, CHAIN_ID.RULE.LESS)).test(include).resolve.preferRelative(!0).end(), inlineRule = CHAIN_ID.RULE.CSS_INLINE ? chain.module.rule(findRuleId(chain, CHAIN_ID.RULE.LESS_INLINE)).test(include) : null;
                if (CHAIN_ID.RULE.CSS_RAW) {
                    let cssRawRule = chain.module.rules.get(CHAIN_ID.RULE.CSS_RAW);
                    chain.module.rule(CHAIN_ID.RULE.LESS_RAW).test(include).type('asset/source').resourceQuery(cssRawRule.get('resourceQuery'));
                }
                let { sourceMap } = config.output, { excludes, options } = getLessLoaderOptions(pluginOptions.lessLoaderOptions, 'boolean' == typeof sourceMap ? sourceMap : sourceMap.css, api.context.rootPath), lessLoaderPath = external_node_path_default().join(src_dirname, '../compiled/less-loader/index.js');
                (callback = (rule, type)=>{
                    for (let item of excludes)rule.exclude.add(item);
                    pluginOptions.exclude && rule.exclude.add(pluginOptions.exclude);
                    let cssRule = chain.module.rules.get('normal' === type ? CHAIN_ID.RULE.CSS : CHAIN_ID.RULE.CSS_INLINE);
                    for (let id of (rule.dependency(cssRule.get('dependency')), rule.sideEffects(cssRule.get('sideEffects')), rule.resourceQuery(cssRule.get('resourceQuery')), Object.keys(cssRule.uses.entries()))){
                        let loader = cssRule.uses.get(id), options = loader.get('options') ?? {}, clonedOptions = external_deepmerge_default()({}, options);
                        id === CHAIN_ID.USE.CSS && (clonedOptions.importLoaders += 1), rule.use(id).loader(loader.get('loader')).options(clonedOptions);
                    }
                    let loader = rule.use(CHAIN_ID.USE.LESS).loader(lessLoaderPath).options(options);
                    parallel && loader.parallel(!0);
                })(lessRule, 'normal'), inlineRule && callback(inlineRule, 'inline'), parallel && chain.experiments({
                    ...chain.get('experiments'),
                    parallelLoader: !0
                });
            });
        }
    });
for(var __webpack_i__ in exports.PLUGIN_LESS_NAME = __webpack_exports__.PLUGIN_LESS_NAME, exports.isPlainObject = __webpack_exports__.isPlainObject, exports.pluginLess = __webpack_exports__.pluginLess, __webpack_exports__)-1 === [
    "PLUGIN_LESS_NAME",
    "isPlainObject",
    "pluginLess"
].indexOf(__webpack_i__) && (exports[__webpack_i__] = __webpack_exports__[__webpack_i__]);
Object.defineProperty(exports, '__esModule', {
    value: !0
});
