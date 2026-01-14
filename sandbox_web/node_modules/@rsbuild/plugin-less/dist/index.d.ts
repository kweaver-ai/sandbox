import type { ConfigChainWithContext, RsbuildPlugin, Rspack } from '@rsbuild/core';
export declare const isPlainObject: (obj: unknown) => obj is Record<string, any>;
export declare const PLUGIN_LESS_NAME = "rsbuild:less";
export type LessLoaderOptions = {
    /**
     * Options passed to less.
     * @see https://lesscss.org/usage/#less-options
     */
    lessOptions?: import('../compiled/less/index.js').default.Options;
    /**
     * Prepends or appends Less code to the actual entry file.
     * This is especially useful when some of your Less variables
     * depend on the environment.
     */
    additionalData?: string | ((content: string, loaderContext: Rspack.LoaderContext<LessLoaderOptions>) => string | Promise<string>);
    /**
     * Whether to source map generation.
     * @default depends on the `devtool` value of Rspack
     */
    sourceMap?: boolean;
    /**
     * Enables or disables the built-in Rspack resolver.
     * - If disabled, aliases and `@import` from node_modules will not work.
     * - If set to `only`, only the built-in Rspack resolver will be used
     * and `resolve.extensionAlias` can work.
     * @default true
     */
    webpackImporter?: boolean | 'only';
    /**
     * Determines which implementation of Less to use.
     * Can be used to override the pre-bundled version of less.
     * @default "@rsbuild/plugin-less/compiled/less/index.js"
     */
    implementation?: unknown;
    /**
     * If enabled, Less warnings and errors will be treated as Rspack warnings
     * and errors, instead of being logged silently.
     *
     * If `lessLogAsWarnOrErr` is set to false it will be just a log and Rspack
     * will compile successfully, but if you set this option to true, Rspack
     * will compile fail with a warning(or error), and can break the build if
     * configured accordingly.
     * @default false
     */
    lessLogAsWarnOrErr?: boolean;
};
export type PluginLessOptions = {
    /**
     * Options passed to less-loader.
     * @see https://github.com/webpack-contrib/less-loader
     */
    lessLoaderOptions?: ConfigChainWithContext<LessLoaderOptions, {
        /**
         * @deprecated
         * use `exclude` option instead.
         */
        addExcludes: (items: string | RegExp | (string | RegExp)[]) => void;
    }>;
    /**
     * Include some `.less` files, they will be transformed by less-loader.
     * @default /\.less$/
     */
    include?: Rspack.RuleSetCondition;
    /**
     * Exclude some `.less` files, they will not be transformed by less-loader.
     * @default undefined
     */
    exclude?: Rspack.RuleSetCondition;
    /**
     * Whether to enable parallel loader execution, running `less-loader` in worker
     * threads. When enabled, this typically improves build performance when compiling
     * large numbers of Less modules.
     * @experimental This is an experimental Rspack feature and will not work if your Less
     * options contain functions.
     * @default false
     */
    parallel?: boolean;
};
export declare const pluginLess: (pluginOptions?: PluginLessOptions) => RsbuildPlugin;
