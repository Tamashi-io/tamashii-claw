/**
 * Files API - upload assets for use in renders
 */
import type { HTTPClient } from './http.js';
export interface File {
    id: string;
    userId: string;
    filename: string;
    contentType: string;
    fileSize: number;
    url: string;
    state: string | null;
    error: string | null;
    createdAt: string | null;
}
export declare class Files {
    private http;
    constructor(http: HTTPClient);
    /**
     * Upload a file for use in renders
     */
    upload(filePath: string): Promise<File>;
    /**
     * Upload file bytes directly
     */
    uploadBytes(content: Buffer, filename: string, contentType: string): Promise<File>;
    /**
     * Upload a file from a URL (async backend processing)
     */
    uploadUrl(url: string, path?: string): Promise<File>;
    /**
     * Upload a file from base64-encoded data (async backend processing)
     */
    uploadB64(data: string, filename: string, contentType?: string, path?: string): Promise<File>;
    /**
     * Get file metadata and URL
     */
    get(fileId: string): Promise<File>;
    /**
     * Delete an uploaded file
     */
    delete(fileId: string): Promise<any>;
    /**
     * Wait for an async upload to complete
     */
    waitReady(fileId: string, timeout?: number, pollInterval?: number): Promise<File>;
    /**
     * Check if file is ready
     */
    isReady(file: File): boolean;
    /**
     * Check if file upload failed
     */
    isFailed(file: File): boolean;
    /**
     * Check if file is processing
     */
    isProcessing(file: File): boolean;
}
//# sourceMappingURL=files.d.ts.map