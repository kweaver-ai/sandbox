import type { NormalizedConfig, Routes } from '../types';
export declare const replacePortPlaceholder: (url: string, port: number) => string;
export declare function resolveUrl(str: string, base: string): string;
export declare function open({ https, port, routes, config, clearCache, }: {
    https?: boolean;
    port: number;
    routes: Routes;
    config: NormalizedConfig;
    clearCache?: boolean;
}): Promise<void>;
