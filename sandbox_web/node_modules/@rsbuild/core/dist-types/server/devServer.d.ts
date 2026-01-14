import type { Server } from 'node:http';
import type { Http2SecureServer } from 'node:http2';
import type { Connect, CreateCompiler, CreateDevServerOptions, EnvironmentAPI, InternalContext, NormalizedConfig } from '../types';
import type { ServerMessage } from './socketServer';
type HTTPServer = Server | Http2SecureServer;
type ExtractSocketMessageData<T extends ServerMessage['type']> = Extract<ServerMessage, {
    type: T;
}> extends {
    data: infer D;
} ? D : undefined;
export type SockWrite = <T extends ServerMessage['type']>(type: T, data?: ExtractSocketMessageData<T>) => void;
export type RsbuildDevServer = {
    /**
     * The `connect` app instance.
     * Can be used to attach custom middlewares to the dev server.
     */
    middlewares: Connect.Server;
    /**
     * The Node.js HTTP server instance.
     * - Will be `Http2SecureServer` if `server.https` config is used.
     * - Will be `null` if `server.middlewareMode` is enabled.
     */
    httpServer: import('node:http').Server | import('node:http2').Http2SecureServer | null;
    /**
     * Start listening on the Rsbuild dev server.
     * Do not call this method if you are using a custom server.
     */
    listen: () => Promise<{
        port: number;
        urls: string[];
        server: {
            close: () => Promise<void>;
        };
    }>;
    /**
     * Environment API of Rsbuild server.
     */
    environments: EnvironmentAPI;
    /**
     * The resolved port.
     * By default, Rsbuild server listens on port `3000` and automatically increments
     * the port number if the port is occupied.
     */
    port: number;
    /**
     * Notifies Rsbuild that the custom server has successfully started.
     * Rsbuild will trigger the `onAfterStartDevServer` hook at this stage.
     */
    afterListen: () => Promise<void>;
    /**
     * Activate socket connection.
     * This ensures that HMR works properly.
     */
    connectWebSocket: (options: {
        server: HTTPServer;
    }) => void;
    /**
     * Close the Rsbuild server.
     */
    close: () => Promise<void>;
    /**
     * Print the server URLs.
     */
    printUrls: () => void;
    /**
     * Open URL in the browser after starting the server.
     */
    open: () => Promise<void>;
    /**
     * Allows middleware to send some message to HMR client, and then the HMR
     * client will take different actions depending on the message type.
     * - `static-changed`: The page will reload.
     */
    sockWrite: SockWrite;
};
export declare function createDevServer<Options extends {
    context: InternalContext;
}>(options: Options, createCompiler: CreateCompiler, config: NormalizedConfig, { compiler: customCompiler, getPortSilently, runCompile, }?: CreateDevServerOptions): Promise<RsbuildDevServer>;
export {};
