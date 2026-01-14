import type { CompressOptions, RequestHandler } from '../types';
export declare const gzipMiddleware: ({ filter, level, }?: CompressOptions) => RequestHandler;
