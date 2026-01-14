import { createRequire } from "node:module";
import node_path from "node:path";
let react_require = createRequire(import.meta.url), PLUGIN_REACT_NAME = 'rsbuild:react', pluginReact = (options = {})=>({
        name: PLUGIN_REACT_NAME,
        setup (api) {
            var options1;
            let finalOptions = {
                fastRefresh: !0,
                splitChunks: !0,
                enableProfiler: !1,
                ...options
            };
            if ('rspack' === api.context.bundlerType) {
                let REACT_REFRESH_PATH, hasReactDomClientCache;
                REACT_REFRESH_PATH = finalOptions.fastRefresh ? react_require.resolve('react-refresh') : '', api.modifyEnvironmentConfig((config, { mergeEnvironmentConfig })=>{
                    let isDev = 'development' === config.mode, usingHMR = isDev && config.dev.hmr && 'web' === config.output.target;
                    return mergeEnvironmentConfig({
                        tools: {
                            swc: {
                                jsc: {
                                    parser: {
                                        syntax: "typescript",
                                        tsx: !0
                                    },
                                    transform: {
                                        react: {
                                            development: isDev,
                                            refresh: usingHMR && finalOptions.fastRefresh,
                                            runtime: 'automatic',
                                            ...finalOptions.swcReactOptions
                                        }
                                    }
                                }
                            }
                        }
                    }, config);
                }), finalOptions.swcReactOptions?.runtime === 'preserve' && api.modifyBundlerChain((chain)=>{
                    chain.module.parser.merge({
                        javascript: {
                            jsx: !0
                        }
                    });
                }), api.modifyBundlerChain(async (chain, { CHAIN_ID, environment, isDev, target })=>{
                    let { config } = environment;
                    if (!(isDev && config.dev.hmr && 'web' === target) || !finalOptions.fastRefresh) return;
                    chain.resolve.alias.set('react-refresh', node_path.dirname(REACT_REFRESH_PATH));
                    let { ReactRefreshRspackPlugin } = await import("@rspack/plugin-react-refresh"), jsRule = chain.module.rules.get(CHAIN_ID.RULE.JS);
                    chain.plugin(CHAIN_ID.PLUGIN.REACT_FAST_REFRESH).use(ReactRefreshRspackPlugin, [
                        {
                            test: jsRule.get('test'),
                            include: jsRule.include.values(),
                            exclude: jsRule.exclude.values(),
                            resourceQuery: {
                                not: /^\?raw$/
                            },
                            ...finalOptions.reactRefreshOptions
                        }
                    ]);
                }), finalOptions.enableProfiler && (api.modifyEnvironmentConfig((config, { mergeEnvironmentConfig })=>{
                    if ('production' === config.mode) return mergeEnvironmentConfig(config, {
                        output: {
                            minify: {
                                jsOptions: {
                                    minimizerOptions: {
                                        mangle: {
                                            keep_classnames: !0,
                                            keep_fnames: !0
                                        }
                                    }
                                }
                            }
                        }
                    });
                }), api.modifyBundlerChain((chain, { isProd })=>{
                    isProd && (chain.resolve.alias.set((()=>{
                        if (void 0 !== hasReactDomClientCache) return hasReactDomClientCache;
                        try {
                            react_require.resolve('react-dom/client', {
                                paths: [
                                    api.context.rootPath
                                ]
                            }), hasReactDomClientCache = !0;
                        } catch  {
                            hasReactDomClientCache = !1;
                        }
                        return hasReactDomClientCache;
                    })() ? 'react-dom/client$' : 'react-dom$', 'react-dom/profiling'), chain.resolve.alias.set('scheduler/tracing', 'scheduler/tracing-profiling'));
                }));
            }
            options1 = finalOptions.splitChunks, api.modifyBundlerChain((chain, { environment, isProd })=>{
                let { config } = environment;
                if ('split-by-experience' !== config.performance.chunkSplit.strategy || !1 === options1) return;
                let normalizedOptions = !0 === options1 ? {
                    react: !0,
                    router: !0
                } : options1, currentConfig = chain.optimization.splitChunks.values();
                if ('object' != typeof currentConfig) return;
                let extraGroups = {};
                normalizedOptions.react && (extraGroups.react = {
                    name: 'lib-react',
                    test: isProd ? /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ : /node_modules[\\/](?:react|react-dom|scheduler|react-refresh|@rspack[\\/]plugin-react-refresh)[\\/]/,
                    priority: 0
                }), normalizedOptions.router && (extraGroups.router = {
                    name: 'lib-router',
                    test: /node_modules[\\/](?:react-router|react-router-dom|history|@remix-run[\\/]router)[\\/]/,
                    priority: 0
                }), Object.keys(extraGroups).length && chain.optimization.splitChunks({
                    ...currentConfig,
                    cacheGroups: {
                        ...extraGroups,
                        ...currentConfig.cacheGroups
                    }
                });
            });
        }
    });
export { PLUGIN_REACT_NAME, pluginReact };
