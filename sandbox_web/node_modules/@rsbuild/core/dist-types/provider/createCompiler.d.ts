import type { Rspack } from '../types';
import { type InitConfigsOptions } from './initConfigs';
export declare function createCompiler(options: InitConfigsOptions): Promise<{
    compiler: Rspack.Compiler | Rspack.MultiCompiler;
    rspackConfigs: Rspack.Configuration[];
}>;
