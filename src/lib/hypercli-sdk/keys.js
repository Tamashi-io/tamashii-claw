export const API_KEY_BASELINE_FAMILIES = [
    { key: 'api', label: 'API Keys', allowed: ['none', 'self', '*'] },
    { key: 'user', label: 'Profile', allowed: ['none', 'self', '*'] },
    { key: 'jobs', label: 'Jobs', allowed: ['none', 'self', '*'] },
    { key: 'renders', label: 'Renders', allowed: ['none', 'self', '*'] },
    { key: 'files', label: 'Files', allowed: ['none', 'self', '*'] },
    { key: 'agents', label: 'Agents', allowed: ['none', 'self', '*'] },
    { key: 'models', label: 'Models', allowed: ['none', '*'] },
    { key: 'voice', label: 'Voice', allowed: ['none', '*'] },
    { key: 'flow', label: 'Flows', allowed: ['none', '*'] },
];
function apiKeyFromDict(data) {
    return {
        keyId: data.key_id || '',
        name: data.name || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        apiKey: data.api_key || null,
        apiKeyPreview: data.api_key_preview || null,
        last4: data.last4 || null,
        isActive: data.is_active !== false,
        createdAt: data.created_at || '',
        lastUsedAt: data.last_used_at || null,
    };
}
export class KeysAPI {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Create a new API key
     */
    async create(name = 'default', tags) {
        const payload = { name };
        if (tags !== undefined) {
            payload.tags = tags;
        }
        const data = await this.http.post('/api/keys', payload);
        return apiKeyFromDict(data);
    }
    /**
     * List all API keys (masked)
     */
    async list() {
        const data = await this.http.get('/api/keys');
        return (data || []).map(apiKeyFromDict);
    }
    /**
     * Get a specific API key (masked)
     */
    async get(keyId) {
        const data = await this.http.get(`/api/keys/${keyId}`);
        return apiKeyFromDict(data);
    }
    /**
     * Deactivate an API key (irreversible)
     */
    async disable(keyId) {
        return await this.http.delete(`/api/keys/${keyId}`);
    }
    /**
     * Rename an API key
     */
    async rename(keyId, name) {
        const data = await this.http.patch(`/api/keys/${keyId}`, { name });
        return apiKeyFromDict(data);
    }
}
//# sourceMappingURL=keys.js.map