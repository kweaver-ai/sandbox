import node_path from "node:path";
import { fileURLToPath } from "node:url";
import deepmerge from "deepmerge";
import { reduceConfigsWithContext } from "reduce-configs";
let src_dirname = node_path.dirname(fileURLToPath(import.meta.url)), isPlainObject = (obj)=>null !== obj && 'object' == typeof obj && Object.getPrototypeOf(obj) === Object.prototype, PLUGIN_LESS_NAME = 'rsbuild:less', findRuleId = (chain, defaultId)=>{
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
                let { sourceMap } = config.output, { excludes, options } = ((userOptions, isUseCssSourceMap, rootPath)=>{
                    let excludes = [];
                    return {
                        options: reduceConfigsWithContext({
                            initial: {
                                lessOptions: {
                                    javascriptEnabled: !0,
                                    paths: [
                                        node_path.join(rootPath, 'node_modules')
                                    ]
                                },
                                sourceMap: isUseCssSourceMap,
                                implementation: node_path.join(src_dirname, '../compiled/less/index.js')
                            },
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
                                    lessOptions: defaults.lessOptions && userOptions.lessOptions ? deepmerge(defaults.lessOptions, userOptions.lessOptions, {
                                        isMergeableObject: isPlainObject
                                    }) : userOptions.lessOptions || defaults.lessOptions
                                })
                        }),
                        excludes
                    };
                })(pluginOptions.lessLoaderOptions, 'boolean' == typeof sourceMap ? sourceMap : sourceMap.css, api.context.rootPath), lessLoaderPath = node_path.join(src_dirname, '../compiled/less-loader/index.js');
                (callback = (rule, type)=>{
                    for (let item of excludes)rule.exclude.add(item);
                    pluginOptions.exclude && rule.exclude.add(pluginOptions.exclude);
                    let cssRule = chain.module.rules.get('normal' === type ? CHAIN_ID.RULE.CSS : CHAIN_ID.RULE.CSS_INLINE);
                    for (let id of (rule.dependency(cssRule.get('dependency')), rule.sideEffects(cssRule.get('sideEffects')), rule.resourceQuery(cssRule.get('resourceQuery')), Object.keys(cssRule.uses.entries()))){
                        let loader = cssRule.uses.get(id), clonedOptions = deepmerge({}, loader.get('options') ?? {});
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
export { PLUGIN_LESS_NAME, isPlainObject, pluginLess };
