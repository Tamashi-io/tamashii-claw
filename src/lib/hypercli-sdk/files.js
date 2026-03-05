import { readFileSync } from 'fs';
import { basename } from 'path';
function fileFromDict(data) {
    return {
        id: data.id || '',
        userId: data.user_id || '',
        filename: data.filename || '',
        contentType: data.content_type || '',
        fileSize: data.file_size || 0,
        url: data.url || '',
        state: data.state || null,
        error: data.error || null,
        createdAt: data.created_at || null,
    };
}
export class Files {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Upload a file for use in renders
     */
    async upload(filePath) {
        const content = readFileSync(filePath);
        const filename = basename(filePath);
        // Guess content type
        let contentType = 'application/octet-stream';
        if (filename.endsWith('.png'))
            contentType = 'image/png';
        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
            contentType = 'image/jpeg';
        else if (filename.endsWith('.gif'))
            contentType = 'image/gif';
        else if (filename.endsWith('.webp'))
            contentType = 'image/webp';
        else if (filename.endsWith('.mp3'))
            contentType = 'audio/mpeg';
        else if (filename.endsWith('.wav'))
            contentType = 'audio/wav';
        else if (filename.endsWith('.mp4'))
            contentType = 'video/mp4';
        else if (filename.endsWith('.webm'))
            contentType = 'video/webm';
        return this.uploadBytes(content, filename, contentType);
    }
    /**
     * Upload file bytes directly
     */
    async uploadBytes(content, filename, contentType) {
        const files = {
            file: { filename, content, contentType },
        };
        const data = await this.http.postMultipart('/api/files/multi', files);
        return fileFromDict(data);
    }
    /**
     * Upload a file from a URL (async backend processing)
     */
    async uploadUrl(url, path) {
        const payload = { url };
        if (path)
            payload.path = path;
        const data = await this.http.post('/api/files/url', payload);
        return fileFromDict(data);
    }
    /**
     * Upload a file from base64-encoded data (async backend processing)
     */
    async uploadB64(data, filename, contentType, path) {
        const payload = { data, filename };
        if (contentType)
            payload.content_type = contentType;
        if (path)
            payload.path = path;
        const result = await this.http.post('/api/files/b64', payload);
        return fileFromDict(result);
    }
    /**
     * Get file metadata and URL
     */
    async get(fileId) {
        const data = await this.http.get(`/api/files/${fileId}`);
        return fileFromDict(data);
    }
    /**
     * Delete an uploaded file
     */
    async delete(fileId) {
        return await this.http.delete(`/api/files/${fileId}`);
    }
    /**
     * Wait for an async upload to complete
     */
    async waitReady(fileId, timeout = 60000, pollInterval = 1000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const file = await this.get(fileId);
            if (file.state === 'done') {
                return file;
            }
            if (file.state === 'failed') {
                throw new Error(`File upload failed: ${file.error}`);
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        throw new Error(`File ${fileId} did not complete within ${timeout}ms`);
    }
    /**
     * Check if file is ready
     */
    isReady(file) {
        return file.state === 'done';
    }
    /**
     * Check if file upload failed
     */
    isFailed(file) {
        return file.state === 'failed';
    }
    /**
     * Check if file is processing
     */
    isProcessing(file) {
        return file.state === 'processing';
    }
}
//# sourceMappingURL=files.js.map