/**
 * API Keys management
 */
import type { HTTPClient } from './http.js';
export type ApiKeyBaselineValue = 'none' | 'self' | '*';
export interface ApiKeyBaselineFamily {
    key: string;
    label: string;
    allowed: readonly ApiKeyBaselineValue[];
}
export declare const API_KEY_BASELINE_FAMILIES: readonly [{
    readonly key: "api";
    readonly label: "API Keys";
    readonly allowed: readonly ["none", "self", "*"];
}, {
    readonly key: "user";
    readonly label: "Profile";
    readonly allowed: readonly ["none", "self", "*"];
}, {
    readonly key: "jobs";
    readonly label: "Jobs";
    readonly allowed: readonly ["none", "self", "*"];
}, {
    readonly key: "renders";
    readonly label: "Renders";
    readonly allowed: readonly ["none", "self", "*"];
}, {
    readonly key: "files";
    readonly label: "Files";
    readonly allowed: readonly ["none", "self", "*"];
}, {
    readonly key: "agents";
    readonly label: "Agents";
    readonly allowed: readonly ["none", "self", "*"];
}, {
    readonly key: "models";
    readonly label: "Models";
    readonly allowed: readonly ["none", "*"];
}, {
    readonly key: "voice";
    readonly label: "Voice";
    readonly allowed: readonly ["none", "*"];
}, {
    readonly key: "flow";
    readonly label: "Flows";
    readonly allowed: readonly ["none", "*"];
}];
export interface ApiKey {
    keyId: string;
    name: string;
    tags: string[];
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
    create(name?: string, tags?: string[]): Promise<ApiKey>;
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