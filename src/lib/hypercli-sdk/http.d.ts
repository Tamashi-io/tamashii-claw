export interface RequestOptions {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, string>;
    retries?: number;
    backoff?: number;
    timeout?: number;
}
/**
 * Make an HTTP request with retry logic for transient errors
 */
export declare function requestWithRetry(options: RequestOptions): Promise<Response>;
/**
 * HTTP Client for making authenticated requests to the API
 */
export declare class HTTPClient {
    private baseUrl;
    private apiKey;
    private timeout;
    constructor(baseUrl: string, apiKey: string, timeout?: number);
    private get headers();
    get<T = any>(path: string, params?: Record<string, string>): Promise<T>;
    post<T = any>(path: string, body?: any): Promise<T>;
    patch<T = any>(path: string, body?: any): Promise<T>;
    delete<T = any>(path: string): Promise<T>;
    /**
     * POST with multipart form data for file uploads
     */
    postMultipart<T = any>(path: string, files: Record<string, {
        filename: string;
        content: Buffer;
        contentType: string;
    }>, params?: Record<string, string>): Promise<T>;
    /**
     * Streaming POST for SSE responses
     */
    streamPost(path: string, body?: any): AsyncGenerator<string>;
}
//# sourceMappingURL=http.d.ts.map