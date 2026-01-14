import type { Build, BuildOptions } from '../types';
import type { InitConfigsOptions } from './initConfigs';
export declare const RSPACK_BUILD_ERROR = "Rspack build failed.";
export declare const build: (initOptions: InitConfigsOptions, { watch, compiler: customCompiler }?: BuildOptions) => Promise<ReturnType<Build>>;
