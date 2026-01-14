import type { InlineChunkTest, NormalizedEnvironmentConfig, RsbuildPlugin } from '../types';
export declare const getInlineTests: (config: NormalizedEnvironmentConfig) => {
    scriptTests: InlineChunkTest[];
    styleTests: InlineChunkTest[];
};
export declare const pluginInlineChunk: () => RsbuildPlugin;
