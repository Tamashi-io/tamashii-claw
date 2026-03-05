import type { HyperCLI } from './client.js';
/**
 * Fetch logs via REST API (one-time call)
 */
export declare function fetchLogs(client: HyperCLI, jobId: string, tail?: number): Promise<string[]>;
/**
 * Async log streamer - WebSocket streaming with optional initial fetch
 */
export declare class LogStream {
    private client;
    private jobId;
    private jobKey?;
    private fetchInitial;
    private maxInitialLines;
    private maxBuffer;
    private ws;
    private buffer;
    private initialFetched;
    private connected;
    private closed;
    constructor(client: HyperCLI, jobId: string, jobKey?: string | undefined, fetchInitial?: boolean, maxInitialLines?: number, maxBuffer?: number);
    get status(): 'disconnected' | 'connecting' | 'connected' | 'closed';
    /**
     * Connect to log stream. Returns initial logs if fetchInitial=true.
     */
    connect(): Promise<string[]>;
    /**
     * Close the WebSocket connection
     */
    close(): Promise<void>;
    /**
     * Get current buffer contents (bounded, oldest may be dropped)
     */
    getBuffer(): string[];
    /**
     * Clear the buffer
     */
    clearBuffer(): void;
    /**
     * Async iterate over NEW log lines from WebSocket
     */
    [Symbol.asyncIterator](): AsyncGenerator<string>;
}
/**
 * Stream logs until job reaches a terminal state
 */
export declare function streamLogs(client: HyperCLI, jobId: string, onLine: (line: string) => void, options?: {
    untilState?: Set<string>;
    pollStateInterval?: number;
    fetchInitial?: boolean;
    fetchFinal?: boolean;
    maxInitialLines?: number;
}): Promise<void>;
//# sourceMappingURL=logs.d.ts.map