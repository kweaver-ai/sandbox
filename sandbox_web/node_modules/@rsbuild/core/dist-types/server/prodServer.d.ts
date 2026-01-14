import type { Server } from 'node:http';
import type { Http2SecureServer } from 'node:http2';
import type { Connect, InternalContext, NormalizedConfig, PreviewOptions, ServerConfig } from '../types';
import { type StartServerResult } from './helper';
type RsbuildProdServerOptions = {
    pwd: string;
    output: {
        path: string;
        assetPrefixes: string[];
    };
    serverConfig: ServerConfig;
};
export declare class RsbuildProdServer {
    private app;
    private options;
    middlewares: Connect.Server;
    constructor(options: RsbuildProdServerOptions, middlewares: Connect.Server);
    onInit(app: Server | Http2SecureServer): Promise<void>;
    private applyDefaultMiddlewares;
    private applyStaticAssetMiddleware;
    close(): Promise<void>;
}
export declare function startProdServer(context: InternalContext, config: NormalizedConfig, { getPortSilently }?: PreviewOptions): Promise<StartServerResult>;
export {};
