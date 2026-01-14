import type { InternalContext, NormalizedConfig, RequestHandler } from '../types';
import type { BuildManager } from './buildManager';
import type { RsbuildDevServer } from './devServer';
import type { UpgradeEvent } from './helper';
export type RsbuildDevMiddlewareOptions = {
    config: NormalizedConfig;
    context: InternalContext;
    buildManager?: BuildManager;
    devServerAPI: RsbuildDevServer;
    /**
     * Callbacks returned by the `onBeforeStartDevServer` hook.
     */
    postCallbacks: (() => void)[];
};
export type Middlewares = (RequestHandler | [string, RequestHandler])[];
export type GetDevMiddlewaresResult = {
    close: () => Promise<void>;
    onUpgrade: UpgradeEvent;
    middlewares: Middlewares;
};
export declare const getDevMiddlewares: (options: RsbuildDevMiddlewareOptions) => GetDevMiddlewaresResult;
