/**
 * HTTP client utilities with retry logic
 */
import { APIError } from './errors.js';
/**
 * Make an HTTP request with retry logic for transient errors
 */
export async function requestWithRetry(options) {
    const { method, url, headers = {}, body, params, retries = 3, backoff = 1.0, timeout = 30000, } = options;
    // Build URL with query params
    let finalUrl = url;
    if (params) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        }
        const queryString = searchParams.toString();
        if (queryString) {
            finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
        }
    }
    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(finalUrl, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
            lastError = error;
            // Check if it's a transient error (network, timeout, etc.)
            const isTransient = error.name === 'AbortError' ||
                error.cause?.code === 'ECONNREFUSED' ||
                error.cause?.code === 'ECONNRESET' ||
                error.cause?.code === 'ETIMEDOUT';
            if (isTransient && attempt < retries - 1) {
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, backoff * (attempt + 1) * 1000));
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error('Request failed');
}
/**
 * Handle API response, raise on error
 */
async function handleResponse(response) {
    if (response.status >= 400) {
        let detail;
        try {
            const json = await response.json();
            detail = json.detail || response.statusText;
        }
        catch {
            detail = response.statusText || await response.text();
        }
        throw new APIError(response.status, detail);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
}
/**
 * HTTP Client for making authenticated requests to the API
 */
export class HTTPClient {
    baseUrl;
    apiKey;
    timeout;
    constructor(baseUrl, apiKey, timeout = 30000) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = apiKey;
        this.timeout = timeout;
    }
    get headers() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
    }
    async get(path, params) {
        const response = await requestWithRetry({
            method: 'GET',
            url: `${this.baseUrl}${path}`,
            headers: this.headers,
            params,
            timeout: this.timeout,
        });
        return handleResponse(response);
    }
    async post(path, body) {
        const response = await requestWithRetry({
            method: 'POST',
            url: `${this.baseUrl}${path}`,
            headers: this.headers,
            body,
            timeout: this.timeout,
        });
        return handleResponse(response);
    }
    async patch(path, body) {
        const response = await requestWithRetry({
            method: 'PATCH',
            url: `${this.baseUrl}${path}`,
            headers: this.headers,
            body,
            timeout: this.timeout,
        });
        return handleResponse(response);
    }
    async delete(path) {
        const response = await requestWithRetry({
            method: 'DELETE',
            url: `${this.baseUrl}${path}`,
            headers: this.headers,
            timeout: this.timeout,
        });
        return handleResponse(response);
    }
    /**
     * POST with multipart form data for file uploads
     */
    async postMultipart(path, files, params) {
        const formData = new FormData();
        for (const [fieldName, file] of Object.entries(files)) {
            const blob = new Blob([file.content], { type: file.contentType });
            formData.append(fieldName, blob, file.filename);
        }
        // Build URL with params
        let url = `${this.baseUrl}${path}`;
        if (params) {
            const searchParams = new URLSearchParams(params);
            const queryString = searchParams.toString();
            if (queryString) {
                url = `${url}?${queryString}`;
            }
        }
        // Don't set Content-Type for multipart - fetch will set it with boundary
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
        };
        const response = await requestWithRetry({
            method: 'POST',
            url,
            headers,
            body: formData,
            timeout: this.timeout,
        });
        return handleResponse(response);
    }
    /**
     * Streaming POST for SSE responses
     */
    async *streamPost(path, body) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new APIError(response.status, text);
        }
        if (!response.body) {
            throw new Error('Response body is null');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        yield line;
                    }
                }
            }
            // Yield any remaining content in buffer
            if (buffer.trim()) {
                yield buffer;
            }
        }
        finally {
            reader.releaseLock();
        }
    }
}
//# sourceMappingURL=http.js.map