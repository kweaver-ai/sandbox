import type { LightningCssMinimizerRspackPluginOptions, SwcJsMinimizerRspackPluginOptions } from '@rspack/core';
import type { NormalizedEnvironmentConfig, RsbuildPlugin } from '../types';
export declare const getSwcMinimizerOptions: (config: NormalizedEnvironmentConfig, jsOptions?: SwcJsMinimizerRspackPluginOptions) => SwcJsMinimizerRspackPluginOptions;
export declare const parseMinifyOptions: (config: NormalizedEnvironmentConfig) => {
    minifyJs: boolean;
    minifyCss: boolean;
    jsOptions?: SwcJsMinimizerRspackPluginOptions;
    cssOptions?: LightningCssMinimizerRspackPluginOptions;
};
export declare const pluginMinimize: () => RsbuildPlugin;
