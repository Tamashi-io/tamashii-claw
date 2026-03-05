/**
 * API Keys management
 */
import type { HTTPClient } from './http.js';
export interface ApiKey {
    keyId: string;
    name: string;
    apiKey: string | null;
    apiKeyPreview: string | null;
    last4: string | null;
    isActive: boolean;
    createdAt: string;
    lastUsedAt: string | null;
}
export declare class KeysAPI {
    private http;
    constructor(http: HTTPClient);
    /**
     * Create a new API key
     */
    create(name?: string): Promise<ApiKey>;
    /**
     * List all API keys (masked)
     */
    list(): Promise<ApiKey[]>;
    /**
     * Get a specific API key (masked)
     */
    get(keyId: string): Promise<ApiKey>;
    /**
     * Deactivate an API key (irreversible)
     */
    disable(keyId: string): Promise<any>;
    /**
     * Rename an API key
     */
    rename(keyId: string, name: string): Promise<ApiKey>;
}
//# sourceMappingURL=keys.d.ts.map